import { describe, expect, it } from 'vitest';
import { isTrialSelection } from '../lib/plans.js';

// La prueba gratis de 7 días es la regla que usan /negocios (BusinessLanding,
// nota bajo el precio y FAQ) y el modal de pago (PlanPaymentModal). La antigua
// página de planes (PlansPage) se eliminó el 10 nov 2026: /negocios es ahora
// LA página de planes y el pago vive en PlanPaymentModal.
describe('reglas de la prueba gratis de los planes', () => {
  it('ofrece 7 días gratis en los tres planes de pago, en mensual y en anual', () => {
    for (const key of ['pro', 'elite', 'fideliza']) {
      expect(isTrialSelection(key, 'monthly')).toBe(true);
      expect(isTrialSelection(key, 'annual')).toBe(true);
    }
    expect(isTrialSelection('free', 'monthly')).toBe(false);
    expect(isTrialSelection('free', 'annual')).toBe(false);
  });
});
