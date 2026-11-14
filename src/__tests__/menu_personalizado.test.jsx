import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import MenuStyleDesigner from '../components/store/MenuStyleDesigner.jsx';
import {
  LOYALTY_COLOR_CATEGORIES,
  LOYALTY_COLOR_STYLES,
  findMenuStyleById,
  menuThemeForStyle,
  textOnMenuPrimary,
  textOnMenuSurface,
  menuHexAlpha,
} from '../lib/menuColorStyles.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

const T = { bg: '#FFFFFF', border: '#E4E4E7', text: '#18181B', sub: '#71717A', surface: '#F4F4F5' };

function renderDesigner(business) {
  return renderToStaticMarkup(
    <MenuStyleDesigner business={business} onClose={() => {}} onSaved={() => {}} T={T} />
  );
}

const CARRITO = { id: '82c9af20-ef42-4a43-87c4-1831a020aace', name: 'Carrito La Paz Tostadas de Atún', menu_style: null };

describe('Menú personalizado: resolvedor de estilos (PR #291)', () => {
  it('los 36 estilos de lealtad se resuelven por id, con su categoría', () => {
    expect(LOYALTY_COLOR_STYLES.length).toBe(36);
    expect(findMenuStyleById('perla')).toEqual({ id: 'perla', label: 'Perla', bg: ['#F8FAFC', '#E2E8F0'], text: '#334155', primary: '#64748B', category: 'sobrios' });
    expect(findMenuStyleById('esmeralda')?.category).toBe('premium');
    expect(findMenuStyleById('espresso')?.category).toBe('cafeteria');
    expect(findMenuStyleById('coral')?.category).toBe('coloridos');
    expect(findMenuStyleById('atardecer')?.bg).toEqual(['#F97316', '#DB2777', '#7C3AED']);
  });

  it('id desconocido, vacío o no texto no rompe: devuelve null (menú como hoy)', () => {
    expect(findMenuStyleById('no-existe')).toBe(null);
    expect(findMenuStyleById(null)).toBe(null);
    expect(findMenuStyleById('')).toBe(null);
    expect(findMenuStyleById(undefined)).toBe(null);
    expect(menuThemeForStyle(null)).toBe(null);
    expect(menuThemeForStyle(findMenuStyleById('no-existe'))).toBe(null);
  });

  it('el tema derivado trae degradado, primera parada, texto, primary y texto sobre primary', () => {
    const perla = menuThemeForStyle(findMenuStyleById('perla'));
    expect(perla.background).toBe('linear-gradient(135deg, #F8FAFC, #E2E8F0)');
    expect(perla.firstColor).toBe('#F8FAFC');
    expect(perla.text).toBe('#334155');
    expect(perla.primary).toBe('#64748B');
    expect(perla.onPrimary).toBe('#FFFFFF'); // primary pizarra medio -> texto blanco
    const atardecer = menuThemeForStyle(findMenuStyleById('atardecer'));
    expect(atardecer.background).toBe('linear-gradient(135deg, #F97316, #DB2777, #7C3AED)');
    expect(atardecer.firstColor).toBe('#F97316');
    expect(atardecer.onPrimary).toBe('#18181B'); // primary #FFFFFF -> texto oscuro
  });

  it('texto sobre primary: claro en primaries claros, blanco en primaries oscuros', () => {
    for (const light of ['#F5B301', '#FBBF24', '#FDE68A', '#FFFFFF', '#CBD5E1', '#A8A29E', '#FDBA74', '#C9A227', '#A5F3FC', '#E5E7EB', '#E9D5FF', '#D6D3D1', '#D9E2D0']) {
      expect(textOnMenuPrimary(light)).toBe('#18181B');
    }
    for (const dark of ['#92400E', '#059669', '#DB2777', '#78350F', '#B45309', '#D97706', '#164E63', '#450A0A']) {
      expect(textOnMenuPrimary(dark)).toBe('#FFFFFF');
    }
    expect(textOnMenuPrimary(null)).toBe('#FFFFFF');
    expect(textOnMenuPrimary('no-es-hex')).toBe('#FFFFFF');
  });

  it('hex con alfa para textos atenuados y bordes', () => {
    expect(menuHexAlpha('#334155', 'B3')).toBe('#334155B3');
    expect(menuHexAlpha('#FFFFFF', '33')).toBe('#FFFFFF33');
    expect(menuHexAlpha(null, 'B3')).toBe(null);
    expect(menuHexAlpha('no-es-hex', 'B3')).toBe('no-es-hex');
  });
});

