// Pines con OverlayView (googleOverlayMarker.js, 12 nov 2026).
//
// Google eliminó `google.maps.Marker` de la API de JavaScript en el
// canal weekly (v3.66, referencia oficial actualizada 25 oct 2026: la
// sección "Marker (deprecated)" aparece tachada, igual que
// MarkerOptions, PlacesService, DirectionsService y
// DirectionsRenderer). La app carga el script SIN versión (canal
// weekly), así que `new google.Marker` lanzaba TypeError.
//
// El helper `createOverlayMarker` es el mecanismo vigente que usan el
// mapa principal (GMap.jsx: pin de usuario y pines de utilidades) y el
// selector de ubicación del admin (MapPicker.jsx). Mis Favoritos ya no
// usa mapas desde el 13 nov 2026, pero el helper sigue vivo en esos
// dos sitios.
//
// Estas pruebas afirman, con un `google` simulado con la forma de
// v3.66 (SIN Marker, SIN PlacesService, SIN DirectionsService), que el
// pin OverlayView funciona y que ningún archivo del mapa principal ni
// del selector usa ya `new google.Marker`.

import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { createOverlayMarker } from '../lib/googleOverlayMarker.js';

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

describe('la API weekly v3.66 no tiene google.maps.Marker', () => {
  it('Marker es undefined y construirlo lanza TypeError', () => {
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

describe('fuente: el mapa principal y el selector usan OverlayView, no Marker', () => {
  const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
  const noMarker = (src) => expect(src).not.toMatch(/new\s+(window\.google\.maps\.|google\.)Marker\s*\(/);

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
});
