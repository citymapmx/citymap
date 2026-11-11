import { describe, it, expect } from 'vitest';
import { isStayOnInitialPath, resolveHomePath } from '../lib/initialRoute.js';

// Bug verificado en vivo 10 nov 2026: en perfil limpio (sin ciudad
// guardada), abrir https://citymap.mx/tepic saltaba solo al muro global
// entre los 0 y 2 s. Causa: el efecto de arranque de App.jsx trataba una
// ruta de ciudad de un solo segmento como "no es detalle ni categoría ni
// sección" y llamaba navigate("home"), que con la ciudad activa todavía
// vacía se resolvía a "/".

describe('enlace directo a ciudad: el arranque no debe navegar', () => {
  it('/tepic se queda (el bug: saltaba al muro global en perfil limpio)', () => {
    expect(isStayOnInitialPath('/tepic')).toBe(true);
  });

  it('otras ciudades de un segmento se quedan', () => {
    expect(isStayOnInitialPath('/guadalajara')).toBe(true);
    expect(isStayOnInitialPath('/puerto-vallarta')).toBe(true);
    expect(isStayOnInitialPath('/san-pedro-garza-garcia')).toBe(true);
  });

  it('detalle y categoría se quedan', () => {
    expect(isStayOnInitialPath('/tepic/emilianos')).toBe(true);
    expect(isStayOnInitialPath('/tepic/c/restaurantes')).toBe(true);
    expect(isStayOnInitialPath('/tepic/restaurante')).toBe(true);
  });

  it('secciones y rutas de sistema se quedan', () => {
    expect(isStayOnInitialPath('/eventos/tepic')).toBe(true);
    expect(isStayOnInitialPath('/tours')).toBe(true);
    expect(isStayOnInitialPath('/negocios')).toBe(true);
    expect(isStayOnInitialPath('/mapa/tepic')).toBe(true);
    expect(isStayOnInitialPath('/revista/tepic')).toBe(true);
    expect(isStayOnInitialPath('/evento/tepic-x')).toBe(true);
  });

  it('una ciudad borrada también se queda (su 404 es del middleware, no de aquí)', () => {
    expect(isStayOnInitialPath('/chapala')).toBe(true);
    expect(isStayOnInitialPath('/zapotlan-el-grande')).toBe(true);
  });

  it('"/" no se queda: se resuelve aparte (muro o ciudad guardada)', () => {
    expect(isStayOnInitialPath('/')).toBe(false);
  });
});

describe('resolveHomePath: "Inicio" con la ciudad viva', () => {
  it('en "/" se queda en el muro', () => {
    expect(resolveHomePath({ pathname: '/', activeCity: 'tepic', cities: [] })).toBe('/');
  });

  it('en una ciudad va a esa ciudad', () => {
    expect(resolveHomePath({ pathname: '/tepic', activeCity: 'tepic', cities: [] })).toBe('/tepic');
  });

  it('sin ciudad conocida cae en "/" (no en una ciudad equivocada)', () => {
    expect(resolveHomePath({ pathname: '/tepic', activeCity: '', cities: [] })).toBe('/');
  });
});
