import jwt from 'jsonwebtoken';

// CORS helper
function cors(res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  // ── Leer credenciales desde variables de entorno ──
  const ISSUER_ID = process.env.GOOGLE_WALLET_ISSUER_ID;
  const SA_EMAIL  = process.env.GOOGLE_WALLET_SA_EMAIL;
  const SA_KEY    = (process.env.GOOGLE_WALLET_SA_KEY || '').replace(/\\n/g, '\n');

  if (!ISSUER_ID || !SA_EMAIL || !SA_KEY) {
    return res.status(500).json({ error: 'Faltan variables de entorno de Google Wallet' });
  }

  const { biz_id, biz_name, logo_url, bg_color, text_color, primary_color,
          reward_text, stamps, stamps_required, member_id, member_name } = req.body || {};

  if (!biz_id || !member_id) {
    return res.status(400).json({ error: 'Faltan biz_id o member_id' });
  }

  try {
    const CLASS_ID  = `${ISSUER_ID}.loyalty_${biz_id.replace(/-/g, '')}`;
    const OBJECT_ID = `${ISSUER_ID}.member_${member_id.replace(/-/g, '')}`;

    // ── 1. Clase del pase (define la plantilla visual) ──
    const loyaltyClass = {
      id: CLASS_ID,
      issuerName: 'CityMap',
      reviewStatus: 'UNDER_REVIEW',
      programName: biz_name || 'Programa de Lealtad',
      programLogo: {
        sourceUri: { uri: logo_url || 'https://citymap.mx/logo.png' },
        contentDescription: { defaultValue: { language: 'es', value: biz_name || 'Logo' } }
      },
      hexBackgroundColor: bg_color || '#000000',
      rewardsTier: reward_text || 'Tarjeta de Lealtad',
      rewardsTierLabel: 'Premio',
      accountNameLabel: 'Cliente',
      accountIdLabel: 'ID',
    };

    // ── 2. Objeto del pase (instancia por cliente) ──
    const loyaltyObject = {
      id: OBJECT_ID,
      classId: CLASS_ID,
      state: 'ACTIVE',
      accountName: member_name || 'Cliente',
      accountId: member_id,
      loyaltyPoints: {
        label: `Sellos (meta: ${stamps_required || 5})`,
        balance: {
          string: `${stamps || 0} / ${stamps_required || 5}`,
        },
      },
      hexBackgroundColor: bg_color || '#000000',
      barcode: {
        type: 'QR_CODE',
        value: `https://citymap.mx/scan/${member_id}`,
        alternateText: member_id,
      },
      textModulesData: [
        {
          header: 'Premio al completar',
          body: reward_text || '—',
          id: 'reward',
        },
      ],
    };

    // ── 3. Payload JWT para Google Wallet ──
    const payload = {
      iss: SA_EMAIL,
      aud: 'google',
      typ: 'savetowallet',
      iat: Math.floor(Date.now() / 1000),
      payload: {
        loyaltyClasses: [loyaltyClass],
        loyaltyObjects: [loyaltyObject],
      },
    };

    const token = jwt.sign(payload, SA_KEY, { algorithm: 'RS256' });
    const saveUrl = `https://pay.google.com/gp/v/save/${token}`;

    return res.status(200).json({ url: saveUrl });

  } catch (err) {
    console.error('Google Wallet error:', err);
    return res.status(500).json({ error: err.message });
  }
}
