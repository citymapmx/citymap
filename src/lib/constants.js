// ─── PLAN CONFIG ──────────────────────────────────────────────────────────────
const PLAN_META = {
  free: { label: "Gratuito", color: "#6B7280", bg: "#F3F4F6", max_photos: 3 },
  // Claves actuales (15 nov 2026): 'pro' = Presencia, 'elite' = Ventas,
  // 'fideliza' = Fideliza. Las claves viejas ('destacado', 'premium') se
  // quitaron: la base ya no tiene filas con esos planes (migración 15 nov
  // 2026: 109 premium -> fideliza, 14 destacado -> pro). Sin estas claves,
  // PLAN_META[plan].max_photos rompe el formulario del admin.
  pro: { label: "Presencia", color: "#3B82F6", bg: "#EFF6FF", max_photos: 7 },
  elite: { label: "Ventas", color: "#C9A84C", bg: "#FFFBEB", max_photos: 15 },
  fideliza: { label: "Fideliza", color: "#6D28D9", bg: "#F5F0FF", max_photos: 15 },
  menu: { label: "Solo Menú (QR Privado)", color: "#10B981", bg: "#ECFDF5", max_photos: 15 },
};

// ─── TIMEZONE POR CIUDAD ──────────────────────────────────────────────────────
const CITY_TZ = {
  // México
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
  "nuevo-vallarta": "America/Mexico_City",
  "los-cabos": "America/Mazatlan",
  "playa-del-carmen": "America/Cancun",
  "tlaquepaque": "America/Mexico_City",
  "zapopan": "America/Mexico_City",
  "xalisco": "America/Mazatlan",
  "compostela": "America/Mazatlan",
  "magdalena": "America/Mazatlan",
  // Las 18 que faltaban para cubrir las 40 ciudades (hallazgo A8, 21 nov
  // 2026): sin entrada, el «hoy» de la rueda caía en la fecha del
  // dispositivo en vez de la de la ciudad.
  "bahia-de-banderas": "America/Mazatlan",
  "riviera-nayarit": "America/Mazatlan",
  "sayulita": "America/Mazatlan",
  "colima": "America/Mexico_City",
  "manzanillo": "America/Mexico_City",
  "puebla": "America/Mexico_City",
  "queretaro": "America/Mexico_City",
  "san-miguel-de-allende": "America/Mexico_City",
  "san-pedro-garza-garcia": "America/Monterrey",
  // Colombia
  "bogota": "America/Bogota",
  "medellin": "America/Bogota",
  // Argentina
  "buenos-aires": "America/Argentina/Buenos_Aires",
  // Japón
  "tokio": "Asia/Tokyo",
  "kioto": "Asia/Tokyo",
  // Reino Unido
  "londres": "Europe/London",
  // EE.UU.
  "san-antonio": "America/Chicago",
  "san-diego": "America/Los_Angeles",
  // Canadá
  "vancouver": "America/Vancouver",
  // España
  "madrid": "Europe/Madrid",
  "barcelona": "Europe/Madrid",
  "sevilla": "Europe/Madrid",
  "valencia": "Europe/Madrid",
  // Francia
  "paris": "Europe/Paris",
  "lyon": "Europe/Paris",
  // EE.UU.
  "los-angeles": "America/Los_Angeles",
  "new-york": "America/New_York",
  "miami": "America/New_York",
  "chicago": "America/Chicago",
  "houston": "America/Chicago",
};

const FONT_BIZ = "var(--heading)";

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
  surface:  "#232326",
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
  surface:  "#FFFFFF",
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