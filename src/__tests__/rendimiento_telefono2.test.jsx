import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync, existsSync } from 'node:fs';
import HomeEvents from '../components/home/HomeEvents.jsx';
import BannerSlider from '../components/home/BannerSlider.jsx';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// PR #202 (Fase 2) — segunda ronda de rendimiento en el teléfono
// (evaluación 11 Nov 2026: Rendimiento móvil 4.5/10; PageSpeed /tepic
// 63 y 55, LCP lab 5.0–5.7 s, CLS lab 0.209–0.438, campo 0.25).
// Medido en local con datos reales (Lighthouse 13, Moto G Power):
// PERF 29/26, LCP 7.1–8.0 s, CLS 0.209–0.212, con dos saltos de la
// tarjeta LUGAR DEL DÍA (0.129 + 0.076) por la sección de eventos y el
// banner. Cada cambio con su número medido está en su prueba.

const baseProps = {
  events: [],
  activeCity: 'tepic',
  userCoords: null,
  dark: false,
  handleEventTap: () => {},
  T: {},
  t: (k, f) => (f !== undefined ? f : k),
  lang: 'es',
  cities: [],
};

describe('Fase 2: la sección de eventos no parpadea al estado vacío', () => {
  it('con dbReady pero sin la secundaria, sigue el esqueleto (no el vacío)', () => {
    const html = renderToStaticMarkup(
      <HomeEvents {...baseProps} dbReady secondaryReady={false} />,
    );
    expect(html).toContain('skel-block');
    expect(html).not.toContain('todavía no hay eventos');
  });

  it('con la secundaria resuelta y sin eventos, aparece el estado vacío honesto', () => {
    const html = renderToStaticMarkup(
      <HomeEvents {...baseProps} dbReady secondaryReady />,
    );
    expect(html).toContain('todavía no hay eventos');
    expect(html).not.toContain('skel-block');
  });

  it('sin dbReady, esqueleto aunque la secundaria ya esté', () => {
    const html = renderToStaticMarkup(
      <HomeEvents {...baseProps} dbReady={false} secondaryReady />,
    );
    expect(html).toContain('skel-block');
  });
});

describe('Fase 2: el banner reserva su hueco mientras carga', () => {
  it('sin banners y cargando, pinta el hueco exacto del banner (21/9)', () => {
    const html = renderToStaticMarkup(
      <BannerSlider activeBanners={[]} loading />,
    );
    expect(html).toContain('aspect-ratio:21/9');
    expect(html).toContain('margin:6px 20px 8px');
    expect(html).toContain('skel-block');
  });

  it('sin banners y sin cargar, no reserva nada', () => {
    const html = renderToStaticMarkup(<BannerSlider activeBanners={[]} />);
    expect(html).toBe('');
  });

  it('con banners, pinta el carrusel y no el hueco del esqueleto', () => {
    const html = renderToStaticMarkup(
      <BannerSlider
        activeBanners={[{ id: 'b1', img_url: 'https://example.com/b.jpg', active: true }]}
      />,
    );
    expect(html).toContain('https://example.com/b.jpg');
    expect(html).not.toContain('skel-block');
  });
});

describe('Fase 2: logo del splash en PNG (61 KB menos en la primera pintura)', () => {
  it('index.html y BrandSplash usan /logo-brand.png, nunca el SVG', () => {
    const indexHtml = read('../../index.html');
    const splash = read('../components/ui/BrandSplash.jsx');
    expect(indexHtml).toContain('/logo-brand.png');
    expect(indexHtml).not.toContain('/logo-brand.svg');
    expect(splash).toContain('/logo-brand.png');
    expect(splash).not.toContain('/logo-brand.svg');
    expect(existsSync(new URL('../../public/logo-brand.png', import.meta.url))).toBe(true);
    expect(existsSync(new URL('../../public/logo-brand.svg', import.meta.url))).toBe(false);
  });
});

describe('Fase 2: sello de verificado sigue en PNG (el WebP queda para un PR aparte)', () => {
  // El WebP (103 KB → 3,3 KB) quedó fuera de este PR: la herramienta de subida no
  // transporta archivos binarios. Las tarjetas siguen apuntando al PNG existente.
  it('las tarjetas usan .png (el .webp llegará en un PR aparte)', () => {
    for (const p of [
      '../components/cards/BusinessCard.jsx',
      '../components/store/BusinessStore.jsx',
      '../views/DetailView.jsx',
    ]) {
      const src = read(p);
      expect(src).toContain('/verificado.png');
      expect(src).not.toContain('/verificado.webp');
    }
  });
});

describe('Fase 2: el modal de detalle no descarga su chunk en la carga inicial', () => {
  it('App.jsx solo monta EventDetailModal cuando hay selectedEvent', () => {
    const app = read('../App.jsx');
    expect(app).toContain('{selectedEvent && <EventDetailModal');
    expect(app).not.toContain('\n          <EventDetailModal ');
  });
});

describe('Fase 2: caché de 1 año para las imágenes de Storage', () => {
  it('STORAGE_CACHE_CONTROL es 1 año (las rutas son inmutables)', () => {
    const supabase = read('../lib/supabase.js');
    expect(supabase).toContain('STORAGE_CACHE_CONTROL = "max-age=31536000"');
    expect(supabase).not.toContain('STORAGE_CACHE_CONTROL = "max-age=86400"');
  });
});
