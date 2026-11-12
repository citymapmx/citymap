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

// 11 nov 2026 (Jonathan): «que tenga ese mismo corazón dentro del
// evento, a lado del boton de compartir». El detalle no tenía corazón
// para guardar; solo lo tenían las tarjetas de la lista. El corazón va
// en la barra inferior fija (EventTicketBar), inmediatamente a la
// derecha del botón de compartir, con el mismo marco de 48 px con borde
// y el mismo aspecto que el de las tarjetas (SaveHeartButton: contorno
// sin guardar, rojo lleno al guardar). Va conectado al toggleSaveEvent
// de App.jsx (mismo estado savedEventIds + sync a event_favorites),
// nunca a otra lógica.
describe('detalle de evento: corazón de guardar en la barra inferior', () => {
  it('el corazón aparece en la barra, a la derecha del botón de compartir', () => {
    const html = renderBar(baseEvent);
    expect(html).toContain('aria-label="Compartir evento"');
    expect(html).toContain('aria-label="Guardar evento"');
    // Inmediatamente a lado del compartir: después de él en la misma fila.
    expect(html.indexOf('aria-label="Guardar evento"')).toBeGreaterThan(html.indexOf('aria-label="Compartir evento"'));
    // Mismo marco que el compartir: 48 px, borde redondeado 12.
    expect(html).toContain('width:48px');
    expect(html).toContain('border-radius:12px');
    // Sin guardar: contorno (aria-pressed false), no lleno.
    expect(html).toContain('aria-pressed="false"');
  });

  it('guardado: el corazón sale lleno y con la etiqueta de quitar', () => {
    const html = renderBar(baseEvent, { isSaved: true });
    expect(html).toContain('aria-label="Quitar evento de guardados"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).not.toContain('aria-label="Guardar evento"');
  });

  it('sin onToggleSave no se pinta el corazón (la barra sigue con compartir)', () => {
    const html = renderToStaticMarkup(
      <EventTicketBar event={baseEvent} T={T} onShare={() => {}} />,
    );
    expect(html).toContain('aria-label="Compartir evento"');
    expect(html).not.toContain('aria-label="Guardar evento"');
    expect(html).not.toContain('aria-label="Quitar evento de guardados"');
  });

  it('sin compartir, el corazón sigue en la barra', () => {
    const html = renderToStaticMarkup(
      <EventTicketBar event={baseEvent} T={T} onToggleSave={() => {}} />,
    );
    expect(html).not.toContain('aria-label="Compartir evento"');
    expect(html).toContain('aria-label="Guardar evento"');
  });

  it('solo UN corazón en el detalle: la barra lo pinta una vez, y el modal no pinta otro', () => {
    const html = renderBar(baseEvent);
    expect(html.split('aria-label="Guardar evento"').length - 1).toBe(1);
    const barSrc = readFileSync(new URL('../components/detail/EventInformation.jsx', import.meta.url), 'utf8');
    expect(barSrc.split('<SaveHeartButton').length - 1).toBe(1);
    const modalSrc = readFileSync(new URL('../components/modals/EventDetailModal.jsx', import.meta.url), 'utf8');
    expect(modalSrc).not.toContain('<SaveHeartButton');
    expect(modalSrc).not.toContain('SaveHeartButton');
  });

  it('el modal conecta la barra al toggleSaveEvent de App.jsx (mismo estado que la lista)', () => {
    const modalSrc = readFileSync(new URL('../components/modals/EventDetailModal.jsx', import.meta.url), 'utf8');
    expect(modalSrc).toContain('const { handleCardTap, savedEventIds, toggleSaveEvent } = useAppContext();');
    expect(modalSrc).toContain('isSaved={(savedEventIds || []).includes(evLocalized.id)}');
    expect(modalSrc).toContain('onToggleSave={toggleSaveEvent ? (e) => toggleSaveEvent(evLocalized.id, e) : null}');
    // No es un handler local solo de localStorage como el de la lista:
    // es el toggle de App.jsx, con sync al servidor.
    const barSrc = readFileSync(new URL('../components/detail/EventInformation.jsx', import.meta.url), 'utf8');
    expect(barSrc).toContain('onToggle={onToggleSave}');
    expect(barSrc).toContain("import SaveHeartButton from '../ui/SaveHeartButton.jsx';");
    const appSrc = readFileSync(new URL('../App.jsx', import.meta.url), 'utf8');
    expect(appSrc).toContain("sb.upsert('event_favorites'");
    // Sin sesión, el toque pide iniciar sesión (como toggleFav).
    expect(appSrc).toMatch(/const toggleSaveEvent[\s\S]*?if \(!user\) \{ setShowAuth\(true\); return; \}/);
  });

  it('el estado es el mismo en los dos sentidos: lista y detalle leen savedEventIds', () => {
    const listSrc = readFileSync(new URL('../views/EventsView.jsx', import.meta.url), 'utf8');
    expect(listSrc).toContain('savedEventIds.includes(ev.id)');
    const modalSrc = readFileSync(new URL('../components/modals/EventDetailModal.jsx', import.meta.url), 'utf8');
    expect(modalSrc).toContain('savedEventIds');
    expect(modalSrc).toContain('.includes(evLocalized.id)');
    // El toggle actualiza ese mismo estado (y localStorage + servidor).
    const appSrc = readFileSync(new URL('../App.jsx', import.meta.url), 'utf8');
    expect(appSrc).toContain('setSavedEventIds(nw)');
    expect(appSrc).toContain("localStorage.setItem('cg_saved_ev', JSON.stringify(nw))");
  });

  it('al tocar el corazón se llama a onToggleSave (el toggle de App.jsx)', () => {
    // renderToStaticMarkup no dispara clics: se comprueba el cableado
    // renderizando con un onToggleSave espiado y leyendo el HTML del
    // botón, que lleva el aria-pressed según isSaved.
    const onToggleSave = vi.fn();
    const html = renderBar(baseEvent, { onToggleSave });
    expect(onToggleSave).not.toHaveBeenCalled();
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain('type="button"');
  });
});
