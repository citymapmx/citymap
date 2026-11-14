import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import BusinessCard from '../components/cards/BusinessCard.jsx';

// Pantallas principales en modo oscuro (14 nov 2026, lote 2):
// el explorador verificó que casi todo ya tenía variante oscura, pero
// quedaban glifos y separadores pintados con `T.border` — que en oscuro
// es #3F3F46 sobre #232326 (~1,5:1, casi invisibles) — y el glifo «✕»
// del diseñador de estilos de menú, con `color: t.text` (#F4F4F5 en
// oscuro) dentro de un círculo fijo #FFFFFF (blanco sobre blanco).
// El mismo bug de las estrellas vacías ya se había corregido en
// DetailView usando #71717A en oscuro; aquí se aplica lo mismo.
// En claro todo queda pixel a pixel igual (rama `: T.border` intacta).

const { MOCK_UI } = vi.hoisted(() => ({ MOCK_UI: { dark: false, lang: 'es' } }));
vi.mock('../store/useUIStore.js', () => ({
  useUIStore: (sel) => sel({ dark: MOCK_UI.dark, lang: MOCK_UI.lang, toast$: () => {} }),
}));
vi.mock('../hooks/useTranslation.js', () => ({
  useTranslation: () => ({ t: (k, fb) => (fb ?? k) }),
}));
vi.mock('../store/useDataStore.js', () => ({
  useDataStore: (sel) => sel({ googleRatings: {} }),
}));

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// Contraste WCAG (relación de luminancia), para documentar con números
// que el gris de reemplazo sí se ve y el anterior no.
const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const T_DARK = {
  dark: true, text: '#F4F4F5', sub: '#A1A1AA', bg: '#18181B', white: '#232326',
  card: '#232326', border: '#3F3F46', green: '#F4F4F5', greenL: '#232326',
  red: '#F07060', shadow: '0 2px 16px rgba(0,0,0,.20)',
};
const T_LIGHT = {
  dark: false, text: '#0F1A14', sub: '#6B7280', bg: '#FFFFFF', white: '#FFFFFF',
  card: '#FFFFFF', border: '#E5E7EB', green: '#000000', greenL: '#F3F4F6',
  red: '#DC2626', shadow: '0 2px 16px rgba(0,0,0,.07)',
};

const BIZ_SIN_RESENAS = { id: 'b1', name: 'Café Prueba', category: 'cafeteria', plan: 'free', photos: [] };
const BIZ_CON_RESENAS = { id: 'b2', name: 'Tacos Prueba', category: 'restaurante', plan: 'free', photos: [], rating: 4.5, review_count: 12 };

const renderCard = (dark, biz, extra = {}) => {
  MOCK_UI.dark = dark;
  return renderToStaticMarkup(
    React.createElement(BusinessCard, { b: biz, T: dark ? T_DARK : T_LIGHT, dark, realFavs: 3, ...extra })
  );
};

afterEach(() => { MOCK_UI.dark = false; });

describe('contraste: el gris de reemplazo sí se ve y el anterior no', () => {
  it('#71717A sobre tarjeta oscura #232326 supera 3:1 (glifo decorativo); #3F3F46 no llegaba a 2:1', () => {
    expect(ratio('#71717A', '#232326')).toBeGreaterThan(3);
    expect(ratio('#3F3F46', '#232326')).toBeLessThan(2);
    expect(ratio('#71717A', '#232326')).toBeGreaterThan(ratio('#3F3F46', '#232326'));
  });

  it('el glifo ✕ #18181B sobre círculo #FFFFFF supera 4.5:1 (texto)', () => {
    expect(ratio('#18181B', '#FFFFFF')).toBeGreaterThan(4.5);
  });
});

describe('BusinessCard: estrellas vacías y separadores «·»', () => {
  it('en oscuro las 5 estrellas vacías son #71717A, no T.border (#3F3F46)', () => {
    const html = renderCard(true, BIZ_SIN_RESENAS);
    expect(html).toContain('color:#71717A');
    expect(html).not.toContain('color:#3F3F46');
  });

  it('en oscuro el separador «·» junto a favoritos es #71717A', () => {
    const html = renderCard(true, BIZ_CON_RESENAS);
    expect(html).toContain('·');
    expect(html).toContain('color:#71717A');
    expect(html).not.toContain('color:#3F3F46');
  });

  it('en claro se ve exacto como antes (rama : T.border con #E5E7EB)', () => {
    const htmlSin = renderCard(false, BIZ_SIN_RESENAS);
    expect(htmlSin).toContain('color:#E5E7EB');
    expect(htmlSin).not.toContain('color:#71717A');
    const htmlCon = renderCard(false, BIZ_CON_RESENAS);
    expect(htmlCon).toContain('color:#E5E7EB');
  });

  it('fuente: los 4 sitios usan la variante oscura y ninguno queda con T.border como color', () => {
    const src = read('../components/cards/BusinessCard.jsx');
    // 4 sitios en total: 2 dentro de renderRatingRow (usa T.dark, es
    // función aparte sin `dark` en alcance) y 2 en el componente (usa `dark`).
    expect(src.split('"#71717A" : T.border').length - 1).toBe(4);
    expect(src.split('T.dark ? "#71717A" : T.border').length - 1).toBe(2);
    expect(src.split('dark ? "#71717A" : T.border').length - 1).toBe(4);
    expect(src).not.toContain('color: T.border');
    expect(src).not.toContain('color={T.border}');
  });
});

