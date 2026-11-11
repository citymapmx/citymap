import { describe, it, expect } from 'vitest';
import { eventShortSlug, eventUrl, eventFullSlug, resolveEventSlug } from '../lib/eventUrls.js';

// Formato nuevo de URLs de eventos (pedido de Jonathan, nov 2026):
// /evento/:ciudad/:slug-corto — p. ej. /evento/zapopan/zz-top
// en lugar de /evento/zapopan-zz-top. Las viejas siguen resolviendo.

describe('eventShortSlug', () => {
  it('quita el prefijo de la ciudad del slug', () => {
    expect(eventShortSlug({ slug: 'zapopan-zz-top', city_slug: 'zapopan' })).toBe('zz-top');
  });

  it('conserva el sufijo secreto de los eventos privados', () => {
    expect(eventShortSlug({ slug: 'zapopan-posada-2026-x7k2p9', city_slug: 'zapopan' })).toBe('posada-2026-x7k2p9');
  });

  it('no toca el slug si no trae el prefijo de su ciudad', () => {
    expect(eventShortSlug({ slug: 'guadalajara-natalia-lacunza-en-guadalajara', city_slug: 'zapopan' })).toBe('guadalajara-natalia-lacunza-en-guadalajara');
  });

  it('devuelve el slug tal cual sin ciudad', () => {
    expect(eventShortSlug({ slug: 'zz-top', city_slug: '' })).toBe('zz-top');
  });
});

describe('eventUrl', () => {
  it('arma /evento/:ciudad/:slug-corto', () => {
    expect(eventUrl({ slug: 'zapopan-zz-top', city_slug: 'zapopan' })).toBe('/evento/zapopan/zz-top');
    expect(eventUrl({ slug: 'guadalajara-dimash-qudaibergen-en-guadalajara', city_slug: 'guadalajara' })).toBe('/evento/guadalajara/dimash-qudaibergen-en-guadalajara');
  });

  it('con el origin arma la URL completa', () => {
    expect(eventUrl({ slug: 'zapopan-zz-top', city_slug: 'zapopan' }, 'https://citymap.mx')).toBe('https://citymap.mx/evento/zapopan/zz-top');
  });

  it('sin ciudad usa el formato viejo', () => {
    expect(eventUrl({ slug: 'zz-top', city_slug: '' })).toBe('/evento/zz-top');
    expect(eventUrl({ id: '123e4567-e89b-12d3-a456-426614174000' })).toBe('/evento/123e4567-e89b-12d3-a456-426614174000');
  });

  it('sin slug ni id apunta a la lista', () => {
    expect(eventUrl({})).toBe('/eventos');
  });
});

describe('eventFullSlug', () => {
  it('reconstruye el slug completo para buscar en la base', () => {
    expect(eventFullSlug('zapopan', 'zz-top')).toBe('zapopan-zz-top');
    expect(eventFullSlug('zapopan', 'zapopan-zz-top')).toBe('zapopan-zz-top');
    expect(eventFullSlug('', 'zz-top')).toBe('zz-top');
  });
});

describe('resolveEventSlug', () => {
  it('corrige el slug de Eslabón con errata (corto y completo)', () => {
    // La base guardaba '...-eslabon-aramado-...' (errata); el slug correcto
    // es '...-eslabon-armado-...'. La URL vieja debe seguir resolviendo.
    expect(resolveEventSlug('eslabon-aramado-tour-el-amor-nocturno-en-guadalajara'))
      .toBe('eslabon-armado-tour-el-amor-nocturno-en-guadalajara');
    expect(resolveEventSlug('guadalajara-eslabon-aramado-tour-el-amor-nocturno-en-guadalajara'))
      .toBe('guadalajara-eslabon-armado-tour-el-amor-nocturno-en-guadalajara');
  });

  it('no toca los slugs que no están en el mapa', () => {
    expect(resolveEventSlug('zapopan-zz-top')).toBe('zapopan-zz-top');
    expect(resolveEventSlug('')).toBe('');
    expect(resolveEventSlug(null)).toBe('');
  });
});
