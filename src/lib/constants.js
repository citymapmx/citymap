// ─── PLAN CONFIG ──────────────────────────────────────────────────────────────
const PLAN_META = {
  free: { label: "Gratuito", color: "#6B7280", bg: "#F3F4F6", max_photos: 3 },
  destacado: { label: "Destacado", color: "#3B82F6", bg: "#EFF6FF", max_photos: 7 },
  premium: { label: "Premium", color: "#C9A84C", bg: "#FFFBEB", max_photos: 15 },
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

const FONT_BIZ = "'Outfit', sans-serif";

export const CATS_DEFAULT = [{ id: "restaurantes", label: "Restaurantes" }, { id: "cafe", label: "Cafés" }, { id: "salud", label: "Salud" }, { id: "belleza", label: "Belleza" }, { id: "fitness", label: "Fitness" }, { id: "compras", label: "Compras" }, { id: "tech", label: "Tech" }, { id: "ocio", label: "Ocio" }];
const EVENT_CATS = ["Música en vivo", "DJ", "Karaoke", "Fiesta", "Deportes", "Comedia", "Networking", "Promoción especial", "Otro"];

// ─── THEME ────────────────────────────────────────────────────────────────────
const getT = dark => dark ? {
  // ── DARK MODE ──────────────────────────────
  green:    "#FFFFFF", // White primary
  greenL:   "#1A1A1A", // Dark gray for active tags/chips
  greenD:   "#E5E7EB", // Light gray for hover states
  bg:       "#0A0A0A",
  white:    "#141414",
  text:     "#F0F0F0",
  sub:      "#9CA3AF",
  border:   "#2A2A2A",
  red:      "#F07060",
  gold:     "#C9A84C",
  card:     "#1A1A1A",
  shadow:   "0 2px 16px rgba(0,0,0,.6)",
  shadowLg: "0 8px 40px rgba(0,0,0,.8)",
  skBase:   "#1A1A1A",
  skShine:  "#252525",
  glassBg:  "rgba(15,20,17,0.75)",
  glassBorder: "rgba(255,255,255,0.12)",
  overlay:  "rgba(0,0,0,0.8)",
  iconBg:   "#1F2937",
  btnBg:    "#374151",
  btnText:  "#F9FAFB",
  tagBg:    "#1E293B",
  invert:   1, // For filters like invert(1) on dark mode
} : {
  // ── LIGHT MODE (predeterminado) ────────────
  green:    "#000000", // Black primary
  greenL:   "#F3F4F6", // Light gray for active tags/chips
  greenD:   "#222222", // Very dark gray for hover states
  bg:       "#F8F9FA",
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

export { PLAN_META, CITY_TZ, FONT_BIZ, EVENT_CATS, getT };