// Estilos de color para las tarjetas de lealtad (Paso 1 «Elige tus colores»
// del LoyaltyWizard, PR #239) y para el menú del negocio (PR #291, que
// reutiliza esta lista tal cual).
//
// Desde nov 2026 la lista se agrupa por FAMILIAS DE COLOR (7 páginas del
// carrusel, antes 4 categorías: Premium, Sobrios, Cafetería, Coloridos):
// es más rápido elegir por color. Cada estilo está en UNA SOLA familia,
// según su color dominante. 29 estilos en total (Propuesta A, nov 2026:
// se quitaron 19 casi-duplicados de los 48 que había).
//
// Cada estilo guarda su fondo como lista de paradas hex:
// - 2-3 paradas = degradado linear-gradient(135deg, ...).
// - 1 parada  = color plano: ya no hay estilos planos en la lista (los
//   6 Clásicos se quitaron), pero el helper sigue aceptándolo para los
//   fondos planos guardados a mano o de tarjetas viejas (p. ej. #1B1107).
//
// bg_color en la base sigue siendo UN solo texto: el hex plano o el
// linear-gradient completo. Las tarjetas viejas con un hex plano se
// siguen viendo igual, porque un fondo de 1 parada ES ese color.
// Los sitios que necesitan un color sólido (el icono sobre el sello,
// el <input type="color">, el hexBackgroundColor del pase de Google
// Wallet) usan loyaltyBgFirstColor(), que extrae la primera parada.
//
// Contraste (regla de la #314): el texto de la píldora inactiva se
// calcula sobre la primera parada (textOnMenuSurface) y debe dar
// >= 4.5:1 en TODOS los estilos. Peor caso medido (29 estilos): Salvia, 4.81:1.
// Al agregar un estilo, verificarlo con menuContrastRatio antes de fusionar.

