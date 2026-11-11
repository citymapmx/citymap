// Pulido rápido (PR #189): los 3 ejemplos de /negocios mostraban
// «Cerrado» aunque el negocio estuviera abierto, porque EJEMPLO_POR_PLAN
// no traía horario y la tarjeta caía en «Cerrado» por defecto. Estas
// pruebas fijan que los ejemplos lleven su horario REAL de la base y que
// con él la tarjeta diga «Abierto» en horario de apertura.
import { describe, it, expect } from 'vitest';
import { EJEMPLO_POR_PLAN } from '../lib/negociosEjemplos.js';
import { isOpenNow } from '../lib/utils.js';

const TZ = 'America/Mexico_City';

// Misma construcción que schedule.test.js: domingo 4 ene 2026 06:00 UTC
// = domingo 00:00 en México; day: 0=Dom … 2=Mar.
function makeDate(dayOfWeek, hour, minute = 0) {
  const baseSundayMidnightUTC = new Date('2026-01-04T06:00:00Z');
  const totalMinutes = dayOfWeek * 24 * 60 + hour * 60 + minute;
  return new Date(baseSundayMidnightUTC.getTime() + totalMinutes * 60000);
}

describe('ejemplos de /negocios', () => {
  it('los 3 traen su horario real de la base', () => {
    for (const plan of ['free', 'pro', 'elite']) {
      const b = EJEMPLO_POR_PLAN[plan];
      expect(Object.keys(b.schedule || {})).toHaveLength(7);
    }
  });

  it('los 3 están abiertos un martes a las 19:25 (la hora de la crítica)', () => {
    // Martes 19:25, cuando el crítico vio «Cerrado» en los 3 ejemplos y
    // Mochomos estaba abierto (su ficha decía «Abierto ahora»).
    const tuesday1925 = makeDate(2, 19, 25);
    for (const plan of ['free', 'pro', 'elite']) {
      expect(isOpenNow(EJEMPLO_POR_PLAN[plan], TZ, tuesday1925)).toBe(true);
    }
  });

  it('el horario sí se lee: Dalila cierra un domingo a las 20:30', () => {
    // Domingo 20:30: Dalila cierra a las 19:00. Si solo se leyera
    // `open: true`, esta prueba fallaría.
    expect(isOpenNow(EJEMPLO_POR_PLAN.free, TZ, makeDate(0, 20, 30))).toBe(false);
  });
});