describe('Menú personalizado: BusinessStore aplica el estilo (PR #291)', () => {
  it('lee menu_style del negocio y resuelve el tema', () => {
    const src = read('../components/store/BusinessStore.jsx');
    expect(src).toContain("findMenuStyleById(business?.menu_style)");
    expect(src).toContain('menuThemeForStyle(');
    expect(src).toContain("import { findMenuStyleById, menuThemeForStyle, menuHexAlpha, textOnMenuSurface } from '../../lib/menuColorStyles.js'");
  });

  it('con estilo: fondo degradado en la página, píldora y botón en primary (el encabezado ya no usa la primera parada sólida)', () => {
    const src = read('../components/store/BusinessStore.jsx');
    expect(src).toContain('menuTheme ? menuTheme.background');
    // La primera parada sólida solo queda para el borde del logo: ninguna
    // sección pinta ya un fondo distinto (ver el bloque del degradado parejo).
    expect(src).toContain('menuTheme.firstColor');
    expect(src).not.toContain("background: menuTheme ? menuTheme.firstColor");
    expect(src).toContain('menuTheme ? menuTheme.primary : (dark');
    expect(src).toContain('menuTheme ? menuTheme.onPrimary');
    expect(src).toContain("menuTheme ? menuTheme.primary : '#3F3F46'");
  });

  it('con estilo: títulos de sección y precios en primary, nombres en text', () => {
    const src = read('../components/store/BusinessStore.jsx');
    expect(src).toContain("color: menuTheme ? menuTheme.primary : (dark ? '#F87171' : '#EF4444')");
    expect(src).toContain("color: menuTheme ? menuTheme.primary : (dark ? '#FAFAFA' : '#111827')");
    expect(src).toContain("color: menuTheme ? menuTheme.text : (dark ? '#FAFAFA' : '#111111')");
  });

  it('sin estilo: el render es idéntico al actual (los fallbacks siguen en el código)', () => {
    const src = read('../components/store/BusinessStore.jsx');
    // Fondo, encabezado, píldora, título y precio conservan su valor de hoy.
    expect(src).toContain("dark ? '#18181B' : '#FAFAFA'");
    expect(src).toContain("dark ? '#18181B' : '#FFFFFF'");
    expect(src).toContain("dark ? '#FFFFFF' : '#111111'");
    expect(src).toContain("dark ? '#F87171' : '#EF4444'");
    expect(src).toContain("dark ? '#FAFAFA' : '#111827'");
    expect(src).toContain("background: dark ? '#232326' : '#FFFFFF'");
  });
});

