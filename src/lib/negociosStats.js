import { sb } from "./supabase.js";

// ─── Cifras de /negocios: datos en vivo ──────────────────────────────────────
// Antes las cifras eran texto fijo en BusinessLanding.jsx (330 / 35 / 167 /
// 153) y ya estaban viejas (la base tiene 33 ciudades y los eventos subieron
// tras las tandas de CDMX). Ahora se calculan de la base en cada visita a
// /negocios, sin caché: 4 consultas que solo devuelven un número (HEAD con
// count=exact), así que no hay problema de costo ni de velocidad. Al agregar
// un negocio o un evento, el número sube solo en la siguiente visita.
//
// Los valores fijos de antes se quedan como reserva: mientras cargan los
// conteos se muestran ellos, y si alguna consulta falla, ese campo se queda
// con su reserva — la página nunca se ve rota ni con ceros.
export const NEGOCIOS_STATS_FALLBACK = {
  businesses: 330,
  cities: 35,
  events: 167,
  tours: 153,
};

// Fecha local YYYY-MM-DD (igual que GlobalHomeView): "vigente" se mide con
// el día del usuario, no con UTC.
export function todayLocalStr(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// Las 4 consultas, con los mismos filtros que usa la app en el resto del
// sitio (verificados contra useDataStore.js, GlobalHomeView.jsx y
// NoMenuLanding.jsx):
// - negocios publicados: status approved y plan distinto de menu (igual que
//   el muro global y el listado de negocios).
// - ciudades activas: cities con active true.
// - eventos vigentes: approved + active + no privados y con fecha de hoy en
//   adelante; los de varios días cuentan mientras su end_date no haya pasado.
// - tours y guías: experiences approved con activity_type Tour o Guía.
export function negociosStatsQueries(today = todayLocalStr()) {
  return {
    businesses: "?status=eq.approved&plan=neq.menu",
    cities: "?active=eq.true",
    events: `?status=eq.approved&active=eq.true&visibility=neq.private&or=(date.gte.${today},and(date.lte.${today},end_date.gte.${today}))`,
    tours: "?status=eq.approved&activity_type=in.(Tour,Gu%C3%ADa)",
  };
}

// Devuelve { businesses, cities, events, tours } con los conteos vivos.
// Cada consulta que falla se sustituye por su valor de reserva.
export async function fetchNegociosStats() {
  const queries = negociosStatsQueries();
  const [businesses, cities, events, tours] = await Promise.all([
    sb.count("businesses", queries.businesses).catch(() => null),
    sb.count("cities", queries.cities).catch(() => null),
    sb.count("events", queries.events).catch(() => null),
    sb.count("experiences", queries.tours).catch(() => null),
  ]);
  return {
    businesses: typeof businesses === "number" ? businesses : NEGOCIOS_STATS_FALLBACK.businesses,
    cities: typeof cities === "number" ? cities : NEGOCIOS_STATS_FALLBACK.cities,
    events: typeof events === "number" ? events : NEGOCIOS_STATS_FALLBACK.events,
    tours: typeof tours === "number" ? tours : NEGOCIOS_STATS_FALLBACK.tours,
  };
}
