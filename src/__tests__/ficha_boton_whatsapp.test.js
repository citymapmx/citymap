/**
 * El botón de WhatsApp de la ficha se perdió para los negocios Fideliza
 * (Jonathan, 25 Nov 2026): El Pastor del Rica (fideliza, whatsapp
 * 3326505110) lo tenía junto a Llamar y ya no sale, aunque en la lista
 * sí se ve el icono verde. Causa: DetailView pedía el plan en
 * ['premium', 'pro', 'destacado'], claves viejas de antes de la migración
 * del 15 nov 2026 (109 premium -> fideliza, 14 destacado -> pro). La base
 * ya solo tiene free / fideliza / pro, así que el botón solo salía para
 * los 14 'pro'. Ahora usa isPaidPlanKey (pro / elite / fideliza), que es
 * la definición de plan de pago del código (crearNegocio.js).
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { isPaidPlanKey } from '../lib/crearNegocio.js';

const readSrc = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');

describe('Botón de WhatsApp en la ficha (Jonathan 25 Nov 2026)', () => {

  it('DetailView usa isPaidPlanKey para el botón de WhatsApp', () => {
    const src = readSrc('../views/DetailView.jsx');
    expect(src).toContain('isPaidPlanKey(selected.plan)');
    expect(src).toContain('import { isPaidPlanKey } from "../lib/crearNegocio.js"');
  });

  it('ya no queda el gate con las claves viejas para WhatsApp', () => {
    const src = readSrc('../views/DetailView.jsx');
    expect(src).not.toContain("selected.whatsapp && ['premium', 'pro', 'destacado']");
  });

  it('el botón sigue llamando a goWhatsApp', () => {
    const src = readSrc('../views/DetailView.jsx');
    expect(src).toContain('goWhatsApp(selected, null)');
  });

  it('isPaidPlanKey cubre los tres planes de pago actuales y no el gratis', () => {
    expect(isPaidPlanKey('fideliza')).toBe(true);
    expect(isPaidPlanKey('elite')).toBe(true);
    expect(isPaidPlanKey('pro')).toBe(true);
    expect(isPaidPlanKey('free')).toBe(false);
  });

  it('las claves viejas ya no cuentan como plan de pago (migración 15 nov 2026)', () => {
    expect(isPaidPlanKey('premium')).toBe(false);
    expect(isPaidPlanKey('destacado')).toBe(false);
  });

  it('la tarjeta de la lista sigue mostrando el icono si hay whatsapp', () => {
    const src = readSrc('../components/cards/BusinessCard.jsx');
    expect(src).toContain('b.whatsapp');
  });
});
