import React from 'react';
import { describe, expect, it, beforeAll } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { MemoryRouter } from 'react-router-dom';
import TopImperdibles from '../components/home/TopImperdibles.jsx';
import { EXPERIENCIAS_AUTOPLAY_MS, nextExperienciasIndex } from '../lib/experienciasCarousel.js';
import { TRANSLATIONS, ensureEnglishTranslations } from '../lib/i18n.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

const T = { text: '#111', sub: '#666', bg: '#fff', card: '#fff', shadow: 'none', border: '#eee' };

// 5 experiencias reales de Guadalajara (las de la captura de Jonathan),
// con duración en los datos para probar que ya NO se muestra en la tarjeta.
const EXPS = [
  { id: 'exp-1', title: 'Tour de los misterios y leyendas de Guadalajara', city_slug: 'guadalajara', gallery: ['https://example.org/foto1.jpg'], duration: '4 horas' },
  { id: 'exp-2', title: 'Noche de lucha libre, tequila y tour por cantinas', city_slug: 'guadalajara', gallery: ['https://example.org/foto2.jpg'], duration: '3 horas' },
  { id: 'exp-3', title: 'Acuario Michin', city_slug: 'guadalajara', gallery: ['https://example.org/foto3.jpg'], duration: '2 horas' },
  { id: 'exp-4', title: 'Tour de tequila en Tequila', city_slug: 'guadalajara', gallery: ['https://example.org/foto4.jpg'], duration: '6 horas' },
  { id: 'exp-5', title: 'Lago de Chapala', city_slug: 'guadalajara', gallery: ['https://example.org/foto5.jpg'], duration: '5 horas' },
];

function renderExperiences(experiences = EXPS) {
  return renderToStaticMarkup(
    <MemoryRouter>
      <TopImperdibles experiences={experiences} T={T} city={{ slug: 'guadalajara', name: 'Guadalajara' }} />
    </MemoryRouter>
  );
}

beforeAll(async () => {
  await ensureEnglishTranslations();
});

describe('Experiencias destacadas: título nuevo (PR #237)', () => {
  it('el título es «Experiencias destacadas», sin ciudad y sin el nombre viejo', () => {
    const html = renderExperiences();
    expect(html).toContain('Experiencias destacadas');
    expect(html).not.toContain('Los 5 imperdibles de');
    // El título exacto es solo el nombre nuevo (sin «de Guadalajara»):
    // la ciudad sí puede aparecer dentro de los títulos de las tarjetas.
    expect(html).toContain('>Experiencias destacadas</h2>');
    expect(html).not.toContain('Experiencias destacadas de');
  });

  it('la clave existe en español e inglés', () => {
    expect(TRANSLATIONS.es['home_experiencias_destacadas']).toBe('Experiencias destacadas');
    expect(TRANSLATIONS.en['home_experiencias_destacadas']).toBe('Featured experiences');
    expect(TRANSLATIONS.es['home_ver_experiencia']).toBe('Ver experiencia');
    expect(TRANSLATIONS.en['home_ver_experiencia']).toBe('Show experience');
  });

  it('las claves viejas ya no existen en ningún idioma', () => {
    const es = read('../lib/i18n.js');
    const en = read('../lib/i18n-en.js');
    for (const content of [es, en]) {
      expect(content).not.toContain('home_imperdibles_de');
      expect(content).not.toContain('home_la_ciudad');
    }
  });
});

describe('Experiencias destacadas: carrusel horizontal automático', () => {
  it('la lista es un carrusel con scroll-snap, no una columna vertical', () => {
    const html = renderExperiences();
    expect(html).toContain('scroll-snap-type:x mandatory');
    expect(html).toContain('overflow-x:auto');
    expect(html).toContain('scroll-snap-align:center');
    expect(html).not.toContain('flex-direction:column');
    // La región del carrusel se anuncia como tal.
    expect(html).toContain('aria-roledescription="carrusel"');
  });

  it('tiene 5 puntos de posición, el primero activo', () => {
    const html = renderExperiences();
    for (let i = 1; i <= 5; i++) {
      expect(html).toContain(`aria-label="Ver experiencia ${i} de 5"`);
    }
    expect(html).toContain('aria-current="true"');
  });

  it('con una sola experiencia no hay puntos', () => {
    const html = renderExperiences([EXPS[0]]);
    expect(html).not.toContain('aria-label="Ver experiencia');
  });

  it('el avance automático es cada 4.5 s y da la vuelta en bucle', () => {
    expect(EXPERIENCIAS_AUTOPLAY_MS).toBe(4500);
    expect(nextExperienciasIndex(0, 5)).toBe(1);
    expect(nextExperienciasIndex(4, 5)).toBe(0);
    expect(nextExperienciasIndex(2, 5)).toBe(3);
    expect(nextExperienciasIndex(0, 0)).toBe(0);
  });

  it('el cableado del autoplay está en el componente', () => {
    const src = read('../components/home/TopImperdibles.jsx');
    expect(src).toContain('setInterval');
    expect(src).toContain('EXPERIENCIAS_AUTOPLAY_MS');
    // Se pausa al interactuar, al esconder la pestaña y con
    // prefers-reduced-motion (mismo patrón que EventCoverflow).
    expect(src).toContain('onPointerDown');
    expect(src).toContain('onPointerUp');
    expect(src).toContain('visibilitychange');
    expect(src).toContain("prefers-reduced-motion: reduce");
    // Los puntos saltan a la tarjeta tocada.
    expect(src).toContain('goTo(i)');
  });
});

describe('Experiencias destacadas: tarjetas sin número ni duración', () => {
  it('la duración de los datos NO se muestra en la tarjeta', () => {
    const html = renderExperiences();
    expect(html).not.toContain('⏱');
    expect(html).not.toContain('4 horas');
    expect(html).not.toContain('3 horas');
    expect(html).not.toContain('2 horas');
    // Y el componente ya no la calcula.
    const src = read('../components/home/TopImperdibles.jsx');
    expect(src).not.toContain('tourDurationLabel');
  });

  it('las tarjetas ya no llevan el círculo con el número 1-5', () => {
    const html = renderExperiences();
    // El número viejo se pintaba como texto dentro de la tarjeta
    // («>1<», «>2<»...); los puntos usan aria-label, no texto.
    for (let i = 1; i <= 5; i++) {
      expect(html).not.toContain(`>${i}<`);
    }
    const src = read('../components/home/TopImperdibles.jsx');
    expect(src).not.toContain('index + 1');
  });

  it('la tarjeta conserva foto llena, título y el tap al detalle', () => {
    const html = renderExperiences();
    expect(html).toContain('https://example.org/foto1.jpg');
    expect(html).toContain('Tour de los misterios y leyendas de Guadalajara');
    expect(html).toContain('href="/revista/guadalajara/tour-de-los-misterios-y-leyendas-de-guadalajara"');
  });
});
