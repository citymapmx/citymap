import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { softDeleteReservation } from '../lib/reservationDelete.js';
import ReservationsAgenda from '../components/ReservationsAgenda.jsx';

// El render estático (`renderToStaticMarkup`) usa el snapshot inicial
// del store de zustand (`getServerSnapshot`), así que `setState` no
// cambia lo que pinta: el modo oscuro se controla con un mock del
// store. Sin esto el render siempre salía en claro.
const { MOCK_UI } = vi.hoisted(() => ({ MOCK_UI: { dark: false } }));
vi.mock('../store/useUIStore.js', () => ({
  useUIStore: (sel) => sel({ dark: MOCK_UI.dark, toast$: () => {} }),
}));

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// 14 nov 2026 (Jonathan, con captura): en el panel de Reservaciones
// del dueño, «Tus Reservaciones» se veía mal en modo oscuro y la
// papelera no borraba la reserva cancelada (Eduardo Barber, sáb 14
// nov 2026, 9:00 a. m., Corte + Barba).
//
// Causa 1 (oscuro, con evidencia): la fila de historial usaba grises
// fijos (`#64748B` / `#94A3B8` sobre `rgba(255,255,255,0.4)`) que
// sobre la tarjeta oscura quedan a ~1,2:1 de contraste (lavados). La
// tarjeta de confirmada era peor: texto blanco (`T.text` en oscuro)
// sobre tarjeta clara (`rgba(255,255,255,0.8)`).
//
// Causa 2 (borrar, con evidencia): el borrado dependía de
// `window.confirm` y si el diálogo no aparece en el WebView de la
// app, el tap vuelve en silencio sin ningún aviso. Además el PATCH
// de PostgREST devuelve 200 con `[]` cuando RLS no aplica la
// actualización, sin error: sin relectura el borrado parecía hecho.
// Verificado por PostgREST: la reserva de la captura YA está en
// "deleted" (id 211b0ef6-8107-4ed6-aa9c-7aa445c2aef2), así que el
// UPDATE sí está permitido para el JWT del dueño/admin — no hace
// falta ningún cambio de política en la base.

const BIZ = {
  id: 'dc66830f-b566-4ed8-bdb8-b09d3f566f59',
  name: 'Eduardo Barber',
  plan: 'premium',
  booking_config: { type: 'native', enabled: true, services: [{ id: 's1', name: 'Corte', price: 150 }] },
  schedule: {},
};
const RES_CANCELADA = { id: 'r-cancelada', date: '2026-11-14', time: '09:00', status: 'cancelled', client_name: 'Jonathan Arana', service: 'Corte + Barba', client_phone: '3223792428' };
const RES_CONFIRMADA = { id: 'r-confirmada', date: '2026-11-14', time: '10:00', status: 'confirmed', client_name: 'Saul', service: 'Corte', client_phone: '3223792428' };

const renderAgenda = (dark) => {
  MOCK_UI.dark = dark;
  return renderToStaticMarkup(
    React.createElement(ReservationsAgenda, { ownerView: BIZ, ownerRes: [RES_CANCELADA, RES_CONFIRMADA], setOwnerRes: () => {} })
  );
};

afterEach(() => { MOCK_UI.dark = false; });

