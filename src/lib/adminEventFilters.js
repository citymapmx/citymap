import { getEventStatus } from './utils.js';

// Filtros de la pestaña Eventos del panel de administración.
// La lista de eventos ya viene ordenada y sin pendientes (sortedEvents);
// estas funciones solo aplican ciudad, estado, buscador y "sin imagen".

export function eventHasImage(ev) {
  return Boolean(ev.img_url || ev.img);
}

export function filterAdminEvents(events, { city = "all", status = "all", search = "", noImageOnly = false } = {}) {
  return (events || []).filter(ev => {
    if (city !== "all" && !(ev.city_slug === "all" || (ev.city_slug && ev.city_slug.split(",").includes(city)))) return false;
    const isFinished = getEventStatus(ev).lbl === "Finalizado";
    if (status === "upcoming" && isFinished) return false;
    if (status === "past" && !isFinished) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const hay = [ev.title, ev.venue_name, ev.event_category].filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (noImageOnly && eventHasImage(ev)) return false;
    return true;
  });
}

export function countEventsWithoutImage(events) {
  return (events || []).filter(ev => !eventHasImage(ev)).length;
}
