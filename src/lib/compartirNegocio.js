// Centro «Compartir mi negocio» (PR #240): qué materiales se ofrecen
// para compartir un negocio y cómo se construyen sus URLs.
// Propuesta A elegida por Jonathan (12 nov 2026): el centro se organiza
// por TIPO DE MATERIAL con 3 pestañas — Redes (las ShareCard que ya
// existen), Para imprimir (tarjetas QR diseñadas, estilo 'qr' de
// ShareCard) y QR suelto (el QR pelado de siempre). Un solo componente
// (BizShareHub) lo usan Mi Perfil (modal) y el panel del negocio
// (StoreAdminPanel), para que no haya dos experiencias de QR distintas.
// Los materiales de menú solo existen si el negocio tiene platillos
// con precio (loadMenuItems); sin menú, solo salen los del perfil.
import { cleanCityPrefix } from './utils.js';
import {
  buildMenuShareCardData,
  buildMenuShareUrl,
  buildShareCardData,
  generateMenuQrDataUrl,
} from './shareCard.js';

// Las 3 pestañas del centro, en orden.
export const COMPARTIR_TABS = ['redes', 'imprimir', 'qr'];

// URL del perfil del negocio: la misma que abre la ficha
// (`/{ciudad}/{slug}`, como el botón «VER MENÚ» de DetailView y el
// compartir de BusinessStore). Nunca se inventa: sin ciudad o sin slug,
// null. Es el espejo de buildMenuShareUrl sin el /menu.
export function buildBizProfileUrl(biz) {
  const city = biz?.city_slug || '';
  const slug = cleanCityPrefix(biz?.slug || biz?.id || '', city);
  if (!city || !slug) return null;
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://citymap.mx';
  return `${origin}/${city}/${slug}`;
}

// URL que lleva el QR pelado de siempre (el que hoy descarga el modal
// de AccountView y la sección de StoreAdminPanel): siempre en
// citymap.mx, sin depender del origen donde corre la app.
export function buildBareQrUrl(biz, kind = 'perfil') {
  const city = biz?.city_slug || 'merida';
  const slug = cleanCityPrefix(biz?.slug || '', city);
  if (!city || !slug) return null;
  const base = `https://citymap.mx/${city}/${slug}`;
  return kind === 'menu' ? `${base}/menu` : base;
}

// Nombre del PNG de la tarjeta QR diseñada (tarjeta de mesa).
export function qrCardFileName(biz, kind = 'perfil') {
  const slug = cleanCityPrefix(biz?.slug || biz?.name || 'negocio', biz?.city_slug || '');
  const safe = String(slug || 'negocio').replace(/[^a-zA-Z0-9-_]+/g, '-');
  return `tarjeta-qr-${kind === 'menu' ? 'menu' : 'perfil'}-${safe}.png`;
}

// Materiales que ofrece cada pestaña. `hasMenuItems` dice si el
// negocio tiene platillos con precio: sin menú, cada pestaña ofrece
// solo el material del perfil; con menú, también el del menú.
export function compartirMaterials(hasMenuItems) {
  const menu = Array.isArray(hasMenuItems)
    ? hasMenuItems.length > 0
    : Boolean(hasMenuItems);
  return {
    redes: menu ? ['tarjeta-perfil', 'tarjeta-menu'] : ['tarjeta-perfil'],
    imprimir: menu ? ['qr-perfil', 'qr-menu'] : ['qr-perfil'],
    qr: menu ? ['qr-suelto-perfil', 'qr-suelto-menu'] : ['qr-suelto-perfil'],
  };
}

// Datos de la tarjeta QR diseñada (tarjeta de mesa, estilo 'qr' de
// ShareCardTemplate + exportShareCardPng): nombre del negocio, QR de
// la URL y la línea «Escanea…» bajo el QR. El QR se genera en el
// cliente (generateMenuQrDataUrl, sin red) y se cachea por URL, así la
// vista previa y el PNG llevan el mismo. Sin URL, null: la tarjeta no
// se ofrece (nunca rota).
export function buildQrCardData(biz, kind = 'perfil', { disp = null, cityName = '', qrCta = null } = {}) {
  const url =
    kind === 'menu' ? buildMenuShareUrl(biz) : buildBizProfileUrl(biz);
  if (!url) return null;
  const qrDataUrl = generateMenuQrDataUrl(url);
  const cta =
    qrCta || (kind === 'menu' ? 'Escanea para ver el menú' : 'Escanea para ver el perfil');
  if (kind === 'menu') {
    // buildMenuShareCardData no lleva qrCta: se añade aquí; sin él la
    // plantilla usa su texto de siempre («Escanea para ver el menú»).
    // La tarjeta QR no lleva foto (ni en la vista previa ni en el
    // canvas): se quita para no pedirla con CORS al exportar.
    return {
      ...buildMenuShareCardData(biz, {
        disp,
        cityName,
        menuItems: [],
        menuUrl: url,
        qrDataUrl,
      }),
      photoUrl: null,
      photoUrls: [],
      qrCta: cta,
    };
  }
  return {
    ...buildShareCardData(biz, { disp, cityName }),
    photoUrl: null,
    photoUrls: [],
    qrDataUrl,
    qrCta: cta,
  };
}
