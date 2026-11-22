import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { ensureGoogleMapsScript, scheduleGoogleMapsPreload } from '../lib/googleMapsPreload.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// Documento mínimo: lo único que necesita ensureGoogleMapsScript.
function fakeDoc() {
  const appended = [];
  const doc = {
    head: { appendChild: (el) => { appended.push(el); } },
    createElement: () => ({ id: '', src: '', async: false }),
    getElementById: (id) => appended.find((el) => el.id === id) || null,
  };
  return { doc, appended };
}

function fakeWin({ withIdle = true } = {}) {
  const timers = new Map();
  let nextId = 1;
  const win = {
    setTimeout: (fn) => { const id = nextId++; timers.set(id, fn); return id; },
    clearTimeout: (id) => { timers.delete(id); },
    cancelIdleCallback: vi.fn(),
    runTimers: () => { [...timers.values()].forEach((fn) => fn()); timers.clear(); },
    idleFn: null,
  };
  if (withIdle) win.requestIdleCallback = (fn) => { win.idleFn = fn; return 7; };
  return win;
}

describe('precarga de Google Maps (M18)', () => {
  it('crea el script #gms una sola vez, con la URL que necesita el mapa principal', () => {
    const { doc, appended } = fakeDoc();
    const first = ensureGoogleMapsScript(doc);
    expect(first.id).toBe('gms');
    expect(first.async).toBe(true);
    expect(first.src).toContain('https://maps.googleapis.com/maps/api/js?key=');
    // Sin `marker` el mapa montaría sin la librería de marcadores; sin
    // `v=weekly` no sería la versión que usa el mapa principal.
    expect(first.src).toContain('libraries=places,marker');
    expect(first.src).toContain('v=weekly');
    expect(appended).toHaveLength(1);
    // La segunda llamada (p. ej. al montar el mapa) reutiliza el mismo.
    expect(ensureGoogleMapsScript(doc)).toBe(first);
    expect(appended).toHaveLength(1);
  });

  it('programa la descarga en reposo con tope de 2 s, sin bloquear el pintado', () => {
    const { doc, appended } = fakeDoc();
    const win = fakeWin();
    scheduleGoogleMapsPreload(win, doc);
    // Antes de que corra el temporizador no hay script.
    expect(appended).toHaveLength(0);
    win.runTimers();
    // El temporizador pidió el idle; el script sale cuando corre el idle.
    expect(win.idleFn).toBeTypeOf('function');
    expect(appended).toHaveLength(0);
    win.idleFn();
    expect(appended).toHaveLength(1);
    expect(appended[0].id).toBe('gms');
  });

  it('sin requestIdleCallback inyecta directo tras el temporizador', () => {
    const { doc, appended } = fakeDoc();
    const win = fakeWin({ withIdle: false });
    scheduleGoogleMapsPreload(win, doc);
    win.runTimers();
    expect(appended).toHaveLength(1);
  });

  it('cancelar antes del temporizador evita la descarga', () => {
    const { doc, appended } = fakeDoc();
    const win = fakeWin();
    const cancel = scheduleGoogleMapsPreload(win, doc);
    cancel();
    win.runTimers();
    expect(appended).toHaveLength(0);
  });

  it('cancelar con el idle ya pedido lo cancela y no descarga', () => {
    const { doc, appended } = fakeDoc();
    const win = fakeWin();
    const cancel = scheduleGoogleMapsPreload(win, doc);
    win.runTimers();
    cancel();
    expect(win.cancelIdleCallback).toHaveBeenCalledWith(7);
    // El idle cancelado ya no corre: sin descarga.
    expect(appended).toHaveLength(0);
  });

  it('index.html pre-conecta con los dos dominios de Google Maps', () => {
    const html = read('../../index.html');
    expect(html).toContain('href="https://maps.googleapis.com"');
    expect(html).toContain('href="https://maps.gstatic.com"');
  });

  it('los dos useGMaps usan el mismo helper: la URL vive en un solo lugar', () => {
    for (const p of ['../components/GMap.jsx', '../components/map/useGMaps.js']) {
      const src = read(p);
      expect(src).toContain('ensureGoogleMapsScript');
      expect(src).not.toContain('maps/api/js?key=');
    }
  });
});
