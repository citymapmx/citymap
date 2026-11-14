import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// Auditoría de modo oscuro (12 nov 2026, capturas de Jonathan): en modo
// oscuro varios textos, iconos y logos no se veían. Causas raíz verificadas
// en el código: (1) la píldora seleccionada de categorías del mapa era una
// píldora BLANCA (indicador de SlidingCategoryTrack) con texto BLANCO;
// (2) el logo del pie del menú se forzaba a negro con brightness(0) sin
// invertir en oscuro; (3) los iconos del método de entrega son imágenes
// con fondo claro/oscuro que se pierden sobre el botón oscuro.

const darkMode = vi.hoisted(() => ({ value: true }));

vi.mock('../hooks/useCart.js', () => ({
  useCart: () => ({
    items: [{ id: 'it-1', product: { id: 'p-1', name: 'Tostada de atún', price: 45 }, quantity: 2 }],
    isOpen: true,
    setIsOpen: vi.fn(),
    removeItem: vi.fn(),
    updateQuantity: vi.fn(),
    updateNotes: vi.fn(),
    getCartTotal: () => 90,
    clearCart: vi.fn(),
  }),
}));
vi.mock('../store/useUIStore.js', () => ({
  useUIStore: (sel) => {
    const s = { dark: darkMode.value };
    return typeof sel === 'function' ? sel(s) : s;
  },
}));
vi.mock('../lib/supabase.js', () => ({ sb: { get: vi.fn() } }));

import CartDrawer from '../components/store/CartDrawer.jsx';

const T = {
  text: '#F4F4F5', sub: '#A1A1AA', bg: '#18181B', white: '#232326',
  border: '#3F3F46', green: '#F4F4F5', dark: true,
};
const BIZ = { id: 'biz-1', name: 'El Tentempié', whatsapp: '3112000000' };

function renderCart() {
  return renderToStaticMarkup(<CartDrawer business={BIZ} T={T} />);
}

