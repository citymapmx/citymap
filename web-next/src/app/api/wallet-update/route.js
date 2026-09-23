const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: CORS });
}

import jwt from 'jsonwebtoken';

async function _handler(req) {
  cors(res);
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: CORS });
  if (req.method !== 'POST') return Response.json({ error: 'Method Not Allowed' }, { status: 405, headers: CORS });

  const body = await req.json();
  const ISSUER_ID = process.env.GOOGLE_WALLET_ISSUER_ID;
  const SA_EMAIL  = process.env.GOOGLE_WALLET_SA_EMAIL;
  const SA_KEY    = (process.env.GOOGLE_WALLET_SA_KEY || '').replace(/\\n/g, '\n');

  if (!ISSUER_ID || !SA_EMAIL || !SA_KEY) {
    return Response.json({ error: 'Faltan variables de entorno de Google Wallet' }, { status: 500, headers: CORS });
  }

  const { member_id, stamps, stamps_required } = body || {};
  if (!member_id) return Response.json({ error: 'Falta member_id' }, { status: 400, headers: CORS });

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
      return Response.json({ success: false, message: 'Object not found or error', details: patchData }, { status: 200, headers: CORS });
    }

    return Response.json({ success: true }, { status: 200, headers: CORS });
  } catch (err) {
    console.error('Wallet Update error:', err);
    return Response.json({ error: err.message }, { status: 500, headers: CORS });
  }
}

export async function POST(req) { return _handler(req); }
