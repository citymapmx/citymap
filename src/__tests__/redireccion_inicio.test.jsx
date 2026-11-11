import React from 'react';
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { useAppInitialization } from '../hooks/useAppInitialization.js';

// El store se importa dinámico tras instalar el mock: su inicializador
// lee localStorage al cargar el módulo y en node no existe (el catch lo
// traga, pero ensucia la salida).

// Bug verificado en vivo 11 nov 2026: en perfil limpio, "/" mostraba el
// muro global y a los ~4-7 s saltaba solo a una ciudad. Causa: el arranque
// devolvía la ciudad por defecto ("guadalajara") y el efecto de montaje
// de App.jsx la persistía en cg_city_slug con setActiveCity; desde ahí la
// entrada rápida y la "Segunda entrada" la leían como ciudad guardada y
// navegaban. El arreglo: el defecto vive solo en memoria (persist:false)
// y cg_city_slug solo se escribe cuando la ciudad se eligió explícitamente
// (globo, URL o "Cerca de mí"). Sin clave, las dos redirecciones no
// disparan y "/" se queda en el muro.

// Setup mock localStorage y window.location (entorno node, sin jsdom).
const storageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

globalThis.localStorage = storageMock;

let useUIStore;
beforeAll(async () => {
  ({ useUIStore } = await import('../store/useUIStore.js'));
});

function probe(pathname, search = '', savedCity = '') {
  globalThis.window = { location: { pathname, search } };
  globalThis.localStorage.clear();
  if (savedCity) globalThis.localStorage.setItem('cg_city_slug', savedCity);
  let captured = null;
  function Probe() {
    const init = useAppInitialization();
    captured = init;
    return null;
  }
  renderToStaticMarkup(<Probe />);
  return captured;
}

describe('useAppInitialization: la ciudad por defecto se marca como tal', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
  });

  it('en "/" limpio la ciudad es el defecto en memoria y se marca isDefault', () => {
    const init = probe('/', '', '');
    expect(init.initialParams.current.citySlug).toBe('guadalajara');
    expect(init.initialParams.current.citySlugIsDefault).toBe(true);
  });

  it('en "/" con ciudad guardada explícita no es defecto', () => {
    const init = probe('/', '', 'tepic');
    expect(init.initialParams.current.citySlug).toBe('tepic');
    expect(init.initialParams.current.citySlugIsDefault).toBe(false);
  });

  it('la ciudad de la URL es explícita (no defecto)', () => {
    const init = probe('/tepic', '', '');
    expect(init.initialParams.current.citySlug).toBe('tepic');
    expect(init.initialParams.current.citySlugIsDefault).toBe(false);
  });

  it('la ciudad de un detalle /:ciudad/:slug es explícita', () => {
    const init = probe('/guadalajara/el-maltes', '', '');
    expect(init.initialParams.current.citySlug).toBe('guadalajara');
    expect(init.initialParams.current.citySlugIsDefault).toBe(false);
  });

  it('una ruta de sistema sin ciudad sigue siendo defecto', () => {
    const init = probe('/negocios', '', '');
    expect(init.initialParams.current.citySlug).toBe('guadalajara');
    expect(init.initialParams.current.citySlugIsDefault).toBe(true);
  });
});

describe('useUIStore.setActiveCity: la ciudad por defecto no se persiste', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
    useUIStore.setState({ activeCity: '' });
  });

  it('con persist:false pone la ciudad en memoria sin escribir cg_city_slug', () => {
    useUIStore.getState().setActiveCity('guadalajara', { persist: false });
    expect(useUIStore.getState().activeCity).toBe('guadalajara');
    expect(globalThis.localStorage.getItem('cg_city_slug')).toBeNull();
  });

  it('sin opciones persiste como siempre (la elección explícita sí redirige)', () => {
    useUIStore.getState().setActiveCity('tepic');
    expect(useUIStore.getState().activeCity).toBe('tepic');
    expect(globalThis.localStorage.getItem('cg_city_slug')).toBe('tepic');
  });

  it('persist:false no borra una ciudad guardada antes', () => {
    globalThis.localStorage.setItem('cg_city_slug', 'tepic');
    useUIStore.getState().setActiveCity('guadalajara', { persist: false });
    expect(globalThis.localStorage.getItem('cg_city_slug')).toBe('tepic');
  });

  it('la guarda de slugs inválidos sigue igual', () => {
    useUIStore.getState().setActiveCity('eventos', { persist: false });
    expect(useUIStore.getState().activeCity).toBe('');
    expect(globalThis.localStorage.getItem('cg_city_slug')).toBeNull();
  });
});

describe('cadena completa: lo que hace el efecto de montaje de App.jsx', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
    useUIStore.setState({ activeCity: '' });
  });

  it('perfil limpio en "/": la ciudad por defecto no deja rastro y no hay a dónde redirigir', () => {
    const init = probe('/', '', '');
    expect(init.initialParams.current.citySlugIsDefault).toBe(true);
    useUIStore.getState().setActiveCity(init.initialParams.current.citySlug, {
      persist: !init.initialParams.current.citySlugIsDefault,
    });
    // En memoria sí hay ciudad (para cargar datos), pero en disco no:
    // la entrada rápida y la "Segunda entrada" leen cg_city_slug y solo
    // navegan si existe y es conocida.
    expect(useUIStore.getState().activeCity).toBe('guadalajara');
    expect(globalThis.localStorage.getItem('cg_city_slug')).toBeNull();
  });

  it('ciudad guardada explícita: se persiste y la redirección se conserva', () => {
    const init = probe('/', '', 'tepic');
    expect(init.initialParams.current.citySlugIsDefault).toBe(false);
    useUIStore.getState().setActiveCity(init.initialParams.current.citySlug, {
      persist: !init.initialParams.current.citySlugIsDefault,
    });
    expect(useUIStore.getState().activeCity).toBe('tepic');
    expect(globalThis.localStorage.getItem('cg_city_slug')).toBe('tepic');
  });
});
