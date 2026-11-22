import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  EXPERIENCE_LOOKUP_COLUMNS,
  EXPERIENCE_FALLBACK_LIMIT,
  buildExperienceLookupQuery,
  buildExperienceFallbackQuery,
} from '../lib/experienceLookup.js';

// Hallazgo 7 de la auditoría de fluidez (21 nov 2026): TripsView pedía
// `select=*` sin limit ni status y, si el slug no se encontraba,
// descargaba TODA la tabla `experiences` (340 filas pesadas) solo para
// buscar por título slugificado. Arreglo: consultas acotadas con select
// recortado, solo aprobadas y con limit (5 la directa, 100 el rescate).

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

function selectColumns(query) {
  const m = query.match(/select=([^&]+)/);
  expect(m, `la consulta debe llevar select: ${query}`).not.toBeNull();
  return m[1].split(',');
}

describe('TripsView: consulta directa de revista acotada', () => {
  it('por UUID: filtra por id, solo aprobadas, limit 5, sin select=*', () => {
    const uuid = '4b734458-a9ed-46da-b913-d17ad5bbc0e8';
    const q = buildExperienceLookupQuery(uuid);
    expect(q).toContain(`id=eq.${uuid}`);
    expect(q).toContain('status=eq.approved');
    expect(q).toContain('limit=5');
    expect(q).not.toContain('select=*');
  });

  it('por slug: filtra por slug o título parecido, solo aprobadas, limit 5', () => {
    const q = buildExperienceLookupQuery('tour-nocturno-guadalajara');
    expect(q).toContain('slug.eq.tour-nocturno-guadalajara');
    expect(q).toContain('title.ilike.');
    expect(q).toContain('status=eq.approved');
    expect(q).toContain('limit=5');
    expect(q).not.toContain('select=*');
  });

  it('el select recortado trae lo que usa ExperienceViewer y nada de lo pesado sin uso', () => {
    const cols = selectColumns(buildExperienceLookupQuery('tour-nocturno'));
    for (const needed of ['id', 'title', 'slug', 'description', 'price', 'gallery', 'booking_config', 'faq', 'affiliate_products', 'meeting_point', 'route_url', 'created_at', 'biz_id', 'theme']) {
      expect(cols).toContain(needed);
    }
    for (const dropped of ['title_en', 'description_en', 'rating', 'review_count', 'active', 'updated_at']) {
      expect(cols).not.toContain(dropped);
    }
  });

  it('el fallback (slug viejo) ya no es toda la tabla: 100 aprobadas recientes, select recortado', () => {
    expect(EXPERIENCE_FALLBACK_LIMIT).toBe(100);
    const q = buildExperienceFallbackQuery();
    expect(q).toContain('status=eq.approved');
    expect(q).toContain('limit=100');
    expect(q).toContain('order=created_at.desc');
    expect(q).not.toContain('select=*');
    expect(selectColumns(q)).toEqual(selectColumns(buildExperienceLookupQuery('x')));
  });

  it('TripsView usa los constructores y ya no tiene el select=* sin límite', () => {
    const src = read('../components/TripsView.jsx');
    expect(src).toContain('buildExperienceLookupQuery(routeSlug)');
    expect(src).toContain('buildExperienceFallbackQuery()');
    expect(src).not.toContain('"?select=*"');
    expect(src).not.toContain("'?select=*'");
  });
});
