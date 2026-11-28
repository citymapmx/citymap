import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import CountryPickerDropdown, { orderCountsForPicker } from '../components/CountryPickerDropdown.jsx';
import {
  TOUCH_TAP_MAX_MOVE_PX,
  TOUCH_TAP_CLICK_SUPPRESS_MS,
  touchTapMoved,
  createTouchTap,
} from '../lib/touchTap.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const src = read('../components/CountryPickerDropdown.jsx');

// Doble toque al cambiar de ciudad (27 nov 2026, Jonathan): en iOS el
// toque que detiene el scroll con momentum no dispara `click`, así que
// la fila se selecciona al soltar el dedo; y Populares se reordenaba
// ~1 s después de abrir cuando llegaban los conteos, con la fila
// saltando bajo el dedo. Mejoras 1 y 2 del análisis (la 3, el splash,
// quedó fuera por decisión suya).

const cities = [
  { slug: 'guadalajara', name: 'Guadalajara', country_code: 'mx' },
  { slug: 'tepic', name: 'Tepic', country_code: 'mx' },
  { slug: 'zapopan', name: 'Zapopan', country_code: 'mx' },
  { slug: 'puerto-vallarta', name: 'Puerto Vallarta', country_code: 'mx' },
  { slug: 'madrid', name: 'Madrid', country_code: 'es' },
  { slug: 'paris', name: 'París', country_code: 'fr' },
];

const baseProps = {
  show: true,
  cities,
  activeCity: 'guadalajara',
  onSelectCity: () => {},
  onDetectCity: () => {},
  locating: false,
  onClose: () => {},
  dark: false,
  isWelcome: false,
};

const renderPicker = (props = {}) => renderToStaticMarkup(
  <CountryPickerDropdown {...baseProps} {...props} />,
);

// Eventos táctiles falsos con la misma forma que los del navegador.
const touchStart = (x, y) => ({ touches: [{ clientX: x, clientY: y }] });
const touchEnd = (x, y) => ({ changedTouches: [{ clientX: x, clientY: y }] });

describe('touchTap: el toque selecciona, el deslizamiento no', () => {
  it('el umbral es ~10 px y la supresión del clic 700 ms', () => {
    expect(TOUCH_TAP_MAX_MOVE_PX).toBe(10);
    expect(TOUCH_TAP_CLICK_SUPPRESS_MS).toBe(700);
  });

  it('touchend con el dedo quieto selecciona (el toque que en iOS solo detendría el scroll)', () => {
    const tap = createTouchTap();
    tap.touchStart(touchStart(100, 200));
    expect(tap.touchEnd(touchEnd(100, 200))).toBe(true);
  });

  it('touchend con movimiento pequeño (menos de 10 px) también selecciona', () => {
    const tap = createTouchTap();
    tap.touchStart(touchStart(100, 200));
    expect(tap.touchEnd(touchEnd(106, 194))).toBe(true);
  });

  it('touchend con deslizamiento mayor de 10 px NO selecciona (es scroll)', () => {
    const tap = createTouchTap();
    tap.touchStart(touchStart(100, 200));
    expect(tap.touchEnd(touchEnd(100, 260))).toBe(false);
    const tap2 = createTouchTap();
    tap2.touchStart(touchStart(100, 200));
    expect(tap2.touchEnd(touchEnd(150, 200))).toBe(false);
  });

  it('en el límite (10 px justos) sigue siendo toque; a 11 px ya es scroll', () => {
    expect(touchTapMoved({ x: 0, y: 0 }, { x: 10, y: 0 })).toBe(false);
    expect(touchTapMoved({ x: 0, y: 0 }, { x: 11, y: 0 })).toBe(true);
    expect(touchTapMoved(null, { x: 0, y: 0 })).toBe(true);
    expect(touchTapMoved({ x: 0, y: 0 }, null)).toBe(true);
  });

  it('touchend sin touchstart previo no selecciona, y cancelar el toque tampoco', () => {
    const tap = createTouchTap();
    expect(tap.touchEnd(touchEnd(100, 200))).toBe(false);
    const tap2 = createTouchTap();
    tap2.touchStart(touchStart(100, 200));
    tap2.touchCancel();
    expect(tap2.touchEnd(touchEnd(100, 200))).toBe(false);
  });
});

describe('touchTap: el clic que sigue al toque no duplica la selección', () => {
  it('tras un toque, el clic inmediato se ignora; pasado el plazo, no', () => {
    const tap = createTouchTap();
    tap.touchStart(touchStart(100, 200));
    expect(tap.touchEnd(touchEnd(100, 200))).toBe(true);
    const now = Date.now();
    expect(tap.shouldIgnoreClick(now + 100)).toBe(true);
    expect(tap.shouldIgnoreClick(now + 800)).toBe(false);
  });

  it('sin toque previo, el clic NO se ignora (ratón y teclado siguen funcionando)', () => {
    const tap = createTouchTap();
    expect(tap.shouldIgnoreClick()).toBe(false);
  });

  it('tras un deslizamiento (scroll) no hay supresión: el clic siguiente no se traga', () => {
    const tap = createTouchTap();
    tap.touchStart(touchStart(100, 200));
    expect(tap.touchEnd(touchEnd(100, 260))).toBe(false);
    expect(tap.shouldIgnoreClick()).toBe(false);
  });
});

