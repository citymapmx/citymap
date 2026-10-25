// ─── PLAN CONFIG ──────────────────────────────────────────────────────────────
const PLAN_META = {
  free: { label: "Gratuito", color: "#6B7280", bg: "#F3F4F6", max_photos: 3 },
  destacado: { label: "Destacado", color: "#3B82F6", bg: "#EFF6FF", max_photos: 7 },
  premium: { label: "Premium", color: "#C9A84C", bg: "#FFFBEB", max_photos: 15 },
  menu: { label: "Solo Menú (QR Privado)", color: "#10B981", bg: "#ECFDF5", max_photos: 15 },
};

// ─── TIMEZONE POR CIUDAD ──────────────────────────────────────────────────────
const CITY_TZ = {
  "tepic": "America/Mazatlan",
  "guadalajara": "America/Mexico_City",
  "ciudad-de-mexico": "America/Mexico_City",
  "monterrey": "America/Monterrey",
  "cancun": "America/Cancun",
  "tijuana": "America/Tijuana",
  "hermosillo": "America/Hermosillo",
  "merida": "America/Merida",
  "chihuahua": "America/Chihuahua",
  "culiacan": "America/Mazatlan",
  "mazatlan": "America/Mazatlan",
  "puerto-vallarta": "America/Mexico_City",
  "los-cabos": "America/Mazatlan",
};

const FONT_BIZ = "var(--heading)";

export const CATS_DEFAULT = [{ id: "restaurantes", label: "Restaurantes" }, { id: "cafe", label: "Cafés" }, { id: "salud", label: "Salud" }, { id: "belleza", label: "Belleza" }, { id: "fitness", label: "Fitness" }, { id: "compras", label: "Compras" }, { id: "tech", label: "Tech" }, { id: "ocio", label: "Ocio" }];
const EVENT_CATEGORIES = [
  "Concierto",
  "Comedia",
  "Festival",
  "Obra de teatro",
  "Fiesta",
  "Deporte",
  "Gastronomía",
  "Cultura",
  "Otro"
];
const EVENT_CATS = EVENT_CATEGORIES;

// ─── THEME ────────────────────────────────────────────────────────────────────
const getT = dark => dark ? {
  dark: true,
  // ── DARK MODE ──────────────────────────────
  green:    "#F4F4F5", // White primary
  greenL:   "#232326", // Dark gray for active tags/chips
  greenD:   "#E4E4E7", // Light gray for hover states
  bg:       "#18181B",
  white:    "#232326",
  text:     "#F4F4F5",
  sub:      "#A1A1AA",
  border:   "#3F3F46",
  red:      "#F07060",
  gold:     "#C9A84C",
  card:     "#232326",
  shadow:   "0 2px 16px rgba(0,0,0,.20)",
  shadowLg: "0 8px 40px rgba(0,0,0,.35)",
  skBase:   "#232326",
  skShine:  "#2D2D31",
  glassBg:  "rgba(35,35,38,0.92)",
  glassBorder: "rgba(255,255,255,0.12)",
  overlay:  "rgba(0,0,0,0.8)",
  iconBg:   "#2D2D31",
  btnBg:    "#2D2D31",
  btnText:  "#F4F4F5",
  tagBg:    "#232326",
  invert:   1, // For filters like invert(1) on dark mode
} : {
  dark: false,
  // ── LIGHT MODE (predeterminado) ────────────
  green:    "#000000", // Black primary
  greenL:   "#F3F4F6", // Light gray for active tags/chips
  greenD:   "#222222", // Very dark gray for hover states
  bg:       "#FFFFFF",
  white:    "#FFFFFF",
  text:     "#0F1A14",
  sub:      "#6B7280",
  border:   "#E5E7EB",
  red:      "#DC2626",
  gold:     "#B8872A",
  card:     "#FFFFFF",
  shadow:   "0 2px 16px rgba(0,0,0,.07)",
  shadowLg: "0 8px 40px rgba(0,0,0,.13)",
  skBase:   "#EAECEB",
  skShine:  "#F4F5F4",
  glassBg:  "rgba(255,255,255,0.75)",
  glassBorder: "rgba(255,255,255,0.7)",
  overlay:  "rgba(0,0,0,0.5)",
  iconBg:   "#F1F5F9",
  btnBg:    "#F5F3FF",
  btnText:  "#4B5563",
  tagBg:    "#FFFFFF",
  invert:   0,
};

export { PLAN_META, CITY_TZ, FONT_BIZ, EVENT_CATS, EVENT_CATEGORIES, getT };