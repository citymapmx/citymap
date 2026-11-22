import { describe, it, expect } from 'vitest';
import {
  buildShareCardData,
  computeShareCardLayout,
  wrapShareCardName,
  SHARE_CARD_FORMATS,
  SHARE_CARD_LAYOUT,
} from '../lib/shareCard.js';

// PR #143: pruebas reales (no solo de lectura de fuente) de los datos y
// la geometría de la tarjeta. En este entorno no hay DOM, así que la
// medición de texto usa la aproximación de shareCard.js; lo que se
// comprueba aquí es el algoritmo, no el ancho exacto de cada letra.
// Propuesta A corregida (22 nov 2026): las píldoras SE QUEDAN bajo el
// nombre (calificación de Google + ciudad), la categoría va bajo las
// píldoras y el Instagram bajo la categoría; el círculo del logo ya no
// exige plan de pago.
describe('tarjeta para compartir: datos y geometría (PR #143)', () => {
  const biz = {
    name: 'Xokol',
    type: 'Restaurantes',
    city_slug: 'guadalajara',
    price: '$$',
    photos: [{ url: 'https://example.supabase.co/object/public/media/cityguide/xokol.jpg' }],
  };
  // Sin fotos y sin logo: el único caso sin círculo.
  const bizSinFotos = { ...biz, photos: [] };
  const googleDisp = { rating: 4.5, count: 1234, source: 'google' };
  const internalDisp = { rating: 5.0, count: 2, source: 'citymap' };
  // Barbarella: plan de pago con logo, como en la captura de Jonathan.
  const bizLogo = {
    ...biz,
    name: 'Barbarella',
    logo_url: 'https://example.supabase.co/object/public/media/cityguide/barbarella-logo.png',
    plan: 'premium',
  };
  const googleDispBarbarella = { rating: 4.5, count: 4569, source: 'google' };

  it('la calificación es solo la de Google, con su conteo', () => {
    const d = buildShareCardData(biz, { disp: googleDisp, cityName: 'Guadalajara' });
    expect(d.rating).toBe(4.5);
    expect(d.reviewCount).toBe(1234);
    expect(d.cityName).toBe('Guadalajara');
  });

  it('sin dato de Google no hay píldora: la interna nunca se muestra', () => {
    const d1 = buildShareCardData(biz, { disp: internalDisp, cityName: 'Guadalajara' });
    expect(d1.rating).toBeNull();
    expect(d1.reviewCount).toBe(0);
    const d2 = buildShareCardData(biz, { disp: null, cityName: 'Guadalajara' });
    expect(d2.rating).toBeNull();
  });

  it('el precio se conserva como dato pero la tarjeta no lo muestra (las píldoras son calificación y ciudad)', () => {
    const d = buildShareCardData(biz, { disp: googleDisp, cityName: 'Guadalajara' });
    expect(d.price).toBe('$$');
    const geo = computeShareCardLayout(d, SHARE_CARD_FORMATS.story, true);
    // Con dato de Google y ciudad: una fila con las 2 píldoras.
    expect(geo.pillRows).toHaveLength(1);
    expect(geo.pillRows[0].map((p) => p.text)).toEqual([
      '★ 4.5 (1,234)',
      'Guadalajara',
    ]);
  });

  it('sin dato de Google solo queda la píldora de ciudad', () => {
    const d1 = buildShareCardData(biz, { disp: internalDisp, cityName: 'Guadalajara' });
    const geo = computeShareCardLayout(d1, SHARE_CARD_FORMATS.story, true);
    expect(geo.pillRows).toHaveLength(1);
    expect(geo.pillRows[0].map((p) => p.text)).toEqual(['Guadalajara']);
    const d2 = buildShareCardData(biz, { disp: googleDisp, cityName: 'Guadalajara' });
    const geo2 = computeShareCardLayout(d2, SHARE_CARD_FORMATS.story, true);
    expect(geo2.pillRows).toHaveLength(1);
    expect(geo2.pillRows[0]).toHaveLength(2);
  });

  it('el Instagram sale de social_links.instagram, normalizado, y va bajo la categoría', () => {
    // Café Belloy: el handle vive en social_links.instagram
    // («Cafebelloy»), no en la columna instagram (NULL).
    const bizIg = { ...biz, social_links: { instagram: 'Cafebelloy' } };
    const d = buildShareCardData(bizIg, { disp: googleDisp, cityName: 'Guadalajara' });
    expect(d.instagram).toBe('cafebelloy');
    const geo = computeShareCardLayout(d, SHARE_CARD_FORMATS.story, true);
    expect(geo.instagram.text).toBe('@cafebelloy');
    // La línea va bajo la categoría y el pie queda a su hueco.
    expect(geo.instagram.y).toBeGreaterThan(geo.category.y);
    const igEnd = geo.instagram.y + (geo.L.igSize * 1.2) / 2;
    const footTop = geo.height - geo.L.pad - geo.L.footSize;
    expect(footTop - igEnd).toBeCloseTo(geo.L.footGap, 6);
    // Variantes: con @, con URL, vacío.
    expect(
      buildShareCardData({ ...biz, instagram: '@Xokol' }, { disp: googleDisp }).instagram,
    ).toBe('xokol');
    expect(
      buildShareCardData(
        { ...biz, social_links: { instagram: 'https://instagram.com/Xokol/' } },
        { disp: googleDisp },
      ).instagram,
    ).toBe('xokol');
    expect(buildShareCardData(biz, { disp: googleDisp }).instagram).toBeNull();
    // Sin Instagram, no hay línea (y la categoría sigue siendo el
    // último texto antes del pie).
    const geoSinIg = computeShareCardLayout(
      buildShareCardData(biz, { disp: googleDisp, cityName: 'Guadalajara' }),
      SHARE_CARD_FORMATS.story,
      true,
    );
    expect(geoSinIg.instagram).toBeNull();
  });

  it('la foto crece y no queda franja vacía entre categoría y pie', () => {
    for (const format of [SHARE_CARD_FORMATS.story, SHARE_CARD_FORMATS.post]) {
      const d = buildShareCardData(biz, { disp: googleDisp, cityName: 'Guadalajara' });
      const geo = computeShareCardLayout(d, format, true);
      // La foto es más alta que su mínimo: se comió el espacio libre.
      expect(geo.photo.h).toBeGreaterThan(geo.L.photoMinH);
      // Entre el fin de la categoría y el pie hay exactamente el hueco
      // diseñado (footGap), no un tercio de tarjeta vacía.
      const catEnd = geo.category.y + (geo.L.catSize * 1.2) / 2;
      const footTop = geo.height - geo.L.pad - geo.L.footSize;
      expect(footTop - catEnd).toBeCloseTo(geo.L.footGap, 6);
    }
  });

  it('el peor caso (nombre largo, 3 líneas) tampoco deja hueco ni se desborda', () => {
    const longBiz = {
      ...biz,
      name: 'Restaurante El Gran Buffet Internacional de la Abuela María',
      city_slug: 'san-pedro-garza-garcia',
    };
    for (const format of [SHARE_CARD_FORMATS.story, SHARE_CARD_FORMATS.post]) {
      const d = buildShareCardData(longBiz, {
        disp: googleDisp,
        cityName: 'San Pedro Garza García',
      });
      const geo = computeShareCardLayout(d, format, true);
      expect(geo.name.lines.length).toBeLessThanOrEqual(3);
      expect(geo.photo.h).toBeGreaterThanOrEqual(geo.L.photoMinH);
      const catEnd = geo.category.y + (geo.L.catSize * 1.2) / 2;
      const footTop = geo.height - geo.L.pad - geo.L.footSize;
      expect(footTop - catEnd).toBeCloseTo(geo.L.footGap, 6);
    }
  });

  it('el nombre se corta a 3 líneas con puntos suspensivos', () => {
    const L = SHARE_CARD_LAYOUT.story;
    const lines = wrapShareCardName(
      'Restaurante El Gran Buffet Internacional de la Abuela María',
      1080 - L.pad * 2,
      L,
    );
    expect(lines.length).toBeLessThanOrEqual(3);
    expect(lines.length).toBe(3);
    expect(lines[2].endsWith('…')).toBe(true);
    expect(wrapShareCardName('Xokol', 952, L)).toEqual(['Xokol']);
    expect(wrapShareCardName('', 952, L)).toEqual([]);
  });

  it('el círculo del logo ya no exige plan de pago (propuesta A, 22 nov 2026)', () => {
    // Con logo_url hay círculo en cualquier plan, incluido el gratuito.
    const dLogo = buildShareCardData(bizLogo, { disp: googleDispBarbarella, cityName: 'Guadalajara' });
    expect(dLogo.bizLogoUrl).toBe(bizLogo.logo_url);
    expect(dLogo.bizLogoCover).toBe(false);
    const dFree = buildShareCardData({ ...bizLogo, plan: 'free' }, { disp: googleDispBarbarella, cityName: 'Guadalajara' });
    expect(dFree.bizLogoUrl).toBe(bizLogo.logo_url);
    expect(dFree.bizLogoCover).toBe(false);
    // Sin logo_url, el círculo lleva la primera foto de la galería
    // recortada (cover), no el logo completo (contain).
    const dFoto = buildShareCardData(biz, { disp: googleDisp, cityName: 'Guadalajara' });
    expect(dFoto.bizLogoUrl).toBe(biz.photos[0].url);
    expect(dFoto.bizLogoCover).toBe(true);
    // Sin logo ni fotos, no hay círculo.
    const dNada = buildShareCardData(bizSinFotos, { disp: googleDisp, cityName: 'Guadalajara' });
    expect(dNada.bizLogoUrl).toBeNull();
    expect(dNada.bizLogoCover).toBe(false);
  });

  it('buildShareCardData pasa el logo; la foto sigue prefiriendo la galería', () => {
    const d = buildShareCardData(bizLogo, { disp: googleDispBarbarella, cityName: 'Guadalajara' });
    expect(d.bizLogoUrl).toBe(bizLogo.logo_url);
    // La foto sigue siendo la de la galería, no el logo.
    expect(d.photoUrl).toBe(biz.photos[0].url);
    const dNoLogo = buildShareCardData(biz, { disp: googleDisp, cityName: 'Guadalajara' });
    expect(dNoLogo.bizLogoUrl).toBe(biz.photos[0].url);
  });

  it('con logo, el círculo queda centrado a caballo sobre el borde inferior de la foto', () => {
    for (const format of [SHARE_CARD_FORMATS.story, SHARE_CARD_FORMATS.post]) {
      const d = buildShareCardData(bizLogo, { disp: googleDispBarbarella, cityName: 'Guadalajara' });
      const geo = computeShareCardLayout(d, format, true);
      expect(geo.bizLogo).not.toBeNull();
      // Diámetro del layout y centrado horizontal.
      expect(geo.bizLogo.d).toBe(geo.L.bizLogoD);
      expect(geo.bizLogo.x).toBe(Math.round((geo.width - geo.L.bizLogoD) / 2));
      // El centro del círculo está justo en el borde inferior de la foto
      // (la y se redondea a píxel entero para un dibujo nítido).
      const photoBottom = geo.photo.y + geo.photo.h;
      expect(geo.bizLogo.y + geo.bizLogo.d / 2).toBeCloseTo(photoBottom, 0);
      // La foto se acorta exactamente lo que sobresale el círculo más
      // el hueco, menos el margen que había antes (nameGap, el del
      // nombre, primer bloque tras la foto desde el PR #155).
      const dNoLogo = buildShareCardData(bizSinFotos, { disp: googleDisp, cityName: 'Guadalajara' });
      const geoNoLogo = computeShareCardLayout(dNoLogo, format, true);
      const expectedDiff = geo.L.bizLogoD / 2 + geo.L.bizLogoGap - geo.L.nameGap;
      expect(geoNoLogo.photo.h - geo.photo.h).toBeCloseTo(expectedDiff, 6);
      // El primer hueco tras la foto es el del círculo.
      expect(geo.firstGap).toBe(geo.L.bizLogoD / 2 + geo.L.bizLogoGap);
      // Sigue sin franja vacía entre categoría y pie (toBeCloseTo: el
      // 88 × 1,12 del nombre deja polvo de coma flotante, 44,000…114).
      const catEnd = geo.category.y + (geo.L.catSize * 1.2) / 2;
      const footTop = geo.height - geo.L.pad - geo.L.footSize;
      expect(footTop - catEnd).toBeCloseTo(geo.L.footGap, 9);
    }
  });

  it('sin logo ni fotos, la tarjeta es idéntica a la del #143 (sin círculo, sin hueco)', () => {
    for (const format of [SHARE_CARD_FORMATS.story, SHARE_CARD_FORMATS.post]) {
      const d = buildShareCardData(bizSinFotos, { disp: googleDisp, cityName: 'Guadalajara' });
      const geo = computeShareCardLayout(d, format, true);
      expect(geo.bizLogo).toBeNull();
      // La foto conserva su alto calculado y el primer hueco es el
      // margen normal del nombre.
      const expectedPhotoH =
        format.height -
        geo.L.pad * 2 -
        (geo.L.logoH + geo.L.logoGap) -
        (geo.L.nameGap + geo.L.nameSize * geo.L.nameLineH) -
        (geo.L.pillsGap + geo.L.pillSize + geo.L.pillPadY * 2) -
        (geo.L.catGap + geo.L.catSize * 1.2) -
        (geo.L.footGap + geo.L.footSize);
      expect(geo.photo.h).toBeCloseTo(expectedPhotoH, 6);
      expect(geo.firstGap).toBe(geo.L.nameGap);
    }
  });

  it('el peor caso con logo (nombre largo, 3 líneas) tampoco deja hueco ni se desborda', () => {
    const longBizLogo = {
      ...bizLogo,
      name: 'Restaurante El Gran Buffet Internacional de la Abuela María',
      city_slug: 'san-pedro-garza-garcia',
    };
    for (const format of [SHARE_CARD_FORMATS.story, SHARE_CARD_FORMATS.post]) {
      const d = buildShareCardData(longBizLogo, {
        disp: googleDispBarbarella,
        cityName: 'San Pedro Garza García',
      });
      const geo = computeShareCardLayout(d, format, true);
      expect(geo.bizLogo).not.toBeNull();
      expect(geo.name.lines.length).toBeLessThanOrEqual(3);
      expect(geo.photo.h).toBeGreaterThanOrEqual(geo.L.photoMinH);
      const catEnd = geo.category.y + (geo.L.catSize * 1.2) / 2;
      const footTop = geo.height - geo.L.pad - geo.L.footSize;
      expect(footTop - catEnd).toBeCloseTo(geo.L.footGap, 6);
    }
  });

  it('el círculo es más grande que en el #144, con anillo y sombra proporcionales (PR #145)', () => {
    // «Un poco» más grande: ~+25% de diámetro. El logo CITYMAP de
    // arriba creció en el PR #155 (76/60 en vez de 56/44) y en el
    // PR #156 el de Post sube a 76 para que se vea en la vista previa.
    expect(SHARE_CARD_LAYOUT.story.bizLogoD).toBe(240);
    expect(SHARE_CARD_LAYOUT.post.bizLogoD).toBe(190);
    expect(SHARE_CARD_LAYOUT.story.bizLogoRing).toBe(8);
    expect(SHARE_CARD_LAYOUT.post.bizLogoRing).toBe(6);
    expect(SHARE_CARD_LAYOUT.story.logoH).toBe(76);
    expect(SHARE_CARD_LAYOUT.post.logoH).toBe(76);
  });

  it('el peor caso con logo y círculo grande no se solapa (nombre de 3 líneas, PR #145)', () => {
    const longBizLogo = {
      ...bizLogo,
      name: 'Restaurante El Gran Buffet Internacional de la Abuela María',
      city_slug: 'san-pedro-garza-garcia',
    };
    for (const format of [SHARE_CARD_FORMATS.story, SHARE_CARD_FORMATS.post]) {
      const d = buildShareCardData(longBizLogo, {
        disp: googleDispBarbarella,
        cityName: 'San Pedro Garza García',
      });
      const geo = computeShareCardLayout(d, format, true);
      expect(geo.bizLogo).not.toBeNull();
      // El nombre ocupa las 3 líneas en el peor caso.
      expect(geo.name.lines.length).toBe(3);
      // La foto no se recorta a su mínimo: nada se desborda.
      expect(geo.photo.h).toBeGreaterThan(geo.L.photoMinH);
      // Entre el círculo y el primer texto queda el hueco diseñado
      // (la y del círculo se redondea a píxel entero, ±0,5 px). El
      // primer texto es el nombre (la categoría va debajo de él).
      const circleBottom = geo.bizLogo.y + geo.bizLogo.d;
      const firstTextTop = geo.name.y - (geo.L.nameSize * geo.L.nameLineH) / 2;
      expect(firstTextTop - circleBottom).toBeCloseTo(geo.L.bizLogoGap, 0);
      // Y entre la categoría y el pie queda exactamente footGap.
      const catEnd = geo.category.y + (geo.L.catSize * 1.2) / 2;
      const footTop = geo.height - geo.L.pad - geo.L.footSize;
      expect(footTop - catEnd).toBeCloseTo(geo.L.footGap, 6);
    }
  });
});
