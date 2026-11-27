import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  ANTOJO_ORDER,
  antojoIdForBiz,
  bizCanHaveMenu,
  bizPhotoUrl,
  deriveAntojos,
  groupAntojos,
  normalizeAntojoText,
} from '../lib/antojos.js';
import { isOpenNow } from '../lib/utils.js';

// «¿Qué se te antoja?» — derivación solo desde datos reales de businesses,
// exclusión de lugares sin foto, filtro de abierto-ahora con hora simulada
// y selección por defecto (primer antojo con algo abierto).

const PHOTO = [{ url: 'https://ejemplo.com/foto.webp' }];
// Viernes 27 nov 2026, 14:00 en Ciudad de México (20:00 UTC).
const FRIDAY_2PM = new Date('2026-11-27T20:00:00Z');
const TZ = 'America/Mexico_City';
const OPEN_DAY = {
  lun: '08:00 a.m. - 11:00 p.m.',
  mar: '08:00 a.m. - 11:00 p.m.',
  mie: '08:00 a.m. - 11:00 p.m.',
  jue: '08:00 a.m. - 11:00 p.m.',
  vie: '08:00 a.m. - 11:00 p.m.',
  sab: '08:00 a.m. - 11:00 p.m.',
  dom: '08:00 a.m. - 11:00 p.m.',
};
const CLOSED_DAY = { ...OPEN_DAY, vie: 'Cerrado' };

const biz = (over = {}) => ({
  id: over.id || `b-${Math.random().toString(36).slice(2, 8)}`,
  name: over.name || 'Lugar',
  category: over.category || 'restaurantes',
  subcategory: over.subcategory ?? null,
  photos: over.photos ?? PHOTO,
  schedule: over.schedule ?? OPEN_DAY,
  plan: over.plan || 'free',
  rating: over.rating ?? null,
  ...over,
});

const isOpen = (b) => isOpenNow(b, TZ, FRIDAY_2PM);

describe('derivación de antojos solo desde datos reales', () => {
  it('normaliza acentos y mayúsculas (NFD)', () => {
    expect(normalizeAntojoText('TAQUERÍA Café')).toBe('taqueria cafe');
    expect(antojoIdForBiz(biz({ name: 'TAQUERÍA El Güero' }))).toBe('tacos');
    expect(antojoIdForBiz(biz({ name: 'Café Boutique' }))).toBe('cafe');
  });

  it('deriva de subcategoría aunque el nombre no diga nada', () => {
    expect(antojoIdForBiz(biz({ name: 'El Rincón', subcategory: 'Taquerías' }))).toBe('tacos');
    expect(antojoIdForBiz(biz({ name: 'El Rincón', subcategory: 'Pizzerías' }))).toBe('pizza');
    expect(antojoIdForBiz(biz({ name: 'El Rincón', subcategory: 'Mariscos' }))).toBe('mariscos');
    expect(antojoIdForBiz(biz({ name: 'El Rincón', subcategory: 'Comida Coreana' }))).toBe('noodles');
    expect(antojoIdForBiz(biz({ name: 'El Rincón', subcategory: 'Sushi' }))).toBe('sushi');
  });

  it('deriva de categoría para cafeterías y del nombre para el resto', () => {
    expect(antojoIdForBiz(biz({ name: 'La Esquina', category: 'cafeterias' }))).toBe('cafe');
    expect(antojoIdForBiz(biz({ name: 'Ramen House' }))).toBe('noodles');
    expect(antojoIdForBiz(biz({ name: 'Burger Lab' }))).toBe('hamburguesas');
    expect(antojoIdForBiz(biz({ name: 'Pastelería Dulce' }))).toBe('postres');
  });

  it('sin antojos inventados: un negocio sin pista no entra en ningún antojo', () => {
    expect(antojoIdForBiz(biz({ name: 'Gimnasio Norte', category: 'fitness' }))).toBe(null);
    expect(deriveAntojos([biz({ name: 'Gimnasio Norte', category: 'fitness' })], isOpen)).toEqual([]);
  });

  it('los grupos salen en orden fijo aunque la lista venga desordenada', () => {
    const groups = groupAntojos([
      biz({ name: 'Pizza Roma' }),
      biz({ name: 'Tacos El Güero' }),
      biz({ name: 'Sushiito' }),
    ]);
    expect(groups.map((g) => g.id)).toEqual(['tacos', 'sushi', 'pizza']);
    expect(groups.map((g) => g.id)).toEqual(
      ANTOJO_ORDER.filter((id) => groups.some((g) => g.id === id)),
    );
  });
});

