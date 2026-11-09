// Verificación de candidatos de Places API (New) para completar el
// google_place_id de los negocios que no lo tienen. Lógica pura y
// testeable: nunca se escribe un place_id sin que el candidato pase
// estas reglas (nombre + distancia o dirección).

export function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function namesMatch(a, b) {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return false;
  if (na.includes(nb) || nb.includes(na)) return true;
  // Coinciden las primeras 2 palabras ("Taco Fish La Paz" ~ "Taco Fish").
  const wa = na.split(' ');
  const wb = nb.split(' ');
  return wa.slice(0, 2).join(' ') === wb.slice(0, 2).join(' ');
}

export function haversineMeters(lat1, lng1, lat2, lng2) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.sqrt(a));
}

// La calle es la parte de la dirección antes de la primera coma
// ("Rey Nayar 31, Lázaro Cárdenas..." -> "rey nayar 31").
export function streetFromAddress(address) {
  return normalizeName(String(address || '').split(',')[0]);
}

export function buildPlaceSearchQuery(business, cityName) {
  return [business.name, business.address, cityName]
    .map((p) => String(p || '').trim())
    .filter(Boolean)
    .join(', ');
}

// business: { name, address, lat, lng }. place: candidato de searchText
// ({ id, displayName: { text }, formattedAddress, location: { latitude, longitude } }).
// Devuelve { accepted: true, distanceMeters? } o
// { accepted: false, reason, candidate?: { name, address }, distanceMeters? }.
export function acceptPlaceCandidate(business, place) {
  if (!place || typeof place.id !== 'string' || !place.id) {
    return { accepted: false, reason: 'sin-candidatos' };
  }
  const candidateName = place.displayName?.text || '';
  const candidateAddress = place.formattedAddress || '';
  const candidate = { name: candidateName, address: candidateAddress };
  if (!namesMatch(business.name, candidateName)) {
    return { accepted: false, reason: 'nombre-no-coincide', candidate };
  }
  const bizLat = Number(business.lat);
  const bizLng = Number(business.lng);
  const hasBizCoords = Number.isFinite(bizLat) && Number.isFinite(bizLng) && (bizLat !== 0 || bizLng !== 0);
  const placeLat = Number(place.location?.latitude);
  const placeLng = Number(place.location?.longitude);
  const hasPlaceCoords = Number.isFinite(placeLat) && Number.isFinite(placeLng);
  if (hasBizCoords && hasPlaceCoords) {
    const distanceMeters = Math.round(haversineMeters(bizLat, bizLng, placeLat, placeLng));
    if (distanceMeters > 500) {
      return { accepted: false, reason: 'distancia', distanceMeters, candidate };
    }
    return { accepted: true, distanceMeters };
  }
  // Sin coordenadas para comparar: la dirección devuelta debe contener
  // la calle del negocio.
  const street = streetFromAddress(business.address);
  if (!street) {
    return { accepted: false, reason: 'sin-datos-para-verificar', candidate };
  }
  if (!normalizeName(candidateAddress).includes(street)) {
    return { accepted: false, reason: 'direccion-no-coincide', candidate };
  }
  return { accepted: true };
}
