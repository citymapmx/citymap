// Tarjeta para compartir el EVENTO (PR #152): lo mismo que la tarjeta
// de los negocios (PRs #142–#147) pero con los datos del evento y uno de
// los 5 estilos de la imagen de Jonathan, según el tipo de evento:
// concierto → festival, exposición/cultural → editorial, feria → boleto
// (con código de barras decorativo), cata/taller/clase de cocina →
// experiencias, mercado/conferencia/taller local → agenda. Cualquier
// otro tipo → editorial (estilo por defecto).
//
// Reutiliza TODA la base de la tarjeta de negocios (lib/shareCard.js):
// los formatos Historia 1080×1920 y Post 1080×1080 (el Post se quitó
// el 10 nov 2026 y volvió el 11 nov 2026, SIN descripción para ahorrar
// espacio — ver computeEventShareCardLayout — y desde el 11 nov 2026
// TAMPOCO lleva la categoría en Post), el logotipo oficial en
// blanco, la exportación a canvas 2D (nada de html-to-image: el PNG
// salía transparente, PR #143), la foto flexible que llena la tarjeta,
// el guarda anti-blanco y los helpers de medición/dibujo. La foto se
// puede reposicionar arrastrándola en la hoja (data.photoOffset,
// { x, y } en [-1, 1], solo en la sesión): la vista previa y el canvas
// usan la misma matemática, así lo que se ve es lo que se descarga.
// NO lleva el círculo de logo del negocio: eso es solo para negocios
// con plan de pago (PR #144); en eventos no hay círculo.
//
// La vista previa (EventShareCardTemplate.jsx) y el PNG comparten UNA
// sola geometría: EVENT_SHARE_CARD_LAYOUT + computeEventShareCardLayout,
// igual que la de negocios. Si el evento no tiene foto (hay 20 así en
// la base), la tarjeta usa el bloque degradado con la inicial, nunca
// una tarjeta en blanco ni un hueco roto.
//
// Precio: mínimo REAL en MXN («Boletos desde $X») o «Entrada gratuita»;
// sin precio publicado NO se menciona nada (PR #153: ni píldora ni
// línea de precio — la tarjeta simplemente no lleva precio). Con
// getEventPrice/getEventPriceAmount (la misma fuente que el detalle).
// Horas en formato 12 h y fechas en español, como el detalle
// (EventInformation.jsx). El enlace que se comparte es la URL del
// detalle: /evento/:ciudad/:slug-corto.
import { createSlug } from './utils.js';
import { getEventPrice, getEventPriceAmount } from './eventDetails.js';
import { eventUrl, eventShortSlug } from './eventUrls.js';
import {
  SHARE_CARD_FORMATS,
  SHARE_CARD_FONT_STACK,
  measureShareCardText,
  wrapShareCardName,
  loadShareCardPhoto,
  loadShareCardLogoWhite,
  loadShareCardLogoDark,
  drawCoverImage,
  normalizePhotoOffset,
  roundRectPath,
  spacedWidth,
  drawSpacedText,
  assertCanvasNotBlank,
} from './shareCard.js';

// El formato es Historia y Post (el Post volvió el 11 nov 2026, sin
// descripción). La hoja ofrece los dos; el tema (Oscura/Clara) es
// independiente del formato.
export { SHARE_CARD_FORMATS } from './shareCard.js';
export const EVENT_SHARE_CARD_FORMAT_LIST = [
  SHARE_CARD_FORMATS.story,
  SHARE_CARD_FORMATS.post,
];

export const EVENT_SHARE_CARD_STYLES = {
  festival: { id: 'festival', label: 'Festival' },
  editorial: { id: 'editorial', label: 'Editorial' },
  boleto: { id: 'boleto', label: 'Boleto' },
  experiencias: { id: 'experiencias', label: 'Experiencias' },
  agenda: { id: 'agenda', label: 'Agenda' },
};

