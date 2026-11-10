// Tarjeta para compartir el negocio (PR #142 v1, PR #143): como la de
// «Qué Plan» — al presionar Compartir se genera una imagen PNG lista para
// Instagram/Facebook con los datos del negocio.
// v1: UN estilo oscuro, dos formatos (Historia IG 1080×1920, Post IG
// 1080×1080). PR #154: tres estilos (Oscura, Editorial y Ficha
// completa) que se eligen en la hoja; el oscuro sigue siendo el
// por defecto.
//
// PR #143 — POR QUÉ YA NO SE USA html-to-image: la exportación del #142
// salía 100% transparente (0 píxeles opacos, verificado por análisis de
// píxeles en los dos formatos) aunque la vista previa se veía bien. La
// causa: el nodo de exportación vivía fuera de pantalla con
// `position: fixed; left: -10000px` y html-to-image lo clona dentro de un
// SVG <foreignObject> conservando ese estilo, así que la tarjeta quedaba
// pintada 10.000 px a la izquierda del área visible del SVG y el canvas
// capturaba solo píxeles vacíos — con el tamaño correcto, sin error y con
// el aviso «Imagen descargada». Ahora la imagen se dibuja directo en un
// canvas 2D (sin foreignObject, sin clonar el DOM): fondo, foto, logo,
// textos y píldoras se pintan píxel a píxel, y antes de devolver el blob
// se comprueba que el canvas no esté en blanco (si lo estuviera, se lanza
// error en vez de descargar un PNG vacío).
//
// La vista previa (ShareCardTemplate.jsx) y el PNG comparten UNA sola
// geometría: SHARE_CARD_LAYOUT + computeShareCardLayout. La foto crece
// (flex: 1 en la plantilla, resto del alto en el canvas) y se come el
// espacio libre: nunca queda franja vacía entre las píldoras y el pie.
// El logotipo oficial (/logo-brand.png, el mismo del encabezado y del
// splash) va arriba en blanco; la calificación es SOLO la de Google
// (google_ratings_cache, misma fuente que las tarjetas de negocio) con su
// conteo de reseñas; el precio ya no se muestra.
//
// PR #144: el logo circular del negocio (mismo que la ficha, solo para
// planes de pago con logo_url) va centrado a caballo sobre el borde
// inferior de la foto, con anillo blanco; si no hay logo o no carga, la
// tarjeta queda igual que en el #143.
import { createSlug, getThumbUrl, isOpenNow } from './utils.js';
import { formatReviewCount } from './googleRatings.js';

export const SHARE_CARD_FORMATS = {
  story: { id: 'story', label: 'Historia IG', width: 1080, height: 1920 },
  post: { id: 'post', label: 'Post IG', width: 1080, height: 1080 },
};
export const SHARE_CARD_FORMAT_LIST = [
  SHARE_CARD_FORMATS.story,
  SHARE_CARD_FORMATS.post,
];

// La pila de fuentes resuelve igual que var(--heading) en la app
// (index.css: system-ui, 'Segoe UI', Roboto, sans-serif): el canvas mide
// y dibuja con la misma fuente que la vista previa.
export const SHARE_CARD_FONT_STACK =
  "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

// Geometría única de la tarjeta, por formato. photoMinH es la altura
// MÍNIMA de la foto: la foto crece desde ahí hasta comerse todo el
// espacio libre de la tarjeta (ver computeShareCardLayout).
export const SHARE_CARD_LAYOUT = {
  story: {
    pad: 64,
    logoH: 56,
    logoGap: 32,
    photoMinH: 1080,
    photoRadius: 40,
    // Círculo del logo del negocio (PR #144; PR #145: más grande, Ø 240
    // con anillo y sombra proporcionales): mismo estilo que la ficha
    // (DetailView) — blanco, anillo y sombra — centrado a caballo sobre
    // el borde inferior de la foto. bizLogoGap es el hueco entre el
    // círculo y el primer texto.
    bizLogoD: 240,
    bizLogoRing: 8,
    bizLogoGap: 28,
    bizLogoShadowY: 8,
    bizLogoShadowBlur: 20,
    catSize: 32,
    catGap: 36,
    nameSize: 76,
    nameGap: 18,
    nameLineH: 1.12,
    nameMaxLines: 2,
    pillSize: 34,
    pillPadX: 26,
    pillPadY: 12,
    pillGap: 16,
    pillRowGap: 14,
    pillsGap: 30,
    footSize: 30,
    footGap: 44,
  },
  post: {
    pad: 48,
    logoH: 44,
    logoGap: 24,
    photoMinH: 480,
    photoRadius: 32,
    bizLogoD: 190,
    bizLogoRing: 6,
    bizLogoGap: 22,
    bizLogoShadowY: 8,
    bizLogoShadowBlur: 20,
    catSize: 28,
    catGap: 28,
    nameSize: 60,
    nameGap: 14,
    nameLineH: 1.12,
    nameMaxLines: 2,
    pillSize: 30,
    pillPadX: 24,
    pillPadY: 11,
    pillGap: 14,
    pillRowGap: 12,
    pillsGap: 24,
    footSize: 26,
    footGap: 36,
  },
};

