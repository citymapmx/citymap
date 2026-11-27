import React from 'react';
import { describe, expect, it, beforeAll } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import TopLugaresIncreibles from '../components/home/TopLugaresIncreibles.jsx';
import { LUGARES_AUTOPLAY_MS, LUGARES_MIN_CANDIDATOS, LUGARES_TOP_N, nextLugaresIndex, topLugaresIncreibles } from '../lib/lugaresIncreibles.js';
import { TRANSLATIONS, ensureEnglishTranslations } from '../lib/i18n.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

const T = { text: '#111', sub: '#666', bg: '#fff', card: '#fff', shadow: 'none', border: '#eee' };

// Lugares reales de Guadalajara (los del mockup de la propuesta):
// 5 en el top + 1 válido que queda fuera por el corte + 3 distractores
// que la regla del top debe excluir (sin foto, sin rating, otra categoría).
const LUGARES = [
  { id: 'l-1', name: 'Museo Cabañas', slug: 'museo-cabanas', city_slug: 'guadalajara', category: 'lugares', photos: [{ url: 'https://example.org/cabanas.jpg' }], rating: 4.9, review_count: 1200 },
  { id: 'l-2', name: 'Catedral de Guadalajara', slug: 'guadalajara-catedral-de-guadalajara', city_slug: 'guadalajara', category: 'lugares', photos: [{ url: 'https://example.org/catedral.jpg' }], rating: 4.8, review_count: 3000 },
  { id: 'l-3', name: 'El Expiatorio', slug: 'el-expiatorio', city_slug: 'guadalajara', category: 'lugares', photos: [{ url: 'https://example.org/expiatorio.jpg' }], rating: 4.8, review_count: 500 },
  { id: 'l-4', name: 'Plaza de Armas', slug: 'plaza-de-armas', city_slug: 'guadalajara', category: 'lugares', photos: [{ url: 'https://example.org/plaza.jpg' }], rating: 4.7, review_count: 800 },
  { id: 'l-5', name: 'Rotonda de los Jaliscienses Ilustres', slug: 'rotonda-de-los-jaliscienses-ilustres', city_slug: 'guadalajara', category: 'lugares', photos: [{ url: 'https://example.org/rotonda.jpg' }], rating: 4.6, review_count: 900 },
  { id: 'l-6', name: 'Barranca de Huentitán', slug: 'barranca-de-huentitan', city_slug: 'guadalajara', category: 'lugares', photos: [{ url: 'https://example.org/barranca.jpg' }], rating: 4.5, review_count: 2000 },
  { id: 'l-7', name: 'Lugar sin foto', slug: 'lugar-sin-foto', city_slug: 'guadalajara', category: 'lugares', photos: [], rating: 5.0, review_count: 9999 },
  { id: 'l-8', name: 'Lugar sin rating', slug: 'lugar-sin-rating', city_slug: 'guadalajara', category: 'lugares', photos: [{ url: 'https://example.org/sin-rating.jpg' }], rating: null, review_count: 9999 },
  { id: 'l-9', name: 'Restaurante top', slug: 'restaurante-top', city_slug: 'guadalajara', category: 'restaurantes', photos: [{ url: 'https://example.org/restaurante.jpg' }], rating: 5.0, review_count: 9999 },
];

function renderLugares(businesses = LUGARES) {
  return renderToStaticMarkup(
    <TopLugaresIncreibles businesses={businesses} T={T} city={{ slug: 'guadalajara', name: 'Guadalajara' }} cities={[]} handleCardTap={() => {}} />,
  );
}

beforeAll(async () => {
  await ensureEnglishTranslations();
});

describe('Lugares increíbles: regla del top (rating + review_count)', () => {
  it('top 5: rating DESC, desempate review_count DESC', () => {
    const top = topLugaresIncreibles(LUGARES);
    expect(top.map((b) => b.id)).toEqual(['l-1', 'l-2', 'l-3', 'l-4', 'l-5']);
    // El 4.8 con más reseñas (Catedral, 3000) va antes que el 4.8 con
    // menos (Expiatorio, 500).
    expect(top[1].name).toBe('Catedral de Guadalajara');
    expect(top[2].name).toBe('El Expiatorio');
    expect(LUGARES_TOP_N).toBe(5);
  });

  it('excluye sin foto, sin rating y de otra categoría aunque tengan 5.0', () => {
    const top = topLugaresIncreibles(LUGARES);
    expect(top.map((b) => b.id)).not.toContain('l-7');
    expect(top.map((b) => b.id)).not.toContain('l-8');
    expect(top.map((b) => b.id)).not.toContain('l-9');
  });

  it('el rating como string con coma decimal también vale', () => {
    const top = topLugaresIncreibles([
      { id: 'a', name: 'A', category: 'lugares', photos: [{ url: 'https://example.org/a.jpg' }], rating: '4,9', review_count: 10 },
      { id: 'b', name: 'B', category: 'lugares', photos: [{ url: 'https://example.org/b.jpg' }], rating: 4.8, review_count: 10 },
      { id: 'c', name: 'C', category: 'lugares', photos: [{ url: 'https://example.org/c.jpg' }], rating: 'sin dato', review_count: 10 },
    ]);
    expect(top.map((b) => b.id)).toEqual(['a', 'b']);
  });

  it('la regla no deriva nada de subcategory', () => {
    const src = read('../lib/lugaresIncreibles.js');
    expect(src).not.toContain('subcategory');
    expect(src).not.toContain('subcategory'.toUpperCase());
  });

  it('las tarjetas se pintan en el orden del top y la 6ª válida queda fuera', () => {
    const html = renderLugares();
    const order = ['Museo Cabañas', 'Catedral de Guadalajara', 'El Expiatorio', 'Plaza de Armas', 'Rotonda de los Jaliscienses Ilustres'];
    let prev = -1;
    for (const name of order) {
      const idx = html.indexOf(name);
      expect(idx).toBeGreaterThan(prev);
      prev = idx;
    }
    expect(html).not.toContain('Barranca de Huentitán');
    expect(html).not.toContain('Lugar sin foto');
    expect(html).not.toContain('Lugar sin rating');
    expect(html).not.toContain('Restaurante top');
  });
});

