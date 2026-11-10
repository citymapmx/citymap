import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// Entrega de imágenes más rápida SIN bajar la calidad visible (PR #139,
// PageSpeed móvil /tepic: Rendimiento 67, oportunidad #1 «Mejora la
// entrega de imágenes» 483 KiB). Todo el ahorro viene de servir el ancho
// adecuado por pantalla (srcset/sizes) y de lazy loading bajo el pliegue:
// mismo aspecto en pantalla, menos bytes. Los pósters siguen con
// `contain` para no recortar; el formato sigue siendo WebP (AVIF medido
// en vivo salió MÁS pesado en el Render API de Supabase: 800w AVIF 62 KB
// frente a 43 KB WebP, 400w AVIF 22 KB frente a 15 KB WebP).
describe('imagenes: entrega más rápida sin bajar la calidad', () => {
  const utils = read('../lib/utils.js');
  const optimized = read('../components/ui/OptimizedImage.jsx');
  const progressive = read('../components/ProgressiveImage.jsx');
  const hero = read('../components/home/HomeHero.jsx');
  const banner = read('../components/home/BannerSlider.jsx');
  const events = read('../views/EventsView.jsx');
  const trips = read('../components/TripsView.jsx');
  const businessCard = read('../components/cards/BusinessCard.jsx');
  const globalHome = read('../views/GlobalHomeView.jsx');
  const experienceViewer = read('../components/ExperienceViewer.jsx');
  const surprise = read('../components/SurpriseModal.jsx');
  const menu = read('../components/MenuManager.jsx');

  it('getThumbSrcSet: construye srcset con descriptores de ancho y presets estables', () => {
    expect(utils).toContain('export function getThumbSrcSet');
    expect(utils).toContain('export const SRCSET_THUMB');
    expect(utils).toContain('export const SRCSET_CARD');
    expect(utils).toContain('export const SRCSET_BANNER');
    // Sin al menos 2 candidatos distintos no hay srcset (URLs externas
    // que getThumbUrl no transforma): el <img> queda como antes.
    expect(utils).toContain('if (byUrl.size < 2) return undefined;');
    // El candidato mayor nunca supera el ancho servido hoy: ningún
    // dispositivo descarga más que antes.
    expect(utils).toContain('nunca supera el ancho que ya se servía hoy');
  });

  it('Supabase sigue en WebP: AVIF medido más pesado, no se cambia el formato', () => {
    expect(utils).toContain('format=webp');
    expect(utils).not.toContain('format=avif');
  });

  it('OptimizedImage pasa srcSet y sizes al <img> (y conserva lazy/priority)', () => {
    expect(optimized).toContain('srcSetWidths');
    expect(optimized).toContain('getThumbSrcSet');
    expect(optimized).toContain('srcSet={srcSet}');
    expect(optimized).toContain('sizes={sizes}');
    expect(optimized).toContain('loading={priority ? "eager" : "lazy"}');
    expect(optimized).toContain('fetchPriority={priority ? "high" : "auto"}');
  });

  it('Hero de ciudad: srcset 100vw con prioridad (imagen LCP)', () => {
    expect(hero).toContain('srcSetWidths={SRCSET_CARD}');
    expect(hero).toContain('sizes="100vw"');
    expect(hero).toContain('widthRequest={800} priority');
  });

  it('Banner: srcset 100vw con tope 1400w (ya no baja fijo a 1400w en móvil)', () => {
    expect(banner).toContain('srcSetWidths={SRCSET_BANNER}');
    expect(banner).toContain('sizes="100vw"');
    expect(banner).toContain('widthRequest={1400}');
  });

  it('Pósters de eventos: srcset + objectFit contain (nunca cover)', () => {
    expect(events).toContain('srcSetWidths={SRCSET_CARD}');
    expect(events).toContain("objectFit:'contain'");
    expect(events).not.toContain("objectFit:'cover'");
    // El fondo difuminado sigue usando la misma URL (el navegador la reutiliza).
    expect(events).toContain('getThumbUrl(imgSrc, 600)');
  });

  it('Tarjetas de negocio: srcset en las tres variantes (ProgressiveImage)', () => {
    expect(businessCard).toContain('getThumbSrcSet(thumb.url, SRCSET_THUMB, 400)');
    expect(businessCard).toContain('getThumbSrcSet(thumb.url, SRCSET_CARD, 533)');
    expect(businessCard).toContain('getThumbSrcSet(thumb.url, SRCSET_CARD, 600)');
    expect(progressive).toContain('srcSet={srcSet}');
    expect(progressive).toContain('sizes={sizes}');
    // El placeholder borroso de 20 px no lleva srcset: solo hay un
    // srcSet en todo el archivo, el de la imagen real.
    expect(progressive.split('srcSet={srcSet}').length - 1).toBe(1);
  });

  it('Muro global y Revista: srcset en carrusel, ciudades, tours y artículos', () => {
    expect(globalHome).toContain('srcSetWidths={SRCSET_THUMB}');
    expect(globalHome).toContain('srcSetWidths={SRCSET_CARD}');
    expect(trips).toContain('getThumbSrcSet(photos[0], SRCSET_CARD)');
    expect(trips).toContain('getThumbSrcSet(photos[1], SRCSET_THUMB)');
    expect(trips).toContain('getThumbSrcSet(photos[2], SRCSET_THUMB)');
  });

  it('Lo bajo el pliegue tiene lazy loading', () => {
    expect(trips).toContain('loading="lazy"');
    expect(experienceViewer).toContain('loading="lazy" decoding="async"');
    expect(menu).toContain('loading="lazy" decoding="async"');
  });

  it('Héroe del artículo: fetchpriority high (LCP de Revista)', () => {
    expect(experienceViewer).toContain('fetchPriority="high"');
  });

  it('Sorpréndeme ya no sirve la foto original sin redimensionar', () => {
    expect(surprise).toContain('getThumbUrl(imgSrc, 800)');
    expect(surprise).toContain('getThumbSrcSet(imgSrc, SRCSET_CARD)');
    expect(surprise).not.toContain('<img src={imgSrc}');
  });
});
