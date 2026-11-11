import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import BusinessLanding from '../components/BusinessLanding.jsx';
import { YA_ESTAN_EN_CITYMAP } from '../lib/negociosEjemplos.js';

// useUIStore lee localStorage y window.location al importar; en Node no
// existen (mismo patrón que negocios_tarjetas_modernas.test.jsx).
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

// Recorta la sección «Ya están en CityMap» (desde su <h2> hasta la
// siguiente sección, las preguntas frecuentes).
function yaEstanSection(html) {
  const start = html.indexOf('Ya están en CityMap');
  expect(start).toBeGreaterThan(-1);
  const end = html.indexOf('Preguntas frecuentes', start);
  expect(end).toBeGreaterThan(start);
  return html.slice(start, end);
}

const shortSlug = (b) => b.slug.startsWith(`${b.city_slug}-`) ? b.slug.slice(b.city_slug.length + 1) : b.slug;

describe('Sección «Ya están en CityMap» en /negocios', () => {
  it('la lista tiene 8 negocios reales, con foto, ciudad y calificación de Google', () => {
    expect(YA_ESTAN_EN_CITYMAP).toHaveLength(8);
    for (const b of YA_ESTAN_EN_CITYMAP) {
      expect(b.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(b.photos).toHaveLength(1);
      expect(b.photos[0].url).toMatch(/^https:\/\/dpkjxhjkzdlkvyotoeai\.supabase\.co\/storage\/v1\/object\/public\/media\/cityguide\//);
      expect(b.rating).toBeGreaterThanOrEqual(4.6);
      expect(b.review_count).toBeGreaterThanOrEqual(900);
      expect(b.cityName).toBeTruthy();
      expect(b.googleRating).toBe(true);
      expect(b.slug.startsWith(`${b.city_slug}-`)).toBe(true);
    }
    // Ciudades variadas, no todos de la misma.
    const cities = new Set(YA_ESTAN_EN_CITYMAP.map((b) => b.city_slug));
    expect(cities.size).toBeGreaterThanOrEqual(5);
  });

  it('la sección existe con título y subtítulo', () => {
    const html = renderLanding(false);
    expect(html).toContain('Ya están en CityMap');
    expect(html).toContain('Negocios reales que ya reciben clientes desde CityMap.');
  });

  it('cada tarjeta muestra nombre, ciudad y calificación, y enlaza a su ficha', () => {
    const html = renderLanding(false);
    const section = yaEstanSection(html);
    for (const b of YA_ESTAN_EN_CITYMAP) {
      expect(section).toContain(b.name);
      expect(section).toContain(b.cityName);
      expect(section).toContain(`href="/${b.city_slug}/${shortSlug(b)}"`);
      // Calificación de Google (reserva verificada: displayRating usa el
      // caché en vivo cuando lo hay; sin caché, el valor guardado).
      expect(section).toContain(b.rating.toFixed(1));
      expect(section).toContain(`(${new Intl.NumberFormat("es-MX").format(b.review_count)})`);
    }
    // El logo de Google acompaña cada calificación.
    expect(section.split('/googlelogo.svg').length - 1).toBe(8);
  });

  it('la sección va después de los planes y antes de las preguntas frecuentes', () => {
    const html = renderLanding(false);
    const planes = html.indexOf('id="planes"');
    const title = html.indexOf('Ya están en CityMap');
    const faq = html.indexOf('Preguntas frecuentes');
    expect(planes).toBeGreaterThan(-1);
    expect(title).toBeGreaterThan(planes);
    expect(faq).toBeGreaterThan(title);
  });

  it('la tira no repite los 3 ejemplos por plan ni a Mochomos', () => {
    const html = renderLanding(false);
    const section = yaEstanSection(html);
    for (const name of ['Dalila Casa Repostera', 'Akami Sushi', 'Four Seasons Resort Punta Mita', 'Mochomos']) {
      expect(section).not.toContain(name);
    }
  });

  it('se ve en oscuro sin romper el render', () => {
    const html = renderLanding(true);
    expect(html).toContain('Ya están en CityMap');
    for (const b of YA_ESTAN_EN_CITYMAP) {
      expect(html).toContain(b.name);
    }
  });
});
