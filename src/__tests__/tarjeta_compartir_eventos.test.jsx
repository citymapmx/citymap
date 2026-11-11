import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import EventShareCardTemplate from '../components/EventShareCardTemplate.jsx';
import {
  clampPhotoOffset,
  normalizePhotoOffset,
  coverObjectPosition,
  drawCoverImage,
} from '../lib/shareCard.js';
import {
  eventShareCardStyle,
  buildEventShareCardData,
  eventShareCardFileName,
  eventShareCardDateShort,
  eventShareCardDateRange,
  eventShareCardTimeLabel,
  eventBarcodeBars,
  computeEventShareCardLayout,
  EVENT_SHARE_CARD_LAYOUT,
  EVENT_SHARE_CARD_THEMES,
  EVENT_SHARE_CARD_THEME_LIST,
  EVENT_SHARE_CARD_THEME_COLORS,
  resolveEventShareCardTheme,
  SHARE_CARD_FORMATS,
} from '../lib/eventShareCard.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// Tarjeta para compartir el EVENTO (PR #152): lo mismo que la tarjeta
// de los negocios (PRs #142–#147) — botón Compartir en el detalle del
// evento, hoja centrada Historia y Post, PNG dibujado en canvas — pero con
// los datos del evento y uno de los 5 estilos de la imagen de Jonathan:
// concierto → festival, exposición/cultural → editorial, feria → boleto
// (código de barras decorativo), cata/taller → experiencias,
// mercado/conferencia → agenda. Sin círculo de logo (eso es solo para
// negocios con plan de pago).

// Eventos reales de la base (167 en total, leídos de PostgREST el 10 nov
// 2026) como casos de prueba: un concierto con precio, una exposición
// sin foto ni hora, una feria de varios días y una conferencia con la
// categoría con espacio final.
const CONCIERTO = {
  title: 'CARLOS RIVERA - FIESTAS DE OCTUBRE',
  event_category: 'Concierto',
  date: '2026-11-02',
  end_date: null,
  time: '20:00',
  end_time: null,
  venue_name: 'Fiestas de octubre',
  city_slug: 'guadalajara',
  price: '1200',
  price_type: 'paid',
  img_url: 'https://dpkjxhjkzdlkvyotoeai.supabase.co/storage/v1/object/public/media/cityguide/carlos-rivera.jpg',
  slug: 'guadalajara-carlos-rivera-fiestas-de-octubre',
  description: 'Carlos Rivera en concierto en las Fiestas de Octubre de Guadalajara.',
};
const EXPOSICION = {
  title: 'Expo Tattoo Puerto Vallarta 2026',
  event_category: 'Exposición',
  date: '2026-11-21',
  end_date: '2026-11-22',
  time: null,
  end_time: null,
  venue_name: 'Auditorio SNTSS',
  city_slug: 'puerto-vallarta',
  price: '',
  price_type: 'paid',
  img_url: null,
  slug: 'puerto-vallarta-expo-tattoo-puerto-vallarta-2026',
  description: 'Exposición de tatuajes con artistas nacionales e internacionales.',
};
const FERIA = {
  title: 'FIL Guadalajara 2026 — 40 aniversario, Italia país invitado',
  event_category: 'Feria del libro',
  date: '2026-11-28',
  end_date: '2026-12-06',
  time: null,
  end_time: null,
  venue_name: 'Expo Guadalajara',
  city_slug: 'guadalajara',
  price: '30',
  price_type: 'paid',
  img_url: 'https://dpkjxhjkzdlkvyotoeai.supabase.co/storage/v1/object/public/media/cityguide/fil.jpg',
  slug: 'guadalajara-fil-guadalajara-2026',
  description: 'La feria del libro más grande en español.',
};
// El caso de la captura de Jonathan (PR #153): título largo de concierto
// SIN precio publicado (Teatro Diana, 13 nov 2026) — en la tarjeta vieja
// salía cortado como «ESLABÓN ARMADO TOUR E...» y con la píldora
// «Precio mínimo no publicado».
const ESLABON = {
  title: 'Eslabón Armado Amor Nocturno Tour en Guadalajara',
  event_category: 'Concierto',
  date: '2026-11-13',
  end_date: null,
  time: '21:00',
  end_time: null,
  venue_name: 'Teatro Diana',
  city_slug: 'guadalajara',
  price: '',
  price_type: 'paid',
  img_url: 'https://dpkjxhjkzdlkvyotoeai.supabase.co/storage/v1/object/public/media/cityguide/eslabon-armado.jpg',
  slug: 'guadalajara-eslabon-armado-amor-nocturno-tour-en-guadalajara',
  description: 'Eslabón Armado en concierto en el Teatro Diana.',
};
// Peor caso de geometría (PR #153): título que necesita 3 líneas +
// subtítulo a 2 líneas + 2 filas de información + píldora.
const LARGO_EDITORIAL = {
  title: 'Gran Exposición Internacional de Arte Contemporáneo y Fotografía de Guadalajara 2026',
  event_category: 'Exposición',
  date: '2026-11-21',
  end_date: null,
  time: '18:00',
  end_time: '23:00',
  venue_name: 'Museo de las Artes de la Universidad de Guadalajara',
  city_slug: 'guadalajara',
  price: '250',
  price_type: 'paid',
  img_url: 'https://dpkjxhjkzdlkvyotoeai.supabase.co/storage/v1/object/public/media/cityguide/expo.jpg',
  slug: 'guadalajara-expo-internacional-arte-contemporaneo-2026',
  description:
    'Una exposición con artistas nacionales e internacionales, instalaciones, fotografía y pintura contemporánea de todo el mundo.',
};

