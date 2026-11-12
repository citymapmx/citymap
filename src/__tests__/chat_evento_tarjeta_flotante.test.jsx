import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import PrivateEventChat from '../components/detail/PrivateEventChat.jsx';

const T = {
  text: '#0F1A14', sub: '#6B7280', bg: '#FFFFFF', border: '#E5E7EB', white: '#FFFFFF',
  green: '#000000', greenL: '#F3F4F6', greenD: '#222222', card: '#FFFFFF',
  shadow: '0 2px 16px rgba(0,0,0,.07)', dark: false,
};

const event = { id: 'ev1', user_id: 'host1' };

function renderChat(props = {}) {
  return renderToStaticMarkup(
    <PrivateEventChat event={event} T={T} dark={false} toast$={() => {}} onCountChange={() => {}} {...props} />,
  );
}

// La tarjeta es el único elemento con border-radius:24px: extrae su style.
function cardStyle(html) {
  const m = html.match(/style="([^"]*border-radius:24px[^"]*)"/);
  expect(m).not.toBeNull();
  return m[1];
}

// 11 nov 2026 (Jonathan): todo el chat del evento privado (mensajes +
// barra para escribir) va dentro de UNA tarjeta flotante. Las
// pestañas, el botón de enlace secreto y la nota de evento privado quedan
// fuera. Rediseño estilo WhatsApp (nov 2026): dentro de la tarjeta el
// fondo es el de la paleta (#F7F7F5 en claro, #0B141A en oscuro), no el
// blanco de la tarjeta original.
describe('chat del evento privado: tarjeta flotante', () => {
  it('en modo claro la tarjeta lleva el fondo del chat #F7F7F5, con borde y sombra suave', () => {
    const style = cardStyle(renderChat());
    expect(style).toContain('background:#F7F7F5');
    expect(style).toContain('border:1px solid #E5E7EB');
    expect(style).toContain('border-radius:24px');
    expect(style).toContain('box-shadow:0 10px 32px rgba(15,23,42,0.10)');
  });

  it('la tarjeta contiene la lista de mensajes y la barra para escribir', () => {
    const html = renderChat();
    const cardAt = html.indexOf('border:1px solid #E5E7EB;border-radius:24px');
    expect(cardAt).toBeGreaterThan(-1);
    // La lista de mensajes va dentro de la tarjeta, y la barra de escribir
    // después de la lista, también dentro.
    expect(html.indexOf('chat-scroll')).toBeGreaterThan(cardAt);
    expect(html.indexOf('aria-label="Enviar mensaje"')).toBeGreaterThan(html.indexOf('chat-scroll'));
    expect(html).toContain('Aún no hay mensajes');
    expect(html).toContain('aria-label="Mensaje"');
  });

  it('en modo oscuro la tarjeta lleva el fondo del chat #0B141A, nunca blanco', () => {
    const html = renderToStaticMarkup(
      <PrivateEventChat event={event} T={T} dark={true} toast$={() => {}} onCountChange={() => {}} />,
    );
    const style = cardStyle(html);
    expect(style).toContain('background:#0B141A');
    expect(style).not.toContain('background:#FFFFFF');
  });

  it('las pestañas y el botón de enlace secreto quedan fuera de la tarjeta (modal)', () => {
    const src = readFileSync(new URL('../components/modals/EventDetailModal.jsx', import.meta.url), 'utf8');
    const chatAt = src.indexOf('<PrivateEventChat');
    expect(chatAt).toBeGreaterThan(-1);
    // Las pestañas se pintan antes del chat y el botón de enlace secreto
    // (y la nota de evento privado) después: son hermanos, no están
    // dentro del componente del chat.
    expect(src.indexOf('eventos_tab_chat')).toBeLessThan(chatAt);
    expect(src.indexOf('eventos_copiar_enlace_secreto')).toBeGreaterThan(chatAt);
    expect(src.indexOf('eventos_privado_solo_enlace')).toBeGreaterThan(chatAt);
  });

  it('el mensaje fijado sigue fuera de la tarjeta, encima de ella', () => {
    const src = readFileSync(new URL('../components/detail/PrivateEventChat.jsx', import.meta.url), 'utf8');
    // El banner de fijado se pinta antes del contenedor de la tarjeta
    // (la sombra '0 10px 32px' solo vive en el contenedor de la tarjeta).
    expect(src.indexOf('eventos_mensaje_fijado')).toBeLessThan(src.indexOf("boxShadow: '0 10px 32px rgba(15,23,42,0.10)'"));
  });
});
