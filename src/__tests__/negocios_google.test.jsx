import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import BusinessLanding from '../components/BusinessLanding.jsx';
import { TRANSLATIONS } from '../lib/i18n.js';

// useUIStore lee localStorage y window.location al importar; en Node no
// existen (mismo patrón que negocios_perfiles_ejemplo.test.jsx).
if (typeof globalThis.window === "undefined") {
  globalThis.window = { location: { hostname: "citymap.mx", pathname: "/negocios" } };
}
if (typeof globalThis.localStorage === "undefined") {
  globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
}

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

// La sección de Google: el <section> que contiene el título.
function googleSection(html) {
  const sections = html.match(/<section[\s\S]*?<\/section>/g);
  expect(sections).not.toBeNull();
  const found = sections.find((s) => s.includes('Tu negocio ya aparece en Google'));
  expect(found).not.toBeUndefined();
  return found;
}

describe('Sección «Tu negocio ya aparece en Google» en /negocios', () => {
  it('existe después de las cifras en vivo y antes de los planes, con título y texto', () => {
    const html = renderLanding(false);
    expect(html).toContain('Tu negocio ya aparece en Google');
    expect(html).toContain('Los negocios de CityMap reciben visitas reales desde el buscador');
    expect(html).toContain('Sin pagar anuncios, la gente ya llega a tu menú y a tu perfil desde Google.');
    // Va después de las cifras en vivo y antes de la sección de Planes.
    expect(html.indexOf('Tu negocio ya aparece en Google')).toBeGreaterThan(html.indexOf('negocios publicados'));
    expect(html.indexOf('Tu negocio ya aparece en Google')).toBeLessThan(html.indexOf('id="planes"'));
  });

  it('muestra las cifras exactas de Search Console: 446 clics y 105 mil impresiones', () => {
    const section = googleSection(renderLanding(false));
    expect(section).toContain('446');
    expect(section).toContain('105 mil');
    expect(section).toContain('clics');
    expect(section).toContain('impresiones');
    // La etiqueta de periodo se ve en la sección, no solo en un comentario.
    expect(section).toContain('últimos 28 días');
    expect(section.match(/últimos 28 días/g)).toHaveLength(3); // texto + 2 tarjetas
    // Search Console solo mide Google; el tráfico total es mayor.
    expect(section).toContain('Esto es solo el tráfico que llega desde Google.');
  });

  it('muestra los 3 ejemplos reales con sus cifras', () => {
    const section = googleSection(renderLanding(false));
    expect(section).toContain('Formentera');
    expect(section).toContain('27');
    expect(section).toContain('Campomar');
    expect(section).toContain('15');
    expect(section).toContain('Akami Sushi');
    expect(section).toContain('14');
    expect(section).toContain('visitas desde Google');
    // Umami Ramen salía en el top de 3 meses, pero no en el de 28 días.
    expect(section).not.toContain('Umami Ramen');
  });

  it('lleva el logo de Google de la página', () => {
    const section = googleSection(renderLanding(false));
    expect(section).toContain('/googlelogo.svg');
  });

  it('las claves i18n existen en español e inglés, con los mismos huecos', () => {
    const es = TRANSLATIONS.es;
    const en = TRANSLATIONS.en;
    const keys = [
      'negocios_google_titulo',
      'negocios_google_texto',
      'negocios_google_clics',
      'negocios_google_impresiones',
      'negocios_google_periodo',
      'negocios_google_ejemplos',
      'negocios_google_solo_google',
    ];
    for (const key of keys) {
      expect(typeof es[key]).toBe('string');
      expect(typeof en[key]).toBe('string');
      expect(es[key].length).toBeGreaterThan(0);
      expect(en[key].length).toBeGreaterThan(0);
    }
    expect(es.negocios_google_titulo).toBe('Tu negocio ya aparece en Google');
    expect(en.negocios_google_titulo).toBe('Your business already shows up on Google');
    // El texto interpola las cifras en ambos idiomas.
    expect(es.negocios_google_texto).toContain('${clicks}');
    expect(es.negocios_google_texto).toContain('${impressions}');
    expect(en.negocios_google_texto).toContain('${clicks}');
    expect(en.negocios_google_texto).toContain('${impressions}');
    expect(es.negocios_google_ejemplos).toContain('${formentera}');
    expect(es.negocios_google_ejemplos).toContain('${campomar}');
    expect(es.negocios_google_ejemplos).toContain('${akami}');
    expect(en.negocios_google_ejemplos).toContain('${formentera}');
    expect(en.negocios_google_ejemplos).toContain('${campomar}');
    expect(en.negocios_google_ejemplos).toContain('${akami}');
    expect(es.negocios_google_solo_google).toBe('Esto es solo el tráfico que llega desde Google.');
    expect(en.negocios_google_solo_google).toBe('This is only the traffic that comes from Google.');
  });

  it('se ve igual en modo oscuro (mismo contenido)', () => {
    const section = googleSection(renderLanding(true));
    expect(section).toContain('446');
    expect(section).toContain('105 mil');
    expect(section).toContain('Formentera');
  });
});