// ─── Estilos de la tarjeta (PR #154) ───
//
// La tarjeta de negocios ya no tiene un solo estilo: el oscuro «Glass»
// del #142 sigue siendo el por defecto, y se suman dos más que Jonathan
// eligió de la demo de propuestas:
//   - editorial: panel claro tipo revista (fondo blanco, tipografía
//     cuidada, sin círculo de logo: la limpieza es el estilo).
//   - ficha: la práctica, para que el cliente llegue al negocio: foto,
//     nombre, calificación y una ficha con el horario de hoy, la
//     dirección y el WhatsApp (solo las líneas con dato real).
// La hoja (ShareCardSheet) deja elegir el estilo junto al formato
// (Historia/Post): la vista previa y el PNG comparten UNA geometría por
// estilo, igual que la tarjeta actual. Sin precio en ningún estilo.
export const SHARE_CARD_STYLES = {
  glass: { id: 'glass', label: 'Oscura' },
  editorial: { id: 'editorial', label: 'Editorial' },
  ficha: { id: 'ficha', label: 'Ficha completa' },
};
export const SHARE_CARD_STYLE_LIST = [
  SHARE_CARD_STYLES.glass,
  SHARE_CARD_STYLES.editorial,
  SHARE_CARD_STYLES.ficha,
];
export const SHARE_CARD_DEFAULT_STYLE = 'glass';
export function resolveShareCardStyle(styleId) {
  return SHARE_CARD_STYLES[styleId] || SHARE_CARD_STYLES.glass;
}

// Paleta de cada estilo: la plantilla y el canvas leen los mismos
// colores, así la vista previa y el PNG coinciden.
export const SHARE_CARD_STYLE_COLORS = {
  glass: {
    bg: ['#1B1B1B', '#0B0B0B'],
    text: '#FFFFFF',
    sub: '#A3A3A3',
    pillBg: 'rgba(255,255,255,0.12)',
    pillBorder: null,
    pillText: '#FFFFFF',
    logoWhite: true,
    photoBg: '#262626',
    initial: 'rgba(255,255,255,0.35)',
    infoBg: 'rgba(255,255,255,0.08)',
    infoText: '#F4F4F5',
  },
  editorial: {
    bg: ['#FFFFFF', '#FAF9F6'],
    text: '#111111',
    sub: '#6B7280',
    pillBg: 'transparent',
    pillBorder: '#E5E7EB',
    pillText: '#111111',
    logoWhite: false,
    photoBg: '#F0EFEA',
    initial: 'rgba(0,0,0,0.30)',
    infoBg: null,
    infoText: '#111111',
  },
  ficha: {
    bg: ['#1B1B1B', '#0B0B0B'],
    text: '#FFFFFF',
    sub: '#A3A3A3',
    pillBg: 'rgba(255,255,255,0.12)',
    pillBorder: null,
    pillText: '#FFFFFF',
    logoWhite: true,
    photoBg: '#262626',
    initial: 'rgba(255,255,255,0.35)',
    infoBg: 'rgba(255,255,255,0.08)',
    infoText: '#F4F4F5',
  },
};

// Geometría de Editorial: los mismos bloques que el estilo oscuro
// (logo, foto, categoría, nombre, píldoras, pie), con medidas propias y
// sin círculo de logo (showBizLogo: false): la limpieza es el estilo.
export const EDITORIAL_SHARE_CARD_LAYOUT = {
  story: {
    pad: 64,
    logoH: 56,
    logoGap: 36,
    photoMinH: 1080,
    photoRadius: 32,
    showBizLogo: false,
    catSize: 30,
    catGap: 40,
    nameSize: 68,
    nameGap: 20,
    nameLineH: 1.15,
    nameMaxLines: 2,
    pillSize: 32,
    pillPadX: 24,
    pillPadY: 11,
    pillGap: 14,
    pillRowGap: 12,
    pillsGap: 32,
    footSize: 28,
    footGap: 44,
  },
  post: {
    pad: 48,
    logoH: 44,
    logoGap: 28,
    photoMinH: 480,
    photoRadius: 28,
    showBizLogo: false,
    catSize: 26,
    catGap: 32,
    nameSize: 54,
    nameGap: 16,
    nameLineH: 1.15,
    nameMaxLines: 2,
    pillSize: 28,
    pillPadX: 22,
    pillPadY: 10,
    pillGap: 12,
    pillRowGap: 10,
    pillsGap: 26,
    footSize: 24,
    footGap: 36,
  },
};

// Geometría de Ficha completa: como el estilo oscuro pero con la foto
// más corta y un panel de información tras las píldoras (horario,
// dirección, WhatsApp). photoMinH es más bajo en Post (200) porque con
// las 3 filas de la ficha el peor caso (nombre de 2 líneas, 2 filas de
// píldoras, dirección larga) solo deja 246 px libres: con el mínimo del
// estilo oscuro la tarjeta se desbordaría.
export const FICHA_SHARE_CARD_LAYOUT = {
  story: {
    pad: 64,
    logoH: 56,
    logoGap: 32,
    photoMinH: 720,
    photoRadius: 40,
    showBizLogo: true,
    bizLogoD: 240,
    bizLogoRing: 8,
    bizLogoGap: 28,
    bizLogoShadowY: 8,
    bizLogoShadowBlur: 20,
    catSize: 32,
    catGap: 36,
    nameSize: 76,
    nameGap: 18,
    nameLineH: 1.12,
    nameMaxLines: 2,
    pillSize: 34,
    pillPadX: 26,
    pillPadY: 12,
    pillGap: 16,
    pillRowGap: 14,
    pillsGap: 30,
    infoSize: 30,
    infoLineH: 1.35,
    infoMaxLines: 2,
    infoRowGap: 14,
    infoPad: 24,
    infoRadius: 28,
    infoGap: 28,
    footSize: 30,
    footGap: 44,
  },
  post: {
    pad: 48,
    logoH: 44,
    logoGap: 24,
    photoMinH: 200,
    photoRadius: 32,
    showBizLogo: true,
    bizLogoD: 190,
    bizLogoRing: 6,
    bizLogoGap: 22,
    bizLogoShadowY: 8,
    bizLogoShadowBlur: 20,
    catSize: 28,
    catGap: 28,
    nameSize: 60,
    nameGap: 14,
    nameLineH: 1.12,
    nameMaxLines: 2,
    pillSize: 30,
    pillPadX: 24,
    pillPadY: 11,
    pillGap: 14,
    pillRowGap: 12,
    pillsGap: 24,
    infoSize: 26,
    infoLineH: 1.35,
    infoMaxLines: 2,
    infoRowGap: 12,
    infoPad: 20,
    infoRadius: 24,
    infoGap: 24,
    footSize: 26,
    footGap: 36,
  },
};

