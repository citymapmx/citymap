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

describe('eventShortSlug con slugs corruptos con comas', () => {
  // Filas reales de la base (verificado por PostgREST, nov 2026):
  // el slug trae varias ciudades pegadas con comas; el real es el
  // último segmento y su prefijo de ciudad se quita como siempre.
  it('Camila: último segmento y quita el prefijo', () => {
    expect(eventShortSlug({ slug: 'guadalajara-zapopan,tepic,guadalajara-camila-adios-world-tour', city_slug: 'guadalajara' }))
      .toBe('camila-adios-world-tour');
  });

  it('Maroon 5: corta hasta el prefijo de su ciudad aunque venga otra pegada', () => {
    expect(eventShortSlug({ slug: 'puerto-vallarta,Zapopan-puerto-vallarta,Zapopan,tepic-puerto-vallarta-maroon-5', city_slug: 'puerto-vallarta' }))
      .toBe('maroon-5');
  });

  it('CATRINAS RUN: último segmento y quita el prefijo', () => {
    expect(eventShortSlug({ slug: 'tepic-paris,tepic-catrinas-run-2026-camino-de-las-animas', city_slug: 'tepic' }))
      .toBe('catrinas-run-2026-camino-de-las-animas');
  });

  it('Aperol: el último segmento trae otro prefijo, se deja tal cual (sin adivinar ciudad)', () => {
    expect(eventShortSlug({ slug: 'guadalajara,zapopan-aperol-dia-de-campo', city_slug: 'guadalajara,zapopan' }))
      .toBe('zapopan-aperol-dia-de-campo');
  });

  it('city_slug con comas: usa el primer segmento como ciudad', () => {
    expect(eventShortSlug({ slug: 'zapopan-zz-top', city_slug: 'zapopan,guadalajara' })).toBe('zz-top');
  });

  it('sin ciudad devuelve el último segmento', () => {
    expect(eventShortSlug({ slug: 'a,zz-top', city_slug: '' })).toBe('zz-top');
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

describe('eventUrl con slugs corruptos con comas', () => {
  // Filas reales de la base (verificado por PostgREST, nov 2026).
  // Ninguna URL emitida puede llevar comas.
  const corruptos = [
    {
      name: 'Camila',
      event: { slug: 'guadalajara-zapopan,tepic,guadalajara-camila-adios-world-tour', city_slug: 'guadalajara' },
      expected: '/evento/guadalajara/camila-adios-world-tour',
    },
    {
      name: 'Maroon 5',
      event: { slug: 'puerto-vallarta,Zapopan-puerto-vallarta,Zapopan,tepic-puerto-vallarta-maroon-5', city_slug: 'puerto-vallarta' },
      expected: '/evento/puerto-vallarta/maroon-5',
    },
    {
      name: 'CATRINAS RUN',
      event: { slug: 'tepic-paris,tepic-catrinas-run-2026-camino-de-las-animas', city_slug: 'tepic' },
      expected: '/evento/tepic/catrinas-run-2026-camino-de-las-animas',
    },
    {
      name: 'Gorillaz',
      event: { slug: 'guadalajara,zapopan-tepic-zapopan,guadalajara,tepic,puerto-vallarta-gorillaz-the-mountain-tour-2026', city_slug: 'guadalajara,zapopan' },
      expected: '/evento/puerto-vallarta-gorillaz-the-mountain-tour-2026',
    },
  ];

  it.each(corruptos)('$name: URL sin comas, ciudad = primer segmento de city_slug', ({ event, expected }) => {
    const url = eventUrl(event, 'https://citymap.mx');
    expect(url).toBe(`https://citymap.mx${expected}`);
    expect(url).not.toContain(',');
  });

  it('Aperol: la ciudad es el primer segmento y el slug es el último (el que salía con coma en el sitemap)', () => {
    const url = eventUrl({ slug: 'guadalajara,zapopan-aperol-dia-de-campo', city_slug: 'guadalajara,zapopan' }, 'https://citymap.mx');
    expect(url).not.toContain(',');
    // El último segmento trae prefijo 'zapopan-', no 'guadalajara-':
    // no se adivina la ciudad, se usa el formato viejo sin comas.
    expect(url).toBe('https://citymap.mx/evento/zapopan-aperol-dia-de-campo');
  });

  it('city_slug con mayúsculas se normaliza (Zapopan)', () => {
    expect(eventUrl({ slug: 'guadalajara-zapopan,tepic,guadalajara-camila-adios-world-tour', city_slug: 'Guadalajara,Zapopan' }))
      .toBe('/evento/guadalajara/camila-adios-world-tour');
  });

  it('slug con comas sin prefijo de ciudad usa el formato viejo con el último segmento', () => {
    expect(eventUrl({ slug: 'foo,bar-baz', city_slug: 'guadalajara' })).toBe('/evento/bar-baz');
  });

  it('con datos limpios no recorta una ciudad que aparece dentro del título', () => {
    // El recorte agresivo solo aplica a slugs corruptos con comas.
    expect(eventUrl({ slug: 'fiesta-en-zapopan-2026', city_slug: 'zapopan' })).toBe('/evento/fiesta-en-zapopan-2026');
  });

  it('slug vacío o solo comas usa el id', () => {
    expect(eventUrl({ slug: '', id: 'abc-123', city_slug: 'guadalajara' })).toBe('/evento/abc-123');
    expect(eventUrl({ slug: 'zapopan,', id: 'abc-123', city_slug: 'guadalajara' })).toBe('/evento/abc-123');
    expect(eventUrl({ slug: 'zapopan,' })).toBe('/eventos');
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
