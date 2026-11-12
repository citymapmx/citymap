import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { summarizeRsvps } from '../lib/privateEvents.js';

// Filas reales de event_rsvps de Posada 2026 (8b6ed301-d988-4965-bc66-65a176bdd3b5),
// leídas por PostgREST con la clave anon, igual que las lee la app.
// Las 4 son filas viejas (user_id null): invitados sin cuenta.
const POSADA_ROWS = [
  { id: '2f0e3cb8-aa0e-46dd-a7a9-f0c8144da860', event_id: '8b6ed301-d988-4965-bc66-65a176bdd3b5', guest_name: 'Jonathan', status: 'voy', companions: 1, created_at: '2026-11-08T04:38:14.815838+00:00', user_id: null },
  { id: '507470d0-db01-4d6c-8734-bb2b6691d0cf', event_id: '8b6ed301-d988-4965-bc66-65a176bdd3b5', guest_name: 'Carlos', status: 'voy', companions: 0, created_at: '2026-11-08T04:58:30.719498+00:00', user_id: null },
  { id: 'fe3b8456-92de-4661-8af4-c214946cd179', event_id: '8b6ed301-d988-4965-bc66-65a176bdd3b5', guest_name: 'Daniel', status: 'voy', companions: 0, created_at: '2026-11-08T05:28:42.834954+00:00', user_id: null },
  // Daniel confirmó de nuevo el 11 nov (duplicado por nombre): solo cuenta la más reciente.
  { id: 'f4222789-d009-48f9-9d00-7a253d699634', event_id: '8b6ed301-d988-4965-bc66-65a176bdd3b5', guest_name: 'Daniel', status: 'voy', companions: 0, created_at: '2026-11-12T04:48:07.51937+00:00', user_id: null },
];

describe('invitados no aparecen (Posada 2026)', () => {
  it('con las filas reales de Posada la lista muestra a los 3 confirmados', () => {
    const s = summarizeRsvps(POSADA_ROWS);
    expect(s.total).toBe(3);
    expect(s.list.map((r) => r.guest_name)).toEqual(['Jonathan', 'Carlos', 'Daniel']);
    expect(s.counts).toEqual({ voy: 3, quizas: 0, no: 0 });
    // 3 confirmados + 1 acompañante de Jonathan: el encabezado dice "Van 4 personas".
    expect(s.guests).toBe(4);
  });

  it('las filas viejas con user_id null no se excluyen (invitados sin cuenta aparecen)', () => {
    expect(POSADA_ROWS.every((r) => r.user_id === null)).toBe(true);
    const s = summarizeRsvps(POSADA_ROWS);
    expect(s.total).toBe(3);
    expect(s.list.map((r) => r.guest_name)).toContain('Jonathan');
    expect(s.list.map((r) => r.guest_name)).toContain('Carlos');
    expect(s.list.map((r) => r.guest_name)).toContain('Daniel');
  });

  it('cambiar asistencia actualiza conteo y lista (Daniel pasa a "no voy")', () => {
    const rows = [
      ...POSADA_ROWS,
      { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', event_id: '8b6ed301-d988-4965-bc66-65a176bdd3b5', guest_name: 'Daniel', status: 'no', companions: 0, created_at: '2026-11-12T06:00:00+00:00', user_id: null },
    ];
    const s = summarizeRsvps(rows);
    expect(s.total).toBe(3);
    expect(s.counts).toEqual({ voy: 2, quizas: 0, no: 1 });
    // Jonathan (2 con acompañante) + Carlos (1): Daniel ya no va.
    expect(s.guests).toBe(3);
    expect(s.list.find((r) => r.guest_name === 'Daniel').status).toBe('no');
  });
});

describe('invitados: lectura pública de RSVP (cableado)', () => {
  it('PrivateEventRsvp lee las confirmaciones con getPublic, no con sb.get', () => {
    const src = fs.readFileSync(new URL('../components/detail/PrivateEventRsvp.jsx', import.meta.url), 'utf8');
    expect(src).toContain("sb.getPublic('event_rsvps'");
    expect(src).not.toContain("sb.get('event_rsvps'");
    // Tras confirmar, vuelve a cargar la lista.
    expect(src).toContain('load();');
  });

  it('EventDetailModal lee el conteo de invitados con getPublic, no con sb.get', () => {
    const src = fs.readFileSync(new URL('../components/modals/EventDetailModal.jsx', import.meta.url), 'utf8');
    expect(src).toContain("sb.getPublic('event_rsvps'");
    expect(src).not.toContain("sb.get('event_rsvps'");
  });
});
