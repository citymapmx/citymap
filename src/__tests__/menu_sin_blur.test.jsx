// Hallazgo #4 del análisis de fluidez (nov 2026): el blur(12px) del
// encabezado fijo del menú repintaba la zona esmerilada en cada frame al
// bajar y en el WebView del moto g54 se notaba como tirón. La barra vuelve
// a su diseño documentado (menuColorStyles: "encabezado fijo: la primera
// parada (sólido, para que tape al bajar)"): fondo sólido con
// menuTheme.firstColor, sin backdrop-filter. El blur del modal y los toasts
// NO se tocan: no se mueven al hacer scroll. (La píldora de horario con
// blur 4px ya no existe: desde el 26 nov 2026 el horario es texto
// discreto sin fondo, a pedido de Jonathan.)
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  LOYALTY_COLOR_STYLES,
  menuThemeForStyle,
  menuThemeForCustom,
  textOnMenuSurface,
  menuContrastRatio,
} from '../lib/menuColorStyles.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

describe('Menú sin blur en el encabezado fijo (hallazgo #4)', () => {
  it('la barra fija ya no usa backdrop-filter ni blur(12px)', () => {
    const src = read('../components/store/BusinessStore.jsx');
    const stickyAt = src.indexOf("position: 'sticky'");
    expect(stickyAt).toBeGreaterThan(-1);
    const stickyBlock = src.slice(stickyAt - 100, stickyAt + 500);
    expect(stickyBlock).not.toContain('backdropFilter');
    expect(stickyBlock).not.toContain('WebkitBackdropFilter');
    expect(stickyBlock).not.toContain('blur(');
  });

  it('la barra fija es sólida: primera parada con estilo, sólido de hoy sin estilo', () => {
    const src = read('../components/store/BusinessStore.jsx');
    expect(src).toContain("background: menuTheme ? menuTheme.firstColor : (dark ? '#18181B' : '#FFFFFF')");
  });

  it('las píldoras inactivas se leen sobre la primera parada en los 29 estilos (contraste >= 4.5:1)', () => {
    // El texto de la píldora inactiva se calcula contra firstColor
    // (textOnMenuSurface); con la barra sólida ese es su fondo real.
    // Peor caso medido (Propuesta A): Salvia, 4.81:1.
    expect(LOYALTY_COLOR_STYLES.length).toBe(29);
    for (const style of LOYALTY_COLOR_STYLES) {
      const theme = menuThemeForStyle(style);
      expect(theme).not.toBe(null);
      const text = textOnMenuSurface(theme.firstColor);
      expect(menuContrastRatio(text, theme.firstColor)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('las píldoras inactivas se leen también con temas personalizados extremos (contraste >= 3:1)', () => {
    // Los colores propios del editor universal pueden bajar del 4.5
    // (p. ej. verde #16A34A: 3.30); es el mismo perfil que antes del
    // cambio, cuando el texto caía sobre el degradado esmerilado variable.
    // El umbral aquí es el de texto grande (3:1).
    for (const bg of ['#F97316', '#FFFFFF', '#000000', '#FACC15', '#7C3AED', '#16A34A', '#EC4899']) {
      const theme = menuThemeForCustom({ bg, primary: '#111111' });
      expect(theme).not.toBe(null);
      const text = textOnMenuSurface(theme.firstColor);
      expect(menuContrastRatio(text, theme.firstColor)).toBeGreaterThanOrEqual(3);
    }
  });

  it('fuera de alcance, intacto: los toasts con blur(12px); el horario ya no lleva píldora ni blur (26 nov 2026)', () => {
    const src = read('../components/store/BusinessStore.jsx');
    // El horario es texto discreto sin fondo desde el 26 nov 2026: sin
    // píldora oscura y sin blur.
    const at = src.indexOf('scheduleInfo?.text?.[0]');
    expect(at).toBeGreaterThan(-1);
    expect(src.slice(Math.max(0, at - 900), at + 300)).not.toContain('backdropFilter');
    // Los dos toasts conservan su blur(12px).
    const toastBlurs = src.match(/backdropFilter: 'blur\(12px\)'/g) || [];
    expect(toastBlurs.length).toBe(2);
  });

  it('el modal de intención de la ficha conserva su blur(8px)', () => {
    const detail = read('../views/DetailView.jsx');
    expect(detail).toContain("backdropFilter: 'blur(8px)'");
  });
});