describe('softDeleteReservation: el borrado se verifica por relectura', () => {
  it('camino feliz: patch + relectura en "deleted" → ok', async () => {
    const patch = vi.fn(async () => [{ id: 'r1', status: 'deleted' }]);
    const get = vi.fn(async () => [{ status: 'deleted' }]);
    const res = await softDeleteReservation({ patch, get }, 'r1');
    expect(res.ok).toBe(true);
    expect(patch).toHaveBeenCalledWith('reservations', 'r1', { status: 'deleted' });
    expect(get).toHaveBeenCalledWith('reservations', '?id=eq.r1&select=status');
  });

  it('bloqueo silencioso (PATCH 200 con 0 filas): la relectura sigue en "cancelled" → no ok, no se da por borrada', async () => {
    const patch = vi.fn(async () => []);
    const get = vi.fn(async () => [{ status: 'cancelled' }]);
    const res = await softDeleteReservation({ patch, get }, 'r1');
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('sin-cambios');
  });

  it('el patch lanza → no ok con reason error', async () => {
    const patch = vi.fn(async () => { throw new Error('HTTP 500'); });
    const res = await softDeleteReservation({ patch, get: vi.fn() }, 'r1');
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('error');
  });

  it('la relectura lanza → no ok', async () => {
    const patch = vi.fn(async () => [{ id: 'r1', status: 'deleted' }]);
    const get = vi.fn(async () => { throw new Error('HTTP 403'); });
    const res = await softDeleteReservation({ patch, get }, 'r1');
    expect(res.ok).toBe(false);
  });
});

describe('la papelera ya no depende de window.confirm', () => {
  it('ReservationsAgenda no usa window.confirm: la confirmación vive en la fila', () => {
    const src = read('../components/ReservationsAgenda.jsx');
    expect(src).not.toContain('window.confirm');
    expect(src).toContain('¿Eliminar esta reservación?');
    expect(src).toContain('softDeleteReservation');
  });

  it('si el borrado no se confirma en base, avisa y la fila se queda (no se filtra en local)', () => {
    const src = read('../components/ReservationsAgenda.jsx');
    // El filtro local solo corre dentro del `if (res.ok)`; el fallo
    // muestra aviso y no toca la lista.
    const okAt = src.indexOf('if (res.ok)');
    expect(okAt).toBeGreaterThan(-1);
    expect(src.slice(okAt, okAt + 400)).toContain('setOwnerRes');
    expect(src).toContain('No se pudo eliminar. Inténtalo de nuevo.');
  });
});

describe('modo oscuro: la fila de historial es legible', () => {
  it('en oscuro la fila usa fondo oscuro y texto del tema (sin grises lavados)', () => {
    const html = renderAgenda(true);
    expect(html).toContain('rgba(255,255,255,0.06)');
    // Nombre con el color de texto del tema oscuro (#F4F4F5), no el
    // gris fijo de antes.
    expect(html).toContain('color:#F4F4F5');
    expect(html).not.toContain('color:#64748B');
    expect(html).not.toContain('color:#94A3B8');
    // Insignia Cancelada con variante oscura legible.
    expect(html).toContain('#CBD5E1');
  });

  it('en oscuro la tarjeta confirmada ya no es clara con texto blanco', () => {
    const html = renderAgenda(true);
    // Fondo oscuro en vez del blanco 0.8 de antes.
    expect(html).toContain('rgba(255,255,255,0.06)');
    expect(html).not.toContain('rgba(255, 255, 255, 0.8)');
    // Etiqueta Confirmada en verde claro legible sobre oscuro.
    expect(html).toContain('#4ADE80');
  });

  it('en claro se ve exacto como antes (sin regresión)', () => {
    const html = renderAgenda(false);
    expect(html).toContain('rgba(255,255,255,0.4)');
    expect(html).toContain('color:#64748B');
    expect(html).toContain('background:#F1F5F9');
    expect(html).toContain('rgba(255, 255, 255, 0.8)');
  });
});

describe('encabezado: el subtítulo ya no se parte a mitad de frase', () => {
  it('el subtítulo está en su propia fila a ancho completo, después de la fila título + Configurar', () => {
    const src = read('../components/ReservationsAgenda.jsx');
    const tituloAt = src.indexOf('Tus Reservaciones');
    const botonAt = src.indexOf('Configurar', tituloAt);
    const subtituloAt = src.indexOf('Todas tus reservas confirmadas');
    expect(tituloAt).toBeGreaterThan(-1);
    expect(botonAt).toBeGreaterThan(tituloAt);
    expect(subtituloAt).toBeGreaterThan(botonAt);
  });
});
