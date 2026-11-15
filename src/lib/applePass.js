// Pase de Apple Wallet (PassKit .pkpass) para las tarjetas de lealtad.
// v1: pase ESTÁTICO (storeCard) con código QR a citymap.mx/scan/<member_id>.
// Sin actualizaciones en vivo dentro de Wallet (fase 2): el QR apunta a
// la tarjeta en vivo, así que los sellos siempre se ven al día al abrir
// el enlace. El pase solo se genera en el servidor (api/loyalty-wallet.js)
// con el certificado del Pass Type ID; aquí solo va la construcción del
// pass.json (puro, testeable sin certificados).
import { loyaltyBgFirstColor } from './loyaltyColorStyles.js';

// Pass Type ID creado en el portal de Apple (14 Nov 2026): «CityMap Loyalty».
export const APPLE_PASS_DEFAULT_TYPE_ID = 'pass.mx.citymap.app.loyalty';
// Team ID de la cuenta Apple Developer de Jonathan.
export const APPLE_PASS_DEFAULT_TEAM_ID = '74S45QN779';

// Pase: "rgb(r, g, b)". El fondo de la tarjeta puede ser un degradado
// ("#A → #B"): se usa su primera parada, como en Google Wallet.
export function hexToRgb(hex) {
  const raw = String(hex || '#000000').replace('#', '').trim();
  const v = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  const n = parseInt(v, 16);
  if (Number.isNaN(n)) return 'rgb(0, 0, 0)';
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}

// Nombre de archivo del .pkpass descargado.
export function applePassFileName(bizSlug) {
  const slug = String(bizSlug || 'tarjeta')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'tarjeta';
  return `${slug}-tarjeta.pkpass`;
}

export function buildApplePassJson({
  biz_name,
  member_id,
  member_name,
  stamps = 0,
  stamps_required = 5,
  reward_text = '',
  bg_color = '#000000',
  text_color = '#FFFFFF',
  passTypeIdentifier = APPLE_PASS_DEFAULT_TYPE_ID,
  teamIdentifier = APPLE_PASS_DEFAULT_TEAM_ID,
}) {
  const required = stamps_required || 5;
  const current = stamps || 0;
  const bg = loyaltyBgFirstColor(bg_color) || '#000000';
  const fg = hexToRgb(text_color || '#FFFFFF');

  return {
    formatVersion: 1,
    passTypeIdentifier,
    serialNumber: String(member_id),
    teamIdentifier,
    organizationName: biz_name || 'CityMap',
    description: `Tarjeta de lealtad de ${biz_name || 'CityMap'}`,
    logoText: biz_name || 'CityMap',
    backgroundColor: hexToRgb(bg),
    foregroundColor: fg,
    labelColor: fg,
    storeCard: {
      headerFields: [
        { key: 'sellos', label: 'SELLOS', value: `${current} de ${required}` },
      ],
      primaryFields: [
        { key: 'cliente', label: 'Cliente', value: member_name || 'Cliente' },
      ],
      secondaryFields: [
        { key: 'premio', label: 'Premio al completar', value: reward_text || '—' },
      ],
      backFields: [
        {
          key: 'como',
          label: 'Cómo usarla',
          value: 'Muestra el código QR en el negocio para recibir un sello. Al completar los sellos, canjea tu premio.',
        },
        { key: 'miembro', label: 'ID de miembro', value: String(member_id) },
      ],
    },
    barcodes: [
      {
        format: 'PKBarcodeFormatQR',
        message: `https://citymap.mx/scan/${member_id}`,
        messageEncoding: 'iso-8859-1',
      },
    ],
  };
}
