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
