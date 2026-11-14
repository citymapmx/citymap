// Historial y auditoría de sellos de lealtad (14 Nov 2026, rama lealtad-historial).
//
// - Cada sello es un registro con fecha y hora exactas, no solo un contador.
// - Quitar un sello lo anula (voids_event_id): nunca se borra el registro.
// - Los sellos anteriores al historial no tienen fecha inventada: van
//   como fila 'legacy' y se muestran como «Sellos anteriores».
// - Si la migración aún no está aplicada, el historial no lanza: el
//   sello igual se guarda en el contador.
// - Funciones actuales intactas: WhatsApp, buscador, diseño, + Sello.
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';

vi.mock('../lib/supabase.js', () => ({
  sb: {
    get: vi.fn(async () => { throw new Error('relation "public.loyalty_stamp_events" does not exist'); }),
    post: vi.fn(async () => { throw new Error('new row violates row-level security policy'); }),
    getUser: vi.fn(async () => null),
  },
}));

import {
  formatStampDate,
  formatStampDateTime,
  stampEventLabel,
  isStampVoided,
  latestActiveStampEvent,
  deriveMemberProgress,
  loadMemberStampEvents,
  loadBizRewardEvents,
  logStampEvent,
} from '../lib/loyaltyStampHistory.js';
import LoyaltyMemberDetail from '../components/loyalty/LoyaltyMemberDetail.jsx';
import LoyaltyConfirmSheet from '../components/loyalty/LoyaltyConfirmSheet.jsx';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

const T = { bg: '#fff', text: '#111', sub: '#666', border: '#e5e7eb', surface: '#fff' };

describe('lealtad: fecha y hora exactas del historial', () => {
  it('formatea fecha y hora en español', () => {
    expect(formatStampDate('2026-11-14T16:04:00.000Z')).toMatch(/14 nov 2026/i);
    const full = formatStampDateTime('2026-11-14T16:04:00.000Z');
    expect(full).toMatch(/14 nov 2026/i);
    expect(full).toMatch(/\d{1,2}:\d{2}/);
  });

  it('sin fecha no inventa nada: devuelve —', () => {
    expect(formatStampDate(null)).toBe('—');
    expect(formatStampDateTime(undefined)).toBe('—');
    expect(formatStampDateTime('no-es-fecha')).toBe('—');
  });
});

describe('lealtad: etiquetas del historial', () => {
  it('cada tipo de evento tiene su etiqueta', () => {
    expect(stampEventLabel({ event_type: 'stamp_added', stamp_number: 3 })).toBe('Sello #3');
    expect(stampEventLabel({ event_type: 'stamp_removed', voids_event_id: 'e2', stamp_number: 2 })).toBe('Sello #2 eliminado');
    expect(stampEventLabel({ event_type: 'stamp_removed', voids_event_id: null })).toBe('Sello anterior eliminado');
    expect(stampEventLabel({ event_type: 'reward_delivered' }, 'Un café gratis')).toBe('Premio entregado: Un café gratis');
    expect(stampEventLabel({ event_type: 'correction' })).toBe('Corrección');
    expect(stampEventLabel({ event_type: 'legacy' })).toBe('Sellos anteriores');
  });
});

