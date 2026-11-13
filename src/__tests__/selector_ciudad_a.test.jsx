import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import CountryPickerDropdown from '../components/CountryPickerDropdown.jsx';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// Propuesta A del selector de ciudad (nov 2026, elegida por Jonathan):
// los dos botones grandes con caja — «Encontrar lugares cerca de mí» e
// «Inicio global — todas las ciudades» — pasan a ser filas discretas sin
// cajas: icono + título + subtítulo + flecha, separadas por una línea fina.
// Nombres nuevos: «Cerca de mí» y «Todas las ciudades». El cableado
// (onDetectCity / onGoToWall), el buscador y la lista de ciudades quedan
// intactos.
const cities = [
  { slug: 'guadalajara', name: 'Guadalajara', country_code: 'mx' },
  { slug: 'zapopan', name: 'Zapopan', country_code: 'mx' },
  { slug: 'tepic', name: 'Tepic', country_code: 'mx' },
];

const baseProps = {
  show: true,
  cities,
  activeCity: 'guadalajara',
  onSelectCity: () => {},
  onDetectCity: () => {},
  locating: false,
  onClose: () => {},
  dark: false,
  isWelcome: false,
  onGoToWall: () => {},
};

const renderPicker = (props = {}) => renderToStaticMarkup(
  <CountryPickerDropdown {...baseProps} {...props} />,
);

describe('selector de ciudad, propuesta A: filas discretas sin cajas', () => {
  it('muestra las dos filas con los nombres nuevos y sus subtítulos', () => {
    const html = renderPicker();
    expect(html).toContain('Cerca de mí');
    expect(html).toContain('usa tu ubicación');
    expect(html).toContain('Todas las ciudades');
    expect(html).toContain('sin filtro de ciudad');
  });

  it('ya no muestra los textos viejos de los botones con caja', () => {
    const html = renderPicker();
    expect(html).not.toContain('Encontrar lugares cerca de mí');
    expect(html).not.toContain('Inicio global — todas las ciudades');
  });

  it('en la bienvenida solo sale la fila de ubicación (el inicio global es solo fuera de ella)', () => {
    const html = renderPicker({ isWelcome: true });
    expect(html).toContain('Cerca de mí');
    expect(html).not.toContain('Todas las ciudades');
  });

  it('mientras localiza, la fila dice «Buscando...» y conserva el subtítulo', () => {
    const html = renderPicker({ locating: true });
    expect(html).toContain('Buscando...');
    expect(html).toContain('usa tu ubicación');
    expect(html).toContain('Todas las ciudades');
  });

  it('el buscador y la lista de ciudades siguen como antes', () => {
    const html = renderPicker();
    expect(html).toContain('Buscar ciudad...');
    expect(html).toContain('Guadalajara');
    expect(html).toContain('Zapopan');
    expect(html).toContain('Tepic');
    expect(html).toContain('Populares');
  });

  it('las filas son planas: sin borde de caja, sin sombra, con línea fina y flecha', () => {
    const src = read('../components/CountryPickerDropdown.jsx');
    const rows = src.slice(
      src.indexOf('Filas discretas'),
      src.indexOf('Popular cities'),
    );
    expect(rows).toContain('onClick={onDetectCity}');
    expect(rows).toContain('onGoToWall(); onClose();');
    expect(rows).toContain('background: "transparent"');
    expect(rows).toContain('border: "none"');
    expect(rows).toContain('borderBottom:');
    expect(rows).toContain('<Icon name="chevron" size={14} color={T.sub} />');
    expect(rows).not.toContain('border: `1px solid');
    expect(rows).not.toContain('borderRadius: 10');
    expect(rows).not.toContain('boxShadow');
  });
});
