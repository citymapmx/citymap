// Tarjeta para compartir el ARTÍCULO / experiencia de Revista: lo mismo
// que la tarjeta de eventos (PR #152) y la de negocios (PRs #142–#147)
// pero con los datos de la fila de `experiences`.
//
// UN SOLO estilo, «Foto completa», EXACTAMENTE como la propuesta 2 de
// la demo `propuestas-de-tarjetas-para-articulos` (corrección de
// Jonathan 10 Nov ~10:54: el segundo estilo, de fondo claro, se veía
// mal en vivo). En Post y Horizontal la foto llena TODA la tarjeta a
// sangre, el texto va encima con degradados para que se lea; en
// Historia (PR #177) la foto va en un bloque CENTRADO con márgenes y
// esquinas redondeadas, como en la tarjeta de eventos, y el contenido
// va DEBAJO sobre fondo oscuro. Logotipo oficial arriba a la izquierda
// (corrección de Jonathan 10 Nov ~11:39: en lugar de la pastilla de
// texto «citymap.mx»), pastilla de calificación arriba a la derecha
// (SOLO si es real), pastilla GLASS de ciudad · tipo de actividad
// (corrección de Jonathan 10 Nov ~11:39: translúcida, no azul sólida),
// título, parte de la descripción, duración · idiomas, y el precio en
// una pastilla AZUL grande («DESDE $1,881 MXN por persona»). Sin pie.
//
// Tres formatos: Historia 1080×1920, Post 1080×1080 y Horizontal
// 1080×566 (el tamaño oficial de Instagram para post horizontal,
// proporción 1.91:1, la misma de la demo 1200×630). En Horizontal el
// precio va al lado del texto (a la derecha); en Historia y Post va
// debajo de los datos, a la derecha.
//
// Reutiliza la base de la tarjeta de negocios (lib/shareCard.js): la
// exportación a canvas 2D (nada de html-to-image: el PNG salía
// transparente, PR #143), la foto flexible, el guarda anti-blanco y los
// helpers de medición/dibujo. Sin círculo de logo (eso es solo para
// negocios con plan de pago, PR #144).
//
// La vista previa (ExperienceShareCardTemplate.jsx) y el PNG comparten
// UNA sola geometría: EXPERIENCE_SHARE_CARD_LAYOUT +
// computeExperienceShareCardLayout, igual que la de eventos. Si el
// artículo no tiene foto, la tarjeta usa un degradado oscuro con la
// inicial, nunca una tarjeta en blanco ni un hueco roto.
//
// Contenido REAL de la fila, nunca inventado: imagen (`gallery[0]`),
// título, ciudad (de `city_slug`), tipo de actividad (`activity_type`),
// parte de la descripción (sin HTML y recortada), datos del tour
// (duración, idiomas y personas si hay) y precio (`price`; 0 → «Gratis»).
// La calificación SOLO si es real (`rating > 0` y `review_count > 0`):
// la demo mostraba un «4.9 · 13,275 reseñas» ilustrativo que NO existe
// en la base (el tour de ejemplo no tiene reseñas) — aquí nunca se
// inventa. El enlace que se comparte es la URL del detalle:
// /revista/:ciudad/:slug.
import { createSlug } from './utils.js';
import { formatReviewCount } from './googleRatings.js';
import {
  SHARE_CARD_FONT_STACK,
  measureShareCardText,
  wrapShareCardName,
  wrapShareCardText,
  loadShareCardPhoto,
  loadShareCardLogoWhite,
  drawCoverImage,
  roundRectPath,
  spacedWidth,
  drawSpacedText,
  assertCanvasNotBlank,
} from './shareCard.js';

// Los formatos de la tarjeta de artículo: los dos de siempre más el
// horizontal oficial de Instagram (1080×566, 1.91:1). Son SOLO de
// artículos: negocios y eventos siguen con Historia/Post de shareCard.js.
export const EXPERIENCE_SHARE_CARD_FORMATS = {
  story: { id: 'story', label: 'Historia IG', width: 1080, height: 1920 },
  post: { id: 'post', label: 'Post IG', width: 1080, height: 1080 },
  horizontal: { id: 'horizontal', label: 'Horizontal IG', width: 1080, height: 566 },
};
export const EXPERIENCE_SHARE_CARD_FORMAT_LIST = [
  EXPERIENCE_SHARE_CARD_FORMATS.story,
  EXPERIENCE_SHARE_CARD_FORMATS.post,
  EXPERIENCE_SHARE_CARD_FORMATS.horizontal,
];