describe('tarjeta para compartir el evento: estilo por tipo', () => {
  it('concierto → festival (también con espacio final y navideño)', () => {
    expect(eventShareCardStyle({ event_category: 'Concierto' })).toBe('festival');
    expect(eventShareCardStyle({ event_category: 'Concierto ' })).toBe('festival');
    expect(eventShareCardStyle({ event_category: 'Concierto navideño' })).toBe('festival');
    expect(eventShareCardStyle({ event_category: 'Concierto gratuito' })).toBe('festival');
  });

  it('feria → boleto; festival (el evento) → festival', () => {
    expect(eventShareCardStyle({ event_category: 'Feria del libro' })).toBe('boleto');
    expect(eventShareCardStyle({ event_category: 'Festival' })).toBe('festival');
    expect(eventShareCardStyle({ event_category: 'Festival de tequila' })).toBe('festival');
  });

  it('cata, cocina, gastronomía y experiencia → experiencias', () => {
    expect(eventShareCardStyle({ event_category: 'Gastronomía' })).toBe('experiencias');
    expect(eventShareCardStyle({ event_category: 'Experiencia' })).toBe('experiencias');
    expect(eventShareCardStyle({ event_category: 'Cata de vinos' })).toBe('experiencias');
    expect(eventShareCardStyle({ event_category: 'Clase de cocina' })).toBe('experiencias');
    expect(eventShareCardStyle({ event_category: 'Taller de cocina' })).toBe('experiencias');
  });

  it('mercado, conferencia, congreso y taller local → agenda', () => {
    expect(eventShareCardStyle({ event_category: 'Mercado' })).toBe('agenda');
    expect(eventShareCardStyle({ event_category: 'Conferencia ' })).toBe('agenda');
    expect(eventShareCardStyle({ event_category: 'Congreso / Turismo de aventura' })).toBe('agenda');
    expect(eventShareCardStyle({ event_category: 'Taller' })).toBe('agenda');
  });

  it('exposición, cultural y el resto → editorial (por defecto)', () => {
    expect(eventShareCardStyle({ event_category: 'Exposición' })).toBe('editorial');
    expect(eventShareCardStyle({ event_category: 'Danza / Ballet' })).toBe('editorial');
    expect(eventShareCardStyle({ event_category: 'Obra de teatro' })).toBe('editorial');
    expect(eventShareCardStyle({ event_category: '' })).toBe('editorial');
    expect(eventShareCardStyle({})).toBe('editorial');
  });
});

describe('tarjeta para compartir el evento: datos reales', () => {
  it('concierto: estilo festival, precio mínimo real, fecha y hora en 12 h', () => {
    const d = buildEventShareCardData(CONCIERTO, { cityName: 'Guadalajara' });
    expect(d.style).toBe('festival');
    expect(d.title).toBe('CARLOS RIVERA - FIESTAS DE OCTUBRE');
    expect(d.photoUrl).toContain('carlos-rivera.jpg');
    expect(d.priceText).toBe('Boletos desde $1200');
    expect(d.priceKind).toBe('paid');
    expect(d.dateText).toBe('Lun, 2 Nov');
    expect(d.timeText).toBe('8:00 p. m.');
    expect(d.infoLines).toEqual([
      '📅 Lun, 2 Nov · 8:00 p. m.',
      '📍 Fiestas de octubre',
    ]);
    // La URL que se comparte es la del detalle, /evento/:ciudad/:slug-corto.
    expect(d.shareUrl).toBe(
      'https://citymap.mx/evento/guadalajara/carlos-rivera-fiestas-de-octubre',
    );
    expect(eventShareCardFileName(CONCIERTO)).toBe(
      'citymap-evento-carlos-rivera-fiestas-de-octubre.png',
    );
  });

  it('gratis → «Entrada gratuita»; sin precio publicado → sin mención de precio (PR #153)', () => {
    const free = buildEventShareCardData(
      { ...CONCIERTO, price: '0', price_type: 'gratis' },
      { cityName: 'Guadalajara' },
    );
    expect(free.priceText).toBe('Entrada gratuita');
    expect(free.priceKind).toBe('free');
    // Sin precio no se menciona nada: ni píldora ni línea de precio.
    const unknown = buildEventShareCardData(EXPOSICION, {
      cityName: 'Puerto Vallarta',
    });
    expect(unknown.priceText).toBe('');
    expect(unknown.priceKind).toBe('none');
  });

  it('exposición sin foto ni hora: editorial, sin foto y sin inventar nada', () => {
    const d = buildEventShareCardData(EXPOSICION, { cityName: 'Puerto Vallarta' });
    expect(d.style).toBe('editorial');
    expect(d.photoUrl).toBeNull();
    expect(d.dateText).toBe('Sáb, 21 Nov');
    expect(d.timeText).toBe('');
    expect(d.infoLines).toEqual(['📅 Sáb, 21 Nov', '📍 Auditorio SNTSS']);
    expect(d.subtitle).toContain('Exposición de tatuajes');
  });

  it('feria: rango de fechas «28 Nov – 6 Dic» y precio desde $30', () => {
    const d = buildEventShareCardData(FERIA, { cityName: 'Guadalajara' });
    expect(d.style).toBe('boleto');
    expect(d.dateRangeText).toBe('28 Nov – 6 Dic');
    expect(d.priceText).toBe('Boletos desde $30');
    expect(eventShareCardDateShort('2026-11-28')).toBe('Sáb, 28 Nov');
    expect(eventShareCardDateRange(FERIA)).toBe('28 Nov – 6 Dic');
    expect(eventShareCardDateRange(CONCIERTO)).toBe('Lun, 2 Nov');
  });

  it('horas en 12 h, como el detalle (nunca 24 h)', () => {
    expect(eventShareCardTimeLabel('20:00')).toBe('8:00 p. m.');
    expect(eventShareCardTimeLabel('09:30')).toBe('9:30 a. m.');
    expect(eventShareCardTimeLabel('12:00')).toBe('12:00 p. m.');
    expect(eventShareCardTimeLabel('00:30')).toBe('12:30 a. m.');
    expect(eventShareCardTimeLabel(null)).toBe('');
    expect(eventShareCardTimeLabel('')).toBe('');
  });

  it('el código de barras es determinista para el mismo evento', () => {
    const a = eventBarcodeBars('guadalajara-fil-guadalajara-2026', 800);
    const b = eventBarcodeBars('guadalajara-fil-guadalajara-2026', 800);
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(10);
    const c = eventBarcodeBars('guadalajara-otro-evento', 800);
    expect(c).not.toEqual(a);
  });
});

