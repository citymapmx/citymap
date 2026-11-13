// Mis Favoritos, propuesta C (12 nov 2026, Jonathan): lista de lugares
// guardados con contador de visitados, tarjeta del lugar, filtro que
// recorta la lista, agenda con cuenta atrás y campana de recordatorio.
// El mapa de Google se quitó de esta sección el 13 nov 2026 («quita el
// mapa de favoritos no me gustó»): ya no hay pines ni aviso de mapa.
// Pruebas de la lógica pura y del render estático de los dos
// componentes nuevos, más la fuente de FavsView.

import { describe, it, expect, afterEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { countdownEvento, ordenarAgendaEventos } from '../lib/countdownEvento.js';
import { colorParaLugar } from '../lib/mapaFavoritos.js';
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

// Lugares reales de Jonathan (propuesta C del artefacto). Dalila va sin
// coordenadas: en la lista sale igual que los demás (sin mapa ya no hay
// pines ni aviso de ubicación).
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

function renderLista(props = {}) {
  return renderToStaticMarkup(
    <FavoritosMapa
      T={T} t={t} places={PLACES} selectedId="cafe-bros" onSelect={() => {}}
      filter="todos" onFilterChange={() => {}} visitedIds={['akami']}
      onToggleVisit={() => {}} onGoDir={() => {}} onOrganize={() => {}}
      onToggleFav={() => {}} onOpen={() => {}}
      {...props}
    />,
  );
}

// La lista es lo que se pinta después de la tarjeta del seleccionado:
// se recorta por ahí para no confundirla con la tarjeta.
const soloLista = (html) => html.slice(html.indexOf('Lista de lugares guardados'));

describe('FavoritosMapa: lista sin mapa, contador y tarjeta del lugar', () => {
  it('sin mapa: no hay contenedor de mapa, ni título de mapa, ni aviso de ubicación', () => {
    const html = renderLista();
    expect(html).not.toContain('Mapa de tus favoritos');
    expect(html).not.toContain('Cargando mapa…');
    expect(html).not.toContain('Mapa de Google');
    expect(html).not.toContain('sin ubicación en el mapa');
    expect(html).not.toContain('role="application"');
    expect(html).not.toContain('El mapa no se pudo cargar');
    // La lista trae a todos, incluida Dalila (sin coordenadas).
    expect(html).toContain('La Chata');
    expect(html).toContain('Akami Sushi');
    expect(html).toContain('Dalila');
    expect(html).toContain('Café Bros Company');
  });

  it('la lista conserva el orden y numera 1..N', () => {
    const lista = soloLista(renderLista());
    expect(lista.indexOf('La Chata')).toBeLessThan(lista.indexOf('Akami Sushi'));
    expect(lista.indexOf('Akami Sushi')).toBeLessThan(lista.indexOf('Dalila'));
    expect(lista.indexOf('Dalila')).toBeLessThan(lista.indexOf('Café Bros Company'));
  });

  it('contador de visitados y tarjeta del seleccionado con sus acciones', () => {
    const html = renderLista();
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
    const html = renderLista({ selectedId: 'akami' });
    expect(html).toContain('Ya lo visitaste');
    expect(html).toContain('Colección: Para cita');
  });

  it('el filtro Visitados recorta la lista a solo los visitados', () => {
    const lista = soloLista(renderLista({ filter: 'visitados' }));
    expect(lista).toContain('Akami Sushi');
    expect(lista).not.toContain('La Chata');
    expect(lista).not.toContain('Dalila');
    expect(lista).not.toContain('Café Bros Company');
  });

  it('el filtro Sin visitar recorta la lista a solo los pendientes', () => {
    const lista = soloLista(renderLista({ filter: 'pendientes' }));
    expect(lista).toContain('La Chata');
    expect(lista).toContain('Dalila');
    expect(lista).toContain('Café Bros Company');
    expect(lista).not.toContain('Akami Sushi');
  });

  it('el filtro Todos muestra la lista completa', () => {
    const lista = soloLista(renderLista({ filter: 'todos' }));
    expect(lista).toContain('La Chata');
    expect(lista).toContain('Akami Sushi');
    expect(lista).toContain('Dalila');
    expect(lista).toContain('Café Bros Company');
  });
});

describe('FavoritosMapa (fuente): sin mapa de Google, el filtro recorta la lista', () => {
  const src = () => readFileSync(new URL('../components/favoritos/FavoritosMapa.jsx', import.meta.url), 'utf8');

  it('nada de Google Maps: ni hook, ni mapa, ni OverlayView, ni boundary del mapa', () => {
    const s = src();
    expect(s).not.toContain('useGMaps');
    expect(s).not.toContain('new window.google.maps.Map');
    expect(s).not.toContain('createOverlayMarker');
    expect(s).not.toContain('MapaNoDisponible');
    expect(s).not.toContain('ErrorBoundary');
    expect(s).not.toContain('parseLatLng');
    expect(s).not.toContain('Mapa de tus favoritos');
    expect(s).not.toContain('Cargando mapa');
    expect(s).not.toContain('fitBounds');
  });

  it('el filtro recorta la lista visible por visitados', () => {
    const s = src();
    expect(s).toContain('visiblePlaces');
    expect(s).toContain("filter === 'visitados'");
    expect(s).toContain("filter === 'pendientes'");
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
    expect(src()).toContain('ordenarAgendaEventos');
    expect(src()).toContain('loadVisitados');
    expect(src()).toContain('getEventCalendarUrl');
    // Sin mapa: ya no hay centro de ciudad ni proyección esquemática.
    expect(src()).not.toContain('getCityCenter');
    expect(src()).not.toContain('favCityCenter');
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
