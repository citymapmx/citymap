import {searchMatches} from './utils.js';

export function eventMatchesQuery(query, event) {
  const normalized = String(query || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const words = normalized.split(/\s+/).filter(Boolean);
  if (!words.length) return false;
  const remaining = words.filter(word => word !== 'evento' && word !== 'eventos' && word !== 'buscar' && word !== 'busca');
  if (!remaining.length) return true;
  const shortText = [event.title, event.location, event.venue_name, event.category, event.event_category, event.city_slug, ...(Array.isArray(event.tags) ? event.tags : [])].join(' ');
  return searchMatches(remaining.join(' '), shortText, event.description);
}