// Tema de la tarjeta (10 nov 2026, Jonathan): Oscura (la de siempre,
// fondo oscuro) y Clara (fondo blanco, texto oscuro, como la Clara de
// las tarjetas de negocios). El tema viaja en `data.theme` ('oscura'
// por defecto) y lo elige el usuario en la hoja de compartir; el estilo
// por categoría (festival/editorial/boleto/…) sigue siendo automático.
// La plantilla y el canvas leen los mismos colores de la paleta, así la
// vista previa y el PNG coinciden (igual que SHARE_CARD_STYLE_COLORS
// en las tarjetas de negocios).
export const EVENT_SHARE_CARD_THEMES = {
  oscura: { id: 'oscura', label: 'Oscura' },
  clara: { id: 'clara', label: 'Clara' },
};
export const EVENT_SHARE_CARD_THEME_LIST = [
  EVENT_SHARE_CARD_THEMES.oscura,
  EVENT_SHARE_CARD_THEMES.clara,
];
export const EVENT_SHARE_CARD_THEME_COLORS = {
  oscura: {
    bg: ['#1B1B1B', '#0B0B0B'],
    text: '#FFFFFF',
    sub: 'rgba(255,255,255,0.75)',
    info: 'rgba(255,255,255,0.85)',
    muted: '#A3A3A3',
    pillBg: 'rgba(255,255,255,0.12)',
    pillText: '#FFFFFF',
    logoWhite: true,
    photoBg: '#262626',
    initial: 'rgba(255,255,255,0.35)',
    barcodeBg: '#FFFFFF',
    barcodeBar: '#111111',
    footMuted: '#A3A3A3',
    footBold: '#FFFFFF',
  },
  clara: {
    bg: ['#FFFFFF', '#FAF9F6'],
    text: '#111111',
    sub: '#6B7280',
    info: 'rgba(17,17,17,0.85)',
    muted: '#6B7280',
    pillBg: 'rgba(17,17,17,0.08)',
    pillText: '#111111',
    logoWhite: false,
    photoBg: '#F0EFEA',
    initial: 'rgba(0,0,0,0.30)',
    barcodeBg: '#111111',
    barcodeBar: '#FFFFFF',
    footMuted: '#6B7280',
    footBold: '#111111',
  },
};
export function resolveEventShareCardTheme(value) {
  const id = String(value || '').trim().toLowerCase();
  return EVENT_SHARE_CARD_THEMES[id] || EVENT_SHARE_CARD_THEMES.oscura;
}

// Geometría de la tarjeta de evento, por formato. Reutiliza las medidas
// La geometría de la tarjeta de evento: su propia base (pad, logo,
// foto mínima, radio, categoría, píldoras y pie) y las medidas propias
// del evento: título (más grande y en mayúsculas en festival),
// subtítulo, filas de información (fecha/hora y lugar) y la tira del
// código de barras.
// La base era un spread de SHARE_CARD_LAYOUT (la de negocios), pero el
// PR #155 cambió las medidas de negocios (logo más grande, foto más
// corta, sin categoría) y ese cambio se colaba en la tarjeta de
// eventos: ahora la base está fijada aquí con los valores de antes, así
// la tarjeta de eventos no cambia ni un píxel por los ajustes de
// negocios.
export const EVENT_SHARE_CARD_LAYOUT = {
  story: {
    pad: 64,
    logoH: 56,
    logoGap: 32,
    photoRadius: 40,
    catSize: 32,
    catGap: 36,
    pillSize: 34,
    pillPadX: 26,
    pillPadY: 12,
    pillGap: 16,
    footSize: 30,
    footGap: 44,
    // La tarjeta de evento lleva más bloques que la de negocios
    // (subtítulo + 2 filas de información), así que el mínimo de la
    // foto es más bajo: con el heredado (1080/480) el peor caso (título
    // a 2 líneas + subtítulo a 2 líneas + 2 filas + píldora) desbordaba
    // el pie hasta 95 px. Con 960/300 el peor caso deja la foto en
    // 988/318 y la geometría nunca desborda la tarjeta — el mínimo se
    // bajó de 1000/360 en el PR #153 porque el título ahora puede ir a
    // 3 líneas (ver fitEventShareCardTitle): la tercera línea a tamaño
    // completo come ~85 px en Historia y ~68 px en Post.
    photoMinH: 960,
    titleSize: 76,
    titleSizeFestival: 96,
    titleMinSize: 48,
    titleGap: 18,
    titleLineH: 1.12,
    titleMaxLines: 3,
    subSize: 36,
    subGap: 16,
    subLineH: 1.35,
    subMaxLines: 2,
    infoSize: 34,
    infoGap: 18,
    infoLineH: 1.4,
    barcodeH: 120,
    barcodeGap: 30,
    barcodePadX: 28,
    barcodePadY: 18,
  },
  // Post 1080×1080 (11 nov 2026, Jonathan): vuelve tras quitarse en el
  // #183, con las mismas medidas de antes. La descripción NO va en Post
  // (para ahorrar espacio): computeEventShareCardLayout no produce
  // subtítulo en este formato, así que subSize/subGap no se usan aquí;
  // la foto crece y se come ese espacio. La categoría TAMPOCO va en
  // Post (11 nov 2026, Jonathan: para ahorrar espacio): el chip no se
  // produce en este formato y la foto crece también ese hueco
  // (catGap + catSize).
  post: {
    pad: 48,
    logoH: 44,
    logoGap: 24,
    photoRadius: 32,
    catSize: 28,
    catGap: 28,
    pillSize: 30,
    pillPadX: 24,
    pillPadY: 11,
    pillGap: 14,
    footSize: 26,
    footGap: 36,
    photoMinH: 300,
    titleSize: 60,
    titleSizeFestival: 76,
    titleMinSize: 40,
    titleGap: 14,
    titleLineH: 1.12,
    titleMaxLines: 3,
    subSize: 32,
    subGap: 14,
    subLineH: 1.35,
    subMaxLines: 2,
    infoSize: 30,
    infoGap: 14,
    infoLineH: 1.4,
    barcodeH: 96,
    barcodeGap: 24,
    barcodePadX: 24,
    barcodePadY: 16,
  },
};