// Azul de la pastilla de precio (la de ciudad · tipo ya no es azul:
// es glass, ver abajo), como la demo.
export const EXPERIENCE_SHARE_CARD_BLUE = '#2563EB';
// Glassmorphism de la pastilla de ubicación (como el estilo glass de
// negocios, shareCard.js: fondo translúcido + borde claro). En canvas
// no hay backdrop-filter: el translúcido sobre la foto y el degradado
// ES el efecto.
export const EXPERIENCE_SHARE_CARD_GLASS_BG = 'rgba(255,255,255,0.12)';
export const EXPERIENCE_SHARE_CARD_GLASS_BORDER = 'rgba(255,255,255,0.35)';
// El logotipo oficial (/logo-brand.png) mide 400×120.
const LOGO_RATIO = 400 / 120;
const STAR = '#F59E0B';

// Geometría de la tarjeta, por formato. En Post y Horizontal la foto
// va a sangre (0,0,W,H) y el bloque de texto va anclado abajo, con
// degradados arriba y abajo para que se lea. En Historia
// (PR #177, como la tarjeta de eventos: EVENT_SHARE_CARD_LAYOUT.story)
// la foto va en un bloque CENTRADO con márgenes (x: pad, ancho
// W - 2*pad), esquinas redondeadas y el contenido DEBAJO sobre fondo
// oscuro: el alto de la foto es todo lo que sobra entre el logotipo y
// el bloque de texto, con photoMinH como mínimo. El peor caso de
// contenido (título a 3 líneas a tamaño completo + descripción y datos
// a 2 líneas + pastilla de precio) deja 926 px libres, así que
// photoMinH 900 nunca se come el texto (en eventos es 960 porque su
// bloque de contenido es más bajo). `priceBeside` (solo Horizontal): la
// pastilla de precio va a la derecha del bloque de texto, con la base
// alineada con la de los datos; en Historia y Post va debajo de los datos.
export const EXPERIENCE_SHARE_CARD_LAYOUT = {
  story: {
    pad: 64,
    logoH: 76,
    ratingSize: 32,
    ratingPadX: 24,
    ratingPadY: 12,
    citySize: 34,
    cityPadX: 26,
    cityPadY: 12,
    titleSize: 80,
    titleMinSize: 48,
    titleLineH: 1.1,
    titleMaxLines: 3,
    descSize: 36,
    descLineH: 1.35,
    descMaxLines: 2,
    dataSize: 34,
    dataLineH: 1.4,
    dataMaxLines: 2,
    priceSize: 56,
    desdeSize: 20,
    porSize: 26,
    pricePadX: 36,
    pricePadY: 18,
    desdeGap: 6,
    priceRowGap: 12,
    titleGap: 20,
    descGap: 16,
    dataGap: 18,
    priceGap: 28,
    priceBeside: false,
    gradTopH: 0.22,
    gradBottomH: 0.6,
    // Solo Historia: foto en bloque centrado como en eventos
    // (PR #177). Post y Horizontal siguen a sangre completa.
    centeredPhoto: true,
    photoMinH: 900,
    photoGap: 36,
    photoRadius: 40,
    logoGap: 40,
  },
  post: {
    pad: 48,
    logoH: 76,
    ratingSize: 26,
    ratingPadX: 20,
    ratingPadY: 10,
    citySize: 30,
    cityPadX: 22,
    cityPadY: 10,
    titleSize: 62,
    titleMinSize: 40,
    titleLineH: 1.1,
    titleMaxLines: 3,
    descSize: 30,
    descLineH: 1.35,
    descMaxLines: 2,
    dataSize: 28,
    dataLineH: 1.4,
    dataMaxLines: 2,
    priceSize: 46,
    desdeSize: 18,
    porSize: 22,
    pricePadX: 30,
    pricePadY: 15,
    desdeGap: 5,
    priceRowGap: 10,
    titleGap: 16,
    descGap: 12,
    dataGap: 14,
    priceGap: 22,
    priceBeside: false,
    gradTopH: 0.22,
    gradBottomH: 0.6,
  },
  horizontal: {
    pad: 48,
    logoH: 76,
    ratingSize: 22,
    ratingPadX: 18,
    ratingPadY: 9,
    citySize: 26,
    cityPadX: 20,
    cityPadY: 9,
    titleSize: 52,
    titleMinSize: 30,
    titleLineH: 1.1,
    titleMaxLines: 3,
    descSize: 26,
    descLineH: 1.35,
    descMaxLines: 2,
    dataSize: 24,
    dataLineH: 1.4,
    dataMaxLines: 2,
    priceSize: 40,
    desdeSize: 16,
    porSize: 20,
    pricePadX: 28,
    pricePadY: 13,
    desdeGap: 4,
    priceRowGap: 10,
    titleGap: 14,
    descGap: 10,
    dataGap: 12,
    priceGap: 0,
    priceBeside: true,
    colGap: 28,
    gradTopH: 0.3,
    gradBottomH: 0.78,
  },
};

