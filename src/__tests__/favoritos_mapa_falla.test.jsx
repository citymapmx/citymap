// Mis Favoritos: fallo del mapa real de Google (12 nov 2026).
//
// REPRODUCCIÓN: Google eliminó `google.maps.Marker` del canal weekly
// (v3.66, referencia oficial actualizada 25 oct 2026: la sección "Marker
// (deprecated)" aparece tachada, igual que MarkerOptions, PlacesService,
// DirectionsService y DirectionsRenderer). La app carga el script SIN
// versión (canal weekly), así que al montar Mis Favoritos (PR #267)
// `new google.Marker` lanzaba TypeError y el ErrorBoundary de la ruta
// pintaba el «Algo salió mal» de toda la vista.
//
// Estas pruebas afirman, con un `google` simulado con la forma de v3.66
// (SIN Marker, SIN PlacesService, SIN DirectionsService):
// 1. que ningún archivo del cambio usa ya `new google.Marker`;
// 2. que el pin OverlayView (createOverlayMarker) funciona con esa API;
// 3. que si el mapa falla, la vista muestra el aviso chico y no el
//    «Algo salió mal», y la agenda/lista quedan fuera del boundary del mapa.

import { describe, it, expect, afterEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { createOverlayMarker } from '../lib/googleOverlayMarker.js';
import FavoritosMapa, { MapaNoDisponible } from '../components/favoritos/FavoritosMapa.jsx';
import { ErrorBoundary } from '../components/ErrorBoundary.jsx';
import LoadFailureView from '../components/LoadFailureView.jsx';

const T = {
  text: '#111', sub: '#666', bg: '#fff', white: '#fff', border: '#ddd',
  red: '#DC2626', gold: '#B8872A', green: '#000', greenL: '#F3F4F6',
  shadow: 'none', dark: false,
};

const t = (key, fallback, vars) => {
  let s = fallback ?? key;
  if (vars && typeof s === 'string') {
    s = s.replace(/\$\{(\w+)\}/g, (_, n) => (vars[n] ?? ''));
  }
  return s;
};

// ---- Simulación mínima del DOM (no hay jsdom en estas pruebas) ----
class FakeEl {
  constructor(tag) {
    this.tagName = (tag || 'div').toUpperCase();
    this.style = {};
    this.children = [];
    this.listeners = {};
    this.title = '';
    this.innerHTML = '';
    this.removed = false;
  }
  appendChild(el) { this.children.push(el); return el; }
  replaceChildren(...els) { this.children = els; }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  remove() { this.removed = true; }
  click() { (this.listeners.click || []).forEach((fn) => fn()); }
}

const prevDocument = globalThis.document;
afterEach(() => {
  if (prevDocument === undefined) delete globalThis.document;
  else globalThis.document = prevDocument;
});

function installFakeDocument() {
  globalThis.document = { createElement: (tag) => new FakeEl(tag) };
}

// ---- google.maps con la forma de la API weekly v3.66 ----
// OverlayView, Map, LatLngBounds y event SÍ existen; Marker,
// PlacesService, DirectionsService y DirectionsRenderer NO.
function makeV366Google(pane) {
  class FakeOverlayView {
    setMap(map) {
      this._map = map;
      if (map) { this.onAdd(); this.draw(); }
      else if (typeof this.onRemove === 'function') this.onRemove();
    }
    getPanes() { return { overlayMouseTarget: pane }; }
    getProjection() {
      return { fromLatLngToDivPixel: (pos) => ({ x: 100 + pos.lng, y: 200 - pos.lat }) };
    }
  }
  return { maps: { OverlayView: FakeOverlayView } };
}

describe('la condición que rompía Favoritos: google.maps.Marker ya no existe', () => {
  it('en la API v3.66, Marker es undefined y construirlo lanza TypeError', () => {
    const google = makeV366Google(new FakeEl('div'));
    expect(google.maps.Marker).toBeUndefined();
    expect(google.maps.places).toBeUndefined();
    expect(() => new google.maps.Marker({})).toThrow(TypeError);
  });
});

describe('createOverlayMarker con la API v3.66 (sin Marker)', () => {
  it('crea el pin, lo posiciona en el pane y responde al clic', () => {
    installFakeDocument();
    const pane = new FakeEl('div');
    const google = makeV366Google(pane);
    let clicked = null;
    const pin = createOverlayMarker(google, {
      map: {},
      position: { lat: 20, lng: -100 },
      content: '<svg></svg>',
      title: 'La Chata',
      zIndex: 5,
      onClick: () => { clicked = 'la-chata'; },
    });
    expect(pane.children).toContain(pin.div);
    expect(pin.div.style.left).toBe('0px');
    expect(pin.div.style.top).toBe('180px');
    expect(pin.div.style.transform).toBe('translate(-50%, -100%)');
    expect(pin.div.style.zIndex).toBe('5');
    expect(pin.div.title).toBe('La Chata');
    expect(pin.div.innerHTML).toBe('<svg></svg>');
    expect(pin.getPosition()).toEqual({ lat: 20, lng: -100 });
    pin.div.click();
    expect(clicked).toBe('la-chata');
  });

  it('anchor center centra el dibujo sobre el punto (pin de usuario)', () => {
    installFakeDocument();
    const google = makeV366Google(new FakeEl('div'));
    const pin = createOverlayMarker(google, {
      map: {}, position: { lat: 20, lng: -100 }, content: 'x', anchor: 'center',
    });
    expect(pin.div.style.transform).toBe('translate(-50%, -50%)');
  });

  it('setPosition, setContent, setOpacity y setZIndex actualizan el pin', () => {
    installFakeDocument();
    const google = makeV366Google(new FakeEl('div'));
    const pin = createOverlayMarker(google, {
      map: {}, position: { lat: 20, lng: -100 }, content: '<b>1</b>',
    });
    pin.setPosition({ lat: 21, lng: -101 });
    expect(pin.div.style.left).toBe('-1px');
    expect(pin.div.style.top).toBe('179px');
    expect(pin.getPosition()).toEqual({ lat: 21, lng: -101 });
    pin.setContent('<b>2</b>');
    expect(pin.div.innerHTML).toBe('<b>2</b>');
    pin.setOpacity(0.25);
    expect(pin.div.style.opacity).toBe('0.25');
    pin.setZIndex(999);
    expect(pin.div.style.zIndex).toBe('999');
  });

  it('setMap(null) quita el pin; sin mapa no rompe', () => {
    installFakeDocument();
    const pane = new FakeEl('div');
    const google = makeV366Google(pane);
    const pin = createOverlayMarker(google, {
      map: {}, position: { lat: 20, lng: -100 }, content: 'x',
    });
    expect(pin.div.removed).toBe(false);
    pin.setMap(null);
    expect(pin.div.removed).toBe(true);
    expect(() => createOverlayMarker(google, {
      position: { lat: 20, lng: -100 }, content: 'x',
    })).not.toThrow();
  });
});

describe('fuente: ningún `new google.Marker` en el cambio', () => {
  const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
  const noMarker = (src) => expect(src).not.toMatch(/new\s+(window\.google\.maps\.|google\.)Marker\s*\(/);

  it('FavoritosMapa usa OverlayView y tiene el blindaje', () => {
    const src = read('../components/favoritos/FavoritosMapa.jsx');
    noMarker(src);
    expect(src).toContain('createOverlayMarker');
    expect(src).toContain('pinSvg(color, sel, labelText)');
    // Blindaje: aviso chico + boundary propio + try/catch + tope de carga.
    expect(src).toContain('MapaNoDisponible');
    expect(src).toContain('ErrorBoundary');
    expect(src).toContain('fallback=');
    expect(src).toContain('8000');
    expect(src).toContain('setMapError(true)');
    expect(src).toContain('setMapAttempt');
  });

  it('GMap: pin de usuario y de utilidades con OverlayView; legacy con guarda', () => {
    const src = read('../components/GMap.jsx');
    noMarker(src);
    expect(src).toContain('createOverlayMarker');
    expect(src).toContain("typeof window.google.maps.places?.PlacesService !== 'function'");
    expect(src).toContain("typeof window.google.maps.DirectionsService === 'function'");
    expect(src).toContain("typeof window.google.maps.DirectionsRenderer === 'function'");
  });

  it('MapPicker usa OverlayView', () => {
    const src = read('../components/map/MapPicker.jsx');
    noMarker(src);
    expect(src).toContain('createOverlayMarker');
  });

  it('ErrorBoundary acepta un fallback propio', () => {
    expect(read('../components/ErrorBoundary.jsx')).toContain('this.props.fallback');
  });

  it('la agenda y las colecciones de FavsView quedan fuera del boundary del mapa', () => {
    const src = read('../views/FavsView.jsx');
    expect(src).toContain('AgendaEventos');
    expect(src).toContain('FavoritosMapa');
    // El boundary vive DENTRO de FavoritosMapa (solo el mapa): si el mapa
    // falla, la agenda y las colecciones no pueden ser tragadas por él.
    expect(src).not.toContain('ErrorBoundary');
  });
});

describe('MapaNoDisponible: aviso chico en el lugar del mapa', () => {
  it('dice que el mapa no cargó, ofrece reintentar y no es el «Algo salió mal»', () => {
    const html = renderToStaticMarkup(
      <MapaNoDisponible T={T} t={t} onRetry={() => {}} />,
    );
    expect(html).toContain('El mapa no se pudo cargar');
    expect(html).toContain('Tus lugares y tu agenda siguen aquí abajo');
    expect(html).toContain('Reintentar');
    expect(html).not.toContain('Algo salió mal');
    expect(html).not.toContain('Comprueba tu conexión');
  });
});

describe('ErrorBoundary con fallback propio', () => {
  // Nota: renderToStaticMarkup NO recupera errores con boundaries (el
  // render legacy re-lanza), así que el boundary se prueba directo por
  // su getDerivedStateFromError + render(), sin pasar por el servidor.
  it('getDerivedStateFromError marca el error sin auto-recuperación (no es chunk)', () => {
    const next = ErrorBoundary.getDerivedStateFromError(new Error('boom del mapa'));
    expect(next.hasError).toBe(true);
    expect(next.autoReloading).toBe(false);
  });

  it('con error, render() devuelve el fallback propio y no LoadFailureView', () => {
    const fallback = <div>aviso chico del mapa</div>;
    const boundary = new ErrorBoundary({ fallback, children: null });
    boundary.state = { hasError: true, error: new Error('boom del mapa'), autoReloading: false };
    const rendered = boundary.render();
    expect(rendered).toBe(fallback);
    const html = renderToStaticMarkup(rendered);
    expect(html).toContain('aviso chico del mapa');
    expect(html).not.toContain('Algo salió mal');
  });

  it('sin fallback propio, render() sigue devolviendo LoadFailureView', () => {
    const boundary = new ErrorBoundary({ children: null });
    boundary.state = { hasError: true, error: new Error('boom'), autoReloading: false };
    expect(boundary.render().type).toBe(LoadFailureView);
  });
});

describe('FavoritosMapa: la vista no se cae sin pines o con coordenadas raras', () => {
  function renderMapa(props = {}) {
    return renderToStaticMarkup(
      <FavoritosMapa
        T={T} t={t} places={[]} selectedId={null} onSelect={() => {}}
        filter="todos" onFilterChange={() => {}} visitedIds={[]}
        onToggleVisit={() => {}} onGoDir={() => {}} onOrganize={() => {}}
        onToggleFav={() => {}} onOpen={() => {}} cityCenter={{ lat: 20.6767, lng: -103.3475 }} cityName="Guadalajara"
        {...props}
      />,
    );
  }

  it('cero pines: abre sin romperse y muestra el cargando', () => {
    const html = renderMapa();
    expect(html).toContain('Cargando mapa…');
    expect(html).toContain('Mapa de tus favoritos');
    expect(html).not.toContain('Algo salió mal');
  });

  it('lugar con coordenadas inválidas: no rompe la leyenda', () => {
    const html = renderMapa({
      places: [{ id: 'raro', name: 'Lugar Raro', type: 'Café', lat: 'no', lng: Number.NaN, collectionName: 'X', photos: [] }],
    });
    expect(html).toContain('Lugar Raro');
    expect(html).toContain('1 lugar(es) sin ubicación en el mapa');
    expect(html).not.toContain('Algo salió mal');
  });
});