describe('HomeView: icono de búsqueda de los estados vacíos', () => {
  it('los dos estados vacíos usan gris medio en oscuro y T.border en claro', () => {
    const src = read('../views/HomeView.jsx');
    expect(src.split('color={dark ? "#71717A" : T.border}').length - 1).toBe(2);
    expect(src).not.toContain('color={T.border}');
  });
});

describe('AccountView: chevron de las filas del menú', () => {
  it('el chevron usa gris medio en oscuro y T.border en claro', () => {
    const src = read('../components/AccountView.jsx');
    expect(src).toContain('color={dark ? "#71717A" : T.border}');
    expect(src).not.toContain('color={T.border}');
  });
});

describe('ExperienceViewer: separador «•» y fondo de la foto de reseña', () => {
  it('el separador autor · fecha usa gris medio en oscuro', () => {
    const src = read('../components/ExperienceViewer.jsx');
    expect(src).toContain('color: dark ? "#71717A" : T.border');
    expect(src).not.toContain('color: T.border');
  });

  it('el contenedor de la foto de reseña ya no es gris claro fijo en oscuro', () => {
    const src = read('../components/ExperienceViewer.jsx');
    expect(src).toContain('background: dark ? "rgba(255,255,255,0.05)" : "#f5f5f5"');
    expect(src).not.toContain('background: "#f5f5f5"');
  });
});

describe('MenuStyleDesigner: glifo «✕» de «Sin estilo»', () => {
  it('el glifo es oscuro fijo sobre el círculo blanco fijo (visible en ambos modos)', () => {
    const src = read('../components/store/MenuStyleDesigner.jsx');
    expect(src).toContain("color: '#18181B' }}>✕</span>");
    expect(src).not.toContain('color: t.text }}>✕</span>');
  });

  it('el resto del diseñador sigue igual (el diseñador de menú es claro por diseño)', () => {
    const src = read('../components/store/MenuStyleDesigner.jsx');
    expect(src).toContain("background: '#FFFFFF'");
    expect(src).toContain('Sin estilo');
  });
});

describe('barrido: ningún archivo del lote deja T.border como color de texto', () => {
  it('en todos los archivos asignados no queda `color: T.border` ni `color={T.border}`', () => {
    const files = [
      '../views/HomeView.jsx', '../views/GlobalHomeView.jsx', '../views/EventsView.jsx',
      '../views/MapView.jsx', '../views/FavsView.jsx', '../views/NotFoundView.jsx',
      '../views/ItineraryDetail.jsx', '../components/AccountView.jsx',
      '../components/BusinessLanding.jsx', '../components/UserNotifs.jsx',
      '../components/ExperienceViewer.jsx', '../components/ToursView.jsx',
      '../components/TripsView.jsx', '../components/cards/BusinessCard.jsx',
      '../components/cards/CompactCard.jsx', '../components/cards/FeaturedCard.jsx',
      '../components/cards/DestacadoCard.jsx', '../components/map/MapPicker.jsx',
      '../components/map/MapCompass.jsx', '../components/GMap.jsx',
      '../components/CountryPickerDropdown.jsx', '../components/ui/CouponCard.jsx',
      '../components/ui/SectionCategoryBar.jsx', '../components/ui/SlidingCategoryTrack.jsx',
      '../components/EstadoVacio.jsx', '../components/CityEmptyState.jsx',
      '../components/MercadoLibreShowcase.jsx', '../components/OfflineScreen.jsx',
      '../components/LoadFailureView.jsx', '../components/store/MenuStyleDesigner.jsx',
    ];
    for (const f of files) {
      const src = read(f);
      expect(src, f).not.toContain('color: T.border');
      expect(src, f).not.toContain('color={T.border}');
    }
  });
});
