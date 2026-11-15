import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

// ── Fluidez del mapa: caché de grupos y zoom por pasos de 2 ──
// Hallazgos 2 y 3 de la auditoría del 15 nov 2026. Antes el renderer
// del clusterer creaba un div nuevo por grupo en cada pasada (fin de
// paneo, cada paso de zoom), y el zoom suave hacía setZoom de 1 en 1
// cada 80 ms (cada paso re-agrupa y re-dibuja todo).
//
// OJO: el marcador del grupo NO se reutiliza — la librería quita los
// marcadores viejos en el siguiente requestAnimationFrame, así que
// devolver un marcador cacheado lo borraría del mapa. Lo que se
// reutiliza es el div (el círculo con el conteo), que es solo
// presentación. La animación de salida del cluster sigue intacta: el
// renderer marca lastClusterPosition en cada pasada, antes del caché.

const readSource = (rel) =>
  fs.readFileSync(new URL(rel, import.meta.url), 'utf8');

describe('fluidez del mapa: grupos cacheados y zoom por pasos de 2', () => {
  it('el renderer reutiliza el div del grupo por posición y conteo', () => {
    const gmap = readSource('../components/GMap.jsx');
    expect(gmap).toContain('clusterContentCache');
    expect(gmap).toContain('clusterKey');
    expect(gmap).toContain('toFixed(5)');
    expect(gmap).toContain('cluster.count');
    expect(gmap).toContain('cached.lastUsed = Date.now()');
    // El marcador sigue creándose nuevo en cada pasada (lo exige la librería).
    expect(gmap).toContain('return new HTMLMarker(cluster.position, content,');
  });

  it('la animación de salida del cluster sigue alimentándose en cada pasada', () => {
    const gmap = readSource('../components/GMap.jsx');
    expect(gmap).toContain('lastClusterPosition');
    expect(gmap).toContain('transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)');
    // Dentro del renderer, el marcado de lastClusterPosition va antes del caché.
    const rendererBlock = gmap.slice(gmap.indexOf('const renderer = {'));
    expect(rendererBlock.indexOf('lastClusterPosition')).toBeLessThan(rendererBlock.indexOf('clusterContentCache.current.get'));
  });

  it('el zoom suave avanza de 2 en 2 con clamp al objetivo', () => {
    const gmap = readSource('../components/GMap.jsx');
    expect(gmap).toContain('Math.min(currentZ + 2, targetZ)');
    expect(gmap).toContain('Math.max(currentZ - 2, targetZ)');
    expect(gmap).not.toContain('const step = currentZ < targetZ ? 1 : -1;');
  });

  it('el caché de grupos está acotado en memoria', () => {
    const gmap = readSource('../components/GMap.jsx');
    expect(gmap).toContain('clusterContentCache.current.size > 200');
    expect(gmap).toContain('clusterContentCache.current.delete(key)');
  });
});
