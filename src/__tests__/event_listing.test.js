import { describe, it, expect } from 'vitest';
import { eventCalendarDay, isListedEvent, isPastEvent, eventLastDay, upcomingEvents, formatEventCardDate, eventCoversDay, eventOverlapsRange, matchesDateFilter, matchesEventSearch, monthLabel, groupEventsByMonth } from '../lib/eventListing.js';
describe('event listings', () => {
  const today = '2026-10-18';
  it('removes expired events with database times that contain seconds', () => {
    expect(isListedEvent({active:true,date:'2026-10-11',time:'18:30:00'}, today)).toBe(false);
  });
  it('keeps events through their last calendar day', () => {
    expect(isListedEvent({active:true,date:'2026-10-01',end_date:today,time:'09:00:00'}, today)).toBe(true);
    expect(isListedEvent({active:true,date:'2026-10-01',end_date:'2026-10-17'}, today)).toBe(false);
  });
  it('excludes unapproved events and allows undated announcements', () => {
    expect(isListedEvent({active:true,status:'pending'}, today)).toBe(false);
    expect(isListedEvent({active:false}, today)).toBe(false);
    expect(isListedEvent({active:true}, today)).toBe(true);
  });
  it('excludes private events even when approved and active', () => {
    expect(isListedEvent({active:true,status:'approved',visibility:'private',date:'2026-12-20'}, today)).toBe(false);
    expect(isListedEvent({active:true,status:'approved',visibility:'public',date:'2026-12-20'}, today)).toBe(true);
  });
  it('uses the city day when a visitor is in another timezone', () => {
    expect(eventCalendarDay(Date.parse('2026-10-19T01:00:00Z'), 'America/Mazatlan')).toBe(today);
  });
  it('labels ranges that cross months accurately', () => {
    const label = formatEventCardDate({date:'2026-10-20',end_date:'2026-11-26'});
    expect(label).toContain('oct'); expect(label).toContain('nov');
  });
  it('gives undated and today events clear labels', () => {
    expect(formatEventCardDate({})).toBe('Fecha por confirmar');
    expect(formatEventCardDate({date:today},{today})).toBe('Hoy');
  });
  it('detects past events by their last day', () => {
    expect(eventLastDay({date:'2026-10-01',end_date:'2026-10-03'})).toBe('2026-10-03');
    expect(eventLastDay({date:'2026-10-01'})).toBe('2026-10-01');
    expect(isPastEvent({date:'2026-10-17'}, today)).toBe(true);
    expect(isPastEvent({date:'2026-10-01',end_date:today}, today)).toBe(false);
    expect(isPastEvent({date:today}, today)).toBe(false);
    expect(isPastEvent({date:'2026-10-19'}, today)).toBe(false);
    expect(isPastEvent({}, today)).toBe(false);
  });
  it('picks upcoming events in the same city, excluding the past one', () => {
    const past = {id:1,active:true,date:'2026-10-10',city_slug:'tepic'};
    const all = [
      past,
      {id:2,active:true,date:'2026-10-19',city_slug:'tepic',title:'A'},
      {id:3,active:true,date:'2026-10-18',city_slug:'tepic',title:'B'},
      {id:4,active:true,date:'2026-10-20',city_slug:'guadalajara',title:'C'},
      {id:5,active:true,date:'2026-10-15',city_slug:'tepic',title:'D'},
      {id:6,active:true,date:'2026-10-21',city_slug:'all',title:'E'},
    ];
    expect(upcomingEvents(all, past, today).map(e => e.id)).toEqual([3, 2, 6]);
  });
});

