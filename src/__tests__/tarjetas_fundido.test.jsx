import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { Reveal } from '../components/ui/Reveal.jsx';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// Fundido de tarjetas al entrar en pantalla (24 nov 2026, como el de
// tepicsonrie.mx/noche.html): la tarjeta entera pasa de translúcida a
// opaca en ~0.8 s, una sola vez, sin deslizarse ni crecer. Solo opacity,
// así que no mueve el layout ni cambia la altura que Virtuoso mide.

describe('Reveal fadeOnly: fundido puro para tarjetas', () => {
  it('con fadeOnly la clase es reveal + reveal-fade, sin is-visible antes de entrar', () => {
    const html = renderToStaticMarkup(<Reveal fadeOnly><span>tarjeta</span></Reveal>);
    expect(html).toContain('class="reveal reveal-fade"');
    expect(html).toContain('tarjeta');
  });

  it('sin fadeOnly no lleva la clase reveal-fade (el fundido con subida de /negocios no cambia)', () => {
    const html = renderToStaticMarkup(<Reveal><span>texto</span></Reveal>);
    expect(html).toContain('class="reveal"');
    expect(html).not.toContain('reveal-fade');
  });

  it('el CSS global define el fundido: opacidad 0 a 1 en 0.8 s, y sin animar con reducir movimiento', () => {
    const css = read('../index.css');
    expect(css).toContain('.reveal-fade { opacity: 0; transition: opacity .8s ease; }');
    expect(css).toContain('.reveal-fade.is-visible { opacity: 1; }');
    expect(css).toContain('.reveal-fade { opacity: 1; transition: none; }');
  });
});

describe('BusinessCard: las 4 variantes entran con el fundido', () => {
  const src = read('../components/cards/BusinessCard.jsx');

  it('importa Reveal y envuelve la raíz de cada variante con wrapReveal', () => {
    expect(src).toContain('import { Reveal } from "../ui/Reveal.jsx";');
    expect(src).toContain('const wrapReveal = (node) => (reveal ? <Reveal fadeOnly>{node}</Reveal> : node);');
    expect(src.match(/return wrapReveal\(/g)).toHaveLength(4);
  });

  it('el fundido viene activado por defecto y se puede apagar por prop', () => {
    expect(src).toContain('reveal = true');
  });

  it('el slider automático apaga el fundido (ya desliza cada cambio)', () => {
    const slider = read('../components/ui/sliders/AutoSlider.jsx');
    expect(slider).toContain('reveal={false}');
  });
});