describe('tarjeta para compartir el evento: geometría (vista previa = PNG)', () => {
  it('la foto crece y no queda franja vacía entre el último bloque y el pie', () => {
    for (const format of [SHARE_CARD_FORMATS.story, SHARE_CARD_FORMATS.post]) {
      for (const ev of [CONCIERTO, EXPOSICION, FERIA]) {
        const d = buildEventShareCardData(ev, { cityName: 'Guadalajara' });
        const geo = computeEventShareCardLayout(d, format);
        // La foto es más alta que su mínimo: se comió el espacio libre.
        expect(geo.photo.h).toBeGreaterThan(geo.L.photoMinH);
        // Entre el fin del último bloque y el pie hay exactamente el
        // hueco diseñado (footGap), no un tercio de tarjeta vacía.
        const ends = [];
        if (geo.chip) ends.push(geo.chip.y + geo.chip.size / 2);
        if (geo.title) {
          ends.push(
            geo.title.y +
              (geo.title.lines.length - 1) * geo.title.lineH +
              geo.title.lineH / 2,
          );
        }
        if (geo.subtitle) {
          ends.push(
            geo.subtitle.y +
              (geo.subtitle.lines.length - 1) * geo.subtitle.lineH +
              geo.subtitle.lineH / 2,
          );
        }
        for (const row of geo.info) ends.push(row.y + (row.size * geo.L.infoLineH) / 2);
        if (geo.pill) ends.push(geo.pill.y + geo.pill.h);
        if (geo.barcode) ends.push(geo.barcode.y + geo.barcode.h);
        const lastEnd = Math.max(...ends);
        const footTop = geo.height - geo.L.pad - geo.L.footSize;
        // Tolerancia de 1e-9 px: las alturas de línea (tamaño × 1.12)
        // son decimales no exactos en binario y la suma arrastra polvo
        // de coma flotante; el hueco diseñado es footGap, sin hueco
        // vacío ni desbordamiento.
        expect(footTop - lastEnd).toBeCloseTo(geo.L.footGap, 9);
      }
    }
  });

  it('la píldora es el precio en festival/editorial, «Cupo limitado» en experiencias y no hay en boleto/agenda', () => {
    const fest = computeEventShareCardLayout(
      buildEventShareCardData(CONCIERTO, { cityName: 'Guadalajara' }),
      SHARE_CARD_FORMATS.story,
    );
    expect(fest.pill?.text).toBe('Boletos desde $1200');
    const edit = computeEventShareCardLayout(
      buildEventShareCardData(EXPOSICION, { cityName: 'Puerto Vallarta' }),
      SHARE_CARD_FORMATS.story,
    );
    // Sin precio publicado la tarjeta no lleva píldora (PR #153).
    expect(edit.pill).toBeNull();
    const exp = computeEventShareCardLayout(
      buildEventShareCardData(
        { ...CONCIERTO, event_category: 'Gastronomía', price: '', price_type: 'paid' },
        { cityName: 'Guadalajara' },
      ),
      SHARE_CARD_FORMATS.story,
    );
    expect(exp.pill?.text).toBe('Cupo limitado');
    const bol = computeEventShareCardLayout(
      buildEventShareCardData(FERIA, { cityName: 'Guadalajara' }),
      SHARE_CARD_FORMATS.story,
    );
    expect(bol.pill).toBeNull();
    const ag = computeEventShareCardLayout(
      buildEventShareCardData(
        { ...CONCIERTO, event_category: 'Conferencia ' },
        { cityName: 'Guadalajara' },
      ),
      SHARE_CARD_FORMATS.story,
    );
    expect(ag.pill).toBeNull();
  });

  it('el código de barras solo existe en el estilo boleto', () => {
    const bol = computeEventShareCardLayout(
      buildEventShareCardData(FERIA, { cityName: 'Guadalajara' }),
      SHARE_CARD_FORMATS.story,
    );
    expect(bol.barcode).not.toBeNull();
    expect(bol.barcode.bars.length).toBeGreaterThan(10);
    // Todas las barras caben dentro de la tira blanca.
    for (const bar of bol.barcode.bars) {
      expect(bar.x + bar.w).toBeLessThanOrEqual(
        bol.barcode.w - bol.barcode.padX + 1,
      );
    }
    const fest = computeEventShareCardLayout(
      buildEventShareCardData(CONCIERTO, { cityName: 'Guadalajara' }),
      SHARE_CARD_FORMATS.story,
    );
    expect(fest.barcode).toBeNull();
  });

  it('el título en festival va en mayúsculas y más grande; el subtítulo solo en editorial/experiencias/agenda', () => {
    const fest = computeEventShareCardLayout(
      buildEventShareCardData(CONCIERTO, { cityName: 'Guadalajara' }),
      SHARE_CARD_FORMATS.story,
    );
    expect(fest.title.lines.join(' ')).toBe('CARLOS RIVERA - FIESTAS DE OCTUBRE');
    expect(fest.title.size).toBe(EVENT_SHARE_CARD_LAYOUT.story.titleSizeFestival);
    expect(fest.title.size).toBeGreaterThan(
      EVENT_SHARE_CARD_LAYOUT.story.titleSize,
    );
    expect(fest.subtitle).toBeNull();
    const edit = computeEventShareCardLayout(
      buildEventShareCardData(EXPOSICION, { cityName: 'Puerto Vallarta' }),
      SHARE_CARD_FORMATS.story,
    );
    expect(edit.title.size).toBe(EVENT_SHARE_CARD_LAYOUT.story.titleSize);
    expect(edit.subtitle.lines.length).toBeGreaterThan(0);
    const bol = computeEventShareCardLayout(
      buildEventShareCardData(FERIA, { cityName: 'Guadalajara' }),
      SHARE_CARD_FORMATS.story,
    );
    expect(bol.subtitle).toBeNull();
  });
});

describe('tarjeta para compartir el evento: la plantilla se renderiza (vista previa real)', () => {
  it('festival: título en mayúsculas, precio y logo en Historia', () => {
    const d = buildEventShareCardData(CONCIERTO, { cityName: 'Guadalajara' });
    const html = renderToStaticMarkup(
      <EventShareCardTemplate data={d} format={SHARE_CARD_FORMATS.story} />,
    );
    // El título va en dos líneas (una por div), así que se afirman
    // las dos partes.
    expect(html).toContain('CARLOS RIVERA -');
    expect(html).toContain('FIESTAS DE OCTUBRE');
    expect(html).toContain('Boletos desde $1200');
    expect(html).toContain('Lun, 2 Nov');
    expect(html).toContain('Fiestas de octubre');
    expect(html).toContain('/logo-brand.png');
    expect(html).toContain('Descubre más eventos en');
    expect(html).toContain('www.citymap.mx');
  });

  it('boleto: la tira del código de barras se renderiza con sus barras', () => {
    const d = buildEventShareCardData(FERIA, { cityName: 'Guadalajara' });
    const html = renderToStaticMarkup(
      <EventShareCardTemplate data={d} format={SHARE_CARD_FORMATS.story} />,
    );
    expect(html).toContain('FIL Guadalajara 2026');
    expect(html).toContain('28 Nov – 6 Dic');
    expect(html).toContain('background:#111111');
  });

  it('sin foto: sale el bloque con la inicial, no una imagen rota', () => {
    const d = buildEventShareCardData(EXPOSICION, { cityName: 'Puerto Vallarta' });
    const html = renderToStaticMarkup(
      <EventShareCardTemplate data={d} format={SHARE_CARD_FORMATS.story} />,
    );
    // El título va en dos líneas (una por div) en Historia.
    expect(html).toContain('Expo Tattoo Puerto');
    expect(html).toContain('Vallarta 2026');
    expect(html).toContain('>E</span>');
    expect(html).not.toContain('<img src=""');
  });
});

