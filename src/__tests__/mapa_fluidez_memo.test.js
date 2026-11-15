import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

// ── Fluidez del mapa: memoizar los pines y el filtro de cercanos ──
// Hallazgos 1 y 5 de la auditoría del 15 nov 2026. Antes MapView armaba
// displayedPins con .filter() en cada render (array nuevo) y App crea
// appContextValue nuevo en cada render, así que MapView re-renderiza
// siempre y el memo de GMap (que exige businesses por identidad)
// fallaba siempre: cada render re-corría los 330 pines y tocaba el
// clusterer. Y filteredNearby hacía allNearby.filter con .some() dentro:
// ~330 × ~330 comparaciones por render en Guadalajara. Ahora
// displayedPins es estable mientras no cambien sus entradas, y el
// filtro de cercanos usa un Set de ids (O(n)).

const readSource = (rel) =>
  fs.readFileSync(new URL(rel, import.meta.url), 'utf8');

describe('fluidez del mapa: pines memoizados y cercanos por Set', () => {
  it('displayedPins y cityPins son useMemo con sus dependencias', () => {
    const mapView = readSource('../views/MapView.jsx');
    expect(mapView).toContain('const cityPins = useMemo(');
    expect(mapView).toContain('const displayedPins = useMemo(');
    expect(mapView).toContain('[pinPool, mapFullScreen, userCoords, activeCity]');
    expect(mapView).toContain('[cityPins, activeCat, nearbyFilter, tz]');
    // El patrón viejo (array nuevo en cada render) ya no está.
    expect(mapView).not.toContain('let displayedPins =');
    expect(mapView).not.toContain('const cityPins = mapFullScreen ? pinPool : pinPool.filter');
  });

  it('filteredNearby usa un Set de ids en vez de .some() por pin', () => {
    const mapView = readSource('../views/MapView.jsx');
    expect(mapView).toContain('new Set(displayedPins.map(b => b.id))');
    expect(mapView).toContain('displayedPinIds.has(b.id)');
    expect(mapView).not.toContain('displayedPins.some(dp => dp.id === b.id)');
  });

  it('el memo de GMap sigue exigiendo businesses por identidad (ahora estable)', () => {
    const gmap = readSource('../components/GMap.jsx');
    expect(gmap).toContain('prev.businesses === next.businesses');
  });
});
