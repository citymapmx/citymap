// Mis Favoritos, propuesta C (12 nov 2026, Jonathan): mapa real de Google
// con pines numerados, contador de visitados, agenda con cuenta atrás y
// campana de recordatorio. Pruebas de la lógica pura y del render estático
// de los dos componentes nuevos, más la fuente de FavsView.

import { describe, it, expect, afterEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { countdownEvento, ordenarAgendaEventos } from '../lib/countdownEvento.js';
import { parseLatLng, colorParaLugar } from '../lib/mapaFavoritos.js';
import { loadIdSet, saveIdSet, toggleIdInList, VISITADOS_KEY } from '../lib/favoritosLocales.js';
import FavoritosMapa from '../components/favoritos/FavoritosMapa.jsx';
import AgendaEventos from '../components/favoritos/AgendaEventos.jsx';

const T = {
  text: '#111', sub: '#666', bg: '#fff', white: '#fff', border: '#ddd',
  red: '#DC2626', gold: '#B8872A', green: '#000', greenL: '#F3F4F6',
  shadow: 'none', dark: false,
};

// t() de pruebas: devuelve el fallback con ${var} interpolado.
const t = (key, fallback, vars) => {
  let s = fallback ?? key;
  if (vars && typeof s === 'string') {
    s = s.replace(/\$\{(\w+)\}/g, (_, n) => (vars[n] ?? ''));
  }
  return s;
};

const HOY = '2026-11-12';

describe('countdownEvento: etiquetas Hoy/Mañana/En N días/Fue ayer/Hace N días', () => {
  it('hoy, mañana y en N días', () => {
    expect(countdownEvento('2026-11-12', HOY)).toEqual({ kind: 'hoy', days: 0 });
    expect(countdownEvento('2026-11-13', HOY)).toEqual({ kind: 'manana', days: 1 });
    expect(countdownEvento('2026-11-15', HOY)).toEqual({ kind: 'en_dias', days: 3 });
    expect(countdownEvento('2026-12-12', HOY)).toEqual({ kind: 'en_dias', days: 30 });
  });

  it('ayer y hace N días', () => {
    expect(countdownEvento('2026-11-11', HOY)).toEqual({ kind: 'ayer', days: 1 });
    expect(countdownEvento('2026-11-10', HOY)).toEqual({ kind: 'hace_dias', days: 2 });
  });

  it('sin fecha con fecha inválida o sin hoy válido', () => {
    expect(countdownEvento('', HOY).kind).toBe('sin_fecha');
    expect(countdownEvento('2026-13-40', HOY).kind).toBe('sin_fecha');
    expect(countdownEvento('2026-11-12', 'no-fecha').kind).toBe('sin_fecha');
  });
});

describe('ordenarAgendaEventos: próximos primero por fecha, luego pasados', () => {
  const evs = [
    { id: 'viejo', date: '2026-11-10', time: '19:00' },
    { id: 'eslabon', date: '2026-11-13', time: '21:00' },
    { id: 'orquesta', date: '2026-11-12', time: '20:00' },
    { id: 'sin-fecha', date: '' },
    { id: 'viejo2', date: '2026-11-09', time: '18:00' },
  ];

  it('próximos ascendentes, pasados descendentes, sin fecha al final', () => {
    expect(ordenarAgendaEventos(evs, HOY).map((e) => e.id)).toEqual([
      'orquesta', 'eslabon', 'viejo', 'viejo2', 'sin-fecha',
    ]);
  });

  it('sin hoy válido, todo por fecha ascendente', () => {
    expect(ordenarAgendaEventos(evs, '').map((e) => e.id)[0]).toBe('viejo2');
  });

  it('no muta el arreglo original', () => {
    const copy = [...evs];
    ordenarAgendaEventos(evs, HOY);
    expect(evs).toEqual(copy);
  });
});

describe('parseLatLng: coordenadas válidas o null (nunca inventadas)', () => {
  it('números y cadenas numéricas pasan; el resto es null', () => {
    expect(parseLatLng({ lat: 20.6767, lng: -103.3475 })).toEqual({ lat: 20.6767, lng: -103.3475 });
    expect(parseLatLng({ lat: '20.67', lng: '-103.35' })).toEqual({ lat: 20.67, lng: -103.35 });
    expect(parseLatLng({ lat: null, lng: null })).toBe(null);
    expect(parseLatLng({ lat: 200, lng: 'no' })).toBe(null);
    expect(parseLatLng({ lat: 20.67 })).toBe(null);
    expect(parseLatLng({})).toBe(null);
    expect(parseLatLng(null)).toBe(null);
  });
});

describe('colorParaLugar: color determinista por id', () => {
  it('mismo id, mismo color; color dentro de la paleta', () => {
    expect(colorParaLugar('cafe-bros')).toBe(colorParaLugar('cafe-bros'));
    expect(['#1A7A5E', '#7C3AED', '#B45309', '#0E7490', '#BE185D']).toContain(colorParaLugar('cafe-bros'));
  });
});

describe('favoritosLocales: visitados y alertas en localStorage', () => {
  const store = new Map();
  const stub = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
  };
  const prev = globalThis.localStorage;
  afterEach(() => {
    store.clear();
    if (prev === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = prev;
  });

  it('toggleIdInList agrega y quita sin mutar', () => {
    expect(toggleIdInList([], 'a')).toEqual(['a']);
    expect(toggleIdInList(['a', 'b'], 'a')).toEqual(['b']);
    const base = ['a'];
    toggleIdInList(base, 'b');
    expect(base).toEqual(['a']);
  });

  it('save/load redondos y [] con JSON roto', () => {
    globalThis.localStorage = stub;
    saveIdSet(VISITADOS_KEY, ['a', 'b']);
    expect(loadIdSet(VISITADOS_KEY)).toEqual(['a', 'b']);
    store.set(VISITADOS_KEY, 'no-json{');
    expect(loadIdSet(VISITADOS_KEY)).toEqual([]);
  });

  it('sin localStorage devuelve [] y no rompe', () => {
    delete globalThis.localStorage;
    expect(loadIdSet(VISITADOS_KEY)).toEqual([]);
    expect(() => saveIdSet(VISITADOS_KEY, ['a'])).not.toThrow();
  });
});

// Lugares reales de Jonathan (propuesta C del artefacto), con coordenadas
// de Guadalajara. Dalila va sin coordenadas: no lleva pin, solo leyenda.
const PLACES = [
  { id: 'la-chata', name: 'La Chata', type: 'Restaurante', lat: 20.6767, lng: -103.3475, collectionName: 'Por visitar', photos: [] },
  { id: 'akami', name: 'Akami Sushi', type: 'Restaurante', lat: 20.6997, lng: -103.38, collectionName: 'Para cita', photos: [] },
  { id: 'dalila', name: 'Dalila', type: 'Café', lat: null, lng: null, collectionName: 'Para cita', photos: [] },
  { id: 'cafe-bros', name: 'Café Bros Company', type: 'Café', lat: 20.673, lng: -103.352, collectionName: 'Sin organizar', photos: [{ url: 'https://example.com/cafe.jpg' }] },
];

const EVENTS = [
  { id: 'orquesta', title: 'Orquesta Filarmónica de Jalisco', venue_name: 'Teatro Degollado', date: '2026-11-12', time: '20:00' },
  { id: 'eslabon', title: 'Eslabón Armado', venue_name: 'Teatro Diana', date: '2026-11-13', time: '21:00' },
  { id: 'viejo', title: 'Evento viejo', venue_name: 'Foro Viejo', date: '2026-11-10', time: '19:00' },
];

function renderMapa(props = {}) {
  return renderToStaticMarkup(
    <FavoritosMapa
      T={T} t={t} places={PLACES} selectedId="cafe-bros" onSelect={() => {}}
      filter="todos" onFilterChange={() => {}} visitedIds={['akami']}
      onToggleVisit={() => {}} onGoDir={() => {}} onOrganize={() => {}}
      onToggleFav={() => {}} onOpen={() => {}} cityCenter={{ lat: 20.6767, lng: -103.3475 }} cityName="Guadalajara"
      {...props}
    />,
  );
}

describe('FavoritosMapa: mapa real de Google, contador y tarjeta del lugar', () => {
  it('sin window.google pinta el "Cargando mapa…" y la leyenda con todos los lugares', () => {
    const html = renderMapa();
    // En node no hay window: el mapa real no se monta, sale el cargando.
    expect(html).toContain('Cargando mapa…');
    expect(html).toContain('Mapa de Google con los pines de tus favoritos en Guadalajara');
    // La leyenda trae a todos, incluida Dalila (sin coordenadas, sin pin).
    expect(html).toContain('La Chata');
    expect(html).toContain('Akami Sushi');
    expect(html).toContain('Dalila');
    expect(html).toContain('Café Bros Company');
    // Y el aviso de que hay lugares sin ubicación en el mapa.
    expect(html).toContain('1 lugar(es) sin ubicación en el mapa');
    // Nada del mapa esquemático: ni cuadrícula, ni avenidas, ni colonias.
    expect(html).not.toContain('repeating-linear-gradient');
    expect(html).not.toContain('Providencia');
    expect(html).not.toContain('data-pin-id');
  });

  it('la leyenda conserva el orden de la lista (el número del pin es el índice + 1)', () => {
    const html = renderMapa();
    // La tarjeta del seleccionado va antes: el orden se comprueba dentro
    // de la leyenda (aria-label "Lista de lugares del mapa").
    const leyenda = html.slice(html.indexOf('Lista de lugares del mapa'));
    expect(leyenda.indexOf('La Chata')).toBeLessThan(leyenda.indexOf('Akami Sushi'));
    expect(leyenda.indexOf('Akami Sushi')).toBeLessThan(leyenda.indexOf('Dalila'));
    expect(leyenda.indexOf('Dalila')).toBeLessThan(leyenda.indexOf('Café Bros Company'));
  });

  it('contador de visitados y tarjeta del seleccionado con sus acciones', () => {
    const html = renderMapa();
    expect(html).toContain('1 de 4 visitados');
    expect(html).toContain('Café Bros Company');
    expect(html).toContain('Cómo llegar');
    expect(html).toContain('Marcar como visitado');
    expect(html).toContain('Organizar en colección');
    expect(html).toContain('Colección: Sin organizar');
    expect(html).toContain('Todos');
    expect(html).toContain('Sin visitar');
    expect(html).toContain('Visitados');
  });

  it('el lugar visitado seleccionado muestra «Ya lo visitaste»', () => {
    const html = renderMapa({ selectedId: 'akami' });
    expect(html).toContain('Ya lo visitaste');
    expect(html).toContain('Colección: Para cita');
  });

  it('sin lugares sin coordenadas no sale el aviso', () => {
    const html = renderMapa({ places: PLACES.filter((p) => p.id !== 'dalila') });
    expect(html).not.toContain('sin ubicación en el mapa');
  });
});

describe('FavoritosMapa (fuente): pines numerados sobre el mapa real de Google', () => {
  const src = () => readFileSync(new URL('../components/favoritos/FavoritosMapa.jsx', import.meta.url), 'utf8');

  it('reutiliza el hook de Google Maps del mapa principal y crea mapa + marcadores', () => {
    expect(src()).toContain("import { useGMaps } from '../GMap.jsx'");
    expect(src()).toContain('new window.google.maps.Map');
    // Los pines son OverlayView (createOverlayMarker), NO google.maps.Marker:
    // Google eliminó Marker del canal weekly (v3.66) y `new google.Marker`
    // lanzaba TypeError al montar y tumbaba TODA la vista (12 nov 2026).
    expect(src()).toContain('createOverlayMarker');
    expect(src()).not.toMatch(/new\s+(window\.google\.maps\.|google\.)Marker\s*\(/);
    expect(src()).toContain('map.fitBounds(bounds, 48)');
  });

  it('solo crea pin con coordenadas reales: sin coords, sin pin inventado', () => {
    expect(src()).toContain('parseLatLng(p)');
    expect(src()).toContain('if (!c) return;');
    // Nada del esquemático: ni proyección a x/y, ni huecos fijos.
    expect(src()).not.toContain('projectToMap');
    expect(src()).not.toContain('MAPA_FALLBACK_SLOTS');
    expect(src()).not.toContain('AVENUES');
    expect(src()).not.toContain('PARKS');
    expect(src()).not.toContain('ZONES_GDL');
  });

  it('el pin lleva el número de la lista (o ✓ si visitado) y al tocarlo abre su tarjeta', () => {
    expect(src()).toContain("String(i + 1)");
    expect(src()).toContain("'✓'");
    // El clic va en el onClick del OverlayView, no en addListener de Marker.
    expect(src()).toContain('onClick: () => onSelect(p.id)');
    expect(src()).toContain('pinSvg(color, sel, labelText)');
  });

  it('con filtro, los pines que no tocan se atenúan', () => {
    expect(src()).toContain('setOpacity(dim ? 0.25 : 1)');
  });
});

function renderAgenda(props = {}) {
  const ordered = ordenarAgendaEventos(EVENTS, HOY);
  return renderToStaticMarkup(
    <AgendaEventos
      T={T} t={t} lang="es" events={ordered} todayStr={HOY}
      alertIds={['eslabon']} onOpen={() => {}} onBell={() => {}}
      {...props}
    />,
  );
}

describe('AgendaEventos: agenda ordenada con cuenta atrás y campana', () => {
  it('ordena próximos antes que pasados y pinta Hoy/Mañana/Hace N días', () => {
    const html = renderAgenda();
    expect(html.indexOf('Orquesta Filarmónica')).toBeLessThan(html.indexOf('Eslabón Armado'));
    expect(html.indexOf('Eslabón Armado')).toBeLessThan(html.indexOf('Evento viejo'));
    expect(html).toContain('Hoy');
    expect(html).toContain('Mañana');
    expect(html).toContain('Hace 2 días');
  });

  it('hora en 12 h, recinto y campana con su estado', () => {
    const html = renderAgenda();
    expect(html).toContain('Teatro Diana · 9:00 p. m.');
    expect(html).toContain('Teatro Degollado · 8:00 p. m.');
    expect(html).toContain('aria-label="Recordatorio para Eslabón Armado"');
    expect(html).toContain('aria-pressed="true"');
    expect((html.match(/aria-pressed="true"/g) || []).length).toBe(1);
    expect(html).toContain('La campana añade el evento a tu calendario');
  });
});

describe('FavsView: cableado de la propuesta C', () => {
  const src = () => readFileSync(new URL('../views/FavsView.jsx', import.meta.url), 'utf8');

  it('usa los componentes nuevos y la lógica pura', () => {
    expect(src()).toContain('FavoritosMapa');
    expect(src()).toContain('AgendaEventos');
    expect(src()).toContain('getCityCenter');
    expect(src()).toContain('ordenarAgendaEventos');
    expect(src()).toContain('loadVisitados');
    expect(src()).toContain('getEventCalendarUrl');
    // Ya no hay proyección esquemática: los lugares van tal cual al mapa.
    expect(src()).not.toContain('projectToMap');
  });

  it('la vista de colección, los modales y el vacío siguen intactos', () => {
    expect(src()).toContain('setActiveCollection(null)');
    expect(src()).toContain('FavoriteCollectionModal');
    expect(src()).toContain('sin_favoritos');
    expect(src()).toContain('TIRA DE COLECCIONES');
  });

  it('la rejilla vieja de «Sin organizar» ya no existe', () => {
    expect(src()).not.toContain('unsortedBiz');
  });
});