describe('tarjeta para compartir el evento: sin precio no se menciona (PR #153)', () => {
  it('sin precio: la geometría no lleva píldora en ningún formato ni estilo', () => {
    for (const format of [SHARE_CARD_FORMATS.story, SHARE_CARD_FORMATS.post]) {
      // Editorial sin precio (Expo Tattoo) y festival sin precio (Eslabón).
      for (const ev of [EXPOSICION, ESLABON]) {
        const geo = computeEventShareCardLayout(
          buildEventShareCardData(ev, { cityName: 'Guadalajara' }),
          format,
        );
        expect(geo.pill).toBeNull();
      }
    }
    // Con precio y gratis la píldora sigue como antes.
    const paid = computeEventShareCardLayout(
      buildEventShareCardData(CONCIERTO, { cityName: 'Guadalajara' }),
      SHARE_CARD_FORMATS.story,
    );
    expect(paid.pill?.text).toBe('Boletos desde $1200');
    const free = computeEventShareCardLayout(
      buildEventShareCardData(
        { ...CONCIERTO, price: '0', price_type: 'gratis' },
        { cityName: 'Guadalajara' },
      ),
      SHARE_CARD_FORMATS.story,
    );
    expect(free.pill?.text).toBe('Entrada gratuita');
  });

  it('la plantilla sin precio no pinta ningún texto de precio', () => {
    for (const format of [SHARE_CARD_FORMATS.story, SHARE_CARD_FORMATS.post]) {
      for (const ev of [EXPOSICION, ESLABON]) {
        const d = buildEventShareCardData(ev, { cityName: 'Guadalajara' });
        const html = renderToStaticMarkup(
          <EventShareCardTemplate data={d} format={format} />,
        );
        expect(html).not.toContain('Precio mínimo');
        expect(html).not.toContain('Boletos desde');
        expect(html).not.toContain('Entrada gratuita');
      }
    }
  });
});

describe('tarjeta para compartir el evento: el título siempre completo (PR #153)', () => {
  it('título largo (Eslabón Armado): cabe completo sin «…» en Historia', () => {
    for (const format of [SHARE_CARD_FORMATS.story, SHARE_CARD_FORMATS.post]) {
      const d = buildEventShareCardData(ESLABON, { cityName: 'Guadalajara' });
      const geo = computeEventShareCardLayout(d, format);
      expect(geo.title.lines.length).toBeGreaterThan(0);
      expect(geo.title.lines.length).toBeLessThanOrEqual(3);
      for (const line of geo.title.lines) expect(line).not.toContain('…');
      // En festival el título va en mayúsculas y completo, sin cortar.
      expect(geo.title.lines.join(' ')).toBe(
        'ESLABÓN ARMADO AMOR NOCTURNO TOUR EN GUADALAJARA',
      );
      // La fuente nunca es mayor que la del estilo.
      expect(geo.title.size).toBeLessThanOrEqual(
        EVENT_SHARE_CARD_LAYOUT[format.id].titleSizeFestival,
      );
    }
  });

  it('título muy largo en editorial: la fuente se achica hasta caber en 3 líneas', () => {
    for (const format of [SHARE_CARD_FORMATS.story, SHARE_CARD_FORMATS.post]) {
      const d = buildEventShareCardData(LARGO_EDITORIAL, {
        cityName: 'Guadalajara',
      });
      const geo = computeEventShareCardLayout(d, format);
      expect(geo.title.lines.length).toBeLessThanOrEqual(3);
      for (const line of geo.title.lines) expect(line).not.toContain('…');
      expect(geo.title.lines.join(' ')).toBe(
        'Gran Exposición Internacional de Arte Contemporáneo y Fotografía de Guadalajara 2026',
      );
      // Tuvo que achicarse: a tamaño completo no cabe en 3 líneas.
      expect(geo.title.size).toBeLessThan(
        EVENT_SHARE_CARD_LAYOUT[format.id].titleSize,
      );
    }
  });

  it('la geometría no desborda con el peor caso (título a 3 líneas + subtítulo + 2 filas + píldora)', () => {
    for (const format of [SHARE_CARD_FORMATS.story, SHARE_CARD_FORMATS.post]) {
      for (const ev of [LARGO_EDITORIAL, ESLABON, FERIA]) {
        const d = buildEventShareCardData(ev, { cityName: 'Guadalajara' });
        const geo = computeEventShareCardLayout(d, format);
        // La foto nunca baja de su mínimo: nada se sale de la tarjeta.
        expect(geo.photo.h).toBeGreaterThanOrEqual(geo.L.photoMinH);
        const ends = [];
        if (geo.chip) ends.push(geo.chip.y + geo.chip.size / 2);
        if (geo.title) {
          ends.push(
            geo.title.y +
              (geo.title.lines.length - 1) * geo.title.lineH +
              geo.title.lineH / 2,
          );
        }
        if (geo.subtitle) {
          ends.push(
            geo.subtitle.y +
              (geo.subtitle.lines.length - 1) * geo.subtitle.lineH +
              geo.subtitle.lineH / 2,
          );
        }
        for (const row of geo.info) ends.push(row.y + (row.size * geo.L.infoLineH) / 2);
        if (geo.pill) ends.push(geo.pill.y + geo.pill.h);
        if (geo.barcode) ends.push(geo.barcode.y + geo.barcode.h);
        const lastEnd = Math.max(...ends);
        const footTop = geo.height - geo.L.pad - geo.L.footSize;
        // Misma tolerancia de 1e-9 px que el test de geometría de
        // arriba: polvo de coma flotante de las alturas de línea.
        expect(footTop - lastEnd).toBeCloseTo(geo.L.footGap, 9);
      }
    }
  });

  it('la plantilla renderiza el título largo completo, sin «…» en ningún lado', () => {
    const d = buildEventShareCardData(ESLABON, { cityName: 'Guadalajara' });
    const html = renderToStaticMarkup(
      <EventShareCardTemplate data={d} format={SHARE_CARD_FORMATS.story} />,
    );
    // El título va en varias líneas (una por div): todas sus palabras
    // están en la plantilla y ninguna línea se cortó con «…».
    for (const word of 'ESLABÓN ARMADO AMOR NOCTURNO TOUR EN GUADALAJARA'.split(' ')) {
      expect(html).toContain(word);
    }
    expect(html).not.toContain('…');
  });
});