export const SHARE_CARD_STYLE_LAYOUTS = {
  glass: SHARE_CARD_LAYOUT,
  editorial: EDITORIAL_SHARE_CARD_LAYOUT,
  ficha: FICHA_SHARE_CARD_LAYOUT,
};

// La tabla de medidas de un estilo y formato (la plantilla la usa para
// no duplicar números).
export function shareCardLayoutTable(styleId, formatId) {
  const style = resolveShareCardStyle(styleId);
  const table = SHARE_CARD_STYLE_LAYOUTS[style.id] || SHARE_CARD_LAYOUT;
  return table[formatId] || table.story;
}

// El logo circular del negocio es el mismo que muestra la ficha
// (DetailView.jsx): solo lo tienen los planes de pago (premium / pro /
// destacado) con logo_url. En la ficha el círculo no sale para los
// planes gratuitos aunque tengan logo_url (59 negocios tienen logo_url,
// 52 son de pago); la tarjeta replica esa regla para no regalar un
// beneficio de plan ni quedar distinta de la ficha. Sin círculo, la
// tarjeta queda exactamente como en el #143.
export const BIZ_LOGO_PLANS = ['premium', 'pro', 'destacado'];
export function bizShowsLogoCircle(biz) {
  return (
    typeof biz?.logo_url === 'string' &&
    biz.logo_url.trim() !== '' &&
    BIZ_LOGO_PLANS.includes(String(biz?.plan || '').trim().toLowerCase())
  );
}

// WhatsApp de la ficha (PR #154, estilo Ficha): el mismo que muestra
// DetailView — solo si el negocio tiene número Y plan de pago
// (premium/pro/destacado). En los planes gratuitos la ficha tampoco lo
// muestra, así que la tarjeta no lo regala.
export function shareCardWhatsapp(biz) {
  if (typeof biz?.whatsapp !== 'string' || !biz.whatsapp.trim()) return null;
  if (!BIZ_LOGO_PLANS.includes(String(biz?.plan || '').trim().toLowerCase())) return null;
  return biz.whatsapp.trim();
}

// Una hora suelta en 12 h en español, como las horas de la app
// («11:00 p. m.»). Misma expresión que formatBusinessHours.
export function formatShareCardHour(value) {
  const m = String(value || '')
    .trim()
    .match(/^(\d{1,2})(?::(\d{2}))?\s*([ap]\.?\s*m\.?)?$/i);
  if (!m) return String(value || '').trim();
  let hour = Number(m[1]);
  const suffix = (m[3] || '').replace(/[.\\s]/g, '').toLowerCase();
  if (suffix === 'pm' && hour < 12) hour += 12;
  if (suffix === 'am' && hour === 12) hour = 0;
  const ampm = hour >= 12 ? 'p. m.' : 'a. m.';
  return `${hour % 12 || 12}:${m[2] || '00'} ${ampm}`;
}

const SHARE_CARD_SCHEDULE_DAYS = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'];
const SHARE_CARD_WEEKDAY = {
  Sun: 'dom',
  Mon: 'lun',
  Tue: 'mar',
  Wed: 'mie',
  Thu: 'jue',
  Fri: 'vie',
  Sat: 'sab',
};

// La línea de horario de hoy para la ficha (PR #154): «Abierto ahora ·
// Cierra 11:00 p. m.» o «Cerrado · Hoy 9:00 a. m. – 11:00 p. m.». Usa el
// mismo horario (biz.schedule, días dom/lun/…) y la misma lógica de
// abierto/cerrado (isOpenNow) que la ficha. Si no hay horario para hoy
// o el negocio no publica horario, null: la línea no se pinta (nunca
// texto inventado).
export function shareCardHoursLine(biz, now = null) {
  const sch = biz?.schedule;
  if (!sch || typeof sch !== 'object') return biz?.open ? 'Abierto ahora' : null;
  if (sch.type === 'none') return null;
  if (sch.type === 'always_open') return 'Abierto 24/7';
  if (sch.type === 'appointment') return 'Atención con cita previa';
  const tz =
    (typeof window !== 'undefined' && window.CITY_TZ) || 'America/Mexico_City';
  const d =
    now || (typeof window !== 'undefined' && window.APP_NOW) || new Date();
  let dayKey;
  try {
    const wd = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      weekday: 'short',
    }).format(d);
    dayKey = SHARE_CARD_WEEKDAY[wd] || null;
  } catch {
    dayKey = SHARE_CARD_SCHEDULE_DAYS[new Date(d).getDay()];
  }
  const raw = dayKey ? sch[dayKey] : null;
  if (raw == null) return null;
  if (/cerrado/i.test(String(raw))) return 'Cerrado hoy';
  const shifts = String(raw)
    .split(/\n|,|\by\b/i)
    .map((s) => s.trim())
    .filter(Boolean);
  let open12 = null;
  let close12 = null;
  if (shifts.length) {
    const segs = shifts[0].split(/\s*[-–]\s*|\s+a\s+/i).map((s) => s.trim());
    if (segs.length >= 2) {
      open12 = formatShareCardHour(segs[0]);
      close12 = formatShareCardHour(segs[1]);
    }
  }
  const todayRange = open12 && close12 ? `${open12} – ${close12}` : null;
  if (isOpenNow(biz, tz, d)) {
    return close12 ? `Abierto ahora · Cierra ${close12}` : 'Abierto ahora';
  }
  return todayRange ? `Cerrado · Hoy ${todayRange}` : 'Cerrado hoy';
}

