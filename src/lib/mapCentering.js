// Centro del mapa por ciudad.
//
// Las ciudades traen lat/lng en la tabla cities. Si una ciudad no tiene
// coordenadas, se usa el centroide de sus negocios cargados, y si tampoco
// hay negocios, el centro histórico de Tepic (el valor fijo que usaba el
// mapa antes y que dejaba a Guadalajara centrada en Tepic).
export const DEFAULT_MAP_CENTER = { lat: 21.5042, lng: -104.8944 };

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function getCityCenter(city, pins) {
  const lat = toNumber(city?.lat);
  const lng = toNumber(city?.lng);
  if (lat !== null && lng !== null) return { lat, lng };

  const pts = (pins || [])
    .map((p) => ({ lat: toNumber(p?.lat), lng: toNumber(p?.lng) }))
    .filter((p) => p.lat !== null && p.lng !== null);
  if (pts.length > 0) {
    return {
      lat: pts.reduce((sum, p) => sum + p.lat, 0) / pts.length,
      lng: pts.reduce((sum, p) => sum + p.lng, 0) / pts.length,
    };
  }

  return { ...DEFAULT_MAP_CENTER };
}

// Distancia en píxeles de pantalla entre dos coordenadas al zoom actual,
// con la misma proyección Mercator que usa Google Maps (mundo de 256 px en zoom 0).
export function latLngToWorldPoint(lat, lng) {
  const sin = Math.sin((lat * Math.PI) / 180);
  const x = ((lng + 180) / 360) * 256;
  const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * 256;
  return { x, y };
}

export function screenPixelDistance(a, b, zoom) {
  const pa = latLngToWorldPoint(a.lat, a.lng);
  const pb = latLngToWorldPoint(b.lat, b.lng);
  const scale = Math.pow(2, zoom);
  const dx = (pb.x - pa.x) * scale;
  const dy = (pb.y - pa.y) * scale;
  return Math.sqrt(dx * dx + dy * dy);
}

// ¿Hay otro pin pegado a este en pantalla? Sirve para decidir si al tocar
// un pin conviene acercar el mapa en vez de abrir su tarjeta.
export function hasCloseNeighbor(target, others, zoom, thresholdPx = 44) {
  return (others || []).some((o) => screenPixelDistance(target, o, zoom) < thresholdPx);
}
