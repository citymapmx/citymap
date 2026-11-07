import { describe, it, expect } from 'vitest';
import {
  POST_TYPES,
  POST_THEMES,
  themeBySlug,
  themeLabel,
  normText,
  normalizeLegacyActivityType,
  typeLabel,
  isEditorialType,
  normalizeExperience,
  matchesPostFilter,
  filterPostsByTypeAndTheme,
} from '../lib/postTaxonomy.js';

// Valores reales de activity_type en la base de datos (62 filas, nov 2026).
const LEGACY_CASES = [
  ['📝 Blog', { type: 'Blog', theme: null }],
  ['📖 Guía', { type: 'Guía', theme: null }],
  ['Guía', { type: 'Guía', theme: null }],
  ['Guía Urbana', { type: 'Guía', theme: null }],
  ['📝 Blog / Guía', { type: 'Blog', theme: null }],
  ['Tour', { type: 'Tour', theme: null }],
  ['🗺️ Tours', { type: 'Tour', theme: null }],
  ['Tour Guiado', { type: 'Tour', theme: null }],
  ['Tour / Experiencia', { type: 'Tour', theme: null }],
  ['Ruta de Senderismo', { type: 'Tour', theme: 'rutas-recorridos' }],
  ['✨ Experiencias', { type: 'Experiencia', theme: null }],
  ['Experiencia', { type: 'Experiencia', theme: null }],
  ['🌿 Naturaleza', { type: 'Experiencia', theme: 'naturaleza' }],
  ['🏛️ Cultura', { type: 'Experiencia', theme: 'cultura' }],
  ['🏃 Deportes', { type: 'Experiencia', theme: 'deportes' }],
  ['🥳 Entretenimiento', { type: 'Experiencia', theme: 'entretenimiento' }],
  ['🎟️ Boleto', { type: 'Experiencia', theme: null }],
  ['Playa', { type: 'Experiencia', theme: null }],
];

