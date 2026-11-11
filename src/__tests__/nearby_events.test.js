// Eventos cercanos para el estado vacío de una ciudad sin eventos:
// primero la zona metropolitana, luego las ciudades más cercanas por
// lat/lng; sin coordenadas, los próximos en fecha.
import { describe, it, expect, beforeEach } from 'vitest';
import { selectNearbyEvents, cityDisplayName } from '../lib/nearbyEvents.js';
import { METRO_ZONES, updateMetroZones } from '../lib/utils.js';

const TODAY = '2026-11-11';
const CITIES = [
  { slug: 'tlaquepaque', name: 'Tlaquepaque', state: 'Jalisco;guadalajara', lat: 20.6407, lng: -103.3114 },
  { slug: 'guadalajara', name: 'Guadalajara', state: 'Jalisco', lat: 20.6597, lng: -103.3496 },
  { slug: 'zapopan', name: 'Zapopan', state: 'Jalisco;guadalajara', lat: 20.7236, lng: -103.3979 },
  { slug: 'tepic', name: 'Tepic', lat: 21.5, lng: -104.9 },
  { slug: 'puerto-vallarta', name: 'Puerto Vallarta', lat: 20.6534, lng: -105.2253 },
];

const ev = (id, city_slug, date, extra = {}) => ({ id, title: `Evento ${id}`, date, city_slug, status: 'approved', visibility: 'public', ...extra });

describe('selectNearbyEvents', () => {
  beforeEach(() => {
    Object.keys(METRO_ZONES).forEach(k => delete METRO_ZONES[k]);
    updateMetroZones(CITIES);
  });

  it('excluye los eventos de la propia ciudad y de su zona metropolitana', () => {
    const rows = [
      ev('gdl', 'guadalajara', '2026-11-20'),
      ev('zap', 'zapopan', '2026-11-21'),
      ev('tla', 'tlaquepaque', '2026-11-22'),
      ev('tep', 'tepic', '2026-11-23'),
    ];
    // La zona es una estrella alrededor de Guadalajara: desde
    // Tlaquepaque la zona es [tlaquepaque, guadalajara] (Zapopan no
    // entra), así que Zapopan sí sale como cercano, antes que Tepic.
    const out = selectNearbyEvents(rows, 'tlaquepaque', CITIES, 10, TODAY);
    expect(out.map(e => e.id)).toEqual(['zap', 'tep']);
  });

  it('ordena por ciudad más cercana y luego por fecha', () => {
    const rows = [
      ev('pv', 'puerto-vallarta', '2026-11-12'),
      ev('pv2', 'puerto-vallarta', '2026-11-13'),
      ev('gdl', 'guadalajara', '2026-11-20'),
    ];
    // Desde Tepic: Puerto Vallarta (~100 km) antes que Guadalajara
    // (~180 km); dentro de Puerto Vallarta, por fecha.
    const out = selectNearbyEvents(rows, 'tepic', CITIES, 10, TODAY);
    expect(out.map(e => e.id)).toEqual(['pv', 'pv2', 'gdl']);
  });

  it('sin coordenadas de la ciudad activa, ordena solo por fecha', () => {
    const citiesNoCoords = CITIES.map(c => ({ slug: c.slug, name: c.name }));
    const rows = [
      ev('gdl', 'guadalajara', '2026-11-13'),
      ev('pv', 'puerto-vallarta', '2026-11-12'),
    ];
    const out = selectNearbyEvents(rows, 'tepic', citiesNoCoords, 10, TODAY);
    expect(out.map(e => e.id)).toEqual(['pv', 'gdl']);
  });

  it('salta privados, pasados y no aprobados, y limita a 10', () => {
    const rows = [
      ev('priv', 'tepic', '2026-11-12', { visibility: 'private' }),
      ev('past', 'tepic', '2026-11-10'),
      ev('pend', 'tepic', '2026-11-12', { status: 'pending' }),
      ...Array.from({ length: 12 }, (_, i) => ev(`ok${i}`, 'tepic', `2026-11-${12 + (i % 10)}`)),
    ];
    const out = selectNearbyEvents(rows, 'guadalajara', CITIES, 10, TODAY);
    expect(out).toHaveLength(10);
    expect(out.map(e => e.id)).not.toContain('priv');
    expect(out.map(e => e.id)).not.toContain('past');
    expect(out.map(e => e.id)).not.toContain('pend');
  });

  it('un evento con varias ciudades usa la más cercana', () => {
    const rows = [ev('multi', 'tepic,puerto-vallarta', '2026-11-12')];
    const out = selectNearbyEvents(rows, 'guadalajara', CITIES, 10, TODAY);
    expect(out.map(e => e.id)).toEqual(['multi']);
  });
});

describe('cityDisplayName', () => {
  it('usa el nombre de la base y capitaliza el slug si no está', () => {
    expect(cityDisplayName('zapopan', CITIES)).toBe('Zapopan');
    expect(cityDisplayName('san-pedro-tlaquepaque', [])).toBe('San pedro tlaquepaque');
    expect(cityDisplayName('', CITIES)).toBe('');
  });
});
