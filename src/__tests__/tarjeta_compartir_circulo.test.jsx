import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import ShareCardTemplate from '../components/ShareCardTemplate.jsx';
import {
  buildShareCardData,
  computeShareCardLayout,
  wrapShareCardName,
  SHARE_CARD_FORMATS,
  SHARE_CARD_LAYOUT,
  EDITORIAL_SHARE_CARD_LAYOUT,
} from '../lib/shareCard.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// El círculo del logo nunca tapa el nombre (rama
// pr-157-tarjeta-circulo-nombre): Jonathan lo reportó con capturas de
// su Android tras el #155 — en la tarjeta oscura, con nombres de 3
// líneas («Tangente / Restaurante / Tlaquepaque» y «Carrito La Paz /
// Tostadas / de Atún») el círculo se encimaba de la primera línea.
// Con nombres de 1 línea (Donatella, Barbarella, Cristina) se veía
// bien. Causa raíz: la geometría cortaba el nombre a 2 líneas con la
// medición del canvas, pero en la vista previa el DOM repartía una
// línea calculada en dos líneas visuales (su fuente mide más ancha que
// la del canvas); el bloque del nombre crecía una línea, la foto
// (flex: 1) se acortaba, su borde real subía y el círculo —absoluto,
// sobre el borde calculado— quedaba encima de la primera línea.
// Arreglo: el nombre se corta a 3 líneas (ya no se trunca con «…»),
// cada línea calculada va con whiteSpace nowrap en la plantilla (el DOM
// ya no puede repartirla) y photoMinH deja hueco para el peor caso sin
// comerse el hueco del pie. En este entorno no hay DOM, así que la
// medición de texto usa la aproximación de shareCard.js; lo que se
// comprueba aquí es el algoritmo y la geometría, no el ancho exacto
// de cada letra en el teléfono de Jonathan.
describe('tarjeta para compartir: el círculo nunca tapa el nombre', () => {
  const tangente = {
    name: 'Tangente Restaurante Tlaquepaque',
    type: 'Restaurantes',
    city_slug: 'guadalajara',
    photos: [{ url: 'https://example.supabase.co/object/public/media/cityguide/tangente.jpg' }],
    logo_url: 'https://example.supabase.co/object/public/media/cityguide/tangente-logo.png',
    plan: 'premium',
  };
  const tangenteDisp = { rating: 4.7, count: 4125, source: 'google' };
  const carrito = {
    name: 'Carrito La Paz Tostadas de Atún',
    type: 'Restaurantes',
    city_slug: 'tepic',
    photos: [{ url: 'https://example.supabase.co/object/public/media/cityguide/carrito-la-paz.jpg' }],
    logo_url: 'https://example.supabase.co/object/public/media/cityguide/carrito-logo.png',
    plan: 'destacado',
  };
  const carritoDisp = { rating: 4.8, count: 1200, source: 'google' };

  // Borde superior de la primera línea del nombre y borde inferior del
  // círculo, en la geometría que comparten vista previa y PNG.
  const nameTop = (geo) => geo.name.y - geo.name.lineH / 2;
  const circleBottom = (geo) => geo.bizLogo.y + geo.bizLogo.d;

  it('los dos casos reales: la primera línea empieza por debajo del círculo (Historia y Post)', () => {
    for (const [biz, disp, cityName] of [
      [tangente, tangenteDisp, 'Guadalajara'],
      [carrito, carritoDisp, 'Tepic'],
    ]) {
      for (const format of [SHARE_CARD_FORMATS.story, SHARE_CARD_FORMATS.post]) {
        const d = buildShareCardData(biz, { disp, cityName });
        const geo = computeShareCardLayout(d, format, true, 'glass');
        expect(geo.bizLogo).not.toBeNull();
        // El hueco entre el círculo y el primer texto es el diseñado.
        expect(nameTop(geo) - circleBottom(geo)).toBeCloseTo(geo.L.bizLogoGap, 0);
        // Vista previa: el círculo se pinta a la y calculada y el
        // nombre no se puede repartir en más líneas visuales.
        const markup = renderToStaticMarkup(
          <ShareCardTemplate data={d} format={format} styleId="glass" />,
        );
        expect(markup).toContain(`top:${geo.bizLogo.y}px`);
        expect(markup).toContain('white-space:nowrap');
        for (const line of geo.name.lines) {
          expect(markup).toContain(line);
        }
      }
    }
  });

  it('el nombre largo cabe en 3 líneas completas, sin puntos suspensivos', () => {
    expect(SHARE_CARD_LAYOUT.story.nameMaxLines).toBe(3);
    expect(SHARE_CARD_LAYOUT.post.nameMaxLines).toBe(3);
    expect(EDITORIAL_SHARE_CARD_LAYOUT.story.nameMaxLines).toBe(3);
    expect(EDITORIAL_SHARE_CARD_LAYOUT.post.nameMaxLines).toBe(3);
    const L = SHARE_CARD_LAYOUT.story;
    const lines = wrapShareCardName(
      'Tangente Restaurante Tlaquepaque',
      1080 - L.pad * 2,
      L,
    );
    expect(lines).toEqual(['Tangente', 'Restaurante', 'Tlaquepaque']);
    expect(lines.join(' ')).toBe('Tangente Restaurante Tlaquepaque');
    // Carrito también cabe entero en 3 líneas como máximo.
    const carritoLines = wrapShareCardName(
      'Carrito La Paz Tostadas de Atún',
      1080 - L.pad * 2,
      L,
    );
    expect(carritoLines.length).toBeLessThanOrEqual(3);
    expect(carritoLines.join(' ')).toBe('Carrito La Paz Tostadas de Atún');
    expect(carritoLines.join(' ')).not.toContain('…');
  });

  it('los nombres de 1 línea siguen como se verificaron en vivo (Donatella, Barbarella, Cristina)', () => {
    for (const name of ['Donatella', 'Barbarella', 'Cristina']) {
      const biz = {
        name,
        city_slug: 'guadalajara',
        photos: [{ url: 'https://example.supabase.co/object/public/media/cityguide/x.jpg' }],
        logo_url: 'https://example.supabase.co/object/public/media/cityguide/logo.png',
        plan: 'premium',
      };
      for (const format of [SHARE_CARD_FORMATS.story, SHARE_CARD_FORMATS.post]) {
        const d = buildShareCardData(biz, {
          disp: { rating: 4.5, count: 1000, source: 'google' },
          cityName: 'Guadalajara',
        });
        const geo = computeShareCardLayout(d, format, true, 'glass');
        expect(geo.name.lines).toEqual([name]);
        // El mínimo de foto no se aplica: la foto conserva su alto
        // calculado, así que la tarjeta no cambia de posición.
        expect(geo.photo.h).toBeGreaterThan(geo.L.photoMinH);
        expect(nameTop(geo) - circleBottom(geo)).toBeCloseTo(geo.L.bizLogoGap, 0);
      }
    }
  });

  it('el peor caso (nombre de 3 líneas + píldoras en 2 filas) no desborda el pie', () => {
    // Historia: Tangente da 3 líneas con la medición de este entorno.
    // Post: las líneas son más anchas, así que el peor caso usa un
    // nombre más largo que sí da 3 líneas ahí.
    const cases = [
      [SHARE_CARD_FORMATS.story, 'Tangente Restaurante Tlaquepaque'],
      [SHARE_CARD_FORMATS.post, 'Restaurante Cafetería Tlaquepaque Zapotlanejo Guadalajara'],
    ];
    for (const [format, name] of cases) {
      const biz = {
        ...tangente,
        name,
        city_slug: 'san-pedro-garza-garcia',
      };
      const d = buildShareCardData(biz, {
        disp: tangenteDisp,
        cityName: 'San Pedro Garza García, Nuevo León',
      });
      const geo = computeShareCardLayout(d, format, true, 'glass');
      expect(geo.bizLogo).not.toBeNull();
      expect(geo.name.lines.length).toBe(3);
      expect(geo.name.lines.join(' ')).not.toContain('…');
      // Las píldoras sí se parten en 2 filas con la ciudad larga.
      expect(geo.pillRows.length).toBe(2);
      expect(geo.photo.h).toBeGreaterThanOrEqual(geo.L.photoMinH);
      // Ni las píldoras ni el nombre se comen el pie.
      const lastRow = geo.pillRows[geo.pillRows.length - 1];
      const pillsEnd = lastRow[0].y + lastRow[0].h;
      const footTop = geo.height - geo.L.pad - geo.L.footSize;
      expect(pillsEnd).toBeLessThanOrEqual(footTop);
      expect(footTop - pillsEnd).toBeCloseTo(geo.L.footGap, 6);
      expect(nameTop(geo) - circleBottom(geo)).toBeCloseTo(geo.L.bizLogoGap, 0);
    }
  });

  it('Clara TAMBIÉN lleva el círculo y tampoco tapa el nombre (PR #160)', () => {
    // Antes Clara no tenía círculo por diseño («la limpieza es el
    // estilo»); Jonathan pidió que también llevara el logotipo del
    // negocio (Vulcanos Chapalita, con logo y plan premium, salía sin
    // nada en Clara). Misma regla que en Oscura y mismo hueco entre el
    // círculo y el primer texto.
    for (const [biz, disp, cityName] of [
      [tangente, tangenteDisp, 'Guadalajara'],
      [carrito, carritoDisp, 'Tepic'],
    ]) {
      for (const format of [SHARE_CARD_FORMATS.story, SHARE_CARD_FORMATS.post]) {
        const d = buildShareCardData(biz, { disp, cityName });
        const geo = computeShareCardLayout(d, format, true, 'editorial');
        expect(geo.bizLogo).not.toBeNull();
        expect(geo.bizLogo.d).toBe(geo.L.bizLogoD);
        expect(nameTop(geo) - circleBottom(geo)).toBeCloseTo(geo.L.bizLogoGap, 0);
        expect(geo.name.lines.length).toBeLessThanOrEqual(3);
        expect(geo.name.lines.join(' ')).not.toContain('…');
        const markup = renderToStaticMarkup(
          <ShareCardTemplate data={d} format={format} styleId="editorial" />,
        );
        expect(markup).toContain(`top:${geo.bizLogo.y}px`);
        expect(markup).toContain('border-radius:50%');
        // El anillo es solo blanco en Clara (en Oscura es fino y
        // casi invisible, porque el círculo blanco ya se distingue).
        expect(markup).toContain('border:2px solid #FFFFFF');
        expect(markup).not.toContain('#D4D4D8');
        expect(markup).toContain('white-space:nowrap');
      }
    }
  });

  it('Clara: el peor caso con círculo tampoco desborda el pie (PR #160)', () => {
    // En Clara el nombre es más chico que en Oscura (80/62 px contra
    // 88/68 px), así que «Tangente Restaurante Tlaquepaque» cabe en 2
    // líneas; el peor caso usa un nombre más largo que sí da 3 líneas
    // en ambos formatos.
    const cases = [
      [SHARE_CARD_FORMATS.story, 'Restaurante El Gran Buffet Internacional de la Abuela María'],
      [SHARE_CARD_FORMATS.post, 'Restaurante El Gran Buffet Internacional de la Abuela María'],
    ];
    for (const [format, name] of cases) {
      const biz = {
        ...tangente,
        name,
        city_slug: 'san-pedro-garza-garcia',
      };
      const d = buildShareCardData(biz, {
        disp: tangenteDisp,
        cityName: 'San Pedro Garza García, Nuevo León',
      });
      const geo = computeShareCardLayout(d, format, true, 'editorial');
      expect(geo.bizLogo).not.toBeNull();
      expect(geo.name.lines.length).toBe(3);
      expect(geo.name.lines.join(' ')).not.toContain('…');
      expect(geo.photo.h).toBeGreaterThanOrEqual(geo.L.photoMinH);
      const lastRow = geo.pillRows[geo.pillRows.length - 1];
      const pillsEnd = lastRow[0].y + lastRow[0].h;
      const footTop = geo.height - geo.L.pad - geo.L.footSize;
      expect(pillsEnd).toBeLessThanOrEqual(footTop);
      expect(footTop - pillsEnd).toBeCloseTo(geo.L.footGap, 6);
      expect(nameTop(geo) - circleBottom(geo)).toBeCloseTo(geo.L.bizLogoGap, 0);
    }
  });

  it('la plantilla no deja que el nombre se reparta (fuente)', () => {
    const template = read('../components/ShareCardTemplate.jsx');
    expect(template).toContain("whiteSpace: 'nowrap'");
  });
});
