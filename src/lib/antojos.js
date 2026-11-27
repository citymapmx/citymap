// «¿Qué se te antoja?» — derivación de antojos desde datos reales de `businesses`.
//
// Reglas duras (27 nov 2026):
// - El conjunto de antojos es FIJO y corto. Cada antojo se deriva de la
//   subcategoría + palabras en el nombre (insensible a acentos y a
//   mayúsculas, normalizando con NFD). Nada inventado: un antojo solo
//   existe si al menos un negocio real lo sostiene.
// - Solo entran lugares CON foto (`photos[0]`; nunca `logo_url`: es la
//   foto del lugar, no el logo).
// - La sección es de «ahora mismo»: solo se muestran los lugares ABIERTOS
//   AHORA (con la misma `isOpenNow` de la ficha) y si ningún antojo tiene
//   nada abierto, la sección no se monta (grupos vacíos).
// - La selección por defecto es el primer antojo (en orden fijo) que tenga
//   al menos un lugar abierto ahora.
//
// Conjunto elegido (datos 27 nov 2026, 786 aprobados):
//   tacos 18, café 33 (nombre) + cafeterías 40 (categoría), sushi 2,
//   pizza 7, mariscos 10, noodles 4 (ramen 3 + Comida Coreana 1),
//   hamburguesas 3, postres 9.
// Fuera del conjunto por demasiado escasos (2-3 en todo el país y en una
// sola ciudad): birria (2, Tepic) y tortas (3). Si crecen, se añaden aquí.
// «dona» NO se usa como pista de postres: casa con nombres propios
// («Donaji») que no venden donas.

// Orden fijo de los antojos (también es el orden de la fila de círculos).
export const ANTOJO_ORDER = [
  'tacos',
  'cafe',
  'sushi',
  'pizza',
  'mariscos',
  'noodles',
  'hamburguesas',
  'postres',
];

// Clave i18n de la etiqueta de cada antojo.
export const ANTOJO_LABEL_KEYS = {
  tacos: 'home_antojo_tacos',
  cafe: 'home_antojo_cafe',
  sushi: 'home_antojo_sushi',
  pizza: 'home_antojo_pizza',
  mariscos: 'home_antojo_mariscos',
  noodles: 'home_antojo_noodles',
  hamburguesas: 'home_antojo_hamburguesas',
  postres: 'home_antojo_postres',
};

// Término en español para «Ver todos los …»: abre la búsqueda existente,
// que ya casa por nombre/categoría. En inglés la etiqueta cambia, pero la
// búsqueda sigue en español porque los nombres de los negocios lo están.
export const ANTOJO_SEARCH_TERMS = {
  tacos: 'tacos',
  cafe: 'café',
  sushi: 'sushi',
  pizza: 'pizza',
  mariscos: 'mariscos',
  noodles: 'ramen',
  hamburguesas: 'hamburguesa',
  postres: 'pastel',
};

// Planes que PUEDEN tener menú: el mismo portón que la consulta `hasMenu`
// de DetailView (plan de pago + fila en `store_categories`). Que el plan
// lo permita no garantiza que tenga menú: eso solo lo sabe la ficha, que
// hace la consulta al abrirse; por eso «Ver menú» abre la ficha, donde el
// botón del menú aparece solo si existe.
export const MENU_PLANS = ['premium', 'elite', 'fideliza'];

export function bizCanHaveMenu(b) {
  return MENU_PLANS.includes(b?.plan);
}

// Pistas por campo. `name` y `subcategory` se buscan por subcadena sobre
// el texto normalizado; `category` por igualdad de categoría normalizada.
const ANTOJO_MATCHERS = {
  tacos: { name: ['taco', 'taqueria'], subcategory: ['taqueria'] },
  cafe: {
    name: ['cafe', 'matcha'],
    subcategory: ['cafeteria', 'matcha'],
    category: ['cafe', 'cafeterias'],
  },
  sushi: { name: ['sushi'], subcategory: ['sushi'] },
  pizza: { name: ['pizza'], subcategory: ['pizzeria'] },
  mariscos: { name: ['marisco'], subcategory: ['mariscos'] },
  noodles: { name: ['ramen', 'noodle', 'fideo'], subcategory: ['comida coreana'] },
  hamburguesas: { name: ['burger', 'hamburguesa'] },
  postres: {
    name: ['panader', 'pastel', 'crepa', 'waffle', 'helad', 'postre'],
  },
};

export function normalizeAntojoText(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function matchesField(b, field, words) {
  if (!words || words.length === 0) return false;
  const text = normalizeAntojoText(b?.[field]);
  if (!text) return false;
  return words.some((w) => text.includes(w));
}

function matchesCategory(b, categories) {
  if (!categories || categories.length === 0) return false;
  return categories.includes(normalizeAntojoText(b?.category));
}

export function antojoIdForBiz(b) {
  if (!b) return null;
  for (const id of ANTOJO_ORDER) {
    const m = ANTOJO_MATCHERS[id];
    if (
      matchesField(b, 'name', m.name) ||
      matchesField(b, 'subcategory', m.subcategory) ||
      matchesCategory(b, m.category)
    ) {
      return id;
    }
  }
  return null;
}

// Foto del lugar: `photos[0]`, que puede ser string o { url }. Nunca
// `logo_url` (regla de negocios free: el logo no es foto del lugar).
export function bizPhotoUrl(b) {
  const photo = b?.photos?.[0];
  if (!photo) return null;
  if (typeof photo === 'string') return photo || null;
  return photo.url || null;
}

export function bizHasPhoto(b) {
  return Boolean(bizPhotoUrl(b));
}

// Agrupa los lugares con foto por antojo, en orden fijo. Los lugares de
// cada antojo van por calificación (mejor primero, sin calificación al
// final): así la foto del círculo —la del primer lugar— es la del lugar
// mejor valorado del antojo, no la de una fila arbitraria.
export function groupAntojos(bizList) {
  const byId = new Map(ANTOJO_ORDER.map((id) => [id, []]));
  for (const b of bizList || []) {
    if (!bizHasPhoto(b)) continue;
    const id = antojoIdForBiz(b);
    if (!id) continue;
    byId.get(id).push(b);
  }
  const groups = [];
  for (const id of ANTOJO_ORDER) {
    const places = byId.get(id);
    if (places.length === 0) continue;
    places.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
    groups.push({ id, places });
  }
  return groups;
}

// Solo los lugares abiertos ahora (misma `isOpenNow` de la ficha). Los
// antojos que se quedan sin lugares abiertos desaparecen: si no queda
// ninguno, la sección no se monta.
export function openAntojos(groups, isOpen) {
  if (typeof isOpen !== 'function') return groups || [];
  const open = [];
  for (const g of groups || []) {
    const places = g.places.filter((b) => isOpen(b));
    if (places.length > 0) open.push({ id: g.id, places });
  }
  return open;
}

// Derivación completa: agrupa con foto y filtra a abiertos ahora.
export function deriveAntojos(bizList, isOpen) {
  return openAntojos(groupAntojos(bizList), isOpen);
}
