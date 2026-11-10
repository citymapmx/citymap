import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// Demo #3 "Esqueletos con brillo mientras carga" y demo #13 "La galería
// cambia sola con un fundido", elegidas por Jonathan de "15 animaciones
// para citymap", nov 2026. #3: las siluetas de las tarjetas con una banda
// de luz diagonal (~1,3 s) mientras cargan las listas. #13: la galería
// de fotos de la ficha de negocio avanza sola cada 3 s con fundido y
// puntos (SOLO ahí: la portada de evento tiene una sola foto y queda
// manual). El diseño no cambia: solo se añaden estas dos cosas.
describe('esqueleto con brillo (#3) y galeria con fundido (#13)', () => {
  const css = read('../index.css');
  const skeleton = read('../components/ui/Skeleton.jsx');
  const events = read('../views/EventsView.jsx');
  const trips = read('../components/TripsView.jsx');
  const gallery = read('../components/Gallery.jsx');
  const modals = read('../components/GalleryModals.jsx');
  const poster = read('../components/detail/EventPoster.jsx');
  const eventModal = read('../components/modals/EventDetailModal.jsx');

  it('defines the skeleton shimmer band in index.css (diagonal, 1.3 s)', () => {
    expect(css).toContain('@keyframes skeleton-shimmer');
    expect(css).toContain('.skel-shimmer');
    expect(css).toContain('animation: skeleton-shimmer 1.3s linear infinite');
    // Banda diagonal de luz.
    expect(css).toContain('linear-gradient(105deg');
    expect(css).toContain('translateX(-100%)');
    expect(css).toContain('translateX(100%)');
  });

  it('disables the shimmer with prefers-reduced-motion', () => {
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reduced).toContain('.skel-shimmer');
    expect(reduced).toContain('animation: none');
  });

  it('Skeleton: the base block and the card carry the shimmer band', () => {
    expect(skeleton).toContain('className="skel-shimmer"');
    // CardSk: una sola banda sobre toda la tarjeta.
    expect(skeleton).toContain('Banda de luz diagonal (demo #3)');
  });

  it('EventsView: skeleton grid while events load, not "Sin eventos por ahora"', () => {
    expect(events).toContain('EventGridSk');
    expect(events).toContain('!dbReady && !hasActiveFilters');
    expect(skeleton).toContain('export function EventGridSk');
    // La silueta tiene la forma de la tarjeta real de evento: póster 5:7.
    expect(skeleton).toContain('aspectRatio: "5 / 7"');
  });

  it('TripsView: article skeleton while articles load', () => {
    expect(trips).toContain('ArticleSk');
    expect(trips).toContain('!dbReady ? (');
    expect(skeleton).toContain('export function ArticleSk');
    // La silueta tiene la forma de la tarjeta real de artículo: collage 21/9.
    expect(skeleton).toContain('aspectRatio: "21 / 9"');
  });

  it('Gallery: autoplay every 3 s with crossfade and dots, off by default', () => {
    expect(gallery).toContain('autoplay = false');
    expect(gallery).toContain('AUTOPLAY_MS = 3000');
    expect(gallery).toContain('setTimeout(() => setI(x => (x + 1) % total), AUTOPLAY_MS)');
    // Fundido: la foto saliente queda debajo y la nueva entra en 0,6 s.
    expect(gallery).toContain('prevUrl');
    expect(gallery).toContain('transition: "opacity 0.6s ease-out"');
    // Puntos indicadores de la foto activa.
    expect(gallery).toContain('role="tablist"');
    expect(gallery).toContain('Foto ${j + 1} de ${total}');
    // Cada cambio de foto reinicia el conteo de 3 s (el automático no
    // pelea con el usuario).
    expect(gallery).toContain('}, [canAutoplay, i, total]);');
  });

  it('Gallery: no autoplay with prefers-reduced-motion, zoom or hidden tab', () => {
    expect(gallery).toContain('prefersReducedMotion');
    expect(gallery).toContain('!reduceMotion');
    expect(gallery).toContain('!zoom');
    expect(gallery).toContain('visibilitychange');
    expect(gallery).toContain('document.hidden');
  });

  it('Gallery: manual navigation is preserved (arrows, swipe, thumbnails)', () => {
    expect(gallery).toContain('Foto anterior');
    expect(gallery).toContain('Foto siguiente');
    expect(gallery).toContain('onTouchEnd');
    expect(gallery).toContain('thumbsRef');
  });

  it('#13 scope: the event cover stays manual, autoplay only for business photos', () => {
    // La portada de evento no tiene avance automático.
    expect(poster).not.toContain('autoplay');
    expect(eventModal).not.toContain('autoplay');
    // La galería del menú tampoco.
    expect(modals).toContain('<Gallery photos={menuUrls} h="100dvh" fit="contain" bg="transparent" />');
    // La galería de fotos del negocio sí, y solo cuando hay varias fotos.
    expect(modals).toContain('autoplay={!!selected && !selectedEvent && galleryPhotos.length > 1}');
  });
});
