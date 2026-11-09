// Helpers de tours (Revista). Los usan la página /tours (ToursView) y la
// sección "Tours por ciudad" del inicio global (GlobalHomeView).
import { createSlug } from './utils.js';

// "desde $1,475 MXN" (con separador de miles; sin decimales si es entero).
// Sin precio válido devuelve null (el tour se muestra sin precio).
export function formatTourPrice(price) {
  const value = Number(price);
  if (!Number.isFinite(value) || value <= 0) return null;
  return `desde $${value.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} MXN`;
}

// URL del artículo del tour en la Revista (igual que las tarjetas del muro).
export function tourCardUrl(tour) {
  return `/revista/${tour?.city_slug || ''}/${createSlug(tour?.title || '')}`;
}

// Agrupa los tours por ciudad: [{ slug, name, count, tours }], ordenados por
// cantidad (más tours primero) y a igualdad por nombre. `cities` es la lista
// de ciudades del sitio (para el nombre bonito); si la ciudad no está en la
// lista, el slug hace de nombre.
export function groupToursByCity(tours, cities = []) {
  const bySlug = new Map((cities || []).map((c) => [c.slug, c.name || c.slug]));
  const groups = new Map();
  for (const tour of tours || []) {
    const slug = tour?.city_slug || 'todas';
    if (!groups.has(slug)) {
      groups.set(slug, { slug, name: bySlug.get(slug) || slug, count: 0, tours: [] });
    }
    const group = groups.get(slug);
    group.count += 1;
    group.tours.push(tour);
  }
  return [...groups.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'es'));
}
