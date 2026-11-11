import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import BusinessLanding from '../components/BusinessLanding.jsx';

// useUIStore lee localStorage y window.location al importar; en Node no
// existen (mismo patrón que negocios_landing_render.test.jsx).
if (typeof globalThis.window === "undefined") {
  globalThis.window = { location: { hostname: "citymap.mx", pathname: "/negocios" } };
}
if (typeof globalThis.localStorage === "undefined") {
  globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
}

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

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

function headerOf(html) {
  const m = html.match(/<header[\s\S]*?<\/header>/);
  expect(m).not.toBeNull();
  return m[0];
}

function planCards(html) {
  const cards = html.match(/<article class="plans-card"[^>]*>[\s\S]*?<\/article>/g);
  expect(cards).not.toBeNull();
  expect(cards).toHaveLength(3);
  return cards;
}

describe('Tarjetas modernas de /negocios: encabezado con logotipo', () => {
  it('el encabezado lleva el logotipo oficial centrado, no el texto', () => {
    const header = headerOf(renderLanding(false));
    expect(header).toContain('src="/logo-brand.png"');
    expect(header).toContain('alt="CityMap"');
    expect(header).not.toContain('CityMap para negocios');
  });

  it('en modo claro el logo blanco se oscurece para verse sobre fondo claro', () => {
    const header = headerOf(renderLanding(false));
    expect(header).toContain('brightness(0)');
  });

  it('en modo oscuro el logo queda blanco, sin filtro', () => {
    const header = headerOf(renderLanding(true));
    expect(header).not.toContain('brightness(0)');
  });

  it('el logo no se deforma: altura 26 px con ancho automático', () => {
    const header = headerOf(renderLanding(false));
    expect(header).toContain('height:26px');
  });
});

describe('Tarjetas modernas de /negocios: planes sin hueco y botón al final', () => {
  it('en cada tarjeta el botón va DESPUÉS de la lista de puntos (al final)', () => {
    const cards = planCards(renderLanding(false));
    for (const card of cards) {
      expect(card).toContain('plans-features');
      expect(card).toContain('plans-action');
      // El último punto de la lista queda antes del botón.
      expect(card.lastIndexOf('plans-feature')).toBeLessThan(card.indexOf('plans-action'));
    }
  });

  it('la lista de puntos crece para llenar la tarjeta (flex:1) y el botón baja con margen', () => {
    const src = read('../components/BusinessLanding.jsx');
    expect(src).toContain('.business-landing .plans-features{flex:1');
    expect(src).toContain('margin-top:20px');
  });

  it('el plan Destacado sigue resaltado (borde de acento + sombra propia)', () => {
    const src = read('../components/BusinessLanding.jsx');
    expect(src).toContain('.business-landing .plans-card[data-plan="pro"]{order:1;border-color:var(--plans-accent);box-shadow:var(--plans-shadow-pro)}');
  });

  it('las reglas de planes van con el ámbito .business-landing: no se cuelan fuera de /negocios', () => {
    const src = read('../components/BusinessLanding.jsx');
    expect(src).not.toMatch(/^\s*\.plans-card\{/m);
    expect(src).not.toMatch(/^\s*\.plans-grid\{/m);
    expect(src).not.toMatch(/^\s*\.plans-action\{/m);
  });

  it('los textos, precios y puntos de los 3 planes siguen intactos', () => {
    const html = renderLanding(false);
    expect(html).toContain('Gratuito');
    expect(html).toContain('Destacado');
    expect(html).toContain('Premium');
    expect(html).toContain('$0');
    expect(html).toContain('$99');
    expect(html).toContain('$249');
    expect(html).toContain('Página pública del negocio en CityMap');
    expect(html).toContain('Posicionamiento SEO en Google');
    expect(html).toContain('Menú interactivo indexado en Google');
    expect(html).toContain('Próximamente más herramientas...');
  });
});

describe('Tarjetas modernas de /negocios: cifras y beneficios', () => {
  it('las tarjetas de cifras llevan el número en color de acento y siguen con el conteo', () => {
    const html = renderLanding(false);
    expect(html).toContain('class="stat-card"');
    // Modo claro: el acento es #0066CC.
    expect(html).toContain('color:#0066CC');
    // Las 4 cifras de reserva siguen (los efectos no corren en el render
    // estático: ni la consulta en vivo ni el IntersectionObserver).
    expect(html).toContain('>330<');
    expect(html).toContain('>35<');
    expect(html).toContain('>167<');
    expect(html).toContain('>153<');
  });

  it('las tarjetas de beneficios existen con su icono y su texto', () => {
    const html = renderLanding(false);
    expect(html.match(/class="benefit-card"/g)).toHaveLength(6);
    expect(html).toContain('Te encuentran en el mapa');
    expect(html).toContain('Sabes qué está funcionando');
  });
});

describe('Modal de registro: abrirlo ya no navega al inicio', () => {
  it('AppRouter.jsx: el onAddBiz de /negocios no navega a "/"', () => {
    const src = read('../router/AppRouter.jsx');
    expect(src).not.toContain('setShowAddBiz(true); navigate("/")');
  });

  it('AppRouter.jsx: solo /negocios abre el modal (setShowAddBiz); /precios redirige a /negocios', () => {
    const src = read('../router/AppRouter.jsx');
    const handlers = src.match(/onAddBiz=\{\(\) => \{ if \(!user\) \{ setShowAuth\(true\); return; \} setShowAddBiz\(true\); \}\}/g);
    expect(handlers).not.toBeNull();
    expect(handlers).toHaveLength(1);
    expect(src).toContain('<Route path="/precios" element={<Navigate to="/negocios" replace />} />');
    expect(src).not.toContain('PlansPage');
  });

  it('AppRouter.jsx: /precios ya no renderiza una página de planes', () => {
    const src = read('../router/AppRouter.jsx');
    expect(src).not.toContain('onClose={() => navigate("/")}');
  });
});
