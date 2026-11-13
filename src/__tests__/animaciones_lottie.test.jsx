// Animaciones Lottie elegidas por Jonathan (13 nov 2026):
// - Cubos vacíos («Isometric Cubes Empty State Loader», Ision
//   Industries) en los estados vacíos: ciudad sin eventos, búsquedas
//   sin resultados y colecciones vacías de Mis Favoritos.
// - Confeti de logro («Confetti on transparent background», Sportbank
//   Design) una sola vez al completar la tarjeta de lealtad y al
//   canjear un premio (ScanView).
// Las dos son gratuitas (Lottie Simple License) y viven en
// public/lottie/ como .lottie. El motor WASM va empaquetado con la
// app, sin CDN.
import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import LottieAnim from '../components/LottieAnim.jsx';
import EstadoVacio from '../components/EstadoVacio.jsx';
import ConfettiLogro from '../components/ConfettiLogro.jsx';
import { CUBOS_VACIOS_SRC, CONFETTI_LOGRO_SRC } from '../lib/lottieAnimaciones.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const readBin = (p) => readFileSync(new URL(p, import.meta.url));

// Lee un .lottie (ZIP) y devuelve sus entradas infladas por nombre.
function entradasDotLottie(buf) {
  const entradas = {};
  let off = 0;
  while (off + 30 <= buf.length && buf.readUInt32LE(off) === 0x04034b50) {
    const metodo = buf.readUInt16LE(off + 8);
    const tamComp = buf.readUInt32LE(off + 18);
    const tamNom = buf.readUInt16LE(off + 26);
    const tamExtra = buf.readUInt16LE(off + 28);
    const nombre = buf.toString('utf8', off + 30, off + 30 + tamNom);
    const inicioDatos = off + 30 + tamNom + tamExtra;
    const datosComp = buf.subarray(inicioDatos, inicioDatos + tamComp);
    entradas[nombre] = metodo === 8 ? inflateRawSync(datosComp) : datosComp;
    off = inicioDatos + tamComp;
  }
  return entradas;
}

function validarDotLottie(rutaPublic, nombreEsperado) {
  const buf = readBin(`../../public/lottie/${rutaPublic}`);
  expect(buf.subarray(0, 2).toString('ascii')).toBe('PK');
  const entradas = entradasDotLottie(buf);
  expect(Object.keys(entradas)).toContain('manifest.json');
  const manifest = JSON.parse(entradas['manifest.json'].toString('utf8'));
  expect(manifest.animations.length).toBeGreaterThan(0);
  const idAnim = manifest.animations[0].id;
  const anim = JSON.parse(entradas[`animations/${idAnim}.json`].toString('utf8'));
  expect(anim.w).toBeGreaterThan(0);
  expect(anim.h).toBeGreaterThan(0);
  expect(anim.op).toBeGreaterThan(anim.ip || 0);
  expect(anim.layers.length).toBeGreaterThan(0);
  return { buf, anim };
}

const T = {
  text: '#111', sub: '#666', bg: '#fff', white: '#fff', border: '#ddd',
  red: '#DC2626', gold: '#B8872A', green: '#000', greenL: '#F3F4F6',
  shadow: 'none', dark: false,
};

describe('Archivos .lottie en public/lottie', () => {
  it('cubos vacíos: dotLottie válido, ~2 KB', () => {
    const { buf, anim } = validarDotLottie('cubos-vacios.lottie');
    expect(buf.length).toBeLessThan(4096);
    expect(anim.w).toBe(256);
    expect(anim.h).toBe(256);
  });

  it('confeti de logro: dotLottie válido, ~14 KB, vertical', () => {
    const { buf, anim } = validarDotLottie('confetti-logro.lottie');
    expect(buf.length).toBeLessThan(32768);
    expect(anim.h).toBeGreaterThan(anim.w);
  });

  it('las rutas del lib apuntan a los archivos', () => {
    expect(CUBOS_VACIOS_SRC).toBe('/lottie/cubos-vacios.lottie');
    expect(CONFETTI_LOGRO_SRC).toBe('/lottie/confetti-logro.lottie');
  });
});

