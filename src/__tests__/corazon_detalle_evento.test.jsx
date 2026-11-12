import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { EventTicketBar } from '../components/detail/EventInformation.jsx';

const T = {
  text: '#111', sub: '#666', bg: '#fff', border: '#ddd', white: '#fff',
  shadow: 'none', dark: false, green: '#000', greenD: '#000',
};

const baseEvent = {
  id: 'ev1',
  title: 'Concierto de prueba',
  date: '2026-12-11',
  time: '21:00',
  venue_name: 'Auditorio Telmex',
  venue_address: 'Av. Patria 1, Zapopan',
  price: 850,
  price_type: 'paid',
  description: 'Un concierto de prueba.',
  booking_config: {
    enabled: true,
    type: 'external',
    externalLinks: [{ platform: 'comprar_entradas', url: 'https://ticketmaster.com.mx/evento' }],
  },
};

function renderBar(event, props = {}) {
  return renderToStaticMarkup(
    <EventTicketBar event={event} T={T} onShare={() => {}} onToggleSave={() => {}} {...props} />,
  );
}

const modalSrc = () => readFileSync(new URL('../components/modals/EventDetailModal.jsx', import.meta.url), 'utf8');
const barSrc = () => readFileSync(new URL('../components/detail/EventInformation.jsx', import.meta.url), 'utf8');
const heartSrc = () => readFileSync(new URL('../components/ui/SaveHeartButton.jsx', import.meta.url), 'utf8');

