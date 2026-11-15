import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(join(here, '..', '..', rel), 'utf8');

// Aviso de Privacidad (15 nov 2026): el texto debe coincidir con lo
// declarado en App Privacy de App Store Connect (ruta /privacy).
// La app NO tiene SDK de analítica: el texto no debe afirmar que se
// usan herramientas de análisis.

describe('Aviso de Privacidad (/privacy)', () => {
  const src = read('src/Privacy.jsx');

  it('fecha y responsable actualizados', () => {
    expect(src).toContain('15 de noviembre de 2026');
    expect(src).toContain('Jonathan Arana');
    expect(src).toContain('citymap.mx@gmail.com');
    expect(src).not.toContain('junio de 2026');
    expect(src).not.toContain('soporte@citymap.mx');
  });

  it('declara los datos de App Privacy', () => {
    expect(src).toContain('WhatsApp');
    expect(src).toContain('tarjeta de lealtad');
    expect(src.toLowerCase()).toContain('ubicación precisa');
    expect(src).toContain('Fotos o videos');
    expect(src).toContain('identificador de tu dispositivo');
    expect(src).toContain('favoritos, reservaciones y sellos de lealtad');
  });

  it('deja claro que no hay rastreo ni venta de datos', () => {
    expect(src.toLowerCase()).toContain('no utiliza tus datos para rastrearte');
    expect(src).toContain('no vende');
    expect(src.toLowerCase()).toContain('ni la comparte con fines publicitarios');
  });

  it('nombra a los proveedores con los que se comparten datos', () => {
    expect(src).toContain('Supabase');
    expect(src).toContain('Google y Apple');
    expect(src).toContain('Stripe');
    expect(src).toContain('Firebase');
  });

  it('incluye derechos y menores de 13 años', () => {
    expect(src).toContain('eliminación de tu cuenta');
    expect(src).toContain('13 años');
  });

  it('no afirma herramientas de análisis', () => {
    expect(src).not.toContain('herramientas de análisis');
    expect(src).not.toMatch(/Google Analytics/i);
  });

  it('la ruta /privacy sigue registrada', () => {
    expect(read('src/router/AppRouter.jsx')).toContain('<Route path="/privacy"');
    expect(read('src/router/AppRouter.jsx')).toContain("'/privacy'");
    expect(read('src/App.jsx')).toContain("'/privacy'");
    expect(read('middleware.js')).toContain("'privacy'");
    expect(read('src/lib/seoRoutes.js')).toContain("'privacy'");
  });
});