export const LOYALTY_COLOR_CATEGORIES = [
  {
    id: "rojos",
    label: "Rojos",
    styles: [
      { id: "vino", label: "Vino", bg: ["#7F1D1D", "#450A0A"], text: "#FEF2F2", primary: "#FDE68A" },
      { id: "coral", label: "Coral", bg: ["#FB7185", "#BE123C"], text: "#FFFFFF", primary: "#FFFFFF" },
      { id: "fuego", label: "Fuego", bg: ["#DC2626", "#EA580C"], text: "#FFFFFF", primary: "#FDE68A" },
      { id: "rosa-mexicano", label: "Rosa mexicano", bg: ["#BE185D", "#D946EF"], text: "#FFFFFF", primary: "#FDE68A" },
    ],
  },
  {
    id: "naranjas-amarillos",
    label: "Naranjas y amarillos",
    styles: [
      { id: "atardecer", label: "Atardecer", bg: ["#F97316", "#DB2777"], text: "#FFFFFF", primary: "#FFFFFF" },
      { id: "terracota", label: "Terracota", bg: ["#9A3412", "#7C2D12"], text: "#FFF7ED", primary: "#FDBA74" },
      { id: "dorado", label: "Dorado", bg: ["#FACC15", "#D97706"], text: "#451A03", primary: "#92400E" },
      { id: "amanecer", label: "Amanecer", bg: ["#FDA4AF", "#FB923C"], text: "#7C2D12", primary: "#EA580C" },
    ],
  },
  {
    id: "verdes",
    label: "Verdes",
    styles: [
      { id: "esmeralda", label: "Esmeralda", bg: ["#065F46", "#022C22"], text: "#ECFDF5", primary: "#FBBF24" },
      { id: "lima", label: "Lima", bg: ["#84CC16", "#15803D"], text: "#FFFFFF", primary: "#FFFFFF" },
      { id: "menta", label: "Menta", bg: ["#A7F3D0", "#34D399"], text: "#064E3B", primary: "#059669" },
      { id: "tropical", label: "Tropical", bg: ["#14B8A6", "#0F766E"], text: "#FFFFFF", primary: "#FDE68A" },
      { id: "salvia", label: "Salvia", bg: ["#7C8A6A", "#3F4A37"], text: "#F4F7F0", primary: "#D9E2D0" },
      { id: "selva", label: "Selva", bg: ["#052E16", "#10B981"], text: "#ECFDF5", primary: "#FBBF24" },
    ],
  },
  {
    id: "azules",
    label: "Azules",
    styles: [
      { id: "medianoche", label: "Medianoche", bg: ["#312E81", "#1E1B4B"], text: "#E0E7FF", primary: "#F59E0B" },
      { id: "oceano", label: "Océano", bg: ["#1E3A8A", "#0891B2"], text: "#FFFFFF", primary: "#FDE68A" },
      { id: "cielo", label: "Cielo", bg: ["#7DD3FC", "#1D4ED8"], text: "#172554", primary: "#1D4ED8" },
      { id: "turquesa", label: "Turquesa", bg: ["#2DD4BF", "#0284C7"], text: "#064E3B", primary: "#FDE68A" },
    ],
  },
  {
    id: "morados-rosas",
    label: "Morados y rosas",
    styles: [
      { id: "galaxia", label: "Galaxia", bg: ["#0F172A", "#6D28D9"], text: "#EDE9FE", primary: "#FBBF24" },
      { id: "amatista", label: "Amatista", bg: ["#7E22CE", "#3B0764"], text: "#FAF5FF", primary: "#E9D5FF" },
      { id: "rosa-claro", label: "Rosa claro", bg: ["#FDF2F8", "#F9A8D4"], text: "#831843", primary: "#DB2777" },
      { id: "magenta", label: "Magenta", bg: ["#C2185B", "#7E22CE"], text: "#FFFFFF", primary: "#F0ABFC" },
      { id: "uva", label: "Uva", bg: ["#9333EA", "#991B1B"], text: "#FAF5FF", primary: "#FBBF24" },
    ],
  },
  {
    id: "cafes",
    label: "Cafés",
    styles: [
      { id: "chocolate", label: "Chocolate", bg: ["#5D3A1A", "#2A1608"], text: "#FDF6EC", primary: "#D97706" },
      { id: "canela", label: "Canela", bg: ["#A16207", "#713F12"], text: "#FFFBEB", primary: "#FDE68A" },
      { id: "cafe-helado", label: "Café helado", bg: ["#E7C9A9", "#D6A97C"], text: "#451A03", primary: "#78350F" },
    ],
  },
  {
    id: "neutros",
    label: "Neutros",
    styles: [
      { id: "oro-negro", label: "Oro negro", bg: ["#262626", "#000000"], text: "#FAFAFA", primary: "#F5B301" },
      { id: "grafito-plata", label: "Grafito plata", bg: ["#6B7280", "#1F2937"], text: "#F9FAFB", primary: "#E5E7EB" },
      { id: "crema", label: "Crema", bg: ["#FFFBEB", "#FBBF24"], text: "#78350F", primary: "#B45309" },
    ],
  },
];

// Todos los estilos en una sola lista, cada uno con su familia de color.
export const LOYALTY_COLOR_STYLES = LOYALTY_COLOR_CATEGORIES.flatMap((cat) =>
  cat.styles.map((style) => ({ ...style, category: cat.id }))
);

// El valor CSS que se guarda en bg_color: el hex plano o el degradado.
export function loyaltyStyleBackground(style) {
  if (!style || !Array.isArray(style.bg) || style.bg.length === 0) return "#ffffff";
  if (style.bg.length === 1) return style.bg[0];
  return `linear-gradient(135deg, ${style.bg.join(", ")})`;
}

// Primera parada de un fondo: el hex plano tal cual, o la primera parada
// de un degradado. Para los sitios que exigen un color sólido.
export function loyaltyBgFirstColor(bg) {
  if (!bg || typeof bg !== "string") return "#ffffff";
  const match = bg.match(/#[0-9a-fA-F]{6}/);
  return match ? match[0] : "#ffffff";
}

// El estilo guardado en un bg_color (plano o degradado), o null si el
// fondo no corresponde a ningún estilo (p. ej. color manual exacto).
export function findLoyaltyStyleByBackground(bg) {
  if (!bg || typeof bg !== "string") return null;
  return LOYALTY_COLOR_STYLES.find((style) => loyaltyStyleBackground(style) === bg) || null;
}

// La familia de color del estilo guardado en un bg_color, o null.
export function findLoyaltyCategoryByBackground(bg) {
  const style = findLoyaltyStyleByBackground(bg);
  return style ? style.category : null;
}
