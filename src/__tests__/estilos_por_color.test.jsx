// Estilos por color (nov 2026): la lista pasa de 4 categorías
// (Premium/Sobrios/Cafetería/Coloridos, 36 estilos) a 7 familias de color
// (48 estilos) y se agregan 12 gradientes nuevos. Propuesta A (nov 2026):
// se quitan 19 casi-duplicados y quedan 29 estilos en las 7 familias.
import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import MenuStyleDesigner from '../components/store/MenuStyleDesigner.jsx';
import StyleCategoryCarousel from '../components/ui/StyleCategoryCarousel.jsx';
import {
  LOYALTY_COLOR_CATEGORIES,
  LOYALTY_COLOR_STYLES,
  findMenuStyleById,
  menuThemeForStyle,
  menuContrastRatio,
  textOnMenuSurface,
} from '../lib/menuColorStyles.js';

const T = { bg: '#FFFFFF', border: '#E4E4E7', text: '#18181B', sub: '#71717A', surface: '#F4F4F5' };
const CARRITO = { id: '82c9af20-ef42-4a43-87c4-1831a020aace', name: 'Carrito La Paz Tostadas de Atún', menu_style: null };

const NUEVOS = [
  { id: 'fuego', label: 'Fuego', bg: ['#DC2626', '#EA580C'], text: '#FFFFFF', primary: '#FDE68A', family: 'rojos' },
  { id: 'magenta', label: 'Magenta', bg: ['#C2185B', '#7E22CE'], text: '#FFFFFF', primary: '#F0ABFC', family: 'morados-rosas' },
  { id: 'turquesa', label: 'Turquesa', bg: ['#2DD4BF', '#0284C7'], text: '#064E3B', primary: '#FDE68A', family: 'azules' },
  { id: 'dorado', label: 'Dorado', bg: ['#FACC15', '#D97706'], text: '#451A03', primary: '#92400E', family: 'naranjas-amarillos' },
  { id: 'selva', label: 'Selva', bg: ['#052E16', '#10B981'], text: '#ECFDF5', primary: '#FBBF24', family: 'verdes' },
  { id: 'rosa-mexicano', label: 'Rosa mexicano', bg: ['#BE185D', '#D946EF'], text: '#FFFFFF', primary: '#FDE68A', family: 'rojos' },
  { id: 'cielo', label: 'Cielo', bg: ['#7DD3FC', '#1D4ED8'], text: '#172554', primary: '#1D4ED8', family: 'azules' },
  { id: 'uva', label: 'Uva', bg: ['#9333EA', '#991B1B'], text: '#FAF5FF', primary: '#FBBF24', family: 'morados-rosas' },
  { id: 'amanecer', label: 'Amanecer', bg: ['#FDA4AF', '#FB923C'], text: '#7C2D12', primary: '#EA580C', family: 'naranjas-amarillos' },
];

const VIEJOS_POR_FAMILIA = {
  rojos: ['vino', 'coral'],
  'naranjas-amarillos': ['atardecer', 'terracota'],
  verdes: ['esmeralda', 'lima', 'menta', 'tropical', 'salvia'],
  azules: ['medianoche', 'oceano'],
  'morados-rosas': ['galaxia', 'amatista', 'rosa-claro'],
  cafes: ['chocolate', 'canela', 'cafe-helado'],
  neutros: ['oro-negro', 'grafito-plata', 'crema'],
};

// Los 19 estilos que quitó la Propuesta A (casi-duplicados de los que quedan).
const ELIMINADOS = [
  'ambar', 'cobre', 'caramelo',
  'bosque', 'jade',
  'zafiro', 'petroleo', 'pizarra', 'acero',
  'malva', 'rosa-dorado', 'lavanda',
  'capuccino', 'latte', 'caqui',
  'espresso', 'mocha', 'oliva', 'perla',
];

