import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import LoyaltyCardModal from '../views/LoyaltyCardModal.jsx';
import {
  APPLE_PASS_DEFAULT_TEAM_ID,
  APPLE_PASS_DEFAULT_TYPE_ID,
  applePassFileName,
  buildApplePassJson,
  hexToRgb,
} from '../lib/applePass.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const noop = () => {};

const CARD = {
  id: 'card-eduardo',
  stamps_required: 5,
  reward_text: 'Corte gratis',
  bg_color: '#1E5AA8',
  text_color: '#FFFFFF',
  primary_color: '#FFFFFF',
  type: 'card|star',
  logo_url: 'https://example.org/eduardo-logo.png',
};
const BIZ = {
  id: 'biz-eduardo',
  slug: 'tepic-eduardo-barber',
  name: 'Eduardo Barber',
  banner_url: 'https://example.org/eduardo-banner.jpg',
  photos: [{ url: 'https://example.org/eduardo.jpg' }],
};
const MEMBER = { id: 'member-eduardo', stamps: 2, name: 'Jonathan Arana' };

function renderModal(props = {}) {
  return renderToStaticMarkup(
    <LoyaltyCardModal open member={MEMBER} card={CARD} biz={BIZ} onClose={noop} {...props} />,
  );
}

// Apple Wallet v1: pase .pkpass ESTÁTICO (storeCard) con QR a
// citymap.mx/scan/<member_id>. Sin actualizaciones en vivo (fase 2).
// El certificado real (.p12 del Pass Type ID) aún no existe: el endpoint
// debe avisar en claro (503) si faltan las variables de entorno.
describe('Apple Wallet: constructor del pase (src/lib/applePass.js)', () => {
  it('hexToRgb convierte hex a rgb() para el pase', () => {
    expect(hexToRgb('#1E5AA8')).toBe('rgb(30, 90, 168)');
    expect(hexToRgb('#FFFFFF')).toBe('rgb(255, 255, 255)');
    expect(hexToRgb('#000')).toBe('rgb(0, 0, 0)');
    expect(hexToRgb(null)).toBe('rgb(0, 0, 0)');
  });

  it('el pass.json es un storeCard con los datos de la tarjeta', () => {
    const pass = buildApplePassJson({
      biz_name: BIZ.name,
      member_id: MEMBER.id,
      member_name: MEMBER.name,
      stamps: MEMBER.stamps,
      stamps_required: CARD.stamps_required,
      reward_text: CARD.reward_text,
      bg_color: CARD.bg_color,
      text_color: CARD.text_color,
    });
    expect(pass.formatVersion).toBe(1);
    expect(pass.passTypeIdentifier).toBe(APPLE_PASS_DEFAULT_TYPE_ID);
    expect(pass.passTypeIdentifier).toBe('pass.mx.citymap.app.loyalty');
    expect(pass.teamIdentifier).toBe(APPLE_PASS_DEFAULT_TEAM_ID);
    expect(pass.teamIdentifier).toBe('74S45QN779');
    expect(pass.serialNumber).toBe('member-eduardo');
    expect(pass.organizationName).toBe('Eduardo Barber');
    expect(pass.description).toContain('Eduardo Barber');
    expect(pass.backgroundColor).toBe('rgb(30, 90, 168)');
    expect(pass.foregroundColor).toBe('rgb(255, 255, 255)');
    expect(pass.storeCard.headerFields[0].value).toBe('2 de 5');
    expect(pass.storeCard.primaryFields[0].value).toBe('Jonathan Arana');
    expect(pass.storeCard.secondaryFields[0].value).toBe('Corte gratis');
    expect(pass.barcodes[0].format).toBe('PKBarcodeFormatQR');
    expect(pass.barcodes[0].message).toBe('https://citymap.mx/scan/member-eduardo');
  });

  it('el fondo con degradado usa su primera parada', () => {
    const pass = buildApplePassJson({
      biz_name: 'X', member_id: 'm1', bg_color: '#F97316 → #DB2777',
    });
    expect(pass.backgroundColor).toBe('rgb(249, 115, 22)');
  });

  it('el nombre de archivo del .pkpass usa el slug del negocio', () => {
    expect(applePassFileName('tepic-eduardo-barber')).toBe('tepic-eduardo-barber-tarjeta.pkpass');
    expect(applePassFileName('')).toBe('tarjeta-tarjeta.pkpass');
  });
});