describe('filtros de la página de Eventos', () => {
  // Domingo 8 de noviembre de 2026: el fin de semana en curso es vie 6 – dom 8.
  const today = '2026-11-08';
  it('cubre un día dentro de un evento de varios días', () => {
    expect(eventCoversDay({ date: '2026-11-08' }, today)).toBe(true);
    expect(eventCoversDay({ date: '2026-11-09' }, today)).toBe(false);
    expect(eventCoversDay({ date: '2026-11-07', end_date: '2026-11-10' }, today)).toBe(true);
    expect(eventCoversDay({ date: '2026-11-01', end_date: '2026-11-07' }, today)).toBe(false);
    expect(eventCoversDay({}, today)).toBe(true);
  });
  it('detecta si un rango se cruza con otro', () => {
    expect(eventOverlapsRange({ date: '2026-11-05', end_date: '2026-11-07' }, '2026-11-06', '2026-11-08')).toBe(true);
    expect(eventOverlapsRange({ date: '2026-11-09', end_date: '2026-11-12' }, '2026-11-06', '2026-11-08')).toBe(false);
    expect(eventOverlapsRange({ date: '2026-11-08' }, '2026-11-06', '2026-11-08')).toBe(true);
  });
  it('filtra por hoy y mañana', () => {
    expect(matchesDateFilter({ date: '2026-11-08' }, 'hoy', today)).toBe(true);
    expect(matchesDateFilter({ date: '2026-11-09' }, 'hoy', today)).toBe(false);
    expect(matchesDateFilter({ date: '2026-11-07', end_date: '2026-11-10' }, 'hoy', today)).toBe(true);
    expect(matchesDateFilter({ date: '2026-11-09' }, 'manana', today)).toBe(true);
    expect(matchesDateFilter({ date: '2026-11-08' }, 'manana', today)).toBe(false);
    expect(matchesDateFilter({ date: '2026-11-10' }, 'todos', today)).toBe(true);
  });
  it('filtra por el fin de semana en curso (vie–dom)', () => {
    expect(matchesDateFilter({ date: '2026-11-06' }, 'finde', today)).toBe(true);
    expect(matchesDateFilter({ date: '2026-11-08' }, 'finde', today)).toBe(true);
    expect(matchesDateFilter({ date: '2026-11-09' }, 'finde', today)).toBe(false);
    expect(matchesDateFilter({ date: '2026-11-05', end_date: '2026-11-07' }, 'finde', today)).toBe(true);
    // Un lunes toma el fin de semana que viene, no el pasado.
    expect(matchesDateFilter({ date: '2026-11-13' }, 'finde', '2026-11-09')).toBe(true);
    expect(matchesDateFilter({ date: '2026-11-08' }, 'finde', '2026-11-09')).toBe(false);
  });
  it('filtra por el mes en curso', () => {
    expect(matchesDateFilter({ date: '2026-11-30' }, 'mes', today)).toBe(true);
    expect(matchesDateFilter({ date: '2026-12-01' }, 'mes', today)).toBe(false);
    expect(matchesDateFilter({ date: '2026-10-30', end_date: '2026-11-02' }, 'mes', today)).toBe(true);
    expect(matchesDateFilter({ date: '2026-10-01', end_date: '2026-10-31' }, 'mes', today)).toBe(false);
  });
  it('busca por nombre, lugar y categoría sin importar mayúsculas', () => {
    const ev = { title: 'Calaverandia 2026', venue_name: 'Parque Ávila Camacho', event_category: 'Festival' };
    expect(matchesEventSearch(ev, 'calaverandia')).toBe(true);
    expect(matchesEventSearch(ev, 'avila camacho')).toBe(true);
    expect(matchesEventSearch(ev, 'festival calaverandia')).toBe(true);
    expect(matchesEventSearch(ev, 'concierto')).toBe(false);
    expect(matchesEventSearch(ev, '')).toBe(true);
  });
  it('busca también en el título y la descripción en inglés (fase 2 i18n)', () => {
    const ev = { title: 'Noche de Museos', title_en: 'Museum Night', description_en: 'A night walk through the museums of the city', venue_name: 'Centro', event_category: 'Cultura' };
    expect(matchesEventSearch(ev, 'museum night')).toBe(true);
    expect(matchesEventSearch(ev, 'night walk')).toBe(true);
    expect(matchesEventSearch(ev, 'museos')).toBe(true);
    expect(matchesEventSearch(ev, 'concert')).toBe(false);
  });
  it('agrupa por mes con etiqueta en español y los sin fecha al final', () => {
    expect(monthLabel('2026-11')).toBe('Noviembre 2026');
    expect(monthLabel('2027-01')).toBe('Enero 2027');
    expect(monthLabel('sin-fecha')).toBe('Sin fecha');
    const groups = groupEventsByMonth([
      { id: 1, date: '2026-12-05' },
      { id: 2, date: '2026-11-08' },
      { id: 3, date: '2026-11-20' },
      { id: 4 },
    ]);
    expect(groups.map(g => g.key)).toEqual(['2026-12', '2026-11', 'sin-fecha']);
    expect(groups.map(g => g.label)).toEqual(['Diciembre 2026', 'Noviembre 2026', 'Sin fecha']);
    expect(groups[1].events.map(e => e.id)).toEqual([2, 3]);
  });
});
