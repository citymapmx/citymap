// Icono de la categoría «Puntos de interés» (lugares): monumento en vez
// del pin verde (decisión de Jonathan, 13 nov 2026).
// - La píldora de categoría del mapa (MapView) muestra el icono `landmark`
//   del componente Icon (lucide, verificado contra lucide-react) en el
//   mismo verde del pin (#43A047).
// - Solo la píldora: los pines del mapa (GMap), la tarjeta del pin
//   (MapView) y el panel de admin siguen usando el archivo lugar.svg.
import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync, existsSync } from 'node:fs';
import Icon from '../components/ui/Icon.jsx';
import { categoryVectorIcon, iconFile } from '../lib/utils.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

describe('icono monumento para Puntos de interés', () => {
  it('categoryVectorIcon: lugares → landmark, el resto → null', () => {
    expect(categoryVectorIcon('lugares')).toBe('landmark');
    expect(categoryVectorIcon('Lugares')).toBe('landmark');
    expect(categoryVectorIcon(' lugares ')).toBe('landmark');
    expect(categoryVectorIcon('restaurantes')).toBe(null);
    expect(categoryVectorIcon('todas')).toBe(null);
    expect(categoryVectorIcon('playa')).toBe(null);
    expect(categoryVectorIcon(null)).toBe(null);
    expect(categoryVectorIcon(undefined)).toBe(null);
    expect(categoryVectorIcon('')).toBe(null);
  });

  it('Icon tiene el landmark de lucide (techo triangular + 4 columnas + base)', () => {
    const html = renderToStaticMarkup(<Icon name="landmark" size={14} color="#43A047" />);
    expect(html).toContain('<polygon points="12 2 20 7 4 7"');
    expect(html).toContain('x1="6" x2="6" y1="18" y2="11"');
    expect(html).toContain('x1="10" x2="10" y1="18" y2="11"');
    expect(html).toContain('x1="14" x2="14" y1="18" y2="11"');
    expect(html).toContain('x1="18" x2="18" y1="18" y2="11"');
    expect(html).toContain('x1="3" x2="21" y1="22" y2="22"');
    expect(html).toContain('stroke="#43A047"');
    expect(html).toContain('width="14"');
  });

  it('la barra de categorías del mapa usa el monumento para lugares, en verde', () => {
    const src = read('../views/MapView.jsx');
    const barStart = src.indexOf('Category Bar (Above Map)');
    const barEnd = src.indexOf('Map Container', barStart);
    expect(barStart).toBeGreaterThan(-1);
    expect(barEnd).toBeGreaterThan(barStart);
    const bar = src.slice(barStart, barEnd);
    expect(bar).toContain('categoryVectorIcon(c.id)');
    expect(bar).toContain('<Icon name={vectorIcon} size={14} color="#43A047" />');
    // El pin verde ya no sale en la píldora: ni su archivo ni su nombre.
    expect(bar).not.toContain('lugar.svg');
    expect(bar).not.toContain('lugar.png');
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
