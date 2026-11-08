import { describe, it, expect } from 'vitest';
import { randomToken } from '../lib/utils.js';
import { isPrivateEvent, privateEventUrl, summarizeRsvps, formatMessageTime } from '../lib/privateEvents.js';
import { isListedEvent } from '../lib/eventListing.js';

describe('private events', () => {
  it('builds short readable secret tokens', () => {
    const token = randomToken();
    expect(token).toHaveLength(6);
    expect(token).toMatch(/^[a-z2-9]+$/);
    expect(token).not.toMatch(/[01iol]/);
    expect(randomToken(10)).toHaveLength(10);
    expect(randomToken()).not.toBe(randomToken());
  });

  it('detects private events and builds their secret URL', () => {
    expect(isPrivateEvent({ visibility: 'private' })).toBe(true);
    expect(isPrivateEvent({ visibility: 'public' })).toBe(false);
    expect(isPrivateEvent({})).toBe(false);
    expect(privateEventUrl({ slug: 'guadalajara-fiesta-abc123' }, 'https://citymap.mx'))
      .toBe('https://citymap.mx/evento/guadalajara-fiesta-abc123');
    expect(privateEventUrl({ id: 'some-uuid' }, 'https://citymap.mx'))
      .toBe('https://citymap.mx/evento/some-uuid');
  });

  it('never lists private events, even when approved and active', () => {
    expect(isListedEvent({ active: true, status: 'approved', visibility: 'private', date: '2026-12-20' }, '2026-11-07')).toBe(false);
    expect(isListedEvent({ active: true, status: 'approved', visibility: 'public', date: '2026-12-20' }, '2026-11-07')).toBe(true);
  });

  it('summarizes RSVPs keeping only the latest answer per guest', () => {
    const rows = [
      { id: '1', guest_name: 'Ana', status: 'voy', companions: 1, created_at: '2026-11-07T10:00:00Z' },
      { id: '2', guest_name: 'Luis', status: 'quizas', companions: 0, created_at: '2026-11-07T10:01:00Z' },
      { id: '3', guest_name: 'ANA', status: 'no', companions: 0, created_at: '2026-11-07T11:00:00Z' },
      { id: '4', guest_name: 'Marta', status: 'voy', companions: 2, created_at: '2026-11-07T10:02:00Z' },
    ];
    const s = summarizeRsvps(rows);
    expect(s.counts).toEqual({ voy: 1, quizas: 1, no: 1 });
    // Solo Marta va (3 personas con sus 2 acompañantes); Ana cambió a "no".
    expect(s.guests).toBe(3);
    expect(s.total).toBe(3);
    expect(s.list.map(r => r.guest_name)).toEqual(['Luis', 'Marta', 'ANA']);
  });

  it('handles empty RSVP lists', () => {
    const s = summarizeRsvps([]);
    expect(s).toEqual({ list: [], counts: { voy: 0, quizas: 0, no: 0 }, guests: 0, total: 0 });
  });

  it('formats chat times in 12 hours', () => {
    expect(formatMessageTime('2026-11-07T22:38:00Z')).toMatch(/^\d{1,2}:\d{2}\s?[ap]\.?\s?m\.?$/i);
    expect(formatMessageTime('')).toBe('');
    expect(formatMessageTime('no-es-fecha')).toBe('');
  });
});
