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
import { createSlug, getThumbUrl } from './utils.js';
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
    logoH: 76,
    logoGap: 40,
    photoMinH: 950,
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
    nameMaxLines: 2,
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
    photoMinH: 360,
    photoRadius: 32,
    bizLogoD: 190,
    bizLogoRing: 6,
    bizLogoGap: 22,
    bizLogoShadowY: 8,
    bizLogoShadowBlur: 20,
    nameSize: 68,
    nameGap: 20,
    nameLineH: 1.12,
    nameMaxLines: 2,
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
// blanco, tipografía cuidada, sin círculo de logo: la limpieza es el
// estilo). PR #155: la Ficha completa se quita (Jonathan) y quedan DOS
// estilos, que se cambian con chevrones y puntos en la hoja en vez de
// botones. La categoría sale de ambas versiones (PR #155) y el logo de
// la versión clara va en oscuro (el PNG es blanco y no se veía sobre blanco).
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
};
export const SHARE_CARD_STYLE_LIST = [
  SHARE_CARD_STYLES.glass,
  SHARE_CARD_STYLES.editorial,
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
  },
};

// Geometría de la versión clara: los mismos bloques que el estilo
// oscuro (logo, foto, nombre, píldoras, pie), con medidas propias y sin
// círculo de logo (showBizLogo: false): la limpieza es el estilo.
// PR #155: sin categoría (sale de ambas versiones), foto más corta y
// nombre/píldoras más grandes para que la información tenga más
// presencia; logo más grande (logoH 76/60). PR #156: el logo de Post
// sube a 76 (era 60 y en la vista previa de 200 px no se apreciaba).
export const EDITORIAL_SHARE_CARD_LAYOUT = {
  story: {
    pad: 64,
    logoH: 76,
    logoGap: 40,
    photoMinH: 950,
    photoRadius: 32,
    showBizLogo: false,
    nameSize: 80,
    nameGap: 32,
    nameLineH: 1.15,
    nameMaxLines: 2,
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
    photoMinH: 360,
    photoRadius: 28,
    showBizLogo: false,
    nameSize: 62,
    nameGap: 20,
    nameLineH: 1.15,
    nameMaxLines: 2,
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

export const SHARE_CARD_STYLE_LAYOUTS = {
  glass: SHARE_CARD_LAYOUT,
  editorial: EDITORIAL_SHARE_CARD_LAYOUT,
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
export function computeShareCardLayout(data, format, hasGoogleMark = true, styleId = 'glass') {
  const f = format || SHARE_CARD_FORMATS.story;
  const style = resolveShareCardStyle(styleId);
  const L = shareCardLayoutTable(style.id, f.id);
  const W = f.width;
  const H = f.height;
  const maxW = W - L.pad * 2;

  const logoW = Math.round(L.logoH * (400 / 120));
  const logo = { x: Math.round((W - logoW) / 2), y: L.pad, w: logoW, h: L.logoH };

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

  const footGapU = gapAfterPhoto(L.footGap);
  const footBlock = footGapU + L.footSize;

  const photoH = Math.max(
    L.photoMinH,
    H -
      L.pad * 2 -
      (L.logoH + L.logoGap) -
      nameBlock -
      pillsBlock -
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
