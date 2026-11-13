import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import MenuStyleDesigner from '../components/store/MenuStyleDesigner.jsx';
import {
  LOYALTY_COLOR_STYLES,
  findMenuStyleById,
  menuThemeForStyle,
  textOnMenuPrimary,
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
  it('los 30 estilos de lealtad se resuelven por id, con su categoría', () => {
    expect(LOYALTY_COLOR_STYLES.length).toBe(30);
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
    for (const light of ['#F5B301', '#FBBF24', '#FDE68A', '#FFFFFF', '#CBD5E1', '#A8A29E', '#FDBA74', '#C9A227', '#A5F3FC', '#E5E7EB']) {
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
    expect(src).toContain("import { findMenuStyleById, menuThemeForStyle, menuHexAlpha } from '../../lib/menuColorStyles.js'");
  });

  it('con estilo: fondo degradado, encabezado en primera parada, píldora y botón en primary', () => {
    const src = read('../components/store/BusinessStore.jsx');
    expect(src).toContain('menuTheme ? menuTheme.background');
    expect(src).toContain('menuTheme ? menuTheme.firstColor');
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

  it('muestra los 30 estilos agrupados en las 4 categorías', () => {
    const html = renderDesigner(CARRITO);
    for (const label of ['Premium', 'Sobrios', 'Cafetería', 'Coloridos']) {
      expect(html).toContain(label);
    }
    for (const label of ['Oro negro', 'Esmeralda', 'Medianoche', 'Vino', 'Atardecer', 'Océano', 'Galaxia', 'Pizarra', 'Perla', 'Oliva', 'Petróleo', 'Terracota', 'Malva', 'Bosque', 'Espresso', 'Latte', 'Capuccino', 'Mocha', 'Caramelo', 'Crema', 'Grafito plata', 'Rosa claro', 'Lima', 'Cobre', 'Coral', 'Arena', 'Tropical', 'Rosa dorado', 'Menta', 'Ámbar']) {
      expect(html).toContain(label);
    }
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
    expect(src).toContain('LOYALTY_COLOR_CATEGORIES.map');
    expect(src).toContain("sb.get('store_categories'");
    expect(src).toContain('setSelectedId(style.id)');
  });

  it('cuadrícula compacta de 3 por fila: círculo arriba, nombre abajo (ya no filas completas)', () => {
    const src = read('../components/store/MenuStyleDesigner.jsx');
    expect(src).toContain("gridTemplateColumns: 'repeat(3, 1fr)'");
    expect(src).not.toContain("gridTemplateColumns: '1fr 1fr'");
    // La celda es columna: el círculo va arriba y el nombre abajo, centrado.
    expect(src).toContain("flexDirection: 'column'");
    expect(src).toContain("textAlign: 'center'");
    // Los 30 nombres siguen visibles en la cuadrícula.
    const html = renderDesigner(CARRITO);
    for (const label of ['Oro negro', 'Esmeralda', 'Perla', 'Espresso', 'Rosa claro', 'Coral', 'Ámbar']) {
      expect(html).toContain(label);
    }
  });

  it('el estilo seleccionado se marca claro: anillo en su primary y palomita sobre el círculo', () => {
    const src = read('../components/store/MenuStyleDesigner.jsx');
    expect(src).toContain('aria-pressed={isSelected}');
    expect(src).toContain('0 0 0 5px ${styleTheme ? styleTheme.primary : t.text}');
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