describe('lealtad: progreso derivado del historial real', () => {
  const member = { stamps: 3, last_stamp_at: '2026-11-14T16:04:00.000Z', enrolled_at: '2026-11-10T19:20:00.000Z' };
  const events = [
    { id: 'legacy-1', event_type: 'legacy', stamps_after: 2, created_at: '2026-11-14T17:00:00.000Z' },
    { id: 'e1', event_type: 'stamp_added', stamp_number: 3, created_at: '2026-11-14T16:04:00.000Z' },
    { id: 'e2', event_type: 'stamp_added', stamp_number: 2, created_at: '2026-11-12T22:35:00.000Z' },
    { id: 'e3', event_type: 'stamp_removed', voids_event_id: 'e2', stamp_number: 2, created_at: '2026-11-13T15:00:00.000Z' },
    { id: 'e4', event_type: 'reward_delivered', created_at: '2026-11-11T18:00:00.000Z' },
  ];

  it('el sello anulado no cuenta y el vigente sí', () => {
    expect(isStampVoided(events[2], events)).toBe(true);
    expect(isStampVoided(events[1], events)).toBe(false);
    expect(latestActiveStampEvent(events)?.id).toBe('e1');
  });

  it('progreso: contador + legacy + sellos con fecha + premios', () => {
    const p = deriveMemberProgress(member, events);
    expect(p.current).toBe(3);
    expect(p.legacyCount).toBe(2);
    expect(p.legacyActive).toBe(2);
    expect(p.datedStamps).toBe(1); // solo e1 sigue vigente; e2 fue anulado
    expect(p.rewardsDelivered).toBe(1);
    expect(p.lastVisit).toBe(member.last_stamp_at);
    expect(p.enrolledAt).toBe(member.enrolled_at);
  });

  it('quitar un sello anterior baja solo el legacy vigente', () => {
    const p = deriveMemberProgress(
      { stamps: 2 },
      [
        { id: 'legacy-1', event_type: 'legacy', stamps_after: 3, created_at: '2026-11-14T17:00:00.000Z' },
        { id: 'r1', event_type: 'stamp_removed', voids_event_id: null, created_at: '2026-11-14T18:00:00.000Z' },
      ]
    );
    expect(p.legacyCount).toBe(3);
    expect(p.legacyActive).toBe(2);
    expect(p.datedStamps).toBe(0);
  });

  it('sin eventos el progreso es solo el contador, sin inventar fechas', () => {
    const p = deriveMemberProgress({ stamps: 1 }, []);
    expect(p.current).toBe(1);
    expect(p.legacyCount).toBe(0);
    expect(p.datedStamps).toBe(0);
    expect(p.rewardsDelivered).toBe(0);
  });
});

describe('lealtad: sin migración aplicada nada se rompe', () => {
  it('cargar el historial devuelve vacío y supported=false, sin lanzar', async () => {
    await expect(loadMemberStampEvents('m1', 'b1')).resolves.toEqual({ events: [], supported: false });
    await expect(loadBizRewardEvents('b1')).resolves.toEqual([]);
  });

  it('registrar un movimiento devuelve null, sin lanzar (el sello igual se guarda)', async () => {
    await expect(logStampEvent({
      memberId: 'm1', bizId: 'b1', eventType: 'stamp_added',
      stampsBefore: 0, stampsAfter: 1,
    })).resolves.toBeNull();
  });
});

describe('lealtad: ficha del cliente', () => {
  const member = {
    id: 'm1', biz_id: 'b1', name: 'Jonathan Arana', email: 'jgarana18@gmail.com',
    stamps: 3, enrolled_at: '2026-11-10T19:20:00.000Z', last_stamp_at: '2026-11-14T16:04:00.000Z',
    whatsapp: '523223792428',
  };
  const config = { stamps_required: 5, reward_text: 'Un café gratis' };

  it('renderiza nombre, progreso, última visita, tabs y acciones sin romperse', () => {
    const html = renderToStaticMarkup(
      <LoyaltyMemberDetail
        member={member} config={config} business={{ name: 'Eduardo Barber' }}
        T={T} isMobile={false} onClose={() => {}} onGiveStamp={async () => {}} onRemoveStamp={async () => {}}
      />
    );
    expect(html).toContain('Jonathan Arana');
    expect(html).toContain('Detalle del cliente');
    expect(html).toContain('3 de 5 sellos');
    expect(html).toContain('Progreso de tarjeta');
    expect(html).toContain('Última visita');
    expect(html).toContain('Historial');
    expect(html).toContain('Recompensas');
    expect(html).toContain('+ Sello');
    expect(html).toContain('Quitar último sello');
  });

  it('sin cliente no renderiza nada', () => {
    const html = renderToStaticMarkup(
      <LoyaltyMemberDetail
        member={null} config={config} business={{ name: 'Eduardo Barber' }}
        T={T} isMobile={false} onClose={() => {}} onGiveStamp={async () => {}} onRemoveStamp={async () => {}}
      />
    );
    expect(html).toBe('');
  });
});

