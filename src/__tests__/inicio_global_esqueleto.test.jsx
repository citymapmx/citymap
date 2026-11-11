import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { CoverflowSk } from '../components/ui/Skeleton.jsx';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// Esqueleto de la rueda en el inicio global (`/`), elegido por Jonathan
// 11 Nov 2026 ~11:42. La rueda no tenía hueco reservado mientras cargaban
// los datos: al llegar los eventos aparecía de golpe (355 px en el
// teléfono) y empujaba todo lo de abajo. Medido en local con datos reales
// (Lighthouse 13, Moto G Power, antes del cambio): PERF 32/33, CLS lab
// 0.124–0.125, con un salto dominante de 0.122 que resultó ser el héroe
// (la fuente Montserrat: el saludo pasa de 1 a 2 líneas al cargar —
// comprobado bloqueando fonts.googleapis.com: el CLS cae a 0.020). El
// hueco de la rueda es el salto que queda en cada visita con la fuente
// ya en caché: los datos llegan asíncronos siempre, la fuente no.
// El esqueleto es el mismo de /tepic (Fase 2, PR #203), con su medida real.

describe('inicio global: la rueda tiene su esqueleto mientras carga', () => {
  it('GlobalHomeView usa CoverflowSk en el bloque de carga', () => {
    const src = read('../views/GlobalHomeView.jsx');
    expect(src).toContain("import { CoverflowSk } from '../components/ui/Skeleton.jsx'");
    expect(src).toContain('<CoverflowSk dark={dark} />');
  });

  it('el esqueleto de la rueda va en su sitio: tras Explora y antes de las demás secciones', () => {
    const src = read('../views/GlobalHomeView.jsx');
    const loadingStart = src.indexOf('{loading && (');
    expect(loadingStart).toBeGreaterThan(-1);
    const loadingBlock = src.slice(loadingStart);
    const exploraSk = loadingBlock.indexOf('home_explora_por_ciudad');
    const wheelSk = loadingBlock.indexOf('<CoverflowSk dark={dark} />');
    const wallSk = loadingBlock.indexOf('Esqueletos de las secciones del muro');
    expect(exploraSk).toBeGreaterThan(-1);
    expect(wheelSk).toBeGreaterThan(exploraSk);
    expect(wallSk).toBeGreaterThan(wheelSk);
  });

  it('CoverflowSk mide como la rueda real (355 px en el teléfono, 399 px en escritorio, +32 px)', () => {
    const html = renderToStaticMarkup(<CoverflowSk dark={false} />);
    // Encabezado de una línea (26 px) + tambor (262 px teléfono / 306 px
    // escritorio) + pie (puntos 8 px + nombre 21 px) = 355 px en el
    // teléfono; la rueda real mide 355 px (medido en vivo en / y /tepic
    // a 412 px) con margin 0 0 32px (.event-wheel).
    expect(html).toContain('height:26px');
    expect(html).toContain('height: 262px');
    expect(html).toContain('height: 306px');
    expect(html).toContain('height:8px');
    expect(html).toContain('height:21px');
    expect(html).toContain('margin:0 0 32px');
  });

  it('sin eventos próximos no hay rueda (el hueco solo existe mientras carga)', () => {
    // El esqueleto vive dentro del bloque {loading && ...}: cuando la
    // carga termina, desaparece con los demás esqueletos. La rueda solo
    // se pinta si hay eventos, así que sin eventos no queda un hueco
    // vacío de 355 px en la página cargada.
    const src = read('../views/GlobalHomeView.jsx');
    expect(src).toContain('{upcomingEvents.length > 0 && (');
    const wheelRender = src.indexOf('{upcomingEvents.length > 0 && (');
    const wheelSk = src.indexOf('<CoverflowSk dark={dark} />');
    expect(wheelSk).toBeGreaterThan(-1);
    expect(wheelRender).toBeGreaterThan(wheelSk);
  });
});
