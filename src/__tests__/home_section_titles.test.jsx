import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { MemoryRouter } from 'react-router-dom';
import SquareCarousel from '../components/home/SquareCarousel.jsx';
import TopImperdibles from '../components/home/TopImperdibles.jsx';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

const T = { text: '#111', sub: '#666', bg: '#fff', card: '#fff', white: '#fff', shadow: 'none', border: '#eee' };

// Títulos de sección unificados (PR #196): todos en mayúsculas (por CSS),
// centrados, sin emojis y con el mismo tamaño (22 px). «Próximos eventos»
// se prueba en event_wheel_3d.test.jsx; aquí van los demás de la página
// de ciudad y las claves i18n huérfanas del subtítulo borrado.
describe('home section titles (PR #196)', () => {
  it('SquareCarousel: title in uppercase, 22 px, centered', () => {
    const html = renderToStaticMarkup(
      <SquareCarousel
        title="Para cerrar el día"
        list={[{ id: 'b1', name: 'Taquería X', category: 'restaurantes', logo_url: 'https://example.org/logo.png' }]}
        handleCardTap={() => {}}
        getThumbUrl={(u) => u}
        CAT_EMOJI={{}}
        T={T}
        FONT_BIZ="system-ui"
      />,
    );
    expect(html).toContain('Para cerrar el día');
    expect(html).toContain('font-size:22px');
    expect(html).toContain('text-transform:uppercase');
    expect(html).toContain('text-align:center');
  });

  it('TopImperdibles: no medal emoji, title in uppercase, 22 px, centered', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <TopImperdibles
          experiences={[{ id: 'exp-1', title: 'Cerro de la Cruz', city_slug: 'zapopan', gallery: ['https://example.org/foto.jpg'] }]}
          T={T}
          city={{ slug: 'zapopan', name: 'Zapopan' }}
        />
      </MemoryRouter>,
    );
    // Título nuevo (PR #237): «Experiencias destacadas», sin el nombre de
    // la ciudad y sin el «Los 5 imperdibles de» anterior.
    expect(html).toContain('Experiencias destacadas');
    expect(html).not.toContain('Los 5 imperdibles de');
    expect(html).not.toContain('Zapopan');
    // Sin la medalla 🥇 del título (las insignias de ranking de las
    // tarjetas, si las hay, no son el título y no se tocan).
    expect(html).not.toContain('🥇');
    expect(html).toContain('font-size:22px');
    expect(html).toContain('text-transform:uppercase');
    expect(html).toContain('text-align:center');
  });

  it('HomeTopGrids: both titles in uppercase, 22 px, centered, no star emoji', () => {
    const grids = read('../components/home/HomeTopGrids.jsx');
    // «Los más guardados» y «Los más valorados» (2 sitios: con y sin datos).
    expect(grids.match(/textTransform: ?"uppercase"/g)).toHaveLength(3);
    expect(grids.match(/fontSize: ?22/g)).toHaveLength(3);
    expect(grids.match(/textAlign: ?["']center["']/g)).toHaveLength(3);
    // Sin la estrella ⭐ de «Los más valorados» (el corazón SVG de
    // «Los más guardados» es un icono del sistema, no un emoji).
    expect(grids).not.toContain('⭐');
  });

  it('i18n: the removed subtitle keys are gone (es/en)', () => {
    const es = read('../lib/i18n.js');
    const en = read('../lib/i18n-en.js');
    for (const content of [es, en]) {
      expect(content).not.toContain('home_eventos_ciudad');
      expect(content).not.toContain('home_eventos_todas_ciudades');
    }
  });
});