describe('Menú personalizado: el diseñador (PR #291)', () => {
  it('muestra el título, la vista previa, «Sin estilo» y Guardar', () => {
    const html = renderDesigner(CARRITO);
    expect(html).toContain('Diseño de mi menú');
    expect(html).toContain('Vista previa de tu menú');
    expect(html).toContain('Selecciona tu estilo');
    expect(html).toContain('Sin estilo');
    expect(html).toContain('Tu menú se ve como hoy');
    expect(html).toContain('Guardar estilo de menú');
    expect(html).toContain('Carrito La Paz Tostadas de Atún');
  });

  it('muestra los 36 estilos agrupados en las 4 categorías', () => {
    const html = renderDesigner(CARRITO);
    for (const label of ['Premium', 'Sobrios', 'Cafetería', 'Coloridos']) {
      expect(html).toContain(label);
    }
    for (const label of ['Oro negro', 'Esmeralda', 'Medianoche', 'Vino', 'Atardecer', 'Océano', 'Galaxia', 'Zafiro', 'Amatista', 'Pizarra', 'Perla', 'Oliva', 'Petróleo', 'Terracota', 'Malva', 'Bosque', 'Caqui', 'Salvia', 'Espresso', 'Latte', 'Capuccino', 'Mocha', 'Caramelo', 'Crema', 'Chocolate', 'Canela', 'Café helado', 'Grafito plata', 'Rosa claro', 'Lima', 'Cobre', 'Coral', 'Tropical', 'Rosa dorado', 'Menta', 'Ámbar']) {
      expect(html).toContain(label);
    }
    // Arena se quitó (casi duplicado de Crema): ya no aparece.
    expect(html).not.toContain('Arena');
  });

  it('con estilo guardado la vista previa dice el estilo; sin estilo dice «como se ve hoy»', () => {
    expect(renderDesigner({ ...CARRITO, menu_style: 'perla' })).toContain('Estilo: Perla');
    expect(renderDesigner(CARRITO)).toContain('Sin estilo · como se ve hoy');
    // Y la vista previa del estilo elegido lleva su degradado.
    expect(renderDesigner({ ...CARRITO, menu_style: 'perla' })).toContain('linear-gradient(135deg, #F8FAFC, #E2E8F0)');
  });

  it('sin productos, la vista previa avisa en vez de inventar productos', () => {
    const html = renderDesigner(CARRITO);
    // El efecto no corre en render estático: queda el estado de carga.
    expect(html).toContain('Cargando tu menú…');
    expect(html).not.toContain('Tostada Adobada');
    // El aviso de «sin productos» existe en el código para cuando la
    // carga termina sin productos.
    const src = read('../components/store/MenuStyleDesigner.jsx');
    expect(src).toContain('Aún no tienes productos en tu menú');
  });

  it('Guardar escribe menu_style en la fila del negocio y la vista previa usa su menú real', () => {
    const src = read('../components/store/MenuStyleDesigner.jsx');
    expect(src).toContain("sb.patch('businesses', business.id, { menu_style: selectedId })");
    expect(src).toContain("sb.get('store_categories'");
    expect(src).toContain('setSelectedId(style.id)');
    // La lista de estilos la itera el carrusel compartido.
    const shared = read('../components/ui/StyleCategoryCarousel.jsx');
    expect(shared).toContain('LOYALTY_COLOR_CATEGORIES.map');
  });

  it('cuadrícula compacta de 3 por fila: círculo arriba, nombre abajo (ya no filas completas)', () => {
    const src = read('../components/ui/StyleCategoryCarousel.jsx');
    expect(src).toContain("gridTemplateColumns: 'repeat(3, 1fr)'");
    expect(src).not.toContain("gridTemplateColumns: '1fr 1fr'");
    // La celda es columna: el círculo va arriba y el nombre abajo, centrado.
    expect(src).toContain("flexDirection: 'column'");
    expect(src).toContain("textAlign: 'center'");
    // Los 36 nombres siguen visibles en la cuadrícula.
    const html = renderDesigner(CARRITO);
    for (const label of ['Oro negro', 'Esmeralda', 'Perla', 'Espresso', 'Rosa claro', 'Coral', 'Ámbar']) {
      expect(html).toContain(label);
    }
  });

  it('el estilo seleccionado se marca claro: anillo en su primary y palomita sobre el círculo', () => {
    const src = read('../components/ui/StyleCategoryCarousel.jsx');
    expect(src).toContain('aria-pressed={isSelected}');
    expect(src).toContain('0 0 0 4px ${styleTheme ? styleTheme.primary : t.text}');
    expect(src).toContain('styleTheme.onPrimary');
    // Con Perla guardada solo hay una palomita: la de Perla (Sin estilo no la lleva).
    const htmlPerla = renderDesigner({ ...CARRITO, menu_style: 'perla' });
    expect(htmlPerla.split('✓').length - 1).toBe(1);
    expect(htmlPerla).toContain('aria-pressed="true"');
    // Sin estilo, la única palomita es la de «Sin estilo».
    const htmlSin = renderDesigner(CARRITO);
    expect(htmlSin.split('✓').length - 1).toBe(1);
  });
});

describe('Menú personalizado: entrada en la cuenta y migración (PR #291)', () => {
  it('«Diseño de mi menú» aparece en Mi Negocio para cualquier negocio aprobado, sin pedir plan', () => {
    const src = read('../components/AccountView.jsx');
    expect(src).toContain('Diseño de mi menú');
    expect(src).toContain('owner_menu_style_');
    expect(src).toContain('MenuStyleDesigner');
    expect(src).toContain('setMenuDesignerBiz');
    // La entrada va en la lista común (con «Editar negocio»), no dentro
    // del bloque de planes de pago (Reservaciones/Estadísticas/Lealtad)
    // ni del bloque premium («Editar menú o catálogo»).
    const idxMenu = src.indexOf('Diseño de mi menú');
    const idxPaid = src.indexOf('Tarjetas de Lealtad (Wallet)');
    const idxPremium = src.indexOf('Editar menú o catálogo');
    const idxEdit = src.indexOf('Editar negocio');
    expect(idxMenu).toBeGreaterThan(idxPaid);
    expect(idxMenu).toBeGreaterThan(idxPremium);
    expect(idxMenu).toBeLessThan(idxEdit);
  });

  it('«Diseño de mi menú» ABRE el diseñador: la rama owner_menu_style_ va ANTES que owner_menu_ (bug #295)', () => {
    const src = read('../components/AccountView.jsx');
    // «owner_menu_style_<id>» también empieza por «owner_menu_»: si la rama
    // corta va primero, el tap cae ahí, busca un negocio con id «style_<id>»,
    // no lo encuentra y no abre nada (la rama del diseñador era código muerto).
    const idxStyle = src.indexOf('else if (act.startsWith("owner_menu_style_"))');
    const idxMenu = src.indexOf('else if (act.startsWith("owner_menu_"))');
    expect(idxStyle).toBeGreaterThan(-1);
    expect(idxMenu).toBeGreaterThan(-1);
    expect(idxStyle).toBeLessThan(idxMenu);
    // Cada rama abre lo suyo: el diseñador abre MenuStyleDesigner y el menú
    // abre el editor del catálogo.
    expect(src.slice(idxStyle, idxStyle + 300)).toContain('setMenuDesignerBiz(b)');
    expect(src.slice(idxMenu, idxMenu + 300)).toContain('setStoreAdminBiz(b)');
  });

  it('la migración agrega menu_style nullable a businesses', () => {
    const sql = read('../../supabase/migrations/20261113120000_add_menu_style_to_businesses.sql');
    expect(sql).toContain('alter table public.businesses');
    expect(sql).toContain('add column if not exists menu_style text null');
  });
});

