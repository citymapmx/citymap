import jwt from 'jsonwebtoken';
import { PKPass } from 'passkit-generator';
import { loyaltyBgFirstColor } from '../src/lib/loyaltyColorStyles.js';
import {
  APPLE_PASS_DEFAULT_TEAM_ID,
  APPLE_PASS_DEFAULT_TYPE_ID,
  applePassFileName,
  buildApplePassJson,
} from '../src/lib/applePass.js';

// CORS helper
function cors(res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// ── Apple Wallet (.pkpass) ──────────────────────────────────────────
// Certificado WWDR G4 de Apple (público, descargado de
// https://www.apple.com/certificateauthority/AppleWWDRCAG4.cer y
// convertido a PEM). Los pases nuevos encadenan a G4; si el certificado
// del Pass Type ID encadenara a G3, se puede sustituir con la variable
// APPLE_PASS_WWDR_PEM_BASE64 (PEM en base64).
const APPLE_PASS_WWDR_G4_PEM = `-----BEGIN CERTIFICATE-----
MIIEVTCCAz2gAwIBAgIUE9x3lVJx5T3GMujM/+Uh88zFztIwDQYJKoZIhvcNAQEL
BQAwYjELMAkGA1UEBhMCVVMxEzARBgNVBAoTCkFwcGxlIEluYy4xJjAkBgNVBAsT
HUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9yaXR5MRYwFAYDVQQDEw1BcHBsZSBS
b290IENBMB4XDTIwMTIxNjE5MzYwNFoXDTMwMTIxMDAwMDAwMFowdTFEMEIGA1UE
Aww7QXBwbGUgV29ybGR3aWRlIERldmVsb3BlciBSZWxhdGlvbnMgQ2VydGlmaWNh
dGlvbiBBdXRob3JpdHkxCzAJBgNVBAsMAkc0MRMwEQYDVQQKDApBcHBsZSBJbmMu
MQswCQYDVQQGEwJVUzCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBANAf
eKp6JzKwRl/nF3bYoJ0OKY6tPTKlxGs3yeRBkWq3eXFdDDQEYHX3rkOPR8SGHgjo
v9Y5Ui8eZ/xx8YJtPH4GUnadLLzVQ+mxtLxAOnhRXVGhJeG+bJGdayFZGEHVD41t
QSo5SiHgkJ9OE0/QjJoyuNdqkh4laqQyziIZhQVg3AJK8lrrd3kCfcCXVGySjnYB
5kaP5eYq+6KwrRitbTOFOCOL6oqW7Z+uZk+jDEAnbZXQYojZQykn/e2kv1MukBVl
PNkuYmQzHWxq3Y4hqqRfFcYw7V/mjDaSlLfcOQIA+2SM1AyB8j/VNJeHdSbCb64D
YyEMe9QbsWLFApy9/a8CAwEAAaOB7zCB7DASBgNVHRMBAf8ECDAGAQH/AgEAMB8G
A1UdIwQYMBaAFCvQaUeUdgn+9GuNLkCm90dNfwheMEQGCCsGAQUFBwEBBDgwNjA0
BggrBgEFBQcwAYYoaHR0cDovL29jc3AuYXBwbGUuY29tL29jc3AwMy1hcHBsZXJv
b3RjYTAuBgNVHR8EJzAlMCOgIaAfhh1odHRwOi8vY3JsLmFwcGxlLmNvbS9yb290
LmNybDAdBgNVHQ4EFgQUW9n6HeeaGgujmXYiUIY+kchbd6gwDgYDVR0PAQH/BAQD
AgEGMBAGCiqGSIb3Y2QGAgEEAgUAMA0GCSqGSIb3DQEBCwUAA4IBAQA/Vj2e5bbD
eeZFIGi9v3OLLBKeAuOugCKMBB7DUshwgKj7zqew1UJEggOCTwb8O0kU+9h0UoWv
p50h5wESA5/NQFjQAde/MoMrU1goPO6cn1R2PWQnxn6NHThNLa6B5rmluJyJlPef
x4elUWY0GzlxOSTjh2fvpbFoe4zuPfeutnvi0v/fYcZqdUmVIkSoBPyUuAsuORFJ
EtHlgepZAE9bPFo22noicwkJac3AfOriJP6YRLj477JxPxpd1F1+M02cHSS+APCQ
A1iZQT0xWmJArzmoUUOSqwSonMJNsUvSq3xKX+udO7xPiEAGE/+QF4oIRynoYpgp
pU8RBWk6z/Kf
-----END CERTIFICATE-----`;

// Icono de respaldo (logo de CityMap, 29 y 58 px, generado desde
// public/logo-brand.png): se usa si no se puede descargar el logo del
// negocio. El pase exige icon.png; sin él Wallet lo rechaza.
const APPLE_PASS_ICON_PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAB0AAAAdCAYAAABWk2cPAAACW0lEQVR4nO2TP2gaURzHf/cMKlZz5rh6nqgxBlNCS6DWSHtQkJAmIYu2bkJcpNBJyBIcChbq4JApkA6uDjpl8RKcLIUONUMxOZCiFRvRJiVEo95daoix04mhGUqmDveZvnzfe7/f+/N9ADIyMjL/PRiGAUIIAAAQQoBh2NCTtDSmUCiGWloz6o3WugFN0yiZTL5hWTY6Nzenvssm/3muJHZ3d9/l8/lcuVw+CofDbxcXF197vV4bRVFEqVSq93q9K7vdbjQYDMTJycnp/v7+Ecdxv4PB4DSO49qtra0DhmF0JpMJ39nZqW9sbDyNx+NfAoGATa/Xa2u12inLsr8AAIZnnpqacm1vb39OpVJHoii2/X7/9OXl5VUikfjabDYvJicnyWw2W2q32910Ol1aWFiYXV9ff1Kv11vLy8svjUYjWllZmbdarZTD4VBSFGW02WxjJEniLMt+W1paei71GpNEJpP5EI1GX3U6nfNKpXLQarX4RqPRFQQBOI7jHQ5HXxTFa1EUL3ieH+Tz+e8ej+dRLpdrOp3OvWAwOM/zvFAulxter/dxoVDgVldXZxFCyOfzPcxkMh//ahqJRPZisdiLtbW19zMzM88IgkChUIix2+0/cBzXdLvdCykcAABnZ2e9w8PDCkEQWLVa/Wk2m+8Xi8Way+V60O/3r4+Pj88ZhrEMBoPB5ubmJ0EQbn9gkiSRxWIZVp6YmMDcbve98fFxTKPRgEKhAJ1OhwEAKJVK0Gq1GEJo6CGEgKZpJCVVrVYDTdNIpVLdnt7R9I1+ibsyeisyMjIyMjf4A/oJ2jbFDBTJAAAAAElFTkSuQmCC';
const APPLE_PASS_ICON_2X_PNG_B64 = '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';

// Variables de entorno de Apple Wallet (poner en Vercel → Settings →
// Environment Variables). El certificado .p12 del Pass Type ID
// (pass.mx.citymap.app.loyalty) se convierte con:
//   openssl pkcs12 -in CityMapLoyalty.p12 -clcerts -nokeys -out signerCert.pem -passin pass:<clave-p12> -legacy
//   openssl pkcs12 -in CityMapLoyalty.p12 -nocerts -out signerKey.pem -passin pass:<clave-p12> -passout pass:<clave-nueva> -legacy
// y luego se suben como base64:
//   APPLE_PASS_CERT_PEM_BASE64 = base64 de signerCert.pem
//   APPLE_PASS_KEY_PEM_BASE64  = base64 de signerKey.pem
//   APPLE_PASS_KEY_PASSPHRASE  = <clave-nueva> (la del -passout)
// Opcionales:
//   APPLE_PASS_TYPE_ID         = pass.mx.citymap.app.loyalty (default)
//   APPLE_PASS_TEAM_ID         = 74S45QN779 (default)
//   APPLE_PASS_WWDR_PEM_BASE64 = PEM del WWDR en base64 (default: G4 embebido)
function getAppleConfig() {
  const certB64 = process.env.APPLE_PASS_CERT_PEM_BASE64 || '';
  const keyB64 = process.env.APPLE_PASS_KEY_PEM_BASE64 || '';
  const passphrase = process.env.APPLE_PASS_KEY_PASSPHRASE || '';
  const passTypeIdentifier = process.env.APPLE_PASS_TYPE_ID || APPLE_PASS_DEFAULT_TYPE_ID;
  const teamIdentifier = process.env.APPLE_PASS_TEAM_ID || APPLE_PASS_DEFAULT_TEAM_ID;
  const wwdr = process.env.APPLE_PASS_WWDR_PEM_BASE64
    ? Buffer.from(process.env.APPLE_PASS_WWDR_PEM_BASE64, 'base64').toString('utf8')
    : APPLE_PASS_WWDR_G4_PEM;
  if (!certB64 || !keyB64) {
    return { configured: false, passTypeIdentifier, teamIdentifier };
  }
  return {
    configured: true,
    signerCert: Buffer.from(certB64, 'base64'),
    signerKey: Buffer.from(keyB64, 'base64'),
    signerKeyPassphrase: passphrase || undefined,
    passTypeIdentifier,
    teamIdentifier,
    wwdr,
  };
}

// Descarga una imagen (logo del negocio) para el pase. Wallet solo
// acepta PNG/JPEG en los pases (no WebP): si el logo es WebP o la
// descarga falla, se devuelve null y el pase sale sin logo.
async function fetchPassImage(url) {
  if (!url || !/^https?:\/\//.test(url)) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const type = (res.headers.get('content-type') || '').toLowerCase();
    if (!type.startsWith('image/png') && !type.startsWith('image/jpeg')) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0 || buf.length > 2 * 1024 * 1024) return null;
    return buf;
  } catch {
    return null;
  }
}

