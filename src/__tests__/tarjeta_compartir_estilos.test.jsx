import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  buildShareCardData,
  bizShowsLogoCircle,
  computeShareCardLayout,
  formatShareCardHour,
  resolveShareCardStyle,
  shareCardHoursLine,
  shareCardLayoutTable,
  shareCardWhatsapp,
  wrapShareCardText,
  SHARE_CARD_FORMATS,
  SHARE_CARD_STYLE_COLORS,
  SHARE_CARD_STYLE_LIST,
} from '../lib/shareCard.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// Dos estilos nuevos para la tarjeta de negocios (PR #154), elegidos
// por Jonathan de la demo de propuestas:
//   1. Editorial: panel claro tipo revista (fondo blanco, sin círculo
//      de logo: la limpieza es el estilo).
//   6. Ficha completa: foto, nombre, calificación y una ficha con el
//      horario de hoy, la dirección y el WhatsApp (solo las líneas con
//      dato real, de los mismos campos que muestra la ficha).
// El estilo oscuro sigue siendo el por defecto y la vista previa y el
// PNG comparten UNA geometría por estilo, como la tarjeta actual.
describe('tarjeta para compartir: estilos Editorial y Ficha completa (PR #154)', () => {
  const biz = {
    name: 'Xokol',
    type: 'Restaurantes',
    city_slug: 'guadalajara',
    price: '$$',
    photos: [{ url: 'https://example.supabase.co/object/public/media/cityguide/xokol.jpg' }],
  };
  const googleDisp = { rating: 4.5, count: 1234, source: 'google' };
  // Barbarella: plan de pago con logo, como en la captura de Jonathan.
  const bizLogo = {
    ...biz,
    name: 'Barbarella',
    logo_url: 'https://example.supabase.co/object/public/media/cityguide/barbarella-logo.png',
    plan: 'premium',
  };
  const googleDispBarbarella = { rating: 4.5, count: 4569, source: 'google' };
  // Lunes 9 nov 2026, 20:00 hora de Guadalajara (el 10 nov es martes).
  const mondayNight = new Date('2026-11-09T20:00:00-06:00');
  const mondayMorning = new Date('2026-11-09T08:00:00-06:00');
  const bizHours = {
    ...biz,
    address: 'Av. Chapultepec Sur 123, Guadalajara',
    whatsapp: '33 1234 5678',
    plan: 'premium',
    schedule: {
      lun: '9:00 AM - 11:00 PM',
      mar: '9:00 AM - 11:00 PM',
      mie: '9:00 AM - 11:00 PM',
      jue: '9:00 AM - 11:00 PM',
      vie: '9:00 AM - 1:00 AM',
      sab: '10:00 AM - 1:00 AM',
      dom: 'Cerrado',
    },
  };

  it('tres estilos y el oscuro sigue siendo el por defecto', () => {
    expect(SHARE_CARD_STYLE_LIST.map((s) => s.id)).toEqual([
      'glass',
      'editorial',
      'ficha',
    ]);
    expect(SHARE_CARD_STYLE_LIST.find((s) => s.id === 'editorial').label).toBe(
      'Editorial',
    );
    expect(SHARE_CARD_STYLE_LIST.find((s) => s.id === 'ficha').label).toBe(
      'Ficha completa',
    );
    expect(resolveShareCardStyle('glass').id).toBe('glass');
    expect(resolveShareCardStyle('editorial').id).toBe('editorial');
    expect(resolveShareCardStyle('ficha').id).toBe('ficha');
    // Un estilo desconocido cae al oscuro, nunca a una tarjeta rota.
    expect(resolveShareCardStyle('invento').id).toBe('glass');
    expect(resolveShareCardStyle(undefined).id).toBe('glass');
    // Sin estilo, la geometría es la de siempre.
    const d = buildShareCardData(biz, { disp: googleDisp, cityName: 'Guadalajara' });
    const def = computeShareCardLayout(d, SHARE_CARD_FORMATS.story, true);
    const glass = computeShareCardLayout(d, SHARE_CARD_FORMATS.story, true, 'glass');
    expect(def.style).toBe('glass');
    expect(def.photo.h).toBe(glass.photo.h);
    expect(def.name.lines).toEqual(glass.name.lines);
  });

  it('la hora en 12 h en español, como las horas de la app', () => {
    expect(formatShareCardHour('11:00 PM')).toBe('11:00 p. m.');
    expect(formatShareCardHour('9:00 AM')).toBe('9:00 a. m.');
    expect(formatShareCardHour('12:30 PM')).toBe('12:30 p. m.');
    expect(formatShareCardHour('12:00 AM')).toBe('12:00 a. m.');
    expect(formatShareCardHour('1:00 AM')).toBe('1:00 a. m.');
  });

  it('la línea de horario de hoy: abierto, cerrado y sin horario', () => {
    // Lunes 20:00, horario 9:00–23:00: abierto y cierra a las 11.
    expect(shareCardHoursLine(bizHours, mondayNight)).toBe(
      'Abierto ahora · Cierra 11:00 p. m.',
    );
    // Lunes 08:00, antes de abrir: cerrado con el horario de hoy.
    expect(shareCardHoursLine(bizHours, mondayMorning)).toBe(
      'Cerrado · Hoy 9:00 a. m. – 11:00 p. m.',
    );
    // Domingo cerrado.
    const sunday = new Date('2026-11-08T12:00:00-06:00');
    expect(shareCardHoursLine(bizHours, sunday)).toBe('Cerrado hoy');
    // Sin horario para hoy (solo martes en el horario).
    expect(
      shareCardHoursLine({ schedule: { mar: '9:00 AM - 5:00 PM' } }, mondayNight),
    ).toBeNull();
    // Sin horario en absoluto y sin campo open: no hay línea.
    expect(shareCardHoursLine(biz, mondayNight)).toBeNull();
    expect(shareCardHoursLine({ ...biz, open: true }, mondayNight)).toBe('Abierto ahora');
    // Tipos especiales del horario.
    expect(
      shareCardHoursLine({ schedule: { type: 'none' } }, mondayNight),
    ).toBeNull();
    expect(
      shareCardHoursLine({ schedule: { type: 'always_open' } }, mondayNight),
    ).toBe('Abierto 24/7');
    expect(
      shareCardHoursLine({ schedule: { type: 'appointment' } }, mondayNight),
    ).toBe('Atención con cita previa');
  });

  it('el WhatsApp es el de la ficha: solo con número y plan de pago', () => {
    expect(shareCardWhatsapp(bizHours)).toBe('33 1234 5678');
    expect(shareCardWhatsapp({ ...bizHours, plan: 'pro' })).toBe('33 1234 5678');
    expect(shareCardWhatsapp({ ...bizHours, plan: 'destacado' })).toBe(
      '33 1234 5678',
    );
    // Plan gratuito con número: la ficha tampoco lo muestra.
    expect(shareCardWhatsapp({ ...bizHours, plan: 'free' })).toBeNull();
    expect(shareCardWhatsapp({ ...bizHours, plan: '' })).toBeNull();
    expect(shareCardWhatsapp({ ...bizHours, whatsapp: '' })).toBeNull();
    expect(shareCardWhatsapp({ ...bizHours, whatsapp: null })).toBeNull();
    expect(shareCardWhatsapp(biz)).toBeNull();
  });

  it('buildShareCardData suma horario, dirección y WhatsApp (solo con dato)', () => {
    const d = buildShareCardData(bizHours, {
      disp: googleDisp,
      cityName: 'Guadalajara',
      now: mondayNight,
    });
    expect(d.hoursLine).toBe('Abierto ahora · Cierra 11:00 p. m.');
    expect(d.address).toBe('Av. Chapultepec Sur 123, Guadalajara');
    expect(d.whatsapp).toBe('33 1234 5678');
    // Dirección oculta o vacía: no hay línea.
    expect(
      buildShareCardData({ ...bizHours, hide_location: true }, { now: mondayNight })
        .address,
    ).toBeNull();
    expect(
      buildShareCardData({ ...bizHours, address: '   ' }, { now: mondayNight })
        .address,
    ).toBeNull();
    // Sin horario ni WhatsApp: las líneas son null, nunca relleno.
    const dPlain = buildShareCardData(biz, { disp: googleDisp, cityName: 'Guadalajara' });
    expect(dPlain.hoursLine).toBeNull();
    expect(dPlain.address).toBeNull();
    expect(dPlain.whatsapp).toBeNull();
  });

  it('Ficha: el panel trae las 3 filas y la tarjeta no se desborda', () => {
    for (const format of [SHARE_CARD_FORMATS.story, SHARE_CARD_FORMATS.post]) {
      const d = buildShareCardData(bizHours, {
        disp: googleDisp,
        cityName: 'Guadalajara',
        now: mondayNight,
      });
      const geo = computeShareCardLayout(d, format, true, 'ficha');
      expect(geo.style).toBe('ficha');
      expect(geo.info).not.toBeNull();
      expect(geo.info.rows.map((r) => r.icon)).toEqual(['🕐', '📍', '💬']);
      expect(geo.info.rows[0].lines[0].text).toBe('Abierto ahora · Cierra 11:00 p. m.');
      expect(geo.info.rows[1].lines.map((l) => l.text).join(' ')).toContain(
        'Av. Chapultepec Sur 123',
      );
      expect(geo.info.rows[2].lines[0].text).toBe('WhatsApp 33 1234 5678');
      for (const row of geo.info.rows) {
        expect(row.lines.length).toBeLessThanOrEqual(2);
      }
      // La foto no baja de su mínimo y el panel no se come el pie.
      expect(geo.photo.h).toBeGreaterThanOrEqual(geo.L.photoMinH);
      const infoEnd = geo.info.y + geo.info.h;
      const footTop = geo.height - geo.L.pad - geo.L.footSize;
      expect(footTop - infoEnd).toBe(geo.L.footGap);
      expect(infoEnd + geo.L.footGap + geo.L.footSize + geo.L.pad).toBeLessThanOrEqual(
        geo.height,
      );
    }
  });

  it('Ficha: el peor caso (nombre largo, dirección larga) tampoco se desborda', () => {
    const worst = {
      ...bizHours,
      name: 'Restaurante El Gran Buffet Internacional de la Abuela María',
      address:
        'Av. Chapultepec Sur 123, Colonia Americana, Guadalajara, Jalisco, México',
    };
    for (const format of [SHARE_CARD_FORMATS.story, SHARE_CARD_FORMATS.post]) {
      const d = buildShareCardData(worst, {
        disp: googleDisp,
        cityName: 'San Pedro Garza García',
        now: mondayNight,
      });
      const geo = computeShareCardLayout(d, format, true, 'ficha');
      expect(geo.info).not.toBeNull();
      expect(geo.name.lines.length).toBeLessThanOrEqual(2);
      for (const row of geo.info.rows) {
        expect(row.lines.length).toBeLessThanOrEqual(2);
      }
      expect(geo.photo.h).toBeGreaterThanOrEqual(geo.L.photoMinH);
      const infoEnd = geo.info.y + geo.info.h;
      const footTop = geo.height - geo.L.pad - geo.L.footSize;
      expect(footTop - infoEnd).toBe(geo.L.footGap);
      expect(infoEnd + geo.L.footGap + geo.L.footSize + geo.L.pad).toBeLessThanOrEqual(
        geo.height,
      );
    }
  });

  it('Ficha: sin horario, dirección ni WhatsApp no hay panel', () => {
    for (const format of [SHARE_CARD_FORMATS.story, SHARE_CARD_FORMATS.post]) {
      const d = buildShareCardData(biz, { disp: googleDisp, cityName: 'Guadalajara' });
      const geo = computeShareCardLayout(d, format, true, 'ficha');
      expect(geo.info).toBeNull();
      // La foto crece y llena la tarjeta, como en el estilo oscuro.
      expect(geo.photo.h).toBeGreaterThan(geo.L.photoMinH);
      const lastRow = geo.pillRows[geo.pillRows.length - 1];
      const pillsEnd = lastRow[0].y + lastRow[0].h;
      const footTop = geo.height - geo.L.pad - geo.L.footSize;
      expect(footTop - pillsEnd).toBe(geo.L.footGap);
    }
  });

  it('Ficha: el círculo de logo sigue la regla de la ficha (solo pago con logo)', () => {
    const d = buildShareCardData(bizLogo, {
      disp: googleDispBarbarella,
      cityName: 'Guadalajara',
    });
    for (const format of [SHARE_CARD_FORMATS.story, SHARE_CARD_FORMATS.post]) {
      const geo = computeShareCardLayout(d, format, true, 'ficha');
      expect(geo.bizLogo).not.toBeNull();
      expect(geo.bizLogo.d).toBe(geo.L.bizLogoD);
      const photoBottom = geo.photo.y + geo.photo.h;
      expect(geo.bizLogo.y + geo.bizLogo.d / 2).toBeCloseTo(photoBottom, 0);
    }
    const dFree = buildShareCardData(
      { ...bizLogo, plan: 'free' },
      { disp: googleDispBarbarella, cityName: 'Guadalajara' },
    );
    const geoFree = computeShareCardLayout(dFree, SHARE_CARD_FORMATS.story, true, 'ficha');
    expect(geoFree.bizLogo).toBeNull();
  });

  it('Editorial: clara, sin círculo de logo y sin desbordar', () => {
    expect(SHARE_CARD_STYLE_COLORS.editorial.bg[0]).toBe('#FFFFFF');
    expect(SHARE_CARD_STYLE_COLORS.editorial.logoWhite).toBe(false);
    expect(SHARE_CARD_STYLE_COLORS.glass.logoWhite).toBe(true);
    for (const format of [SHARE_CARD_FORMATS.story, SHARE_CARD_FORMATS.post]) {
      const d = buildShareCardData(bizLogo, {
        disp: googleDispBarbarella,
        cityName: 'Guadalajara',
      });
      const geo = computeShareCardLayout(d, format, true, 'editorial');
      expect(geo.style).toBe('editorial');
      // Aunque tenga logo y plan de pago, Editorial no lleva círculo:
      // la limpieza es el estilo.
      expect(geo.bizLogo).toBeNull();
      expect(geo.info).toBeNull();
      expect(geo.photo.h).toBeGreaterThanOrEqual(geo.L.photoMinH);
      const lastRow = geo.pillRows[geo.pillRows.length - 1];
      const pillsEnd = lastRow[0].y + lastRow[0].h;
      const footTop = geo.height - geo.L.pad - geo.L.footSize;
      expect(footTop - pillsEnd).toBe(geo.L.footGap);
    }
    // Peor caso (nombre largo, ciudad larga): tampoco se desborda.
    const longBiz = {
      ...biz,
      name: 'Restaurante El Gran Buffet Internacional de la Abuela María',
    };
    for (const format of [SHARE_CARD_FORMATS.story, SHARE_CARD_FORMATS.post]) {
      const d = buildShareCardData(longBiz, {
        disp: googleDisp,
        cityName: 'San Pedro Garza García',
      });
      const geo = computeShareCardLayout(d, format, true, 'editorial');
      expect(geo.name.lines.length).toBeLessThanOrEqual(2);
      expect(geo.photo.h).toBeGreaterThanOrEqual(geo.L.photoMinH);
      const lastRow = geo.pillRows[geo.pillRows.length - 1];
      const pillsEnd = lastRow[0].y + lastRow[0].h;
      const footTop = geo.height - geo.L.pad - geo.L.footSize;
      expect(footTop - pillsEnd).toBe(geo.L.footGap);
    }
  });

  it('wrapShareCardText corta a N líneas con puntos suspensivos', () => {
    expect(wrapShareCardText('Hola mundo', 1000, 30, 2)).toEqual(['Hola mundo']);
    expect(wrapShareCardText('', 1000, 30, 2)).toEqual([]);
    const lines = wrapShareCardText(
      'Restaurante El Gran Buffet Internacional de la Abuela María',
      300,
      30,
      2,
    );
    expect(lines.length).toBe(2);
    expect(lines[1].endsWith('…')).toBe(true);
    // La tabla de medidas existe para los 3 estilos y los 2 formatos.
    for (const styleId of ['glass', 'editorial', 'ficha']) {
      for (const formatId of ['story', 'post']) {
        const L = shareCardLayoutTable(styleId, formatId);
        expect(typeof L.pad).toBe('number');
        expect(typeof L.photoMinH).toBe('number');
        expect(typeof L.nameSize).toBe('number');
      }
    }
    expect(bizShowsLogoCircle(bizLogo)).toBe(true);
  });

  it('la hoja deja elegir el estilo y la vista previa y el PNG son de ese estilo', () => {
    const lib = read('../lib/shareCard.js');
    const template = read('../components/ShareCardTemplate.jsx');
    const sheet = read('../components/ShareCardSheet.jsx');
    // El selector de estilo está en la hoja, junto al de formato.
    expect(sheet).toContain('SHARE_CARD_STYLE_LIST');
    expect(sheet).toContain('setStyleId');
    expect(sheet).toContain('SHARE_CARD_DEFAULT_STYLE');
    expect(sheet).toContain('styleId={styleId}');
    // El PNG se exporta con el estilo elegido.
    expect(sheet).toContain('exportShareCardPng(dataToExport, format, styleId)');
    expect(lib).toContain('export async function exportShareCardPng(data, format, styleId');
    expect(lib).toContain('renderShareCardCanvas(data, format, styleId');
    expect(lib).toContain('loadShareCardLogoDark');
    // La plantilla pinta el estilo elegido: paleta, panel de la ficha
    // y regla editorial.
    expect(template).toContain('styleId');
    expect(template).toContain('SHARE_CARD_STYLE_COLORS');
    expect(template).toContain('layout.info');
    expect(template).toContain('palette.infoBg');
    expect(template).toContain("style.id === 'editorial'");
    // El logo va en blanco sobre fondo oscuro y tal cual sobre claro.
    expect(template).toContain("palette.logoWhite ? 'brightness(0) invert(1)' : 'none'");
    expect(lib).toContain('logoDark');
    // El canvas dibuja el panel de la ficha y la regla editorial.
    expect(lib).toContain('geo.info');
    expect(lib).toContain('palette.infoBg');
    expect(lib).toContain("style.id === 'editorial'");
    // La tarjeta de eventos sigue usando la base sin cambios: sus
    // imports y su layout no se tocaron.
    const eventLib = read('../lib/eventShareCard.js');
    expect(eventLib).toContain('SHARE_CARD_LAYOUT');
    expect(eventLib).toContain('loadShareCardLogoWhite');
  });
});
