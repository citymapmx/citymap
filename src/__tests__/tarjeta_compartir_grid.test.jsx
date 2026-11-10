import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import ShareCardTemplate from '../components/ShareCardTemplate.jsx';
import {
  buildShareCardData,
  computeShareCardLayout,
  resolveShareCardStyle,
  shareCardGridStyles,
  shareCardGridStyleAvailable,
  SHARE_CARD_FORMATS,
  SHARE_CARD_GRID_MIN_PHOTOS,
  SHARE_CARD_GRID_STYLE_LIST,
  SHARE_CARD_STYLE_COLORS,
  SHARE_CARD_STYLE_LIST,
  GRID_SHARE_CARD_LAYOUT,
  TIRA_SHARE_CARD_LAYOUT,
  COLLAGE_SHARE_CARD_LAYOUT,
} from '../lib/shareCard.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// Estilos con grid para la tarjeta de negocios (demo
// `propuestas-de-tarjetas-con-grid`, 10 nov 2026; Jonathan: «Haz las
// 4»): Grid 2×2, Foto grande + tira de miniaturas y Collage editorial.
// Fondo blanco, círculo de logo más grande (Ø 292 Historia / 232 Post),
// categoría bajo las píldoras (o en el kicker del collage), pie
// «Descúbrelo en www.citymap.mx», anillo del círculo SOLO blanco.
//
// Negocio real de la demo: Donatella, Zapopan, Restaurantes, ★ 4.3
// (1,853) en Google, plan premium con logo.
const DONATELLA = {
  name: 'Donatella',
  category: 'restaurantes',
  city_slug: 'zapopan',
  price: '$$',
  logo_url:
    'https://dpkjxhjkzdlkvyotoeai.supabase.co/storage/v1/object/public/media/cityguide/1785468838123_5fhonb.jpg',
  plan: 'premium',
  photos: [
    {
      url: 'https://dpkjxhjkzdlkvyotoeai.supabase.co/storage/v1/object/public/media/cityguide/1785468851763_7fi5y7.jpg',
    },
    {
      url: 'https://dpkjxhjkzdlkvyotoeai.supabase.co/storage/v1/object/public/media/cityguide/1785468852263_40shji.jpg',
    },
    {
      url: 'https://dpkjxhjkzdlkvyotoeai.supabase.co/storage/v1/object/public/media/cityguide/1785468852857_r1u2l.jpg',
    },
    {
      url: 'https://dpkjxhjkzdlkvyotoeai.supabase.co/storage/v1/object/public/media/cityguide/1785468854935_r5dlfp.jpg',
    },
  ],
};
const googleDisp = { rating: 4.3, count: 1853, source: 'google' };

const dataFor = (biz, disp = googleDisp) =>
  buildShareCardData(biz, { disp, cityName: 'Zapopan' });
const withPhotos = (n) => ({ ...DONATELLA, photos: DONATELLA.photos.slice(0, n) });