async function handleApplePass(req, res, params) {
  const config = getAppleConfig();

  // ?check=1: la app pregunta si Apple Wallet ya está configurado
  // antes de abrir el pase, para avisar en claro en vez de fallar.
  if (params.check === '1' || params.check === true) {
    return res.status(200).json({ configured: config.configured });
  }

  if (!config.configured) {
    return res.status(503).json({
      error: 'Apple Wallet aún no está configurado',
      code: 'APPLE_WALLET_NOT_CONFIGURED',
    });
  }

  const { biz_id, biz_slug, biz_name, logo_url, bg_color, text_color,
          primary_color, reward_text, stamps, stamps_required,
          member_id, member_name } = params || {};

  if (!biz_id || !member_id) {
    return res.status(400).json({ error: 'Faltan biz_id o member_id' });
  }

  try {
    const passJson = buildApplePassJson({
      biz_name,
      member_id,
      member_name,
      stamps: Number(stamps) || 0,
      stamps_required: Number(stamps_required) || 5,
      reward_text,
      bg_color,
      text_color,
      primary_color,
      passTypeIdentifier: config.passTypeIdentifier,
      teamIdentifier: config.teamIdentifier,
    });

    const buffers = {
      'pass.json': Buffer.from(JSON.stringify(passJson)),
      'icon.png': Buffer.from(APPLE_PASS_ICON_PNG_B64, 'base64'),
      'icon@2x.png': Buffer.from(APPLE_PASS_ICON_2X_PNG_B64, 'base64'),
    };

    // Logo del negocio (PNG/JPEG): se usa como logo.png y como icono.
    const logoBuf = await fetchPassImage(logo_url);
    if (logoBuf) {
      buffers['logo.png'] = logoBuf;
      buffers['icon.png'] = logoBuf;
      buffers['icon@2x.png'] = logoBuf;
    }

    const pass = new PKPass(buffers, {
      wwdr: config.wwdr,
      signerCert: config.signerCert,
      signerKey: config.signerKey,
      ...(config.signerKeyPassphrase
        ? { signerKeyPassphrase: config.signerKeyPassphrase }
        : {}),
    });

    const pkpass = pass.getAsBuffer();
    res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${applePassFileName(biz_slug || biz_id)}"`,
    );
    return res.status(200).send(pkpass);
  } catch (err) {
    console.error('Apple Wallet error:', err);
    return res.status(500).json({ error: err.message });
  }
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Apple Wallet: GET con ?format=apple (el pase se abre por URL para
  // que iOS muestre la hoja de Wallet) o POST con { format: 'apple' }.
  if (req.method === 'GET' && req.query && req.query.format === 'apple') {
    return handleApplePass(req, res, req.query);
  }
  if (req.method === 'POST' && req.body && req.body.format === 'apple') {
    return handleApplePass(req, res, req.body);
  }

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

  // Google Wallet solo acepta un hex sólido: de un fondo con degradado
  // se usa su primera parada (el fondo plano viejo llega tal cual).
  const walletBgColor = bg_color ? loyaltyBgFirstColor(bg_color) : '#000000';

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
      hexBackgroundColor: walletBgColor,
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
      hexBackgroundColor: walletBgColor,
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
