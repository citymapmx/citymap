import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import EventShareCardTemplate from '../components/EventShareCardTemplate.jsx';
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
  SHARE_CARD_FORMATS,
} from '../lib/eventShareCard.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// Tarjeta para compartir el EVENTO (PR #152): lo mismo que la tarjeta
// de los negocios (PRs #142–#147) — botón Compartir en el detalle del
// evento, hoja centrada Historia/Post, PNG dibujado en canvas — pero con
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

  it('gratis → «Entrada gratuita»; sin precio publicado → «Precio mínimo no publicado»', () => {
    const free = buildEventShareCardData(
      { ...CONCIERTO, price: '0', price_type: 'gratis' },
      { cityName: 'Guadalajara' },
    );
    expect(free.priceText).toBe('Entrada gratuita');
    expect(free.priceKind).toBe('free');
    const unknown = buildEventShareCardData(EXPOSICION, {
      cityName: 'Puerto Vallarta',
    });
    expect(unknown.priceText).toBe('Precio mínimo no publicado');
    expect(unknown.priceKind).toBe('unknown');
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
        expect(footTop - lastEnd).toBe(geo.L.footGap);
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
    expect(edit.pill?.text).toBe('Precio mínimo no publicado');
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
    expect(html).toContain('Descúbrelo en');
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
      <EventShareCardTemplate data={d} format={SHARE_CARD_FORMATS.post} />,
    );
    // El título va en dos líneas (una por div).
    expect(html).toContain('Expo Tattoo Puerto Vallarta');
    expect(html).toContain('>2026</div>');
    expect(html).toContain('>E</span>');
    expect(html).not.toContain('<img src=""');
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
    // Los dos botones de compartir (héroe y evento pasado) abren la
    // hoja en vez de compartir solo el enlace (eso queda dentro).
    expect(modal.match(/setShowShareCard\(true\)/g)?.length).toBe(2);
    expect(modal).toContain('<EventShareCardSheet event={evLocalized}');
    expect(modal).toContain('onShareLink={() => shareEvent()}');
    // shareEvent sigue existiendo para el «Compartir enlace».
    expect(modal).toContain('navigator.share');
    expect(modal).toContain('eventUrl(ev, window.location.origin)');
  });

  it('la hoja es la misma centrada de los negocios, con los dos formatos', () => {
    // Los dos formatos (Historia IG / Post IG) vienen de la lista
    // compartida con la tarjeta de negocios; la hoja los pinta como
    // botones con su etiqueta y sus medidas.
    expect(sheet).toContain('SHARE_CARD_FORMAT_LIST.map');
    expect(sheet).toContain('{f.label}');
    expect(sheet).toContain('{f.width} × {f.height}');
    expect(sheet).toContain('Compartir imagen');
    expect(sheet).toContain('Compartir enlace');
    expect(sheet).toContain("e?.name === 'AbortError'");
    expect(sheet).toContain('buildEventShareCardData(event, { cityName })');
    expect(sheet).toContain('exportEventShareCardPng(dataToExport, format)');
    expect(sheet).toContain('eventShareCardFileName(event)');
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
    expect(template).toContain('brightness(0) invert(1)');
    // El pie «Descúbrelo en CityMap» (el JSX lo parte en dos tramos).
    expect(template).toContain('Descúbrelo en');
    expect(template).toContain('>CityMap</span>');
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
