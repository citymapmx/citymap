// Reglas de los planes de negocio (compartidas por BusinessLanding,
// PlanPaymentModal y sus tests).
// El servidor aplica la misma regla en la sesión de Stripe
// (trial_period_days en api/stripe-checkout.js).
export const TRIAL_DAYS = 7;

// Prueba gratis: los tres planes de pago, en mensual Y en anual
// (15 nov 2026). El servidor además niega la prueba si el negocio ya
// tuvo una suscripción (anti-repetición, ver stripe-checkout.js).
export const isTrialSelection = (planKey, billing) => ['pro', 'elite', 'fideliza'].includes(planKey) && (billing === 'monthly' || billing === 'annual');
