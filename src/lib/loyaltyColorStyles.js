// Estilos de color para las tarjetas de lealtad (Paso 1 «Elige tus colores»
// del LoyaltyWizard, PR #239).
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

export const LOYALTY_COLOR_CATEGORIES = [
  {
    id: "premium",
    label: "Premium",
    styles: [
      { id: "oro-negro", label: "Oro negro", bg: ["#262626", "#000000"], text: "#FAFAFA", primary: "#F5B301" },
      { id: "esmeralda", label: "Esmeralda", bg: ["#065F46", "#022C22"], text: "#ECFDF5", primary: "#FBBF24" },
      { id: "medianoche", label: "Medianoche", bg: ["#312E81", "#1E1B4B"], text: "#E0E7FF", primary: "#F59E0B" },
      { id: "vino", label: "Vino", bg: ["#7F1D1D", "#450A0A"], text: "#FEF2F2", primary: "#FDE68A" },
      { id: "atardecer", label: "Atardecer", bg: ["#F97316", "#DB2777", "#7C3AED"], text: "#FFFFFF", primary: "#FFFFFF" },
      { id: "oceano", label: "Océano", bg: ["#1E3A8A", "#0891B2"], text: "#FFFFFF", primary: "#FDE68A" },
      { id: "galaxia", label: "Galaxia", bg: ["#0F172A", "#6D28D9"], text: "#EDE9FE", primary: "#FBBF24" },
      { id: "zafiro", label: "Zafiro", bg: ["#1D4ED8", "#172554"], text: "#EFF6FF", primary: "#FBBF24" },
      { id: "amatista", label: "Amatista", bg: ["#7E22CE", "#3B0764"], text: "#FAF5FF", primary: "#E9D5FF" },
    ],
  },
  {
    id: "sobrios",
    label: "Sobrios",
    styles: [
      { id: "pizarra", label: "Pizarra", bg: ["#475569", "#1E293B"], text: "#F1F5F9", primary: "#CBD5E1" },
      { id: "perla", label: "Perla", bg: ["#F8FAFC", "#E2E8F0"], text: "#334155", primary: "#64748B" },
      { id: "oliva", label: "Oliva", bg: ["#57534E", "#292524"], text: "#FAFAF9", primary: "#A8A29E" },
      { id: "petroleo", label: "Petróleo", bg: ["#155E75", "#164E63"], text: "#ECFEFF", primary: "#A5F3FC" },
      { id: "terracota", label: "Terracota", bg: ["#9A3412", "#7C2D12"], text: "#FFF7ED", primary: "#FDBA74" },
      { id: "malva", label: "Malva", bg: ["#4C1D95", "#2E1065"], text: "#EDE9FE", primary: "#C4B5FD" },
      { id: "bosque", label: "Bosque", bg: ["#166534", "#14532D"], text: "#F0FDF4", primary: "#FDE68A" },
      { id: "caqui", label: "Caqui", bg: ["#78716C", "#44403C"], text: "#FAFAF9", primary: "#D6D3D1" },
      { id: "salvia", label: "Salvia", bg: ["#7C8A6A", "#3F4A37"], text: "#F4F7F0", primary: "#D9E2D0" },
    ],
  },
  {
    id: "cafeteria",
    label: "Cafetería",
    styles: [
      { id: "espresso", label: "Espresso", bg: ["#292524", "#0C0A09"], text: "#FAFAF9", primary: "#D97706" },
      { id: "latte", label: "Latte", bg: ["#F5E6D3", "#E7C9A9"], text: "#451A03", primary: "#92400E" },
      { id: "capuccino", label: "Capuccino", bg: ["#78350F", "#451A03"], text: "#FEF3C7", primary: "#FBBF24" },
      { id: "mocha", label: "Mocha", bg: ["#44403C", "#1C1917"], text: "#FAFAF9", primary: "#C9A227" },
      { id: "caramelo", label: "Caramelo", bg: ["#F59E0B", "#D97706"], text: "#451A03", primary: "#78350F" },
      { id: "crema", label: "Crema", bg: ["#FFFBEB", "#FDE9C8"], text: "#78350F", primary: "#B45309" },
      { id: "chocolate", label: "Chocolate", bg: ["#5D3A1A", "#2A1608"], text: "#FDF6EC", primary: "#D97706" },
      { id: "canela", label: "Canela", bg: ["#A16207", "#713F12"], text: "#FFFBEB", primary: "#FDE68A" },
      { id: "cafe-helado", label: "Café helado", bg: ["#E7C9A9", "#D6A97C"], text: "#451A03", primary: "#78350F" },
    ],
  },
  {
    id: "coloridos",
    label: "Coloridos",
    styles: [
      { id: "grafito-plata", label: "Grafito plata", bg: ["#6B7280", "#1F2937"], text: "#F9FAFB", primary: "#E5E7EB" },
      { id: "rosa-claro", label: "Rosa claro", bg: ["#FDF2F8", "#FBCFE8"], text: "#831843", primary: "#DB2777" },
      { id: "lima", label: "Lima", bg: ["#84CC16", "#15803D"], text: "#FFFFFF", primary: "#FFFFFF" },
      { id: "cobre", label: "Cobre", bg: ["#B45309", "#7C2D12"], text: "#FFF7ED", primary: "#FDE68A" },
      { id: "coral", label: "Coral", bg: ["#FB7185", "#BE123C"], text: "#FFFFFF", primary: "#FFFFFF" },
      { id: "tropical", label: "Tropical", bg: ["#14B8A6", "#0F766E"], text: "#FFFFFF", primary: "#FDE68A" },
      { id: "rosa-dorado", label: "Rosa dorado", bg: ["#F9A8D4", "#EC4899"], text: "#FFFFFF", primary: "#FDE68A" },
      { id: "menta", label: "Menta", bg: ["#A7F3D0", "#6EE7B7"], text: "#064E3B", primary: "#059669" },
      { id: "ambar", label: "Ámbar", bg: ["#FBBF24", "#F59E0B"], text: "#451A03", primary: "#92400E" },
    ],
  },
];

// Todos los estilos en una sola lista, cada uno con su categoría.
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

// La categoría del estilo guardado en un bg_color, o null.
export function findLoyaltyCategoryByBackground(bg) {
  const style = findLoyaltyStyleByBackground(bg);
  return style ? style.category : null;
}