describe('Taxonomía de publicaciones', () => {
  it('tiene exactamente los 4 tipos de publicación del encargo', () => {
    expect(POST_TYPES.map(t => t.value)).toEqual(['Blog', 'Guía', 'Tour', 'Experiencia']);
    expect(POST_TYPES.map(t => t.plural)).toEqual(['📝 Blogs', '📖 Guías', '🗺️ Tours', '✨ Experiencias']);
  });

  it('tiene exactamente las 8 temáticas del encargo', () => {
    expect(POST_THEMES.map(t => t.slug)).toEqual([
      'viajeros', 'gastronomia', 'historia-curiosidades', 'rutas-recorridos',
      'naturaleza', 'cultura', 'deportes', 'entretenimiento',
    ]);
    expect(POST_THEMES.map(t => t.label)).toEqual([
      'Viajeros', 'Gastronomía', 'Historia y curiosidades', 'Rutas y recorridos',
      'Naturaleza', 'Cultura', 'Deportes', 'Entretenimiento',
    ]);
  });

  it('normaliza sin importar mayúsculas, acentos ni emojis', () => {
    expect(normText('📖 Guía')).toBe('guia');
    expect(normText('  🗺️ TOURS  ')).toBe('tours');
    expect(normText(null)).toBe('');
  });

  it('mapea cada valor antiguo a tipo + temática', () => {
    for (const [legacy, expected] of LEGACY_CASES) {
      expect(normalizeLegacyActivityType(legacy), legacy).toEqual(expected);
    }
  });

  it('no inventa clasificación para valores desconocidos o vacíos', () => {
    expect(normalizeLegacyActivityType('Show')).toBeNull();
    expect(normalizeLegacyActivityType('')).toBeNull();
    expect(normalizeLegacyActivityType(null)).toBeNull();
  });

  it('devuelve la etiqueta de tipo con emoji para mostrar en público', () => {
    expect(typeLabel('Blog')).toBe('📝 Blog');
    expect(typeLabel('Guía')).toBe('📖 Guía');
    expect(typeLabel('Tour')).toBe('🗺️ Tour');
    expect(typeLabel('Experiencia')).toBe('✨ Experiencia');
    expect(typeLabel('📝 Blog')).toBe('📝 Blog');
    expect(typeLabel('Show')).toBe('Show');
    expect(typeLabel(null)).toBeNull();
  });

  it('detecta tipos editoriales (sin logística)', () => {
    expect(isEditorialType('Blog')).toBe(true);
    expect(isEditorialType('Guía')).toBe(true);
    expect(isEditorialType('📝 Blog / Guía')).toBe(true);
    expect(isEditorialType('Tour')).toBe(false);
    expect(isEditorialType('Experiencia')).toBe(false);
    expect(isEditorialType('🌿 Naturaleza')).toBe(false);
  });

  it('normaliza una publicación sin tocar id, slug, ciudad ni negocio', () => {
    const row = {
      id: 'abc', slug: 'tepic-aticama', title: 'Aticama',
      activity_type: 'Playa', theme: null,
      city_slug: 'tepic', biz_id: 'biz-1', price: 0,
    };
    expect(normalizeExperience(row)).toEqual({
      ...row, activity_type: 'Experiencia', theme: null,
    });
  });

  it('respeta la temática ya guardada en la fila', () => {
    const row = { id: 'x', activity_type: '🌿 Naturaleza', theme: 'gastronomia' };
    expect(normalizeExperience(row)).toEqual({ ...row, activity_type: 'Experiencia', theme: 'gastronomia' });
  });

  it('deja intacta una fila ya canónica y cae a Experiencia si el tipo es desconocido', () => {
    expect(normalizeExperience({ id: 'a', activity_type: 'Tour', theme: 'naturaleza' }))
      .toEqual({ id: 'a', activity_type: 'Tour', theme: 'naturaleza' });
    expect(normalizeExperience({ id: 'b', activity_type: 'Show', theme: null }).activity_type).toBe('Experiencia');
    expect(normalizeExperience(null)).toBeNull();
  });

  it('los filtros de Revista siguen funcionando con tipo y con temática', () => {
    expect(matchesPostFilter({ activity_type: 'Tour', theme: null }, 'tour')).toBe(true);
    expect(matchesPostFilter({ activity_type: 'Blog', theme: null }, 'blog')).toBe(true);
    expect(matchesPostFilter({ activity_type: 'Guía', theme: null }, 'guia')).toBe(true);
    expect(matchesPostFilter({ activity_type: 'Experiencia', theme: null }, 'experiencia')).toBe(true);
    // Senderismo sobrevive gracias a la temática Rutas y recorridos.
    expect(matchesPostFilter({ activity_type: 'Tour', theme: 'rutas-recorridos' }, 'senderismo')).toBe(true);
    expect(matchesPostFilter({ activity_type: 'Ruta de Senderismo', theme: null }, 'senderismo')).toBe(true);
    // Gastronomía: el filtro es el adjetivo, la temática el sustantivo.
    expect(matchesPostFilter({ activity_type: 'Experiencia', theme: 'gastronomia' }, 'gastronómica')).toBe(true);
    expect(matchesPostFilter({ activity_type: 'Experiencia', theme: 'naturaleza' }, 'naturaleza')).toBe(true);
    expect(matchesPostFilter({ activity_type: 'Blog', theme: null }, 'tour')).toBe(false);
    expect(matchesPostFilter({ activity_type: null, theme: null }, 'tour')).toBe(false);
  });

  it('filtra publicaciones por tipo y temática combinados', () => {
    const posts = [
      { id: 1, activity_type: 'Guía', theme: 'viajeros' },
      { id: 2, activity_type: 'Blog', theme: 'gastronomia' },
      { id: 3, activity_type: 'Tour', theme: 'naturaleza' },
      { id: 4, activity_type: 'Experiencia', theme: 'entretenimiento' },
      { id: 5, activity_type: 'Blog', theme: null },
      { id: 6, activity_type: '📝 Blog', theme: null },
    ];
    expect(filterPostsByTypeAndTheme(posts, 'all', null).map(p => p.id)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(filterPostsByTypeAndTheme(posts, 'Guía', null).map(p => p.id)).toEqual([1]);
    expect(filterPostsByTypeAndTheme(posts, 'Blog', null).map(p => p.id)).toEqual([2, 5, 6]);
    expect(filterPostsByTypeAndTheme(posts, 'all', 'naturaleza').map(p => p.id)).toEqual([3]);
    expect(filterPostsByTypeAndTheme(posts, 'Blog', 'gastronomia').map(p => p.id)).toEqual([2]);
    expect(filterPostsByTypeAndTheme(posts, 'Tour', 'naturaleza').map(p => p.id)).toEqual([3]);
    expect(filterPostsByTypeAndTheme(posts, 'Tour', 'gastronomia')).toEqual([]);
    expect(filterPostsByTypeAndTheme(posts, 'Experiencia', 'entretenimiento').map(p => p.id)).toEqual([4]);
    expect(filterPostsByTypeAndTheme(null, 'Blog', null)).toEqual([]);
    expect(filterPostsByTypeAndTheme([], 'Blog', null)).toEqual([]);
  });

  it('resuelve etiquetas de temática', () => {
    expect(themeBySlug('gastronomia').label).toBe('Gastronomía');
    expect(themeBySlug('inexistente')).toBeNull();
    expect(themeLabel('naturaleza')).toBe('🌿 Naturaleza');
    expect(themeLabel(null)).toBeNull();
  });
});
