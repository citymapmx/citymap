// Icono de la categoría «Puntos de interés» (lugares): emoji 🏛️ como las
// demás categorías (decisión de Jonathan, 13 nov 2026; antes usaba el
// icono vectorial `landmark` de la PR #280).
// - La píldora de categoría del mapa (MapView) muestra 🏛️ a 14 px, igual
//   que los emojis de las demás categorías.
// - Solo la píldora: los pines del mapa (GMap), la tarjeta del pin
//   (MapView) y el panel de admin siguen usando el archivo lugar.svg.
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { categoryEmoji, iconFile } from '../lib/utils.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

describe('emoji 🏛️ para Puntos de interés', () => {
  it('categoryEmoji: lugares → 🏛️, el resto → null', () => {
    expect(categoryEmoji('lugares')).toBe('🏛️');
    expect(categoryEmoji('Lugares')).toBe('🏛️');
    expect(categoryEmoji(' lugares ')).toBe('🏛️');
    expect(categoryEmoji('restaurantes')).toBe(null);
    expect(categoryEmoji('todas')).toBe(null);
    expect(categoryEmoji('playa')).toBe(null);
    expect(categoryEmoji(null)).toBe(null);
    expect(categoryEmoji(undefined)).toBe(null);
    expect(categoryEmoji('')).toBe(null);
  });

  it('la barra de categorías del mapa usa 🏛️ para lugares, como las demás', () => {
    const src = read('../views/MapView.jsx');
    const barStart = src.indexOf('Category Bar (Above Map)');
    const barEnd = src.indexOf('Map Container', barStart);
    expect(barStart).toBeGreaterThan(-1);
    expect(barEnd).toBeGreaterThan(barStart);
    const bar = src.slice(barStart, barEnd);
    expect(bar).toContain('categoryEmoji(c.id)');
    expect(bar).toContain('🏛️');
    expect(bar).toContain('<span style={{ fontSize: 14 }}>{emojiOverride}</span>');
    // Ya no hay icono vectorial ni pin verde en la píldora.
    expect(bar).not.toContain('categoryVectorIcon');
    expect(bar).not.toContain('landmark');
    expect(bar).not.toContain('lugar.svg');
    expect(bar).not.toContain('lugar.png');
  });

  it('el icono landmark y el helper viejo ya no existen', () => {
    expect(read('../components/ui/Icon.jsx')).not.toContain('landmark');
    expect(read('../lib/utils.js')).not.toContain('categoryVectorIcon');
  });

  it('el resto sigue usando el pin verde (alcance: solo la píldora)', () => {
    // La tarjeta del pin en MapView sigue con iconFile.
    const mapSrc = read('../views/MapView.jsx');
    expect(mapSrc).toContain("iconFile(cats.find(c => c.id === mapPin.category)?.icon)");
    // Los pines del mapa (GMap) siguen con iconFile.
    const gmapSrc = read('../components/GMap.jsx');
    expect(gmapSrc).toContain("iconFile(categories.find(c => c.id === biz.category)?.icon)");
    // iconFile sigue mapeando lugar.png → lugar.svg y el archivo sigue ahí.
    expect(iconFile('lugar.png')).toBe('lugar.svg');
    expect(existsSync(new URL('../../public/lugar.svg', import.meta.url))).toBe(true);
    expect(read('../../public/lugar.svg')).toContain('#43A047');
  });
});
