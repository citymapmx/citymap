// Nombre visible de una ciudad por su slug: nombre de la base si está,
// si no el slug capitalizado. Vivía en lib/nearbyEvents.js (eliminado
// con el fallback de «eventos cerca», decisión 12 Nov 2026); ahora está
// en lib/utils.js porque HomeEvents lo sigue usando en el estado vacío.
import { describe, it, expect } from 'vitest';
import { cityDisplayName } from '../lib/utils.js';

const CITIES = [
  { slug: 'tlaquepaque', name: 'Tlaquepaque', state: 'Jalisco;guadalajara', lat: 20.6407, lng: -103.3114 },
  { slug: 'guadalajara', name: 'Guadalajara', state: 'Jalisco', lat: 20.6597, lng: -103.3496 },
  { slug: 'zapopan', name: 'Zapopan', state: 'Jalisco;guadalajara', lat: 20.7236, lng: -103.3979 },
];

describe('cityDisplayName', () => {
  it('usa el nombre de la base y capitaliza el slug si no está', () => {
    expect(cityDisplayName('zapopan', CITIES)).toBe('Zapopan');
    expect(cityDisplayName('san-pedro-tlaquepaque', [])).toBe('San pedro tlaquepaque');
    expect(cityDisplayName('', CITIES)).toBe('');
  });
});
