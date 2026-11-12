import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import {
  normalizeWhatsApp,
  isValidWhatsApp,
  loyaltyWhatsAppMessage,
  loyaltyWhatsAppLink,
} from '../lib/loyaltyWhatsapp.js';
import LoyaltyWhatsAppButton from '../components/loyalty/LoyaltyWhatsAppButton.jsx';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

describe('WhatsApp de lealtad: normalización (PR #249)', () => {
  it('un móvil mexicano de 10 dígitos se normaliza a 52 + dígitos', () => {
    expect(normalizeWhatsApp('311 200 8507')).toBe('523112008507');
    expect(normalizeWhatsApp('311-200-8507')).toBe('523112008507');
    expect(normalizeWhatsApp('(311) 200 8507')).toBe('523112008507');
    expect(normalizeWhatsApp('3112008507')).toBe('523112008507');
  });

  it('acepta el número con código de país +52 o 52', () => {
    expect(normalizeWhatsApp('+52 311 200 8507')).toBe('523112008507');
    expect(normalizeWhatsApp('523112008507')).toBe('523112008507');
    expect(normalizeWhatsApp('+523112008507')).toBe('523112008507');
  });

  it('rechaza números incompletos o vacíos', () => {
    expect(normalizeWhatsApp('123')).toBeNull();
    expect(normalizeWhatsApp('311200850')).toBeNull(); // 9 dígitos
    expect(normalizeWhatsApp('')).toBeNull();
    expect(normalizeWhatsApp(null)).toBeNull();
    expect(normalizeWhatsApp(undefined)).toBeNull();
  });

  it('isValidWhatsApp es verdadero solo con un móvil válido', () => {
    expect(isValidWhatsApp('311 200 8507')).toBe(true);
    expect(isValidWhatsApp('+52 311 200 8507')).toBe(true);
    expect(isValidWhatsApp('123')).toBe(false);
    expect(isValidWhatsApp('')).toBe(false);
  });
});

describe('WhatsApp de lealtad: mensajes personalizados (PR #249)', () => {
  it('a 1 sello del premio: «solo te falta un sello»', () => {
    expect(loyaltyWhatsAppMessage({ stamps: 4, stampsRequired: 5, bizName: 'Carrito La Paz' }))
      .toBe('Hola, solo te falta un sello en tu tarjeta de lealtad para recibir un premio.');
  });

  it('tarjeta completada: «Felicidades, ya completaste»', () => {
    expect(loyaltyWhatsAppMessage({ stamps: 5, stampsRequired: 5, bizName: 'Carrito La Paz' }))
      .toBe('🎉 ¡Felicidades, ya completaste tu tarjeta de lealtad, puedes reclamar tu premio!');
    expect(loyaltyWhatsAppMessage({ stamps: 6, stampsRequired: 5, bizName: 'Carrito La Paz' }))
      .toBe('🎉 ¡Felicidades, ya completaste tu tarjeta de lealtad, puedes reclamar tu premio!');
  });

  it('en los demás casos: recordatorio con el nombre del negocio y el progreso', () => {
    const msg = loyaltyWhatsAppMessage({ stamps: 1, stampsRequired: 5, bizName: 'Carrito La Paz Tostadas de Atún' });
    expect(msg).toContain('Carrito La Paz Tostadas de Atún');
    expect(msg).toContain('1 de 5 sellos');
    expect(loyaltyWhatsAppMessage({ stamps: 0, stampsRequired: 5, bizName: 'Carrito La Paz' }))
      .toContain('0 de 5 sellos');
  });
});

