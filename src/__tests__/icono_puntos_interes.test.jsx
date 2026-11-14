// Icono de la categoría «Puntos de interés» (lugares): emoji 🏛️ como las
// demás categorías (decisión de Jonathan, 13 nov 2026; antes usaba el
// icono vectorial `landmark` de la PR #280).
// - La píldora de categoría del mapa (MapView) muestra 🏛️ a 14 px, igual
//   que los emojis de las demás categorías (PR #283).
// - Los pines del mapa (GMap) y la tarjeta del pin (MapView) también
//   muestran 🏛️ (14 nov 2026): el override va antes de iconFile porque
//   el archivo de la categoría (lugar.svg) taparía el emoji.
// - Solo el panel de admin sigue usando el archivo lugar.svg.
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { CAT_EMOJI, categoryEmoji, iconFile } from '../lib/utils.js';

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

  it('CAT_EMOJI: lugares → 🏛️, el resto intacto', () => {
    expect(CAT_EMOJI.lugares).toBe('🏛️');
    expect(CAT_EMOJI.restaurantes).toBe('🍽️');
    expect(CAT_EMOJI.cafe).toBe('☕');
    expect(CAT_EMOJI.salud).toBe('🏥');
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

  it('los pines del mapa (GMap) muestran 🏛️ para lugares', () => {
    const src = read('../components/GMap.jsx');
    expect(src).toContain('categoryEmoji');
    // La cadena del pin: emoji del negocio → override 🏛️ → archivo →
    // CAT_EMOJI → 📍. El override va ANTES de iconFile, si no el
    // lugar.svg taparía el emoji.
    const line = src.split('\n').find((l) => l.includes('const emojiVal = biz.emoji'));
    expect(line).toBeDefined();
    const overrideAt = line.indexOf('categoryEmoji(biz.category)');
    const fileAt = line.indexOf('iconFile(categories.find');
    const mapAt = line.indexOf('CAT_EMOJI[biz.category]');
    expect(overrideAt).toBeGreaterThan(-1);
    expect(fileAt).toBeGreaterThan(overrideAt);
    expect(mapAt).toBeGreaterThan(fileAt);
  });

  it('la tarjeta del pin (MapView) muestra 🏛️ para lugares', () => {
    const src = read('../views/MapView.jsx');
    const line = src.split('\n').find((l) => l.includes('let emojiVal = mapPin.emoji'));
    expect(line).toBeDefined();
    const overrideAt = line.indexOf('categoryEmoji(mapPin.category)');
    const fileAt = line.indexOf('iconFile(cats.find');
    const mapAt = line.indexOf('CAT_EMOJI[mapPin.category]');
    expect(overrideAt).toBeGreaterThan(-1);
    expect(fileAt).toBeGreaterThan(overrideAt);
    expect(mapAt).toBeGreaterThan(fileAt);
  });

  it('el icono landmark y el helper viejo ya no existen', () => {
    expect(read('../components/ui/Icon.jsx')).not.toContain('landmark');
    expect(read('../lib/utils.js')).not.toContain('categoryVectorIcon');
  });

  it('solo el panel de admin sigue usando el archivo lugar.svg', () => {
    // GMap y la tarjeta del pin conservan iconFile en la cadena (para
    // otras categorías con archivo), pero el 🏛️ va antes.
    const gmapSrc = read('../components/GMap.jsx');
    expect(gmapSrc).toContain("iconFile(categories.find(c => c.id === biz.category)?.icon)");
    const mapSrc = read('../views/MapView.jsx');
    expect(mapSrc).toContain("iconFile(cats.find(c => c.id === mapPin.category)?.icon)");
    // El panel de admin sí sigue con el archivo.
    expect(read('../components/admin/AdminCategoriesTab.jsx')).toContain('iconFile(');
    // iconFile sigue mapeando lugar.png → lugar.svg y el archivo sigue ahí.
    expect(iconFile('lugar.png')).toBe('lugar.svg');
    expect(existsSync(new URL('../../public/lugar.svg', import.meta.url))).toBe(true);
    expect(read('../../public/lugar.svg')).toContain('#43A047');
  });
});