// ─── Estilo por tipo de evento ───

// La categoría en la base viene con mayúsculas, espacios de más y
// tildes («Concierto », «Conferencia », «Exposición»): se normaliza
// antes de comparar para que el estilo no dependa de cómo se escribió.
function normalizeCategory(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function eventShareCardStyle(event) {
  const cat = normalizeCategory(event?.event_category || event?.category);
  if (cat.startsWith('concierto')) return 'festival';
  if (cat.includes('feria')) return 'boleto';
  if (cat.includes('festival')) return 'festival';
  if (
    cat.includes('cata') ||
    cat.includes('clase de cocina') ||
    cat.includes('cocina') ||
    cat.includes('gastronom') ||
    cat.startsWith('experiencia') ||
    cat.includes('taller de cocina')
  ) {
    return 'experiencias';
  }
  if (
    cat.includes('mercado') ||
    cat.startsWith('conferencia') ||
    cat.startsWith('congreso') ||
    cat.includes('convencion') ||
    cat.includes('taller')
  ) {
    return 'agenda';
  }
  return 'editorial';
}

// ─── Fechas y horas (igual que el detalle: español, 12 h) ───

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDateOnly(value) {
  if (!DATE_ONLY_RE.test(value || '')) return null;
  const d = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value ? d : null;
}

function capFirst(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// «Lun, 2 Nov» (weekday corto + día + mes corto). Se compone por
// partes: el locale es-MX da «lun 2 de nov» (con «de»), así que el
// weekday y el mes se piden por separado y se capitalizan.
export function eventShareCardDateShort(value) {
  const d = parseDateOnly(value);
  if (!d) return '';
  const weekday = capFirst(
    new Intl.DateTimeFormat('es-MX', { timeZone: 'UTC', weekday: 'short' }).format(d),
  );
  const month = capFirst(
    new Intl.DateTimeFormat('es-MX', { timeZone: 'UTC', month: 'short' }).format(d),
  );
  return `${weekday}, ${d.getUTCDate()} ${month}`;
}

// «10 Dic» (día + mes corto, para el rango de la feria).
export function eventShareCardDayMonth(value) {
  const d = parseDateOnly(value);
  if (!d) return '';
  const month = capFirst(
    new Intl.DateTimeFormat('es-MX', { timeZone: 'UTC', month: 'short' }).format(d),
  );
  return `${d.getUTCDate()} ${month}`;
}

// «10 Dic – 4 Ene» si dura varios días; si no, la fecha corta sola.
export function eventShareCardDateRange(event) {
  const start = parseDateOnly(event?.date);
  if (!start) return '';
  const end = parseDateOnly(event?.end_date);
  if (end && end > start) {
    return `${eventShareCardDayMonth(event.date)} – ${eventShareCardDayMonth(event.end_date)}`;
  }
  return eventShareCardDateShort(event.date);
}

// Misma regla que EventInformation.timeLabel: 12 h con «a. m.» /
// «p. m.» en español (AM/PM en inglés). «20:00» → «8:00 p. m.».
export function eventShareCardTimeLabel(value, lang = 'es') {
  if (!/^\d{1,2}:\d{2}(?::\d{2})?$/.test(value || '')) return '';
  const [hours, minutes] = value.split(':').map(Number);
  if (hours > 23 || minutes > 59) return '';
  const suffix =
    lang === 'en' ? (hours >= 12 ? 'PM' : 'AM') : hours >= 12 ? 'p. m.' : 'a. m.';
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

// Subtítulo: descripción limpia, cortada en un límite de palabra (el
// layout la parte a 2 líneas como máximo).
function eventSubtitle(description, maxChars = 110) {
  const text = String(description || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '';
  if (text.length <= maxChars) return text;
  const cut = text.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

// ─── Datos que lleva la tarjeta ───

export function buildEventShareCardData(event, { cityName = '' } = {}) {
  const style = eventShareCardStyle(event);
  const price = getEventPrice(event);
  const amount = getEventPriceAmount(event);
  let priceText;
  let priceKind;
  if (price?.free) {
    priceText = 'Entrada gratuita';
    priceKind = 'free';
  } else if (amount) {
    priceText = `Boletos desde ${amount}`;
    priceKind = 'paid';
  } else {
    // Sin precio publicado no se menciona nada (PR #153): priceText
    // vacío → eventPillText no devuelve píldora y la tarjeta no lleva
    // ninguna línea de precio, ni en la vista previa ni en el PNG.
    priceText = '';
    priceKind = 'none';
  }
  const dateText = eventShareCardDateShort(event?.date) || 'Fecha por confirmar';
  const dateRangeText = eventShareCardDateRange(event) || dateText;
  const timeParts = [
    eventShareCardTimeLabel(event?.time),
    eventShareCardTimeLabel(event?.end_time),
  ].filter(Boolean);
  const timeText = timeParts.join(' – ');
  const venue = (event?.venue_name || '').trim();
  const city = (cityName || '').trim();
  // La feria lleva el rango de fechas; los demás, fecha + hora.
  const dateLine = style === 'boleto' ? dateRangeText : dateText;
  const infoLines = [timeText ? `📅 ${dateLine} · ${timeText}` : `📅 ${dateLine}`];
  const place = venue || city;
  if (place) infoLines.push(`📍 ${place}`);
  return {
    style,
    photoUrl: event?.img_url || event?.img || null,
    title: (event?.title || '').trim(),
    category: (event?.event_category || event?.category || '').trim(),
    subtitle: eventSubtitle(event?.description),
    dateText,
    dateRangeText,
    timeText,
    venue,
    cityName: city,
    infoLines,
    priceText,
    priceKind,
    shareUrl: eventUrl(event, 'https://citymap.mx'),
    slug: eventShortSlug(event) || '',
  };
}

export function eventShareCardFileName(event, format) {
  const slug = eventShortSlug(event) || createSlug(event?.title || 'evento');
  // En Post el archivo lleva el sufijo -post para no pisar el de
  // Historia al descargar los dos.
  const suffix = format?.id === 'post' ? '-post' : '';
  return `citymap-evento-${slug}${suffix}.png`;
}

// ─── Código de barras decorativo (estilo boleto) ───

// Barras deterministas a partir del slug: el mismo evento siempre
// dibuja el mismo código en la vista previa y en el PNG. No es un
// código real (no se escanea): es la tira decorativa de la imagen de
// Jonathan. Las x/w salen ya escaladas al ancho interior de la tira.
function barcodeSeed(slug) {
  let h = 2166136261 >>> 0;
  for (const ch of String(slug || 'evento')) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0 || 1;
}

export function eventBarcodeBars(slug, innerW, count = 30) {
  let seed = barcodeSeed(slug);
  const next = () => {
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
    return seed / 4294967296;
  };
  const raw = [];
  let total = 0;
  for (let i = 0; i < count; i++) {
    const w = 2 + Math.floor(next() * 4);
    const gap = 2 + Math.floor(next() * 3);
    raw.push({ w, gap });
    total += w + gap;
  }
  total -= raw[raw.length - 1].gap;
  const scale = innerW / Math.max(total, 1);
  const bars = [];
  let x = 0;
  for (const b of raw) {
    const w = Math.max(2, b.w * scale);
    bars.push({ x, w: Math.min(w, Math.max(2, innerW - x)) });
    x += w + Math.max(2, b.gap * scale);
    if (x >= innerW) break;
  }
  return bars;
}

// ─── Medición de texto ───

// Parte un texto en líneas (máximo maxLines, con … si sobra), con la
// misma medición que usa el canvas.
export function wrapShareCardLines(text, maxW, size, weight, maxLines) {
  const words = String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return [];
  const lines = [];
  let i = 0;
  while (i < words.length && lines.length < maxLines) {
    const isLast = lines.length === maxLines - 1;
    let line = words[i];
    i += 1;
    while (i < words.length) {
      const test = `${line} ${words[i]}`;
      if (measureShareCardText(test, size, weight) > maxW) break;
      line = test;
      i += 1;
    }
    if (
      measureShareCardText(line, size, weight) > maxW ||
      (isLast && i < words.length)
    ) {
      let t = line;
      while (t.length > 1 && measureShareCardText(`${t}…`, size, weight) > maxW) {
        t = t.slice(0, -1).trimEnd();
      }
      line = `${t}…`;
    }
    lines.push(line);
  }
  return lines;
}

// Una línea cortada con … si no cabe en el ancho.
export function truncateShareCardLine(text, maxW, size, weight = 600) {
  const t = String(text || '').trim();
  if (!t) return '';
  if (measureShareCardText(t, size, weight) <= maxW) return t;
  let out = t;
  while (out.length > 1 && measureShareCardText(`${out}…`, size, weight) > maxW) {
    out = out.slice(0, -1).trimEnd();
  }
  return `${out}…`;
}

// El título cabe SIEMPRE completo (PR #153): se reparte en hasta
// titleMaxLines (3) líneas y la fuente se achica desde el tamaño del
// estilo hasta titleMinSize, de 4 en 4 px, hasta que entra entero sin
// «…». Se devuelve el primer tamaño que cabe: un título corto queda a
// tamaño completo y solo los largos se achican. La vista previa
// (EventShareCardTemplate.jsx) y el canvas usan esta misma función vía
// computeEventShareCardLayout, así que lo que se ve es lo que se
// descarga. Caso que lo motivó: «ESLABÓN ARMADO TOUR E...» cortado en
// la tarjeta de Eslabón Armado.
function fitEventShareCardTitle(titleText, maxW, L, baseSize) {
  const minSize = L.titleMinSize || 40;
  for (let size = baseSize; size >= minSize; size -= 4) {
    const lines = wrapShareCardName(titleText, maxW, {
      ...L,
      nameSize: size,
      nameMaxLines: L.titleMaxLines,
    });
    if (lines.length && !lines.some((line) => line.endsWith('…'))) {
      return { lines, size };
    }
  }
  // Título patológico (una sola palabra más ancha que la tarjeta
  // incluso al mínimo): se devuelve al mínimo y wrapShareCardName lo
  // corta con «…». Los títulos reales de la base no llegan ahí.
  const lines = wrapShareCardName(titleText, maxW, {
    ...L,
    nameSize: minSize,
    nameMaxLines: L.titleMaxLines,
  });
  return { lines, size: minSize };
}

// ─── Geometría (vista previa y canvas dibujan lo mismo) ───

// La píldora según el estilo: festival y editorial llevan el precio
// (Boletos desde $X / Entrada gratuita); sin precio publicado NO hay
// píldora (PR #153). Experiencias lleva «Cupo limitado»; boleto y
// agenda no llevan píldora (la feria lleva el código de barras y la
// agenda solo la información).
function eventPillText(data) {
  if (data?.style === 'festival' || data?.style === 'editorial') {
    return data?.priceText || '';
  }
  if (data?.style === 'experiencias') return 'Cupo limitado';
  return '';
}

// Geometría completa de la tarjeta de evento. La foto es el único bloque
// flexible: su alto es todo lo que sobra tras reservar logo, textos,
// píldora o código de barras y pie, con photoMinH como mínimo — por eso
// nunca queda hueco vacío. Las `y` de chip, título, subtítulo e
// información son el CENTRO vertical del texto (el canvas dibuja con
// textBaseline 'middle'), igual que en la tarjeta de negocios.
export function computeEventShareCardLayout(data, format) {
  const f = format || SHARE_CARD_FORMATS.story;
  const L = EVENT_SHARE_CARD_LAYOUT[f.id] || EVENT_SHARE_CARD_LAYOUT.story;
  const W = f.width;
  const H = f.height;
  const maxW = W - L.pad * 2;
  const style = data?.style || 'editorial';
  const theme = resolveEventShareCardTheme(data?.theme);
  const palette = EVENT_SHARE_CARD_THEME_COLORS[theme.id];

  const logoW = Math.round(L.logoH * (400 / 120));
  const logo = { x: Math.round((W - logoW) / 2), y: L.pad, w: logoW, h: L.logoH };

  // En Post NO va la categoría (11 nov 2026, Jonathan: para ahorrar
  // espacio): sin chip, el bloque de categoría no se reserva y la foto
  // crece y se come ese espacio. En Historia se queda como está.
  const category = f.id === 'post' ? '' : (data?.category || '').trim().toUpperCase();

  // Desplazamiento de la foto dentro del marco (11 nov 2026, Jonathan:
  // se arrastra en la hoja antes de guardar; solo vive en la sesión,
  // no se guarda en la base). Viaja en `data.photoOffset` ({ x, y } en
  // [-1, 1], 0 = centrada) y el layout lo normaliza: la vista previa y
  // el canvas leen este mismo valor, así lo que se ve es lo que se
  // descarga.
  const photoOffset = normalizePhotoOffset(data?.photoOffset);

  // En festival el título va en mayúsculas y más grande: se pasa a
  // mayúsculas ANTES de medirlo, así la vista previa y el canvas
  // cortan las líneas igual. El título se ajusta (fitEventShareCardTitle):
  // hasta 3 líneas y fuente más chica si hace falta, para que quepa
  // completo y nunca se corte con «…».
  const titleSize = style === 'festival' ? L.titleSizeFestival : L.titleSize;
  const titleText =
    style === 'festival' ? (data?.title || '').toUpperCase() : data?.title || '';
  const fittedTitle = fitEventShareCardTitle(titleText, maxW, L, titleSize);
  const titleLines = fittedTitle.lines;
  const fittedTitleSize = fittedTitle.size;

  // En Post NO va la descripción (11 nov 2026, Jonathan: para ahorrar
  // espacio): el subtítulo solo se produce en Historia. Sin subtítulo,
  // la foto crece y se come ese espacio — la geometría ya lo contempla
  // (subBlock = 0 en Post).
  const showSubtitle =
    f.id !== 'post' &&
    ['editorial', 'experiencias', 'agenda'].includes(style) &&
    (data?.subtitle || '').trim();
  const subtitleLines = showSubtitle
    ? wrapShareCardLines(data.subtitle, maxW, L.subSize, 600, L.subMaxLines)
    : [];

  const infoLines = (data?.infoLines || [])
    .map((t) => truncateShareCardLine(t, maxW, L.infoSize, 600))
    .filter(Boolean);

  const pillText = eventPillText(data);
  const pillW = pillText
    ? measureShareCardText(pillText, L.pillSize, 700) + L.pillPadX * 2
    : 0;
  const pillH = L.pillSize + L.pillPadY * 2;

  const bars =
    style === 'boleto'
      ? eventBarcodeBars(data?.slug, maxW - L.barcodePadX * 2)
      : null;

  const catBlock = category ? L.catGap + L.catSize : 0;
  const titleBlockH = titleLines.length * fittedTitleSize * L.titleLineH;
  const titleBlock = titleLines.length ? L.titleGap + titleBlockH : 0;
  const subBlockH = subtitleLines.length * L.subSize * L.subLineH;
  const subBlock = subtitleLines.length ? L.subGap + subBlockH : 0;
  const infoBlockH = infoLines.length * L.infoSize * L.infoLineH;
  const infoBlock = infoLines.length ? L.infoGap + infoBlockH : 0;
  const pillBlock = pillText ? L.pillGap + pillH : 0;
  const barcodeBlock = bars ? L.barcodeGap + L.barcodeH : 0;
  const footBlock = L.footGap + L.footSize;

  const photoH = Math.max(
    L.photoMinH,
    H -
      L.pad * 2 -
      (L.logoH + L.logoGap) -
      catBlock -
      titleBlock -
      subBlock -
      infoBlock -
      pillBlock -
      barcodeBlock -
      footBlock,
  );

  let y = L.pad + L.logoH + L.logoGap;
  const photo = { x: L.pad, y, w: maxW, h: photoH, radius: L.photoRadius };
  y += photoH;

  // firstGap es el hueco del primer bloque tras la foto: la plantilla
  // lo aplica tal cual, así vista previa y canvas coinciden.
  let firstGap = null;
  const gapAfter = (g) => {
    if (firstGap === null) firstGap = g;
    return g;
  };

  let chip = null;
  if (category) {
    const g = gapAfter(L.catGap);
    y += g;
    chip = { text: category, x: W / 2, y: y + L.catSize / 2, size: L.catSize };
    y += L.catSize;
  }

  let title = null;
  if (titleLines.length) {
    const g = gapAfter(L.titleGap);
    y += g;
    title = {
      lines: titleLines,
      x: W / 2,
      y: y + (fittedTitleSize * L.titleLineH) / 2,
      size: fittedTitleSize,
      lineH: fittedTitleSize * L.titleLineH,
    };
    y += titleBlockH;
  }

  let subtitle = null;
  if (subtitleLines.length) {
    const g = gapAfter(L.subGap);
    y += g;
    subtitle = {
      lines: subtitleLines,
      x: W / 2,
      y: y + (L.subSize * L.subLineH) / 2,
      size: L.subSize,
      lineH: L.subSize * L.subLineH,
    };
    y += subBlockH;
  }

  const info = [];
  if (infoLines.length) {
    const g = gapAfter(L.infoGap);
    y += g;
    infoLines.forEach((line, i) => {
      info.push({
        text: line,
        x: W / 2,
        y: y + (L.infoSize * L.infoLineH) / 2 + i * L.infoSize * L.infoLineH,
        size: L.infoSize,
      });
    });
    y += infoBlockH;
  }

  let pill = null;
  if (pillText) {
    const g = gapAfter(L.pillGap);
    y += g;
    pill = { text: pillText, x: Math.round((W - pillW) / 2), y, w: pillW, h: pillH };
    y += pillH;
  }

  let barcode = null;
  if (bars) {
    const g = gapAfter(L.barcodeGap);
    y += g;
    barcode = {
      x: L.pad,
      y,
      w: maxW,
      h: L.barcodeH,
      padX: L.barcodePadX,
      padY: L.barcodePadY,
      bars,
    };
    y += L.barcodeH;
  }

  const footer = { y: H - L.pad - L.footSize / 2, size: L.footSize };
  return {
    format: f,
    L,
    style,
    theme,
    palette,
    width: W,
    height: H,
    logo,
    photo,
    photoOffset,
    firstGap,
    chip,
    title,
    subtitle,
    info,
    pill,
    barcode,
    footer,
  };
}

// ─── Dibujo en canvas ───

export function drawEventShareCardCanvas(data, format, assets, layout) {
  const geo = layout || computeEventShareCardLayout(data, format);
  const { L, palette } = geo;
  const canvas = document.createElement('canvas');
  canvas.width = geo.width;
  canvas.height = geo.height;
  const ctx = canvas.getContext('2d');

  // Fondo degradado (oscuro en Oscura, casi blanco en Clara).
  const bg = ctx.createLinearGradient(0, 0, 0, geo.height);
  bg.addColorStop(0, palette.bg[0]);
  bg.addColorStop(1, palette.bg[1]);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, geo.width, geo.height);

  // Logotipo oficial: en blanco sobre fondo oscuro, recolorado a
  // oscuro (#111111, loadShareCardLogoDark) sobre fondo claro.
  const logoImg = palette.logoWhite ? assets?.logoWhite : assets?.logoDark;
  if (logoImg) {
    ctx.drawImage(logoImg, geo.logo.x, geo.logo.y, geo.logo.w, geo.logo.h);
  }

  // Foto (o bloque con la inicial si no hay foto). El desplazamiento
  // que el usuario ajustó arrastrando en la hoja (geo.photoOffset)
  // mueve la ventana de origen del cover: la vista previa aplica el
  // mismo con object-position, así el PNG refleja exactamente lo que
  // se ve.
  const p = geo.photo;
  ctx.save();
  roundRectPath(ctx, p.x, p.y, p.w, p.h, p.radius);
  ctx.clip();
  if (assets?.photo) {
    drawCoverImage(ctx, assets.photo, p.x, p.y, p.w, p.h, geo.photoOffset);
  } else {
    ctx.fillStyle = palette.photoBg;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    const initial = (data?.title || 'C').trim().charAt(0).toUpperCase() || 'C';
    ctx.fillStyle = palette.initial;
    ctx.font = `800 ${Math.round(L.photoMinH * 0.45)}px ${SHARE_CARD_FONT_STACK}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initial, p.x + p.w / 2, p.y + p.h / 2);
  }
  ctx.restore();

  // Chip de categoría en versales espaciadas.
  if (geo.chip) {
    const c = geo.chip;
    ctx.font = `700 ${c.size}px ${SHARE_CARD_FONT_STACK}`;
    ctx.fillStyle = palette.muted;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const w = spacedWidth(ctx, c.text, 6);
    drawSpacedText(ctx, c.text, c.x - w / 2, c.y, 6);
  }

  // Título, hasta 2 líneas.
  if (geo.title) {
    const n = geo.title;
    ctx.font = `800 ${n.size}px ${SHARE_CARD_FONT_STACK}`;
    ctx.fillStyle = palette.text;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    n.lines.forEach((line, i) => {
      const w = spacedWidth(ctx, line, -1);
      drawSpacedText(ctx, line, n.x - w / 2, n.y + i * n.lineH, -1);
    });
  }

  // Subtítulo, hasta 2 líneas.
  if (geo.subtitle) {
    const s = geo.subtitle;
    ctx.font = `600 ${s.size}px ${SHARE_CARD_FONT_STACK}`;
    ctx.fillStyle = palette.sub;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    s.lines.forEach((line, i) => {
      const w = ctx.measureText(line).width;
      ctx.fillText(line, s.x - w / 2, s.y + i * s.lineH);
    });
  }

  // Filas de información (fecha/hora y lugar).
  for (const row of geo.info) {
    ctx.font = `600 ${row.size}px ${SHARE_CARD_FONT_STACK}`;
    ctx.fillStyle = palette.info;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const w = ctx.measureText(row.text).width;
    ctx.fillText(row.text, row.x - w / 2, row.y);
  }

  // Píldora (precio o «Cupo limitado»).
  if (geo.pill) {
    const pill = geo.pill;
    ctx.fillStyle = palette.pillBg;
    roundRectPath(ctx, pill.x, pill.y, pill.w, pill.h, pill.h / 2);
    ctx.fill();
    ctx.font = `700 ${L.pillSize}px ${SHARE_CARD_FONT_STACK}`;
    ctx.fillStyle = palette.pillText;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const textW = ctx.measureText(pill.text).width;
    ctx.fillText(pill.text, pill.x + (pill.w - textW) / 2, pill.y + pill.h / 2);
  }

  // Código de barras decorativo (estilo boleto): tira con barras. En
  // Oscura es tira blanca con barras negras; en Clara, tira negra con
  // barras blancas para que se lea sobre fondo claro. No es un código
  // real, no se escanea.
  if (geo.barcode) {
    const b = geo.barcode;
    ctx.fillStyle = palette.barcodeBg;
    roundRectPath(ctx, b.x, b.y, b.w, b.h, 20);
    ctx.fill();
    ctx.fillStyle = palette.barcodeBar;
    const barH = b.h - b.padY * 2;
    for (const bar of b.bars) {
      ctx.fillRect(b.x + b.padX + bar.x, b.y + b.padY, bar.w, barH);
    }
  }

  // Pie: «Descubre más eventos en www.citymap.mx» (10 nov 2026; antes
  // «Descúbrelo en CityMap»). La URL va en negrita, como el pie de las
  // tarjetas de negocios («Descúbrelo en www.citymap.mx», que NO cambia).
  const f = geo.footer;
  const run1 = 'Descubre más eventos en ';
  const run2 = 'www.citymap.mx';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `400 ${f.size}px ${SHARE_CARD_FONT_STACK}`;
  const w1 = spacedWidth(ctx, run1, 2);
  ctx.font = `800 ${f.size}px ${SHARE_CARD_FONT_STACK}`;
  const w2 = spacedWidth(ctx, run2, 2);
  const total = w1 + 2 + w2;
  const fx = geo.width / 2 - total / 2;
  ctx.font = `400 ${f.size}px ${SHARE_CARD_FONT_STACK}`;
  ctx.fillStyle = palette.footMuted;
  drawSpacedText(ctx, run1, fx, f.y, 2);
  ctx.font = `800 ${f.size}px ${SHARE_CARD_FONT_STACK}`;
  ctx.fillStyle = palette.footBold;
  drawSpacedText(ctx, run2, fx + w1 + 2, f.y, 2);

  return canvas;
}

export async function renderEventShareCardCanvas(data, format) {
  const [photo, logoWhite, logoDark] = await Promise.all([
    loadShareCardPhoto(data?.photoUrl),
    loadShareCardLogoWhite(),
    loadShareCardLogoDark(),
  ]);
  const layout = computeEventShareCardLayout(data, format);
  return drawEventShareCardCanvas(data, format, { photo, logoWhite, logoDark }, layout);
}

// Genera el PNG de la tarjeta del evento dibujando en canvas (nada de
// DOM ni de html-to-image): lo que se descarga es lo mismo que la vista
// previa, y el guarda anti-blanco impide descargar un PNG vacío.
export async function exportEventShareCardPng(data, format) {
  const canvas = await renderEventShareCardCanvas(data, format);
  assertCanvasNotBlank(canvas);
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('empty-blob'))),
      'image/png',
    );
  });
  return blob;
}
