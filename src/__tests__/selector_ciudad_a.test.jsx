import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import CountryPickerDropdown from '../components/CountryPickerDropdown.jsx';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// Selector de ciudad (22 nov 2026, Jonathan): la propuesta A de filas
// discretas sin cajas queda superada en dos puntos — el buscador y la
// fila «Cerca de mí» llevan trazo visible (borde como las tarjetas del
// panel), y la fila «Todas las ciudades» (inicio global) se quita: el
// muro global se alcanza desde el inicio. La fila «Cerca de mí»
// conserva su título y su subtítulo ahora es «Descubre cosas
// increíbles». El buscador y la lista de ciudades quedan intactos.
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
};

const renderPicker = (props = {}) => renderToStaticMarkup(
  <CountryPickerDropdown {...baseProps} {...props} />,
);

describe('selector de ciudad: buscador y «Cerca de mí» con trazo, sin «Todas las ciudades»', () => {
  it('solo queda la fila «Cerca de mí», con el subtítulo nuevo', () => {
    const html = renderPicker();
    expect(html).toContain('Cerca de mí');
    expect(html).toContain('Descubre cosas increíbles');
    expect(html).not.toContain('Todas las ciudades');
    expect(html).not.toContain('sin filtro de ciudad');
    expect(html).not.toContain('usa tu ubicación');
  });

  it('ya no muestra los textos viejos de los botones con caja', () => {
    const html = renderPicker();
    expect(html).not.toContain('Encontrar lugares cerca de mí');
    expect(html).not.toContain('Inicio global — todas las ciudades');
  });

  it('en la bienvenida también sale solo la fila de ubicación', () => {
    const html = renderPicker({ isWelcome: true });
    expect(html).toContain('Cerca de mí');
    expect(html).toContain('Descubre cosas increíbles');
    expect(html).not.toContain('Todas las ciudades');
  });

  it('mientras localiza, la fila dice «Buscando...» y conserva el subtítulo nuevo', () => {
    const html = renderPicker({ locating: true });
    expect(html).toContain('Buscando...');
    expect(html).toContain('Descubre cosas increíbles');
    expect(html).not.toContain('Todas las ciudades');
  });

  it('el buscador y la lista de ciudades siguen como antes (ahora con máquina de escribir)', () => {
    const html = renderPicker();
    // El placeholder fijo «Buscar ciudad...» ya no existe: la frase
    // animada es un texto encima del input (22 nov 2026) — en el
    // render estático se ve el cursor, la animación corre en el efecto.
    expect(html).toContain('▏');
    expect(html).not.toContain('placeholder="Buscar ciudad..."');
    expect(html).toContain('Guadalajara');
    expect(html).toContain('Zapopan');
    expect(html).toContain('Tepic');
    expect(html).toContain('Populares');
  });

  it('buscador y fila usan el mismo trazo visible (#e2e8f0 en claro)', () => {
    const src = read('../components/CountryPickerDropdown.jsx');
    // fieldBorder se usa en dos sitios: el input del buscador y el
    // botón «Cerca de mí».
    expect(src.split('border: fieldBorder').length - 1).toBe(2);
    expect(src).toContain('const fieldBorder = `1px solid ${dark ? "rgba(255,255,255,0.14)" : "#e2e8f0"}`');
    expect(src).not.toContain('onGoToWall');
    expect(src).not.toContain('Todas las ciudades');
  });

  it('la fila «Cerca de mí» es un botón con borde y radio 12, sin línea separadora', () => {
    const src = read('../components/CountryPickerDropdown.jsx');
    const rows = src.slice(
      src.indexOf('Fila de ubicación con trazo visible'),
      src.indexOf('Popular cities'),
    );
    expect(rows).toContain('onClick={onDetectCity}');
    expect(rows).toContain('border: fieldBorder');
    expect(rows).toContain('borderRadius: 12');
    expect(rows).toContain('Descubre cosas increíbles');
    expect(rows).toContain('<Icon name="chevron" size={14} color={T.sub} />');
    expect(rows).not.toContain('onGoToWall');
    expect(rows).not.toContain('Todas las ciudades');
    expect(rows).not.toContain('border: "none"');
    expect(rows).not.toContain('borderBottom:');
    expect(rows).not.toContain('boxShadow');
  });
});