describe('Apple Wallet: endpoint (api/loyalty-wallet.js)', () => {
  const endpoint = read('../../api/loyalty-wallet.js');

  it('el pase de Apple vive en el endpoint EXISTENTE (no hay función nueva)', () => {
    expect(endpoint).toContain("format === 'apple'");
    expect(endpoint).toContain('application/vnd.apple.pkpass');
    expect(endpoint).toContain('PKPass');
    expect(endpoint).toContain('passkit-generator');
  });

  it('el pase se sirve por GET (URL directa para la hoja de Wallet) y por POST', () => {
    expect(endpoint).toContain("req.method === 'GET'");
    expect(endpoint).toContain("req.query.format === 'apple'");
    expect(endpoint).toContain("req.body.format === 'apple'");
  });

  it('sin certificado devuelve 503 claro, no crashea', () => {
    expect(endpoint).toContain('APPLE_WALLET_NOT_CONFIGURED');
    expect(endpoint).toContain('Apple Wallet aún no está configurado');
    expect(endpoint).toContain('503');
  });

  it('lee el certificado de variables de entorno (nunca un .p12 del repo)', () => {
    expect(endpoint).toContain('APPLE_PASS_CERT_PEM_BASE64');
    expect(endpoint).toContain('APPLE_PASS_KEY_PEM_BASE64');
    expect(endpoint).toContain('APPLE_PASS_KEY_PASSPHRASE');
    expect(endpoint).toContain('APPLE_PASS_TYPE_ID');
    expect(endpoint).toContain('APPLE_PASS_TEAM_ID');
    // Ninguna variable se llama *P12 ni se lee un .p12 del disco
    // (el comentario solo explica cómo convertirlo a PEM).
    expect(endpoint).not.toMatch(/APPLE_PASS[^ ]*P12/);
    expect(endpoint).not.toContain('readFileSync');
  });

  it('el WWDR de Apple va embebido (G4) con override por entorno', () => {
    expect(endpoint).toContain('APPLE_PASS_WWDR_G4_PEM');
    expect(endpoint).toContain('APPLE_PASS_WWDR_PEM_BASE64');
    expect(endpoint).toContain('AppleWWDRCAG4.cer');
  });

  it('el logo solo se usa si es PNG/JPEG (Wallet no acepta WebP)', () => {
    expect(endpoint).toContain('image/png');
    expect(endpoint).toContain('image/jpeg');
  });
});

describe('Apple Wallet: botón en el modal flotante', () => {
  it('con miembro el modal pinta el botón de Apple Wallet debajo del QR', () => {
    const html = renderModal();
    expect(html).toContain('Añadir a Apple Wallet');
    expect(html).toContain('Añadir a Google Wallet');
    // Debajo del QR: el de Apple va después del de Google.
    expect(html.indexOf('Añadir a Apple Wallet')).toBeGreaterThan(
      html.indexOf('Añadir a Google Wallet'),
    );
  });

  it('sin miembro el modal NO pinta el botón de Apple Wallet', () => {
    const html = renderModal({ member: null });
    expect(html).not.toContain('Añadir a Apple Wallet');
    expect(html).toContain('Únete al programa');
  });

  it('el botón pregunta si está configurado y abre el pase con el navegador del sistema', () => {
    const modal = read('../views/LoyaltyCardModal.jsx');
    expect(modal).toContain('handleAppleWallet');
    expect(modal).toContain("format: 'apple'");
    expect(modal).toContain('check=1');
    expect(modal).toContain('Apple Wallet aún no está configurado');
    expect(modal).toContain("import('@capacitor/browser')");
    expect(modal).toContain('Browser.open({ url })');
    expect(modal).toContain('member_id: currentMember.id');
  });
});

describe('Apple Wallet: botón en la página /lealtad/:bizId', () => {
  it('el botón de Apple de la página ya tiene acción (antes no hacía nada)', () => {
    const view = read('../views/LoyaltyCardView.jsx');
    expect(view).toContain('handleAppleWallet');
    expect(view).toContain('onClick={handleAppleWallet}');
    expect(view).toContain("format: 'apple'");
    expect(view).toContain('check=1');
  });
});
