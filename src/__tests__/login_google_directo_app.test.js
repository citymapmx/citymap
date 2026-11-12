import fs from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { promptGoogleOneTap } from '../lib/googleIdentity.js';

const VIEW_SRC = fs.readFileSync(new URL('../views/AppLoginView.jsx', import.meta.url), 'utf8');
const INDEX_SRC = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

afterEach(() => {
  delete globalThis.window;
});

function stubGis(promptImpl) {
  globalThis.window = {
    google: { accounts: { id: { prompt: promptImpl } } },
  };
}

describe('promptGoogleOneTap: lanza el selector de Google sin toque', () => {
  it('con GIS listo llama a google.accounts.id.prompt y devuelve true', () => {
    const prompt = vi.fn();
    stubGis(prompt);
    expect(promptGoogleOneTap()).toBe(true);
    expect(prompt).toHaveBeenCalledTimes(1);
    // Se pasa un callback de momento (para detectar si no se mostró).
    expect(typeof prompt.mock.calls[0][0]).toBe('function');
  });

  it('si Google no muestra el selector, no rompe (el botón manual es el respaldo)', () => {
    const prompt = vi.fn((cb) => cb({
      isNotDisplayed: () => true,
      getNotDisplayedReason: () => 'suppressed_by_user',
    }));
    stubGis(prompt);
    expect(promptGoogleOneTap()).toBe(true);
    expect(prompt).toHaveBeenCalledTimes(1);
  });

  it('sin GIS (script no cargó) devuelve false y no lanza nada', () => {
    globalThis.window = {};
    expect(promptGoogleOneTap()).toBe(false);
  });

  it('si prompt no existe o lanza, devuelve false sin romper', () => {
    globalThis.window = { google: { accounts: { id: {} } } };
    expect(promptGoogleOneTap()).toBe(false);
    stubGis(() => { throw new Error('no prompt'); });
    expect(promptGoogleOneTap()).toBe(false);
  });
});

describe('AppLoginView: auto-lanzamiento solo con from=app', () => {
  it('con from=app lanza One Tap en cuanto GIS está listo', () => {
    expect(VIEW_SRC).toContain('promptGoogleOneTap');
    expect(VIEW_SRC).toContain('if (fromApp && !oneTapPromptedRef.current)');
    expect(VIEW_SRC).toContain('oneTapPromptedRef.current = true;');
    expect(VIEW_SRC).toContain('promptGoogleOneTap();');
  });

  it('sin from=app no se auto-lanza: la llamada vive solo dentro del if de fromApp', () => {
    // La única llamada a promptGoogleOneTap está dentro del bloque fromApp.
    const calls = [...VIEW_SRC.matchAll(/promptGoogleOneTap\(\);/g)];
    expect(calls).toHaveLength(1);
    const idx = VIEW_SRC.indexOf('promptGoogleOneTap();');
    const before = VIEW_SRC.slice(0, idx);
    expect(before.lastIndexOf('if (fromApp')).toBeGreaterThan(before.lastIndexOf('return true;'));
  });

  it('One Tap se lanza una sola vez por carga (ref, aunque el efecto se repita por dark)', () => {
    expect(VIEW_SRC).toContain('const oneTapPromptedRef = useRef(false)');
    expect(VIEW_SRC).toContain('!oneTapPromptedRef.current');
  });

  it('el botón GIS manual sigue existiendo como respaldo', () => {
    expect(VIEW_SRC).toContain('renderButton(googleBtnRef.current');
    expect(VIEW_SRC).toContain('gisTimedOut');
    expect(VIEW_SRC).toContain('handleFallbackGoogle');
  });

  it('NUNCA redirige al authorize de Supabase: el selector sigue diciendo "Ir a citymap.mx"', () => {
    expect(VIEW_SRC).not.toContain('authorize?provider');
    expect(VIEW_SRC).not.toContain('redirect_to');
    // Con from=app el respaldo es recargar la página, no ir a Supabase.
    expect(VIEW_SRC).toContain("window.location.reload();");
  });
});

describe('index.html: sin splash de arranque con from=app', () => {
  it('con from=app quita el boot-splash al cargar', () => {
    expect(INDEX_SRC).toContain("get('from') === 'app'");
    expect(INDEX_SRC).toContain('document.getElementById("boot-splash")');
  });

  it('sin from=app el splash sigue igual (temporizador de respaldo intacto)', () => {
    expect(INDEX_SRC).toContain('setTimeout(function () { var s = document.getElementById("boot-splash"); if (s) s.remove(); }, 15000);');
  });
});
