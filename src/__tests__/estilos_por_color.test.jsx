// Estilos por color (nov 2026): la lista pasa de 4 categorías
// (Premium/Sobrios/Cafetería/Coloridos, 36 estilos) a 7 familias de color
// (48 estilos) y se agregan 12 gradientes nuevos.
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
  { id: 'lavanda', label: 'Lavanda', bg: ['#C4B5FD', '#F9A8D4'], text: '#4C1D95', primary: '#7C3AED', family: 'morados-rosas' },
  { id: 'dorado', label: 'Dorado', bg: ['#FACC15', '#D97706'], text: '#451A03', primary: '#92400E', family: 'naranjas-amarillos' },
  { id: 'selva', label: 'Selva', bg: ['#052E16', '#10B981'], text: '#ECFDF5', primary: '#FBBF24', family: 'verdes' },
  { id: 'rosa-mexicano', label: 'Rosa mexicano', bg: ['#BE185D', '#D946EF'], text: '#FFFFFF', primary: '#FDE68A', family: 'rojos' },
  { id: 'cielo', label: 'Cielo', bg: ['#7DD3FC', '#1D4ED8'], text: '#172554', primary: '#1D4ED8', family: 'azules' },
  { id: 'uva', label: 'Uva', bg: ['#9333EA', '#991B1B'], text: '#FAF5FF', primary: '#FBBF24', family: 'morados-rosas' },
  { id: 'amanecer', label: 'Amanecer', bg: ['#FDA4AF', '#FB923C'], text: '#7C2D12', primary: '#EA580C', family: 'naranjas-amarillos' },
  { id: 'jade', label: 'Jade', bg: ['#10B981', '#0D9488'], text: '#064E3B', primary: '#059669', family: 'verdes' },
  { id: 'acero', label: 'Acero', bg: ['#64748B', '#1E40AF'], text: '#F8FAFC', primary: '#CBD5E1', family: 'azules' },
];

const VIEJOS_POR_FAMILIA = {
  rojos: ['vino', 'coral'],
  'naranjas-amarillos': ['atardecer', 'ambar', 'cobre', 'caramelo', 'terracota'],
  verdes: ['esmeralda', 'lima', 'menta', 'tropical', 'bosque', 'salvia'],
  azules: ['medianoche', 'oceano', 'zafiro', 'petroleo', 'pizarra'],
  'morados-rosas': ['galaxia', 'amatista', 'rosa-claro', 'rosa-dorado', 'malva'],
  cafes: ['chocolate', 'canela', 'cafe-helado', 'caqui', 'latte', 'capuccino'],
  neutros: ['oro-negro', 'grafito-plata', 'espresso', 'mocha', 'crema', 'oliva', 'perla'],
};

describe('Estilos por color: los 12 gradientes nuevos', () => {
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
    expect(LOYALTY_COLOR_STYLES.length).toBe(48);
  });

  it('«Bosque» no se duplica: el viejo sigue siendo el único con ese id (ahora en Verdes); el verde oscuro nuevo se llama «Selva»', () => {
    const bosques = LOYALTY_COLOR_STYLES.filter((s) => s.id === 'bosque');
    expect(bosques.length).toBe(1);
    expect(bosques[0]).toEqual({
      id: 'bosque', label: 'Bosque', bg: ['#166534', '#14532D'],
      text: '#F0FDF4', primary: '#FDE68A', category: 'verdes',
    });
    expect(findMenuStyleById('selva')?.label).toBe('Selva');
    expect(findMenuStyleById('selva')?.bg).toEqual(['#052E16', '#10B981']);
  });

  it('«Uva» quedó en Morados y rosas (en la propuesta no venía asignada a ninguna familia)', () => {
    expect(findMenuStyleById('uva')?.category).toBe('morados-rosas');
    expect(LOYALTY_COLOR_CATEGORIES.find((c) => c.id === 'morados-rosas').styles.map((s) => s.id)).toContain('uva');
  });

  it('contraste de la píldora inactiva >= 4.5:1 en los 12 nuevos (regla de la #314)', () => {
    let worst = { label: '', ratio: 99 };
    for (const nuevo of NUEVOS) {
      const theme = menuThemeForStyle(findMenuStyleById(nuevo.id));
      expect(theme).not.toBe(null);
      const ratio = menuContrastRatio(textOnMenuSurface(theme.firstColor), theme.firstColor);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
      if (ratio < worst.ratio) worst = { label: nuevo.label, ratio };
    }
    // Peor caso medido: Acero, 4.76:1 (Caqui, el peor viejo, 4.80:1).
    expect(worst.label).toBe('Acero');
    expect(worst.ratio).toBeGreaterThanOrEqual(4.5);
  });
});

describe('Estilos por color: los 36 viejos, cada uno en una sola familia', () => {
  it('cada estilo viejo está en exactamente una familia y ningún id/nombre se repite', () => {
    const ids = LOYALTY_COLOR_STYLES.map((s) => s.id);
    expect(new Set(ids).size).toBe(48);
    const labels = LOYALTY_COLOR_STYLES.map((s) => s.label);
    expect(new Set(labels).size).toBe(48);
    for (const [family, oldIds] of Object.entries(VIEJOS_POR_FAMILIA)) {
      for (const id of oldIds) {
        expect(findMenuStyleById(id)?.category).toBe(family);
      }
    }
    // El conteo total cuadra: 36 viejos + 12 nuevos = 48.
    const oldCount = Object.values(VIEJOS_POR_FAMILIA).flat().length;
    expect(oldCount).toBe(36);
    expect(oldCount + NUEVOS.length).toBe(48);
  });

  it('los estilos viejos conservan sus colores exactos (solo cambia la familia)', () => {
    expect(findMenuStyleById('caqui')).toEqual({
      id: 'caqui', label: 'Caqui', bg: ['#78716C', '#44403C'],
      text: '#FAFAF9', primary: '#D6D3D1', category: 'cafes',
    });
    expect(findMenuStyleById('latte')?.bg).toEqual(['#F5E6D3', '#E7C9A9']);
    expect(findMenuStyleById('pizarra')?.bg).toEqual(['#475569', '#1E293B']);
    expect(findMenuStyleById('malva')?.bg).toEqual(['#4C1D95', '#2E1065']);
    expect(findMenuStyleById('terracota')?.bg).toEqual(['#9A3412', '#7C2D12']);
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
