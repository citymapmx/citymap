import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import ShareCardTemplate from '../components/ShareCardTemplate.jsx';
import {
  buildShareCardData,
  computeShareCardLayout,
  formatShareCardCategory,
  generateMenuQrDataUrl,
  SHARE_CARD_FORMATS,
  SHARE_CARD_LAYOUT,
  EDITORIAL_SHARE_CARD_LAYOUT,
} from '../lib/shareCard.js';
import { buildBizProfileUrl } from '../lib/compartirNegocio.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// Tarjeta de negocio con QR del perfil (diseño de referencia, 22 nov
// 2026): Jonathan quiere la tarjeta Clara como su imagen — nombre a la
// izquierda, reseñas+ciudad con estrella dorada, fila «categoría |
// @instagram» y un QR REAL a la derecha que abre la ficha del negocio,
// con divisoria vertical entre el texto y el QR y otra horizontal bajo
// el bloque, y los badges de App Store y Google Play EN ESPAÑOL.
// Solo Clara (editorial); Oscura, Grid, tira, Collage, pedido y QR del
// menú quedan igual, y eventos/tours siguen con los badges en inglés.
describe('tarjeta de negocio con QR del perfil (Clara)', () => {
  // Café Belloy (París), el negocio real de la imagen de referencia.
  const BELLOY = {
    id: '7d4a35bd-8908-4bb8-a5b0-1421cca0bd49',
    name: 'Café Belloy',
    status: 'approved',
    plan: 'free',
    city_slug: 'paris',
    slug: 'paris-cafe-belloy',
    category: 'cafeterias',
    rating: 4.2,
    review_count: 2561,
    photos: [{ url: 'https://example.supabase.co/object/public/media/cityguide/belloy.jpg' }],
    social_links: { instagram: 'Cafebelloy' },
  };
  const disp = { rating: 4.2, count: 2561, source: 'google' };
  // buildBizProfileUrl quita el prefijo de la ciudad del slug (la ruta
  // de la ficha es /{ciudad}/{slug-sin-prefijo}): la URL que abre la
  // ficha de Café Belloy es /paris/cafe-belloy, no /paris/paris-cafe-belloy.
  const profileUrl = 'https://citymap.mx/paris/cafe-belloy';
  const withQr = () => ({
    ...buildShareCardData(BELLOY, { disp, cityName: 'París' }),
    profileQrDataUrl: generateMenuQrDataUrl(profileUrl),
  });

  // Cristina (Zapopan), el negocio de la captura de Jonathan del 23 nov
  // 2026: la tarjeta Oscura también lleva el diseño con QR.
  const CRISTINA = {
    id: 'cristina-zapopan',
    name: 'Cristina',
    status: 'approved',
    plan: 'free',
    city_slug: 'zapopan',
    slug: 'zapopan-cristina',
    category: 'restaurantes',
    rating: 4.6,
    review_count: 2039,
    photos: [{ url: 'https://example.supabase.co/object/public/media/cityguide/cristina.jpg' }],
    social_links: { instagram: 'cristinamx_' },
  };
  const dispCristina = { rating: 4.6, count: 2039, source: 'google' };
  const profileUrlCristina = 'https://citymap.mx/zapopan/cristina';
  const withQrCristina = () => ({
    ...buildShareCardData(CRISTINA, { disp: dispCristina, cityName: 'Zapopan' }),
    profileQrDataUrl: generateMenuQrDataUrl(profileUrlCristina),
  });

  it('la URL del perfil es la de la ficha (en node, sin window, citymap.mx)', () => {
    expect(buildBizProfileUrl(BELLOY)).toBe(profileUrl);
  });

  it('el QR del perfil es determinista: la misma URL da la misma data URL', () => {
    const data = withQr();
    expect(data.profileQrDataUrl).toBe(generateMenuQrDataUrl(profileUrl));
    // En el navegador es PNG (canvas); en node, sin canvas, el
    // generador cae a GIF. Lo que importa es que sea una imagen válida.
    expect(data.profileQrDataUrl).toMatch(/^data:image\/(png|gif);base64,/);
  });

  it('Clara Post con QR: QR a la derecha, nombre y reseñas a la izquierda, fila categoría | Instagram', () => {
    const data = withQr();
    const geo = computeShareCardLayout(data, SHARE_CARD_FORMATS.post, 'editorial');
    const L = EDITORIAL_SHARE_CARD_LAYOUT.post;
    const W = SHARE_CARD_FORMATS.post.width;
    const maxW = W - L.pad * 2;

    // El QR existe, se puede escanear (mínimo 160 px) y llega hasta el
    // borde derecho de la tarjeta.
    expect(geo.qrProfile).not.toBeNull();
    expect(geo.qrProfile.size).toBeGreaterThanOrEqual(160);
    expect(geo.qrProfile.x + geo.qrProfile.size).toBe(W - L.pad);

    // Nombre y reseñas+ciudad a la izquierda (no centrados).
    expect(geo.name.align).toBe('left');
    expect(geo.name.x).toBe(L.pad);
    expect(geo.name.lines).toEqual(['Café Belloy']);
    expect(geo.ratingCity.align).toBe('left');
    expect(geo.ratingCity.x).toBe(L.pad);
    expect(geo.ratingCity.goldStar).toBe(true);
    expect(geo.ratingCity.lines).toEqual(['★ 4.2 (2,561) · París']);

    // Categoría e Instagram ya no van en sus líneas centradas: van en
    // UNA fila con el emoji de la categoría.
    expect(geo.category).toBeNull();
    expect(geo.instagram).toBeNull();
    expect(geo.categoryRow).not.toBeNull();
    expect(geo.categoryRow.emoji).toBe('☕');
    expect(geo.categoryRow.category).toBe('Cafeterías');
    expect(geo.categoryRow.instagram).toBe('cafebelloy');
    expect(geo.categoryRow.x).toBe(L.pad);

    // El QR va centrado en el bloque de información y la divisoria
    // vertical cubre exactamente su alto.
    const infoTop = geo.name.y - geo.name.lineH / 2;
    const infoBottom = geo.categoryRow.y + (L.catSize * 1.2) / 2;
    expect(geo.qrProfile.y + geo.qrProfile.size / 2).toBeCloseTo(
      (infoTop + infoBottom) / 2,
      0,
    );
    expect(geo.divV).not.toBeNull();
    expect(geo.divV.yTop).toBe(geo.qrProfile.y);
    expect(geo.divV.yBottom).toBe(geo.qrProfile.y + geo.qrProfile.size);
    expect(geo.divV.x).toBeGreaterThan(L.pad);
    expect(geo.divV.x).toBeLessThan(geo.qrProfile.x);

    // La divisoria horizontal va bajo el bloque y antes de la web.
    expect(geo.divH).not.toBeNull();
    expect(geo.divH.y).toBeGreaterThan(infoBottom);
    expect(geo.divH.y).toBeLessThan(geo.web.y);
    expect(geo.divH.w).toBe(maxW);

    // La foto no se come el hueco del pie: el pie sigue en su sitio.
    expect(geo.photo.h).toBeGreaterThanOrEqual(L.photoMinH);
    expect(geo.web.y).toBeLessThan(geo.footer.y);
  });

  it('Clara Historia con QR: la misma rama, con sus huecos', () => {
    const data = withQr();
    const geo = computeShareCardLayout(data, SHARE_CARD_FORMATS.story, 'editorial');
    expect(geo.qrProfile).not.toBeNull();
    expect(geo.qrProfile.size).toBeGreaterThanOrEqual(160);
    expect(geo.name.align).toBe('left');
    expect(geo.ratingCity.goldStar).toBe(true);
    expect(geo.categoryRow).not.toBeNull();
    expect(geo.divV).not.toBeNull();
    expect(geo.divH).not.toBeNull();
  });

  it('sin QR del perfil: la geometría centrada de siempre, sin cajas nuevas', () => {
    const data = buildShareCardData(BELLOY, { disp, cityName: 'París' });
    const geo = computeShareCardLayout(data, SHARE_CARD_FORMATS.post, 'editorial');
    expect(geo.qrProfile).toBeNull();
    expect(geo.divV).toBeNull();
    expect(geo.divH).toBeNull();
    expect(geo.categoryRow).toBeNull();
    expect(geo.name.align).toBeUndefined();
    expect(geo.name.x).toBe(SHARE_CARD_FORMATS.post.width / 2);
    expect(geo.ratingCity.goldStar).toBeUndefined();
    expect(geo.category).not.toBeNull();
    expect(geo.category.text).toBe('Cafeterías');
    expect(geo.instagram).not.toBeNull();
    expect(geo.instagram.text).toBe('@cafebelloy');
  });

  it('otros estilos con QR del perfil: la rama no se aplica (solo Clara y Oscura)', () => {
    const data = withQr();
    for (const styleId of ['grid', 'tira', 'collage', 'pedido', 'qr']) {
      const geo = computeShareCardLayout(data, SHARE_CARD_FORMATS.post, styleId);
      expect(geo.qrProfile).toBeFalsy();
      expect(geo.divV).toBeFalsy();
      expect(geo.divH).toBeFalsy();
      expect(geo.categoryRow).toBeFalsy();
    }
  });

  it('Oscura Post con QR: misma rama que Clara, con divisoria tenue', () => {
    const data = withQrCristina();
    const geo = computeShareCardLayout(data, SHARE_CARD_FORMATS.post, 'glass');
    const L = SHARE_CARD_LAYOUT.post;
    const W = SHARE_CARD_FORMATS.post.width;
    const maxW = W - L.pad * 2;

    // El QR existe, se puede escanear (mínimo 160 px) y llega hasta el
    // borde derecho de la tarjeta.
    expect(geo.qrProfile).not.toBeNull();
    expect(geo.qrProfile.size).toBeGreaterThanOrEqual(160);
    expect(geo.qrProfile.x + geo.qrProfile.size).toBe(W - L.pad);

    // Nombre y reseñas+ciudad a la izquierda (no centrados).
    expect(geo.name.align).toBe('left');
    expect(geo.name.x).toBe(L.pad);
    expect(geo.name.lines).toEqual(['Cristina']);
    expect(geo.ratingCity.align).toBe('left');
    expect(geo.ratingCity.x).toBe(L.pad);
    expect(geo.ratingCity.goldStar).toBe(true);
    expect(geo.ratingCity.lines).toEqual(['★ 4.6 (2,039) · Zapopan']);

    // Categoría e Instagram ya no van en sus líneas centradas: van en
    // UNA fila con el emoji de la categoría.
    expect(geo.category).toBeNull();
    expect(geo.instagram).toBeNull();
    expect(geo.categoryRow).not.toBeNull();
    expect(geo.categoryRow.emoji).toBe('🍽️');
    expect(geo.categoryRow.category).toBe('Restaurantes');
    expect(geo.categoryRow.instagram).toBe('cristinamx_');
    expect(geo.categoryRow.x).toBe(L.pad);

    // El QR va centrado en el bloque de información y la divisoria
    // vertical cubre exactamente su alto.
    const infoTop = geo.name.y - geo.name.lineH / 2;
    const infoBottom = geo.categoryRow.y + (L.catSize * 1.2) / 2;
    expect(geo.qrProfile.y + geo.qrProfile.size / 2).toBeCloseTo(
      (infoTop + infoBottom) / 2,
      0,
    );
    expect(geo.divV).not.toBeNull();
    expect(geo.divV.yTop).toBe(geo.qrProfile.y);
    expect(geo.divV.yBottom).toBe(geo.qrProfile.y + geo.qrProfile.size);
    expect(geo.divV.x).toBeGreaterThan(L.pad);
    expect(geo.divV.x).toBeLessThan(geo.qrProfile.x);

    // La divisoria horizontal va bajo el bloque y antes de la web.
    expect(geo.divH).not.toBeNull();
    expect(geo.divH.y).toBeGreaterThan(infoBottom);
    expect(geo.divH.y).toBeLessThan(geo.web.y);
    expect(geo.divH.w).toBe(maxW);

    // La foto no se come el hueco del pie: el pie sigue en su sitio.
    expect(geo.photo.h).toBeGreaterThanOrEqual(L.photoMinH);
    expect(geo.web.y).toBeLessThan(geo.footer.y);
  });

  it('Oscura Historia con QR: la misma rama, con sus huecos', () => {
    const data = withQrCristina();
    const geo = computeShareCardLayout(data, SHARE_CARD_FORMATS.story, 'glass');
    expect(geo.qrProfile).not.toBeNull();
    expect(geo.qrProfile.size).toBeGreaterThanOrEqual(160);
    expect(geo.name.align).toBe('left');
    expect(geo.ratingCity.goldStar).toBe(true);
    expect(geo.categoryRow).not.toBeNull();
    expect(geo.divV).not.toBeNull();
    expect(geo.divH).not.toBeNull();
  });

  it('sin QR en Oscura: la geometría centrada de siempre, sin cajas nuevas', () => {
    const data = buildShareCardData(CRISTINA, { disp: dispCristina, cityName: 'Zapopan' });
    const geo = computeShareCardLayout(data, SHARE_CARD_FORMATS.post, 'glass');
    expect(geo.qrProfile).toBeNull();
    expect(geo.divV).toBeNull();
    expect(geo.divH).toBeNull();
    expect(geo.categoryRow).toBeNull();
    expect(geo.name.align).toBeUndefined();
    expect(geo.name.x).toBe(SHARE_CARD_FORMATS.post.width / 2);
    expect(geo.ratingCity.goldStar).toBeUndefined();
    expect(geo.category).not.toBeNull();
    expect(geo.category.text).toBe('Restaurantes');
    expect(geo.instagram).not.toBeNull();
    expect(geo.instagram.text).toBe('@cristinamx_');
  });

  it('nombre largo en Historia con QR: sin rama QR, el nombre completo y centrado, nunca con «…»', () => {
    // En Historia el QR estrecha tanto la columna que «Carrito La Paz
    // Tostadas de Atún» salía truncado («Tostada…»): la rama no se
    // aplica y la tarjeta queda con la geometría centrada de siempre.
    // En Post el mismo nombre sí cabe en 2 líneas y la rama sí aplica.
    const carrito = {
      id: 'biz-carrito',
      name: 'Carrito La Paz Tostadas de Atún',
      status: 'approved',
      plan: 'premium',
      city_slug: 'tepic',
      slug: 'tepic-carrito-la-paz-tostadas-de-atun',
      category: 'restaurantes',
      rating: 5,
      review_count: 12,
      photos: [{ url: 'https://example.org/carrito.jpg' }],
      logo_url: 'https://example.org/carrito-logo.png',
    };
    const withQrCarrito = () => ({
      ...buildShareCardData(carrito, {
        disp: { rating: 5, count: 12, source: 'google' },
        cityName: 'Tepic',
      }),
      profileQrDataUrl: generateMenuQrDataUrl('https://citymap.mx/tepic/carrito-la-paz-tostadas-de-atun'),
    });
    for (const styleId of ['glass', 'editorial']) {
      const data = withQrCarrito();
      const geoStory = computeShareCardLayout(data, SHARE_CARD_FORMATS.story, styleId);
      expect(geoStory.qrProfile).toBeNull();
      expect(geoStory.categoryRow).toBeNull();
      expect(geoStory.divV).toBeNull();
      expect(geoStory.divH).toBeNull();
      expect(geoStory.name.align).toBeUndefined();
      expect(geoStory.name.lines.join(' ')).toBe('Carrito La Paz Tostadas de Atún');
      expect(geoStory.name.lines.join(' ')).not.toContain('…');
      const geoPost = computeShareCardLayout(data, SHARE_CARD_FORMATS.post, styleId);
      expect(geoPost.qrProfile).not.toBeNull();
      expect(geoPost.name.lines.join(' ')).toBe('Carrito La Paz Tostadas de Atún');
    }
  });

  it('la vista previa Oscura con QR: nombre a la izquierda, estrella dorada, fila, QR y divisoria tenue', () => {
    const data = withQrCristina();
    const markup = renderToStaticMarkup(
      <ShareCardTemplate data={data} format={SHARE_CARD_FORMATS.post} styleId="glass" />,
    );
    expect(markup).toContain('Cristina');
    expect(markup).toContain('text-align:left');
    // Estrella dorada (no gris) + resto de la línea.
    expect(markup).toContain('color:#F59E0B');
    expect(markup).toContain('4.6 (2,039) · Zapopan');
    // Fila «categoría | Instagram» con su glifo.
    expect(markup).toContain('Restaurantes');
    expect(markup).toContain('@cristinamx_');
    expect(markup).toContain('<svg');
    // El QR con su divisoria tenue (blanco tenue, no gris claro).
    expect(markup).toContain('alt="Código QR"');
    expect(markup).toContain(data.profileQrDataUrl.slice(0, 60));
    expect(markup).toContain('rgba(255,255,255,0.22)');
  });

  it('la vista previa Clara con QR: nombre a la izquierda, estrella dorada, fila y QR', () => {
    const data = withQr();
    const markup = renderToStaticMarkup(
      <ShareCardTemplate data={data} format={SHARE_CARD_FORMATS.post} styleId="editorial" />,
    );
    expect(markup).toContain('Café Belloy');
    expect(markup).toContain('text-align:left');
    // Estrella dorada (no gris) + resto de la línea.
    expect(markup).toContain('color:#F59E0B');
    expect(markup).toContain('4.2 (2,561) · París');
    // Fila «categoría | Instagram» con su glifo.
    expect(markup).toContain('Cafeterías');
    expect(markup).toContain('@cafebelloy');
    expect(markup).toContain('<svg');
    // El QR con su divisoria horizontal.
    expect(markup).toContain('alt="Código QR"');
    expect(markup).toContain(data.profileQrDataUrl.slice(0, 60));
  });

  it('badges en español: existen con el mismo viewBox que los de inglés y la hoja los pide en es', () => {
    const viewBoxOf = (path) => {
      const svg = readFileSync(new URL(path, import.meta.url), 'utf8');
      const m = svg.match(/viewBox="([^"]+)"/);
      expect(m).not.toBeNull();
      return m[1];
    };
    expect(existsSync(new URL('../../public/badges/app-store-es.svg', import.meta.url))).toBe(true);
    expect(existsSync(new URL('../../public/badges/google-play-es.svg', import.meta.url))).toBe(true);
    expect(viewBoxOf('../../public/badges/app-store-es.svg')).toBe(
      viewBoxOf('../../public/badges/app-store.svg'),
    );
    expect(viewBoxOf('../../public/badges/google-play-es.svg')).toBe(
      viewBoxOf('../../public/badges/google-play.svg'),
    );
    const lib = read('../lib/shareCard.js');
    expect(lib).toContain("app-store-es.svg");
    expect(lib).toContain("google-play-es.svg");
    expect(lib).toContain("loadShareCardFooterBadges(variant = 'en')");
    const sheet = read('../components/ShareCardSheet.jsx');
    expect(sheet).toContain("exportShareCardPng(dataToExport, format, styleId, { badges: 'es' })");
    expect(sheet).toContain('profileQrDataUrl');
    const footer = read('../components/ShareCardFooterRow.jsx');
    expect(footer).toContain("badges = 'en'");
  });

  it('la etiqueta de categoría lleva tilde en la familia café', () => {
    expect(formatShareCardCategory('cafeterias')).toBe('Cafeterías');
    expect(formatShareCardCategory('cafeteria')).toBe('Cafetería');
    expect(formatShareCardCategory('cafe')).toBe('Café');
    // Sin entrada en el mapa, se capitaliza la primera letra.
    expect(formatShareCardCategory('restaurantes')).toBe('Restaurantes');
    expect(formatShareCardCategory('lugares')).toBe('Lugares');
    expect(formatShareCardCategory('')).toBe('');
    expect(formatShareCardCategory(null)).toBe('');
  });

  it('la vista previa del QR respeta la proporción vertical del Post (25 nov 2026, PR #469)', () => {
    // El alto de la vista previa ya no es el ancho (el Post ya no es
    // cuadrado): se calcula de la proporción del formato, si no la
    // tarjeta vertical se recortaría en el hub.
    const hub = read('../components/BizShareHub.jsx');
    expect(hub).toContain('SHARE_CARD_FORMATS.post.height');
    expect(hub).not.toContain('const previewH = QR_PREVIEW_W;');
  });
});
