// Reglas de los planes de negocio (compartidas por BusinessLanding,
// PlanPaymentModal y sus tests).
// El servidor aplica la misma regla en la sesión de Stripe
// (trial_period_days en api/stripe-checkout.js).
export const TRIAL_DAYS = 7;

// Prueba gratis: solo Destacado y Premium mensuales.
export const isTrialSelection = (planKey, billing) => ['pro', 'elite'].includes(planKey) && billing === 'monthly';