// 11 nov 2026 (Jonathan, corrección del #216): «El corazón era arriba
// en la parte superior y con el diseño de las tarjetas premium es el
// corazón con trazo blanco, debe tener la animación que desprende
// partículas». El #216 lo había puesto en la barra inferior fija
// ([COMPRAR BOLETOS] [compartir] [corazón]); Jonathan lo vio ahí en
// vivo y lo quiere ARRIBA, sobre la foto, a lado del compartir (a su
// izquierda), con el diseño de las tarjetas de la lista (trazo blanco,
// rojo lleno al guardar) y la animación de partículas al guardar.
describe('detalle de evento: corazón de guardar arriba, sobre la foto', () => {
  it('la barra inferior ya NO lleva corazón (vuelve a ser solo boletos + compartir)', () => {
    const html = renderBar(baseEvent);
    expect(html).toContain('aria-label="Compartir evento"');
    expect(html).toContain('Comprar boletos');
    expect(html).not.toContain('aria-label="Guardar evento"');
    expect(html).not.toContain('aria-label="Quitar evento de guardados"');
    // Aunque se le pase onToggleSave, la barra ya no lo acepta.
    expect(html).not.toContain('aria-pressed');
    expect(barSrc()).not.toContain('SaveHeartButton');
    expect(barSrc()).not.toContain('onToggleSave');
    expect(barSrc()).not.toContain('isSaved');
  });

  it('el corazón está arriba, sobre la foto, inmediatamente a la IZQUIERDA del compartir', () => {
    const src = modalSrc();
    // En el héroe, después del botón flotante de compartir.
    expect(src.indexOf('<SaveHeartButton')).toBeGreaterThan(src.indexOf('Floating Share Button'));
    expect(src.indexOf('<SaveHeartButton')).toBeLessThan(src.indexOf('El anfitrión del evento privado'));
    // Compartir a right:16 y el corazón a right:64 (16 + 40 + 8 de
    // separación): misma fila superior, corazón a la izquierda.
    expect(src).toContain('right: 16, width: 40, height: 40');
    expect(src).toContain('right: 64, width: 40, height: 40');
    // Compartir y atrás SÍ conservan su círculo oscuro con blur.
    expect(src).toContain('background: "rgba(0,0,0,0.35)"');
    expect(src).toContain('backdropFilter: "blur(6px)"');
    // Misma altura superior que el compartir.
    expect(src).toContain('top: "calc(env(safe-area-inset-top, 0px) + 16px)", right: 64');
    // Pero el CORAZÓN no lleva círculo detrás (nov 2026, Jonathan):
    // solo el corazón directo sobre la foto.
    const heartBlock = src.slice(src.indexOf('<SaveHeartButton'), src.indexOf('/>', src.indexOf('<SaveHeartButton')));
    expect(heartBlock).not.toContain('background');
    expect(heartBlock).not.toContain('rgba(0,0,0');
    expect(heartBlock).not.toContain('backdropFilter');
    expect(heartBlock).not.toContain('borderRadius');
  });

  it('las tarjetas de la lista tampoco llevan círculo detrás del corazón', () => {
    // Nov 2026 (Jonathan): «En esta parte quitale circulo negro al
    // corazón» — en la lista el corazón va directo sobre la foto.
    const listSrc = readFileSync(new URL('../views/EventsView.jsx', import.meta.url), 'utf8');
    const heartBlock = listSrc.slice(listSrc.indexOf('<SaveHeartButton'), listSrc.indexOf('/>', listSrc.indexOf('<SaveHeartButton')));
    expect(heartBlock).not.toContain('background');
    expect(heartBlock).not.toContain('rgba(0,0,0');
    expect(heartBlock).not.toContain('borderRadius');
    // Sigue siendo el mismo SaveHeartButton con overlay (trazo blanco).
    expect(heartBlock).toContain('overlay');
  });

  it('diseño de las tarjetas: SaveHeartButton con overlay (trazo blanco)', () => {
    const src = modalSrc();
    expect(src).toContain('<SaveHeartButton');
    // overlay: el icono heart_overlay (trazo blanco) sin guardar y
    // heart_overlay_f (rojo lleno, trazo blanco) al guardar.
    expect(src).toContain('overlay');
    const heart = heartSrc();
    expect(heart).toContain('heart_overlay');
    expect(heart).toContain('heart_overlay_f');
    // El trazo blanco vive en los iconos (Icon.jsx).
    const iconSrc = readFileSync(new URL('../components/ui/Icon.jsx', import.meta.url), 'utf8');
    expect(iconSrc).toContain('stroke="#fff"');
  });

  it('al guardar suelta la animación de partículas (la misma de las tarjetas)', () => {
    // El corazón del detalle es el SaveHeartButton compartido, que
    // monta HeartBurst (10 chispitas) solo al pasar a guardado.
    const heart = heartSrc();
    expect(heart).toContain('<HeartBurst burstKey={burstKey} />');
    expect(heart).toContain('useSaveBurst(isFav)');
    const burst = readFileSync(new URL('../hooks/useSaveBurst.js', import.meta.url), 'utf8');
    expect(burst).toContain('if (!prevRef.current && isFav) setBurstKey');
    const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8');
    expect(css).toContain('.heart-burst');
    expect(css).toContain('.heart-spark');
    expect(css).toContain('@keyframes heart-spark-fly');
  });

  it('solo UN corazón en el detalle: arriba; la barra no pinta otro', () => {
    const src = modalSrc();
    expect(src.split('<SaveHeartButton').length - 1).toBe(1);
    expect(barSrc().split('<SaveHeartButton').length - 1).toBe(0);
    expect(src).not.toContain('onToggleSave=');
    expect(src).not.toContain('isSaved={');
  });

  it('el modal conecta el corazón de arriba al toggleSaveEvent de App.jsx (mismo estado que la lista)', () => {
    const src = modalSrc();
    expect(src).toContain('const { handleCardTap, savedEventIds, toggleSaveEvent } = useAppContext();');
    expect(src).toContain('const isSaved = (savedEventIds || []).includes(evLocalized.id);');
    expect(src).toContain('onToggle={(e) => toggleSaveEvent(evLocalized.id, e)}');
    expect(src).toContain('isFav={isSaved}');
    // No es un handler local solo de localStorage: es el toggle de
    // App.jsx, con sync al servidor.
    const appSrc = readFileSync(new URL('../App.jsx', import.meta.url), 'utf8');
    expect(appSrc).toContain("sb.upsert('event_favorites'");
    // Sin sesión, el toque pide iniciar sesión (como toggleFav).
    expect(appSrc).toMatch(/const toggleSaveEvent[\s\S]*?if \(!user\) \{ setShowAuth\(true\); return; \}/);
  });

  it('el estado es el mismo en los dos sentidos: lista y detalle leen savedEventIds', () => {
    const listSrc = readFileSync(new URL('../views/EventsView.jsx', import.meta.url), 'utf8');
    expect(listSrc).toContain('savedEventIds.includes(ev.id)');
    const src = modalSrc();
    expect(src).toContain('savedEventIds');
    expect(src).toContain('.includes(evLocalized.id)');
    // El toggle actualiza ese mismo estado (y localStorage + servidor).
    const appSrc = readFileSync(new URL('../App.jsx', import.meta.url), 'utf8');
    expect(appSrc).toContain('setSavedEventIds(nw)');
    expect(appSrc).toContain("localStorage.setItem('cg_saved_ev', JSON.stringify(nw))");
  });

  it('al tocar el corazón se llama a onToggle (el toggle de App.jsx)', () => {
    // renderToStaticMarkup no dispara clics: se comprueba el cableado
    // leyendo la fuente del modal (isFav + onToggle en el botón).
    const src = modalSrc();
    expect(src).toContain('isFav={isSaved}');
    expect(src).toContain('onToggle={(e) => toggleSaveEvent(evLocalized.id, e)}');
    // La barra ya no recibe el toggle: no hay doble corazón.
    expect(src).toContain('<EventTicketBar event={evLocalized} T={T} hideTickets={isPast} onShare={() => setShowShareCard(true)} />');
    const onToggleSave = vi.fn();
    const html = renderBar(baseEvent, { onToggleSave });
    expect(onToggleSave).not.toHaveBeenCalled();
    expect(html).not.toContain('aria-label="Guardar evento"');
  });
});
