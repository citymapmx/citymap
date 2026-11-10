// Tarjeta para compartir el ARTÍCULO / experiencia de Revista: lo mismo
// que la tarjeta de eventos (PR #152) y la de negocios (PRs #142–#147)
// pero con los datos de la fila de `experiences` y los 2 estilos que
// eligió Jonathan de la demo `propuestas-de-tarjetas-para-articulos`:
// «Foto completa» (la foto llena la tarjeta y el precio va en una
// pastilla protagonista, fondo oscuro) y «Dividida» (foto a la izquierda
// y ficha de datos a la derecha, fondo claro). Los dos formatos de
// siempre: Historia 1080×1920 y Post 1080×1080.
//
// Reutiliza TODA la base de la tarjeta de negocios (lib/shareCard.js):
// los dos formatos, el logotipo oficial, la exportación a canvas 2D
// (nada de html-to-image: el PNG salía transparente, PR #143), la foto
// flexible que llena su franja, el guarda anti-blanco y los helpers de
// medición/dibujo. Sin círculo de logo (eso es solo para negocios con
// plan de pago, PR #144).
//
// La vista previa (ExperienceShareCardTemplate.jsx) y el PNG comparten
// UNA sola geometría: EXPERIENCE_SHARE_CARD_LAYOUT +
// computeExperienceShareCardLayout, igual que la de eventos. Si el
// artículo no tiene foto, la tarjeta usa el bloque con la inicial, nunca
// una tarjeta en blanco ni un hueco roto.
//
// Contenido REAL de la fila, nunca inventado: imagen (`gallery[0]`),
// título, ciudad (de `city_slug`), parte de la descripción (sin HTML y
// recortada), datos del tour (duración, idiomas y personas si hay) y
// precio (`price`; 0 → «Gratis»). La calificación SOLO si es real
// (`rating > 0` y `review_count > 0`): la demo mostraba un
// «4.9 · 13,275 reseñas» ilustrativo que NO existe en la base (el tour
// de ejemplo no tiene reseñas) — aquí nunca se inventa. El enlace que se
// comparte es la URL del detalle: /revista/:ciudad/:slug.
import { createSlug } from './utils.js';
import { formatReviewCount } from './googleRatings.js';
import {
  SHARE_CARD_FORMATS,
  SHARE_CARD_FONT_STACK,
  measureShareCardText,
  wrapShareCardName,
  wrapShareCardText,
  truncateShareCardText,
  loadShareCardPhoto,
  loadShareCardLogoWhite,
  loadShareCardLogoDark,
  drawCoverImage,
  roundRectPath,
  spacedWidth,
  drawSpacedText,
  assertCanvasNotBlank,
} from './shareCard.js';

// Los formatos (Historia/Post) son los mismos de la tarjeta de negocios.
export { SHARE_CARD_FORMATS } from './shareCard.js';

export const EXPERIENCE_SHARE_CARD_STYLES = {
  foto: { id: 'foto', label: 'Foto completa' },
  dividida: { id: 'dividida', label: 'Dividida' },
};
export const EXPERIENCE_SHARE_CARD_STYLE_LIST = [
  EXPERIENCE_SHARE_CARD_STYLES.foto,
  EXPERIENCE_SHARE_CARD_STYLES.dividida,
];
export const EXPERIENCE_SHARE_CARD_DEFAULT_STYLE = 'foto';

export function resolveExperienceShareCardStyle(styleId) {
  return styleId === 'dividida'
    ? EXPERIENCE_SHARE_CARD_STYLES.dividida
    : EXPERIENCE_SHARE_CARD_STYLES.foto;
}