describe('lealtad: hoja de confirmación dentro de la app', () => {
  it('muestra título, mensaje y los dos botones', () => {
    const html = renderToStaticMarkup(
      <LoyaltyConfirmSheet
        title="¿Quitar el Sello #3?"
        message="El movimiento queda registrado en el historial."
        confirmLabel="Sí, quitar sello"
        onConfirm={() => {}} onCancel={() => {}}
      />
    );
    expect(html).toContain('¿Quitar el Sello #3?');
    expect(html).toContain('El movimiento queda registrado en el historial.');
    expect(html).toContain('Sí, quitar sello');
    expect(html).toContain('Cancelar');
  });
});

describe('lealtad: nada de window.confirm y funciones actuales intactas', () => {
  it('LoyaltyDesigner no usa window.confirm ni la tabla vieja bloqueada', () => {
    const src = read('../components/loyalty/LoyaltyDesigner.jsx');
    expect(src).not.toContain('window.confirm');
    expect(src).not.toContain('confirm("');
    expect(src).not.toContain("confirm('");
    // La escritura vieja a la tabla bloqueada ya no existe (el delWhere
    // de «borrar programa» se queda como limpieza, y el comentario que
    // explica el hallazgo puede nombrar la tabla).
    expect(src).not.toContain('sb.post("loyalty_stamps_log"');
    expect(src).toContain('loyalty_stamp_events');
    expect(src).toContain('LoyaltyMemberDetail');
    expect(src).toContain('LoyaltyConfirmSheet');
  });

  it('LoyaltyDesigner conserva WhatsApp, buscador, diseño y + Sello', () => {
    const src = read('../components/loyalty/LoyaltyDesigner.jsx');
    expect(src).toContain('LoyaltyWhatsAppButton');
    expect(src).toContain('Buscar por nombre o email');
    expect(src).toContain('LoyaltyWizard');
    expect(src).toContain('+ Sello');
    expect(src).toContain('Premios entregados');
    expect(src).toContain('Ver ficha');
  });

  it('la ficha tiene historial, recompensas y confirmación; sin window.confirm', () => {
    const src = read('../components/loyalty/LoyaltyMemberDetail.jsx');
    expect(src).not.toContain('window.confirm');
    expect(src).toContain('Historial de actividad');
    expect(src).toContain('Recompensas entregadas');
    expect(src).toContain('Última visita');
    expect(src).toContain('Progreso de tarjeta');
    expect(src).toContain('LoyaltyConfirmSheet');
  });

  it('ScanView ya no escribe en la tabla vieja bloqueada', () => {
    const src = read('../views/ScanView.jsx');
    expect(src).not.toContain('sb.post("loyalty_stamps_log"');
    expect(src).toContain('logStampEvent');
  });
});

describe('lealtad: migración SQL de loyalty_stamp_events', () => {
  it('la migración crea la tabla append-only con RLS y siembra el legacy', () => {
    const sql = read('../../supabase/migrations/20261114110000_loyalty_stamp_events.sql');
    expect(sql).toContain('create table if not exists public.loyalty_stamp_events');
    expect(sql).toContain("event_type in ('stamp_added', 'stamp_removed', 'reward_delivered', 'correction', 'legacy')");
    expect(sql).toContain('voids_event_id');
    expect(sql).toContain('enable row level security');
    expect(sql).toContain('auth.uid()');
    expect(sql).toContain("event_type = 'legacy'");
    expect(sql).toContain('stamps_after');
  });
});