// Datos que lleva la tarjeta. La calificación es SOLO la de Google: si
// displayRating no trae dato vigente de google_ratings_cache (source
// 'google'), no hay píldora de calificación — la interna de CityMap no
// se muestra en la tarjeta y ningún número se inventa. El precio se
// conserva como dato pero la tarjeta ya no lo muestra (PR #143).
// PR #154: la ficha suma el horario de hoy, la dirección (si no está
// oculta) y el WhatsApp (solo planes de pago, como la ficha): las líneas
// sin dato no se pintan.
export function buildShareCardData(biz, { disp = null, cityName = '', now = null } = {}) {
  const photoUrl =
    biz?.photos?.find((p) => p?.url)?.url || biz?.banner_url || biz?.logo_url || null;
  const google =
    disp?.source === 'google' && typeof disp?.rating === 'number';
  return {
    photoUrl,
    bizLogoUrl: bizShowsLogoCircle(biz) ? biz.logo_url.trim() : null,
    name: biz?.name || '',
    category: (biz?.type?.trim() || biz?.category || '').trim(),
    rating: google ? disp.rating : null,
    reviewCount: google ? disp.count || 0 : 0,
    cityName: (cityName || '').trim(),
    price:
      typeof biz?.price === 'string' && biz.price.trim() ? biz.price.trim() : null,
    hoursLine: shareCardHoursLine(biz, now),
    address:
      !biz?.hide_location &&
      typeof biz?.address === 'string' &&
      biz.address.trim()
        ? biz.address.trim()
        : null,
    whatsapp: shareCardWhatsapp(biz),
  };
}

export function shareCardFileName(biz) {
  return `citymap-${createSlug(biz?.name || 'negocio')}.png`;
}

// ¿Puede este navegador compartir archivos con el menú del sistema?
// Se comprueba con un archivo vacío para no crear la imagen antes de
// saberlo; si algo falla, se asume que no y se descarga el PNG.
export function canShareImageFiles() {
  try {
    if (typeof navigator === 'undefined' || typeof navigator.canShare !== 'function') return false;
    return navigator.canShare({
      files: [new File([], 'citymap.png', { type: 'image/png' })],
    });
  } catch {
    return false;
  }
}

