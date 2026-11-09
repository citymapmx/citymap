import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { TRANSLATIONS } from '../lib/i18n.js';

const mapView = readFileSync(new URL('../views/MapView.jsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('../App.jsx', import.meta.url), 'utf8');

describe('Mapa: la ventana de GPS se puede cerrar', () => {
  it('el overlay tiene estado local de descarte', () => {
    expect(mapView).toContain('gpsDismissed');
    expect(mapView).toContain('setGpsDismissed(false)');
  });

  it('el overlay solo se muestra si no hay ubicación Y no se cerró', () => {
    expect(mapView).toContain('{!userCoords && !gpsDismissed && (');
  });

  it('hay un botón de cierre que descarta el overlay', () => {
    expect(mapView).toContain('setGpsDismissed(true)');
    expect(mapView).toContain('aria-label={t("cerrar", "Cerrar")}');
  });

  it('al cambiar de ciudad la ventana puede volver a aparecer', () => {
    expect(mapView).toContain('useEffect(() => { setGpsDismissed(false); }, [activeCity])');
  });

  it('el overlay se desmonta al cerrarse, no se esconde con CSS: los pines quedan tocables', () => {
    // El bloque del overlay vive dentro del condicional: al descartarse no
    // queda ningún elemento en el DOM tapando el centro del mapa.
    const idx = mapView.indexOf('{!userCoords && !gpsDismissed && (');
    expect(idx).toBeGreaterThan(-1);
    expect(mapView.slice(idx, idx + 2000)).toContain('que_hay_cerca');
    expect(mapView).not.toMatch(/gpsDismissed[\s\S]{0,200}display:\s*['"]none['"]/);
  });

  it('el botón Activar GPS conserva su comportamiento', () => {
    expect(mapView).toContain('localStorage.removeItem("cg_manual_city"); requestLocation();');
  });
});

describe('Mapa: el error de GPS avisa en vez de fallar en silencio', () => {
  it('requestLocation ya no tiene el callback de error vacío', () => {
    const idx = app.indexOf('const requestLocation');
    expect(idx).toBeGreaterThan(-1);
    const block = app.slice(idx, idx + 800);
    expect(block).not.toContain('() => { }');
    expect(block).toContain('toast$(t("ubicacion_error"');
  });

  it('la clave del mensaje existe en español e inglés', () => {
    expect(TRANSLATIONS.es.ubicacion_error).toBeTruthy();
    expect(TRANSLATIONS.en.ubicacion_error).toBeTruthy();
  });
});
