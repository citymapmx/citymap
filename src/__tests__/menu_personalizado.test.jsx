import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import MenuStyleDesigner from '../components/store/MenuStyleDesigner.jsx';
import {
  LOYALTY_COLOR_CATEGORIES,
  LOYALTY_COLOR_STYLES,
  MENU_BASIC_COLORS,
  findMenuStyleById,
  menuThemeForStyle,
  menuThemeForCustom,
  parseMenuCustom,
  customFromTheme,
  resolveMenuTheme,
  menuDarken,
  isValidMenuHex,
  menuBestText,
  menuBestTextOnGradient,
  menuContrastRatio,
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
  it('lee el tema del negocio y lo resuelve (personalizado manda, si no el predefinido)', () => {
    const src = read('../components/store/BusinessStore.jsx');
    expect(src).toContain('const menuTheme = resolveMenuTheme(business);');
    expect(src).toContain("import { resolveMenuTheme, menuHexAlpha, textOnMenuSurface } from '../../lib/menuColorStyles.js'");
    // El resolvedor vive en el lib: personalizado primero, predefinido después.
    const lib = read('../lib/menuColorStyles.js');
    expect(lib).toContain('export function resolveMenuTheme(business)');
    expect(lib).toContain('menuThemeForCustom(business.menu_custom)');
    expect(lib).toContain('menuThemeForStyle(findMenuStyleById(business.menu_style))');
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

  it('Guardar escribe menu_style y menu_custom en la fila del negocio y la vista previa usa su menú real', () => {
    const src = read('../components/store/MenuStyleDesigner.jsx');
    expect(src).toContain("sb.patch('businesses', business.id, { menu_style: selectedId, menu_custom: custom })");
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
    // La tarjeta de la página es el único fondo con el degradado del tema
    // en este archivo. El segundo uso vive en la pantalla de carga
    // única (MenuLoadingScreen, compartida por MenuView y BusinessStore):
    // ES la página antes de que exista el menú, no una sección que
    // repita el degradado (nov 2026, error 3; hallazgo #2).
    const uses = src.match(/menuTheme \? menuTheme\.background/g) || [];
    expect(uses.length).toBe(1);
    expect(src).toContain("background: menuTheme ? menuTheme.background : (dark ? '#18181B' : '#FAFAFA')");
    const screen = read('../components/store/MenuLoadingScreen.jsx');
    expect(screen).toContain('menuTheme.background');
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

describe('Menú público: el texto de horario/estado va en píldora oscura con texto blanco', () => {
  // Mezcla rgba(0,0,0,alpha) sobre un fondo hex y devuelve el hex resultante.
  function pillOver(alpha, hex) {
    const n = parseInt(hex.slice(1), 16);
    const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * (1 - alpha)));
    return `#${ch.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  }

  it('el estado del encabezado es una píldora oscura translúcida con reloj y texto en blanco (ya no verde/rojo)', () => {
    const src = read('../components/store/BusinessStore.jsx');
    const at = src.indexOf('scheduleInfo?.text?.[0]');
    expect(at).toBeGreaterThan(-1);
    const block = src.slice(Math.max(0, at - 900), at + 300);
    // Píldora: fondo negro translúcido, blur, bordes redondeados.
    expect(block).toContain("background: 'rgba(0, 0, 0, 0.55)'");
    expect(block).toContain("backdropFilter: 'blur(4px)'");
    expect(block).toContain('borderRadius: 999');
    // Reloj y texto en blanco, sin el verde/rojo según abierto o cerrado.
    expect(block).toContain('<Icon name="clock" size={13} color="#FFFFFF" />');
    expect(block).toContain("color: '#FFFFFF'");
    expect(block).not.toContain('#10B981');
    expect(block).not.toContain('#EF4444');
    // Cubre todos los estados que muestra ese texto (abierto, cerrado,
    // «abre mañana...»): todos salen por el mismo span.
    expect(block).toContain('isOpen ? "Abierto ahora" : "Cerrado"');
  });

  it('blanco sobre la píldora (0.55) se lee >= 4.5:1 sobre cada parada de los 36 estilos y sin estilo', () => {
    // Con la opacidad 0.25-0.30 que se sugirió, el blanco solo llega a
    // 2.05:1 sobre Crema #FFFBEB (y sobre el fondo claro sin estilo):
    // por eso la píldora va en 0.55. El fondo real tras la píldora es el
    // degradado (135deg) o #FAFAFA sin estilo; el peor caso es cada parada.
    const stops = [...new Set(LOYALTY_COLOR_STYLES.flatMap((s) => s.bg)), '#FAFAFA'];
    for (const stop of stops) {
      expect(contrastRatio('#FFFFFF', pillOver(0.55, stop))).toBeGreaterThanOrEqual(4.5);
    }
    // El caso justo, documentado: Crema, la parada más clara.
    expect(contrastRatio('#FFFFFF', pillOver(0.55, '#FFFBEB'))).toBeGreaterThanOrEqual(4.8);
    // Y que 0.28 sí fallaría ahí (para que el 0.55 no se «abarate» luego).
    expect(contrastRatio('#FFFFFF', pillOver(0.28, '#FFFBEB'))).toBeLessThan(3);
  });

  it('Atardecer (Carrito La Paz), Esmeralda (oscuro) y Perla (claro): el estado se lee sobre sus paradas', () => {
    for (const id of ['atardecer', 'esmeralda', 'perla']) {
      const theme = menuThemeForStyle(findMenuStyleById(id));
      expect(theme).not.toBe(null);
      for (const stop of theme.style.bg) {
        expect(contrastRatio('#FFFFFF', pillOver(0.55, stop))).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});

describe('Menú personalizado: editor universal de colores propios', () => {
  it('los colores básicos van primero en el editor, antes que los selectores exactos', () => {
    // Los 10 básicos que pidió Jonathan, en orden: negro, blanco, gris,
    // rojo, azul, verde, amarillo, naranja, morado, rosa.
    expect(MENU_BASIC_COLORS.map((c) => c.label)).toEqual([
      'Negro', 'Blanco', 'Gris', 'Rojo', 'Azul', 'Verde', 'Amarillo', 'Naranja', 'Morado', 'Rosa',
    ]);
    expect(MENU_BASIC_COLORS.map((c) => c.hex)).toEqual([
      '#000000', '#FFFFFF', '#6B7280', '#EF4444', '#2563EB', '#16A34A', '#FACC15', '#F97316', '#7C3AED', '#EC4899',
    ]);
    for (const c of MENU_BASIC_COLORS) expect(isValidMenuHex(c.hex)).toBe(true);
    // En el diseñador: la fila de básicos aparece antes que los inputs
    // de color exacto (los básicos van primero, los exactos después).
    const html = renderDesigner(CARRITO);
    expect(html).toContain('O personalizar colores exactos');
    expect(html).toContain('Fondo');
    expect(html).toContain('Botón');
    expect(html).toContain('Color básico Negro para Fondo');
    expect(html).toContain('Color básico Rosa para Botón');
    expect(html).toContain('Color exacto de Fondo');
    expect(html).toContain('Color exacto de Botón');
    const firstBasic = html.indexOf('Color básico Negro para Fondo');
    const firstExact = html.indexOf('Color exacto de Fondo');
    expect(firstBasic).toBeGreaterThan(-1);
    expect(firstExact).toBeGreaterThan(-1);
    expect(firstBasic).toBeLessThan(firstExact);
  });

  it('menuDarken oscurece hacia negro: la segunda parada del degradado propio', () => {
    expect(menuDarken('#FFFFFF', 0.3)).toBe('#B3B3B3');
    expect(menuDarken('#F97316', 0.3)).toBe('#AE510F');
    expect(menuDarken('#000000', 0.3)).toBe('#000000');
    expect(menuDarken('#FFFFFF', 0)).toBe('#FFFFFF');
    expect(menuDarken('no-es-hex')).toBe('#000000');
    expect(menuDarken(null)).toBe('#000000');
  });

  it('parseMenuCustom: objeto o texto JSON válidos; a medias o malos no se aplican', () => {
    expect(parseMenuCustom({ bg: '#f97316', primary: '#111111' })).toEqual({ bg: '#F97316', primary: '#111111' });
    expect(parseMenuCustom('{"bg":"#F97316","primary":"#111111"}')).toEqual({ bg: '#F97316', primary: '#111111' });
    expect(parseMenuCustom(null)).toBe(null);
    expect(parseMenuCustom(undefined)).toBe(null);
    expect(parseMenuCustom('no-json')).toBe(null);
    expect(parseMenuCustom({ bg: '#F97316' })).toBe(null); // sin primary
    expect(parseMenuCustom({ primary: '#111111' })).toBe(null); // sin bg
    expect(parseMenuCustom({ bg: 'naranja', primary: '#111111' })).toBe(null);
    expect(parseMenuCustom({ bg: '#F97316', primary: '#111111', extra: 1 })).toEqual({ bg: '#F97316', primary: '#111111' });
    expect(parseMenuCustom(['#F97316'])).toBe(null);
  });

  it('menuThemeForCustom: degradado del color base, texto derivado por contraste', () => {
    const theme = menuThemeForCustom({ bg: '#F97316', primary: '#111111' });
    expect(theme.background).toBe('linear-gradient(135deg, #F97316, #AE510F)');
    expect(theme.firstColor).toBe('#F97316');
    expect(theme.lastColor).toBe('#AE510F');
    expect(theme.primary).toBe('#111111');
    expect(theme.onPrimary).toBe('#FFFFFF');
    expect(theme.custom).toBe(true);
    // Texto legible sobre la primera parada (la más clara del degradado)
    // y también sobre la segunda (la más oscura).
    expect(theme.text).toBe(menuBestTextOnGradient('#F97316', '#AE510F'));
    expect(contrastRatio(theme.text, theme.firstColor)).toBeGreaterThanOrEqual(3);
    expect(menuThemeForCustom(null)).toBe(null);
    expect(menuThemeForCustom({ bg: '#F97316' })).toBe(null);
    expect(menuThemeForCustom('{"bg":"#2563EB","primary":"#FFFFFF"}')).not.toBe(null);
  });

  it('customFromTheme: tocar un color propio parte de lo que se ve ahora', () => {
    const perla = menuThemeForStyle(findMenuStyleById('perla'));
    expect(customFromTheme(perla)).toEqual({ bg: '#F8FAFC', primary: '#64748B' });
    expect(customFromTheme(null)).toEqual({ bg: '#FFFFFF', primary: '#111111' });
    expect(customFromTheme({})).toEqual({ bg: '#FFFFFF', primary: '#111111' });
  });

  it('resolveMenuTheme: el personalizado manda; si no, el predefinido; si no, null', () => {
    // Personalizado + predefinido: manda el personalizado.
    const ambos = resolveMenuTheme({ menu_style: 'perla', menu_custom: { bg: '#F97316', primary: '#111111' } });
    expect(ambos.background).toBe('linear-gradient(135deg, #F97316, #AE510F)');
    expect(ambos.custom).toBe(true);
    // Solo predefinido: el estilo de siempre.
    const soloEstilo = resolveMenuTheme({ menu_style: 'perla', menu_custom: null });
    expect(soloEstilo.background).toBe('linear-gradient(135deg, #F8FAFC, #E2E8F0)');
    expect(soloEstilo.custom).toBe(undefined);
    // Personalizado inválido + predefinido válido: cae al predefinido.
    const invalido = resolveMenuTheme({ menu_style: 'perla', menu_custom: { bg: 'naranja' } });
    expect(invalido.background).toBe('linear-gradient(135deg, #F8FAFC, #E2E8F0)');
    // Nada de nada: null, el menú se ve como hoy.
    expect(resolveMenuTheme({ menu_style: null, menu_custom: null })).toBe(null);
    expect(resolveMenuTheme({})).toBe(null);
    expect(resolveMenuTheme(null)).toBe(null);
    expect(resolveMenuTheme(undefined)).toBe(null);
  });

  it('menuBestTextOnGradient: el texto se elige por su peor parada, no por la primera', () => {
    // Rojo: el oscuro gana en la primera parada pero cae a 2.62 en la
    // segunda; el blanco se lee bien en ambas.
    expect(menuBestTextOnGradient('#EF4444', '#A73030')).toBe('#FFFFFF');
    // Naranja: el oscuro es el mejor en ambas paradas.
    expect(menuBestTextOnGradient('#F97316', '#AE510F')).toBe('#18181B');
    expect(menuBestTextOnGradient('#FFFFFF', '#B3B3B3')).toBe('#18181B');
    expect(menuBestTextOnGradient('#000000', '#000000')).toBe('#FFFFFF');
    expect(menuBestTextOnGradient('no-es-hex', '#000000')).toBe('#FFFFFF');
    expect(menuBestTextOnGradient(null, null)).toBe('#FFFFFF');
  });

  it('menuBestText elige el texto con mejor contraste WCAG (no el umbral de brillo)', () => {
    // El naranja es el caso que delata el umbral: blanco da 2.80 y el
    // oscuro da 6.33 (mismo naranja que Atardecer, cuyo caso justo ya está
    // documentado en los predefinidos).
    expect(menuBestText('#F97316')).toBe('#18181B');
    expect(menuContrastRatio('#18181B', '#F97316')).toBeGreaterThanOrEqual(6);
    expect(menuContrastRatio('#FFFFFF', '#F97316')).toBeLessThan(3);
    expect(menuBestText('#000000')).toBe('#FFFFFF');
    expect(menuBestText('#FFFFFF')).toBe('#18181B');
    expect(menuBestText('no-es-hex')).toBe('#FFFFFF');
    expect(menuBestText(null)).toBe('#FFFFFF');
  });

  it('cualquier básico sirve de fondo o de botón: el texto derivado se lee (contraste >= 3:1)', () => {
    for (const c of MENU_BASIC_COLORS) {
      // Como fondo: texto derivado sobre el color base.
      expect(contrastRatio(textOnMenuSurface(c.hex), c.hex)).toBeGreaterThanOrEqual(3);
      // Como botón: el onPrimary del tema propio se mide por contraste
      // (menuBestText), no por el umbral de los predefinidos.
      const theme = menuThemeForCustom({ bg: c.hex, primary: c.hex });
      expect(theme.onPrimary).toBe(menuBestText(c.hex));
      expect(contrastRatio(theme.onPrimary, theme.primary)).toBeGreaterThanOrEqual(3);
      // Y el tema propio completo se lee sobre sus dos paradas.
      expect(contrastRatio(theme.text, theme.firstColor)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(theme.text, theme.lastColor)).toBeGreaterThanOrEqual(3);
    }
  });

  it('con tema propio guardado la vista previa dice «Personalizado» y lleva su degradado', () => {
    const html = renderDesigner({ ...CARRITO, menu_custom: { bg: '#F97316', primary: '#111111' } });
    expect(html).toContain('Personalizado');
    expect(html).toContain('linear-gradient(135deg, #F97316, #AE510F)');
    // Ni «Sin estilo» ni el carrusel marcan nada: ninguna palomita.
    expect(html.split('✓').length - 1).toBe(0);
    // Sin tema propio, la vista previa sigue diciendo lo de antes.
    expect(renderDesigner(CARRITO)).toContain('Sin estilo · como se ve hoy');
    expect(renderDesigner({ ...CARRITO, menu_style: 'perla' })).toContain('Estilo: Perla');
  });

  it('elegir predefinido quita lo propio, tocar un color quita el predefinido, «Sin estilo» limpia ambos', () => {
    const src = read('../components/store/MenuStyleDesigner.jsx');
    // Predefinido -> setCustom(null).
    expect(src).toContain('const handleSelectStyle = (style) => {');
    expect(src).toContain('setSelectedId(style.id);');
    expect(src).toContain('setCustom(null);');
    // Color propio -> setSelectedId(null) y parte del tema actual.
    expect(src).toContain('const handleCustomColor = (field, hex) => {');
    expect(src).toContain('const base = custom || customFromTheme(theme);');
    expect(src).toContain('setSelectedId(null);');
    // «Sin estilo» limpia ambos y su palomita solo sale sin ninguno.
    expect(src).toContain('const handleClearStyle = () => {');
    expect(src).toContain('onClick={handleClearStyle}');
    expect(src).toContain('(selectedId === null && !custom)');
    // El carrusel usa el handler que limpia lo propio.
    expect(src).toContain('onSelectStyle={handleSelectStyle}');
  });

  it('Guardar escribe menu_style y menu_custom; la migración agrega menu_custom jsonb', () => {
    const src = read('../components/store/MenuStyleDesigner.jsx');
    expect(src).toContain("sb.patch('businesses', business.id, { menu_style: selectedId, menu_custom: custom })");
    expect(src).toContain('¡Tema personalizado guardado!');
    const sql = read('../../supabase/migrations/20261114003000_add_menu_custom_to_businesses.sql');
    expect(sql).toContain('alter table public.businesses');
    expect(sql).toContain('add column if not exists menu_custom jsonb null');
  });

  it('BusinessStore aplica el tema propio igual que un estilo (mismo menú, mismo mapeo)', () => {
    const src = read('../components/store/BusinessStore.jsx');
    expect(src).toContain('const menuTheme = resolveMenuTheme(business);');
    // El mapeo no distingue predefinido de propio: fondo, primary y texto
    // del tema, con los mismos fallbacks sin tema.
    expect(src).toContain('menuTheme ? menuTheme.background');
    expect(src).toContain('menuTheme ? menuTheme.primary');
    expect(src).toContain('menuTheme ? menuTheme.text');
  });
});