// Geometría de la tarjeta de artículo, por estilo y formato. La base
// de «foto» es la de eventos (EVENT_SHARE_CARD_LAYOUT): logo, foto
// flexible que se come el espacio libre, título, ciudad, descripción,
// datos del tour, pastilla de precio protagonista y pie. La de
// «dividida» es una ficha clara: logo, fila dividida (foto a la
// izquierda, columna de datos a la derecha centrada en vertical) y pie;
// la foto llena toda la altura de la fila y la columna de datos se
// centra en ella, así nunca queda hueco vacío en ningún formato.
export const EXPERIENCE_SHARE_CARD_LAYOUT = {
  foto: {
    story: {
      pad: 64,
      logoH: 56,
      logoGap: 32,
      photoRadius: 40,
      photoMinH: 700,
      titleSize: 76,
      titleMinSize: 48,
      titleGap: 18,
      titleLineH: 1.12,
      titleMaxLines: 3,
      citySize: 34,
      cityGap: 16,
      descSize: 36,
      descGap: 16,
      descLineH: 1.35,
      descMaxLines: 2,
      dataSize: 34,
      dataGap: 18,
      dataLineH: 1.4,
      dataMaxLines: 2,
      priceSize: 44,
      pricePadX: 36,
      pricePadY: 16,
      priceGap: 24,
      footSize: 30,
      footGap: 44,
    },
    post: {
      pad: 48,
      logoH: 44,
      logoGap: 24,
      photoRadius: 32,
      photoMinH: 300,
      titleSize: 60,
      titleMinSize: 40,
      titleGap: 14,
      titleLineH: 1.12,
      titleMaxLines: 3,
      citySize: 30,
      cityGap: 14,
      descSize: 32,
      descGap: 14,
      descLineH: 1.35,
      descMaxLines: 2,
      dataSize: 30,
      dataGap: 14,
      dataLineH: 1.4,
      dataMaxLines: 2,
      priceSize: 38,
      pricePadX: 30,
      pricePadY: 14,
      priceGap: 20,
      footSize: 26,
      footGap: 36,
    },
  },
  dividida: {
    story: {
      pad: 64,
      logoH: 56,
      logoGap: 32,
      photoRadius: 32,
      photoW: 480,
      colGap: 32,
      titleSize: 52,
      titleMinSize: 36,
      titleGap: 20,
      titleLineH: 1.12,
      titleMaxLines: 4,
      citySize: 32,
      cityGap: 16,
      descSize: 32,
      descGap: 16,
      descLineH: 1.4,
      descMaxLines: 3,
      dataSize: 30,
      dataGap: 16,
      dataLineH: 1.4,
      dataMaxLines: 2,
      priceSize: 44,
      pricePadX: 34,
      pricePadY: 16,
      priceGap: 26,
      footSize: 30,
      footGap: 44,
    },
    post: {
      pad: 48,
      logoH: 44,
      logoGap: 24,
      photoRadius: 28,
      photoW: 400,
      colGap: 28,
      titleSize: 44,
      titleMinSize: 32,
      titleGap: 16,
      titleLineH: 1.12,
      titleMaxLines: 4,
      citySize: 28,
      cityGap: 14,
      descSize: 28,
      descGap: 14,
      descLineH: 1.4,
      descMaxLines: 3,
      dataSize: 26,
      dataGap: 14,
      dataLineH: 1.4,
      dataMaxLines: 2,
      priceSize: 36,
      pricePadX: 30,
      pricePadY: 14,
      priceGap: 22,
      footSize: 26,
      footGap: 36,
    },
  },
};

// ─── Datos que lleva la tarjeta (solo de la fila) ───

