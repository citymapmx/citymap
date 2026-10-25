import {fuzzyMatch} from './utils.js';

export function eventMatchesQuery(query, event) {
  const normalized = String(query || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const words = normalized.split(/\s+/).filter(Boolean);
  if (!words.length) return false;
  const remaining = words.filter(word => word !== 'evento' && word !== 'eventos');
  if (!remaining.length) return true;
  return fuzzyMatch(remaining.join(' '), [event.title, event.description, event.location, event.venue_name, event.category, event.event_category, event.city_slug, ...(Array.isArray(event.tags) ? event.tags : [])].join(' '));
}