describe('Estilos por color: los 9 gradientes nuevos que quedan (Propuesta A)', () => {
  it('existen con sus gradientes exactos y en su familia de color', () => {
    for (const nuevo of NUEVOS) {
      const style = findMenuStyleById(nuevo.id);
      expect(style).toEqual({
        id: nuevo.id,
        label: nuevo.label,
        bg: nuevo.bg,
        text: nuevo.text,
        primary: nuevo.primary,
        category: nuevo.family,
      });
    }
    expect(LOYALTY_COLOR_STYLES.length).toBe(29);
  });

  it('los 19 estilos de la Propuesta A ya no existen (ni como duplicados)', () => {
    expect(ELIMINADOS.length).toBe(19);
    for (const id of ELIMINADOS) {
      expect(findMenuStyleById(id)).toBe(null);
    }
    expect(findMenuStyleById('selva')?.label).toBe('Selva');
    expect(findMenuStyleById('selva')?.bg).toEqual(['#052E16', '#10B981']);
  });

  it('«Uva» quedó en Morados y rosas (en la propuesta no venía asignada a ninguna familia)', () => {
    expect(findMenuStyleById('uva')?.category).toBe('morados-rosas');
    expect(LOYALTY_COLOR_CATEGORIES.find((c) => c.id === 'morados-rosas').styles.map((s) => s.id)).toContain('uva');
  });

  it('contraste de la píldora inactiva >= 4.5:1 en los 9 nuevos que quedan (regla de la #314)', () => {
    let worst = { label: '', ratio: 99 };
    for (const nuevo of NUEVOS) {
      const theme = menuThemeForStyle(findMenuStyleById(nuevo.id));
      expect(theme).not.toBe(null);
      const ratio = menuContrastRatio(textOnMenuSurface(theme.firstColor), theme.firstColor);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
      if (ratio < worst.ratio) worst = { label: nuevo.label, ratio };
    }
    // Peor caso medido: Fuego, 4.83:1.
    expect(worst.label).toBe('Fuego');
    expect(worst.ratio).toBeGreaterThanOrEqual(4.5);
  });
});

describe('Estilos por color: los 20 viejos que quedan, cada uno en una sola familia', () => {
  it('cada estilo viejo está en exactamente una familia y ningún id/nombre se repite', () => {
    const ids = LOYALTY_COLOR_STYLES.map((s) => s.id);
    expect(new Set(ids).size).toBe(29);
    const labels = LOYALTY_COLOR_STYLES.map((s) => s.label);
    expect(new Set(labels).size).toBe(29);
    for (const [family, oldIds] of Object.entries(VIEJOS_POR_FAMILIA)) {
      for (const id of oldIds) {
        expect(findMenuStyleById(id)?.category).toBe(family);
      }
    }
    // El conteo total cuadra: 20 viejos que quedan + 9 nuevos = 29.
    const oldCount = Object.values(VIEJOS_POR_FAMILIA).flat().length;
    expect(oldCount).toBe(20);
    expect(oldCount + NUEVOS.length).toBe(29);
  });

  it('los estilos viejos que quedan conservan sus colores exactos (salvo los 4 retocados de la Propuesta A)', () => {
    expect(findMenuStyleById('terracota')?.bg).toEqual(['#9A3412', '#7C2D12']);
    expect(findMenuStyleById('salvia')).toEqual({
      id: 'salvia', label: 'Salvia', bg: ['#7C8A6A', '#3F4A37'],
      text: '#F4F7F0', primary: '#D9E2D0', category: 'verdes',
    });
    expect(findMenuStyleById('canela')?.bg).toEqual(['#A16207', '#713F12']);
    // Atardecer pasa de 3 paradas a 2 (naranja→rosa, sin el morado).
    expect(findMenuStyleById('atardecer')).toEqual({
      id: 'atardecer', label: 'Atardecer', bg: ['#F97316', '#DB2777'],
      text: '#FFFFFF', primary: '#FFFFFF', category: 'naranjas-amarillos',
    });
    // Pálidos con segunda parada más oscura para que el color se note.
    expect(findMenuStyleById('menta')?.bg).toEqual(['#A7F3D0', '#34D399']);
    expect(findMenuStyleById('rosa-claro')?.bg).toEqual(['#FDF2F8', '#F9A8D4']);
    expect(findMenuStyleById('crema')?.bg).toEqual(['#FFFBEB', '#FBBF24']);
  });
});

describe('Estilos por color: el carrusel muestra familias de color', () => {
  it('el carrusel renderiza las 7 familias con sus 7 puntos', () => {
    const html = renderToStaticMarkup(
      <StyleCategoryCarousel selectedId={null} onSelectStyle={() => {}} initialCategoryId="rojos" />
    );
    for (const label of ['Rojos', 'Naranjas y amarillos', 'Verdes', 'Azules', 'Morados y rosas', 'Cafés', 'Neutros']) {
      expect(html).toContain(label);
    }
    expect(html.split('Ir a ').length - 1).toBe(7);
    // Ninguna categoría vieja aparece.
    for (const label of ['Premium', 'Sobrios', 'Cafetería', 'Coloridos']) {
      expect(html).not.toContain(`>${label}<`);
    }
  });

  it('«Sin estilo» y «O personalizar colores exactos» se quedan en el diseñador', () => {
    const html = renderToStaticMarkup(
      <MenuStyleDesigner business={CARRITO} onClose={() => {}} onSaved={() => {}} T={T} />
    );
    expect(html).toContain('Sin estilo');
    expect(html).toContain('Tu menú se ve como hoy');
    expect(html).toContain('O personalizar colores exactos');
    expect(html).toContain('Guardar estilo de menú');
  });
});
