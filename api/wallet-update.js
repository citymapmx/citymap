import jwt from 'jsonwebtoken';

function cors(res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const ISSUER_ID = process.env.GOOGLE_WALLET_ISSUER_ID;
  const SA_EMAIL  = process.env.GOOGLE_WALLET_SA_EMAIL;
  const SA_KEY    = (process.env.GOOGLE_WALLET_SA_KEY || '').replace(/\\n/g, '\n');

  if (!ISSUER_ID || !SA_EMAIL || !SA_KEY) {
    return res.status(500).json({ error: 'Faltan variables de entorno de Google Wallet' });
  }

  const { member_id, stamps, stamps_required } = req.body || {};
  if (!member_id) return res.status(400).json({ error: 'Falta member_id' });

  try {
    // 1. Obtener Access Token de Google OAuth2 usando JWT Assertion
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 3600;
    const payload = {
      iss: SA_EMAIL,
      scope: 'https://www.googleapis.com/auth/wallet_object.issuer',
      aud: 'https://oauth2.googleapis.com/token',
      exp: exp,
      iat: iat
    };
    
    const assertion = jwt.sign(payload, SA_KEY, { algorithm: 'RS256' });
    
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${assertion}`
    });
    
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      throw new Error(`Auth Error: ${tokenData.error_description || tokenData.error}`);
    }
    
    const accessToken = tokenData.access_token;
    const OBJECT_ID = `${ISSUER_ID}.member_${member_id.replace(/-/g, '')}`;

    // 2. Hacer PATCH al loyaltyObject
    const patchBody = {
      loyaltyPoints: {
        label: `Sellos (meta: ${stamps_required || 5})`,
        balance: {
          string: `${stamps || 0} / ${stamps_required || 5}`
        }
      },
      barcode: {
        type: 'QR_CODE',
        value: `https://citymap.mx/scan/${member_id}`,
        alternateText: member_id,
      }
    };

    const patchRes = await fetch(`https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/${OBJECT_ID}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(patchBody)
    });

    const patchData = await patchRes.json();
    if (!patchRes.ok) {
      console.warn("Wallet update API returned error (maybe user hasn't added it to wallet yet?):", patchData);
      // We don't fail hard because if they haven't saved the pass yet, the object might not exist.
      return res.status(200).json({ success: false, message: 'Object not found or error', details: patchData });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Wallet Update error:', err);
    return res.status(500).json({ error: err.message });
  }
}
