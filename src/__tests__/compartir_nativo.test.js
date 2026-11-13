// Compartir nativo en la app Android (Capacitor): en la WebView de la
// app navigator.canShare({files}) es false y el <a download> se traga
// en silencio (no hay gestor de descargas), así que el PNG se escribe
// en el directorio Cache y se comparte con los plugins nativos
// (@capacitor/share + @capacitor/filesystem). En web no cambia nada:
// navigator.share si puede, si no el <a download> de siempre.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  isNativePlatform: vi.fn(() => false),
  share: vi.fn(),
  writeFile: vi.fn(),
  deleteFile: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: mocks.isNativePlatform },
}));
vi.mock('@capacitor/share', () => ({
  Share: { share: mocks.share },
}));
vi.mock('@capacitor/filesystem', () => ({
  Filesystem: { writeFile: mocks.writeFile, deleteFile: mocks.deleteFile },
  Directory: { Cache: 'CACHE' },
}));

import { canShareImageFiles, isNativeApp, shareOrDownloadPng } from '../lib/shareCard.js';

const pngBlob = () => new Blob(['PNG'], { type: 'image/png' });
// 'PNG' en base64, para comprobar que el archivo nativo lleva el PNG entero.
const PNG_BASE64 = 'UE5H';

describe('isNativeApp / canShareImageFiles', () => {
  const origNavigator = globalThis.navigator;
  const origCreateObjectURL = URL.createObjectURL;
  const origRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isNativePlatform.mockReturnValue(false);
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', { value: origNavigator, configurable: true });
    URL.createObjectURL = origCreateObjectURL;
    URL.revokeObjectURL = origRevokeObjectURL;
    vi.useRealTimers();
  });

  it('en web sin navigator.canShare dice que no se puede compartir', () => {
    Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true });
    expect(isNativeApp()).toBe(false);
    expect(canShareImageFiles()).toBe(false);
  });

  it('en web, si canShare lanza, dice que no se puede compartir', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        canShare: () => {
          throw new Error('no soportado');
        },
      },
      configurable: true,
    });
    expect(canShareImageFiles()).toBe(false);
  });

  it('en web con navigator.canShare dice que sí se puede compartir', () => {
    Object.defineProperty(globalThis, 'navigator', { value: { canShare: () => true }, configurable: true });
    expect(canShareImageFiles()).toBe(true);
  });

  it('en la app nativa dice que sí aunque la WebView no pueda compartir archivos', () => {
    mocks.isNativePlatform.mockReturnValue(true);
    Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true });
    expect(isNativeApp()).toBe(true);
    expect(canShareImageFiles()).toBe(true);
  });

  it('en la app: escribe el PNG en Cache, lo comparte nativo y borra el temporal', async () => {
    mocks.isNativePlatform.mockReturnValue(true);
    mocks.writeFile.mockResolvedValue({ uri: 'file:///cache/citymap-x.png' });
    mocks.share.mockResolvedValue({ activityType: '' });
    mocks.deleteFile.mockResolvedValue({});

    const how = await shareOrDownloadPng(pngBlob(), 'citymap-x.png');

    expect(how).toBe('shared');
    expect(mocks.writeFile).toHaveBeenCalledWith({
      path: 'citymap-x.png',
      data: PNG_BASE64,
      directory: 'CACHE',
    });
    expect(mocks.share).toHaveBeenCalledWith({
      files: ['file:///cache/citymap-x.png'],
      dialogTitle: 'Compartir imagen',
    });
    expect(mocks.deleteFile).toHaveBeenCalledWith({ path: 'citymap-x.png', directory: 'CACHE' });
  });

  it('en la app: si el usuario cancela la hoja nativa, se traduce a AbortError y el temporal se borra igual', async () => {
    mocks.isNativePlatform.mockReturnValue(true);
    mocks.writeFile.mockResolvedValue({ uri: 'file:///cache/citymap-x.png' });
    mocks.share.mockRejectedValue(new Error('Share canceled'));
    mocks.deleteFile.mockResolvedValue({});

    await expect(shareOrDownloadPng(pngBlob(), 'citymap-x.png')).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(mocks.deleteFile).toHaveBeenCalledWith({ path: 'citymap-x.png', directory: 'CACHE' });
  });

  it('en la app: si falla escribir el archivo, no se intenta compartir', async () => {
    mocks.isNativePlatform.mockReturnValue(true);
    mocks.writeFile.mockRejectedValue(new Error('sin espacio'));

    await expect(shareOrDownloadPng(pngBlob(), 'citymap-x.png')).rejects.toThrow('sin espacio');
    expect(mocks.share).not.toHaveBeenCalled();
    expect(mocks.deleteFile).not.toHaveBeenCalled();
  });

  it('en web con navigator.share: usa el menú del sistema con el archivo', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis, 'navigator', {
      value: { canShare: () => true, share },
      configurable: true,
    });

    const how = await shareOrDownloadPng(pngBlob(), 'citymap-x.png');

    expect(how).toBe('shared');
    expect(share).toHaveBeenCalledTimes(1);
    const files = share.mock.calls[0][0].files;
    expect(files).toHaveLength(1);
    expect(files[0]).toBeInstanceOf(File);
    expect(files[0].name).toBe('citymap-x.png');
    expect(mocks.writeFile).not.toHaveBeenCalled();
    expect(mocks.share).not.toHaveBeenCalled();
  });

  it('en web sin navigator.share: descarga con <a download> y revoca la URL', async () => {
    vi.useFakeTimers();
    Object.defineProperty(globalThis, 'navigator', { value: { canShare: () => false }, configurable: true });
    const anchor = { click: vi.fn(), remove: vi.fn() };
    const createElement = vi.fn(() => anchor);
    const appendChild = vi.fn();
    Object.defineProperty(globalThis, 'document', {
      value: { createElement, body: { appendChild } },
      configurable: true,
    });
    const createObjectURL = vi.fn(() => 'blob:fake');
    const revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;

    try {
      const how = await shareOrDownloadPng(pngBlob(), 'citymap-x.png');

      expect(how).toBe('downloaded');
      expect(createObjectURL).toHaveBeenCalledTimes(1);
      expect(createElement).toHaveBeenCalledWith('a');
      expect(anchor.href).toBe('blob:fake');
      expect(anchor.download).toBe('citymap-x.png');
      expect(appendChild).toHaveBeenCalledWith(anchor);
      expect(anchor.click).toHaveBeenCalledTimes(1);
      expect(revokeObjectURL).not.toHaveBeenCalled();
      vi.runAllTimers();
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake');
    } finally {
      delete globalThis.document;
    }
  });
});
