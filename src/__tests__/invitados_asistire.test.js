import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { summarizeRsvps, isOwnRsvp } from '../lib/privateEvents.js';

// Filas reales de event_rsvps de Posada 2026 (8b6ed301-d988-4965-bc66-65a176bdd3b5),
// leídas por PostgREST con la clave anon, igual que las lee la app.
// 5 filas: Jonathan +1, Carlos, Daniel (×2, se queda la más reciente) y
// "Jonathan uli" (confirmó con sesión, por eso trae user_id).
const POSADA_ROWS = [
  { id: '2f0e3cb8-aa0e-46dd-a7a9-f0c8144da860', event_id: '8b6ed301-d988-4965-bc66-65a176bdd3b5', guest_name: 'Jonathan', status: 'voy', companions: 1, created_at: '2026-11-08T04:38:14.815838+00:00', user_id: null },
  { id: '507470d0-db01-4d6c-8734-bb2b6691d0cf', event_id: '8b6ed301-d988-4965-bc66-65a176bdd3b5', guest_name: 'Carlos', status: 'voy', companions: 0, created_at: '2026-11-08T04:58:30.719498+00:00', user_id: null },
  { id: 'fe3b8456-92de-4661-8af4-c214946cd179', event_id: '8b6ed301-d988-4965-bc66-65a176bdd3b5', guest_name: 'Daniel', status: 'voy', companions: 0, created_at: '2026-11-08T05:28:42.834954+00:00', user_id: null },
  { id: 'f4222789-d009-48f9-9d00-7a253d699634', event_id: '8b6ed301-d988-4965-bc66-65a176bdd3b5', guest_name: 'Daniel', status: 'voy', companions: 0, created_at: '2026-11-12T04:48:07.51937+00:00', user_id: null },
  { id: 'c7513e51-0d53-4ab1-ac7c-315e4a69b9e3', event_id: '8b6ed301-d988-4965-bc66-65a176bdd3b5', guest_name: 'Jonathan uli', status: 'voy', companions: 0, created_at: '2026-11-12T06:11:53.993914+00:00', user_id: '40509477-86fe-48d1-865b-849b9e9d6f77' },
];

describe('isOwnRsvp: cuál es la fila del usuario actual', () => {
  it('coincide por user_id cuando confirmó con sesión', () => {
    const row = POSADA_ROWS[4]; // "Jonathan uli", user_id del admin
    expect(isOwnRsvp(row, { userId: '40509477-86fe-48d1-865b-849b9e9d6f77', name: '' })).toBe(true);
    expect(isOwnRsvp(row, { userId: 'b414890a-6ed8-4c9b-8c28-f4874051671a', name: '' })).toBe(false);
  });

  it('coincide por el nombre guardado en el dispositivo (sin cuenta)', () => {
    expect(isOwnRsvp(POSADA_ROWS[0], { userId: null, name: 'Jonathan' })).toBe(true);
    // Sin importar mayúsculas ni espacios de más.
    expect(isOwnRsvp(POSADA_ROWS[0], { userId: null, name: '  JONATHAN ' })).toBe(true);
    expect(isOwnRsvp(POSADA_ROWS[1], { userId: null, name: 'Jonathan' })).toBe(false);
  });

  it('sin sesión ni nombre guardado no hay fila propia', () => {
    expect(isOwnRsvp(POSADA_ROWS[0], { userId: null, name: '' })).toBe(false);
    expect(isOwnRsvp(POSADA_ROWS[0], null)).toBe(false);
    expect(isOwnRsvp(null, { userId: 'x', name: 'Jonathan' })).toBe(false);
  });
});

describe('pie de la lista: mismo total que el encabezado (Posada: 5 personas)', () => {
  it('con las filas reales de Posada el total es 5 personas', () => {
    const s = summarizeRsvps(POSADA_ROWS);
    expect(s.list.map((r) => r.guest_name)).toEqual(['Jonathan', 'Carlos', 'Daniel', 'Jonathan uli']);
    expect(s.guests).toBe(5);
  });

  it('encabezado y pie usan la misma variable guestsLine (un solo total)', () => {
    const src = fs.readFileSync(new URL('../components/detail/PrivateEventRsvp.jsx', import.meta.url), 'utf8');
    // Se construye una sola vez a partir de summary.guests.
    expect(src.match(/const guestsLine = /g)).toHaveLength(1);
    expect(src).toContain('summary.guests');
    // Se renderiza en dos sitios: encabezado y pie de la lista.
    expect(src.match(/\{guestsLine\}/g)).toHaveLength(2);
    // El encabezado de arriba sigue existiendo.
    expect(src).toContain('{guestsLine}');
    // El pie va después de la lista, antes de cerrar el bloque.
    const footerIdx = src.indexOf('Pie de la lista');
    const mapIdx = src.indexOf('summary.list.map');
    expect(footerIdx).toBeGreaterThan(mapIdx);
    expect(src.slice(footerIdx)).toContain('{guestsLine}');
  });
});

describe('píldora Asistiré / Asistirá (cableado)', () => {
  it('la fila propia con estado voy dice "Asistiré" y la ajena "Asistirá"', () => {
    const src = fs.readFileSync(new URL('../components/detail/PrivateEventRsvp.jsx', import.meta.url), 'utf8');
    expect(src).toContain('t("eventos_rsvp_asistire", "Asistiré")');
    expect(src).toContain('t("eventos_rsvp_asistira", "Asistirá")');
    // La distinción se hace con isOwnRsvp y la píldora la usa.
    expect(src).toContain('isOwnRsvp(row, { userId: user?.id, name })');
    expect(src).toContain('{pillLabel(row)}');
    // La píldora ya no dice "Voy" para todos.
    expect(src).not.toContain(`{row.status === 'voy' ? t("eventos_rsvp_voy"`);
  });

  it('los demás estados no cambian (Quizás / No voy)', () => {
    const src = fs.readFileSync(new URL('../components/detail/PrivateEventRsvp.jsx', import.meta.url), 'utf8');
    expect(src).toContain(`t("eventos_rsvp_quizas", "Quizás")`);
    expect(src).toContain(`t("eventos_rsvp_no", "No voy")`);
    // El chip superior "✓ Vas · ..." no se toca.
    expect(src).toContain('✓ {statusLabel} · {name}');
  });

  it('las claves nuevas existen en español e inglés', () => {
    const es = fs.readFileSync(new URL('../lib/i18n.js', import.meta.url), 'utf8');
    const en = fs.readFileSync(new URL('../lib/i18n-en.js', import.meta.url), 'utf8');
    expect(es).toContain('"eventos_rsvp_asistire": "Asistiré"');
    expect(es).toContain('"eventos_rsvp_asistira": "Asistirá"');
    expect(en).toContain('"eventos_rsvp_asistire": "I\'ll attend"');
    expect(en).toContain('"eventos_rsvp_asistira": "Will attend"');
  });
});
