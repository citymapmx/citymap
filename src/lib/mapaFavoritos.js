// Posición de los pines del mapa esquemático de Mis Favoritos (propuesta C).
// Pura y testeable. Los lugares con lat/lng se proyectan con auto-ajuste a
// su propio cuadro (con un tramo mínimo para que un solo punto quede
// centrado y varios puntos cercanos no se apelotonen); sin coordenadas se
// reparten en huecos fijos del mapa, en orden, evitando pisar un pin ya
// colocado. x/y salen en porcentaje (8–92) del cuadro del mapa.

const MIN_SPAN_DEG = 0.06;
const PAD = 10; // margen del 10% en cada lado del mapa

export const MAPA_FALLBACK_SLOTS = [
  { x: 22, y: 30 }, { x: 38, y: 62 }, { x: 55, y: 28 }, { x: 70, y: 55 },
  { x: 30, y: 78 }, { x: 62, y: 80 }, { x: 80, y: 32 }, { x: 48, y: 45 },
];

export function parseCoord(v) {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').trim());
  return Number.isFinite(n) ? n : null;
}

function validLatLng(p) {
  const lat = parseCoord(p?.lat);
  const lng = parseCoord(p?.lng);
  if (lat === null || lng === null) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

export function projectToMap(places) {
  const list = Array.isArray(places) ? places : [];
  const withCoords = list.map((p) => ({ p, c: validLatLng(p) }));
  const valid = withCoords.filter((w) => w.c);
  let bounds = null;
  if (valid.length > 0) {
    let minLat = Math.min(...valid.map((w) => w.c.lat));
    let maxLat = Math.max(...valid.map((w) => w.c.lat));
    let minLng = Math.min(...valid.map((w) => w.c.lng));
    let maxLng = Math.max(...valid.map((w) => w.c.lng));
    // Tramo mínimo: un solo punto (o varios muy juntos) queda centrado.
    if (maxLat - minLat < MIN_SPAN_DEG) {
      const mid = (minLat + maxLat) / 2;
      minLat = mid - MIN_SPAN_DEG / 2;
      maxLat = mid + MIN_SPAN_DEG / 2;
    }
    if (maxLng - minLng < MIN_SPAN_DEG) {
      const mid = (minLng + maxLng) / 2;
      minLng = mid - MIN_SPAN_DEG / 2;
      maxLng = mid + MIN_SPAN_DEG / 2;
    }
    bounds = { minLat, maxLat, minLng, maxLng };
  }
  const placed = [];
  const round1 = (n) => Math.round(n * 10) / 10;
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  return withCoords.map(({ p, c }, idx) => {
    if (c && bounds) {
      const x = clamp(PAD + (100 - PAD * 2) * ((c.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)), 8, 92);
      const y = clamp(PAD + (100 - PAD * 2) * (1 - (c.lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)), 8, 92);
      const pin = { ...p, x: round1(x), y: round1(y) };
      placed.push(pin);
      return pin;
    }
    // Sin coordenadas: hueco fijo, en orden, sin pisar otro pin.
    let slot = null;
    for (let k = 0; k < MAPA_FALLBACK_SLOTS.length; k++) {
      const cand = MAPA_FALLBACK_SLOTS[(idx + k) % MAPA_FALLBACK_SLOTS.length];
      const clash = placed.some((q) => Math.abs(q.x - cand.x) < 9 && Math.abs(q.y - cand.y) < 9);
      if (!clash) {
        slot = cand;
        break;
      }
    }
    const use = slot || MAPA_FALLBACK_SLOTS[idx % MAPA_FALLBACK_SLOTS.length];
    const pin = { ...p, x: use.x, y: use.y };
    placed.push(pin);
    return pin;
  });
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