// ¿Se puede leer la foto con CORS? Las fotos vienen de Supabase Storage
// y Cloudinary y ambas responden Access-Control-Allow-Origin: * (verificado
// con curl el 10 nov 2026), así que el fetch con CORS funciona. Si una foto
// vive en otro lado sin CORS, el fetch falla y la tarjeta se genera sin
// foto (nunca rota).
export async function isPhotoFetchable(photoUrl) {
  if (!photoUrl) return false;
  try {
    const res = await fetch(photoUrl, { mode: 'cors', cache: 'force-cache' });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Medición de texto (misma fuente en la vista previa y en canvas) ───

let _measureCtx = null;
export function measureShareCardText(text, size, weight = 700) {
  const font = `${weight} ${size}px ${SHARE_CARD_FONT_STACK}`;
  if (typeof document === 'undefined') {
    return String(text).length * size * 0.55;
  }
  if (!_measureCtx) {
    const c = document.createElement('canvas');
    _measureCtx = c.getContext('2d');
  }
  if (!_measureCtx) return String(text).length * size * 0.55;
  _measureCtx.font = font;
  return _measureCtx.measureText(text).width;
}

// Texto cortado a N líneas como máximo, con puntos suspensivos si sobra
// (el nombre de la tarjeta y las filas de la ficha usan lo mismo).
export function wrapShareCardText(text, maxW, size, maxLines, weight = 700) {
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
    // Una palabra sola más ancha que la tarjeta, o palabras que sobran
    // en la última línea: se recorta con puntos suspensivos.
    if (
      measureShareCardText(line, size, weight) > maxW ||
      (isLast && i < words.length)
    ) {
      let t = line;
      while (
        t.length > 1 &&
        measureShareCardText(`${t}…`, size, weight) > maxW
      ) {
        t = t.slice(0, -1).trimEnd();
      }
      line = `${t}…`;
    }
    lines.push(line);
  }
  return lines;
}

// Nombre cortado a 2 líneas como máximo, con puntos suspensivos si sobra.
export function wrapShareCardName(name, maxW, L) {
  return wrapShareCardText(name, maxW, L.nameSize, L.nameMaxLines, 800);
}

// ─── Geometría (vista previa y canvas dibujan lo mismo) ───

function shareCardPills(data, hasGoogleMark, L) {
  const pills = [];
  if (typeof data?.rating === 'number' && data.rating > 0) {
    pills.push({
      text: `★ ${data.rating.toFixed(1)} (${formatReviewCount(data.reviewCount || 0)})`,
      google: hasGoogleMark,
      gSize: Math.round(L.pillSize * 0.85),
    });
  }
  if (data?.cityName) {
    pills.push({ text: data.cityName, google: false, gSize: 0 });
  }
  return pills;
}

function pillWidth(pill, L) {
  const textW = measureShareCardText(pill.text, L.pillSize, 700);
  const contentW = textW + (pill.google ? 8 + pill.gSize : 0);
  return contentW + L.pillPadX * 2;
}

function layoutPillRows(pills, maxW, L) {
  const rows = [];
  let row = [];
  let rowW = 0;
  for (const pill of pills) {
    const w = pillWidth(pill, L);
    if (row.length && rowW + L.pillGap + w > maxW) {
      rows.push(row);
      row = [];
      rowW = 0;
    }
    if (row.length) rowW += L.pillGap;
    row.push({ ...pill, w });
    rowW += w;
  }
  if (row.length) rows.push(row);
  return rows;
}

// Filas de la ficha (PR #154): horario, dirección y WhatsApp, solo las
// que tienen dato. Cada fila se corta a infoMaxLines líneas; el icono
// reserva su ancho para que el texto nunca se le monte encima.
function shareCardInfoRows(data, maxW, L) {
  const rows = [];
  if (data?.hoursLine) rows.push({ icon: '🕐', text: data.hoursLine });
  if (data?.address) rows.push({ icon: '📍', text: data.address });
  if (data?.whatsapp) rows.push({ icon: '💬', text: `WhatsApp ${data.whatsapp}` });
  const textW = maxW - L.infoPad * 2 - L.infoSize - 12;
  return rows.map((r) => ({
    ...r,
    lines: wrapShareCardText(r.text, textW, L.infoSize, L.infoMaxLines, 600),
  }));
}

// Geometría completa de la tarjeta. La foto es el único bloque flexible:
// su alto es todo lo que sobra tras reservar logo, textos, píldoras y
// pie, con photoMinH como mínimo — por eso nunca queda hueco vacío.
// Las `y` de categoría, nombre y pie son el CENTRO vertical del texto
// (el canvas dibuja con textBaseline 'middle').
// PR #154: el estilo (4º parámetro, 'glass' por defecto) elige la tabla
// de medidas y, en Ficha, añade el panel de información tras las
// píldoras. Sin estilo, la geometría es la de siempre.
export function computeShareCardLayout(data, format, hasGoogleMark = true, styleId = 'glass') {
  const f = format || SHARE_CARD_FORMATS.story;
  const style = resolveShareCardStyle(styleId);
  const L = shareCardLayoutTable(style.id, f.id);
  const W = f.width;
  const H = f.height;
  const maxW = W - L.pad * 2;

  const logoW = Math.round(L.logoH * (400 / 120));
  const logo = { x: Math.round((W - logoW) / 2), y: L.pad, w: logoW, h: L.logoH };

  const category = (data?.category || '').trim().toUpperCase();

  // Con círculo, el primer bloque tras la foto deja el hueco del
  // círculo (la mitad que sobresale bajo la foto + bizLogoGap) en vez
  // de su margen normal; los demás bloques conservan sus márgenes.
  // firstGap es el hueco que usa ese primer bloque: la plantilla lo
  // aplica tal cual, así vista previa y canvas coinciden.
  // En Editorial no hay círculo aunque el negocio tenga logo y plan de
  // pago (showBizLogo: false): la limpieza es el estilo. En los demás
  // estilos la regla no cambia.
  const hasBizLogo = !!data?.bizLogoUrl && L.showBizLogo !== false;
  const circleClear = hasBizLogo ? L.bizLogoD / 2 + L.bizLogoGap : 0;
  let firstGap = null;
  const gapAfterPhoto = (normalGap) => {
    const g = hasBizLogo && firstGap === null ? circleClear : normalGap;
    if (firstGap === null) firstGap = g;
    return g;
  };
  const catGapU = category ? gapAfterPhoto(L.catGap) : L.catGap;
  const catBlock = category ? catGapU + L.catSize : 0;

  const nameLines = wrapShareCardName(data?.name, maxW, L);
  const nameBlockH = nameLines.length * L.nameSize * L.nameLineH;
  const nameGapU = nameLines.length ? gapAfterPhoto(L.nameGap) : L.nameGap;
  const nameBlock = nameLines.length ? nameGapU + nameBlockH : 0;

  const pills = shareCardPills(data, hasGoogleMark, L);
  const pillRows = layoutPillRows(pills, maxW, L);
  const pillH = L.pillSize + L.pillPadY * 2;
  const pillsBlockH = pillRows.length
    ? pillRows.length * pillH + (pillRows.length - 1) * L.pillRowGap
    : 0;
  const pillsGapU = pillRows.length ? gapAfterPhoto(L.pillsGap) : L.pillsGap;
  const pillsBlock = pillRows.length ? pillsGapU + pillsBlockH : 0;

  // Panel de la ficha (solo estilo Ficha y solo si hay al menos una
  // fila con dato): su alto sale de las líneas ya cortadas, con el
  // relleno del panel y el hueco entre filas.
  const infoRows = style.id === 'ficha' ? shareCardInfoRows(data, maxW, L) : [];
  const infoBlockH = infoRows.length
    ? infoRows.reduce(
        (acc, r) => acc + r.lines.length * L.infoSize * L.infoLineH,
        0,
      ) +
      (infoRows.length - 1) * L.infoRowGap +
      L.infoPad * 2
    : 0;
  const infoGapU = infoRows.length ? gapAfterPhoto(L.infoGap) : L.infoGap;
  const infoBlock = infoRows.length ? infoGapU + infoBlockH : 0;

  const footGapU = gapAfterPhoto(L.footGap);
  const footBlock = footGapU + L.footSize;

  const photoH = Math.max(
    L.photoMinH,
    H -
      L.pad * 2 -
      (L.logoH + L.logoGap) -
      catBlock -
      nameBlock -
      pillsBlock -
      infoBlock -
      footBlock,
  );

  let y = L.pad + L.logoH + L.logoGap;
  const photo = { x: L.pad, y, w: maxW, h: photoH, radius: L.photoRadius };
  y += photoH;

  // Círculo del logo centrado a caballo sobre el borde inferior de la
  // foto: su centro queda justo en ese borde (mitad sobre la foto,
  // mitad sobre el fondo oscuro).
  const photoBottom = photo.y + photo.h;
  const bizLogo = hasBizLogo
    ? {
        x: Math.round((W - L.bizLogoD) / 2),
        y: Math.round(photoBottom - L.bizLogoD / 2),
        d: L.bizLogoD,
        ring: L.bizLogoRing,
      }
    : null;

  let categoryBox = null;
  if (category) {
    y += catGapU;
    categoryBox = { text: category, x: W / 2, y: y + L.catSize / 2, size: L.catSize };
    y += L.catSize;
  }

  let nameBox = null;
  if (nameLines.length) {
    y += nameGapU;
    nameBox = {
      lines: nameLines,
      x: W / 2,
      y: y + (L.nameSize * L.nameLineH) / 2,
      size: L.nameSize,
      lineH: L.nameSize * L.nameLineH,
    };
    y += nameBlockH;
  }

  const pillRowsOut = [];
  if (pillRows.length) {
    y += pillsGapU;
    for (const row of pillRows) {
      const rowW =
        row.reduce((acc, p) => acc + p.w, 0) + L.pillGap * (row.length - 1);
      let x = Math.round((W - rowW) / 2);
      pillRowsOut.push(
        row.map((p) => {
          const out = { ...p, x, y, h: pillH };
          x += p.w + L.pillGap;
          return out;
        }),
      );
      y += pillH + L.pillRowGap;
    }
    // El bucle suma pillRowGap también tras la última fila; se quita
    // para que el bloque siguiente (el panel de la ficha) quede a su
    // hueco diseñado y no 14 px más abajo.
    y -= L.pillRowGap;
  }

  // Panel de la ficha: el icono va centrado en la primera línea de su
  // fila y el texto a su derecha, con las líneas ya cortadas por
  // shareCardInfoRows. Las `y` de las líneas son su centro vertical.
  let infoBox = null;
  if (infoRows.length) {
    y += infoGapU;
    const rowsOut = [];
    let ry = y + L.infoPad;
    for (const row of infoRows) {
      const rowH = row.lines.length * L.infoSize * L.infoLineH;
      rowsOut.push({
        icon: row.icon,
        iconX: L.pad + L.infoPad,
        iconY: ry + (L.infoSize * L.infoLineH) / 2,
        iconSize: L.infoSize,
        lines: row.lines.map((line, li) => ({
          text: line,
          x: L.pad + L.infoPad + L.infoSize + 12,
          y: ry + (L.infoSize * L.infoLineH) / 2 + li * L.infoSize * L.infoLineH,
          size: L.infoSize,
          lineH: L.infoSize * L.infoLineH,
        })),
      });
      ry += rowH + L.infoRowGap;
    }
    infoBox = { x: L.pad, y, w: maxW, h: infoBlockH, pad: L.infoPad, rows: rowsOut };
    y += infoBlockH;
  }

  const footer = { y: H - L.pad - L.footSize / 2, size: L.footSize };
  return {
    style: style.id,
    format: f,
    L,
    width: W,
    height: H,
    logo,
    photo,
    bizLogo,
    firstGap,
    category: categoryBox,
    name: nameBox,
    pillRows: pillRowsOut,
    info: infoBox,
    footer,
  };
}

// ─── Carga de imágenes para el canvas ───

function loadImage(src, crossOrigin) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = crossOrigin;
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image-load-failed'));
    img.src = src;
  });
}