describe('WhatsApp de lealtad: enlace wa.me (PR #249)', () => {
  it('construye el enlace con el número normalizado y el mensaje codificado', () => {
    const link = loyaltyWhatsAppLink({ whatsapp: '311 200 8507', stamps: 4, stampsRequired: 5, bizName: 'Carrito La Paz' });
    expect(link.startsWith('https://wa.me/523112008507?text=')).toBe(true);
    expect(decodeURIComponent(link.split('text=')[1]))
      .toBe('Hola, solo te falta un sello en tu tarjeta de lealtad para recibir un premio.');
  });

  it('el enlace de tarjeta completada lleva el mensaje de felicidades', () => {
    const link = loyaltyWhatsAppLink({ whatsapp: '+52 311 200 8507', stamps: 5, stampsRequired: 5, bizName: 'Carrito La Paz' });
    expect(decodeURIComponent(link.split('text=')[1]))
      .toBe('🎉 ¡Felicidades, ya completaste tu tarjeta de lealtad, puedes reclamar tu premio!');
  });

  it('sin número no hay enlace', () => {
    expect(loyaltyWhatsAppLink({ whatsapp: '', stamps: 1, stampsRequired: 5 })).toBeNull();
    expect(loyaltyWhatsAppLink({ stamps: 1, stampsRequired: 5 })).toBeNull();
    expect(loyaltyWhatsAppLink({ whatsapp: '123', stamps: 1, stampsRequired: 5 })).toBeNull();
  });
});

describe('WhatsApp de lealtad: botón en la lista de clientes (PR #249)', () => {
  const member = { id: 'm1', name: 'Jonathan Arana', email: 'jgarana18@gmail.com', whatsapp: '311 200 8507', stamps: 4 };

  it('se pinta verde con el icono de WhatsApp cuando el cliente tiene número', () => {
    const html = renderToStaticMarkup(
      <LoyaltyWhatsAppButton member={member} stampsRequired={5} bizName="Carrito La Paz" />
    );
    expect(html).toContain('#25D366');
    expect(html).toContain('Enviar WhatsApp a Jonathan Arana');
    expect(html).toContain('<button');
  });

  it('no se pinta nada cuando el cliente no tiene número guardado', () => {
    const noNumber = renderToStaticMarkup(
      <LoyaltyWhatsAppButton member={{ ...member, whatsapp: null }} stampsRequired={5} bizName="Carrito La Paz" />
    );
    expect(noNumber).toBe('');
    const noField = renderToStaticMarkup(
      <LoyaltyWhatsAppButton member={{ id: 'm2', name: 'Cliente', stamps: 1 }} stampsRequired={5} bizName="Carrito La Paz" />
    );
    expect(noField).toBe('');
  });

  it('el botón usa el enlace wa.me con el mensaje según el progreso', () => {
    const src = read('../components/loyalty/LoyaltyWhatsAppButton.jsx');
    expect(src).toContain('loyaltyWhatsAppLink');
    expect(src).toContain('window.open(link, "_blank")');
    expect(src).toContain('Icon name="whatsapp"');
  });

  it('la lista de clientes usa el botón en el dashboard y en el tab Clientes', () => {
    const src = read('../components/loyalty/LoyaltyDesigner.jsx');
    const uses = src.match(/<LoyaltyWhatsAppButton/g) || [];
    expect(uses.length).toBe(2);
    expect(src).toContain("import LoyaltyWhatsAppButton from './LoyaltyWhatsAppButton.jsx'");
  });
});

describe('WhatsApp de lealtad: el join pide el número (PR #249)', () => {
  it('el formulario de unirse incluye el campo de WhatsApp', () => {
    const src = read('../views/LoyaltyCardView.jsx');
    expect(src).toContain('type="tel"');
    expect(src).toContain('placeholder="311 000 0000"');
    expect(src).toContain('WhatsApp');
  });

  it('el alta guarda el número normalizado y valida antes de inscribir', () => {
    const src = read('../views/LoyaltyCardView.jsx');
    expect(src).toContain('normalizeWhatsApp(whatsapp)');
    expect(src).toContain('whatsapp: normalizedWhatsapp');
    expect(src).toContain('Escribe tu número de WhatsApp (10 dígitos)');
  });

  it('si la columna aún no existe en la base, el join reintenta sin el número', () => {
    const src = read('../views/LoyaltyCardView.jsx');
    expect(src).toContain('payloadWithoutWhatsapp');
    expect(src).toContain('includes("whatsapp")');
  });

  it('la migración agrega la columna whatsapp a loyalty_members', () => {
    const migration = read('../../supabase/migrations/20261112103600_add_whatsapp_to_loyalty_members.sql');
    expect(migration).toContain('alter table public.loyalty_members');
    expect(migration).toContain('add column if not exists whatsapp text');
  });
});
