import { describe, it, expect } from 'vitest';
import {
  buildShareCardData,
  bizShowsLogoCircle,
  computeShareCardLayout,
  wrapShareCardName,
  SHARE_CARD_FORMATS,
  SHARE_CARD_LAYOUT,
} from '../lib/shareCard.js';

// PR #143: pruebas reales (no solo de lectura de fuente) de los datos y
// la geometría de la tarjeta. En este entorno no hay DOM, así que la
// medición de texto usa la aproximación de shareCard.js; lo que se
// comprueba aquí es el algoritmo, no el ancho exacto de cada letra.
describe('tarjeta para compartir: datos y geometría (PR #143)', () => {
  const biz = {
    name: 'Xokol',
    type: 'Restaurantes',
    city_slug: 'guadalajara',
    price: '$$',
    photos: [{ url: 'https://example.supabase.co/object/public/media/cityguide/xokol.jpg' }],
  };
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

  it('el precio se conserva como dato pero no sale en las píldoras', () => {
    const d = buildShareCardData(biz, { disp: googleDisp, cityName: 'Guadalajara' });
    expect(d.price).toBe('$$');
    const geo = computeShareCardLayout(d, SHARE_CARD_FORMATS.story, true);
    const texts = geo.pillRows.flat().map((p) => p.text);
    expect(texts).toContain('★ 4.5 (1,234)');
    expect(texts).toContain('Guadalajara');
    expect(texts.join(' ')).not.toContain('$');
  });

  it('sin dato de Google la píldora de calificación no existe', () => {
    const d = buildShareCardData(biz, { disp: internalDisp, cityName: 'Guadalajara' });
    const geo = computeShareCardLayout(d, SHARE_CARD_FORMATS.story, true);
    const texts = geo.pillRows.flat().map((p) => p.text);
    expect(texts).toEqual(['Guadalajara']);
  });

  it('la foto crece y no queda franja vacía entre píldoras y pie', () => {
    for (const format of [SHARE_CARD_FORMATS.story, SHARE_CARD_FORMATS.post]) {
      const d = buildShareCardData(biz, { disp: googleDisp, cityName: 'Guadalajara' });
      const geo = computeShareCardLayout(d, format, true);
      // La foto es más alta que su mínimo: se comió el espacio libre.
      expect(geo.photo.h).toBeGreaterThan(geo.L.photoMinH);
      // Entre el fin de las píldoras y el pie hay exactamente el hueco
      // diseñado (footGap), no un tercio de tarjeta vacía.
      const lastRow = geo.pillRows[geo.pillRows.length - 1];
      const pillsEnd = lastRow[0].y + lastRow[0].h;
      const footTop = geo.height - geo.L.pad - geo.L.footSize;
      expect(footTop - pillsEnd).toBe(geo.L.footGap);
    }
  });

  it('el peor caso (nombre largo, 2 líneas, ciudad larga) tampoco deja hueco ni se desborda', () => {
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
      expect(geo.name.lines.length).toBeLessThanOrEqual(2);
      expect(geo.photo.h).toBeGreaterThanOrEqual(geo.L.photoMinH);
      const lastRow = geo.pillRows[geo.pillRows.length - 1];
      const pillsEnd = lastRow[0].y + lastRow[0].h;
      const footTop = geo.height - geo.L.pad - geo.L.footSize;
      expect(footTop - pillsEnd).toBe(geo.L.footGap);
    }
  });

  it('el nombre se corta a 2 líneas con puntos suspensivos', () => {
    const L = SHARE_CARD_LAYOUT.story;
    const lines = wrapShareCardName(
      'Restaurante El Gran Buffet Internacional de la Abuela María',
      1080 - L.pad * 2,
      L,
    );
    expect(lines.length).toBeLessThanOrEqual(2);
    expect(lines.length).toBe(2);
    expect(lines[1].endsWith('…')).toBe(true);
    expect(wrapShareCardName('Xokol', 952, L)).toEqual(['Xokol']);
    expect(wrapShareCardName('', 952, L)).toEqual([]);
  });

  it('el círculo del logo es solo para planes de pago con logo_url (como la ficha)', () => {
    // Misma regla que DetailView: logo + plan premium/pro/destacado.
    expect(bizShowsLogoCircle(bizLogo)).toBe(true);
    expect(bizShowsLogoCircle({ ...bizLogo, plan: 'pro' })).toBe(true);
    expect(bizShowsLogoCircle({ ...bizLogo, plan: 'destacado' })).toBe(true);
    // Plan gratuito con logo: la ficha tampoco lo muestra.
    expect(bizShowsLogoCircle({ ...bizLogo, plan: 'free' })).toBe(false);
    expect(bizShowsLogoCircle({ ...bizLogo, plan: '' })).toBe(false);
    expect(bizShowsLogoCircle({ ...bizLogo, plan: undefined })).toBe(false);
    // Sin logo no hay círculo en ningún plan.
    expect(bizShowsLogoCircle({ ...bizLogo, logo_url: '' })).toBe(false);
    expect(bizShowsLogoCircle({ ...bizLogo, logo_url: null })).toBe(false);
    expect(bizShowsLogoCircle(biz)).toBe(false);
  });

  it('buildShareCardData pasa el logo solo cuando hay círculo; la foto sigue prefiriendo la galería', () => {
    const d = buildShareCardData(bizLogo, { disp: googleDispBarbarella, cityName: 'Guadalajara' });
    expect(d.bizLogoUrl).toBe(bizLogo.logo_url);
    // La foto sigue siendo la de la galería, no el logo.
    expect(d.photoUrl).toBe(biz.photos[0].url);
    const dFree = buildShareCardData({ ...bizLogo, plan: 'free' }, { disp: googleDispBarbarella, cityName: 'Guadalajara' });
    expect(dFree.bizLogoUrl).toBeNull();
    const dNoLogo = buildShareCardData(biz, { disp: googleDisp, cityName: 'Guadalajara' });
    expect(dNoLogo.bizLogoUrl).toBeNull();
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
      const dNoLogo = buildShareCardData(biz, { disp: googleDisp, cityName: 'Guadalajara' });
      const geoNoLogo = computeShareCardLayout(dNoLogo, format, true);
      const expectedDiff = geo.L.bizLogoD / 2 + geo.L.bizLogoGap - geo.L.nameGap;
      expect(geoNoLogo.photo.h - geo.photo.h).toBeCloseTo(expectedDiff, 6);
      // El primer hueco tras la foto es el del círculo.
      expect(geo.firstGap).toBe(geo.L.bizLogoD / 2 + geo.L.bizLogoGap);
      // Sigue sin franja vacía entre píldoras y pie (toBeCloseTo: el
      // 88 × 1,12 del nombre deja polvo de coma flotante, 44,000…114).
      const lastRow = geo.pillRows[geo.pillRows.length - 1];
      const pillsEnd = lastRow[0].y + lastRow[0].h;
      const footTop = geo.height - geo.L.pad - geo.L.footSize;
      expect(footTop - pillsEnd).toBeCloseTo(geo.L.footGap, 9);
    }
  });

  it('sin logo, la tarjeta es idéntica a la del #143 (sin círculo, sin hueco)', () => {
    for (const format of [SHARE_CARD_FORMATS.story, SHARE_CARD_FORMATS.post]) {
      const d = buildShareCardData(biz, { disp: googleDisp, cityName: 'Guadalajara' });
      const geo = computeShareCardLayout(d, format, true);
      expect(geo.bizLogo).toBeNull();
      // La foto conserva su alto calculado (Xokol, Historia: 1331,44;
      // Post: 629,84) y el primer hueco es el margen normal del nombre.
      const expectedPhotoH =
        format.height -
        geo.L.pad * 2 -
        (geo.L.logoH + geo.L.logoGap) -
        (geo.L.nameGap + geo.L.nameSize * geo.L.nameLineH) -
        (geo.L.pillsGap + geo.L.pillSize + geo.L.pillPadY * 2) -
        (geo.L.footGap + geo.L.footSize);
      expect(geo.photo.h).toBeCloseTo(expectedPhotoH, 6);
      expect(geo.firstGap).toBe(geo.L.nameGap);
    }
  });

  it('el peor caso con logo (nombre largo, 2 líneas, ciudad larga) tampoco deja hueco ni se desborda', () => {
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
      expect(geo.name.lines.length).toBeLessThanOrEqual(2);
      expect(geo.photo.h).toBeGreaterThanOrEqual(geo.L.photoMinH);
      const lastRow = geo.pillRows[geo.pillRows.length - 1];
      const pillsEnd = lastRow[0].y + lastRow[0].h;
      const footTop = geo.height - geo.L.pad - geo.L.footSize;
      expect(footTop - pillsEnd).toBe(geo.L.footGap);
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

  it('el peor caso con logo y círculo grande no se solapa (nombre de 2 líneas, PR #145)', () => {
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
      // El nombre ocupa las 2 líneas en el peor caso.
      expect(geo.name.lines.length).toBe(2);
      // La foto no se recorta a su mínimo: nada se desborda.
      expect(geo.photo.h).toBeGreaterThan(geo.L.photoMinH);
      // Entre el círculo y el primer texto queda el hueco diseñado
      // (la y del círculo se redondea a píxel entero, ±0,5 px). El
      // primer texto es el nombre (la categoría salió en el PR #155).
      const circleBottom = geo.bizLogo.y + geo.bizLogo.d;
      const firstTextTop = geo.name.y - (geo.L.nameSize * geo.L.nameLineH) / 2;
      expect(firstTextTop - circleBottom).toBeCloseTo(geo.L.bizLogoGap, 0);
      // Y entre las píldoras y el pie queda exactamente footGap.
      const lastRow = geo.pillRows[geo.pillRows.length - 1];
      const pillsEnd = lastRow[0].y + lastRow[0].h;
      const footTop = geo.height - geo.L.pad - geo.L.footSize;
      expect(footTop - pillsEnd).toBe(geo.L.footGap);
    }
  });
});
