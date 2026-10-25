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
    expect(url.searchParams.get('dates')).toBe('20261017/20261018');
    expect(url.searchParams.get('details')).toContain('18:00');
    expect(url.searchParams.get('details')).toContain('Configura una alerta');
    expect(url.searchParams.get('location')).toBe('Tepic');
  });
  it('does not generate a broken calendar link for missing dates', () => {
    expect(getEventCalendarUrl({ title: 'Sin fecha' })).toBeNull();
  });
});
