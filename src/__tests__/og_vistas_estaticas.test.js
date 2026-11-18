import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import og from '../../api/og.js';

// Soft 404 (nov 2026): Googlebot pedía /about y el middleware lo desviaba
// a /api/og?vista=about, pero og.js no tenía caso para "about" (ni
// "privacy" ni "terms"): caía en los valores por defecto — título genérico
// "CityMap México", descripción "Descubre tu ciudad." y canónica
// https://citymap.mx/?vista=about — un 200 casi vacío que Google marcó
// como Soft 404 (1 página afectada, rastreada el 12 nov 2026).

const request = (path, host = 'citymap.mx', agent = 'Googlebot') => new Request(`https://${host}${path}`, { headers: { 'user-agent': agent } });
const json = data => new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => json([])));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('og vista=about: contenido real, no HTML genérico vacío', () => {
  it('devuelve 200 con el título y la canónica de /about', async () => {
    const response = await og(request('/api/og?vista=about'));
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('<title>Acerca de Nosotros — CityMap</title>');
    expect(html).toContain('<link rel="canonical" href="https://citymap.mx/about"/>');
    expect(html).not.toContain('?vista=');
  });

  it('el cuerpo trae el contenido real de Acerca de (Misión, Visión, valores)', async () => {
    const html = await (await og(request('/api/og?vista=about'))).text();
    expect(html).toContain('Tu guía local inteligente para descubrir lo mejor de la ciudad, en un solo lugar.');
    expect(html).toContain('<h2>Misión</h2>');
    expect(html).toContain('<h2>Visión</h2>');
    expect(html).toContain('Comunidad Primero');
    expect(html).toContain('Innovación Continua');
    expect(html).toContain('Transparencia');
    expect(html).toContain('Calidad');
  });
});

describe('og vista=privacy y vista=terms: mismo arreglo', () => {
  it('privacy: título, canónica /privacy y secciones del Aviso', async () => {
    const response = await og(request('/api/og?vista=privacy'));
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('<title>Política de Privacidad — CityMap</title>');
    expect(html).toContain('<link rel="canonical" href="https://citymap.mx/privacy"/>');
    expect(html).not.toContain('?vista=');
    expect(html).toContain('Aviso de Privacidad');
    expect(html).toContain('Información que recopilamos');
    expect(html).toContain('Derechos del usuario');
    expect(html).toContain('Menores de edad');
  });

  it('terms: título, canónica /terms y secciones de los Términos', async () => {
    const response = await og(request('/api/og?vista=terms'));
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('<title>Términos y Condiciones — CityMap</title>');
    expect(html).toContain('<link rel="canonical" href="https://citymap.mx/terms"/>');
    expect(html).not.toContain('?vista=');
    expect(html).toContain('Términos de Uso');
    expect(html).toContain('Aceptación de los Términos');
    expect(html).toContain('Limitación de Responsabilidad');
    expect(html).toContain('soporte@citymap.mx');
  });
});

describe('og vista sin caso: la canónica nunca es una URL con ?vista=', () => {
  it('vista=lealtad (sin caso propio) canoniza a /lealtad, no a /?vista=lealtad', async () => {
    const response = await og(request('/api/og?vista=lealtad'));
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('<link rel="canonical" href="https://citymap.mx/lealtad"/>');
    expect(html).not.toContain('?vista=');
  });
});

describe('puerta de ciudad: las páginas estáticas no piden elegir ciudad', () => {
  const app = readFileSync(new URL('../App.jsx', import.meta.url), 'utf8');

  it('el estado inicial excluye about, privacy y terms (junto a lealtad, wallet, scan)', () => {
    expect(app).toContain('["lealtad", "wallet", "scan", "about", "privacy", "terms"].includes(initialView)');
  });

  it('el efecto que reactiva la puerta al cargar las ciudades también las excluye', () => {
    expect(app).toContain('!["about", "privacy", "terms"].includes(initialView)');
  });
});
