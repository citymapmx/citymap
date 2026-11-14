/**
 * La píldora de distancia («904m») sobre la foto de portada de la ficha
 * se quitó por decisión de Jonathan (14 Nov 2026): se veía invasiva.
 * La distancia sigue en el mapa (MapView), donde sirve para comparar.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

const readSrc = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');

describe('Ficha sin píldora de distancia (Jonathan 14 Nov 2026)', () => {

  it('DetailView ya no renderiza la píldora de distancia sobre la foto', () => {
    const src = readSrc('../views/DetailView.jsx');
    expect(src).not.toContain('Pill distance');
    expect(src).not.toContain('getKm(userCoords');
    expect(src).not.toContain('Math.round(dist * 1000)');
  });

  it('DetailView ya no importa getKm ni usa userCoords', () => {
    const src = readSrc('../views/DetailView.jsx');
    expect(src).not.toContain('getKm');
    expect(src).not.toContain('userCoords');
  });

  it('la distancia se mantiene en el mapa (MapView)', () => {
    const src = readSrc('../views/MapView.jsx');
    expect(src).toContain('getKm');
  });
});