describe('tarjeta para compartir el evento: cableado', () => {
  const lib = read('../lib/eventShareCard.js');
  const template = read('../components/EventShareCardTemplate.jsx');
  const sheet = read('../components/EventShareCardSheet.jsx');
  const modal = read('../components/modals/EventDetailModal.jsx');

  it('el botón Compartir del detalle abre la hoja de la tarjeta', () => {
    expect(modal).toContain(
      "const EventShareCardSheet = lazy(() => import('../EventShareCardSheet.jsx'))",
    );
    expect(modal).toContain('const [showShareCard, setShowShareCard] = useState(false)');
    // Los botones de compartir abren la hoja en vez de compartir solo
    // el enlace (eso queda dentro): 2 en el modal (héroe y evento
    // pasado) + 1 en la barra fija de boletos (mejora 3, 11 nov 2026:
    // onShare junto a boletos, en EventTicketBar, una sola vez como
    // hija directa del wrapper del modal).
    expect(modal.match(/setShowShareCard\(true\)/g)?.length).toBe(3);
    expect(modal).toContain('<EventShareCardSheet event={evLocalized}');
    expect(modal).toContain('onShareLink={() => shareEvent()}');
    // shareEvent sigue existiendo para el «Compartir enlace».
    expect(modal).toContain('navigator.share');
    expect(modal).toContain('eventUrl(ev, window.location.origin)');
  });

  it('la hoja es la misma centrada de los negocios, con Historia y Post y selector de tema', () => {
    // El Post volvió el 11 nov 2026: la hoja lista los dos formatos
    // (Historia/Post) y los dos temas (Oscura/Clara) como botones.
    expect(sheet).toContain('EVENT_SHARE_CARD_FORMAT_LIST');
    expect(sheet).toContain('Post IG');
    expect(sheet).toContain('formatId');
    expect(sheet).toContain('EVENT_SHARE_CARD_THEME_LIST.map');
    expect(sheet).toContain('Oscura');
    expect(sheet).toContain('Clara');
    expect(sheet).toContain('Fondo oscuro');
    expect(sheet).toContain('Fondo claro');
    expect(sheet).toContain('EVENT_SHARE_CARD_FORMAT_LIST.find((f) => f.id === formatId)');
    expect(sheet).toContain('Compartir imagen');
    expect(sheet).toContain('Compartir enlace');
    expect(sheet).toContain("e?.name === 'AbortError'");
    expect(sheet).toContain('buildEventShareCardData(event, { cityName })');
    expect(sheet).toContain('exportEventShareCardPng(dataToExport, format)');
    expect(sheet).toContain('eventShareCardFileName(event, format)');
    expect(sheet).toContain('La foto no se pudo cargar');
    // Tarjeta centrada con las 4 esquinas redondeadas (PR #147).
    expect(sheet).toContain("alignItems: 'center'");
    expect(sheet).toContain('borderRadius: 24,');
    expect(sheet).toContain("width: 'calc(100vw - 32px)'");
    expect(sheet).toContain('maxWidth: 460');
    expect(sheet).toContain("maxHeight: '92dvh'");
    expect(sheet).toContain('className="scale-in-center"');
    expect(sheet).not.toContain("position: 'sticky'");
    expect(sheet).not.toContain('Publicar en Instagram');
    const m = sheet.match(/const PREVIEW_W = (\d+)/);
    expect(m).not.toBeNull();
    expect(Number(m[1])).toBeLessThanOrEqual(220);
  });

  it('la plantilla lleva el logo oficial, la foto con CORS y el pie', () => {
    expect(template).toContain('src="/logo-brand.png"');
    // En Oscura el logo va en blanco (brightness(0) invert(1)); en
    // Clara va en negro (brightness(0)) — ver el bloque de Clara abajo.
    expect(template).toContain('brightness(0) invert(1)');
    // El pie nuevo «Descubre más eventos en www.citymap.mx» (el JSX lo
    // parte en dos tramos: el texto y la URL en negrita).
    expect(template).toContain('Descubre más eventos en');
    expect(template).toContain('>www.citymap.mx</span>');
    expect(template).not.toContain('Descúbrelo en');
    expect(template).toContain('crossOrigin="anonymous"');
    expect(template).toContain('{photoSrc ? (');
    expect(template).toContain('computeEventShareCardLayout');
    expect(template).toContain('minHeight: L.photoMinH');
    expect(template).toContain('flex: 1');
    // Sin círculo de logo del negocio: eso es solo para negocios.
    expect(template).not.toContain('bizLogo');
    expect(template).not.toContain('logo circular');
  });

  it('la imagen se genera dibujando en canvas, nunca en blanco', () => {
    // PR #143: html-to-image sobre el nodo fuera de pantalla devolvía
    // un PNG 100% transparente. La tarjeta de eventos nace ya en
    // canvas 2D, con el mismo guarda anti-blanco de los negocios.
    expect(lib).toContain("getContext('2d')");
    expect(lib).toContain('canvas.toBlob');
    expect(lib).toContain('assertCanvasNotBlank');
    expect(lib).not.toContain("import('html-to-image')");
    expect(lib).toContain('loadShareCardPhoto');
    expect(lib).toContain('loadShareCardLogoWhite');
    expect(lib).toContain('drawCoverImage');
    expect(sheet).not.toContain('left: -10000');
    // La vista previa y el PNG comparten UNA geometría.
    expect(lib).toContain('EVENT_SHARE_CARD_LAYOUT');
    expect(lib).toContain('computeEventShareCardLayout');
    expect(template).toContain('computeEventShareCardLayout');
  });
});

