import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { eventMatchesQuery } from '../lib/eventSearch.js';
import { searchMatches } from '../lib/utils.js';
import SearchSuggestions from '../components/home/SearchSuggestions.jsx';

// Buscador del inicio (nov 2026): buscar "tacos" devolvía 16 eventos sin
// relación (Fenix, Pimpinela, Porter, ZZ Top...) porque la coincidencia
// difusa con distancia 2 hacía "tacos" ~ "todos", "años", "toros".

const ev = (overrides) => ({
  title: 'Concierto de ejemplo',
  description: 'Una noche para todos los gustos en la ciudad.',
  venue_name: 'Teatro Diana',
  event_category: 'Concierto',
  city_slug: 'guadalajara',
  ...overrides,
});

describe('eventMatchesQuery: la consulta filtra los eventos de verdad', () => {
  it('tacos no coincide con eventos cuya descripción dice todos/años/toros', () => {
    expect(eventMatchesQuery('tacos', ev({}))).toBe(false);
    expect(eventMatchesQuery('tacos', ev({ title: 'Temporada Grande — Corrida 6', venue_name: 'Plaza de Toros Nuevo Progreso', description: 'Corrida de toros para todos.' }))).toBe(false);
    expect(eventMatchesQuery('tacos', ev({ title: 'ZZ Top', description: 'Una noche para todos.' }))).toBe(false);
    expect(eventMatchesQuery('tacos', ev({ title: '21k medio maratón', description: 'Carrera para todos los corredores.' }))).toBe(false);
  });

  it('tacos sí coincide cuando hay tacos de verdad', () => {
    expect(eventMatchesQuery('tacos', ev({ title: 'Festival de Tacos', description: 'Lo mejor de la ciudad.' }))).toBe(true);
    expect(eventMatchesQuery('tacos', ev({ title: 'Feria gastronómica', description: 'Tacos, tortas y más para todos.' }))).toBe(true);
  });

  it('sigue encontrando por título, artista y lugar, con typos', () => {
    expect(eventMatchesQuery('calamaro', ev({ title: 'ANDRÉS CALAMARO' }))).toBe(true);
    expect(eventMatchesQuery('calamrao', ev({ title: 'ANDRÉS CALAMARO' }))).toBe(true);
    expect(eventMatchesQuery('zz top', ev({ title: 'ZZ Top' }))).toBe(true);
    expect(eventMatchesQuery('rock', ev({ title: 'Noche de rock', description: 'Bandas locales.' }))).toBe(true);
    expect(eventMatchesQuery('teatro', ev({ venue_name: 'Teatro Diana' }))).toBe(true);
  });

  it('evento/eventos solos siguen mostrando eventos', () => {
    expect(eventMatchesQuery('eventos', ev({}))).toBe(true);
    expect(eventMatchesQuery('', ev({}))).toBe(false);
  });
});

describe('searchMatches: difusa en lo corto, literal en la descripción', () => {
  it('tacos encuentra Taco Fish pero no un negocio que dice "para todos"', () => {
    expect(searchMatches('tacos', 'Taco Fish La Paz restaurantes', '')).toBe(true);
    expect(searchMatches('tacos', 'Cafetería Central cafe', 'Comida para todos los gustos.')).toBe(false);
    expect(searchMatches('tacos', 'Taquería El Güero', 'Tacos al pastor para todos.')).toBe(true);
  });

  it('tolera un typo en el nombre', () => {
    expect(searchMatches('calamrao', 'ANDRÉS CALAMARO', '')).toBe(true);
    expect(searchMatches('padl', 'Padel Life Tepic', '')).toBe(true);
  });
});

describe('SearchSuggestions: Ver todos solo cuando hay más que mostrar', () => {
  const T = { border: '#ddd', card: '#fff', text: '#111', sub: '#555', white: '#fff' };
  const biz = (id) => ({ id, name: `Lugar ${id}`, photos: [] });

  it('con 5 o menos resultados no muestra el botón', () => {
    const html = renderToStaticMarkup(React.createElement(SearchSuggestions, {
      results: [1, 2, 3].map(biz), T, onSelect: () => {}, onViewAll: () => {},
    }));
    expect(html).not.toContain('Ver todos los resultados');
  });

  it('con más de 5 resultados sí muestra el botón', () => {
    const html = renderToStaticMarkup(React.createElement(SearchSuggestions, {
      results: [1, 2, 3, 4, 5, 6].map(biz), T, onSelect: () => {}, onViewAll: () => {},
    }));
    expect(html).toContain('Ver todos los resultados');
    expect(html.match(/Lugar \d/g)).toHaveLength(5);
  });
});
