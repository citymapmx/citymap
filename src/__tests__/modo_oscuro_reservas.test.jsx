import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import BookingModal from '../components/BookingModal.jsx';
import ScheduleManagerModal from '../components/ScheduleManagerModal.jsx';

// Modo oscuro, lote 3 (14 nov 2026): FICHA DE NEGOCIO + RESERVAR +
// RESERVACIONES. Patrón de la PR #313: en oscuro los fondos de
// tarjeta/hoja/modal/input usan T.white/T.card (o rgba blanco tenue
// sobre T.bg) y el texto T.text/T.sub; el modo claro queda idéntico
// (cada valor fijo vive en la rama clara del ternario).
//
// Hallazgo 1 (BookingModal): el modal era 95% claro fijo y coherente
// (isla clara legible) SALVO los 3 inputs de nombre/teléfono/notas,
// que usaban `color: T.text` sobre fondo `#ffffff`: el texto tecleado
// era invisible en oscuro (~1,05:1). El modal entero pasa a variante
// oscura; el botón de WhatsApp (#25D366 + #fff, marca) y el botón
// deshabilitado se dejan como estaban, a propósito.
// Hallazgo 2 (ScheduleManagerModal, vive en src/components/, no en
// src/components/modals/): hoja fija #fff con pestañas e inputs
// mezclando T.* — la fecha iba con fondo #F9FAFB + T.text y las horas
// con #fff + T.text (invisibles en oscuro). Toda la hoja pasa a
// variante oscura, igual que el modal de reservar.
// Hallazgo 3 (DetailView 1046/1058): los fallbacks «Cargando
// reservaciones…» / «Cargando…» eran caja #fff con texto sin color
// explícito (heredaba var(--text), #A1A1AA en oscuro, 2,56:1).
// Hallazgo 4 (PrivateEventRsvp, encontrado al verificar la ficha):
// la píldora «No voy» mezclaba fondo fijo claro (#F1F5F9) con texto
// del tema (T.sub, #A1A1AA en oscuro, ~2,2:1) y el input del nombre
// no tenía estilo propio (dependía del UA y del color-scheme del SO).

const { MOCK_UI } = vi.hoisted(() => ({ MOCK_UI: { dark: false } }));
vi.mock('../store/useUIStore.js', () => ({
  useUIStore: (sel) => sel({ dark: MOCK_UI.dark, lang: 'es', toast$: () => {} }),
}));

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

afterEach(() => { MOCK_UI.dark = false; });