// La descripción de la base trae HTML (<h2>, <p>…): se quitan las
// etiquetas y se colapsa el espacio; el layout la parte a 2 líneas
// («foto») o 3 («dividida») como máximo.
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
  // el 4.9 de la demo).
  const hasRating =
    Number.isFinite(rating) &&
    rating > 0 &&
    Number.isFinite(reviewCount) &&
    reviewCount > 0;
  const dataParts = [];
  if (String(exp?.duration || '').trim()) dataParts.push(`⏱ ${String(exp.duration).trim()}`);
  if (String(exp?.languages || '').trim()) dataParts.push(String(exp.languages).trim());
  if (String(exp?.people || '').trim()) dataParts.push(String(exp.people).trim());
  const city = (cityName || '').trim();
  return {
    photoUrl:
      (Array.isArray(exp?.gallery) && exp.gallery[0]) ||
      exp?.img_url ||
      exp?.img ||
      null,
    title: (exp?.title || '').trim(),
    cityName: city,
    cityLine: city ? `📍 ${city}` : '',
    ratingText: hasRating
      ? `★ ${rating.toFixed(1)} (${formatReviewCount(reviewCount)})`
      : '',
    description: experienceExcerpt(exp?.description),
    dataLine: dataParts.join(' · '),
    priceText: experienceShareCardPriceText(exp),
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

// ─── Geometría (vista previa y canvas dibujan lo mismo) ───

function pricePillSize(priceText, L) {
  const w = measureShareCardText(priceText, L.priceSize, 800) + L.pricePadX * 2;
  return { w, h: L.priceSize + L.pricePadY * 2 };
}

function computeFotoLayout(data, f, L) {
  const W = f.width;
  const H = f.height;
  const maxW = W - L.pad * 2;

  const logoW = Math.round(L.logoH * (400 / 120));
  const logo = { x: Math.round((W - logoW) / 2), y: L.pad, w: logoW, h: L.logoH };

  const fittedTitle = fitExperienceShareCardTitle(
    data?.title || '',
    maxW,
    L,
    L.titleSize,
  );
  const titleLines = fittedTitle.lines;
  const fittedTitleSize = fittedTitle.size;

  const cityLine = data?.cityLine
    ? truncateShareCardText(data.cityLine, maxW, L.citySize, 600)
    : '';
  const ratingLine = data?.ratingText
    ? truncateShareCardText(data.ratingText, maxW, L.citySize, 600)
    : '';
  const descLines = data?.description
    ? wrapShareCardText(data.description, maxW, L.descSize, L.descMaxLines, 600)
    : [];
  const dataLines = data?.dataLine
    ? wrapShareCardText(data.dataLine, maxW, L.dataSize, L.dataMaxLines, 600)
    : [];

  const price = pricePillSize(data?.priceText || '', L);

  const titleBlockH = titleLines.length * fittedTitleSize * L.titleLineH;
  const titleBlock = titleLines.length ? L.titleGap + titleBlockH : 0;
  const cityBlockH = cityLine ? L.citySize * L.titleLineH : 0;
  const cityBlock = cityLine ? L.cityGap + cityBlockH : 0;
  const ratingBlockH = ratingLine ? L.citySize * L.titleLineH : 0;
  const ratingBlock = ratingLine ? L.cityGap + ratingBlockH : 0;
  const descBlockH = descLines.length * L.descSize * L.descLineH;
  const descBlock = descLines.length ? L.descGap + descBlockH : 0;
  const dataBlockH = dataLines.length * L.dataSize * L.dataLineH;
  const dataBlock = dataLines.length ? L.dataGap + dataBlockH : 0;
  const priceBlock = L.priceGap + price.h;
  const footBlock = L.footGap + L.footSize;

  const photoH = Math.max(
    L.photoMinH,
    H -
      L.pad * 2 -
      (L.logoH + L.logoGap) -
      titleBlock -
      cityBlock -
      ratingBlock -
      descBlock -
      dataBlock -
      priceBlock -
      footBlock,
  );

  let y = L.pad + L.logoH + L.logoGap;
  const photo = { x: L.pad, y, w: maxW, h: photoH, radius: L.photoRadius };
  y += photoH;

  let firstGap = null;
  const gapAfter = (g) => {
    if (firstGap === null) firstGap = g;
    return g;
  };

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

  let city = null;
  if (cityLine) {
    const g = gapAfter(L.cityGap);
    y += g;
    city = { text: cityLine, x: W / 2, y: y + (L.citySize * L.titleLineH) / 2, size: L.citySize };
    y += cityBlockH;
  }

  let rating = null;
  if (ratingLine) {
    const g = gapAfter(L.cityGap);
    y += g;
    rating = { text: ratingLine, x: W / 2, y: y + (L.citySize * L.titleLineH) / 2, size: L.citySize };
    y += ratingBlockH;
  }

  let desc = null;
  if (descLines.length) {
    const g = gapAfter(L.descGap);
    y += g;
    desc = {
      lines: descLines,
      x: W / 2,
      y: y + (L.descSize * L.descLineH) / 2,
      size: L.descSize,
      lineH: L.descSize * L.descLineH,
    };
    y += descBlockH;
  }

  let dataRows = null;
  if (dataLines.length) {
    const g = gapAfter(L.dataGap);
    y += g;
    dataRows = {
      lines: dataLines,
      x: W / 2,
      y: y + (L.dataSize * L.dataLineH) / 2,
      size: L.dataSize,
      lineH: L.dataSize * L.dataLineH,
    };
    y += dataBlockH;
  }

  // La pastilla de precio siempre existe (el precio es «Gratis» como
  // mínimo): es el último bloque antes del pie.
  const priceGap = gapAfter(L.priceGap);
  const pricePill = {
    text: data?.priceText || '',
    // Sin redondear: x + w / 2 es exactamente el centro (con
    // Math.round la píldora quedaba 0,5 px descentrada en Post).
    x: (W - price.w) / 2,
    y: y + priceGap,
    w: price.w,
    h: price.h,
  };

  const footer = { y: H - L.pad - L.footSize / 2, size: L.footSize };
  return {
    format: f,
    L,
    style: 'foto',
    width: W,
    height: H,
    logo,
    photo,
    firstGap,
    title,
    city,
    rating,
    desc,
    dataRows,
    pricePill,
    footer,
  };
}

function computeDivididaLayout(data, f, L) {
  const W = f.width;
  const H = f.height;

  const logoW = Math.round(L.logoH * (400 / 120));
  const logo = { x: Math.round((W - logoW) / 2), y: L.pad, w: logoW, h: L.logoH };

  const splitY = L.pad + L.logoH + L.logoGap;
  const splitH = H - L.pad * 2 - (L.logoH + L.logoGap) - (L.footGap + L.footSize);
  const split = { x: L.pad, y: splitY, w: W - L.pad * 2, h: splitH };
  const photo = { x: L.pad, y: splitY, w: L.photoW, h: splitH, radius: L.photoRadius };

  const colX = L.pad + L.photoW + L.colGap;
  const colW = W - L.pad - colX;

  const fittedTitle = fitExperienceShareCardTitle(
    data?.title || '',
    colW,
    L,
    L.titleSize,
  );
  const titleLines = fittedTitle.lines;
  const fittedTitleSize = fittedTitle.size;

  const cityLine = data?.cityLine
    ? truncateShareCardText(data.cityLine, colW, L.citySize, 600)
    : '';
  const ratingLine = data?.ratingText
    ? truncateShareCardText(data.ratingText, colW, L.citySize, 600)
    : '';
  const descLines = data?.description
    ? wrapShareCardText(data.description, colW, L.descSize, L.descMaxLines, 600)
    : [];
  const dataLines = data?.dataLine
    ? wrapShareCardText(data.dataLine, colW, L.dataSize, L.dataMaxLines, 600)
    : [];
  const price = pricePillSize(data?.priceText || '', L);

  const titleBlockH = titleLines.length * fittedTitleSize * L.titleLineH;
  const cityBlockH = cityLine ? L.citySize * L.titleLineH : 0;
  const ratingBlockH = ratingLine ? L.citySize * L.titleLineH : 0;
  const descBlockH = descLines.length * L.descSize * L.descLineH;
  const dataBlockH = dataLines.length * L.dataSize * L.dataLineH;
  // Contenido de la columna: bloques + huecos ENTRE bloques (el primero
  // no lleva hueco: la columna se centra en la fila dividida).
  const contentH =
    titleBlockH +
    (cityLine ? L.titleGap + cityBlockH : 0) +
    (ratingLine ? L.cityGap + ratingBlockH : 0) +
    (descLines.length ? L.descGap + descBlockH : 0) +
    (dataLines.length ? L.dataGap + dataBlockH : 0) +
    L.priceGap +
    price.h;
  let y = splitY + Math.max(0, (splitH - contentH) / 2);

  let title = null;
  if (titleLines.length) {
    title = {
      lines: titleLines,
      x: colX,
      y: y + (fittedTitleSize * L.titleLineH) / 2,
      size: fittedTitleSize,
      lineH: fittedTitleSize * L.titleLineH,
    };
    y += titleBlockH;
  }

  let city = null;
  if (cityLine) {
    y += L.titleGap;
    city = { text: cityLine, x: colX, y: y + (L.citySize * L.titleLineH) / 2, size: L.citySize };
    y += cityBlockH;
  }

  let rating = null;
  if (ratingLine) {
    y += L.cityGap;
    rating = { text: ratingLine, x: colX, y: y + (L.citySize * L.titleLineH) / 2, size: L.citySize };
    y += ratingBlockH;
  }

  let desc = null;
  if (descLines.length) {
    y += L.descGap;
    desc = {
      lines: descLines,
      x: colX,
      y: y + (L.descSize * L.descLineH) / 2,
      size: L.descSize,
      lineH: L.descSize * L.descLineH,
    };
    y += descBlockH;
  }

  let dataRows = null;
  if (dataLines.length) {
    y += L.dataGap;
    dataRows = {
      lines: dataLines,
      x: colX,
      y: y + (L.dataSize * L.dataLineH) / 2,
      size: L.dataSize,
      lineH: L.dataSize * L.dataLineH,
    };
    y += dataBlockH;
  }

  y += L.priceGap;
  const pricePill = {
    text: data?.priceText || '',
    x: colX,
    y,
    w: price.w,
    h: price.h,
  };

  const footer = { y: H - L.pad - L.footSize / 2, size: L.footSize };
  return {
    format: f,
    L,
    style: 'dividida',
    width: W,
    height: H,
    logo,
    photo,
    split,
    firstGap: null,
    title,
    city,
    rating,
    desc,
    dataRows,
    pricePill,
    footer,
  };
}

// Geometría completa de la tarjeta de artículo. La foto es el único
// bloque flexible en «foto»: su alto es todo lo que sobra tras reservar
// logo, textos, pastilla de precio y pie, con photoMinH como mínimo —
// por eso nunca queda hueco vacío. En «dividida» la foto llena toda la
// altura de la fila dividida y la columna de datos se centra en ella.
// Las `y` de título, ciudad, descripción y datos son el CENTRO vertical
// del texto (el canvas dibuja con textBaseline 'middle'), igual que en
// la tarjeta de negocios y en la de eventos.
export function computeExperienceShareCardLayout(data, format, styleId = 'foto') {
  const style = resolveExperienceShareCardStyle(styleId).id;
  const f = format || SHARE_CARD_FORMATS.story;
  const table = EXPERIENCE_SHARE_CARD_LAYOUT[style] || EXPERIENCE_SHARE_CARD_LAYOUT.foto;
  const L = table[f.id] || table.story;
  if (style === 'dividida') return computeDivididaLayout(data, f, L);
  return computeFotoLayout(data, f, L);
}

// ─── Dibujo en canvas ───

function drawFooter(ctx, geo) {
  const f = geo.footer;
  const dark = geo.style === 'dividida';
  const run1 = 'Descúbrelo en ';
  const run2 = 'CityMap';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `400 ${f.size}px ${SHARE_CARD_FONT_STACK}`;
  const w1 = spacedWidth(ctx, run1, 2);
  ctx.font = `800 ${f.size}px ${SHARE_CARD_FONT_STACK}`;
  const w2 = spacedWidth(ctx, run2, 2);
  const total = w1 + 2 + w2;
  const fx = geo.width / 2 - total / 2;
  ctx.font = `400 ${f.size}px ${SHARE_CARD_FONT_STACK}`;
  ctx.fillStyle = dark ? '#9CA3AF' : '#A3A3A3';
  drawSpacedText(ctx, run1, fx, f.y, 2);
  ctx.font = `800 ${f.size}px ${SHARE_CARD_FONT_STACK}`;
  ctx.fillStyle = dark ? '#111111' : '#FFFFFF';
  drawSpacedText(ctx, run2, fx + w1 + 2, f.y, 2);
}

function drawPhotoBlock(ctx, data, geo, assets) {
  const { L } = geo;
  const p = geo.photo;
  ctx.save();
  roundRectPath(ctx, p.x, p.y, p.w, p.h, p.radius);
  ctx.clip();
  if (assets?.photo) {
    drawCoverImage(ctx, assets.photo, p.x, p.y, p.w, p.h);
  } else {
    ctx.fillStyle = geo.style === 'dividida' ? '#E5E7EB' : '#262626';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    const initial = (data?.title || 'C').trim().charAt(0).toUpperCase() || 'C';
    ctx.fillStyle =
      geo.style === 'dividida' ? 'rgba(17,17,17,0.35)' : 'rgba(255,255,255,0.35)';
    ctx.font = `800 ${Math.round(Math.min(p.w, p.h) * 0.4)}px ${SHARE_CARD_FONT_STACK}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initial, p.x + p.w / 2, p.y + p.h / 2);
  }
  ctx.restore();
}

function drawTextLines(ctx, block, { color, weight, align = 'center' }) {
  if (!block) return;
  ctx.font = `${weight} ${block.size}px ${SHARE_CARD_FONT_STACK}`;
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  block.lines.forEach((line, i) => {
    const w = ctx.measureText(line).width;
    const x = align === 'center' ? block.x - w / 2 : block.x;
    ctx.fillText(line, x, block.y + i * block.lineH);
  });
}

export function drawExperienceShareCardCanvas(data, format, assets, layout, styleId = 'foto') {
  const geo = layout || computeExperienceShareCardLayout(data, format, styleId);
  const { L } = geo;
  const dark = geo.style === 'dividida';
  const canvas = document.createElement('canvas');
  canvas.width = geo.width;
  canvas.height = geo.height;
  const ctx = canvas.getContext('2d');

  if (dark) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, geo.width, geo.height);
  } else {
    const bg = ctx.createLinearGradient(0, 0, 0, geo.height);
    bg.addColorStop(0, '#1B1B1B');
    bg.addColorStop(1, '#0B0B0B');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, geo.width, geo.height);
  }

  // Logotipo oficial: blanco en «foto», oscuro en «dividida» (el PNG es
  // blanco y no se vería sobre fondo blanco, igual que en Editorial).
  const logoImg = dark ? assets?.logoDark : assets?.logoWhite;
  if (logoImg) {
    ctx.drawImage(logoImg, geo.logo.x, geo.logo.y, geo.logo.w, geo.logo.h);
  }

  drawPhotoBlock(ctx, data, geo, assets);

  // Título: centrado en «foto», a la izquierda en «dividida».
  if (geo.title) {
    const n = geo.title;
    ctx.font = `800 ${n.size}px ${SHARE_CARD_FONT_STACK}`;
    ctx.fillStyle = dark ? '#111111' : '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    n.lines.forEach((line, i) => {
      const w = spacedWidth(ctx, line, -1);
      const x = dark ? n.x : n.x - w / 2;
      drawSpacedText(ctx, line, x, n.y + i * n.lineH, -1);
    });
  }

  // Ciudad y calificación: centradas en «foto», a la izquierda en
  // «dividida». En canvas no hay textAlign center con x absoluta: se
  // mide y se centra a mano en «foto».
  if (geo.city) {
    const c = geo.city;
    ctx.font = `600 ${c.size}px ${SHARE_CARD_FONT_STACK}`;
    ctx.fillStyle = dark ? '#6B7280' : 'rgba(255,255,255,0.85)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const w = ctx.measureText(c.text).width;
    ctx.fillText(c.text, dark ? c.x : c.x - w / 2, c.y);
  }
  if (geo.rating) {
    const r = geo.rating;
    ctx.font = `600 ${r.size}px ${SHARE_CARD_FONT_STACK}`;
    ctx.fillStyle = dark ? '#6B7280' : 'rgba(255,255,255,0.85)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const w = ctx.measureText(r.text).width;
    ctx.fillText(r.text, dark ? r.x : r.x - w / 2, r.y);
  }

  drawTextLines(ctx, geo.desc, {
    color: dark ? '#4B5563' : 'rgba(255,255,255,0.75)',
    weight: 600,
    align: dark ? 'left' : 'center',
  });
  drawTextLines(ctx, geo.dataRows, {
    color: dark ? '#4B5563' : 'rgba(255,255,255,0.85)',
    weight: 600,
    align: dark ? 'left' : 'center',
  });

  // Pastilla de precio protagonista: blanca con texto oscuro en «foto»,
  // oscura con texto blanco en «dividida».
  if (geo.pricePill) {
    const pill = geo.pricePill;
    ctx.fillStyle = dark ? '#111111' : '#FFFFFF';
    roundRectPath(ctx, pill.x, pill.y, pill.w, pill.h, pill.h / 2);
    ctx.fill();
    ctx.font = `800 ${L.priceSize}px ${SHARE_CARD_FONT_STACK}`;
    ctx.fillStyle = dark ? '#FFFFFF' : '#111111';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const textW = ctx.measureText(pill.text).width;
    ctx.fillText(pill.text, pill.x + (pill.w - textW) / 2, pill.y + pill.h / 2);
  }

  drawFooter(ctx, geo);
  return canvas;
}

export async function renderExperienceShareCardCanvas(data, format, styleId = 'foto') {
  const style = resolveExperienceShareCardStyle(styleId).id;
  const [photo, logoWhite, logoDark] = await Promise.all([
    loadShareCardPhoto(data?.photoUrl),
    loadShareCardLogoWhite(),
    style === 'dividida' ? loadShareCardLogoDark() : Promise.resolve(null),
  ]);
  const layout = computeExperienceShareCardLayout(data, format, style);
  return drawExperienceShareCardCanvas(
    data,
    format,
    { photo, logoWhite, logoDark },
    layout,
    style,
  );
}

// Genera el PNG de la tarjeta del artículo dibujando en canvas (nada de
// DOM ni de html-to-image): lo que se descarga es lo mismo que la vista
// previa, y el guarda anti-blanco impide descargar un PNG vacío.
export async function exportExperienceShareCardPng(data, format, styleId = 'foto') {
  const canvas = await renderExperienceShareCardCanvas(data, format, styleId);
  assertCanvasNotBlank(canvas);
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('empty-blob'))),
      'image/png',
    );
  });
  return blob;
}