describe('tarjeta para compartir el evento: pie nuevo (10 nov 2026)', () => {
  const lib = read('../lib/eventShareCard.js');
  const template = read('../components/EventShareCardTemplate.jsx');
  const bizLib = read('../lib/shareCard.js');
  const bizTemplate = read('../components/ShareCardTemplate.jsx');

  it('el pie de eventos es «Descubre más eventos en www.citymap.mx» en canvas y vista previa', () => {
    expect(lib).toContain("const run1 = 'Descubre más eventos en ';");
    expect(lib).toContain("const run2 = 'www.citymap.mx';");
    // El pie viejo ya no se dibuja (solo queda mencionado en el
    // comentario que explica el cambio).
    expect(lib).not.toContain("const run1 = 'Descúbrelo en ';");
    expect(lib).not.toContain("run2 = 'CityMap'");
    expect(template).toContain('Descubre más eventos en');
    expect(template).toContain('>www.citymap.mx</span>');
    expect(template).not.toContain('Descúbrelo en');
    // La plantilla pinta el pie nuevo en los dos temas (ver Clara abajo).
    for (const theme of [undefined, 'clara']) {
      const d = buildEventShareCardData(CONCIERTO, { cityName: 'Guadalajara' });
      const html = renderToStaticMarkup(
        <EventShareCardTemplate
          data={theme ? { ...d, theme } : d}
          format={SHARE_CARD_FORMATS.story}
        />,
      );
      expect(html).toContain('Descubre más eventos en');
      expect(html).toContain('www.citymap.mx');
    }
  });

  it('el pie de negocios NO cambia: sigue «Descúbrelo en www.citymap.mx»', () => {
    expect(bizLib).toContain("const run1 = 'Descúbrelo en ';");
    expect(bizLib).toContain("const run2 = 'www.citymap.mx';");
    expect(bizLib).not.toContain('Descubre más eventos en');
    expect(bizTemplate).toContain('Descúbrelo en');
    expect(bizTemplate).not.toContain('Descubre más eventos en');
  });
});

describe('tarjeta para compartir el evento: Post de vuelta, sin descripción (11 nov 2026)', () => {
  it('la geometría de eventos tiene entrada de Post con las medidas de antes', () => {
    expect(EVENT_SHARE_CARD_LAYOUT.story).toBeDefined();
    expect(EVENT_SHARE_CARD_LAYOUT.post).toBeDefined();
    expect(Object.keys(EVENT_SHARE_CARD_LAYOUT)).toEqual(['story', 'post']);
    expect(EVENT_SHARE_CARD_LAYOUT.post.logoH).toBe(44);
    expect(EVENT_SHARE_CARD_LAYOUT.post.catSize).toBe(28);
    expect(EVENT_SHARE_CARD_LAYOUT.post.pillSize).toBe(30);
    expect(EVENT_SHARE_CARD_LAYOUT.post.photoMinH).toBe(300);
  });

  it('en Post no va la descripción: sin subtítulo en la geometría ni en la plantilla; en Historia sigue', () => {
    const d = buildEventShareCardData(EXPOSICION, { cityName: 'Puerto Vallarta' });
    expect(d.subtitle).toContain('Exposición de tatuajes');
    const post = computeEventShareCardLayout(d, SHARE_CARD_FORMATS.post);
    expect(post.subtitle).toBeNull();
    const postHtml = renderToStaticMarkup(
      <EventShareCardTemplate data={d} format={SHARE_CARD_FORMATS.post} />,
    );
    expect(postHtml).not.toContain('Exposición de tatuajes');
    const story = computeEventShareCardLayout(d, SHARE_CARD_FORMATS.story);
    expect(story.subtitle.lines.length).toBeGreaterThan(0);
    const storyHtml = renderToStaticMarkup(
      <EventShareCardTemplate data={d} format={SHARE_CARD_FORMATS.story} />,
    );
    expect(storyHtml).toContain('Exposición de tatuajes');
  });

  it('la hoja ofrece Post: Historia y Post con sus medidas, y el archivo de Post lleva -post', () => {
    const sheet = read('../components/EventShareCardSheet.jsx');
    expect(sheet).toContain('EVENT_SHARE_CARD_FORMAT_LIST');
    expect(sheet).toContain('Post IG');
    expect(sheet).toContain('{f.width} × {f.height}');
    expect(sheet).toContain('formatId');
    expect(sheet).toContain('EVENT_SHARE_CARD_FORMAT_LIST.find((f) => f.id === formatId)');
    expect(eventShareCardFileName(CONCIERTO)).toBe(
      'citymap-evento-carlos-rivera-fiestas-de-octubre.png',
    );
    expect(eventShareCardFileName(CONCIERTO, SHARE_CARD_FORMATS.post)).toBe(
      'citymap-evento-carlos-rivera-fiestas-de-octubre-post.png',
    );
  });
});

