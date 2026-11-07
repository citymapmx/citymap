import { describe, it, expect } from 'vitest';
import {
  EVENT_IMAGE_OPTIMIZE,
  resolveOptimizeOptions,
  shouldOptimizeImage,
} from '../lib/imageOptimize.js';

const img = (size, type = 'image/jpeg') => ({ size, type, name: 'foto.jpg' });

describe('EVENT_IMAGE_OPTIMIZE (foto del evento)', () => {
  it('optimiza siempre, a 1600 px, calidad 0.82 y tope 0.8 MB', () => {
    expect(EVENT_IMAGE_OPTIMIZE).toEqual({
      maxSizeMB: 0.8,
      maxWidthOrHeight: 1600,
      initialQuality: 0.82,
      always: true,
    });
  });

  it('una foto de evento pequeña también se optimiza (always)', () => {
    const opts = resolveOptimizeOptions({ optimize: EVENT_IMAGE_OPTIMIZE });
    expect(shouldOptimizeImage(img(200 * 1024), opts)).toBe(true);
  });

  it('una foto de evento grande se optimiza', () => {
    const opts = resolveOptimizeOptions({ optimize: EVENT_IMAGE_OPTIMIZE });
    expect(shouldOptimizeImage(img(4 * 1024 * 1024), opts)).toBe(true);
  });
});

describe('resolveOptimizeOptions', () => {
  it('sin preset mantiene el comportamiento histórico (1.5 MB / 2000 px / 0.95)', () => {
    expect(resolveOptimizeOptions()).toEqual({
      targetMB: 1.5,
      maxWidthOrHeight: 2000,
      initialQuality: 0.95,
      always: false,
    });
  });

  it('avatarMode mantiene su preset propio (0.1 MB / 300 px / 0.8)', () => {
    expect(resolveOptimizeOptions({ avatarMode: true })).toEqual({
      targetMB: 0.1,
      maxWidthOrHeight: 300,
      initialQuality: 0.8,
      always: false,
    });
  });

  it('un preset parcial solo sobrescribe lo que trae', () => {
    expect(resolveOptimizeOptions({ optimize: { maxWidthOrHeight: 1200 } })).toEqual({
      targetMB: 1.5,
      maxWidthOrHeight: 1200,
      initialQuality: 0.95,
      always: false,
    });
  });
});

describe('shouldOptimizeImage', () => {
  it('sin always, solo optimiza si el archivo supera el tope', () => {
    expect(shouldOptimizeImage(img(2 * 1024 * 1024), { targetMB: 1.5 })).toBe(true);
    expect(shouldOptimizeImage(img(1 * 1024 * 1024), { targetMB: 1.5 })).toBe(false);
  });

  it('nunca toca PDF, SVG ni archivos que no son imagen', () => {
    const opts = { targetMB: 0.1, always: true };
    expect(shouldOptimizeImage({ size: 5 * 1024 * 1024, type: 'application/pdf' }, opts)).toBe(false);
    expect(shouldOptimizeImage(img(5 * 1024 * 1024, 'image/svg+xml'), opts)).toBe(false);
    expect(shouldOptimizeImage({ size: 5 * 1024 * 1024, type: 'text/plain' }, opts)).toBe(false);
  });

  it('archivos sin tipo o nulos no se optimizan', () => {
    expect(shouldOptimizeImage(null, { always: true })).toBe(false);
    expect(shouldOptimizeImage({}, { always: true })).toBe(false);
  });
});