// ─── Datos que lleva la tarjeta (solo de la fila) ───

// La descripción de la base trae HTML (<h2>, <p>…): se quitan las
// etiquetas y se colapsa el espacio; el layout la parte a 2 líneas
// como máximo.
function stripExperienceDescription(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function experienceExcerpt(description, maxChars = 170) {
  const text = stripExperienceDescription(description);
  if (!text) return '';
  if (text.length <= maxChars) return text;
  const cut = text.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export function experienceShareCardPriceText(exp) {
  const price = Number(exp?.price);
  if (!Number.isFinite(price) || price <= 0) return 'Gratis';
  return `$${Math.round(price).toLocaleString('en-US')} MXN`;
}

export function experienceShareUrl(exp) {
  // Si la experiencia está en varias ciudades, la URL del detalle usa
  // la primera (como el resto de la app).
  const city = String(exp?.city_slug || 'todas').split(',')[0].trim() || 'todas';
  const slug =
    String(exp?.slug || '').trim() ||
    exp?.id ||
    createSlug(exp?.title || 'experiencia');
  return `https://citymap.mx/revista/${city}/${slug}`;
}

export function buildExperienceShareCardData(exp, { cityName = '' } = {}) {
  const rating = Number(exp?.rating);
  const reviewCount = Number(exp?.review_count);
  // Calificación SOLO si es real: rating y reseñas en la fila. Sin
  // dato, la tarjeta no muestra ninguna calificación (nunca se inventa
  // el 4.9 de la demo). La pastilla dice «4.8 · 132 reseñas», como la
  // demo; la estrella se pinta aparte (ámbar).
  const hasRating =
    Number.isFinite(rating) &&
    rating > 0 &&
    Number.isFinite(reviewCount) &&
    reviewCount > 0;
  const dataParts = [];
  if (String(exp?.duration || '').trim()) dataParts.push(`⏱ ${String(exp.duration).trim()}`);
  if (String(exp?.languages || '').trim()) dataParts.push(`🌐 ${String(exp.languages).trim()}`);
  if (String(exp?.people || '').trim()) dataParts.push(String(exp.people).trim());
  const city = (cityName || '').trim();
  const activityType = (exp?.activity_type || '').trim();
  // Pastilla de ciudad · tipo: «📍 Guadalajara · Tour» (glass, no azul).
  // El pin va SEPARADO del texto (PR #177): el emoji 📍 se dibuja más
  // alto que el centro visual del texto y la pastilla salía
  // descentrada; la geometría guarda pin y etiqueta por separado para
  // centrar cada uno por su caja visual. `cityLine` sigue siendo la
  // línea completa, por compatibilidad.
  const cityLabelParts = [];
  if (city) cityLabelParts.push(city);
  if (activityType) cityLabelParts.push(activityType);
  const cityLabel = cityLabelParts.join(' · ');
  const cityPin = city ? '📍' : '';
  const cityLine = cityPin ? `${cityPin} ${cityLabel}` : cityLabel;
  const price = Number(exp?.price);
  return {
    photoUrl:
      (Array.isArray(exp?.gallery) && exp.gallery[0]) ||
      exp?.img_url ||
      exp?.img ||
      null,
    title: (exp?.title || '').trim(),
    cityName: city,
    activityType,
    cityLine,
    cityPin,
    cityLabel,
    ratingText: hasRating
      ? `${rating.toFixed(1)} · ${formatReviewCount(reviewCount)} ${reviewCount === 1 ? 'reseña' : 'reseñas'}`
      : '',
    description: experienceExcerpt(exp?.description),
    dataLine: dataParts.join(' · '),
    priceText: experienceShareCardPriceText(exp),
    priced: Number.isFinite(price) && price > 0,
    shareUrl: experienceShareUrl(exp),
    slug:
      String(exp?.slug || '').trim() || createSlug(exp?.title || 'experiencia'),
  };
}

export function experienceShareCardFileName(exp) {
  const slug =
    String(exp?.slug || '').trim() || createSlug(exp?.title || 'experiencia');
  return `citymap-experiencia-${slug}.png`;
}

// ─── Medición de texto ───

// El título cabe SIEMPRE completo (mismo patrón que el PR #153 en
// eventos): se reparte en hasta titleMaxLines líneas y la fuente se
// achica desde el tamaño del estilo hasta titleMinSize, de 4 en 4 px,
// hasta que entra entero sin «…». La vista previa y el canvas usan esta
// misma función vía computeExperienceShareCardLayout.
function fitExperienceShareCardTitle(titleText, maxW, L, baseSize) {
  const minSize = L.titleMinSize || 36;
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
  const lines = wrapShareCardName(titleText, maxW, {
    ...L,
    nameSize: minSize,
    nameMaxLines: L.titleMaxLines,
  });
  return { lines, size: minSize };
}

// ─── Medición de pastillas ───

// El logotipo oficial arriba a la izquierda: alto logoH (76, como en
// negocios) y ancho por la proporción 400×120 del PNG.
function brandLogoSize(L) {
  return {
    w: Math.round(L.logoH * LOGO_RATIO),
    h: L.logoH,
  };
}

function ratingPillSize(ratingText, L) {
  return {
    w:
      measureShareCardText('★', L.ratingSize, 800) +
      6 +
      measureShareCardText(ratingText, L.ratingSize, 600) +
      L.ratingPadX * 2,
    h: L.ratingSize + L.ratingPadY * 2,
  };
}

// La pastilla de ciudad · tipo se mide en DOS tramos (PR #177): el pin
// 📍 y la etiqueta por separado, con el ancho de un espacio entre
// ambos (el mismo hueco que los separaba en la línea completa). El
// ancho total es el mismo que antes: pin + espacio + etiqueta + los
// dos paddings.
function cityPillSize(pin, label, L) {
  const pinW = pin ? measureShareCardText(pin, L.citySize, 600) : 0;
  const pinGap = pin ? measureShareCardText(' ', L.citySize, 600) : 0;
  const labelW = measureShareCardText(label, L.citySize, 600);
  return {
    w: pinW + pinGap + labelW + L.cityPadX * 2,
    h: L.citySize + L.cityPadY * 2,
    pinW,
    pinGap,
  };
}

// La pastilla de precio azul: si hay precio, dos filas («DESDE» chico
// arriba; precio grande + «por persona» chico en la misma línea);
// si es gratis, una sola fila con «Gratis».
function pricePillSize(priceText, priced, L) {
  if (!priced) {
    return {
      w: measureShareCardText(priceText, L.priceSize, 800) + L.pricePadX * 2,
      h: L.priceSize + L.pricePadY * 2,
    };
  }
  const row2 =
    measureShareCardText(priceText, L.priceSize, 800) +
    L.priceRowGap +
    measureShareCardText('por persona', L.porSize, 600);
  const row1 = measureShareCardText('DESDE', L.desdeSize, 800);
  return {
    w: Math.max(row1, row2) + L.pricePadX * 2,
    h: L.pricePadY * 2 + L.desdeSize + L.desdeGap + L.priceSize,
  };
}

// ─── Geometría (vista previa y canvas dibujan lo mismo) ───

// En Post y Horizontal la foto es a sangre (0,0,W,H) y el bloque de
// texto va anclado abajo. En Historia (PR #177) la foto es un bloque
// centrado con márgenes y el contenido va debajo, sobre fondo oscuro:
// la foto es todo lo que sobra entre el logotipo y el bloque de texto,
// con photoMinH como mínimo, así nunca se come el contenido ni queda
// hueco vacío. Las `y` de título, descripción y datos son el CENTRO
// vertical de la primera línea (el canvas dibuja con textBaseline
// 'middle'), igual que en la tarjeta de negocios y en la de eventos.
export function computeExperienceShareCardLayout(data, format) {
  const f = format || EXPERIENCE_SHARE_CARD_FORMATS.story;
  const L = EXPERIENCE_SHARE_CARD_LAYOUT[f.id] || EXPERIENCE_SHARE_CARD_LAYOUT.story;
  const W = f.width;
  const H = f.height;
  const pad = L.pad;

  const logo = brandLogoSize(L);
  const brandLogo = {
    x: pad,
    y: pad,
    w: logo.w,
    h: logo.h,
  };

  let ratingPill = null;
  if (data?.ratingText) {
    const r = ratingPillSize(data.ratingText, L);
    ratingPill = {
      text: data.ratingText,
      x: W - pad - r.w,
      y: pad,
      w: r.w,
      h: r.h,
      size: L.ratingSize,
      padX: L.ratingPadX,
    };
  }

  const priced = data?.priced === true;
  const price = pricePillSize(data?.priceText || '', priced, L);
  const pricePillBase = {
    text: data?.priceText || '',
    priced,
    w: price.w,
    h: price.h,
    priceSize: L.priceSize,
    desdeSize: L.desdeSize,
    porSize: L.porSize,
    padX: L.pricePadX,
    padY: L.pricePadY,
    desdeGap: L.desdeGap,
    rowGap: L.priceRowGap,
  };

  // Ancho del texto: si el precio va al lado (Horizontal), la columna
  // es lo que queda tras reservar la pastilla; si va debajo (Historia
  // y Post), el texto usa todo el ancho.
  const textW = L.priceBeside
    ? W - pad * 2 - price.w - L.colGap
    : W - pad * 2;

  const fittedTitle = fitExperienceShareCardTitle(
    data?.title || '',
    textW,
    L,
    L.titleSize,
  );
  const titleLines = fittedTitle.lines;
  const titleSize = fittedTitle.size;
  const descLines = data?.description
    ? wrapShareCardText(data.description, textW, L.descSize, L.descMaxLines, 600)
    : [];
  const dataLines = data?.dataLine
    ? wrapShareCardText(data.dataLine, textW, L.dataSize, L.dataMaxLines, 600)
    : [];

  const cityLine = data?.cityLine || '';
  // Pin y etiqueta por separado (PR #177); si los datos vienen de un
  // llamador viejo sin cityPin/cityLabel, se parten de cityLine.
  const cityPin = data?.cityPin ?? (cityLine.startsWith('📍') ? '📍' : '');
  const cityLabel =
    data?.cityLabel ?? cityLine.replace(/^📍\s*/, '');
  const city = cityLine ? cityPillSize(cityPin, cityLabel, L) : null;

  const items = [];
  if (city) items.push({ kind: 'city', h: city.h, gap: 0 });
  if (titleLines.length) {
    items.push({ kind: 'title', h: titleLines.length * titleSize * L.titleLineH, gap: L.titleGap });
  }
  if (descLines.length) {
    items.push({ kind: 'desc', h: descLines.length * L.descSize * L.descLineH, gap: L.descGap });
  }
  if (dataLines.length) {
    items.push({ kind: 'data', h: dataLines.length * L.dataSize * L.dataLineH, gap: L.dataGap });
  }
  if (!L.priceBeside) items.push({ kind: 'price', h: price.h, gap: L.priceGap });
  const blockH = items.reduce((sum, it, i) => sum + it.h + (i > 0 ? it.gap : 0), 0);
  const blockBottom = H - pad;
  const blockTop = blockBottom - blockH;

  // Foto: en Historia (PR #177) es un bloque centrado con márgenes,
  // como en eventos; en Post y Horizontal sigue a sangre completa.
  let photo;
  if (L.centeredPhoto) {
    const photoY = pad + L.logoH + L.logoGap;
    const photoH = Math.max(L.photoMinH, blockTop - L.photoGap - photoY);
    photo = { x: pad, y: photoY, w: W - pad * 2, h: photoH, radius: L.photoRadius };
  } else {
    photo = { x: 0, y: 0, w: W, h: H, radius: 0 };
  }

  let y = blockTop;
  let started = false;
  const step = (gap) => {
    if (started) y += gap;
    started = true;
  };

  let cityPill = null;
  if (city) {
    step(0);
    cityPill = {
      text: cityLine,
      pin: cityPin,
      label: cityLabel,
      pinW: city.pinW,
      pinGap: city.pinGap,
      x: pad,
      y,
      w: city.w,
      h: city.h,
      size: L.citySize,
      padX: L.cityPadX,
    };
    y += city.h;
  }

  let title = null;
  if (titleLines.length) {
    step(L.titleGap);
    title = {
      lines: titleLines,
      x: pad,
      y: y + (titleSize * L.titleLineH) / 2,
      size: titleSize,
      lineH: titleSize * L.titleLineH,
    };
    y += titleLines.length * titleSize * L.titleLineH;
  }

  let desc = null;
  if (descLines.length) {
    step(L.descGap);
    desc = {
      lines: descLines,
      x: pad,
      y: y + (L.descSize * L.descLineH) / 2,
      size: L.descSize,
      lineH: L.descSize * L.descLineH,
    };
    y += descLines.length * L.descSize * L.descLineH;
  }

  let dataRows = null;
  if (dataLines.length) {
    step(L.dataGap);
    dataRows = {
      lines: dataLines,
      x: pad,
      y: y + (L.dataSize * L.dataLineH) / 2,
      size: L.dataSize,
      lineH: L.dataSize * L.dataLineH,
    };
    y += dataLines.length * L.dataSize * L.dataLineH;
  }

  let pricePill;
  if (L.priceBeside) {
    // Al lado del texto (Horizontal): a la derecha, con la base
    // alineada con la del bloque de texto, como en la demo.
    pricePill = { ...pricePillBase, x: W - pad - price.w, y: blockBottom - price.h };
  } else {
    step(L.priceGap);
    pricePill = { ...pricePillBase, x: W - pad - price.w, y };
  }

  return {
    format: f,
    L,
    width: W,
    height: H,
    brandLogo,
    ratingPill,
    cityPill,
    title,
    desc,
    dataRows,
    pricePill,
    photo,
  };
}

// ─── Dibujo en canvas ───

function drawLeftLines(ctx, block, { color, weight }) {
  if (!block) return;
  ctx.font = `${weight} ${block.size}px ${SHARE_CARD_FONT_STACK}`;
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  block.lines.forEach((line, i) => {
    ctx.fillText(line, block.x, block.y + i * block.lineH);
  });
}

// Dibuja un texto con su CAJA VISUAL (tinta) centrada verticalmente en
// centerY (PR #177): la línea base se ajusta con las medidas reales de
// la tinta (actualBoundingBoxAscent/Descent), así el pin 📍 —que no
// tiene descendente— y la etiqueta —con la «y» de Playa— quedan cada
// uno centrados, no solo el cuadro del em. Con textBaseline
// 'alphabetic' a la mitad de la pastilla, la tinta quedaba desplazada
// hacia arriba. Sin métricas de tinta (contextos simulados), se usa
// textBaseline 'middle' como aproximación.
function drawInkCenteredText(ctx, text, x, centerY) {
  // La tinta se mide SIEMPRE con la línea base alfabética: los
  // valores actualBoundingBox* se miden desde la línea base ACTIVA
  // del contexto, no siempre desde la alfabética. Si quien llama dejó
  // 'middle' (como la sección de la pastilla de precio), la medida
  // salía desplazada ~17 px a 56 px y el texto también — por eso la
  // pastilla «Gratis» salía arriba aunque usara este helper. Se fija
  // la base ANTES de medir, no solo antes de dibujar.
  ctx.textBaseline = 'alphabetic';
  const m = ctx.measureText(text);
  const asc = m.actualBoundingBoxAscent;
  const desc = m.actualBoundingBoxDescent;
  if (Number.isFinite(asc) && Number.isFinite(desc)) {
    ctx.fillText(text, x, centerY + (asc - desc) / 2);
  } else {
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, centerY);
  }
}

export function drawExperienceShareCardCanvas(data, format, assets, layout) {
  const geo = layout || computeExperienceShareCardLayout(data, format);
  const { L } = geo;
  const canvas = document.createElement('canvas');
  canvas.width = geo.width;
  canvas.height = geo.height;
  const ctx = canvas.getContext('2d');

  if (L.centeredPhoto) {
    // Historia (PR #177): fondo oscuro (igual que la tarjeta de
    // eventos) y la foto en un bloque centrado con esquinas
    // redondeadas; el texto blanco y el logo blanco se leen sobre el
    // fondo, no sobre la foto. Sin foto, el bloque oscuro con la
    // inicial, nunca una tarjeta en blanco ni un hueco roto.
    const bg = ctx.createLinearGradient(0, 0, 0, geo.height);
    bg.addColorStop(0, '#1B1B1B');
    bg.addColorStop(1, '#0B0B0B');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, geo.width, geo.height);
    const p = geo.photo;
    ctx.save();
    roundRectPath(ctx, p.x, p.y, p.w, p.h, p.radius);
    ctx.clip();
    if (assets?.photo) {
      drawCoverImage(ctx, assets.photo, p.x, p.y, p.w, p.h);
    } else {
      ctx.fillStyle = '#262626';
      ctx.fillRect(p.x, p.y, p.w, p.h);
      const initial = (data?.title || 'C').trim().charAt(0).toUpperCase() || 'C';
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = `800 ${Math.round(Math.min(p.w, p.h) * 0.3)}px ${SHARE_CARD_FONT_STACK}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(initial, p.x + p.w / 2, p.y + p.h / 2);
    }
    ctx.restore();
  } else {
    // Foto a sangre completa; sin foto, degradado oscuro con la inicial.
    if (assets?.photo) {
      drawCoverImage(ctx, assets.photo, 0, 0, geo.width, geo.height);
    } else {
      const bg = ctx.createLinearGradient(0, 0, 0, geo.height);
      bg.addColorStop(0, '#262626');
      bg.addColorStop(1, '#111111');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, geo.width, geo.height);
      const initial = (data?.title || 'C').trim().charAt(0).toUpperCase() || 'C';
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = `800 ${Math.round(Math.min(geo.width, geo.height) * 0.3)}px ${SHARE_CARD_FONT_STACK}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(initial, geo.width / 2, geo.height * 0.35);
    }

    // Degradados para que se lea el texto: arriba detrás de las
    // pastillas, abajo detrás del bloque de texto.
    const topH = Math.round(geo.height * L.gradTopH);
    const topGrad = ctx.createLinearGradient(0, 0, 0, topH);
    topGrad.addColorStop(0, 'rgba(0,0,0,0.5)');
    topGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, geo.width, topH);

    const botH = Math.round(geo.height * L.gradBottomH);
    const botGrad = ctx.createLinearGradient(0, geo.height - botH, 0, geo.height);
    botGrad.addColorStop(0, 'rgba(0,0,0,0)');
    botGrad.addColorStop(1, 'rgba(0,0,0,0.88)');
    ctx.fillStyle = botGrad;
    ctx.fillRect(0, geo.height - botH, geo.width, botH);
  }

  // Logotipo oficial arriba a la izquierda, en blanco sobre la foto
  // (el PNG ya es blanco sobre transparente): si no cargó, la tarjeta
  // sale sin marca, como en negocios.
  if (assets?.logo) {
    const bl = geo.brandLogo;
    ctx.drawImage(assets.logo, bl.x, bl.y, bl.w, bl.h);
  }

  // Pastilla de calificación (arriba a la derecha): blanca, estrella
  // ámbar, solo si la calificación es real. Estrella y texto se
  // dibujan por separado, cada uno centrado por su caja visual
  // (drawInkCenteredText, 2º commit del PR #177): con fillText a la
  // mitad de la pastilla y textBaseline alfabético, la tinta quedaba
  // desplazada hacia arriba, igual que pasaba con la pastilla glass.
  if (geo.ratingPill) {
    const rp = geo.ratingPill;
    ctx.fillStyle = '#FFFFFF';
    roundRectPath(ctx, rp.x, rp.y, rp.w, rp.h, rp.h / 2);
    ctx.fill();
    const centerY = rp.y + rp.h / 2;
    ctx.font = `800 ${rp.size}px ${SHARE_CARD_FONT_STACK}`;
    ctx.fillStyle = STAR;
    ctx.textAlign = 'left';
    drawInkCenteredText(ctx, '★', rp.x + rp.padX, centerY);
    const starW = ctx.measureText('★').width;
    ctx.font = `600 ${rp.size}px ${SHARE_CARD_FONT_STACK}`;
    ctx.fillStyle = '#111827';
    drawInkCenteredText(ctx, rp.text, rp.x + rp.padX + starW + 6, centerY);
  }

  // Pastilla GLASS de ciudad · tipo, encima del título: fondo
  // translúcido + borde claro (como el estilo glass de negocios);
  // la pastilla de precio sigue AZUL sólida. Pin y etiqueta se dibujan
  // por separado, cada uno centrado por su caja visual (PR #177):
  // con un solo fillText a la mitad de la pastilla, la tinta quedaba
  // desplazada hacia arriba.
  if (geo.cityPill) {
    const cp = geo.cityPill;
    ctx.fillStyle = EXPERIENCE_SHARE_CARD_GLASS_BG;
    roundRectPath(ctx, cp.x, cp.y, cp.w, cp.h, cp.h / 2);
    ctx.fill();
    ctx.strokeStyle = EXPERIENCE_SHARE_CARD_GLASS_BORDER;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = `600 ${cp.size}px ${SHARE_CARD_FONT_STACK}`;
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    const centerY = cp.y + cp.h / 2;
    if (cp.pin) {
      drawInkCenteredText(ctx, cp.pin, cp.x + cp.padX, centerY);
      drawInkCenteredText(
        ctx,
        cp.label,
        cp.x + cp.padX + cp.pinW + cp.pinGap,
        centerY,
      );
    } else {
      drawInkCenteredText(ctx, cp.label, cp.x + cp.padX, centerY);
    }
  }

  // Título: blanco, a la izquierda, con letter-spacing -1 como la demo.
  if (geo.title) {
    const n = geo.title;
    ctx.font = `800 ${n.size}px ${SHARE_CARD_FONT_STACK}`;
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    n.lines.forEach((line, i) => {
      drawSpacedText(ctx, line, n.x, n.y + i * n.lineH, -1);
    });
  }

  drawLeftLines(ctx, geo.desc, {
    color: 'rgba(255,255,255,0.75)',
    weight: 600,
  });
  drawLeftLines(ctx, geo.dataRows, {
    color: 'rgba(255,255,255,0.85)',
    weight: 600,
  });

  // Pastilla de precio AZUL protagonista (como la demo): «DESDE» chico
  // arriba, precio grande y «por persona» chico en la misma línea; si
  // es gratis, solo «Gratis».
  const pill = geo.pricePill;
  ctx.fillStyle = EXPERIENCE_SHARE_CARD_BLUE;
  roundRectPath(ctx, pill.x, pill.y, pill.w, pill.h, pill.h / 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  if (pill.priced) {
    ctx.font = `800 ${pill.desdeSize}px ${SHARE_CARD_FONT_STACK}`;
    ctx.fillText('DESDE', pill.x + pill.padX, pill.y + pill.padY + pill.desdeSize / 2);
    const priceY =
      pill.y + pill.padY + pill.desdeSize + pill.desdeGap + pill.priceSize / 2;
    ctx.font = `800 ${pill.priceSize}px ${SHARE_CARD_FONT_STACK}`;
    ctx.fillText(pill.text, pill.x + pill.padX, priceY);
    const priceW = ctx.measureText(pill.text).width;
    ctx.font = `600 ${pill.porSize}px ${SHARE_CARD_FONT_STACK}`;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText(
      'por persona',
      pill.x + pill.padX + priceW + pill.rowGap,
      priceY,
    );
  } else {
    // «Gratis» (una sola línea) también se centra por su caja visual
    // (2º commit del PR #177): con textBaseline 'middle' la tinta
    // quedaba desplazada; drawInkCenteredText la centra por la tinta
    // real, como en la pastilla glass. La rama con precio (DESDE +
    // precio + «por persona», dos filas con posiciones propias) no se
    // toca: no es una sola línea centrada en la pastilla.
    ctx.font = `800 ${pill.priceSize}px ${SHARE_CARD_FONT_STACK}`;
    drawInkCenteredText(ctx, pill.text, pill.x + pill.padX, pill.y + pill.h / 2);
  }

  return canvas;
}

export async function renderExperienceShareCardCanvas(data, format) {
  const [photo, logo] = await Promise.all([
    loadShareCardPhoto(data?.photoUrl),
    loadShareCardLogoWhite(),
  ]);
  const layout = computeExperienceShareCardLayout(data, format);
  return drawExperienceShareCardCanvas(data, format, { photo, logo }, layout);
}

// Genera el PNG de la tarjeta del artículo dibujando en canvas (nada de
// DOM ni de html-to-image): lo que se descarga es lo mismo que la vista
// previa, y el guarda anti-blanco impide descargar un PNG vacío.
export async function exportExperienceShareCardPng(data, format) {
  const canvas = await renderExperienceShareCardCanvas(data, format);
  assertCanvasNotBlank(canvas);
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('empty-blob'))),
      'image/png',
    );
  });
  return blob;
}
