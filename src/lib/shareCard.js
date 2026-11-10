// Tarjeta para compartir el negocio (PR #142 v1, PR #143): como la de
// «Qué Plan» — al presionar Compartir se genera una imagen PNG lista para
// Instagram/Facebook con los datos del negocio.
// v1: UN estilo oscuro, dos formatos (Historia IG 1080×1920, Post IG
// 1080×1080). PR #154: tres estilos (Oscura, Editorial y Ficha
// completa) que se eligen en la hoja; el oscuro sigue siendo el
// por defecto. PR #155: la Ficha completa se quita (Jonathan) y quedan
// DOS estilos (Oscura y Editorial), que se cambian con chevrones y
// puntos en vez de botones; la categoría sale de ambas versiones y el
// logo de Editorial va en oscuro (el PNG es blanco y no se veía).
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
import qrcode from 'qrcode-generator';
import { createSlug, getThumbUrl, cleanCityPrefix } from './utils.js';
import { formatReviewCount } from './googleRatings.js';
import { getProductPriceLabel } from './menuPricing.js';
import { sb } from './supabase.js';

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
// El nombre se corta a 3 líneas como máximo (antes 2, PR #158): con 2,
// un nombre largo se cortaba con «…» en el PNG y en la vista previa el
// DOM lo partía en una 3ª línea visual — el bloque crecía, la foto
// (flex: 1) se acortaba, su borde real subía y el círculo, absoluto
// sobre el borde calculado, tapaba la primera línea (Tangente
// Restaurante Tlaquepaque, Carrito La Paz Tostadas de Atún). photoMinH
// deja hueco para el peor caso (nombre de 3 líneas + píldoras en 2
// filas) sin comerse el hueco del pie.
export const SHARE_CARD_LAYOUT = {
  story: {
    pad: 64,
    logoH: 76,
    logoGap: 40,
    photoMinH: 900,
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
    nameSize: 88,
    nameGap: 32,
    nameLineH: 1.12,
    nameMaxLines: 3,
    pillSize: 40,
    pillPadX: 28,
    pillPadY: 14,
    pillGap: 16,
    pillRowGap: 14,
    pillsGap: 52,
    footSize: 34,
    footGap: 60,
  },
  post: {
    pad: 48,
    logoH: 76,
    logoGap: 36,
    photoMinH: 280,
    photoRadius: 32,
    bizLogoD: 190,
    bizLogoRing: 6,
    bizLogoGap: 22,
    bizLogoShadowY: 8,
    bizLogoShadowBlur: 20,
    nameSize: 68,
    nameGap: 20,
    nameLineH: 1.12,
    nameMaxLines: 3,
    pillSize: 34,
    pillPadX: 26,
    pillPadY: 13,
    pillGap: 14,
    pillRowGap: 12,
    pillsGap: 36,
    footSize: 30,
    footGap: 44,
  },
};

