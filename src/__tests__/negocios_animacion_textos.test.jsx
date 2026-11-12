import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import BusinessLanding from '../components/BusinessLanding.jsx';

// useUIStore lee localStorage y window.location al importar; en Node no
// existen (mismo patrón que negocios_ya_estan.test.jsx). matchMedia se
// deja configurable por prueba: por defecto no reduce el movimiento.
if (typeof globalThis.window === "undefined") {
  globalThis.window = { location: { hostname: "citymap.mx", pathname: "/negocios" } };
}
if (typeof globalThis.localStorage === "undefined") {
  globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
}
globalThis.window.matchMedia = () => ({ matches: false });

function renderLanding(dark = false) {
  return renderToStaticMarkup(
    <BusinessLanding
      T={{}}
      dark={dark}
      navigate={() => {}}
      user={null}
      myBizList={[]}
      onAddBiz={() => {}}
      onStartPaidPlan={() => {}}
      setShowAuth={() => {}}
    />
  );
}

function revealDivs(html) {
  return [...html.matchAll(/<div class="reveal[^"]*"[^>]*>([\s\S]*?)<\/div>/g)].map((m) => m[1]);
}

const landingSrc = readFileSync(new URL('../components/BusinessLanding.jsx', import.meta.url), 'utf8');
const styleBlock = landingSrc.match(/<style>\{`([\s\S]*?)`\}<\/style>/)[1];

describe('Animación «Aparición al bajar» en /negocios', () => {
  it('los encabezados de las secciones van envueltos en Reveal (17 en el render: 15 en código, «Así se verá» se repite en 3 tarjetas)', () => {
    const html = renderLanding(false);
    const divs = revealDivs(html);
    expect(divs).toHaveLength(17);
    for (const text of [
      'CityMap para negocios',
      'Haz que más personas encuentren tu negocio.',
      'CityMap ayuda a que más personas descubran negocios, lugares y servicios cuando buscan en internet.',
      'Tu negocio ya aparece en Google',
      'Los negocios de CityMap reciben visitas reales desde el buscador',
      'El menú de Formentera recibió',
      'Esto es solo el tráfico que llega desde Google.',
      'Planes',
      'Precios por negocio.',
      'Así se verá tu negocio',
      'Ya están en CityMap',
      'Negocios reales que ya reciben clientes desde CityMap.',
      'Preguntas frecuentes',
      'Tu negocio ya lo buscan. Que lo encuentren.',
      'Súmate a los 330 negocios que ya están en CityMap.',
    ]) {
      expect(divs.some((d) => d.includes(text))).toBe(true);
    }
  });

  it('el escalonado es 0/90/180 ms (título, subtítulo) y solo en los subtítulos', () => {
    const html = renderLanding(false);
    expect(html.split('transition-delay:180ms').length - 1).toBe(1);
    expect(html.split('transition-delay:90ms').length - 1).toBe(6);
  });

  it('solo se animan textos: ni botones, ni precios, ni tarjetas de planes', () => {
    const html = renderLanding(false);
    const divs = revealDivs(html);
    for (const d of divs) {
      expect(d).not.toContain('<button');
      expect(d).not.toContain('<strong');
      expect(d).not.toContain('plans-action');
      expect(d).not.toContain('plans-card');
      expect(d).not.toContain('ya-estan-card');
    }
    // Los contadores del #168 siguen intactos (sin Reveal alrededor).
    expect(html).toContain('stat-card');
    expect(landingSrc.match(/<Reveal/g).length).toBe(15);
  });

  it('con prefers-reduced-motion no se oculta nada', () => {
    globalThis.window.matchMedia = () => ({ matches: true });
    try {
      const html = renderLanding(false);
      expect(html).not.toContain('<div class="reveal"');
      expect(html.split('<div class="reveal is-visible"').length - 1).toBe(17);
      expect(html).toContain('Haz que más personas encuentren tu negocio.');
    } finally {
      globalThis.window.matchMedia = () => ({ matches: false });
    }
  });

  it('sin JS el texto se sigue viendo: lo único que oculta es la clase del hook', () => {
    const html = renderLanding(false);
    // En el HTML estático (sin efectos = sin JS) los textos están.
    for (const text of ['Haz que más personas encuentren tu negocio.', 'Planes', 'Ya están en CityMap', 'Preguntas frecuentes']) {
      expect(html).toContain(text);
    }
    // En el CSS de la página, opacity:0 solo existe dentro de la regla
    // .reveal (la clase que añade el hook); ningún encabezado ni párrafo
    // se oculta por defecto.
    const hiddenRules = [...styleBlock.matchAll(/\.reveal\{[^}]*\}/g)].map((m) => m[0]);
    const hidingRules = hiddenRules.filter((r) => r.includes('opacity:0'));
    expect(hidingRules).toHaveLength(1);
    const withoutReveal = styleBlock.replace(/\.reveal[^{]*\{[^}]*\}/g, '');
    expect(withoutReveal).not.toContain('opacity:0');
    expect(withoutReveal).not.toContain('opacity: 0');
    // Y la regla .reveal.is-visible devuelve la opacidad completa.
    expect(styleBlock).toContain('.reveal.is-visible{opacity:1');
    // Respaldo en CSS para reducir movimiento: visible aunque el JS no
    // llegue a revelar.
    expect(styleBlock).toContain('@media(prefers-reduced-motion:reduce){.business-landing .reveal{opacity:1;transform:none}}');
  });

  it('la animación es solo transform y opacity: nada que mueva el diseño', () => {
    const revealRule = styleBlock.match(/\.business-landing \.reveal\{([^}]*)\}/)[1];
    expect(revealRule).toContain('opacity:0');
    expect(revealRule).toContain('transform:translateY(14px)');
    expect(revealRule).toContain('transition:opacity .55s');
    expect(revealRule).toContain('transform .55s');
    for (const prop of ['margin', 'padding', 'height', 'width', 'display', 'position', 'top', 'left']) {
      expect(revealRule).not.toContain(prop);
    }
  });

  it('se ve en oscuro sin romper el render', () => {
    const html = renderLanding(true);
    expect(revealDivs(html)).toHaveLength(17);
    expect(html).toContain('Haz que más personas encuentren tu negocio.');
    expect(html).toContain('Ya están en CityMap');
  });
});
