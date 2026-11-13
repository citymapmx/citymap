// Estilos de color para el menú del negocio (PR #291).
//
// Reutiliza los 30 estilos de las tarjetas de lealtad
// (loyaltyColorStyles.js) tal cual, sin paletas nuevas. El negocio guarda
// solo el id del estilo en businesses.menu_style (p. ej. "perla") o null
// = sin estilo, y el menú se ve exacto como hoy.
//
// Mapeo al menú (igual que en la vista previa «Menú personalizado»):
// - fondo del menú: el degradado del estilo
// - encabezado fijo: la primera parada (sólido, para que tape al bajar)
// - píldora de categoría activa y botón +: primary
// - títulos de sección y precios: primary
// - nombre y descripción de producto: text (la descripción atenuada)

import {
  LOYALTY_COLOR_CATEGORIES,
  LOYALTY_COLOR_STYLES,
  loyaltyStyleBackground,
  loyaltyBgFirstColor,
} from './loyaltyColorStyles.js';

export { LOYALTY_COLOR_CATEGORIES, LOYALTY_COLOR_STYLES, loyaltyStyleBackground };

// El estilo guardado en businesses.menu_style, o null si no hay estilo
// elegido, el id no es texto o no corresponde a ningún estilo.
export function findMenuStyleById(id) {
  if (!id || typeof id !== 'string') return null;
  return LOYALTY_COLOR_STYLES.find((style) => style.id === id) || null;
}

// Brillo percibido 0-1 de un hex (fórmula de luminancia ponderada).
function menuBrightness(hex) {
  if (!hex || typeof hex !== 'string') return 0;
  const match = hex.match(/^#([0-9a-fA-F]{6})$/);
  if (!match) return 0;
  const n = parseInt(match[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

// Texto legible sobre el color primary (píldora activa, botón +):
// primary claro -> texto oscuro; primary oscuro -> texto blanco.
export function textOnMenuPrimary(hex) {
  if (!hex || typeof hex !== 'string') return '#FFFFFF';
  return menuBrightness(hex) > 0.6 ? '#18181B' : '#FFFFFF';
}

// Texto legible sobre un fondo sólido del tema (p. ej. la primera parada
// del degradado, que es el fondo del encabezado fijo del menú): el texto
// del estilo está pensado para el degradado completo, que se oscurece
// hacia la última parada; sobre la primera parada (la más clara) un
// texto blanco se pierde en los estilos claros (Lima, Atardecer, Coral,
// Tropical, Rosa dorado). Umbral 0.5: por encima, texto oscuro.
export function textOnMenuSurface(hex) {
  if (!hex || typeof hex !== 'string') return '#FFFFFF';
  return menuBrightness(hex) > 0.5 ? '#18181B' : '#FFFFFF';
}

// Hex con alfa: "#RRGGBB" + "B3" -> "#RRGGBBB3" (texto atenuado, bordes).
export function menuHexAlpha(hex, alpha) {
  if (!hex || typeof hex !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
  return `${hex}${alpha}`;
}

// Tema derivado de un estilo (o null si no hay estilo elegido).
export function menuThemeForStyle(style) {
  if (!style) return null;
  const background = loyaltyStyleBackground(style);
  return {
    style,
    background,
    firstColor: loyaltyBgFirstColor(background),
    lastColor: Array.isArray(style.bg) && style.bg.length > 0 ? style.bg[style.bg.length - 1] : '#FFFFFF',
    text: style.text,
    primary: style.primary,
    onPrimary: textOnMenuPrimary(style.primary),
  };
}