// ─── Estilos de la tarjeta (PR #154) ───
//
// La tarjeta de negocios ya no tiene un solo estilo: el oscuro «Glass»
// del #142 sigue siendo el por defecto, y se suma la versión clara
// (PR #156: antes se llamaba «Editorial», Jonathan la renombró «Clara»;
// el id interno sigue siendo 'editorial' para no romper nada), fondo
// blanco, tipografía cuidada. PR #160: la clara TAMBIÉN lleva el
// círculo del logo del negocio (misma regla que en Oscura: logo_url +
// plan de pago); antes no lo llevaba por diseño («la limpieza es el
// estilo»), pero Jonathan pidió que Clara también tuviera el logotipo
// del negocio (Vulcanos Chapalita, con logo y plan premium, salía sin
// nada en Clara). El anillo del círculo en Clara es gris visible
// sobre blanco (ver la paleta: bizLogoRing), porque el fino casi
// invisible del oscuro no se distinguía del fondo blanco.
// La hoja (ShareCardSheet) deja elegir el estilo junto al formato
// (Historia/Post): la vista previa y el PNG comparten UNA geometría por
// estilo, igual que la tarjeta actual. Sin precio en ningún estilo.
//
// PR #155 (ajustes 6–7): la foto se acorta y la información gana
// presencia (nombre y píldoras más grandes, huecos más generosos) y el
// logotipo oficial crece (logoH mayor en ambos estilos y formatos).
// PR #156: en Post el logo era tan chico (60 px en una vista previa de
// 200 px) que en la versión clara parecía no estar (Jonathan, captura
// de Cristina en Post: el logo SÍ se pintaba, en negro, pero a ~11 px
// no se apreciaba); el logo de Post sube a 76 px, igual que en Historia,
// en ambos estilos, para que tenga presencia real en vista previa y PNG.
export const SHARE_CARD_STYLES = {
  glass: { id: 'glass', label: 'Oscura' },
  editorial: { id: 'editorial', label: 'Clara' },
  // PR #159: dos estilos más, SOLO para negocios con menú (la carta
  // para pedir y el QR del menú). No entran en la lista base: sin menú
  // la hoja sigue con solo Oscura y Clara.
  pedido: { id: 'pedido', label: 'Para pedir' },
  qr: { id: 'qr', label: 'QR del menú' },
};
export const SHARE_CARD_STYLE_LIST = [
  SHARE_CARD_STYLES.glass,
  SHARE_CARD_STYLES.editorial,
];
export const SHARE_CARD_MENU_STYLE_LIST = [
  SHARE_CARD_STYLES.glass,
  SHARE_CARD_STYLES.editorial,
  SHARE_CARD_STYLES.pedido,
  SHARE_CARD_STYLES.qr,
];
// PR #162: los 2 estilos de menú, SOLOS, para la hoja del menú
// (/{ciudad}/{slug}/menu): «Para pedir» y «QR del menú». En la ficha
// ya no se ofrecen (Jonathan: «esas dos deben estar en el link del
// menú no en la tarjeta del negocio»); las tarjetas no se borran del
// código, solo cambian de sitio: la ficha vuelve a 2 estilos y la
// página del menú ofrece solo estas 2.
// La hoja usa esta lista: 4 opciones con menú, 2 sin él; en la página
// del menú, solo las 2 de menú (menuOnly).
export const SHARE_CARD_MENU_ONLY_STYLE_LIST = [
  SHARE_CARD_STYLES.pedido,
  SHARE_CARD_STYLES.qr,
];
export function shareCardStyleList(hasMenu, { menuOnly = false } = {}) {
  if (menuOnly) return SHARE_CARD_MENU_ONLY_STYLE_LIST;
  return hasMenu ? SHARE_CARD_MENU_STYLE_LIST : SHARE_CARD_STYLE_LIST;
}
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
    // Anillo del círculo del logo del negocio: fino y casi invisible
    // sobre fondo oscuro, donde el círculo blanco ya se distingue.
    bizLogoRing: 'rgba(0,0,0,0.06)',
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
    // Anillo del círculo del logo del negocio: gris visible sobre el
    // fondo blanco (PR #160) — el círculo blanco con su anillo fino
    // casi invisible no se distinguía del fondo, y Jonathan pidió
    // que Clara también llevara el logotipo del negocio.
    bizLogoRing: '#D4D4D8',
  },
  // PR #159: «Para pedir» es oscura como Glass (mismo fondo y textos)
  // más el botón verde de WhatsApp; el QR del menú también es oscuro,
  // con el QR sobre un bloque blanco para que se lea al escanear.
  pedido: {
    bg: ['#1B1B1B', '#0B0B0B'],
    text: '#FFFFFF',
    sub: '#A3A3A3',
    pillBg: 'rgba(255,255,255,0.12)',
    pillBorder: null,
    pillText: '#FFFFFF',
    logoWhite: true,
    photoBg: '#262626',
    initial: 'rgba(255,255,255,0.35)',
    orderGreen: '#25D366',
    orderText: '#FFFFFF',
    dishLine: 'rgba(255,255,255,0.22)',
  },
  qr: {
    bg: ['#1B1B1B', '#0B0B0B'],
    text: '#FFFFFF',
    sub: '#A3A3A3',
    pillBg: 'rgba(255,255,255,0.12)',
    pillBorder: null,
    pillText: '#FFFFFF',
    logoWhite: true,
    photoBg: '#262626',
    initial: 'rgba(255,255,255,0.35)',
  },
};

// Geometría de la versión clara: los mismos bloques que el estilo
// oscuro (logo, foto, nombre, píldoras, pie), con medidas propias y
// CON círculo de logo (PR #160: Jonathan pidió que Clara también
// llevara el logotipo del negocio, con la misma regla que en Oscura —
// logo_url + plan de pago —; antes no lo llevaba por diseño, «la
// limpieza es el estilo», pero Vulcanos Chapalita, con logo y plan
// premium, salía sin nada en Clara). El círculo es el mismo que en
// Oscura (mismo diámetro, a caballo sobre el borde inferior de la
// foto), con anillo gris visible sobre el fondo blanco (ver la paleta:
// bizLogoRing) en vez del fino casi invisible del oscuro. PR #155:
// sin categoría (sale de ambas versiones), foto más corta y
// nombre/píldoras más grandes para que la información tenga más
// presencia; logo más grande (logoH 76/60). PR #156: el logo de Post
// sube a 76 (era 60 y en la vista previa de 200 px no se apreciaba).
// PR #160: photoMinH de Post baja a 300 (era 360) para que el peor
// caso (nombre de 3 líneas + píldoras en 2 filas + círculo) no se
// coma el hueco del pie.
export const EDITORIAL_SHARE_CARD_LAYOUT = {
  story: {
    pad: 64,
    logoH: 76,
    logoGap: 40,
    photoMinH: 950,
    photoRadius: 32,
    showBizLogo: true,
    bizLogoD: 240,
    bizLogoRing: 8,
    bizLogoGap: 28,
    bizLogoShadowY: 8,
    bizLogoShadowBlur: 20,
    nameSize: 80,
    nameGap: 32,
    nameLineH: 1.15,
    nameMaxLines: 3,
    pillSize: 38,
    pillPadX: 26,
    pillPadY: 13,
    pillGap: 14,
    pillRowGap: 12,
    pillsGap: 52,
    footSize: 32,
    footGap: 60,
  },
  post: {
    pad: 48,
    logoH: 76,
    logoGap: 36,
    photoMinH: 300,
    photoRadius: 28,
    showBizLogo: true,
    bizLogoD: 190,
    bizLogoRing: 6,
    bizLogoGap: 22,
    bizLogoShadowY: 8,
    bizLogoShadowBlur: 20,
    nameSize: 62,
    nameGap: 20,
    nameLineH: 1.15,
    nameMaxLines: 3,
    pillSize: 32,
    pillPadX: 24,
    pillPadY: 12,
    pillGap: 12,
    pillRowGap: 10,
    pillsGap: 36,
    footSize: 28,
    footGap: 44,
  },
};