async function bitmapFromBlob(blob) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(blob);
    } catch {
      // Cae al <img> de abajo.
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    return await loadImage(url);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

// La foto se pide ancha (1600w por el bucket de getThumbUrl) para que
// salga nítida a 1080 px. Si no se puede leer con CORS, null: la tarjeta
// sale con el bloque de la inicial, nunca rota.
export async function loadShareCardPhoto(photoUrl) {
  if (!photoUrl) return null;
  try {
    const res = await fetch(getThumbUrl(photoUrl, 1080), {
      mode: 'cors',
      cache: 'force-cache',
    });
    if (!res.ok) return null;
    return await bitmapFromBlob(await res.blob());
  } catch {
    return null;
  }
}

// El logotipo oficial es negro sobre transparente; en la tarjeta oscura
// va en blanco (la misma inversión que usa Brand.jsx en modo oscuro).
export async function loadShareCardLogoWhite() {
  try {
    const img = await loadImage('/logo-brand.png');
    const c = document.createElement('canvas');
    c.width = img.naturalWidth || img.width;
    c.height = img.naturalHeight || img.height;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = '#FFFFFF';
    x.fillRect(0, 0, c.width, c.height);
    return c;
  } catch {
    return null;
  }
}

// El logotipo oficial tal cual (negro sobre transparente) para la
// tarjeta clara de Editorial: ahí no se invierte a blanco.
export async function loadShareCardLogoDark() {
  try {
    return await loadImage('/logo-brand.png');
  } catch {
    return null;
  }
}

// La «G» de Google que acompaña a la calificación (igual que en las
// tarjetas de negocio). Si no carga, la píldora sale solo con el texto.
async function loadGoogleMark() {
  try {
    return await loadImage('/googlelogo.svg');
  } catch {
    return null;
  }
}

// El logo circular del negocio (misma miniatura 300×300 que usa la
// ficha). Si no se puede leer con CORS o la imagen falla, null: la
// tarjeta sale sin círculo (nunca rota, nunca un hueco vacío).
async function loadShareCardBizLogo(bizLogoUrl) {
  if (!bizLogoUrl) return null;
  try {
    const res = await fetch(getThumbUrl(bizLogoUrl, 300, 300), {
      mode: 'cors',
      cache: 'force-cache',
    });
    if (!res.ok) return null;
    return await bitmapFromBlob(await res.blob());
  } catch {
    return null;
  }
}

// ─── Dibujo en canvas ───

export function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// Ancho de un texto con espaciado entre letras (letter-spacing manual:
// ctx.letterSpacing no existe en todos los navegadores).
export function spacedWidth(ctx, text, spacing) {
  let w = 0;
  const chars = Array.from(text);
  chars.forEach((ch, i) => {
    w += ctx.measureText(ch).width;
    if (i < chars.length - 1) w += spacing;
  });
  return w;
}

export function drawSpacedText(ctx, text, x, y, spacing) {
  let cx = x;
  for (const ch of Array.from(text)) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacing;
  }
}

