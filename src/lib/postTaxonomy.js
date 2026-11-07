// Taxonomía de publicaciones de CityMap: tipos y temáticas.
// Fuente única de verdad para el panel de Administración y las vistas públicas.
// Para agregar una temática nueva: una línea en POST_THEMES (slug + etiqueta).
// Los componentes leen de aquí; no hace falta tocarlos.
// Los tipos se guardan en `experiences.activity_type` (valores canónicos, sin emoji).
// Las temáticas se guardan en `experiences.theme` (slug, o null = sin temática).

export const POST_TYPES = [
  { value: 'Blog', label: '📝 Blog' },
  { value: 'Guía', label: '📖 Guía' },
  { value: 'Tour', label: '🗺️ Tour' },
  { value: 'Experiencia', label: '✨ Experiencia' },
];

export const POST_THEMES = [
  { slug: 'viajeros', label: 'Viajeros', emoji: '🧳' },
  { slug: 'gastronomia', label: 'Gastronomía', emoji: '🌮' },
  { slug: 'historia-curiosidades', label: 'Historia y curiosidades', emoji: '📜' },
  { slug: 'rutas-recorridos', label: 'Rutas y recorridos', emoji: '🗺️' },
  { slug: 'naturaleza', label: 'Naturaleza', emoji: '🌿' },
  { slug: 'cultura', label: 'Cultura', emoji: '🏛️' },
  { slug: 'deportes', label: 'Deportes', emoji: '🏃' },
  { slug: 'entretenimiento', label: 'Entretenimiento', emoji: '🥳' },
];

export function themeBySlug(slug) {
  return POST_THEMES.find(t => t.slug === slug) || null;
}

export function themeLabel(slug) {
  const t = themeBySlug(slug);
  return t ? `${t.emoji} ${t.label}` : null;
}

// Normaliza un texto para comparar sin importar mayúsculas, acentos ni emojis.
export function normText(v) {
  return String(v || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Mapea un valor antiguo de activity_type (mezcla de tipos y temáticas,
// con o sin emoji) al modelo nuevo: { type, theme }.
// Devuelve null si no reconoce el valor: no se inventa clasificación.
export function normalizeLegacyActivityType(value) {
  const n = normText(value);
  if (!n) return null;
  if (n.includes('blog')) return { type: 'Blog', theme: null };
  // 'guia' como palabra completa: 'Tour Guiado' es un Tour, no una Guía.
  if (/(^|\s)guia(\s|$)/.test(n)) return { type: 'Guía', theme: null };
  if (n.includes('senderismo') || n.includes('ruta')) return { type: 'Tour', theme: 'rutas-recorridos' };
  if (n.includes('tour')) return { type: 'Tour', theme: null };
  if (n.includes('naturaleza')) return { type: 'Experiencia', theme: 'naturaleza' };
  if (n.includes('cultura')) return { type: 'Experiencia', theme: 'cultura' };
  if (n.includes('deporte')) return { type: 'Experiencia', theme: 'deportes' };
  if (n.includes('entretenimiento')) return { type: 'Experiencia', theme: 'entretenimiento' };
  if (n.includes('boleto') || n.includes('playa')) return { type: 'Experiencia', theme: null };
  if (n.includes('experiencia')) return { type: 'Experiencia', theme: null };
  return null;
}

// Etiqueta de tipo para mostrar en público (con emoji, como antes).
// Si el valor no es un tipo conocido, lo devuelve tal cual.
export function typeLabel(value) {
  const norm = normalizeLegacyActivityType(value);
  if (norm) {
    const t = POST_TYPES.find(p => p.value === norm.type);
    return t ? t.label : norm.type;
  }
  return value || null;
}

// Tipo editorial (Blog/Guía): sin logística ni reservas.
export function isEditorialType(value) {
  const n = normText(value);
  return n.includes('blog') || /(^|\s)guia(\s|$)/.test(n);
}

// Devuelve la publicación con tipo y temática normalizados al modelo nuevo,
// sin tocar id, slug, ciudad ni negocio. Si la fila ya tiene theme, se respeta.
// Un tipo desconocido cae en Experiencia (el selector del panel exige un tipo válido).
export function normalizeExperience(exp) {
  if (!exp) return exp;
  const mapped = normalizeLegacyActivityType(exp.activity_type);
  const type = mapped
    ? mapped.type
    : (POST_TYPES.some(p => p.value === exp.activity_type) ? exp.activity_type : 'Experiencia');
  const theme = exp.theme || (mapped ? mapped.theme : null);
  return { ...exp, activity_type: type, theme };
}

// ¿Coincide la publicación con un filtro de Revista (id de DISCOVER_FILTERS)?
// Igual que antes (subcadena en activity_type) + temática, para que los filtros
// existentes sigan funcionando tras la migración.
const FILTER_THEME_ALIASES = { senderismo: 'rutas-recorridos', gastronomica: 'gastronomia' };
export function matchesPostFilter(post, qFilter) {
  if (!post || !qFilter) return false;
  const q = normText(qFilter);
  if (!q) return false;
  if (normText(post.activity_type).includes(q)) return true;
  const rawTheme = post.theme || '';
  if (!rawTheme) return false;
  if (rawTheme === FILTER_THEME_ALIASES[q]) return true;
  const themeSlug = normText(rawTheme);
  if (themeSlug === q || themeSlug.includes(q) || q.includes(themeSlug)) return true;
  const theme = themeBySlug(rawTheme);
  if (theme && normText(theme.label).includes(q)) return true;
  return false;
}