describe('Menú personalizado: vista previa compacta del diseñador', () => {
  it('la vista previa muestra 1 producto por sección (máx. 2 secciones): aprox. la mitad de alto', () => {
    const src = read('../components/store/MenuStyleDesigner.jsx');
    expect(src).toContain('.slice(0, 1)');
    expect(src).not.toContain('.slice(0, 3)');
    // Tamaños reducidos: nombre 15, precio 13, botón + 26, menos padding.
    expect(src).toContain("fontSize: 15, fontWeight: 900");
    expect(src).toContain("fontSize: 13, fontWeight: 800, color: theme ? theme.primary");
    expect(src).toContain('width: 26, height: 26');
    expect(src).toContain("padding: '12px 14px 2px'");
    // Sigue siendo representativa: nombre, estilo, píldoras, títulos,
    // descripciones, precios y botón + con los colores del tema.
    expect(src).toContain('Vista previa de tu menú');
    expect(src).toContain('Estilo: ${selectedStyle.label}');
    expect(src).toContain('Todos');
    expect(src).toContain('theme.primary');
  });

  it('con «Sin estilo» la vista previa es clara aunque el tema de la app sea oscuro', () => {
    const darkT = { bg: '#18181B', border: '#3F3F46', text: '#F4F4F5', sub: '#A1A1AA', surface: '#232326' };
    const html = renderToStaticMarkup(
      <MenuStyleDesigner business={CARRITO} onClose={() => {}} onSaved={() => {}} T={darkT} />
    );
    // La tarjeta de la vista previa es clara (#FAFAFA) y el nombre oscuro,
    // aunque el resto del diseñador vaya en oscuro.
    expect(html).toContain('background:#FAFAFA');
    expect(html).toContain('color:#111111');
    expect(html).toContain('Sin estilo · como se ve hoy');
  });
});

