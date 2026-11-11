import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { CoverflowSk } from '../components/ui/Skeleton.jsx';
import { TRANSLATIONS, ensureEnglishTranslations } from '../lib/i18n.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// PR #188 — rendimiento en teléfono (/tepic, PageSpeed móvil 10 Nov 2026:
// Rendimiento 68, LCP lab 8.1 s, CLS 0.23, JS sin usar 133 KiB, caché
// 467 KiB). Cada cambio con su número medido está en su prueba.

describe('rendimiento teléfono: el esqueleto de la rueda mide como la rueda (CLS)', () => {
  it('CoverflowSk tiene la geometría de EventWheel3D (encabezado + 300 px + 32 px)', () => {
    const html = renderToStaticMarkup(<CoverflowSk dark={false} />);
    // Tambor de 300 px (EventWheel3D.css: .event-wheel-viewport) y 32 px
    // abajo (.event-wheel{margin:0 0 32px}): si el esqueleto mide menos,
    // la página salta al llegar los eventos.
    expect(html).toContain('height:300px');
    expect(html).toContain('margin:0 0 32px');
    // El encabezado (título + subtítulo) va ARRIBA del tambor, como en la
    // rueda; antes el bloque medía clamp(240px, 70vw, 326px) con el texto
    // debajo, ~70 px menos que la rueda en el teléfono.
    expect(html).not.toContain('clamp(240px');
    const headerPos = html.indexOf('height:19px');
    const blockPos = html.indexOf('height:300px');
    expect(headerPos).toBeGreaterThan(-1);
    expect(blockPos).toBeGreaterThan(-1);
    expect(headerPos).toBeLessThan(blockPos);
  });
});

describe('rendimiento teléfono: caché de 24 h para los archivos de public/ (vercel.json)', () => {
  const vercel = JSON.parse(read('../../vercel.json'));
  const rule = vercel.headers.find((h) =>
    h.headers.some((x) => x.key === 'Cache-Control' && x.value === 'public, max-age=86400'),
  );

  it('existe la regla de caché para imágenes y fuentes sueltas', () => {
    expect(rule).toBeDefined();
  });

  it('la regla cubre /logo-brand.svg y /favicon.png pero no /assets/ ni el HTML', () => {
    const re = new RegExp(`^${rule.source}$`);
    expect(re.test('/logo-brand.svg')).toBe(true);
    expect(re.test('/favicon.png')).toBe(true);
    expect(re.test('/Coolvetica Rg.otf')).toBe(true);
    expect(re.test('/manifest.webmanifest')).toBe(true);
    expect(re.test('/index.html')).toBe(false);
    expect(re.test('/api/og')).toBe(false);
    expect(re.test('/assets/index-abc123.js')).toBe(false);
  });

  it('la regla de /assets/ sigue con immutable 1 año (no se pisa)', () => {
    const assets = vercel.headers.find((h) => h.source === '/assets/(.*)');
    expect(assets).toBeDefined();
    expect(assets.headers).toContainEqual({
      key: 'Cache-Control',
      value: 'public, max-age=31536000, immutable',
    });
  });
});

describe('rendimiento teléfono: fuentes muertas fuera de la primera pintura', () => {
  const html = read('../../index.html');
  const css = read('../index.css');
  const vite = read('../../vite.config.js');

  it('Coolvetica ya no se precarga ni se declara (ningún componente la usa)', () => {
    expect(html).not.toContain('Coolvetica Rg.otf');
    expect(css).not.toContain("font-family: 'Coolvetica'");
    expect(vite).not.toContain('Coolvetica Rg.otf');
  });

  it('la URL de Google Fonts solo trae las familias que se usan (DM Sans y Montserrat)', () => {
    expect(html).not.toContain('DM+Serif+Display');
    expect(html).not.toContain('Plus+Jakarta+Sans');
    expect(html).toContain('family=DM+Sans');
    expect(html).toContain('family=Montserrat');
  });
});

describe('rendimiento teléfono: puntos de 24×24 con el punto visual de 6 px', () => {
  it('BannerSlider: el botón del punto mide 24×24 y el punto visual sigue en 6 px', () => {
    const src = read('../components/home/BannerSlider.jsx');
    // El botón táctil (24×24, WCAG 2.2) y el span interior con el punto
    // visual de 6 px; el margen negativo evita que la fila crezca.
    expect(src).toContain('width: 24,');
    expect(src).toContain('height: 24,');
    expect(src).toContain("margin: \"-9px 0\"");
    expect(src).toContain('height: 6,');
  });

  it('StoryStrip: el botón del punto mide 24×24 y el punto visual sigue en 6 px', () => {
    const src = read('../components/home/StoryStrip.jsx');
    expect(src).toContain('width: 24,');
    expect(src).toContain('height: 24,');
    expect(src).toContain("margin: '-9px 0'");
    expect(src).toContain('height: 6,');
  });
});

describe('rendimiento teléfono: el inglés no entra en el bundle inicial', () => {
  it('TRANSLATIONS.en no existe hasta pedirlo, y luego tiene las mismas claves que es', async () => {
    expect(TRANSLATIONS.en).toBeUndefined();
    const en = await ensureEnglishTranslations();
    expect(en).toBe(TRANSLATIONS.en);
    expect(Object.keys(TRANSLATIONS.en).sort()).toEqual(Object.keys(TRANSLATIONS.es).sort());
    // Segunda llamada: no vuelve a importar el módulo.
    await expect(ensureEnglishTranslations()).resolves.toBe(TRANSLATIONS.en);
  });
});