describe('tarjeta para compartir el evento: versión Clara', () => {
  it('el tema se resuelve: clara solo si se pide, oscura por defecto', () => {
    expect(resolveEventShareCardTheme('clara').id).toBe('clara');
    expect(resolveEventShareCardTheme('oscura').id).toBe('oscura');
    expect(resolveEventShareCardTheme(undefined).id).toBe('oscura');
    expect(resolveEventShareCardTheme('').id).toBe('oscura');
    expect(resolveEventShareCardTheme('otro').id).toBe('oscura');
    expect(EVENT_SHARE_CARD_THEME_LIST.map((t) => t.id)).toEqual([
      'oscura',
      'clara',
    ]);
    expect(EVENT_SHARE_CARD_THEMES.clara.label).toBe('Clara');
    expect(EVENT_SHARE_CARD_THEMES.oscura.label).toBe('Oscura');
  });

  it('la geometría lleva el tema y su paleta: Clara con fondo blanco y texto oscuro', () => {
    const d = buildEventShareCardData(CONCIERTO, { cityName: 'Guadalajara' });
    const dark = computeEventShareCardLayout(d, SHARE_CARD_FORMATS.story);
    expect(dark.theme.id).toBe('oscura');
    expect(dark.palette.bg).toEqual(['#1B1B1B', '#0B0B0B']);
    expect(dark.palette.text).toBe('#FFFFFF');
    expect(dark.palette.logoWhite).toBe(true);
    const light = computeEventShareCardLayout(
      { ...d, theme: 'clara' },
      SHARE_CARD_FORMATS.story,
    );
    expect(light.theme.id).toBe('clara');
    expect(light.palette).toBe(EVENT_SHARE_CARD_THEME_COLORS.clara);
    expect(light.palette.bg).toEqual(['#FFFFFF', '#FAF9F6']);
    expect(light.palette.text).toBe('#111111');
    expect(light.palette.logoWhite).toBe(false);
    expect(light.palette.barcodeBg).toBe('#111111');
    expect(light.palette.barcodeBar).toBe('#FFFFFF');
    // La geometría (foto, título, pie) es la misma en los dos temas:
    // solo cambian los colores.
    expect(light.photo.h).toBe(dark.photo.h);
    expect(light.title.lines).toEqual(dark.title.lines);
    expect(light.footer).toEqual(dark.footer);
  });

  it('la plantilla Clara: fondo blanco, texto oscuro, logo en negro y pie nuevo', () => {
    const d = buildEventShareCardData(CONCIERTO, { cityName: 'Guadalajara' });
    const html = renderToStaticMarkup(
      <EventShareCardTemplate
        data={{ ...d, theme: 'clara' }}
        format={SHARE_CARD_FORMATS.story}
      />,
    );
    expect(html).toContain('linear-gradient(180deg, #FFFFFF 0%, #FAF9F6 100%)');
    expect(html).toContain('color:#111111');
    // El logo va en negro (brightness(0) sin invert) sobre fondo claro.
    expect(html).toContain('filter:brightness(0)');
    expect(html).not.toContain('brightness(0) invert(1)');
    expect(html).toContain('Descubre más eventos en');
    expect(html).toContain('www.citymap.mx');
    // Título, precio y fecha siguen ahí.
    expect(html).toContain('CARLOS RIVERA -');
    expect(html).toContain('Boletos desde $1200');
    expect(html).toContain('Lun, 2 Nov');
  });

  it('la plantilla Oscura sigue igual: fondo oscuro y logo en blanco', () => {
    const d = buildEventShareCardData(CONCIERTO, { cityName: 'Guadalajara' });
    const html = renderToStaticMarkup(
      <EventShareCardTemplate data={d} format={SHARE_CARD_FORMATS.story} />,
    );
    expect(html).toContain('linear-gradient(180deg, #1B1B1B 0%, #0B0B0B 100%)');
    expect(html).toContain('filter:brightness(0) invert(1)');
    expect(html).toContain('Descubre más eventos en');
  });

  it('boleto en Clara: la tira del código de barras es negra con barras blancas', () => {
    const d = buildEventShareCardData(FERIA, { cityName: 'Guadalajara' });
    const html = renderToStaticMarkup(
      <EventShareCardTemplate
        data={{ ...d, theme: 'clara' }}
        format={SHARE_CARD_FORMATS.story}
      />,
    );
    expect(html).toContain('background:#111111');
    expect(html).toContain('background:#FFFFFF');
  });

  it('la hoja ofrece Clara como opción junto a Oscura', () => {
    const sheet = read('../components/EventShareCardSheet.jsx');
    expect(sheet).toContain('EVENT_SHARE_CARD_THEME_LIST.map');
    expect(sheet).toContain("useState('oscura')");
    expect(sheet).toContain('{t.label}');
    expect(sheet).toContain('Fondo oscuro');
    expect(sheet).toContain('Fondo claro');
    expect(sheet).toContain('theme: themeId');
  });
});

describe('tarjeta para compartir el evento: Post sin categoría (11 nov 2026)', () => {
  // En Post ya no va la etiqueta de categoría (para ahorrar espacio):
  // el chip no se produce en la geometría ni en la plantilla, y la
  // foto crece y se come ese hueco (catGap + catSize). En Historia
  // se queda como está.
  it('en Post el chip es null en los 5 estilos; en Historia sigue', () => {
    const cases = [
      CONCIERTO, // festival
      EXPOSICION, // editorial
      FERIA, // boleto
      { ...CONCIERTO, event_category: 'Gastronomía', price: '' }, // experiencias
      { ...CONCIERTO, event_category: 'Conferencia ' }, // agenda
    ];
    for (const ev of cases) {
      const d = buildEventShareCardData(ev, { cityName: 'Guadalajara' });
      const post = computeEventShareCardLayout(d, SHARE_CARD_FORMATS.post);
      expect(post.chip).toBeNull();
      const story = computeEventShareCardLayout(d, SHARE_CARD_FORMATS.story);
      expect(story.chip).not.toBeNull();
      expect(story.chip.text).toBe(d.category.toUpperCase());
    }
  });

  it('la plantilla Post no pinta la categoría; la de Historia sí', () => {
    for (const ev of [CONCIERTO, EXPOSICION, FERIA]) {
      const d = buildEventShareCardData(ev, { cityName: 'Guadalajara' });
      const postHtml = renderToStaticMarkup(
        <EventShareCardTemplate data={d} format={SHARE_CARD_FORMATS.post} />,
      );
      expect(postHtml).not.toContain(d.category.toUpperCase());
      const storyHtml = renderToStaticMarkup(
        <EventShareCardTemplate data={d} format={SHARE_CARD_FORMATS.story} />,
      );
      expect(storyHtml).toContain(d.category.toUpperCase());
    }
  });

  it('en Post la foto crece el hueco de la categoría (catGap + catSize) sin desbordar', () => {
    // La geometría sin chip reserva 0 para la categoría: la foto es
    // catGap + catSize más alta que si el chip existiera. Se comprueba
    // contra la altura que tendría con el chip (foto + hueco).
    const d = buildEventShareCardData(EXPOSICION, { cityName: 'Puerto Vallarta' });
    const post = computeEventShareCardLayout(d, SHARE_CARD_FORMATS.post);
    const L = EVENT_SHARE_CARD_LAYOUT.post;
    expect(post.chip).toBeNull();
    expect(post.photo.h).toBeGreaterThan(L.photoMinH);
    // Sin chip ni subtítulo en Post, todo el espacio libre es foto:
    // la foto mide la tarjeta menos logo, título, información y pie.
    const titleBlockH =
      post.title.lines.length * post.title.size * L.titleLineH;
    const infoBlockH = post.info.length * L.infoSize * L.infoLineH;
    const expected =
      post.height -
      L.pad * 2 -
      (L.logoH + L.logoGap) -
      (L.titleGap + titleBlockH) -
      (L.infoGap + infoBlockH) -
      (L.footGap + L.footSize);
    expect(post.photo.h).toBeCloseTo(expected, 9);
    expect(post.photo.h - L.photoMinH).toBeGreaterThanOrEqual(L.catGap + L.catSize);
  });
});