// Geometría de «Para pedir» (PR #159, propuesta 1 «La carta» de la
// demo): tarjeta oscura con la foto, el nombre completo, 3 platillos
// del menú con su precio, la línea de horario y un botón verde de
// «Hacer pedido». SIN píldoras (nada de etiqueta de ciudad, por
// decisión de Jonathan) y SIN círculo de logo (showBizLogo: false):
// el nombre va en su propio bloque y nada lo tapa (regla tras la
// queja de Tangente). La foto es más corta que en Oscura porque los
// platillos y el botón ocupan su sitio; sigue llenando su franja.
export const PEDIDO_SHARE_CARD_LAYOUT = {
  story: {
    pad: 64,
    logoH: 76,
    logoGap: 40,
    photoMinH: 560,
    photoRadius: 40,
    showBizLogo: false,
    nameSize: 80,
    nameGap: 28,
    nameLineH: 1.12,
    nameMaxLines: 3,
    dishSize: 40,
    dishRowH: 72,
    dishGap: 18,
    dishLineH: 1,
    hoursSize: 36,
    hoursGap: 28,
    buttonH: 104,
    buttonSize: 40,
    buttonGap: 32,
    buttonRadius: 52,
    footSize: 32,
    footGap: 48,
  },
  post: {
    pad: 48,
    logoH: 76,
    logoGap: 36,
    photoMinH: 220,
    photoRadius: 28,
    showBizLogo: false,
    nameSize: 60,
    nameGap: 20,
    nameLineH: 1.12,
    nameMaxLines: 3,
    dishSize: 30,
    dishRowH: 54,
    dishGap: 14,
    dishLineH: 1,
    hoursSize: 28,
    hoursGap: 20,
    buttonH: 78,
    buttonSize: 30,
    buttonGap: 24,
    buttonRadius: 39,
    footSize: 28,
    footGap: 36,
  },
};

// Geometría del QR del menú (PR #159): tarjeta oscura sin foto ni
// píldoras — el contenido es el QR grande sobre un bloque blanco
// (contraste alto + zona de silencio), el nombre completo arriba y
// «Escanea para ver el menú» debajo. El bloque del QR es flexible
// (como la foto en los demás estilos) y el cuadrado blanco va
// centrado en su franja, así nunca queda hueco vacío.
export const QR_SHARE_CARD_LAYOUT = {
  story: {
    pad: 64,
    logoH: 76,
    logoGap: 40,
    showBizLogo: false,
    nameSize: 80,
    nameGap: 32,
    nameLineH: 1.12,
    nameMaxLines: 3,
    qrPad: 48,
    qrRadius: 40,
    ctaSize: 40,
    ctaGap: 28,
    footSize: 32,
    footGap: 48,
  },
  post: {
    pad: 48,
    logoH: 76,
    logoGap: 36,
    showBizLogo: false,
    nameSize: 60,
    nameGap: 20,
    nameLineH: 1.12,
    nameMaxLines: 3,
    qrPad: 36,
    qrRadius: 28,
    ctaSize: 30,
    ctaGap: 20,
    footSize: 28,
    footGap: 36,
  },
};

