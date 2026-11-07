import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { useAppInitialization } from '../hooks/useAppInitialization.js';

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

describe('useAppInitialization: enlaces profundos a eventos', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
  });

  it('no antepone la ciudad guardada al slug completo de un evento de otra ciudad', () => {
    // El bug: con Tlaquepaque guardada, /evento/tepic-alfredo-olivas-en-tepic
    // se convertía en `tlaquepaque-tepic-alfredo-olivas-en-tepic`, no se
    // encontraba en la base y la app caía en la lista de eventos.
    const init = probe('/evento/tepic-alfredo-olivas-en-tepic', '', 'tlaquepaque');
    expect(init.initialEvParam.current).toBe('tepic-alfredo-olivas-en-tepic');
  });

  it('deja intacto el slug cuando la ciudad guardada coincide con la del evento', () => {
    const init = probe('/evento/tepic-alfredo-olivas-en-tepic', '', 'tepic');
    expect(init.initialEvParam.current).toBe('tepic-alfredo-olivas-en-tepic');
  });

  it('pasa tal cual un slug corto de ?ev= (el reintento con ciudad vive en App.jsx)', () => {
    const init = probe('/', '?ev=alfredo-olivas-en-tepic', 'tepic');
    expect(init.initialEvParam.current).toBe('alfredo-olivas-en-tepic');
  });

  it('sigue anteponiendo la ciudad de la URL a un negocio (/:ciudad/:slug)', () => {
    const init = probe('/guadalajara/el-maltes', '', 'tepic');
    expect(init.initialBizParam.current).toBe('guadalajara-el-maltes');
  });
});