describe('tarjeta para compartir el evento: foto reposicionable (11 nov 2026)', () => {
  it('el offset se fija a [-1, 1] y por defecto es 0 (centrada)', () => {
    expect(clampPhotoOffset(0)).toBe(0);
    expect(clampPhotoOffset(0.5)).toBe(0.5);
    expect(clampPhotoOffset(-0.5)).toBe(-0.5);
    expect(clampPhotoOffset(2)).toBe(1);
    expect(clampPhotoOffset(-2)).toBe(-1);
    expect(clampPhotoOffset(NaN)).toBe(0);
    expect(clampPhotoOffset(undefined)).toBe(0);
    expect(clampPhotoOffset('0.3')).toBe(0.3);
    expect(normalizePhotoOffset(undefined)).toEqual({ x: 0, y: 0 });
    expect(normalizePhotoOffset({ x: 2 })).toEqual({ x: 1, y: 0 });
    expect(normalizePhotoOffset({ x: -0.5, y: 0.25 })).toEqual({ x: -0.5, y: 0.25 });
  });

  it('object-position es la misma posición que la ventana de origen del canvas', () => {
    // 50% = centrada; 100% = el borde derecho/inferior pegado al
    // marco; 0% = el izquierdo/superior. Es la misma matemática que
    // drawCoverImage (ver el test del rectángulo de origen abajo).
    expect(coverObjectPosition({ x: 0, y: 0 })).toBe('50% 50%');
    expect(coverObjectPosition({ x: 1, y: 1 })).toBe('100% 100%');
    expect(coverObjectPosition({ x: -1, y: -1 })).toBe('0% 0%');
    expect(coverObjectPosition({ x: 0.5, y: -0.5 })).toBe('75% 25%');
    expect(coverObjectPosition(undefined)).toBe('50% 50%');
  });

  it('el layout lleva el offset (normalizado) y por defecto es centrado', () => {
    const d = buildEventShareCardData(CONCIERTO, { cityName: 'Guadalajara' });
    const centered = computeEventShareCardLayout(d, SHARE_CARD_FORMATS.post);
    expect(centered.photoOffset).toEqual({ x: 0, y: 0 });
    const moved = computeEventShareCardLayout(
      { ...d, photoOffset: { x: 0.5, y: -1 } },
      SHARE_CARD_FORMATS.post,
    );
    expect(moved.photoOffset).toEqual({ x: 0.5, y: -1 });
    const clamped = computeEventShareCardLayout(
      { ...d, photoOffset: { x: 2, y: -3 } },
      SHARE_CARD_FORMATS.story,
    );
    expect(clamped.photoOffset).toEqual({ x: 1, y: -1 });
    // El offset no cambia la geometría: solo mueve la foto dentro del
    // marco (misma foto, mismo título, mismo pie).
    expect(moved.photo).toEqual(centered.photo);
    expect(moved.title).toEqual(centered.title);
    expect(moved.footer).toEqual(centered.footer);
  });

  it('la plantilla aplica el offset con object-position', () => {
    const d = buildEventShareCardData(CONCIERTO, { cityName: 'Guadalajara' });
    const centeredHtml = renderToStaticMarkup(
      <EventShareCardTemplate data={d} format={SHARE_CARD_FORMATS.post} />,
    );
    expect(centeredHtml).toContain('object-position:50% 50%');
    const movedHtml = renderToStaticMarkup(
      <EventShareCardTemplate
        data={{ ...d, photoOffset: { x: 1, y: 0 } }}
        format={SHARE_CARD_FORMATS.post}
      />,
    );
    expect(movedHtml).toContain('object-position:100% 50%');
  });

  it('drawCoverImage mueve la ventana de origen sin salirse de la foto', () => {
    const calls = [];
    const ctx = { drawImage: (...args) => calls.push(args) };
    // Foto apaisada 1000×500 en marco 400×400: escala 0.8, ventana
    // 500×500; el sobrante horizontal es 500 (sx de 0 a 500) y el
    // vertical es 0 (sy siempre 0).
    const wide = { naturalWidth: 1000, naturalHeight: 500 };
    drawCoverImage(ctx, wide, 0, 0, 400, 400);
    expect(calls[0]).toEqual([wide, 250, 0, 500, 500, 0, 0, 400, 400]);
    drawCoverImage(ctx, wide, 0, 0, 400, 400, { x: 1, y: 0 });
    expect(calls[1]).toEqual([wide, 500, 0, 500, 500, 0, 0, 400, 400]);
    drawCoverImage(ctx, wide, 0, 0, 400, 400, { x: -1, y: 1 });
    expect(calls[2]).toEqual([wide, 0, 0, 500, 500, 0, 0, 400, 400]);
    // Fuera de rango se fija al borde, no se sale de la foto.
    drawCoverImage(ctx, wide, 0, 0, 400, 400, { x: 2, y: -2 });
    expect(calls[3]).toEqual([wide, 500, 0, 500, 500, 0, 0, 400, 400]);
    // Foto vertical 500×1000 en el mismo marco: el sobrante es
    // vertical (sy de 0 a 500) y el horizontal es 0.
    const tall = { naturalWidth: 500, naturalHeight: 1000 };
    drawCoverImage(ctx, tall, 0, 0, 400, 400, { x: 1, y: -1 });
    expect(calls[4]).toEqual([tall, 0, 0, 500, 500, 0, 0, 400, 400]);
    drawCoverImage(ctx, tall, 0, 0, 400, 400, { x: -1, y: 1 });
    expect(calls[5]).toEqual([tall, 0, 500, 500, 500, 0, 0, 400, 400]);
    // Sin sobrante en ningún eje, el offset no mueve nada.
    const exact = { naturalWidth: 400, naturalHeight: 400 };
    drawCoverImage(ctx, exact, 0, 0, 400, 400, { x: 1, y: 1 });
    expect(calls[6]).toEqual([exact, 0, 0, 400, 400, 0, 0, 400, 400]);
  });

  it('la hoja cablea el arrastre: puntero, ayuda, centrar y el offset en la exportación', () => {
    const sheet = read('../components/EventShareCardSheet.jsx');
    const template = read('../components/EventShareCardTemplate.jsx');
    expect(sheet).toContain('photoOffset');
    expect(sheet).toContain('setPhotoOffset');
    expect(sheet).toContain('onPointerDown');
    expect(sheet).toContain('onPointerMove');
    expect(sheet).toContain('onPointerUp');
    expect(sheet).toContain("touchAction: canDragPhoto ? 'none' : 'auto'");
    expect(sheet).toContain('setPointerCapture');
    expect(sheet).toContain('Arrastra la foto para ajustar su posición');
    expect(sheet).toContain('Centrar foto');
    expect(sheet).toContain('setPhotoOffset({ x: 0, y: 0 })');
    expect(sheet).toContain('clampPhotoOffset');
    expect(sheet).toContain('computeEventShareCardLayout');
    expect(sheet).toContain('theme: themeId, photoOffset');
    expect(template).toContain('objectPosition');
    expect(template).toContain('coverObjectPosition');
  });
});
