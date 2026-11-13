// Coordenadas de los lugares de Mis Favoritos (propuesta C) y color de
// portada determinista por id.
//
// Las coordenadas salen de la tabla businesses (columnas lat/lng), las
// mismas que usa el mapa principal (mapPins): un lugar sin coordenadas
// válidas NO lleva pin en el mapa de Google, solo aparece en la leyenda.
// Puro y testeable.

export function parseCoord(v) {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').trim());
  return Number.isFinite(n) ? n : null;
}

// Lat/lng válidos de un lugar, o null si no tiene coordenadas reales.
// Nunca inventa una posición.
export function parseLatLng(p) {
  const lat = parseCoord(p?.lat);
  const lng = parseCoord(p?.lng);
  if (lat === null || lng === null) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

// Color de portada determinista por id (misma paleta que los avatares de
// eventos privados): el mismo lugar siempre lleva el mismo color.
const PALETA = ['#1A7A5E', '#7C3AED', '#B45309', '#0E7490', '#BE185D'];

export function colorParaLugar(id) {
  const s = String(id ?? '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return PALETA[h % PALETA.length];
}