// Las tablas van ANTES del registro (las const no se pueden leer
// antes de su declaración: TDZ, la lección del PR #136/#137).
export const SHARE_CARD_STYLE_LAYOUTS = {
  glass: SHARE_CARD_LAYOUT,
  editorial: EDITORIAL_SHARE_CARD_LAYOUT,
  pedido: PEDIDO_SHARE_CARD_LAYOUT,
  qr: QR_SHARE_CARD_LAYOUT,
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

// Datos que lleva la tarjeta. La calificación es SOLO la de Google: si
// displayRating no trae dato vigente de google_ratings_cache (source
// 'google'), no hay píldora de calificación — la interna de CityMap no
// se muestra en la tarjeta y ningún número se inventa. El precio se
// conserva como dato pero la tarjeta ya no lo muestra (PR #143).
// PR #155: sin categoría (sale de ambas versiones) y sin los datos de
// la Ficha (horario, dirección, WhatsApp), que se fue con ese estilo.
export function buildShareCardData(biz, { disp = null, cityName = '' } = {}) {
  const photoUrl =
    biz?.photos?.find((p) => p?.url)?.url || biz?.banner_url || biz?.logo_url || null;
  const google =
    disp?.source === 'google' && typeof disp?.rating === 'number';
  return {
    photoUrl,
    bizLogoUrl: bizShowsLogoCircle(biz) ? biz.logo_url.trim() : null,
    name: biz?.name || '',
    rating: google ? disp.rating : null,
    reviewCount: google ? disp.count || 0 : 0,
    cityName: (cityName || '').trim(),
    price:
      typeof biz?.price === 'string' && biz.price.trim() ? biz.price.trim() : null,
  };
}

export function shareCardFileName(biz) {
  return `citymap-${createSlug(biz?.name || 'negocio')}.png`;
}

// ─── Tarjetas de menú (PR #159: «Para pedir» y QR del menú) ───
//
// Datos que llevan esas dos tarjetas, encima de los de
// buildShareCardData: los primeros 3 platillos del menú con su precio,
// la línea de horario, el enlace de WhatsApp para pedir y la URL del
// menú (para el QR). Sin menú no hay datos: la hoja ni siquiera ofrece
// estos estilos.
// El horario es el de HOY del negocio (su `schedule`, la misma fuente
// que la ficha con getSmartScheduleInfo): «Hoy 11:00 a. m. – 10:00 p.
// m.», nunca solo la hora de apertura. Sin horario no se pinta la
// línea, nunca se inventa uno.
export function buildMenuShareCardData(
  biz,
  { disp = null, cityName = '', menuItems = [], hoursLine = null, whatsappUrl = null, menuUrl = null, qrDataUrl = null } = {},
) {
  return {
    ...buildShareCardData(biz, { disp, cityName }),
    menuItems: Array.isArray(menuItems) ? menuItems.slice(0, 3) : [],
    hoursLine: hoursLine || null,
    whatsappUrl: whatsappUrl || null,
    menuUrl: menuUrl || null,
    qrDataUrl: qrDataUrl || null,
  };
}

// «11:00am» → «11:00 a. m.» (12 h, como las horas de los eventos).
export function formatOrderTime(s) {
  const m = String(s || '')
    .trim()
    .match(/(\d{1,2})(?:\s*:\s*(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/i);
  if (!m) return null;
  let hh = parseInt(m[1], 10);
  const mm = parseInt(m[2] || '0', 10);
  const p = (m[3] || '').replace(/\./g, '').toLowerCase();
  if (p === 'pm' && hh !== 12) hh += 12;
  if (p === 'am' && hh === 12) hh = 0;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  const h12 = hh % 12 || 12;
  const ampm = hh >= 12 ? 'p. m.' : 'a. m.';
  return `${h12}:${String(mm).padStart(2, '0')} ${ampm}`;
}

function orderWeekdayKey(tz) {
  try {
    const wd = new Intl.DateTimeFormat('en-US', {
      timeZone: tz || 'America/Mexico_City',
      weekday: 'short',
    }).format(new Date());
    return (
      { Sun: 'dom', Mon: 'lun', Tue: 'mar', Wed: 'mie', Thu: 'jue', Fri: 'vie', Sat: 'sab' }[wd] ||
      'lun'
    );
  } catch {
    return ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'][new Date().getDay()];
  }
}

// La línea de horario de hoy para la tarjeta «Para pedir»: el rango
// completo de hoy («Hoy 11:00 a. m. – 10:00 p. m.»), «Abierto 24/7»,
// «Cerrado hoy», o null si el negocio no tiene horario.
export function orderHoursLine(biz, tz) {
  const sch = biz?.schedule;
  if (!sch || typeof sch !== 'object' || Object.keys(sch).length === 0) return null;
  if (sch.type === 'none') return null;
  if (sch.type === 'always_open') return 'Abierto 24/7';
  const raw = sch[orderWeekdayKey(tz)];
  if (!raw || /cerrado/i.test(String(raw))) return 'Cerrado hoy';
  const first = String(raw)
    .split(/,|\n/)
    .map((s) => s.trim())
    .filter(Boolean)[0];
  if (!first) return null;
  const segs = first.split(/\s*[-–]\s*|\s+a\s+/i).map((s) => s.trim());
  if (segs.length < 2) return null;
  const open = formatOrderTime(segs[0]);
  const close = formatOrderTime(segs[1]);
  if (!open || !close) return null;
  return `Hoy ${open} – ${close}`;
}

// Enlace de WhatsApp para pedir: el mismo número que usa la ficha
// (whatsapp o teléfono, como goWhatsApp en App.jsx), con el 52 de
// México si falta (como el carrito en CartDrawer) y un mensaje
// prellenado de pedido. Sin número, null: el botón lleva al menú.
export function orderWhatsappUrl(biz) {
  const digits = String(biz?.whatsapp || biz?.phone || '').replace(/\D/g, '');
  if (!digits) return null;
  const num = digits.startsWith('52') ? digits : `52${digits}`;
  const text = encodeURIComponent(`Hola ${biz?.name || ''}, quiero hacer un pedido.`.trim());
  return `https://wa.me/${num}?text=${text}`;
}

// URL del menú del negocio: la misma que abre el menú en la ficha
// (`/${ciudad}/${slug}/menu`, como el botón «VER MENÚ» de DetailView
// y el compartir de BusinessStore). Nunca se inventa: sin ciudad o
// sin slug, null.
export function buildMenuShareUrl(biz) {
  const city = biz?.city_slug || '';
  const slug = cleanCityPrefix(biz?.slug || biz?.id || '', city);
  if (!city || !slug) return null;
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://citymap.mx';
  return `${origin}/${city}/${slug}/menu`;
}

// Platillos del menú, en el orden de la ficha (categorías por
// sort_order, productos por sort_order): solo disponibles y solo con
// precio válido (el precio es el de la ficha, getProductPriceLabel:
// «$70» o «Desde: $70»). Sin precio no se muestra el platillo.
export function flattenMenuProducts(categories) {
  const out = [];
  const cats = [...(Array.isArray(categories) ? categories : [])].sort(
    (a, b) => (a?.sort_order || 0) - (b?.sort_order || 0),
  );
  for (const cat of cats) {
    const products = [...(cat?.store_products || [])].sort(
      (a, b) => (a?.sort_order || 0) - (b?.sort_order || 0),
    );
    for (const p of products) {
      if (!p?.is_available) continue;
      const label = getProductPriceLabel(p);
      if (!label) continue;
      out.push({ name: String(p?.name || '').trim(), priceLabel: label });
    }
  }
  return out;
}

// La misma consulta que BusinessStore para cargar el menú del
// negocio. Si falla o no hay platillos con precio, []: la hoja no
// ofrece las tarjetas de menú (nunca rota).
export async function loadMenuItems(bizId) {
  if (!bizId) return [];
  try {
    const cats = await sb.get(
      'store_categories',
      `?business_id=eq.${bizId}&select=id,name,sort_order,store_products(id,name,price,is_available,sort_order,store_product_options(id,name,type,is_required,store_option_values(id,label,extra_price)))&order=sort_order.asc`,
    );
    return flattenMenuProducts(cats);
  } catch {
    return [];
  }
}

// QR del menú, generado en el cliente (qrcode-generator, la misma
// librería que ya trae react-qr-code): nivel M, margen de 4 módulos
// de zona de silencio. La imagen sale a ~700–850 px, nítida para el
// bloque del QR en la tarjeta. Se cachea por URL: la misma URL da el
// mismo QR en la vista previa y en el PNG.
const _menuQrCache = new Map();
export function generateMenuQrDataUrl(url) {
  if (!url) return null;
  if (_menuQrCache.has(url)) return _menuQrCache.get(url);
  try {
    const qr = qrcode(0, 'M');
    qr.addData(url);
    qr.make();
    const dataUrl = qr.createDataURL(16, 4);
    _menuQrCache.set(url, dataUrl);
    return dataUrl;
  } catch {
    return null;
  }
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
// (el nombre de la tarjeta usa lo mismo).
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

// Nombre cortado a 3 líneas como máximo, con puntos suspensivos si sobra.
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

// Texto recortado a una línea con puntos suspensivos (el nombre del
// platillo en «Para pedir»: el precio va a la derecha y el nombre no
// puede invadirlo).
export function truncateShareCardText(text, maxW, size, weight = 700) {
  const t = String(text || '').trim();
  if (!t || measureShareCardText(t, size, weight) <= maxW) return t;
  let out = t;
  while (out.length > 1 && measureShareCardText(`${out}…`, size, weight) > maxW) {
    out = out.slice(0, -1).trimEnd();
  }
  return `${out}…`;
}

// Geometría completa de la tarjeta. La foto es el único bloque flexible:
// su alto es todo lo que sobra tras reservar logo, textos, píldoras y
// pie, con photoMinH como mínimo — por eso nunca queda hueco vacío.
// Las `y` de nombre y pie son el CENTRO vertical del texto
// (el canvas dibuja con textBaseline 'middle').
// PR #154: el estilo (4º parámetro, 'glass' por defecto) elige la tabla
// de medidas. Sin estilo, la geometría es la de siempre.
// PR #155: sin categoría y sin panel de ficha; la foto es más corta y
// el nombre y las píldoras más grandes, para que la información tenga
// más presencia.
// PR #159: «Para pedir» cambia las píldoras por platillos, horario y
// botón verde; el QR cambia la foto por el área flexible del QR.
export function computeShareCardLayout(data, format, hasGoogleMark = true, styleId = 'glass') {
  const f = format || SHARE_CARD_FORMATS.story;
  const style = resolveShareCardStyle(styleId);
  const L = shareCardLayoutTable(style.id, f.id);
  const W = f.width;
  const H = f.height;
  const maxW = W - L.pad * 2;

  // PR #159: «Para pedir» y el QR del menú tienen sus propios bloques
  // (platillos/horario/botón y área del QR) en vez de las píldoras.
  const isPedido = style.id === 'pedido';
  const isQr = style.id === 'qr';

  const logoW = Math.round(L.logoH * (400 / 120));
  const logo = { x: Math.round((W - logoW) / 2), y: L.pad, w: logoW, h: L.logoH };

  // Con círculo, el primer bloque tras la foto deja el hueco del
  // círculo (la mitad que sobresale bajo la foto + bizLogoGap) en vez
  // de su margen normal; los demás bloques conservan sus márgenes.
  // firstGap es el hueco que usa ese primer bloque: la plantilla lo
  // aplica tal cual, así vista previa y canvas coinciden.
  // En Clara el círculo también se muestra (PR #160, misma regla que
  // en Oscura: showBizLogo: true en su tabla); la regla del #158 se
  // mantiene: el círculo nunca tapa el nombre (nombres hasta 3 líneas,
  // nowrap por línea calculada, la foto se acorta si hace falta).
  const hasBizLogo = !!data?.bizLogoUrl && L.showBizLogo !== false;
  const circleClear = hasBizLogo ? L.bizLogoD / 2 + L.bizLogoGap : 0;
  let firstGap = null;
  const gapAfterPhoto = (normalGap) => {
    const g = hasBizLogo && firstGap === null ? circleClear : normalGap;
    if (firstGap === null) firstGap = g;
    return g;
  };

  const nameLines = wrapShareCardName(data?.name, maxW, L);
  const nameBlockH = nameLines.length * L.nameSize * L.nameLineH;
  const nameGapU = nameLines.length ? gapAfterPhoto(L.nameGap) : L.nameGap;
  const nameBlock = nameLines.length ? nameGapU + nameBlockH : 0;

  const pills = isPedido || isQr ? [] : shareCardPills(data, hasGoogleMark, L);
  const pillRows = layoutPillRows(pills, maxW, L);
  const pillH = L.pillSize + L.pillPadY * 2;
  const pillsBlockH = pillRows.length
    ? pillRows.length * pillH + (pillRows.length - 1) * L.pillRowGap
    : 0;
  const pillsGapU = pillRows.length ? gapAfterPhoto(L.pillsGap) : L.pillsGap;
  const pillsBlock = pillRows.length ? pillsGapU + pillsBlockH : 0;

  // PR #159 — bloques de «Para pedir»: los platillos (nombre a la
  // izquierda, precio a la derecha, renglón punteado entre ellos),
  // la línea de horario y el botón verde. El precio va con su ancho
  // medido: el nombre se recorta para no invadirlo.
  const dishes = [];
  if (isPedido) {
    for (const item of (data?.menuItems || []).slice(0, 3)) {
      const name = String(item?.name || '').trim();
      const price = item?.priceLabel || '';
      if (!name || !price) continue;
      const priceW = measureShareCardText(price, L.dishSize, 800);
      const nameMaxW = Math.max(0, maxW - priceW - 24);
      dishes.push({
        name: truncateShareCardText(name, nameMaxW, L.dishSize, 700),
        price,
        priceW,
      });
    }
  }
  const dishesBlock = dishes.length
    ? L.dishGap + dishes.length * L.dishRowH + (dishes.length - 1) * L.dishGap
    : 0;
  const hoursLine = isPedido ? data?.hoursLine || null : null;
  const hoursBlock = hoursLine ? L.hoursGap + L.hoursSize * 1.2 : 0;
  const buttonBlock = isPedido ? L.buttonGap + L.buttonH : 0;

  // PR #159 — el QR no tiene foto: su área flexible es la franja del
  // QR (la CTA va debajo, con su hueco).
  const ctaBlock = isQr ? L.ctaGap + L.ctaSize * 1.2 : 0;

  const footGapU = gapAfterPhoto(L.footGap);
  const footBlock = footGapU + L.footSize;

  const photoH = isQr
    ? Math.max(
        0,
        H - L.pad * 2 - (L.logoH + L.logoGap) - nameBlock - ctaBlock - footBlock,
      )
    : Math.max(
        L.photoMinH,
        H -
          L.pad * 2 -
          (L.logoH + L.logoGap) -
          nameBlock -
          pillsBlock -
          dishesBlock -
          hoursBlock -
          buttonBlock -
          footBlock,
      );

  let y = L.pad + L.logoH + L.logoGap;
  const photo = isQr
    ? null
    : { x: L.pad, y, w: maxW, h: photoH, radius: L.photoRadius };
  if (!isQr) y += photoH;

  // Círculo del logo centrado a caballo sobre el borde inferior de la
  // foto: su centro queda justo en ese borde (mitad sobre la foto,
  // mitad sobre el fondo oscuro). En el QR no hay foto ni círculo.
  const photoBottom = isQr ? y : photo.y + photo.h;
  const bizLogo = hasBizLogo
    ? {
        x: Math.round((W - L.bizLogoD) / 2),
        y: Math.round(photoBottom - L.bizLogoD / 2),
        d: L.bizLogoD,
        ring: L.bizLogoRing,
      }
    : null;

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
    // para que el pie quede a su hueco diseñado y no 14 px más abajo.
    y -= L.pillRowGap;
  }

  const footer = { y: H - L.pad - L.footSize / 2, size: L.footSize };

  // PR #159 — «Para pedir»: los platillos van tras el nombre, cada
  // uno en su renglón (nombre a la izquierda, precio a la derecha),
  // luego la línea de horario y el botón verde.
  let dishesOut = [];
  if (dishes.length) {
    y += L.dishGap;
    dishesOut = dishes.map((d) => {
      const row = { ...d, x: L.pad, y, w: maxW, h: L.dishRowH };
      y += L.dishRowH + L.dishGap;
      return row;
    });
    // El bucle suma dishGap también tras la última fila; se quita
    // para que el horario quede a su hueco diseñado, como las píldoras.
    y -= L.dishGap;
  }
  let hoursBox = null;
  if (hoursLine) {
    y += L.hoursGap;
    hoursBox = {
      text: hoursLine,
      x: W / 2,
      y: y + (L.hoursSize * 1.2) / 2,
      size: L.hoursSize,
    };
    y += L.hoursSize * 1.2;
  }
  let orderButtonBox = null;
  if (isPedido) {
    y += L.buttonGap;
    orderButtonBox = {
      label: 'Hacer pedido',
      x: L.pad,
      y,
      w: maxW,
      h: L.buttonH,
      radius: L.buttonRadius,
    };
    y += L.buttonH;
  }

  // PR #159 — el QR: su área es la franja flexible tras el nombre; el
  // cuadrado blanco va centrado en ella (lado = lo que quepa) y el QR
  // dentro, con su zona de silencio (qrPad) por todos lados.
  let qrBox = null;
  if (isQr) {
    const qrArea = { x: L.pad, y, w: maxW, h: photoH };
    const side = Math.min(qrArea.w, qrArea.h);
    const bx = Math.round(qrArea.x + (qrArea.w - side) / 2);
    const by = Math.round(qrArea.y + (qrArea.h - side) / 2);
    const inner = Math.max(0, side - L.qrPad * 2);
    qrBox = {
      area: qrArea,
      box: { x: bx, y: by, size: side, radius: L.qrRadius },
      img: { x: bx + L.qrPad, y: by + L.qrPad, size: inner },
      cta: { text: 'Escanea para ver el menú', x: W / 2, y: 0, size: L.ctaSize },
    };
    y += qrArea.h;
    y += L.ctaGap;
    qrBox.cta.y = y + (L.ctaSize * 1.2) / 2;
    y += L.ctaSize * 1.2;
  }

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
    name: nameBox,
    pillRows: pillRowsOut,
    dishes: dishesOut,
    hours: hoursBox,
    orderButton: orderButtonBox,
    qr: qrBox,
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

// El logotipo oficial (/logo-brand.png) es BLANCO sobre transparente
// (verificado por píxeles el 10 nov 2026: RGB medio 254,8): en la
// tarjeta oscura va tal cual en blanco, y para la clara de Editorial se
// recolorea a oscuro (PR #155: el #154 lo cargaba tal cual y el logo
// blanco no se veía sobre fondo blanco).
export async function loadShareCardLogoWhite() {
  try {
    return await loadImage('/logo-brand.png');
  } catch {
    return null;
  }
}

// El logotipo oficial recolorado a oscuro (#111111) para la tarjeta
// clara (versión Clara): el mismo recolorado `source-in` que usa el
// blanco, pero al revés. Sin él, el PNG blanco es invisible sobre
// fondo blanco.
export async function loadShareCardLogoDark() {
  try {
    const img = await loadImage('/logo-brand.png');
    const c = document.createElement('canvas');
    c.width = img.naturalWidth || img.width;
    c.height = img.naturalHeight || img.height;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = '#111111';
    x.fillRect(0, 0, c.width, c.height);
    return c;
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

  // Foto (o bloque con la inicial si no hay foto). El QR no tiene
  // foto: su área la pinta el bloque del QR más abajo.
  const p = geo.photo;
  if (p) {
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
  }

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
    // Anillo del círculo: en Clara es gris visible sobre el fondo
    // blanco (palette.bizLogoRing, PR #160); en Oscura, fino y casi
    // invisible, donde el círculo blanco ya se distingue.
    ctx.strokeStyle = palette.bizLogoRing;
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

  // PR #159 — «Para pedir»: platillos (nombre a la izquierda, precio
  // a la derecha, renglón punteado entre ellos), línea de horario y
  // botón verde de «Hacer pedido».
  if (geo.dishes?.length) {
    ctx.strokeStyle = palette.dishLine || 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 2;
    ctx.setLineDash([2, 8]);
    ctx.lineCap = 'round';
    geo.dishes.forEach((d, i) => {
      if (i > 0) {
        ctx.beginPath();
        ctx.moveTo(d.x, d.y - L.dishGap / 2);
        ctx.lineTo(d.x + d.w, d.y - L.dishGap / 2);
        ctx.stroke();
      }
      ctx.font = `700 ${L.dishSize}px ${SHARE_CARD_FONT_STACK}`;
      ctx.fillStyle = palette.text;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(d.name, d.x, d.y + d.h / 2);
      ctx.font = `800 ${L.dishSize}px ${SHARE_CARD_FONT_STACK}`;
      ctx.textAlign = 'right';
      ctx.fillText(d.price, d.x + d.w, d.y + d.h / 2);
    });
    ctx.setLineDash([]);
    ctx.lineCap = 'butt';
  }
  if (geo.hours) {
    ctx.font = `600 ${geo.hours.size}px ${SHARE_CARD_FONT_STACK}`;
    ctx.fillStyle = palette.sub;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(geo.hours.text, geo.hours.x, geo.hours.y);
  }
  if (geo.orderButton) {
    const b = geo.orderButton;
    ctx.fillStyle = palette.orderGreen || '#25D366';
    roundRectPath(ctx, b.x, b.y, b.w, b.h, b.radius);
    ctx.fill();
    ctx.font = `800 ${L.buttonSize}px ${SHARE_CARD_FONT_STACK}`;
    ctx.fillStyle = palette.orderText || '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2);
  }

  // PR #159 — QR del menú: el cuadrado blanco con el QR dentro y la
  // línea «Escanea para ver el menú» debajo. Sin imagen del QR (no
  // se pudo generar), el bloque blanco queda vacío, nunca roto.
  if (geo.qr) {
    const q = geo.qr;
    ctx.fillStyle = '#FFFFFF';
    roundRectPath(ctx, q.box.x, q.box.y, q.box.size, q.box.size, q.box.radius);
    ctx.fill();
    if (assets?.qr) {
      ctx.drawImage(assets.qr, q.img.x, q.img.y, q.img.size, q.img.size);
    }
    ctx.font = `600 ${q.cta.size}px ${SHARE_CARD_FONT_STACK}`;
    ctx.fillStyle = palette.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(q.cta.text, q.cta.x, q.cta.y);
  }

  return canvas;
}

export async function renderShareCardCanvas(data, format, styleId = 'glass') {
  const [photo, logoWhite, logoDark, googleMark, bizLogo, qr] = await Promise.all([
    loadShareCardPhoto(data?.photoUrl),
    loadShareCardLogoWhite(),
    loadShareCardLogoDark(),
    loadGoogleMark(),
    loadShareCardBizLogo(data?.bizLogoUrl),
    // PR #159: el QR es una data URL generada en el cliente (sin red):
    // si no se pudo generar, la tarjeta sale con el bloque blanco
    // vacío, nunca rota.
    loadShareCardQr(data?.qrDataUrl),
  ]);
  // Si el logo no cargó, la geometría es la de sin círculo: sin hueco
  // vacío y sin círculo a medias.
  const layoutData = bizLogo ? data : { ...data, bizLogoUrl: null };
  const layout = computeShareCardLayout(layoutData, format, !!googleMark, styleId);
  return drawShareCardCanvas(
    layoutData,
    format,
    { photo, logoWhite, logoDark, googleMark, bizLogo, qr },
    layout,
    styleId,
  );
}

// El QR del menú como imagen para el canvas: la data URL se genera en
// el cliente con qrcode-generator, así que no necesita CORS. Si no hay
// QR (estilo sin menú), null.
async function loadShareCardQr(qrDataUrl) {
  if (!qrDataUrl) return null;
  try {
    return await loadImage(qrDataUrl);
  } catch {
    return null;
  }
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