describe('modo oscuro: contraste en todo el sitio', () => {
  it('categorías del mapa: la píldora seleccionada lleva texto oscuro sobre la píldora blanca en modo oscuro (no blanco sobre blanco)', () => {
    const src = read('../views/MapView.jsx');
    // Mismo patrón que TripsView/BusinessStore/HomeView (píldora blanca +
    // texto oscuro en oscuro; píldora oscura + texto blanco en claro).
    expect(src).toContain('background: isSel ? (dark ? "#FFFFFF" : "#0F172A") : "transparent"');
    expect(src).toContain('color: isSel ? (dark ? "#18181B" : "#FFFFFF")');
    expect(src).not.toContain('color: isSel ? "#FFFFFF"');
  });

  it('logo del pie del menú: se invierte a blanco en modo oscuro, como todos los demás logos (MapView, Footer, SideMenu); con estilo, según la última parada del degradado', () => {
    const src = read('../components/store/BusinessStore.jsx');
    expect(src).toContain('dark ? "brightness(0) invert(1)" : "brightness(0)"');
    expect(src).toContain("textOnMenuSurface(menuTheme.lastColor) === '#FFFFFF'");
    expect(src).not.toContain('filter: "brightness(0)"');
  });

  it('método de entrega: los iconos de Recoger y Domicilio van sobre una pastilla blanca, visibles en modo oscuro y claro', () => {
    darkMode.value = true;
    const htmlDark = renderCart();
    for (const img of ['/pedido.png', '/scooter-reparto.png']) {
      expect(htmlDark).toContain(`src="${img}"`);
      // La pastilla blanca envuelve directamente a cada imagen.
      expect(htmlDark).toMatch(new RegExp(`<span[^>]*background:#FFFFFF[^>]*><img[^>]*src="${img.replace('/', '\\/')}"`));
    }
    darkMode.value = false;
    const htmlLight = renderCart();
    for (const img of ['/pedido.png', '/scooter-reparto.png']) {
      expect(htmlLight).toMatch(new RegExp(`<span[^>]*background:#FFFFFF[^>]*><img[^>]*src="${img.replace('/', '\\/')}"`));
    }
    darkMode.value = true;
  });

  it('selector de fecha de filtros de eventos: el input nativo sigue el colorScheme del tema (el icono del calendario no queda oscuro sobre oscuro)', () => {
    const src = read('../views/EventsView.jsx');
    expect(src).toContain('colorScheme: dark ? "dark" : "light"');
  });

  it('selector de ciudad: el icono de búsqueda usa un gris claro en modo oscuro', () => {
    const src = read('../components/CountryPickerDropdown.jsx');
    expect(src).toContain('color={dark ? "#A1A1AA" : "#64748b"}');
  });

  it('control de cantidad del menú: los iconos −/+ son blancos en modo oscuro (antes iban en #3F3F46 fijo, invisibles sobre el círculo oscuro)', () => {
    const src = read('../components/store/BusinessStore.jsx');
    expect(src).toContain('<Icon name="minus" size={16} color={dark ? "#FAFAFA" : "#3F3F46"} />');
    expect(src).toContain('<Icon name="plus" size={16} color={dark ? "#FAFAFA" : "#3F3F46"} />');
    expect(src).not.toContain('color="#3F3F46"');
  });

  it('control de cantidad de «Tu pedido»: el − también es blanco en modo oscuro, como el +', () => {
    const src = read('../components/store/CartDrawer.jsx');
    expect(src).toContain('name="minus" size={16} color={dark ? \'#FAFAFA\' : \'#18181B\'}');
  });

  it('método de entrega no seleccionado: el icono solo se pone en gris (sin opacity 40%, que lo apagaba) y su texto sube a #D4D4D8 en oscuro', () => {
    const src = read('../components/store/CartDrawer.jsx');
    expect(src).not.toContain('opacity(40%)');
    expect(src).toContain("filter: orderType === 'pickup' ? 'none' : 'grayscale(100%)'");
    expect(src).toContain("filter: orderType === 'delivery' ? 'none' : 'grayscale(100%)'");
    const count = src.split("(dark ? '#D4D4D8' : '#71717A')").length - 1;
    expect(count).toBe(2);
  });

  it('modal «¿Cómo nos visitas hoy?» de la ficha: el logo LLENA el círculo BLANCO (cover + zoom), como en el perfil', () => {
    // 13 nov 2026 (Jonathan, con captura): el logo se veía chico en
    // el modal de la ficha — era el único que seguía en contain +
    // padding 8 (la #306 solo arregló el del menú): el emblema
    // quedaba al ~62% y se veían los textos diagonales de Carrito
    // (+52 311 300 76 20, @carrito.la.paz) y las esquinas negras de
    // KAVA. Ahora va en cover sin padding y con zoom 1.12, verificado
    // con los logos reales: el emblema llega al borde sin recortar el
    // texto; un zoom mayor (1.25+) sí recorta «TOSTADAS DE ATÚN» y
    // las letras de «KAVA». El círculo sigue siendo blanco.
    const src = read('../views/DetailView.jsx');
    const block = src.slice(src.indexOf('¿Cómo nos visitas hoy?') - 2600, src.indexOf('¿Cómo nos visitas hoy?') + 200);
    expect(block).toContain("background: '#FFFFFF'");
    expect(block).not.toContain('padding: 8');
    // La imagen del logo (la del src, no el icono de respaldo
    // /pedido.png que sigue en contain) va en cover y con zoom.
    const logoAt = block.indexOf('selected.logo_url || selected.logo');
    expect(logoAt).toBeGreaterThan(-1);
    expect(block.slice(logoAt, logoAt + 800)).toContain("objectFit: 'cover'");
    expect(block.slice(logoAt, logoAt + 800)).toContain('scale(1.12)');
  });

  it('el menú ya NO tiene modal «¿Cómo nos visitas hoy?» que lo tape (hallazgo #2): el logo en círculo BLANCO con cover y zoom vive en la pantalla de carga única', () => {
    // Nov 2026 (hallazgo #2): el modal bloqueante se eliminó; el menú
    // se muestra con el modo por defecto y se cambia desde la píldora.
    // Los logos cuadrados con esquinas oscuras (p. ej. KAVA: cuadrado
    // negro con el emblema circular oliva en el centro, verificado en
    // la base) se veían mal con contain: el cuadrado entero cabía
    // dentro del círculo blanco y las esquinas negras quedaban a la
    // vista. Con cover el logo llena el círculo y el recorte circular
    // quita las esquinas. Ese círculo con cover vive ahora en la
    // pantalla de carga única (MenuLoadingScreen) y en el encabezado.
    // Nov 2026 (#306, verificado con los dos logos reales): el cover
    // solo no bastaba — sin padding el emblema llega al 86% del
    // círculo y el zoom 1.12 lo lleva al borde, recortando los textos
    // diagonales de Carrito y las esquinas negras de KAVA.
    const store = read('../components/store/BusinessStore.jsx');
    expect(store).not.toContain('¿Cómo nos visitas hoy?');
    const screen = read('../components/store/MenuLoadingScreen.jsx');
    expect(screen).toContain("background: '#FFFFFF'");
    // Logo 200×200 con prioridad (hallazgo #7): URL original +
    // widthRequest/heightRequest en OptimizedImage, en vez del
    // getThumbUrl precalculado sin prioridad.
    const logoAt = screen.indexOf('src={business.logo_url || business.logo}');
    expect(logoAt).toBeGreaterThan(-1);
    expect(screen.slice(logoAt, logoAt + 300)).toContain('widthRequest={200}');
    expect(screen.slice(logoAt, logoAt + 300)).toContain('priority');
    expect(screen.slice(logoAt, logoAt + 300)).toContain("objectFit: 'cover'");
    expect(screen.slice(logoAt, logoAt + 300)).toContain('scale(1.12)');
    // El encabezado del menú sigue en cover (no tenía el problema).
    const header = store.slice(store.indexOf('Profile Logo Circular Superpuesto'), store.indexOf('Profile Logo Circular Superpuesto') + 2000);
    expect(header).toContain("objectFit: 'cover'");
  });

  it('ficha del negocio: las 5 estrellas vacías son gris medio en modo oscuro (no T.border, casi negro sobre negro)', () => {
    const src = read('../views/DetailView.jsx');
    expect(src).toContain('color={isElite ? "rgba(255,255,255,0.2)" : (dark ? "#71717A" : T.border)}');
  });

  it('aviso legal del pie del menú: gris claro en modo oscuro (estaba invertido: gris oscuro en oscuro) y sin opacity que lo apagara; con estilo, usa el texto del tema atenuado', () => {
    const src = read('../components/store/BusinessStore.jsx');
    const at = src.indexOf('Aviso legal');
    const block = src.slice(at - 400, at + 100);
    expect(block).toContain("menuTheme ? menuHexAlpha(menuTheme.text, 'B3')");
    expect(block).toContain("dark ? '#A1A1AA' : '#71717A'");
    expect(block).not.toContain('opacity: 0.8');
  });

  it('navegación inferior: iconos y texto inactivos suben a #D4D4D8 en modo oscuro', () => {
    const src = read('../components/BottomNav.jsx');
    const count = src.split('dark ? "#D4D4D8"').length - 1;
    expect(count).toBe(2);
  });

  it('método de entrega no seleccionado (render): el icono apagado es solo gris, sin opacity(40%)', () => {
    darkMode.value = true;
    const html = renderCart();
    expect(html).toContain('grayscale(100%)');
    expect(html).not.toContain('opacity(40%)');
  });
});
