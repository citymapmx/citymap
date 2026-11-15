import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

// ── Fluidez del mapa: los hallazgos chicos (6, 7 y 8) ──
// Auditoría del 15 nov 2026.
// 6: el nombre de la ciudad tenía una animación infinita
// (expGradientFlow 4s linear infinite) que mantenía el compositor
// trabajando también mientras se mueve el mapa. Ahora corre 2 ciclos
// y se queda quieta. (La clase vive en TripsView.jsx, no en MapView
// como decía la auditoría; ahí está su única definición.)
// 7: al cambiar de ciudad, loadCityPins vaciaba los pines antes de
// pedir: el mapa se pintaba una vez con 0 pines y otra con la ciudad
// completa. Ahora no se vacía hasta que llega la respuesta; si la
// petición falla, entonces sí se limpia.
// 8: markerCache nunca se vaciaba y crecía con cada ciudad visitada.
// Ahora se limpia al cambiar de ciudad.

const readSource = (rel) =>
  fs.readFileSync(new URL(rel, import.meta.url), 'utf8');

describe('fluidez del mapa: hallazgos chicos 6, 7 y 8', () => {
  it('la animación del nombre de la ciudad corre 2 ciclos, no infinita', () => {
    const trips = readSource('../components/TripsView.jsx');
    expect(trips).toContain('animation: expGradientFlow 4s linear 2;');
    expect(trips).not.toContain('expGradientFlow 4s linear infinite');
  });

  it('loadCityPins no vacía los pines al cambiar de ciudad', () => {
    const store = readSource('../store/useDataStore.js');
    expect(store).not.toContain('cityPinsCity: targetCity, cityPins: []');
    expect(store).toContain('set({ cityPinsCity: targetCity });');
  });

  it('si la precarga falla, los pines se limpian solo si sigue siendo la ciudad pedida', () => {
    const store = readSource('../store/useDataStore.js');
    expect(store).toContain('if (requestId === cityPinsLoadId && get().cityPinsCity === targetCity)');
    expect(store).toContain('set({ cityPins: [] });');
  });

  it('markerCache se limpia al cambiar de ciudad', () => {
    const gmap = readSource('../components/GMap.jsx');
    expect(gmap).toContain('prevCityKey');
    expect(gmap).toContain('if (prevCityKey.current !== cityKey)');
    expect(gmap).toContain('markerCache.current.clear()');
  });
});