describe('LottieAnim: reproductor reutilizable', () => {
  it('renderiza un canvas (el reproductor se monta en el cliente)', () => {
    const html = renderToStaticMarkup(<LottieAnim src={CUBOS_VACIOS_SRC} width={120} height={120} ariaLabel="Sin contenido" />);
    expect(html).toContain('<canvas');
  });

  it('sin src no pinta nada', () => {
    expect(renderToStaticMarkup(<LottieAnim src="" />)).toBe('');
  });

  it('el motor WASM va empaquetado, no de CDN', () => {
    const src = read('../components/LottieAnim.jsx');
    expect(src).toContain('dotlottie-player.wasm?url');
    expect(src).toContain('setWasmUrl');
    // Sin URLs de CDN: el comentario nombra jsdelivr/unpkg solo para
    // explicar lo que se evita.
    expect(src).not.toContain('https://cdn.jsdelivr');
    expect(src).not.toContain('https://unpkg.com');
  });

  it('la dependencia está en package.json', () => {
    const pkg = JSON.parse(read('../../package.json'));
    expect(pkg.dependencies['@lottiefiles/dotlottie-react']).toBeTruthy();
  });
});

describe('EstadoVacio: cubos en los 3 estados vacíos', () => {
  it('renderiza título, descripción y botón con el copy que le pasan', () => {
    const html = renderToStaticMarkup(
      <EstadoVacio titulo="En Tepic todavía no hay eventos" descripcion="Pronto habrá novedades" accionLabel="Limpiar filtros" onAccion={() => {}} T={T} />,
    );
    expect(html).toContain('En Tepic todavía no hay eventos');
    expect(html).toContain('Pronto habrá novedades');
    expect(html).toContain('Limpiar filtros');
    expect(html).toContain('<canvas');
  });

  it('sin acción no hay botón', () => {
    const html = renderToStaticMarkup(
      <EstadoVacio titulo="Esta colección está vacía." descripcion="Guarda lugares para que aparezcan aquí." T={T} />,
    );
    expect(html).toContain('Esta colección está vacía.');
    expect(html).not.toContain('<button');
  });

  it('bucle lento y discreto (0.7x)', () => {
    const src = read('../components/EstadoVacio.jsx');
    expect(src).toContain('CUBOS_VACIOS_SRC');
    expect(src).toContain('speed={0.7}');
  });

  it('ciudad sin eventos (HomeEvents) usa EstadoVacio con el mismo mensaje', () => {
    const src = read('../components/home/HomeEvents.jsx');
    expect(src).toContain('EstadoVacio');
    expect(src).toContain('eventos_ciudad_vacia');
    expect(src).toContain('En ${ciudad} todavía no hay eventos');
  });

  it('Eventos sin resultados (EventsView) usa EstadoVacio con el mismo copy y botón', () => {
    const src = read('../views/EventsView.jsx');
    expect(src).toContain('EstadoVacio');
    expect(src).toContain('eventos_sin_resultados');
    expect(src).toContain('eventos_sin_resultados_desc');
    expect(src).toContain('eventos_ciudad_vacia');
    expect(src).toContain('eventos_limpiar_filtros');
    expect(src).toContain('clearFilters');
  });

  it('colección vacía (FavsView) usa EstadoVacio con el mismo copy', () => {
    const src = read('../views/FavsView.jsx');
    expect(src).toContain('EstadoVacio');
    expect(src).toContain('col_vacia_1');
    expect(src).toContain('col_vacia_2');
    expect(src).toContain('Esta colección está vacía.');
    expect(src).toContain('Guarda lugares para que aparezcan aquí.');
  });
});

describe('ConfettiLogro: una sola vez, sin bloquear', () => {
  it('con show=false no pinta nada', () => {
    expect(renderToStaticMarkup(<ConfettiLogro show={false} onDone={() => {}} />)).toBe('');
  });

  it('con show=true pinta la capa fija de pantalla completa', () => {
    const html = renderToStaticMarkup(<ConfettiLogro show onDone={() => {}} />);
    expect(html).toContain('position:fixed');
    expect(html).toContain('pointer-events:none');
    expect(html).toContain('<canvas');
  });

  it('una sola reproducción y desmontaje con temporizador de seguridad', () => {
    const src = read('../components/ConfettiLogro.jsx');
    expect(src).toContain('CONFETTI_LOGRO_SRC');
    expect(src).toContain('loop={false}');
    expect(src).toContain('pointerEvents');
    expect(src).toContain('5000');
  });

  it('ScanView dispara el confeti al completar la tarjeta y al canjear el premio', () => {
    const src = read('../views/ScanView.jsx');
    expect(src).toContain('ConfettiLogro');
    expect(src).toContain('showConfetti');
    // Solo en los dos logros: completar sellos y canjear premio.
    expect(src).toContain('setShowConfetti(true)');
    expect(src).toMatch(/¡Premio entregado![\s\S]*setShowConfetti\(true\)/);
    expect(src).toMatch(/ha completado todos los sellos[\s\S]*setShowConfetti\(true\)/);
    // Los avisos y el flujo de sellos no cambian.
    expect(src).toContain('Sello agregado exitosamente.');
  });
});