describe('tarjeta para compartir: estilos con grid (demo 10 nov 2026)', () => {
  it('los 3 estilos existen, con sus mínimos de fotos y en el orden de la demo', () => {
    expect(SHARE_CARD_GRID_STYLE_LIST.map((s) => s.id)).toEqual([
      'grid',
      'tira',
      'collage',
    ]);
    expect(SHARE_CARD_GRID_MIN_PHOTOS).toEqual({ grid: 4, tira: 2, collage: 3 });
    expect(resolveShareCardStyle('grid').label).toBe('Grid 2×2');
    expect(resolveShareCardStyle('tira').label).toBe('Foto + miniaturas');
    expect(resolveShareCardStyle('collage').label).toBe('Collage');
    // La lista base no cambia: Oscura y Clara siguen siendo las únicas
    // sin fotos (los estilos con grid se suman solo con fotos).
    expect(SHARE_CARD_STYLE_LIST.map((s) => s.id)).toEqual(['glass', 'editorial']);
  });

  it('disponibilidad por número de fotos: sin fotos no se ofrece ninguno', () => {
    expect(shareCardGridStyles(0).map((s) => s.id)).toEqual([]);
    expect(shareCardGridStyles(1).map((s) => s.id)).toEqual([]);
    expect(shareCardGridStyles(2).map((s) => s.id)).toEqual(['tira']);
    expect(shareCardGridStyles(3).map((s) => s.id)).toEqual(['tira', 'collage']);
    expect(shareCardGridStyles(4).map((s) => s.id)).toEqual([
      'grid',
      'tira',
      'collage',
    ]);
    expect(shareCardGridStyles(5).map((s) => s.id)).toEqual([
      'grid',
      'tira',
      'collage',
    ]);
    expect(shareCardGridStyleAvailable('grid', 3)).toBe(false);
    expect(shareCardGridStyleAvailable('grid', 4)).toBe(true);
    expect(shareCardGridStyleAvailable('tira', 1)).toBe(false);
    expect(shareCardGridStyleAvailable('tira', 2)).toBe(true);
    expect(shareCardGridStyleAvailable('collage', 2)).toBe(false);
    expect(shareCardGridStyleAvailable('collage', 3)).toBe(true);
  });

  it('los datos llevan hasta 4 fotos y la categoría capitalizada', () => {
    const d = dataFor(DONATELLA);
    expect(d.photoUrls).toHaveLength(4);
    expect(d.photoUrls[0]).toContain('1785468851763_7fi5y7.jpg');
    expect(d.photoUrls[3]).toContain('1785468854935_r5dlfp.jpg');
    expect(d.photoUrl).toBe(d.photoUrls[0]);
    expect(d.category).toBe('Restaurantes');
    // Con 2 fotos, solo 2 (la tira las usa todas).
    expect(dataFor(withPhotos(2)).photoUrls).toHaveLength(2);
    // Sin fotos, [] (y sin banner/logo que cuente como foto del grid).
    expect(
      dataFor({ ...DONATELLA, photos: [], banner_url: 'https://example.com/b.jpg' })
        .photoUrls,
    ).toEqual([]);
    // Sin categoría, '' (no se inventa).
    expect(dataFor({ ...DONATELLA, category: '' }).category).toBe('');
  });

  it('el anillo del círculo es solo blanco en los 3 estilos con grid', () => {
    for (const styleId of ['grid', 'tira', 'collage']) {
      expect(SHARE_CARD_STYLE_COLORS[styleId].bizLogoRing).toBe('#FFFFFF');
      expect(SHARE_CARD_STYLE_COLORS[styleId].starAmber).toBe(true);
      expect(SHARE_CARD_STYLE_COLORS[styleId].bg).toEqual(['#FFFFFF', '#FFFFFF']);
      expect(SHARE_CARD_STYLE_COLORS[styleId].pillBg).toBe('#F4F4F6');
      expect(SHARE_CARD_STYLE_COLORS[styleId].logoWhite).toBe(false);
    }
    // El círculo es más grande que en Oscura/Clara (Ø 292/232, 27cqw
    // de la demo, frente a 240/190).
    expect(GRID_SHARE_CARD_LAYOUT.story.bizLogoD).toBe(292);
    expect(GRID_SHARE_CARD_LAYOUT.post.bizLogoD).toBe(232);
    expect(TIRA_SHARE_CARD_LAYOUT.story.bizLogoD).toBe(292);
    expect(COLLAGE_SHARE_CARD_LAYOUT.story.bizLogoD).toBe(292);
  });

  it('Grid 2×2: 4 celdas que llenan el área, círculo centrado a caballo, categoría y pie', () => {
    for (const format of [SHARE_CARD_FORMATS.story, SHARE_CARD_FORMATS.post]) {
      const d = dataFor(DONATELLA);
      const geo = computeShareCardLayout(d, format, true, 'grid');
      expect(geo.style).toBe('grid');
      expect(geo.gridCells).toHaveLength(4);
      // Las celdas llenan el área del grid (con el hueco entre ellas):
      // la primera arriba a la izquierda, la última abajo a la derecha.
      const p = geo.photo;
      const [c0, c1, c2, c3] = geo.gridCells;
      expect(c0.x).toBe(p.x);
      expect(c0.y).toBe(p.y);
      expect(c3.x + c3.w).toBeCloseTo(p.x + p.w, 0);
      expect(c3.y + c3.h).toBeCloseTo(p.y + p.h, 0);
      for (const cell of geo.gridCells) {
        expect(cell.x).toBeGreaterThanOrEqual(p.x);
        expect(cell.y).toBeGreaterThanOrEqual(p.y);
        expect(cell.x + cell.w).toBeLessThanOrEqual(p.x + p.w + 1);
        expect(cell.y + cell.h).toBeLessThanOrEqual(p.y + p.h + 1);
        expect(cell.photoIndex).toBeGreaterThanOrEqual(0);
        expect(cell.photoUrl).toBeTruthy();
      }
      // Cada celda lleva su foto, en orden (la 1ª es la principal).
      expect(geo.gridCells.map((c) => c.photoIndex)).toEqual([0, 1, 2, 3]);
      expect(geo.gridCells[0].photoUrl).toBe(d.photoUrls[0]);
      expect(geo.gridCells[3].photoUrl).toBe(d.photoUrls[3]);
      // Círculo centrado a caballo sobre el borde inferior del grid
      // (su centro queda en ese borde, con el redondeo de Math.round).
      expect(geo.bizLogo.x).toBe(Math.round((geo.width - geo.bizLogo.d) / 2));
      expect(geo.bizLogo.y + geo.bizLogo.d / 2).toBeCloseTo(p.y + p.h, 0);
      // Categoría bajo las píldoras y pie al final, sin desbordar.
      expect(geo.category.text).toBe('Restaurantes');
      expect(geo.category.y).toBeGreaterThan(
        geo.pillRows[geo.pillRows.length - 1][0].y,
      );
      expect(geo.footer.y + geo.footer.size / 2).toBeLessThanOrEqual(
        geo.height - geo.L.pad,
      );
      expect(geo.category.y).toBeLessThan(geo.footer.y);
    }
  });

  it('tira: 1 foto grande + tira de miniaturas (las que haya)', () => {
    // Con 4 fotos: 1 grande + 3 miniaturas.
    const d4 = dataFor(DONATELLA);
    const geo4 = computeShareCardLayout(d4, SHARE_CARD_FORMATS.story, true, 'tira');
    expect(geo4.gridCells).toHaveLength(4);
    const [big, ...strip] = geo4.gridCells;
    expect(big.w).toBe(geo4.photo.w);
    expect(big.y).toBe(geo4.photo.y);
    expect(strip).toHaveLength(3);
    expect(strip[0].y).toBe(big.y + big.h + geo4.L.gridGap);
    expect(strip[2].x + strip[2].w).toBeCloseTo(geo4.photo.x + geo4.photo.w, 0);
    expect(strip[2].y + strip[2].h).toBeCloseTo(geo4.photo.y + geo4.photo.h, 0);
    expect(geo4.gridCells.map((c) => c.photoIndex)).toEqual([0, 1, 2, 3]);
    // Con 2 fotos: 1 grande + 1 miniatura.
    const d2 = dataFor(withPhotos(2));
    const geo2 = computeShareCardLayout(d2, SHARE_CARD_FORMATS.story, true, 'tira');
    expect(geo2.gridCells).toHaveLength(2);
    expect(geo2.gridCells.map((c) => c.photoIndex)).toEqual([0, 1]);
    // Con 3 fotos: 1 grande + 2 miniaturas.
    const d3 = dataFor(withPhotos(3));
    const geo3 = computeShareCardLayout(d3, SHARE_CARD_FORMATS.story, true, 'tira');
    expect(geo3.gridCells).toHaveLength(3);
    // La tira también lleva categoría y el círculo a caballo.
    expect(geo4.category.text).toBe('Restaurantes');
    expect(geo4.bizLogo.y + geo4.bizLogo.d / 2).toBeCloseTo(
      geo4.photo.y + geo4.photo.h,
      0,
    );
    // En Post la foto grande no se vuelve una franja delgada.
    const geoPost = computeShareCardLayout(d4, SHARE_CARD_FORMATS.post, true, 'tira');
    expect(geoPost.gridCells[0].h).toBeGreaterThanOrEqual(geoPost.L.bigMinH);
  });

  it('collage: hero a sangre, círculo a la izquierda, kicker, nombre en serif, calificación en texto y dúo', () => {
    for (const format of [SHARE_CARD_FORMATS.story, SHARE_CARD_FORMATS.post]) {
      const d = dataFor(DONATELLA);
      const geo = computeShareCardLayout(d, format, true, 'collage');
      expect(geo.style).toBe('collage');
      // Hero a sangre (sin márgenes, sin radio).
      expect(geo.hero.x).toBe(0);
      expect(geo.hero.y).toBe(0);
      expect(geo.hero.w).toBe(geo.width);
      expect(geo.hero.h).toBeGreaterThanOrEqual(geo.L.heroMinH);
      // Sin fila de logo centrada: el logo va superpuesto sobre el hero.
      expect(geo.logo).toBeNull();
      expect(geo.logoOverlay).not.toBeNull();
      expect(geo.logoOverlay.x).toBe(geo.L.logoOverlayX);
      expect(geo.logoOverlay.y).toBe(geo.L.logoOverlayY);
      // Sin foto única ni celdas de grid: el hero y el dúo las sustituyen.
      expect(geo.photo).toBeNull();
      expect(geo.gridCells).toBeNull();
      // Círculo alineado a la IZQUIERDA (no centrado) a caballo sobre
      // el borde inferior del hero (con el redondeo de Math.round).
      expect(geo.bizLogo.x).toBe(geo.L.pad);
      expect(geo.bizLogo.y + geo.bizLogo.d / 2).toBeCloseTo(geo.hero.h, 0);
      // Kicker «RESTAURANTES · ZAPOPAN» (categoría y ciudad en mayúsculas).
      expect(geo.kicker.text).toBe('RESTAURANTES · ZAPOPAN');
      expect(geo.kicker.x).toBe(geo.L.pad);
      // Nombre en serif, alineado a la izquierda, con su línea.
      expect(geo.name.lines).toEqual(['Donatella']);
      expect(geo.name.align).toBe('left');
      expect(geo.name.serif).toBe(true);
      expect(geo.name.x).toBe(geo.L.pad);
      // Calificación como texto plano (no pastilla).
      expect(geo.ratingLine.rating).toBe(4.3);
      expect(geo.ratingLine.reviewCount).toBe(1853);
      expect(geo.pillRows).toEqual([]);
      // Dúo: 2 fotos chicas (la 2ª y la 3ª), sin solapar el pie.
      expect(geo.duo).toHaveLength(2);
      expect(geo.duo.map((c) => c.photoIndex)).toEqual([1, 2]);
      expect(geo.duo[1].x + geo.duo[1].w).toBe(geo.width - geo.L.pad);
      expect(geo.duo[0].y + geo.duo[0].h).toBeLessThan(geo.footer.y);
      // Sin categoría en bloque (va en el kicker) y pie al final.
      expect(geo.category).toBeNull();
      expect(geo.footer.y + geo.footer.size / 2).toBeLessThanOrEqual(
        geo.height - geo.L.pad,
      );
    }
  });

  it('sin dato de Google no hay píldora de calificación ni línea de calificación', () => {
    const d = dataFor(DONATELLA, null);
    const geoGrid = computeShareCardLayout(d, SHARE_CARD_FORMATS.story, true, 'grid');
    expect(geoGrid.pillRows).toHaveLength(1);
    expect(geoGrid.pillRows[0].map((p) => p.text)).toEqual(['Zapopan']);
    const geoCollage = computeShareCardLayout(
      d,
      SHARE_CARD_FORMATS.story,
      true,
      'collage',
    );
    expect(geoCollage.ratingLine).toBeNull();
    // El hero crece para comerse el hueco de la calificación.
    expect(geoCollage.hero.h).toBeGreaterThan(
      computeShareCardLayout(dataFor(DONATELLA), SHARE_CARD_FORMATS.story, true, 'collage')
        .hero.h,
    );
  });

  it('Oscura y Clara no heredan nada de los estilos con grid', () => {
    const d = dataFor(DONATELLA);
    for (const styleId of ['glass', 'editorial']) {
      const geo = computeShareCardLayout(d, SHARE_CARD_FORMATS.story, true, styleId);
      expect(geo.gridCells).toBeNull();
      expect(geo.category).toBeNull();
      expect(geo.hero).toBeNull();
      expect(geo.kicker).toBeNull();
      expect(geo.ratingLine).toBeNull();
      expect(geo.duo).toBeNull();
      expect(geo.photo).not.toBeNull();
    }
  });

  it('la vista previa pinta el grid, la tira y el collage con sus fotos reales', () => {
    const d = dataFor(DONATELLA);
    // Grid 2×2: 4 fotos + logo oficial + círculo + G de Google.
    const htmlGrid = renderToStaticMarkup(
      <ShareCardTemplate data={d} format={SHARE_CARD_FORMATS.story} styleId="grid" />,
    );
    expect(htmlGrid).toContain('Donatella');
    expect(htmlGrid).toContain('Restaurantes');
    expect(htmlGrid).toContain('Zapopan');
    expect(htmlGrid).toContain('4.3');
    expect(htmlGrid).toContain('Descúbrelo en');
    expect(htmlGrid).toContain('www.citymap.mx');
    expect(htmlGrid.match(/<img/g)).toHaveLength(7);
    // Tira: 1 grande + 3 miniaturas (mismas 4 fotos).
    const htmlTira = renderToStaticMarkup(
      <ShareCardTemplate data={d} format={SHARE_CARD_FORMATS.story} styleId="tira" />,
    );
    expect(htmlTira).toContain('Donatella');
    expect(htmlTira).toContain('Restaurantes');
    expect(htmlTira).toContain('www.citymap.mx');
    expect(htmlTira.match(/<img/g)).toHaveLength(7);
    // Collage: hero + dúo (3 fotos) + logo oficial + círculo, sin G.
    const htmlCollage = renderToStaticMarkup(
      <ShareCardTemplate data={d} format={SHARE_CARD_FORMATS.story} styleId="collage" />,
    );
    expect(htmlCollage).toContain('Donatella');
    expect(htmlCollage).toContain('RESTAURANTES · ZAPOPAN');
    expect(htmlCollage).toContain('4.3');
    expect(htmlCollage).toContain('1,853 reseñas en Google');
    expect(htmlCollage).toContain('www.citymap.mx');
    expect(htmlCollage.match(/<img/g)).toHaveLength(5);
    // La estrella de la píldora es ámbar en los estilos con grid.
    expect(htmlGrid).toContain('#F59E0B');
    expect(htmlCollage).toContain('#F59E0B');
  });

  it('la hoja suma los estilos con grid al carrusel solo con fotos suficientes', () => {
    const sheet = read('../components/ShareCardSheet.jsx');
    expect(sheet).toContain('shareCardGridStyles');
    expect(sheet).toContain('shareCardStyleList(hasMenuItems, { menuOnly })');
    // En la página del menú (menuOnly) no se ofrecen: solo «Para pedir»
    // y «QR del menú».
    expect(sheet).toContain('menuOnly');
    expect(sheet).toContain('shareCardGridStyles(data?.photoUrls?.length || 0)');
  });
});
