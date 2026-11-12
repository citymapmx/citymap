import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import LoyaltyCardModal from '../views/LoyaltyCardModal.jsx';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

const noop = () => {};

// Carrito La Paz Tostadas de Atún (Tepic), el negocio real de las
// capturas de Jonathan: la tarjeta de su perfil, 0 de 5 sellos.
const MEMBER = { id: 'member-carrito', stamps: 0 };
const CARD = {
  id: 'card-carrito',
  stamps_required: 5,
  reward_text: '2 Tostadas gratis',
  bg_color: 'linear-gradient(135deg, #F97316, #DB2777, #7C3AED)',
  text_color: '#FFFFFF',
  primary_color: '#FFFFFF',
  type: 'card|star',
  logo_url: 'https://example.org/carrito-logo.png',
};
const BIZ = {
  id: 'biz-carrito',
  name: 'Carrito La Paz Tostadas de Atún',
  banner_url: 'https://example.org/carrito-banner.jpg',
  photos: [{ url: 'https://example.org/carrito.jpg' }],
};

function renderModal(props = {}) {
  return renderToStaticMarkup(
    <LoyaltyCardModal open member={MEMBER} card={CARD} biz={BIZ} onClose={noop} {...props} />,
  );
}

// Dos modales que se abrían centrados en toda la página larga en vez
// de en la pantalla visible del teléfono (Jonathan, 12 nov 2026,
// moto g54): el detalle de la tarjeta de lealtad (perfil) y la
// tarjeta «Filtros de eventos». Causa raíz común: el overlay es
// `position: fixed` pero vive dentro de una vista cuya raíz lleva
// `...viewStyle` (App.jsx) — `transform: translateY(0)` persistente
// tras el fade — y ese transform vuelve la raíz el bloque contenedor
// de los fixed: el overlay cubre toda la página y el modal queda
// centrado en el medio de la página, fuera de la pantalla visible.
// El arreglo en los dos: el modal se monta con createPortal en
// document.body, así el fixed cuelga de la ventana. Es el mismo
// patrón del arreglo de la hoja de compartir (PR #244).
describe('modales centrados en la pantalla del teléfono', () => {
  it('el detalle de la tarjeta se monta con portal en document.body', () => {
    const src = read('../views/LoyaltyCardModal.jsx');
    expect(src).toContain("import { createPortal } from 'react-dom'");
    expect(src).toContain('createPortal(modal, document.body)');
    // Sin document (SSR/pruebas) se pinta en línea, nunca se rompe.
    expect(src).toContain("typeof document === 'undefined'");
  });

  it('el detalle de la tarjeta es un overlay fixed centrado en la ventana', () => {
    const html = renderModal();
    expect(html).toContain('position:fixed');
    expect(html).toContain('inset:0');
    // El contenedor centra en los dos ejes (ahora en la ventana de
    // verdad, con el portal: antes solo cubría la página del perfil).
    expect(html).toContain('align-items:center');
    expect(html).toContain('justify-content:center');
    // El contenido no cambia: nombre, sellos, premio y QR dentro.
    expect(html).toContain('Carrito La Paz Tostadas de Atún');
    expect(html).toContain('0 DE 5 SELLOS');
    expect(html).toContain('2 Tostadas gratis');
    expect(html).toContain('Muestra este código al cajero para recibir tu sello');
    // El panel sigue acotado a la altura visible.
    expect(html).toContain('max-height:90vh');
  });

  it('el detalle de la tarjeta no se pinta sin miembro, tarjeta o negocio', () => {
    expect(renderModal({ member: null })).toBe('');
    expect(renderModal({ card: null })).toBe('');
    expect(renderModal({ biz: null })).toBe('');
    expect(renderModal({ open: false })).toBe('');
  });

  it('la tarjeta de filtros se monta con portal en document.body', () => {
    const src = read('../views/EventsView.jsx');
    expect(src).toContain("import { createPortal } from 'react-dom'");
    expect(src).toContain('createPortal(filterOverlay, document.body)');
    // Sin document (SSR/pruebas) se pinta en línea, nunca se rompe.
    expect(src).toContain("typeof document === 'undefined'");
  });

  it('la tarjeta de filtros sigue siendo un overlay fixed centrado', () => {
    const src = read('../views/EventsView.jsx');
    const start = src.indexOf('const filterOverlay = (');
    expect(start).toBeGreaterThan(-1);
    const end = src.indexOf('\n  return (', start);
    const sheet = src.slice(start, end);
    expect(sheet).toContain('position: "fixed"');
    expect(sheet).toContain('alignItems: "center"');
    expect(sheet).toContain('justifyContent: "center"');
    // El contenido y el comportamiento no cambian.
    expect(sheet).toContain('eventos_fecha');
    expect(sheet).toContain('eventos_precio');
    expect(sheet).toContain('eventos_ordenar_por');
    expect(sheet).toContain('eventos_mostrar_eventos');
    expect(sheet).toContain('eventos_limpiar_filtros');
    expect(sheet).toContain('applySheet');
    expect(sheet).toContain('clearFilters');
  });

  it('los dos modales cuelgan del body: ningún ancestro con transform los descentra', () => {
    // El portal es la garantía en los dos sitios que usan el detalle
    // de la tarjeta (perfil y Recompensas) y en el de los filtros.
    const carousel = read('../components/loyalty/ProfileLoyaltyCarousel.jsx');
    expect(carousel).toContain('<LoyaltyCardModal');
    const wallet = read('../views/WalletView.jsx');
    expect(wallet).toContain('<LoyaltyCardModal');
    const modal = read('../views/LoyaltyCardModal.jsx');
    expect(modal).toContain('createPortal(modal, document.body)');
    const events = read('../views/EventsView.jsx');
    expect(events).toContain('createPortal(filterOverlay, document.body)');
  });
});
