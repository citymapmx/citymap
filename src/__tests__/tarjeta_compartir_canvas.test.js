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
});
