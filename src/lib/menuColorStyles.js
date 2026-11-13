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

// Texto legible sobre el color primary (píldora activa, botón +):
// primary claro -> texto oscuro; primary oscuro -> texto blanco.
export function textOnMenuPrimary(hex) {
  if (!hex || typeof hex !== 'string') return '#FFFFFF';
  const match = hex.match(/^#([0-9a-fA-F]{6})$/);
  if (!match) return '#FFFFFF';
  const n = parseInt(match[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.6 ? '#18181B' : '#FFFFFF';
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
    text: style.text,
    primary: style.primary,
    onPrimary: textOnMenuPrimary(style.primary),
  };
}