// Como object-fit: cover — recorta la foto para llenar el marco.
export function drawCoverImage(ctx, img, dx, dy, dw, dh) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const scale = Math.max(dw / iw, dh / ih);
  const sw = dw / scale;
  const sh = dh / scale;
  ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, dx, dy, dw, dh);
}

// Como object-fit: contain — el logo entero dentro del marco, centrado
// (igual que la ficha: el logo no se recorta, se ve completo sobre el
// círculo blanco).
function drawContainImage(ctx, img, dx, dy, dw, dh) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const scale = Math.min(dw / iw, dh / ih);
  const w = iw * scale;
  const h = ih * scale;
  ctx.drawImage(img, dx + (dw - w) / 2, dy + (dh - h) / 2, w, h);
}

export function drawShareCardCanvas(data, format, assets, layout, styleId = 'glass') {
  const geo = layout || computeShareCardLayout(data, format, !!assets?.googleMark, styleId);
  const { L } = geo;
  const style = resolveShareCardStyle(geo.style || styleId);
  const palette = SHARE_CARD_STYLE_COLORS[style.id] || SHARE_CARD_STYLE_COLORS.glass;
  const canvas = document.createElement('canvas');
  canvas.width = geo.width;
  canvas.height = geo.height;
  const ctx = canvas.getContext('2d');

  // Fondo degradado (claro en Editorial, oscuro en los demás).
  const bg = ctx.createLinearGradient(0, 0, 0, geo.height);
  bg.addColorStop(0, palette.bg[0]);
  bg.addColorStop(1, palette.bg[1]);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, geo.width, geo.height);

  // Logotipo oficial arriba y centrado: en blanco sobre fondo oscuro,
  // tal cual (negro) sobre fondo claro.
  const logoImg = palette.logoWhite ? assets?.logoWhite : assets?.logoDark;
  if (logoImg) {
    ctx.drawImage(logoImg, geo.logo.x, geo.logo.y, geo.logo.w, geo.logo.h);
  }

  // Foto (o bloque con la inicial si no hay foto).
  const p = geo.photo;
  ctx.save();
  roundRectPath(ctx, p.x, p.y, p.w, p.h, p.radius);
  ctx.clip();
  if (assets?.photo) {
    drawCoverImage(ctx, assets.photo, p.x, p.y, p.w, p.h);
  } else {
    ctx.fillStyle = palette.photoBg;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    const initial = (data?.name || 'C').trim().charAt(0).toUpperCase() || 'C';
    ctx.fillStyle = palette.initial;
    ctx.font = `800 ${Math.round(L.photoMinH * 0.45)}px ${SHARE_CARD_FONT_STACK}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initial, p.x + p.w / 2, p.y + p.h / 2);
  }
  ctx.restore();

  // Círculo del logo del negocio (PR #144): mismo estilo que la ficha —
  // blanco, borde fino y sombra — centrado a caballo sobre el borde
  // inferior de la foto. El logo va con contain dentro del círculo
  // interior, completo y sin recortar.
  if (geo.bizLogo && assets?.bizLogo) {
    const b = geo.bizLogo;
    const cx = b.x + b.d / 2;
    const cy = b.y + b.d / 2;
    const r = b.d / 2;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.12)';
    ctx.shadowBlur = L.bizLogoShadowBlur;
    ctx.shadowOffsetY = L.bizLogoShadowY;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(cx, cy, r - 1, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 2;
    ctx.stroke();
    const innerR = r - b.ring;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.clip();
    drawContainImage(ctx, assets.bizLogo, cx - innerR, cy - innerR, innerR * 2, innerR * 2);
    ctx.restore();
  }

  // Categoría en versales espaciadas.
  if (geo.category) {
    const c = geo.category;
    // Editorial: una regla fina centrada sobre la categoría, como las
    // revistas (solo si hay categoría).
    if (style.id === 'editorial') {
      ctx.fillStyle = palette.text;
      ctx.fillRect(geo.width / 2 - 36, c.y - c.size / 2 - 18, 72, 3);
    }
    ctx.font = `700 ${c.size}px ${SHARE_CARD_FONT_STACK}`;
    ctx.fillStyle = palette.sub;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const w = spacedWidth(ctx, c.text, 6);
    drawSpacedText(ctx, c.text, c.x - w / 2, c.y, 6);
  }

  // Nombre, hasta 2 líneas.
  if (geo.name) {
    const n = geo.name;
    ctx.font = `800 ${n.size}px ${SHARE_CARD_FONT_STACK}`;
    ctx.fillStyle = palette.text;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    n.lines.forEach((line, i) => {
      const w = spacedWidth(ctx, line, -1);
      drawSpacedText(ctx, line, n.x - w / 2, n.y + i * n.lineH, -1);
    });
  }

  // Píldoras: calificación de Google (con su conteo y la G) y ciudad.
  // En Editorial van con borde y fondo transparente, en vez de rellenas.
  for (const row of geo.pillRows) {
    for (const pill of row) {
      ctx.fillStyle = palette.pillBg;
      roundRectPath(ctx, pill.x, pill.y, pill.w, pill.h, pill.h / 2);
      ctx.fill();
      if (palette.pillBorder) {
        ctx.strokeStyle = palette.pillBorder;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.font = `700 ${L.pillSize}px ${SHARE_CARD_FONT_STACK}`;
      ctx.fillStyle = palette.pillText;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const textW = ctx.measureText(pill.text).width;
      const contentW = textW + (pill.google ? 8 + pill.gSize : 0);
      const tx = pill.x + (pill.w - contentW) / 2;
      ctx.fillText(pill.text, tx, pill.y + pill.h / 2);
      if (pill.google && assets?.googleMark) {
        ctx.drawImage(
          assets.googleMark,
          tx + textW + 8,
          pill.y + (pill.h - pill.gSize) / 2,
          pill.gSize,
          pill.gSize,
        );
      }
    }
  }

  // Panel de la ficha (PR #154): horario, dirección y WhatsApp sobre
  // un fondo apenas más claro, con el icono de cada fila.
  if (geo.info) {
    const panel = geo.info;
    ctx.fillStyle = palette.infoBg;
    roundRectPath(ctx, panel.x, panel.y, panel.w, panel.h, L.infoRadius);
    ctx.fill();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = palette.infoText;
    for (const row of panel.rows) {
      ctx.font = `${row.iconSize}px ${SHARE_CARD_FONT_STACK}`;
      ctx.fillText(row.icon, row.iconX, row.iconY);
      ctx.font = `600 ${L.infoSize}px ${SHARE_CARD_FONT_STACK}`;
      for (const line of row.lines) {
        ctx.fillText(line.text, line.x, line.y);
      }
    }
  }

  // Pie: «Descúbrelo en CityMap».
  const f = geo.footer;
  const run1 = 'Descúbrelo en ';
  const run2 = 'CityMap';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `400 ${f.size}px ${SHARE_CARD_FONT_STACK}`;
  const w1 = spacedWidth(ctx, run1, 2);
  ctx.font = `800 ${f.size}px ${SHARE_CARD_FONT_STACK}`;
  const w2 = spacedWidth(ctx, run2, 2);
  const total = w1 + 2 + w2;
  let fx = geo.width / 2 - total / 2;
  ctx.font = `400 ${f.size}px ${SHARE_CARD_FONT_STACK}`;
  ctx.fillStyle = palette.sub;
  drawSpacedText(ctx, run1, fx, f.y, 2);
  ctx.font = `800 ${f.size}px ${SHARE_CARD_FONT_STACK}`;
  ctx.fillStyle = palette.text;
  drawSpacedText(ctx, run2, fx + w1 + 2, f.y, 2);

  return canvas;
}

export async function renderShareCardCanvas(data, format, styleId = 'glass') {
  const [photo, logoWhite, logoDark, googleMark, bizLogo] = await Promise.all([
    loadShareCardPhoto(data?.photoUrl),
    loadShareCardLogoWhite(),
    loadShareCardLogoDark(),
    loadGoogleMark(),
    loadShareCardBizLogo(data?.bizLogoUrl),
  ]);
  // Si el logo no cargó, la geometría es la de sin círculo: sin hueco
  // vacío y sin círculo a medias.
  const layoutData = bizLogo ? data : { ...data, bizLogoUrl: null };
  const layout = computeShareCardLayout(layoutData, format, !!googleMark, styleId);
  return drawShareCardCanvas(
    layoutData,
    format,
    { photo, logoWhite, logoDark, googleMark, bizLogo },
    layout,
    styleId,
  );
}

// Guarda anti-blanco: si el canvas saliera vacío (todo transparente),
// se lanza error en vez de descargar un PNG en blanco. El degradado de
// fondo cubre toda la tarjeta, así que un dibujo correcto es opaco.
export function assertCanvasNotBlank(canvas) {
  const ctx = canvas.getContext('2d');
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 3; i < data.length; i += 4000) {
    if (data[i] > 10) return;
  }
  throw new Error('blank-canvas');
}

// Genera el PNG de la tarjeta dibujando en canvas (nada de DOM ni de
// html-to-image): lo que se descarga es lo mismo que la vista previa.
// El estilo es el elegido en la hoja ('glass' por defecto).
export async function exportShareCardPng(data, format, styleId = 'glass') {
  const canvas = await renderShareCardCanvas(data, format, styleId);
  assertCanvasNotBlank(canvas);
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('empty-blob'))),
      'image/png',
    );
  });
  return blob;
}

// Comparte el PNG con el menú del sistema; si el navegador no puede
// compartir archivos, descarga el PNG (el usuario lo comparte manual
// desde su galería). En web no se puede publicar directo a Instagram:
// por eso el botón dice «Compartir» o «Descargar imagen».
export async function shareOrDownloadPng(blob, filename) {
  const file = new File([blob], filename, { type: 'image/png' });
  if (canShareImageFiles()) {
    await navigator.share({ files: [file] });
    return 'shared';
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return 'downloaded';
}
