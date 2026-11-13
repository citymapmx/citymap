// Color de portada determinista por id para los lugares de Mis
// Favoritos (propuesta C).
//
// Antes este archivo también parseaba las coordenadas (parseLatLng /
// parseCoord) para los pines del mapa de Google; el mapa se quitó de
// Mis Favoritos el 13 nov 2026 y ya nada las usa. Queda solo el color,
// que usa la agenda de eventos guardados (AgendaEventos.jsx) y la
// tarjeta del lugar (FavoritosMapa.jsx). Puro y testeable.

// Color de portada determinista por id (misma paleta que los avatares de
// eventos privados): el mismo lugar siempre lleva el mismo color.
const PALETA = ['#1A7A5E', '#7C3AED', '#B45309', '#0E7490', '#BE185D'];

export function colorParaLugar(id) {
  const s = String(id ?? '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return PALETA[h % PALETA.length];
}
