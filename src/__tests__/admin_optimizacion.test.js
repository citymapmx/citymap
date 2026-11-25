import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { ADMIN_EXPERIENCE_FULL_COLUMNS, EXPERIENCE_LOOKUP_COLUMNS } from '../lib/experienceLookup.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// Optimización Admin (24 nov 2026, PR #465): el Admin descargaba ~1 MB
// por apertura (experiencias select=* 666 KB + actividad completa 144 KB)
// y volvía a descargarlo TODO tras cada edición. Cambios:
//  1. experiencias: select ligero en la lista + fila completa al editar.
//  2. actividad: solo 90 días; «Todo el tiempo» bajo demanda.
//  3. load(tabla): tras editar solo se recarga la tabla editada.

const panel = read('../components/AdminPanel.jsx');
const experiencesTab = read('../components/admin/AdminExperiencesTab.jsx');
const activityTab = read('../components/admin/AdminActivityTab.jsx');

const selectConst = (src, name) => {
  const m = src.match(new RegExp(`const ${name} = "([^"]+)"`));
  expect(m, `${name} debe existir`).not.toBeNull();
  return m[1].split(',');
};

describe('Admin: experiencias con select ligero en la lista', () => {
  it('la lista solo pide lo que lee (sin description/faq/includes)', () => {
    const cols = selectConst(panel, 'ADMIN_EXPERIENCES_LIST_SELECT');
    for (const col of ['id', 'slug', 'title', 'city_slug', 'price', 'gallery', 'activity_type', 'theme', 'status', 'active', 'created_at']) {
      expect(cols).toContain(col);
    }
    for (const col of ['description', 'description_en', 'meeting_point', 'meeting_url', 'route_url', 'includes', 'not_includes', 'faq', 'author_name', 'affiliate_products', 'biz_id', 'booking_config', 'languages']) {
      expect(cols).not.toContain(col);
    }
  });

  it('el Admin ya no pide experiencias con select=*', () => {
    expect(panel).not.toContain('sb.get("experiences", "?order=created_at.desc")');
    expect(panel).toContain('ADMIN_EXPERIENCES_LIST_SELECT');
  });

  it('la fila completa para editar trae lo que usa el formulario', () => {
    for (const col of ['description', 'faq', 'includes', 'not_includes', 'meeting_point', 'meeting_url', 'route_url', 'author_name', 'affiliate_products', 'biz_id', 'booking_config', 'languages']) {
      expect(ADMIN_EXPERIENCE_FULL_COLUMNS.split(',')).toContain(col);
    }
    for (const col of ['status', 'active', 'price_type']) {
      expect(ADMIN_EXPERIENCE_FULL_COLUMNS.split(',')).toContain(col);
    }
    // Es el lookup más los 3 del formulario.
    expect(ADMIN_EXPERIENCE_FULL_COLUMNS.split(',').length)
      .toBe(EXPERIENCE_LOOKUP_COLUMNS.split(',').length + 3);
  });

  it('al pulsar Editar se pide la fila completa por id antes de abrir el formulario', () => {
    expect(experiencesTab).toContain('ADMIN_EXPERIENCE_FULL_COLUMNS');
    expect(experiencesTab).toContain('id=eq.${exp.id}');
    expect(experiencesTab).toContain('openEditExperience(exp)');
    expect(experiencesTab).not.toContain('setExpForm(normalizeExperience({ ...exp }))');
  });
});

describe('Admin: actividad solo 90 días, «Todo el tiempo» bajo demanda', () => {
  it('el corte por defecto son 90 días (cubre 7/30/90, Este mes y Mes anterior)', () => {
    expect(panel).toContain('const ADMIN_ANALYTICS_DAYS = 90');
    expect(panel).toContain('created_at=gte.${since}');
  });

  it('«Todo el tiempo» pide la historia completa una sola vez', () => {
    expect(panel).toContain('case "analytics-all"');
    expect(panel).toContain('analyticsFullRef.current');
    expect(panel).toContain('if (analyticsPeriod === "all") load("analytics-all")');
    expect(activityTab).toContain('if (period === "all") load("analytics-all")');
  });

  it('la carga completa de actividad ya no existe en el montaje', () => {
    expect(panel).not.toContain('sb.get("analytics", `?select=event_type,city_slug,biz_id,created_at&limit=1000&offset=${offset}`)');
  });
});

describe('Admin: load(tabla) recarga solo la tabla editada', () => {
  it('load acepta una tabla o un arreglo y mezcla solo ese parche', () => {
    expect(panel).toContain('const load = useCallback(async (table)');
    expect(panel).toContain('setData(prev => ({ ...prev, ...patch }))');
  });

  it('los handlers del AdminPanel recargan su tabla (y nada más)', () => {
    expect(panel.match(/await load\("businesses"\)/g)).toHaveLength(8);
    expect(panel).toContain('await load(["business_claims", "businesses"])');
    expect(panel).toContain('await load("business_claims")');
    expect(panel.match(/await load\("events"\)/g)).toHaveLength(2);
    expect(panel).not.toContain('await load();');
  });

  it('cada pestaña recarga solo su tabla', () => {
    const cases = [
      ['../components/admin/AdminActivityTab.jsx', 'businesses'],
      ['../components/admin/AdminBannersTab.jsx', 'banners'],
      ['../components/admin/AdminCategoriesTab.jsx', 'categories'],
      ['../components/admin/AdminCitiesTab.jsx', 'cities'],
      ['../components/admin/AdminCouponsTab.jsx', 'coupons'],
      ['../components/admin/AdminEventsTab.jsx', 'events'],
      ['../components/admin/AdminExperiencesTab.jsx', 'experiences'],
      ['../components/admin/AdminPromosTab.jsx', 'promos'],
      ['../components/admin/AdminRafflesTab.jsx', 'raffles'],
      ['../components/admin/AdminReservationsTab.jsx', 'reservations'],
    ];
    for (const [file, table] of cases) {
      const src = read(file);
      expect(src).toContain(`load("${table}")`);
      expect(src).not.toContain('await load();');
    }
  });

  it('mercadolibre_products ya no se pide (se descargaba y se descartaba)', () => {
    expect(panel).not.toContain('sb.get("mercadolibre_products"');
  });
});
