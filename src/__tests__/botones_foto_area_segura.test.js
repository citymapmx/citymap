// Botones flotantes sobre la foto (volver, corazón, compartir): misma
// medida en la tarjeta del negocio y en el menú (reportado por Jonathan
// 15 nov 2026 con capturas: en la tarjeta se veían más abajo que en el
// menú). La medida es área segura + 12 px: en su iPhone 12 son 59 px
// desde arriba, y la fórmula se adapta a cualquier iPhone (Dynamic
// Island 71 px, SE 32 px) y en web queda en 12 px. El menú usaba
// top: 16 fijo sin área segura y se veía pegado a la hora.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { safeAreaTop } from '../lib/safeArea.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

describe('botones sobre la foto con área segura + 12 px', () => {
  it('safeAreaTop(12) es la medida unificada', () => {
    expect(safeAreaTop(12)).toBe('calc(env(safe-area-inset-top, 0px) + 12px)');
  });

  it('DetailView: la fila de botones usa safeAreaTop(12)', () => {
    const src = read('../views/DetailView.jsx');
    expect(src).toContain("import { safeAreaTop } from \"../lib/safeArea.js\";");
    expect(src).toContain('top: safeAreaTop(12), left: 16, right: 16');
    expect(src).not.toContain('calc(16px + env(safe-area-inset-top, 0px))');
  });

  it('BusinessStore: volver y corazón/compartir usan safeAreaTop(12)', () => {
    const src = read('../components/store/BusinessStore.jsx');
    expect(src).toContain("import { safeAreaTop } from '../../lib/safeArea.js';");
    expect(src).toContain('top: safeAreaTop(12), left: 16');
    expect(src).toContain('top: safeAreaTop(12), right: 16');
    expect(src).not.toContain('top: 16, left: 16');
    expect(src).not.toContain('top: 16, right: 16');
  });
});
