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
const src = readFileSync(new URL('../components/detail/PrivateEventChat.jsx', import.meta.url), 'utf8');

function renderChat(dark) {
  return renderToStaticMarkup(
    <PrivateEventChat event={event} T={T} dark={dark} toast$={() => {}} onCountChange={() => {}} />,
  );
}

// Rediseño del chat estilo WhatsApp (Jonathan, 11 nov 2026): UN solo
// diseño para todos los eventos, paleta exacta por modo, sin opciones de
// personalización. Solo visual: la lógica (enviar, reacciones, fijar,
// borrar, aviso a participantes, sondeo) no se toca.
describe('chat de eventos: rediseño estilo WhatsApp', () => {
  it('paleta clara exacta en el código', () => {
    expect(src).toContain("chatBg: '#F7F7F5'");
    expect(src).toContain("ownBubble: '#DCF8C6'");
    expect(src).toContain("otherBubble: '#FFFFFF'");
    expect(src).toContain("text: '#111111'");
    expect(src).toContain("sub: '#667085'");
    expect(src).toContain("border: '#E5E7EB'");
    expect(src).toContain("dateSep: '#E9EDEF'");
  });

  it('paleta oscura exacta en el código', () => {
    expect(src).toContain("chatBg: '#0B141A'");
    expect(src).toContain("ownBubble: '#005C4B'");
    expect(src).toContain("otherBubble: '#202C33'");
    expect(src).toContain("text: '#F5F5F5'");
    expect(src).toContain("sub: '#AEBAC1'");
    expect(src).toContain("border: '#303D45'");
    expect(src).toContain("dateSep: '#37434A'");
  });

  it('el modo lo decide el flag dark que ya usa la app, sin selector nuevo', () => {
    expect(src).toContain('const C = dark ?');
    expect(src).not.toContain('luma');
    expect(src).not.toContain('theme');
    expect(src).not.toContain('colorScheme');
  });

  it('fondo del chat renderizado por modo', () => {
    expect(renderChat(false)).toContain('background:#F7F7F5');
    expect(renderChat(true)).toContain('background:#0B141A');
  });

  it('burbujas propias a la derecha, ajenas a la izquierda, con esquinas tipo WhatsApp', () => {
    // Propios: fila a la derecha, esquina inferior derecha cerrada.
    expect(src).toContain("justifyContent: 'flex-end'");
    expect(src).toContain('borderBottomRightRadius: 6');
    // Ajenos: avatar a la izquierda y esquina inferior izquierda cerrada.
    expect(src).toContain('borderBottomLeftRadius: 6');
    expect(src).toContain('avatarColor(m.guest_name)');
    // Ambas con radio 20 y fondo de la paleta.
    expect(src).toContain('borderRadius: 20, borderBottomRightRadius: 6');
    expect(src).toContain('borderRadius: 20, borderBottomLeftRadius: 6');
    expect(src).toContain('const bubbleBg = own ? C.ownBubble : C.otherBubble;');
  });

  it('separador de fechas centrado con el color de la paleta', () => {
    expect(src).toContain("justifyContent: 'center'");
    expect(src).toContain('background: C.dateSep');
    expect(src).toContain('formatChatDay(m.created_at)');
  });

  it('campo para escribir negro con texto blanco y placeholder gris (render)', () => {
    const html = renderChat(false);
    // El campo negro: contenedor de la píldora y el input de nombre.
    expect(html).toContain('background:#111111');
    // Placeholder gris del overlay ("Mensaje") y caret blanco.
    expect(html).toContain('color:#AEBAC1');
    expect(html).toContain('>Mensaje<');
    // El input lleva el texto en blanco.
    expect(html).toContain('color:#FFFFFF');
    // El campo es el mismo en modo oscuro.
    expect(renderChat(true)).toContain('background:#111111');
  });

  it('botón de envío circular negro con icono blanco (render)', () => {
    const html = renderChat(false);
    const m = html.match(/<button[^>]*aria-label="Enviar mensaje"[^>]*style="([^"]*)"/);
    expect(m).not.toBeNull();
    expect(m[1]).toContain('background:#111111');
    expect(m[1]).toContain('color:#FFFFFF');
    expect(m[1]).toContain('border-radius:50%');
    expect(m[1]).toContain('width:44px');
  });

  it('funciones intactas: enviar, reacciones, fijar, borrar, aviso y sondeo', () => {
    expect(src).toContain('const send = async');
    expect(src).toContain('const toggleLike = async');
    expect(src).toContain('const togglePin = async');
    expect(src).toContain('const removeMessage = async');
    expect(src).toContain('notifyChatMessage');
    expect(src).toContain('setInterval(load, POLL_MS)');
    expect(src).toContain('formatMessageTime(m.created_at)');
    expect(src).toContain('onCountChange?.(messages.length)');
    expect(src).toContain('scrollToBottom');
  });

  it('nombre del participante encima de su mensaje y hora discreta', () => {
    expect(src).toContain('{m.guest_name}');
    expect(src).toContain('formatMessageTime(m.created_at)');
    expect(src).toContain('fontSize: 11, color: C.sub');
  });

  it('sin restos del diseño anterior', () => {
    expect(src).not.toContain('#0F172A');
    expect(src).not.toContain('#F1F5F9');
    expect(src).not.toContain('#38BDF8');
    expect(src).not.toContain('showDivider');
  });
});
