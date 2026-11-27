import { describe, expect, it } from 'vitest';
import { getEventCalendarUrl } from '../lib/eventCalendar.js';

describe('saved event calendar reminder', () => {
  it('uses an exclusive end date across month and year boundaries', () => {
    const url = new URL(getEventCalendarUrl({ title: 'Festival', date: '2026-12-31', end_date: '2027-01-02' }));
    expect(url.searchParams.get('dates')).toBe('20261231/20270103');
  });
  it('preserves accents and puts local event time in the description rather than using the visitor timezone', () => {
    const url = new URL(getEventCalendarUrl({ title: 'Café & música', date: '2026-10-17', time: '18:00', venue_name: 'Tepic' }));
    expect(url.searchParams.get('text')).toBe('Café & música');
    // R7 (UX 26 nov 2026): con hora publicada el evento lleva su hora
    // real (18:00–19:00), no un día completo.
    expect(url.searchParams.get('dates')).toBe('20261017T180000/20261017T190000');
    expect(url.searchParams.get('details')).toContain('18:00');
    expect(url.searchParams.get('details')).toContain('Configura una alerta');
    expect(url.searchParams.get('location')).toBe('Tepic');
  });
  it('uses the end time when published, and stays all-day without a time', () => {
    const timed = new URL(getEventCalendarUrl({ title: 'Concierto', date: '2026-11-20', time: '21:00', end_time: '23:30' }));
    expect(timed.searchParams.get('dates')).toBe('20261120T210000/20261120T233000');
    const allDay = new URL(getEventCalendarUrl({ title: 'Feria', date: '2026-11-20', end_date: '2026-11-22' }));
    expect(allDay.searchParams.get('dates')).toBe('20261120/20261123');
  });
  it('does not generate a broken calendar link for missing dates', () => {
    expect(getEventCalendarUrl({ title: 'Sin fecha' })).toBeNull();
  });
});
