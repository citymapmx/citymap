import { describe, it, expect } from 'vitest';
import { eventCalendarDay, isListedEvent, formatEventCardDate } from '../lib/eventListing.js';
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
});
