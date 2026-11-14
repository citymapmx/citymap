// Estilos de color para el menú del negocio (PR #291).
//
// Reutiliza los 36 estilos de las tarjetas de lealtad
// (loyaltyColorStyles.js) tal cual, sin paletas nuevas. El negocio guarda
// solo el id del estilo en businesses.menu_style (p. ej. "perla") o null
// = sin estilo, y el menú se ve exacto como hoy. Además puede guardar un
// tema propio en businesses.menu_custom (jsonb { bg, primary }): el editor
// universal del diseñador. El personalizado manda sobre el predefinido
// (ver resolveMenuTheme) y el texto se deriva siempre por contraste.
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

// ── Editor universal: tema personalizado (sin estilo predefinido) ──
//
// El negocio guarda su tema propio en businesses.menu_custom (jsonb):
//   { "bg": "#RRGGBB", "primary": "#RRGGBB" }
// - bg: color base del fondo del menú (el degradado se deriva de él).
// - primary: botones +, píldoras activas, precios y títulos.
// El texto NO se guarda: se deriva por contraste WCAG medido sobre las
// dos paradas del degradado (menuBestTextOnGradient) y onPrimary sobre
// primary (menuBestText), para que siempre se lea con cualquier color
// que elija el negocio.

// Colores básicos del editor: van primero (fila de muestras rápidas) y
// después los selectores de color exacto.
export const MENU_BASIC_COLORS = [
  { id: 'negro', label: 'Negro', hex: '#000000' },
  { id: 'blanco', label: 'Blanco', hex: '#FFFFFF' },
  { id: 'gris', label: 'Gris', hex: '#6B7280' },
  { id: 'rojo', label: 'Rojo', hex: '#EF4444' },
  { id: 'azul', label: 'Azul', hex: '#2563EB' },
  { id: 'verde', label: 'Verde', hex: '#16A34A' },
  { id: 'amarillo', label: 'Amarillo', hex: '#FACC15' },
  { id: 'naranja', label: 'Naranja', hex: '#F97316' },
  { id: 'morado', label: 'Morado', hex: '#7C3AED' },
  { id: 'rosa', label: 'Rosa', hex: '#EC4899' },
];

// Hex válido de 6 dígitos (#RRGGBB).
export function isValidMenuHex(hex) {
  return typeof hex === 'string' && /^#[0-9a-fA-F]{6}$/.test(hex);
}

// Mezcla un hex hacia negro (amount 0-1): la segunda parada del
// degradado del tema personalizado. El degradado va de claro a oscuro,
// como los estilos predefinidos (p. ej. Perla #F8FAFC -> #E2E8F0).
export function menuDarken(hex, amount = 0.3) {
  if (!isValidMenuHex(hex)) return '#000000';
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.max(0, Math.min(255, Math.round(c * (1 - amount))));
  const toHex = (c) => f(c).toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex((n >> 16) & 255)}${toHex((n >> 8) & 255)}${toHex(n & 255)}`;
}

// Normaliza un tema personalizado guardado (objeto jsonb o texto JSON) a
// { bg, primary } en mayúsculas, o null si no es válido. Un tema a medias
// (sin bg o sin primary válidos) no se aplica: el menú se ve como hoy.
export function parseMenuCustom(value) {
  let obj = value;
  if (typeof value === 'string') {
    try { obj = JSON.parse(value); } catch { return null; }
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
  if (!isValidMenuHex(obj.bg) || !isValidMenuHex(obj.primary)) return null;
  return { bg: obj.bg.toUpperCase(), primary: obj.primary.toUpperCase() };
}

// Luminancia relativa WCAG de un hex (0-1) y contraste entre dos hex.
function menuRelLum(hex) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f((n >> 16) & 255) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255);
}
export function menuContrastRatio(a, b) {
  const l1 = menuRelLum(a);
  const l2 = menuRelLum(b);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

// Texto (blanco u oscuro) con mejor contraste WCAG sobre un hex. Para los
// colores arbitrarios del editor universal, medir es mejor que el umbral
// de brillo de los helpers de los estilos predefinidos: p. ej. sobre el
// naranja #F97316 el blanco da 2.80 y el oscuro da 6.33.
export function menuBestText(hex) {
  if (!isValidMenuHex(hex)) return '#FFFFFF';
  return menuContrastRatio('#18181B', hex) >= menuContrastRatio('#FFFFFF', hex) ? '#18181B' : '#FFFFFF';
}

// Texto legible sobre un degradado (dos paradas): el texto del menú se ve
// sobre TODO el degradado, así que se elige el color cuyo PEOR caso (la
// parada donde se lee peor) sea mejor. P. ej. sobre el rojo #EF4444 el
// oscuro gana en la primera parada (4.75 vs 3.76) pero cae a 2.62 en la
// segunda; el blanco se lee >= 3.76 en ambas.
export function menuBestTextOnGradient(first, last) {
  if (!isValidMenuHex(first) || !isValidMenuHex(last)) return '#FFFFFF';
  const worst = (text) => Math.min(menuContrastRatio(text, first), menuContrastRatio(text, last));
  return worst('#18181B') >= worst('#FFFFFF') ? '#18181B' : '#FFFFFF';
}

// Tema derivado de un tema personalizado (o null si no es válido).
// Misma forma que menuThemeForStyle: BusinessStore y la vista previa del
// diseñador lo usan sin distinguir predefinido de personalizado.
export function menuThemeForCustom(custom) {
  const parsed = parseMenuCustom(custom);
  if (!parsed) return null;
  const lastColor = menuDarken(parsed.bg, 0.3);
  return {
    style: null,
    custom: true,
    background: `linear-gradient(135deg, ${parsed.bg}, ${lastColor})`,
    firstColor: parsed.bg,
    lastColor,
    text: menuBestTextOnGradient(parsed.bg, lastColor),
    primary: parsed.primary,
    onPrimary: menuBestText(parsed.primary),
  };
}

// Tema inicial al tocar un color propio: parte de lo que se ve ahora
// (primera parada y primary del tema actual) o de los neutros si no hay
// tema. Así el primer toque no salta a colores arbitrarios.
export function customFromTheme(theme) {
  return {
    bg: theme?.firstColor && isValidMenuHex(theme.firstColor) ? theme.firstColor.toUpperCase() : '#FFFFFF',
    primary: theme?.primary && isValidMenuHex(theme.primary) ? theme.primary.toUpperCase() : '#111111',
  };
}

// Resolvedor único del tema del menú de un negocio:
// 1. tema personalizado (menu_custom válido) — manda sobre el predefinido
// 2. estilo predefinido (menu_style)
// 3. null = sin tema, el menú se ve como hoy.
export function resolveMenuTheme(business) {
  if (!business || typeof business !== 'object') return null;
  return menuThemeForCustom(business.menu_custom)
    || menuThemeForStyle(findMenuStyleById(business.menu_style));
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