describe('solo lugares con foto', () => {
  it('un lugar sin fotos no entra en ningún antojo', () => {
    const groups = groupAntojos([
      biz({ name: 'Tacos Sin Foto', photos: [] }),
      biz({ name: 'Tacos Con Foto' }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].places).toHaveLength(1);
    expect(groups[0].places[0].name).toBe('Tacos Con Foto');
  });

  it('un antojo con solo lugares sin foto desaparece entero', () => {
    expect(groupAntojos([biz({ name: 'Pizza Sin Foto', photos: null })])).toEqual([]);
  });

  it('el logo nunca cuenta como foto del lugar', () => {
    const onlyLogo = biz({ name: 'Tacos Logo', photos: [], logo_url: 'https://ejemplo.com/logo.png' });
    expect(bizPhotoUrl(onlyLogo)).toBe(null);
    expect(groupAntojos([onlyLogo])).toEqual([]);
  });
});

describe('filtro de abierto-ahora con hora simulada', () => {
  it('solo muestra los lugares abiertos a las 14:00 del viernes', () => {
    const groups = deriveAntojos([
      biz({ id: 't1', name: 'Tacos Abiertos' }),
      biz({ id: 't2', name: 'Tacos Cerrados', schedule: CLOSED_DAY }),
      biz({ id: 'p1', name: 'Pizza Abierta' }),
    ], isOpen);
    expect(groups.map((g) => g.id)).toEqual(['tacos', 'pizza']);
    expect(groups[0].places.map((b) => b.id)).toEqual(['t1']);
  });

  it('un antojo con lugares pero todos cerrados desaparece', () => {
    const groups = deriveAntojos([
      biz({ name: 'Tacos Cerrados', schedule: CLOSED_DAY }),
      biz({ name: 'Pizza Abierta' }),
    ], isOpen);
    expect(groups.map((g) => g.id)).toEqual(['pizza']);
  });

  it('si ningún antojo tiene nada abierto ahora, no hay grupos (la sección no se monta)', () => {
    const groups = deriveAntojos([
      biz({ name: 'Tacos Cerrados', schedule: CLOSED_DAY }),
      biz({ name: 'Pizza Cerrada', schedule: CLOSED_DAY }),
    ], isOpen);
    expect(groups).toEqual([]);
  });

  it('la selección por defecto es el primer antojo con algo abierto', () => {
    // Tacos existe pero cerrado; café es el primero con algo abierto.
    const groups = deriveAntojos([
      biz({ name: 'Tacos Cerrados', schedule: CLOSED_DAY }),
      biz({ name: 'Café Abierto', category: 'cafeterias' }),
      biz({ name: 'Pizza Abierta' }),
    ], isOpen);
    expect(groups[0].id).toBe('cafe');
  });
});

describe('foto del círculo: la del primer lugar (mejor valorado)', () => {
  it('los lugares de un antojo van por calificación y el círculo usa el primero', () => {
    const groups = groupAntojos([
      biz({ id: 'a', name: 'Tacos Regulares', rating: 3.5 }),
      biz({ id: 'b', name: 'Tacos Top', rating: 4.9, photos: [{ url: 'https://ejemplo.com/top.webp' }] }),
      biz({ id: 'c', name: 'Tacos Sin Rating', rating: null }),
    ]);
    expect(groups[0].places.map((b) => b.id)).toEqual(['b', 'a', 'c']);
    expect(bizPhotoUrl(groups[0].places[0])).toBe('https://ejemplo.com/top.webp');
  });
});

describe('«Ver menú»: mismo portón que la ficha', () => {
  it('solo los planes de pago pueden tener menú', () => {
    expect(bizCanHaveMenu(biz({ plan: 'fideliza' }))).toBe(true);
    expect(bizCanHaveMenu(biz({ plan: 'premium' }))).toBe(true);
    expect(bizCanHaveMenu(biz({ plan: 'elite' }))).toBe(true);
    expect(bizCanHaveMenu(biz({ plan: 'free' }))).toBe(false);
    expect(bizCanHaveMenu(biz({ plan: 'pro' }))).toBe(false);
    expect(bizCanHaveMenu(biz({ plan: null }))).toBe(false);
  });
});

describe('montaje y textos', () => {
  const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

  it('HomeView monta la sección junto a Experiencias destacadas, solo en explorar', () => {
    const src = read('../views/HomeView.jsx');
    expect(src).toContain('AntojosSection');
    expect(src).toContain('deriveAntojos');
    expect(src).toContain('antojosGroups.length > 0');
    // Mismo handler de ficha que las tarjetas del inicio.
    expect(src).toContain('onSelect={handleCardTap}');
  });

  it('GlobalHomeView no se toca: el muro global tiene sus propias secciones', () => {
    const src = read('../views/GlobalHomeView.jsx');
    expect(src).not.toContain('AntojosSection');
    expect(src).not.toContain('antojo');
  });

  it('las claves i18n existen en español e inglés', () => {
    for (const file of ['../lib/i18n.js', '../lib/i18n-en.js']) {
      const src = read(file);
      for (const key of [
        'home_que_se_te_antoja',
        'home_que_se_te_antoja_sub',
        'home_abierto_ahora',
        'home_ver_todos_antojo',
        'home_antojo_tacos',
        'home_antojo_cafe',
        'home_antojo_sushi',
        'home_antojo_pizza',
        'home_antojo_mariscos',
        'home_antojo_noodles',
        'home_antojo_hamburguesas',
        'home_antojo_postres',
      ]) {
        expect(src).toContain(`"${key}"`);
      }
    }
    expect(read('../lib/i18n-en.js')).toContain('"home_que_se_te_antoja": "What are you craving?"');
  });

  it('la precarga ligera de la ciudad trae subcategory (la derivación la necesita)', () => {
    expect(read('../store/useDataStore.js')).toContain('booking_config,photos,subcategory');
  });
});

describe('AntojosSection (render)', () => {
  async function renderSection(groups) {
    const React = (await import('react')).default;
    const { renderToStaticMarkup } = await import('react-dom/server');
    const AntojosSection = (await import('../components/home/AntojosSection.jsx')).default;
    const T = { text: '#111', sub: '#666', border: '#eee', white: '#fff', shadow: 'none' };
    return renderToStaticMarkup(
      <AntojosSection groups={groups} T={T} cityName="Guadalajara" onSelect={() => {}} onSeeAll={() => {}} />,
    );
  }

  it('muestra el título, los círculos y los lugares abiertos del primer antojo', async () => {
    const html = await renderSection([
      { id: 'tacos', places: [biz({ id: 't1', name: 'Tacos El Güero', category: 'restaurantes', rating: 4.5 })] },
      { id: 'cafe', places: [biz({ id: 'c1', name: 'Café Boutique', category: 'cafeterias', rating: 4.8 })] },
    ]);
    expect(html).toContain('¿Qué se te antoja?');
    expect(html).toContain('Tacos');
    expect(html).toContain('Café');
    expect(html).toContain('Tacos El Güero');
    expect(html).toContain('Restaurantes · Guadalajara');
    expect(html).toContain('Abierto ahora');
    // El primer antojo (tacos) es el seleccionado: su lugar se muestra.
    expect(html).toContain('Ver todos los tacos');
  });

  it('«Ver menú» solo sale con plan de pago; el free abre la ficha sin prometer menú', async () => {
    const html = await renderSection([
      { id: 'tacos', places: [
        biz({ id: 't1', name: 'Tacos Free', plan: 'free', rating: 4.9 }),
        biz({ id: 't2', name: 'Tacos Fideliza', plan: 'fideliza', rating: 4.0 }),
      ] },
    ]);
    expect(html).toContain('Tacos Free');
    expect(html).toContain('Tacos Fideliza');
    // Un solo «Ver menú»: el del Fideliza.
    expect(html.match(/Ver menú/g)).toHaveLength(1);
  });

  it('sin grupos no renderiza nada', async () => {
    expect(await renderSection([])).toBe('');
    expect(await renderSection(null)).toBe('');
  });
});