describe('Lugares increíbles: mínimo de 3 para montar', () => {
  it('con menos de 3 candidatos no se monta nada', () => {
    expect(LUGARES_MIN_CANDIDATOS).toBe(3);
    expect(renderLugares(LUGARES.slice(0, 2))).toBe('');
    expect(renderLugares([LUGARES[6]])).toBe('');
    expect(renderLugares([])).toBe('');
    expect(renderLugares(null)).toBe('');
  });

  it('con exactamente 3 candidatos sí se monta, con 3 puntos', () => {
    const html = renderLugares(LUGARES.slice(0, 3));
    expect(html).toContain('Lugares increíbles');
    for (let i = 1; i <= 3; i++) {
      expect(html).toContain(`aria-label="Ver lugar ${i} de 3"`);
    }
  });
});

describe('Lugares increíbles: título (clave i18n)', () => {
  it('el título es «Lugares increíbles», sin ciudad', () => {
    const html = renderLugares();
    expect(html).toContain('Lugares increíbles');
    expect(html).toContain('>Lugares increíbles</h2>');
    expect(html).not.toContain('Lugares increíbles de');
  });

  it('la clave existe en español e inglés', () => {
    expect(TRANSLATIONS.es['home_lugares_increibles']).toBe('Lugares increíbles');
    expect(TRANSLATIONS.en['home_lugares_increibles']).toBe('Incredible places');
    expect(TRANSLATIONS.es['home_ver_lugar']).toBe('Ver lugar');
    expect(TRANSLATIONS.en['home_ver_lugar']).toBe('Show place');
  });
});

describe('Lugares increíbles: carrusel horizontal automático', () => {
  it('la lista es un carrusel con scroll-snap, no una columna vertical', () => {
    const html = renderLugares();
    expect(html).toContain('scroll-snap-type:x mandatory');
    expect(html).toContain('overflow-x:auto');
    expect(html).toContain('scroll-snap-align:center');
    expect(html).not.toContain('flex-direction:column');
    // La región del carrusel se anuncia como tal.
    expect(html).toContain('aria-roledescription="carrusel"');
  });

  it('tiene 5 puntos de posición, el primero activo', () => {
    const html = renderLugares();
    for (let i = 1; i <= 5; i++) {
      expect(html).toContain(`aria-label="Ver lugar ${i} de 5"`);
    }
    expect(html).toContain('aria-current="true"');
  });

  it('con 3 candidatos hay 3 puntos', () => {
    const html = renderLugares(LUGARES.slice(0, 3));
    expect(html).toContain('aria-label="Ver lugar 1 de 3"');
  });

  it('el avance automático es cada 4.5 s y da la vuelta en bucle', () => {
    expect(LUGARES_AUTOPLAY_MS).toBe(4500);
    expect(nextLugaresIndex(0, 5)).toBe(1);
    expect(nextLugaresIndex(4, 5)).toBe(0);
    expect(nextLugaresIndex(2, 5)).toBe(3);
    expect(nextLugaresIndex(0, 0)).toBe(0);
  });

  it('el cableado del autoplay está en el componente', () => {
    const src = read('../components/home/TopLugaresIncreibles.jsx');
    expect(src).toContain('setInterval');
    expect(src).toContain('LUGARES_AUTOPLAY_MS');
    // Se pausa al interactuar, al esconder la pestaña y con
    // prefers-reduced-motion (mismo patrón que TopImperdibles).
    expect(src).toContain('onPointerDown');
    expect(src).toContain('onPointerUp');
    expect(src).toContain('visibilitychange');
    expect(src).toContain("prefers-reduced-motion: reduce");
    // Los puntos saltan a la tarjeta tocada.
    expect(src).toContain('goTo(i)');
  });
});

describe('Lugares increíbles: tarjetas con foto llena y tap a la ficha', () => {
  it('la tarjeta conserva foto llena y título', () => {
    const html = renderLugares();
    expect(html).toContain('https://example.org/cabanas.jpg');
    expect(html).toContain('Museo Cabañas');
  });

  it('el tap abre la ficha con el flujo de negocio (handleCardTap) y la ruta de la ficha', () => {
    const html = renderLugares();
    expect(html).toContain('href="/guadalajara/museo-cabanas"');
    // El slug con prefijo de ciudad se limpia, como en handleCardTap.
    expect(html).toContain('href="/guadalajara/catedral-de-guadalajara"');
    const src = read('../components/home/TopLugaresIncreibles.jsx');
    expect(src).toContain('handleCardTap(b)');
    const home = read('../views/HomeView.jsx');
    expect(home).toContain('TopLugaresIncreibles');
    expect(home).toContain('businesses={biz}');
    expect(home).toContain('handleCardTap={handleCardTap}');
  });
});
