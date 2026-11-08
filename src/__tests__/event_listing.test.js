import { describe, it, expect } from 'vitest';
import { eventCalendarDay, isListedEvent, isPastEvent, eventLastDay, upcomingEvents, formatEventCardDate } from '../lib/eventListing.js';
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
