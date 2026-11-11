// Eventos cercanos para el estado vacío de una ciudad sin eventos
// (idea de Jonathan, 11 Nov 2026): si alguien abre /tlaquepaque desde
// lejos y ahí no hay nada, se le muestra un mensaje honesto y los
// eventos de ciudades cercanas — nunca como si fueran de su ciudad.
import { getKm, getLocalIsoDate, METRO_ZONES } from './utils.js';

export const NEARBY_EVENTS_LIMIT = 10;

function eventCitySlugs(ev) {
  return String(ev?.city_slug || '').split(',').map(s => s.trim()).filter(Boolean);
}

// Ordena los eventos próximos de OTRAS ciudades por cercanía a la ciudad
// activa (distancia entre ciudades por lat/lng) y luego por fecha.
// Primero la zona metropolitana — que en la práctica ya viene vacía
// (esos eventos ya están en el store de la ciudad) — y si también está
// vacía, las ciudades más cercanas por lat/lng. Sin coordenadas de la
// ciudad activa, el orden es solo cronológico (próximos eventos globales).
export function selectNearbyEvents(rows = [], activeCity, cities = [], limit = NEARBY_EVENTS_LIMIT, today = getLocalIsoDate()) {
  const zone = new Set(METRO_ZONES[activeCity] || [activeCity]);
  const bySlug = new Map((cities || []).map(c => [c.slug, c]));
  const active = bySlug.get(activeCity);
  const upcoming = (rows || []).filter(ev => {
    if (!ev || ev.status !== 'approved' || ev.visibility === 'private' || !ev.date) return false;
    if ((ev.end_date || ev.date) < today) return false;
    const slugs = eventCitySlugs(ev);
    // Sin ciudad: evento global, vale como cercano. Con ciudad en la
    // zona metropolitana (o "all"): ya es de esta ciudad, fuera.
    if (slugs.length === 0) return true;
    if (slugs.some(s => s === 'all' || zone.has(s))) return false;
    return true;
  });
  const distOf = ev => {
    if (!active?.lat || !active?.lng) return Infinity;
    const ds = eventCitySlugs(ev).map(slug => {
      const c = bySlug.get(slug);
      return c?.lat && c?.lng ? getKm(active.lat, active.lng, c.lat, c.lng) : Infinity;
    });
    return ds.length ? Math.min(...ds) : Infinity;
  };
  return [...upcoming].sort((a, b) => {
    const da = distOf(a);
    const db = distOf(b);
    // Sin coordenadas las dos distancias son Infinity: compararlas
    // con resta daría NaN y el orden quedaría indefinido.
    if (da !== db) return da - db;
    return String(a.date).localeCompare(String(b.date)) || String(a.time || '').localeCompare(String(b.time || ''));
  }).slice(0, limit);
}

// Nombre visible de una ciudad por su slug (para la etiqueta de cada
// evento cercano): nombre de la base si está, si no el slug capitalizado.
export function cityDisplayName(slug, cities = []) {
  const found = (cities || []).find(c => c.slug === slug);
  if (found?.name) return found.name;
  if (!slug) return '';
  return slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ');
}
