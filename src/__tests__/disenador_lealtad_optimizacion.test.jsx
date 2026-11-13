import React from 'react';
import { describe, expect, it, vi, beforeAll } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import LoyaltyDesigner from '../components/loyalty/LoyaltyDesigner.jsx';

vi.mock('../lib/supabase.js', () => ({
  sb: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn(), delWhere: vi.fn() },
}));

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const SRC = read('../components/loyalty/LoyaltyDesigner.jsx');

const T = {
  text: '#111', sub: '#666', bg: '#fff', white: '#fff', border: '#eee',
  green: '#000', greenL: '#EDE9FE', red: '#DC2626', dark: false,
};

const CARRITO = {
  id: 'biz-carrito',
  name: 'Carrito La Paz Tostadas de Atún',
  logo_url: 'https://example.com/logo-carrito.png',
  img1: null,
  slug: 'tepic-carrito-la-paz-tostadas-de-atun',
  city_slug: 'tepic',
};

beforeAll(() => {
  if (typeof globalThis.window === 'undefined') {
    globalThis.window = {
      innerWidth: 390,
      addEventListener: () => {},
      removeEventListener: () => {},
      location: { hostname: 'citymap.mx', pathname: '/' },
    };
  }
});

describe('Diseñador de lealtad: optimización (sin sección LOGO, borrar arriba, sin pastilla)', () => {
  it('la sección LOGO ya no se renderiza en la pestaña Diseño', () => {
    expect(SRC).not.toContain('>Logo</label>');
    expect(SRC).not.toContain('Subir Logo (PNG Transparente)');
  });

  it('el logo sigue llegando a la tarjeta desde el negocio (sin editarlo en el diseñador)', () => {
    // Estado inicial y carga: el logo viene del negocio o de la tarjeta guardada.
    expect(SRC).toContain('logo_url: business?.logo_url || business?.img1 || null');
    expect(SRC).toContain('logo_url: card.logo_url || business.logo_url || business.img1 || null');
    // Guardar sigue persistiendo el logo guardado.
    expect(SRC).toContain('logo_url: config.logo_url,');
    // La vista previa sigue mostrando el logo del negocio.
    expect(SRC).toContain('{config.logo_url ? (');
  });

  it('la pastilla «Previsualización en vivo» ya no existe', () => {
    expect(SRC).not.toContain('Previsualización en vivo');
  });

  it('la vista previa de la tarjeta sigue existiendo', () => {
    expect(SRC).toContain('Tarjeta de Lealtad Preview');
  });

  it('«Borrar programa y clientes» está en el encabezado y solo una vez', () => {
    const matches = SRC.match(/Borrar programa y clientes/g) || [];
    expect(matches).toHaveLength(1);
    const headerStart = SRC.indexOf('{/* HEADER */}');
    const bodyStart = SRC.indexOf('{/* CONDITIONAL BODY');
    const pos = SRC.indexOf('Borrar programa y clientes');
    expect(headerStart).toBeGreaterThan(-1);
    expect(bodyStart).toBeGreaterThan(-1);
    expect(pos).toBeGreaterThan(headerStart);
    expect(pos).toBeLessThan(bodyStart);
  });

  it('el botón de borrar del encabezado sigue usando el diálogo de confirmación', () => {
    expect(SRC).toContain('¿Estás seguro de que quieres borrar el programa de lealtad? Todos tus clientes perderán sus sellos. Esta acción NO se puede deshacer.');
    const delPos = SRC.indexOf('onClick={handleDeleteProgram}');
    expect(delPos).toBeGreaterThan(-1);
    expect(SRC.indexOf('onClick={onClose}')).toBeGreaterThan(delPos);
  });

  it('el pie ya no tiene el botón de borrar, pero conserva el aviso sin tarjeta', () => {
    expect(SRC).toContain('Requiere plan destacado activo');
  });

  it('el diseñador se renderiza sin romperse y sin la pastilla', () => {
    const html = renderToStaticMarkup(
      <LoyaltyDesigner business={CARRITO} onClose={() => {}} T={T} />
    );
    expect(html).toContain('Tarjetas de Lealtad');
    expect(html).not.toContain('Previsualización en vivo');
  });
});
