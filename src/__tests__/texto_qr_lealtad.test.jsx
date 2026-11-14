import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import LoyaltyCardModal from '../views/LoyaltyCardModal.jsx';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

const noop = () => {};

// Tarjeta de Eduardo Barber (Tepic), la de la captura de Jonathan
// (14 nov 2026): el texto bajo el QR decía «al cajero» y no todos los
// negocios tienen cajero. Decisión de Jonathan: solo cambiar el texto
// por «en el negocio», SIN agregar términos y condiciones.
const MEMBER = { id: 'member-eduardo', stamps: 0 };
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
  name: 'Eduardo Barber',
  banner_url: 'https://example.org/eduardo-banner.jpg',
  photos: [{ url: 'https://example.org/eduardo.jpg' }],
};

function renderModal(props = {}) {
  return renderToStaticMarkup(
    <LoyaltyCardModal open member={MEMBER} card={CARD} biz={BIZ} onClose={noop} {...props} />,
  );
}

describe('texto bajo el QR de la tarjeta de lealtad', () => {
  it('la vista de la tarjeta (/lealtad/:bizId) dice «en el negocio», no «al cajero»', () => {
    const src = read('../views/LoyaltyCardView.jsx');
    expect(src).toContain('Muestra este código en el negocio para recibir tu sello');
    expect(src).toContain('Muestra este código en el negocio para canjear tu premio');
    expect(src).not.toContain('al cajero');
  });

  it('el modal de la tarjeta dice «en el negocio», no «al cajero»', () => {
    const src = read('../views/LoyaltyCardModal.jsx');
    expect(src).toContain('Muestra este código en el negocio para recibir tu sello');
    expect(src).toContain('Muestra este código en el negocio para canjear tu premio');
    expect(src).not.toContain('al cajero');
  });

  it('el modal con sellos pendientes muestra el texto nuevo bajo el QR', () => {
    const html = renderModal();
    expect(html).toContain('Muestra este código en el negocio para recibir tu sello');
    expect(html).not.toContain('al cajero');
  });

  it('el modal con la tarjeta completa muestra el texto nuevo de canje', () => {
    const html = renderModal({ member: { ...MEMBER, stamps: 5 } });
    expect(html).toContain('Muestra este código en el negocio para canjear tu premio');
    expect(html).not.toContain('al cajero');
  });
});
