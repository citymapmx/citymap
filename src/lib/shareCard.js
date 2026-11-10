// Tarjeta para compartir el negocio (PR #142, v1): como la de «Qué Plan»
// — al presionar Compartir se genera una imagen PNG lista para
// Instagram/Facebook con los datos del negocio.
// v1: UN estilo oscuro, dos formatos (Historia IG 1080×1920, Post IG
// 1080×1080). Facebook y los otros estilos quedan para después.
import { createSlug } from './utils.js';

export const SHARE_CARD_FORMATS = {
  story: { id: 'story', label: 'Historia IG', width: 1080, height: 1920 },
  post: { id: 'post', label: 'Post IG', width: 1080, height: 1080 },
};
export const SHARE_CARD_FORMAT_LIST = [
  SHARE_CARD_FORMATS.story,
  SHARE_CARD_FORMATS.post,
];

// Datos que lleva la tarjeta. El precio NO se inventa: la píldora solo
// aparece si el negocio lo tiene en la base (price es "$$", "$$$" ...).
// La calificación es la que ya muestra la ficha (Google en caché cuando
// hay, si no la propia de CityMap).
export function buildShareCardData(biz, { rating = null, cityName = '' } = {}) {
  const photoUrl =
    biz?.photos?.find((p) => p?.url)?.url || biz?.banner_url || biz?.logo_url || null;
  const price =
    typeof biz?.price === 'string' && biz.price.trim() ? biz.price.trim() : null;
  return {
    photoUrl,
    name: biz?.name || '',
    category: (biz?.type?.trim() || biz?.category || '').trim(),
    rating: typeof rating === 'number' && rating > 0 ? rating : null,
    cityName: (cityName || '').trim(),
    price,
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

// Convierte el nodo de la tarjeta (que ya tiene su tamaño exacto en
// píxeles) a PNG. html-to-image lee las imágenes con fetch + CORS, por
// eso la verificación de arriba.
export async function exportShareCardPng(node) {
  const { toBlob } = await import('html-to-image');
  const blob = await toBlob(node, { cacheBust: true, pixelRatio: 1 });
  if (!blob) throw new Error('empty-blob');
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