// ── Contraste WCAG ────────────────────────────────────────────────
function lum(hex) {
  const n = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(n.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
// Mezcla un rgba() sobre un fondo opaco (lo que se ve en pantalla).
function blend(rgba, baseHex) {
  const m = rgba.match(/rgba?\(([^)]+)\)/);
  const [r, g, b, a] = m[1].split(',').map(Number);
  const base = [0, 2, 4].map((i) => parseInt(baseHex.slice(i + 1, i + 3), 16));
  const out = [r, g, b].map((v, i) => Math.round(v * a + base[i] * (1 - a)));
  return `#${out.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
function ratio(fg, bg) {
  const [l1, l2] = [lum(fg), lum(bg)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
const DARK_CARD = '#232326'; // T.white / T.card en oscuro
const DARK_BG = '#18181B'; // T.bg en oscuro

const BIZ_RESERVA = {
  id: 'biz-1',
  name: 'Eduardo Barber',
  booking_config: {
    enabled: true,
    maxPerSlot: 1,
    services: [{ id: 's1', name: 'Corte', durationMin: 45, price: '150' }],
  },
  schedule: {},
};
const BIZ_AGENDA = {
  id: 'biz-1',
  name: 'Eduardo Barber',
  schedule: {
    lun: '09:00 - 18:00', mar: '09:00 - 18:00', mie: '09:00 - 18:00',
    jue: '09:00 - 18:00', vie: '09:00 - 18:00', sab: '09:00 - 18:00',
    dom: 'Cerrado',
  },
  booking_config: { blocked_slots: [], blocked_dates: [], services: [] },
};

const renderBooking = (dark) => {
  MOCK_UI.dark = dark;
  return renderToStaticMarkup(
    React.createElement(BookingModal, { biz: BIZ_RESERVA, onClose: () => {} })
  );
};
const renderAgenda = (dark) => {
  MOCK_UI.dark = dark;
  return renderToStaticMarkup(
    React.createElement(ScheduleManagerModal, { biz: BIZ_AGENDA, onClose: () => {}, onUpdate: () => {} })
  );
};

describe('contraste ≥ 4.5:1 en las parejas que toca este lote', () => {
  it('oscuro: texto, avisos y seleccionados sobre la tarjeta oscura', () => {
    const pairs = [
      ['texto principal', '#F4F4F5', DARK_CARD],
      ['texto secundario', '#A1A1AA', DARK_CARD],
      ['texto secundario sobre la franja de pestañas', '#A1A1AA', DARK_BG],
      ['aviso rojo', '#FCA5A5', blend('rgba(220,38,38,0.15)', DARK_CARD)],
      ['servicio seleccionado', '#93C5FD', blend('rgba(92,164,255,0.15)', DARK_CARD)],
      ['día completo', '#93C5FD', blend('rgba(92,164,255,0.12)', DARK_CARD)],
      ['Elegido', '#4ADE80', DARK_CARD],
      ['día seleccionado', '#18181B', '#F4F4F5'],
      ['botón Siguiente / Guardar', '#18181B', '#F4F4F5'],
      ['input de fecha', '#F4F4F5', blend('rgba(255,255,255,0.06)', DARK_CARD)],
      ['hora bloqueada', '#F87171', blend('rgba(220,38,38,0.12)', DARK_CARD)],
    ];
    for (const [label, fg, bg] of pairs) {
      expect(ratio(fg, bg), `${label}: ${fg} sobre ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('claro: las parejas que ya existían siguen ≥ 4.5:1', () => {
    const pairs = [
      ['título', '#0F1A14', '#FFFFFF'],
      ['texto secundario', '#5A6872', '#FFFFFF'],
      ['texto terciario', '#64748B', '#FFFFFF'],
      ['aviso rojo', '#991B1B', blend('rgba(254,226,226,0.8)', '#FFFFFF')],
      ['servicio seleccionado', '#1E3A8A', '#EFF6FF'],
      ['meta seleccionada', '#2563EB', '#EFF6FF'],
    ];
    for (const [label, fg, bg] of pairs) {
      expect(ratio(fg, bg), `${label}: ${fg} sobre ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('BookingModal: variante oscura completa', () => {
  it('en oscuro el panel y la tarjeta de servicio usan el fondo del tema', () => {
    const html = renderBooking(true);
    expect(html).toContain('background:#232326');
    expect(html).toContain('color:#F4F4F5');
    // Nada del panel queda en blanco fijo con texto oscuro fijo.
    expect(html).not.toContain('background:#ffffff');
  });

  it('en claro se ve exacto como antes (sin regresión)', () => {
    const html = renderBooking(false);
    expect(html).toContain('background:#FFFFFF');
    expect(html).toContain('color:#0F1A14');
    expect(html).toContain('color:#64748B');
    // La tarjeta seleccionada (#EFF6FF / #1E3A8A) solo se pinta con un
    // servicio elegido, que el render estático no tiene: se verifica
    // en fuente, en la rama clara del ternario.
    const src = read('../components/BookingModal.jsx');
    expect(src).toContain('background: isSelected ? (dark ? "rgba(92,164,255,0.15)" : "#EFF6FF") : T.white');
    expect(src).toContain('color: isSelected ? (dark ? "#93C5FD" : "#1E3A8A") : T.text');
  });

  it('los 3 inputs (nombre/teléfono/notas) llevan fondo y texto del tema', () => {
    const src = read('../components/BookingModal.jsx');
    expect(src).toContain('background: T.white, color: T?.text || "#0F1A14", colorScheme: dark ? "dark" : "light"');
    expect(src).not.toContain('background: "#ffffff", color: T?.text');
    // El foco también es del tema (antes volvía al borde oscuro fijo).
    expect(src).toContain('onFocus={e => e.target.style.border = dark ? "2px solid #F4F4F5" : "2px solid #0F1A14"}');
  });

  it('el botón de WhatsApp se deja como marca (excepción documentada)', () => {
    const src = read('../components/BookingModal.jsx');
    expect(src).toContain('background: "#25D366", color: "#fff"');
  });
});

describe('ScheduleManagerModal: hoja completa a variante oscura', () => {
  it('en oscuro la hoja, el input de fecha y las horas usan el tema', () => {
    const html = renderAgenda(true);
    expect(html).toContain('background:#232326');
    // Input de fecha: fondo tenue + texto del tema + color-scheme oscuro.
    expect(html).toContain('background:rgba(255,255,255,0.06)');
    expect(html).toContain('color:#F4F4F5');
    expect(html).toContain('color-scheme:dark');
    expect(html).not.toContain('background:#F9FAFB');
    expect(html).not.toContain('background:#fff');
  });

  it('en claro se ve exacto como antes (sin regresión)', () => {
    const html = renderAgenda(false);
    expect(html).toContain('background:#FFFFFF');
    expect(html).toContain('background:#F9FAFB');
    expect(html).toContain('color:#0F1A14');
    expect(html).toContain('color-scheme:light');
  });

  it('los inputs de hora llevan fondo y texto del tema', () => {
    const src = read('../components/ScheduleManagerModal.jsx');
    expect(src).toContain('background: T.white, color: T.text || "#0F1A14", colorScheme: dark ? "dark" : "light"');
    expect(src).not.toContain('background: "#fff", color: T.text');
    expect(src).not.toContain('background: "#F9FAFB", color: T.text');
  });

  it('el botón Guardar invierte en oscuro (texto oscuro sobre claro)', () => {
    const src = read('../components/ScheduleManagerModal.jsx');
    expect(src).toContain('background: dark ? "#F4F4F5" : "#0F1A14", color: dark ? "#18181B" : "#fff"');
  });
});

describe('DetailView: fallbacks de carga con color explícito', () => {
  it('los dos fallbacks («Cargando reservaciones…» y «Cargando…») usan fondo y texto del tema', () => {
    const src = read('../views/DetailView.jsx');
    const count = src.split('background: T.white, color: T.text, borderRadius: 24').length - 1;
    expect(count).toBe(2);
    expect(src).not.toContain('background: "#fff", borderRadius: 24, width: "100%", maxWidth: 440');
  });
});

describe('PrivateEventRsvp: píldora «No voy» e input del nombre', () => {
  it('la píldora «No voy» ya no mezcla fondo fijo claro con texto del tema', () => {
    const src = read('../components/detail/PrivateEventRsvp.jsx');
    expect(src).toContain("(dark ? 'rgba(255,255,255,0.06)' : '#F1F5F9')");
    // La de «Quizás» es una isla completa (fondo y texto fijos, 5,9:1)
    // y se deja como está.
    expect(src).toContain("row.status === 'quizas' ? '#FEF3C7' : (dark ? 'rgba(255,255,255,0.06)' : '#F1F5F9')");
  });

  it('el input del nombre lleva fondo, texto y borde del tema', () => {
    const src = read('../components/detail/PrivateEventRsvp.jsx');
    expect(src).toContain("border: `1.5px solid ${T.border}`, background: T.white, color: T.text");
  });
});

describe('ReservationsAgenda: verificación (ya corregida en la #313)', () => {
  it('sigue con variante oscura y sin window.confirm', () => {
    const src = read('../components/ReservationsAgenda.jsx');
    expect(src).toContain('dark ? "rgba(255,255,255,0.06)"');
    expect(src).toContain('color: T.text');
    expect(src).not.toContain('window.confirm');
  });
});

describe('ficha: islas intencionales que NO se tocan', () => {
  it('EventInformation sigue con su gradiente oscuro propio y texto blanco', () => {
    const src = read('../components/detail/EventInformation.jsx');
    expect(src).toContain("background: 'linear-gradient(180deg, #34383B 0%, #050505 100%)'");
    expect(src).toContain("color: '#FFFFFF'");
  });

  it('JaguaresGames sigue con su isla azul marino y selects blancos', () => {
    const src = read('../components/detail/JaguaresGames.jsx');
    expect(src).toContain("background: 'linear-gradient(135deg, #0B1731, #173969)'");
    expect(src).toContain("color: '#0B1731', background: '#fff'");
  });

  it('PrivateEventChat sigue con su paleta WhatsApp y campo negro intencional', () => {
    const src = read('../components/detail/PrivateEventChat.jsx');
    expect(src).toContain("chatBg: '#0B141A'");
    expect(src).toContain("const FIELD_BG = '#111111'");
  });
});
