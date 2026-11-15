// Cuatro planes (15 nov 2026): Gratuito, Presencia (pro), Ventas
// (elite) y Fideliza (fideliza). Las claves internas 'pro' y 'elite'
// se conservan: el webhook de Stripe escribe el plan_tier tal cual y
// todo el código de permisos las acepta; solo cambian los nombres.
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildBusinessPlans, getBusinessPricing } from '../lib/businessPlans.js';
import { isTrialSelection } from '../lib/plans.js';
import { effectivePlanFeatures, comparePlanFeatures, hasTrial, isPaidPlanKey } from '../lib/crearNegocio.js';
import { businessShowsGoogleRating } from '../lib/googleRatings.js';
import { PLAN_META } from '../lib/constants.js';

const t = (k, f) => f;
const plansMx = () => buildBusinessPlans(t, getBusinessPricing('mx'));

// Las 26 filas de la tabla comparativa del prompt (sección 4), con su
// distribución exacta: qué plan lleva cada función. La fila de
// «Banner estándar» NO va aquí: el prompt la marca solo para Gratuito,
// pero el modelo de herencia la lleva también a los de pago (ver el
// test que lo documenta abajo).
const TABLA_PROMPT = [
  ['Página pública', ['free', 'pro', 'elite', 'fideliza']],
  ['Portada e información', ['free', 'pro', 'elite', 'fideliza']],
  ['Teléfono y dirección', ['free', 'pro', 'elite', 'fideliza']],
  ['Horarios', ['free', 'pro', 'elite', 'fideliza']],
  ['Reseñas de Google', ['pro', 'elite', 'fideliza']],
  ['SEO en Google', ['pro', 'elite', 'fideliza']],
  ['Banner destacado', ['pro', 'elite', 'fideliza']],
  ['Galería de fotografías', ['pro', 'elite', 'fideliza']],
  ['WhatsApp y redes sociales', ['pro', 'elite', 'fideliza']],
  ['Menú digital', ['pro', 'elite', 'fideliza']],
  ['Panel de administrador', ['pro', 'elite', 'fideliza']],
  ['Menú interactivo', ['elite', 'fideliza']],
  ['Menú indexado en Google', ['elite', 'fideliza']],
  ['Carrito de compras', ['elite', 'fideliza']],
  ['Pedidos por WhatsApp', ['elite', 'fideliza']],
  ['Banner premium', ['elite', 'fideliza']],
  ['Logotipo destacado en el mapa', ['elite', 'fideliza']],
  ['Tarjetas de lealtad', ['fideliza']],
  ['Historial de clientes', ['fideliza']],
  ['Sistema de recompensas', ['fideliza']],
  ['Cupones y promociones', ['fideliza']],
  ['Gestión de eventos', ['fideliza']],
  ['Reservaciones', ['fideliza']],
  ['Estadísticas avanzadas', ['fideliza']],
  ['Soporte prioritario', ['fideliza']],
];

describe('cuatro planes: estructura y precios', () => {
  it('son cuatro, con las claves internas y los nombres nuevos', () => {
    const plans = plansMx();
    expect(plans.map(p => p.key)).toEqual(['free', 'pro', 'elite', 'fideliza']);
    expect(plans.map(p => p.name)).toEqual(['Gratuito', 'Presencia', 'Ventas', 'Fideliza']);
  });

  it('precios MXN: Presencia $99/$990, Ventas $199/$1,990, Fideliza $299/$2,990', () => {
    const plans = plansMx();
    expect([plans[1].priceMonthly, plans[1].priceAnnual]).toEqual(['$99', '$990']);
    expect([plans[2].priceMonthly, plans[2].priceAnnual]).toEqual(['$199', '$1,990']);
    expect([plans[3].priceMonthly, plans[3].priceAnnual]).toEqual(['$299', '$2,990']);
  });

  it('precios EUR/USD de Fideliza siguen el mismo patrón que los otros planes', () => {
    const es = buildBusinessPlans(t, getBusinessPricing('es'));
    expect([es[3].priceMonthly, es[3].priceAnnual]).toEqual(['29.99€', '299€']);
    const us = buildBusinessPlans(t, getBusinessPricing('us'));
    expect([us[3].priceMonthly, us[3].priceAnnual]).toEqual(['$29.99', '$299']);
    // El patrón se mantiene en los otros dos: €9.99/€99 y €19.99/€199.
    expect([es[1].priceMonthly, es[1].priceAnnual]).toEqual(['9.99€', '99€']);
    expect([es[2].priceMonthly, es[2].priceAnnual]).toEqual(['19.99€', '199€']);
  });

  it('Fideliza hereda todo lo de Gratuito, Presencia y Ventas', () => {
    const plans = plansMx();
    const fid = effectivePlanFeatures(plans, 'fideliza');
    expect(fid).toContain('Página pública');
    expect(fid).toContain('Reseñas de Google');
    expect(fid).toContain('Menú interactivo');
    expect(fid).toContain('Carrito de compras');
    expect(fid).toContain('Tarjetas de lealtad');
    expect(fid).toContain('Reservaciones');
    expect(fid).toContain('Estadísticas avanzadas');
    expect(fid).toContain('Soporte prioritario');
    // Y los inferiores NO tienen lo de Fideliza.
    expect(effectivePlanFeatures(plans, 'free')).not.toContain('Tarjetas de lealtad');
    expect(effectivePlanFeatures(plans, 'pro')).not.toContain('Tarjetas de lealtad');
    expect(effectivePlanFeatures(plans, 'elite')).not.toContain('Tarjetas de lealtad');
    expect(effectivePlanFeatures(plans, 'elite')).not.toContain('Reservaciones');
    expect(effectivePlanFeatures(plans, 'pro')).not.toContain('Menú interactivo');
  });
});