describe('CityRow: el cableado del toque vive en la fila', () => {
  it('la fila selecciona en onTouchEnd, guarda el inicio en onTouchStart y cancela en onTouchCancel', () => {
    const row = src.slice(src.indexOf('function CityRow'), src.indexOf('export function orderCountsForPicker'));
    expect(row).toContain('onTouchStart={(e) => tap.touchStart(e)}');
    expect(row).toContain('onTouchEnd={(e) => { if (tap.touchEnd(e)) onSelect(city); }}');
    expect(row).toContain('onTouchCancel={() => tap.touchCancel()}');
  });

  it('el onClick de la fila ignora el clic que sigue a un toque ya atendido', () => {
    const row = src.slice(src.indexOf('function CityRow'), src.indexOf('export function orderCountsForPicker'));
    expect(row).toContain('onClick={() => { if (tap.shouldIgnoreClick()) return; onSelect(city); }}');
  });

  it('CityRow vive a nivel de módulo (no dentro del componente): así no se remonta en cada tick de la máquina de escribir y el toque no se pierde entre touchstart y touchend', () => {
    expect(src.indexOf('function CityRow')).toBeGreaterThan(-1);
    expect(src.indexOf('function CityRow')).toBeLessThan(src.indexOf('export default function CountryPickerDropdown'));
    expect(src).not.toContain('const CityRow = ({ city, selected }) => (');
  });

  it('la fila no cambia de aspecto: mismo padding, radio y estilo que antes', () => {
    const row = src.slice(src.indexOf('function CityRow'), src.indexOf('export function orderCountsForPicker'));
    expect(row).toContain('padding: "11px 14px"');
    expect(row).toContain('borderRadius: selected ? 10 : 0');
    expect(row).toContain('fontSize: 15');
  });
});

describe('orderCountsForPicker: Populares congelado con la hoja abierta', () => {
  it('con la hoja abierta mandan los conteos congelados al abrir, aunque lleguen otros', () => {
    const frozen = { guadalajara: 0, tepic: 0, zapopan: 0 };
    const live = { guadalajara: 139, tepic: 126, zapopan: 47 };
    expect(orderCountsForPicker({ show: true, frozenCounts: frozen, liveCounts: live })).toBe(frozen);
  });

  it('con la hoja abierta y sin congelar aún (primera apertura), mandan los vivos', () => {
    const live = { guadalajara: 139 };
    expect(orderCountsForPicker({ show: true, frozenCounts: null, liveCounts: live })).toBe(live);
  });

  it('con la hoja cerrada mandan los vivos: al volver a abrir el orden se actualiza', () => {
    const frozen = { guadalajara: 0, tepic: 0 };
    const live = { guadalajara: 139, tepic: 126 };
    expect(orderCountsForPicker({ show: false, frozenCounts: frozen, liveCounts: live })).toBe(live);
  });

  it('el orden de Populares no cambia cuando llegan los conteos con la hoja abierta, y sí al reabrir', () => {
    // Lista en un orden distinto al de los conteos, para que el cambio se note.
    const list = [
      { slug: 'zapopan', name: 'Zapopan' },
      { slug: 'madrid', name: 'Madrid' },
      { slug: 'guadalajara', name: 'Guadalajara' },
      { slug: 'tepic', name: 'Tepic' },
    ];
    const byCount = (counts) => [...list]
      .map((c) => ({ ...c, count: counts[c.slug] || 0 }))
      .sort((a, b) => b.count - a.count)
      .map((c) => c.slug);
    // Al abrir, los conteos aún no llegaron: orden de la lista.
    const frozen = { zapopan: 0, madrid: 0, guadalajara: 0, tepic: 0 };
    // ~1 s después llegan los conteos reales, con la hoja abierta.
    const live = { guadalajara: 139, tepic: 126, zapopan: 47, madrid: 27 };
    const orderWhileOpen = byCount(orderCountsForPicker({ show: true, frozenCounts: frozen, liveCounts: live }));
    expect(orderWhileOpen).toEqual(['zapopan', 'madrid', 'guadalajara', 'tepic']);
    // Al reabrir, el orden ya es por conteos reales.
    const orderAtReopen = byCount(orderCountsForPicker({ show: false, frozenCounts: frozen, liveCounts: live }));
    expect(orderAtReopen).toEqual(['guadalajara', 'tepic', 'zapopan', 'madrid']);
  });
});

describe('selector: el congelamiento está cableado en el componente', () => {
  it('al abrir se congela una foto de los conteos y al cerrar se libera', () => {
    expect(src).toContain('const [frozenCounts, setFrozenCounts] = useState(null);');
    expect(src).toContain('if (show) setFrozenCounts(cityCountsRef.current);');
    expect(src).toContain('else setFrozenCounts(null);');
  });

  it('sortedCities ordena por los conteos congelados (no por los vivos) mientras la hoja está abierta', () => {
    const block = src.slice(src.indexOf('const countsForOrder'), src.indexOf('// Top popular cities'));
    expect(block).toContain('orderCountsForPicker({ show, frozenCounts, liveCounts: cityCounts })');
    expect(block).toContain('count: countsForOrder[city.slug] || 0');
  });

  it('en el primer pintado (sin conteos) Populares sale en el orden de la lista', () => {
    const html = renderPicker();
    const populares = html.slice(html.indexOf('Populares'));
    expect(populares.indexOf('Guadalajara')).toBeLessThan(populares.indexOf('Tepic'));
    expect(populares.indexOf('Tepic')).toBeLessThan(populares.indexOf('Zapopan'));
  });

  it('no se toca el splash ni su lógica de salida', () => {
    expect(src).not.toContain('CityArrivalSplash');
    expect(src).not.toContain('homeCoreCity');
  });
});
