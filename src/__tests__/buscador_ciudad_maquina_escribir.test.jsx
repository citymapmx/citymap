import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import CountryPickerDropdown from '../components/CountryPickerDropdown.jsx';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// Máquina de escribir en el buscador de ciudad (22 nov 2026, Jonathan):
// el buscador de «buscar otra ciudad» escribe los nombres de TODAS las
// ciudades registradas, con el mismo efecto del buscador del inicio
// (escribe, espera, borra, sigue con la siguiente, con cursor
// parpadeante). Una sola implementación: el hook vive en lib y los dos
// buscadores lo importan.
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

describe('buscador de ciudad con máquina de escribir', () => {
  const pickerSrc = read('../components/CountryPickerDropdown.jsx');
  const homeSrc = read('../components/home/DebouncedSearchBar.jsx');
  const hookSrc = read('../lib/useTypewriter.js');

  it('el hook vive en lib y los dos buscadores lo importan (una sola implementación)', () => {
    expect(hookSrc).toContain('export function useTypewriter(phrases, options = {})');
    expect(pickerSrc).toContain("from '../lib/useTypewriter.js'");
    expect(homeSrc).toContain("from \"../../lib/useTypewriter.js\"");
    expect(homeSrc).not.toContain('function useTypewriter(phrases)');
    expect(homeSrc).not.toContain('hero-caret');
    expect(pickerSrc).not.toContain('hero-caret');
  });

  it('las frases son los nombres de todas las ciudades registradas, en orden aleatorio y más rápido', () => {
    expect(pickerSrc).toContain('`Buscar ${c.name}...`');
    // Sin ciudades, la frase fija de siempre.
    expect(pickerSrc).toContain("['Buscar ciudad...']");
    // Baraja (Fisher-Yates) en vez del orden fijo por negocios.
    expect(pickerSrc).toContain('Math.floor(Math.random() * (i + 1))');
    // Más rápido que el inicio (75/3500/30/400/600 por defecto).
    expect(pickerSrc).toContain('useTypewriter(cityPhrases, { typeMs: 40, pauseMs: 1800, deleteMs: 15, gapMs: 250, startMs: 300 })');
  });

  it('el placeholder nativo queda vacío y la frase animada va encima del input', () => {
    expect(pickerSrc).toContain('placeholder=""');
    expect(pickerSrc).toContain('typewriter-caret');
    expect(pickerSrc).toContain('TYPEWRITER_CARET_STYLE');
    // Al escribir se esconde la animación; al enfocar se congela.
    expect(pickerSrc).toContain('{!searchQuery && (');
    expect(pickerSrc).toContain('onFocus={() => setFocusedPlaceholder(animatedHint)}');
    // El nombre de la ciudad va en azul para que resalte: «Buscar » en
    // gris y el resto (la ciudad) en azul.
    expect(pickerSrc).toContain('hintText.slice(0, 7)');
    expect(pickerSrc).toContain('hintText.slice(7)');
    expect(pickerSrc).toContain('"#2563EB"');
    // El buscador es igual al del inicio: píldora redondeada y fondo blanco.
    expect(pickerSrc).toContain('borderRadius: 100');
    expect(pickerSrc).toContain('"#FFFFFF"');
  });

  it('en el render se ve el cursor de la máquina de escribir', () => {
    const html = renderPicker();
    expect(html).toContain('▏');
    expect(html).toContain('typewriter-caret');
  });
});