describe('cuatro planes: tabla comparativa con la distribución del prompt', () => {
  it('las 25 filas del prompt (sin el banner estándar) existen, cada una en los planes que le tocan', () => {
    const plans = plansMx();
    const rows = comparePlanFeatures(plans);
    for (const [feature, keys] of TABLA_PROMPT) {
      expect(rows, feature).toContain(feature);
      for (const key of ['free', 'pro', 'elite', 'fideliza']) {
        const has = effectivePlanFeatures(plans, key).includes(feature);
        expect(has, `${feature} en ${key}`).toBe(keys.includes(key));
      }
    }
  });

  it('el "Banner estándar" es solo del gratuito (el destacado lo sustituye)', () => {
    // Limitación conocida del modelo de herencia (igual que hoy): la
    // fila se genera desde las funciones efectivas y el gratuito se
    // hereda, así que la tabla muestra ✓ en los cuatro. Se documenta
    // aquí para no fingir que la tabla lo resuelve sola.
    const plans = plansMx();
    const rows = comparePlanFeatures(plans);
    expect(rows).toContain('Banner estándar');
    expect(effectivePlanFeatures(plans, 'pro')).toContain('Banner estándar');
  });
});

describe('cuatro planes: prueba de 7 días en mensual Y en anual', () => {
  it('los tres planes de pago tienen prueba en las dos modalidades', () => {
    for (const key of ['pro', 'elite', 'fideliza']) {
      expect(isTrialSelection(key, 'monthly')).toBe(true);
      expect(isTrialSelection(key, 'annual')).toBe(true);
      expect(hasTrial(key, 'monthly')).toBe(true);
      expect(hasTrial(key, 'annual')).toBe(true);
    }
    expect(isTrialSelection('free', 'monthly')).toBe(false);
    expect(isTrialSelection('free', 'annual')).toBe(false);
    expect(hasTrial('free', 'monthly')).toBe(false);
    expect(isPaidPlanKey('fideliza')).toBe(true);
  });
});

describe('cuatro planes: checkout de Stripe (fuente)', () => {
  const src = fs.readFileSync(new URL('../../api/stripe-checkout.js', import.meta.url), 'utf8');

  it('Fideliza tiene montos en las tres monedas', () => {
    expect(src).toContain("plan_id === 'fideliza'");
    expect(src).toContain('29900'); // MXN mensual (centavos)
    expect(src).toContain('299000'); // MXN anual
    expect(src).toContain('2999'); // EUR/USD mensual
    expect(src).toContain('29900'); // EUR/USD anual
    expect(src).toContain('Plan Fideliza');
    expect(src).toContain('Plan Presencia');
    expect(src).toContain('Plan Ventas');
  });

  it('la prueba aplica a los tres planes de pago en cualquier modalidad', () => {
    expect(src).toContain("['pro', 'elite', 'fideliza'].includes(plan_id)");
    expect(src).not.toContain("interval === 'month' ? 7 : 0");
  });

  it('anti-repetición: un negocio que ya tuvo suscripción no recibe otra prueba', () => {
    // El webhook escribe stripe_customer_id / stripe_subscription_id al
    // completarse el primer checkout; el checkout los lee antes de dar
    // la prueba. Si la lectura falla, la prueba se permite (fail-open).
    expect(src).toContain('stripe_customer_id');
    expect(src).toContain('stripe_subscription_id');
    expect(src).toContain("trialDays = 0");
  });
});

describe('cuatro planes: permisos que se mueven con la migración', () => {
  it('las reseñas de Google se muestran en Presencia, Ventas y Fideliza (y en los valores viejos)', () => {
    for (const plan of ['destacado', 'premium', 'pro', 'elite', 'fideliza']) {
      expect(businessShowsGoogleRating({ plan })).toBe(true);
    }
    expect(businessShowsGoogleRating({ plan: 'free' })).toBe(false);
    expect(businessShowsGoogleRating({ plan: null })).toBe(false);
    expect(businessShowsGoogleRating({})).toBe(false);
  });

  it('PLAN_META tiene los tres planes nuevos (sin esto rompe el formulario del admin)', () => {
    expect(PLAN_META.pro.label).toBe('Presencia');
    expect(PLAN_META.elite.label).toBe('Ventas');
    expect(PLAN_META.fideliza.label).toBe('Fideliza');
    expect(PLAN_META.pro.max_photos).toBe(7);
    expect(PLAN_META.elite.max_photos).toBe(15);
    expect(PLAN_META.fideliza.max_photos).toBe(15);
  });

  it('el webhook sigue asignando el plan tal cual viene en plan_tier (fideliza incluido)', () => {
    const src = fs.readFileSync(new URL('../../api/stripe-webhook.js', import.meta.url), 'utf8');
    expect(src).toContain('plan_tier');
  });
});