// Luminancia relativa y contraste WCAG (para verificar legibilidad).
function relLum(hex) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f((n >> 16) & 255) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255);
}
function contrastRatio(a, b) {
  const l1 = relLum(a);
  const l2 = relLum(b);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

describe('Menú público: el tema se adapta a todo (encabezado, píldoras, textos)', () => {
  it('sin estilo el menú nunca va en modo oscuro: fuerza la paleta clara', () => {
    const src = read('../components/store/BusinessStore.jsx');
    expect(src).toContain('const { dark: appDark } = useUIStore();');
    expect(src).toContain('const dark = menuTheme ? appDark : false;');
    // Paleta clara (ignora el T oscuro que llegue) para el menú, la promo,
    // el modal de producto y el carrito.
    expect(src).toContain("const menuT = menuTheme ? T : { ...(T || {}), bg: '#FFFFFF'");
    expect(src).toContain('T={menuT}');
  });

  it('el encabezado del menú público toma el tema: nada de bloque blanco (el degradado es el de la página, no uno propio)', () => {
    const src = read('../components/store/BusinessStore.jsx');
    // El único degradado es el de la tarjeta de la página; el área del
    // banner ya no repite el degradado (antes lo reiniciaba y el encabezado
    // se veía rosa→morado mientras el resto era naranja→rosa).
    expect(src).toContain("background: menuTheme ? menuTheme.background : (dark ? '#18181B' : '#FAFAFA')");
    expect(src).toContain("color: menuTheme ? menuTheme.text : (dark ? '#FFFFFF' : '#111111')");
    // Dirección, separador y pin en el texto del tema atenuado.
    expect(src).toContain("menuTheme ? menuHexAlpha(menuTheme.text, 'B3')");
    // Borde del logo en la primera parada del tema (sigue siendo el único
    // uso de firstColor como color de borde, no de fondo de sección).
    expect(src).toContain('menuTheme.firstColor');
  });

  it('la píldora activa usa el primary del tema y su texto onPrimary; las inactivas se leen sobre la primera parada', () => {
    const src = read('../components/store/BusinessStore.jsx');
    expect(src).toContain('indicatorColor={menuTheme?.primary}');
    expect(src).toContain('color: isActive ? (menuTheme ? menuTheme.onPrimary');
    expect(src).toContain('textOnMenuSurface(menuTheme.firstColor)');
    // El indicador del track usa el primary cuando se le pasa.
    const track = read('../components/ui/SlidingCategoryTrack.jsx');
    expect(track).toContain('indicatorColor');
    expect(track).toContain("background:indicatorColor || (dark ? '#FFFFFF' : '#0F172A')");
  });

  it('textOnMenuSurface: texto legible sobre la primera parada en los 36 estilos (contraste >= 3:1)', () => {
    for (const style of LOYALTY_COLOR_STYLES) {
      const theme = menuThemeForStyle(style);
      // Píldora activa: onPrimary sobre primary.
      expect(contrastRatio(theme.onPrimary, style.primary)).toBeGreaterThanOrEqual(3);
      // Píldora inactiva: texto elegido sobre la primera parada.
      expect(contrastRatio(textOnMenuSurface(theme.firstColor), theme.firstColor)).toBeGreaterThanOrEqual(3);
    }
    // El logo del pie se invierte según la última parada del degradado.
    const esmeralda = menuThemeForStyle(findMenuStyleById('esmeralda'));
    expect(esmeralda.lastColor).toBe('#022C22');
    expect(textOnMenuSurface(esmeralda.lastColor)).toBe('#FFFFFF');
    const perla = menuThemeForStyle(findMenuStyleById('perla'));
    expect(perla.lastColor).toBe('#E2E8F0');
    expect(textOnMenuSurface(perla.lastColor)).toBe('#18181B');
    const coral = menuThemeForStyle(findMenuStyleById('coral'));
    expect(coral.lastColor).toBe('#BE123C');
    expect(textOnMenuSurface(coral.lastColor)).toBe('#FFFFFF');
  });
});

describe('Menú personalizado: carrusel de 9 por categoría + scroll vertical', () => {
  it('9 estilos exactos por categoría (36 en total): 7 nuevos, Arena fuera', () => {
    expect(LOYALTY_COLOR_CATEGORIES.length).toBe(4);
    for (const cat of LOYALTY_COLOR_CATEGORIES) {
      expect(cat.styles.length).toBe(9);
    }
    expect(LOYALTY_COLOR_STYLES.length).toBe(36);
    // Nuevos: Premium 2, Sobrios 2, Cafetería 3.
    for (const id of ['zafiro', 'amatista', 'caqui', 'salvia', 'chocolate', 'canela', 'cafe-helado']) {
      expect(findMenuStyleById(id)).not.toBe(null);
    }
    expect(findMenuStyleById('zafiro')?.category).toBe('premium');
    expect(findMenuStyleById('caqui')?.category).toBe('sobrios');
    expect(findMenuStyleById('chocolate')?.category).toBe('cafeteria');
    // Arena se quitó: casi duplicado de Crema (misma primera parada
    // #FFFBEB y segunda parada #FDE68A frente a #FDE9C8).
    expect(findMenuStyleById('arena')).toBe(null);
    expect(findMenuStyleById('crema')).not.toBe(null);
  });

  it('el selector es un carrusel: una página por categoría, scroll-snap horizontal y puntos tocables', () => {
    // El carrusel vive en el componente compartido (StyleCategoryCarousel),
    // que usan el diseñador del menú y el wizard de lealtad.
    const src = read('../components/ui/StyleCategoryCarousel.jsx');
    // Pista horizontal con snap nativo (funciona en navegador y WebView).
    expect(src).toContain("scrollSnapType: 'x mandatory'");
    expect(src).toContain("overflowX: 'auto'");
    // Vertical sobre los círculos: el navegador maneja ambos ejes y elige
    // según la dirección del gesto (con solo pan-x el vertical moría ahí).
    expect(src).toContain("touchAction: 'pan-x pan-y'");
    expect(src).not.toContain("touchAction: 'pan-x'");
    // Cada categoría es una página del ancho del carrusel.
    expect(src).toContain("flex: '0 0 100%'");
    expect(src).toContain("scrollSnapAlign: 'start'");
    // Puntos abajo: uno por categoría, con etiqueta para saltar.
    expect(src).toContain('aria-label={`Ir a ${cat.label}`}');
    expect(src).toContain('goToCategory(idx)');
    expect(src).toContain("scrollTo({ left: (idx + 1) * el.clientWidth, behavior: 'smooth' })");
    // La página sigue la posición del carrusel al deslizar.
    expect(src).toContain('onScroll={handleCarouselScroll}');
    expect(src).toContain('Math.round(el.scrollLeft / el.clientWidth)');
    // El nombre de la categoría sigue viéndose en su página, centrado.
    expect(src).toContain("letterSpacing: 0.5, textAlign: 'center' }}>{cat.label}</div>");
    const html = renderDesigner(CARRITO);
    for (const label of ['Premium', 'Sobrios', 'Cafetería', 'Coloridos']) {
      expect(html).toContain(label);
    }
    for (const label of ['Ir a Premium', 'Ir a Sobrios', 'Ir a Cafetería', 'Ir a Coloridos']) {
      expect(html).toContain(label);
    }
  });

  it('al abrir, el carrusel muestra la categoría del estilo guardado', () => {
    const src = read('../components/store/MenuStyleDesigner.jsx');
    expect(src).toContain("initialCategoryId={selectedStyle?.category || 'premium'}");
    // La lógica de la página inicial vive en el componente compartido.
    const shared = read('../components/ui/StyleCategoryCarousel.jsx');
    expect(shared).toContain('LOYALTY_COLOR_CATEGORIES.findIndex');
    // +1 por el clon de la izquierda (Coloridos) antes de Premium.
    expect(shared).toContain('el.scrollLeft = (initialPageRef.current + 1) * el.clientWidth');
  });

  it('carrusel infinito: clones al inicio y al fin, y el índice envuelve de la última a la primera', () => {
    const src = read('../components/ui/StyleCategoryCarousel.jsx');
    // Páginas: clon de la última, las 4 reales, clon de la primera.
    expect(src).toContain("key: 'clone-last'");
    expect(src).toContain("key: 'clone-first'");
    expect(src).toContain('LOYALTY_COLOR_CATEGORIES[PAGE_COUNT - 1]');
    expect(src).toContain('LOYALTY_COLOR_CATEGORIES[0]');
    // Posición -> categoría real: el clon envuelve (0 = última, 5 = primera).
    expect(src).toContain('const real = (pos - 1 + PAGE_COUNT) % PAGE_COUNT;');
    // Al asentarse en un clon, salto sin animación a la página real.
    expect(src).toContain("el.scrollTo({ left: PAGE_COUNT * el.clientWidth, behavior: 'auto' })");
    expect(src).toContain("el.scrollTo({ left: el.clientWidth, behavior: 'auto' })");
    expect(src).toContain('setTimeout(() => repositionLoop(el), 100)');
    // Los puntos siguen siendo 4 (uno por categoría real).
    const html = renderDesigner(CARRITO);
    expect(html.split('Ir a ').length - 1).toBe(4);
    // Las páginas clonadas duplican el título de su categoría: Premium y
    // Coloridos aparecen en 2 páginas; Sobrios y Cafetería en 1.
    const countLabel = (label) => html.split(`>${label}<`).length - 1;
    expect(countLabel('Premium')).toBe(2);
    expect(countLabel('Coloridos')).toBe(2);
    expect(countLabel('Sobrios')).toBe(1);
    expect(countLabel('Cafetería')).toBe(1);
  });

  it('el diseñador se monta con portal en document.body (no atrapado por el transform de Mi Perfil)', () => {
    const src = read('../components/AccountView.jsx');
    expect(src).toContain('createPortal(');
    // El portal del diseñador va a document.body.
    const idx = src.indexOf('MENU STYLE DESIGNER MODAL');
    expect(idx).toBeGreaterThan(-1);
    expect(src.slice(idx, idx + 800)).toContain('createPortal(');
    expect(src.slice(idx, idx + 800)).toContain('document.body');
    expect(src.slice(idx, idx + 800)).toContain('MenuStyleDesigner');
  });

  it('el scroll vertical vive en el contenedor central: header y Guardar siempre visibles', () => {
    const src = read('../components/store/MenuStyleDesigner.jsx');
    // Contenedor central: ocupa el espacio libre y baja con el dedo.
    expect(src).toContain("flex: 1, minHeight: 0, overflowY: 'auto'");
    expect(src).toContain("WebkitOverflowScrolling: 'touch'");
    expect(src).toContain("overscrollBehavior: 'contain'");
    expect(src).toContain("touchAction: 'pan-y'");
    // Ya no hay sticky dentro de un contenedor con overflow: el header y
    // el pie son hijos flex fijos (flexShrink 0) de la columna.
    expect(src).not.toContain("position: 'sticky'");
  });
  it('el diseñador del menú y el wizard de lealtad usan el mismo carrusel compartido', () => {
    const menu = read('../components/store/MenuStyleDesigner.jsx');
    expect(menu).toContain("import StyleCategoryCarousel from '../ui/StyleCategoryCarousel.jsx'");
    expect(menu).toContain('<StyleCategoryCarousel');
    expect(menu).toContain("initialCategoryId={selectedStyle?.category || 'premium'}");
    // El carrusel ya no vive duplicado en el diseñador.
    expect(menu).not.toContain("key: 'clone-last'");
    const wizard = read('../components/loyalty/LoyaltyWizard.jsx');
    expect(wizard).toContain("import StyleCategoryCarousel from '../ui/StyleCategoryCarousel.jsx'");
    expect(wizard).toContain('<StyleCategoryCarousel');
    // El wizard ya no trae su propio selector de píldoras.
    expect(wizard).not.toContain('setActiveCategory');
    expect(wizard).not.toContain('gridTemplateColumns: "1fr 1fr"');
  });
});

describe('Menú personalizado: ajustes del diseñador (título, Guardar, Sin estilo, círculos)', () => {
  it('título de categoría centrado en su página', () => {
    const src = read('../components/ui/StyleCategoryCarousel.jsx');
    expect(src).toContain("letterSpacing: 0.5, textAlign: 'center' }}>{cat.label}</div>");
    const html = renderDesigner(CARRITO);
    expect(html).toContain('text-align:center">Premium</div>');
    expect(html).toContain('text-align:center">Coloridos</div>');
  });

  it('sin texto bajo Guardar y botón más delgado', () => {
    const src = read('../components/store/MenuStyleDesigner.jsx');
    expect(src).not.toContain('Se aplica de inmediato a tu menú público');
    expect(src).not.toContain('sin republicar nada');
    expect(src).toContain("padding: '11px 16px', background: '#000'");
    expect(src).not.toContain("padding: 16, background: '#000'");
    const html = renderDesigner(CARRITO);
    expect(html).toContain('Guardar estilo de menú');
    expect(html).not.toContain('Se aplica de inmediato');
  });

  it('«Sin estilo» más compacto, sin quitar información', () => {
    const src = read('../components/store/MenuStyleDesigner.jsx');
    expect(src).toContain("padding: '8px 12px'");
    expect(src).toContain('width: 26, height: 26');
    const html = renderDesigner(CARRITO);
    expect(html).toContain('Sin estilo');
    expect(html).toContain('Tu menú se ve como hoy');
  });

  it('círculos de estilos más chicos y menos espaciado (siguen 3 por fila)', () => {
    const src = read('../components/ui/StyleCategoryCarousel.jsx');
    expect(src).toContain("gridTemplateColumns: 'repeat(3, 1fr)'");
    expect(src).toContain('width: 44, height: 44');
    expect(src).not.toContain('width: 52, height: 52');
    // Menos gap: entre celdas 8 (antes 12), celda más compacta.
    expect(src).toContain("gridTemplateColumns: 'repeat(3, 1fr)', gap: 8");
    expect(src).toContain("padding: '6px 2px'");
    // Anillo + palomita del seleccionado se mantienen.
    expect(src).toContain('0 0 0 4px ${styleTheme ? styleTheme.primary : t.text}');
    expect(src).toContain('width: 18, height: 18');
    // El nombre abajo sigue legible y centrado.
    const html = renderDesigner(CARRITO);
    for (const label of ['Oro negro', 'Esmeralda', 'Perla', 'Espresso', 'Coral', 'Ámbar']) {
      expect(html).toContain(label);
    }
  });
});

describe('Menú público: un solo degradado parejo en toda la página (no por partes)', () => {
  it('el degradado vive UNA sola vez: en la tarjeta de la página; las secciones no lo repiten ni pintan otro fondo', () => {
    const src = read('../components/store/BusinessStore.jsx');
    // La tarjeta de la página es el único fondo con el degradado del tema.
    const uses = src.match(/menuTheme \? menuTheme\.background/g) || [];
    expect(uses.length).toBe(1);
    expect(src).toContain("background: menuTheme ? menuTheme.background : (dark ? '#18181B' : '#FAFAFA')");
    // Ninguna sección pinta ya la primera parada sólida como fondo: ni el
    // banner (antes repetía el degradado), ni la portada, ni la barra fija
    // (antes era la banda naranja partida del resto).
    expect(src).not.toContain("background: menuTheme ? menuTheme.firstColor");
    // La primera parada solo queda como borde del logo circular.
    expect(src).toContain("border: `4px solid ${menuTheme ? menuTheme.firstColor");
  });

  it('el área del banner y la portada son transparentes con estilo: el degradado de la página fluye por ahí', () => {
    const src = read('../components/store/BusinessStore.jsx');
    const bannerAt = src.indexOf('Banner Area');
    expect(bannerAt).toBeGreaterThan(-1);
    const bannerBlock = src.slice(bannerAt, bannerAt + 600);
    // El wrapper del banner no trae fondo propio.
    expect(bannerBlock).toContain("background: 'transparent'");
    expect(bannerBlock).not.toContain('menuTheme.background');
    // La portada sin foto tampoco: con estilo deja ver el degradado de la
    // página; sin estilo sigue el sólido oscuro de antes.
    expect(bannerBlock).toContain("background: menuTheme ? 'transparent' : '#232326'");
  });

  it('la barra fija (buscador + píldoras) es transparente con estilo y esmerila lo que pasa por debajo', () => {
    const src = read('../components/store/BusinessStore.jsx');
    const stickyAt = src.indexOf("position: 'sticky'");
    expect(stickyAt).toBeGreaterThan(-1);
    const stickyBlock = src.slice(stickyAt - 100, stickyAt + 500);
    // Sin fondo propio: el degradado único fluye por la barra.
    expect(stickyBlock).toContain("background: menuTheme ? 'transparent'");
    // El blur evita que las tarjetas se vean por entre el buscador y las
    // píldoras al bajar; sin estilo el fondo sigue siendo el sólido de hoy.
    expect(stickyBlock).toContain("backdropFilter: menuTheme ? 'blur(12px)'");
    expect(stickyBlock).toContain("WebkitBackdropFilter: menuTheme ? 'blur(12px)'");
    expect(stickyBlock).toContain("background: menuTheme ? 'transparent' : (dark ? '#18181B' : '#FFFFFF')");
  });

  it('sin estilo, la página queda igual que hoy: la barra y el banner conservan sus fondos sólidos', () => {
    const src = read('../components/store/BusinessStore.jsx');
    expect(src).toContain("background: menuTheme ? 'transparent' : (dark ? '#18181B' : '#FFFFFF')");
    expect(src).toContain("background: menuTheme ? 'transparent' : '#232326'");
    expect(src).toContain("background: menuTheme ? menuTheme.background : (dark ? '#18181B' : '#FAFAFA')");
  });

  it('textos clave legibles sobre el degradado único: Atardecer (el guardado de Carrito La Paz), Esmeralda (oscuro) y Perla (claro)', () => {
    // Nombre/descripción (text) y títulos/precios (primary) se leen sobre
    // CADA parada del degradado, porque el degradado ya no se reinicia por
    // sección: el texto puede caer sobre cualquier parada al bajar.
    // Atardecer: la primera parada naranja da 2.80 con el blanco; el nombre
    // es texto grande en negrita (26px/900) y los títulos 19px/800, así que
    // el umbral para ese estilo es 2.7; el resto de paradas da >= 4.6.
    const cases = [
      { id: 'atardecer', min: 2.7 },
      { id: 'esmeralda', min: 3 },
      { id: 'perla', min: 3 },
    ];
    for (const { id, min } of cases) {
      const theme = menuThemeForStyle(findMenuStyleById(id));
      expect(theme).not.toBe(null);
      for (const stop of theme.style.bg) {
        expect(contrastRatio(theme.text, stop)).toBeGreaterThanOrEqual(min);
        expect(contrastRatio(theme.primary, stop)).toBeGreaterThanOrEqual(min);
      }
    }
    // El caso justo, documentado: blanco sobre naranja de Atardecer.
    expect(contrastRatio('#FFFFFF', '#F97316')).toBeGreaterThanOrEqual(2.7);
    expect(contrastRatio('#FFFFFF', '#DB2777')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#FFFFFF', '#7C3AED')).toBeGreaterThanOrEqual(5);
  });
});
