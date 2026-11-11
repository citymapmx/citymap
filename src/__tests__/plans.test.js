import { describe, expect, it } from 'vitest';
import { isTrialSelection } from '../lib/plans.js';

// La prueba gratis de 7 días es la regla que usan /negocios (BusinessLanding,
// nota bajo el precio y FAQ) y el modal de pago (PlanPaymentModal). La antigua
// página de planes (PlansPage) se eliminó el 10 nov 2026: /negocios es ahora
// LA página de planes y el pago vive en PlanPaymentModal.
describe('reglas de la prueba gratis de los planes', () => {
  it('ofrece 7 días gratis solo en Destacado y Premium mensuales, y solo ahí', () => {
    expect(isTrialSelection('pro', 'monthly')).toBe(true);
    expect(isTrialSelection('elite', 'monthly')).toBe(true);
    expect(isTrialSelection('pro', 'annual')).toBe(false);
    expect(isTrialSelection('elite', 'annual')).toBe(false);
    expect(isTrialSelection('free', 'monthly')).toBe(false);
  });
});
