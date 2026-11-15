import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const { createMock } = vi.hoisted(() => ({
  createMock: vi.fn(async () => ({ url: 'https://checkout.stripe.test/pay' })),
}));

vi.mock('stripe', () => {
  // El handler usa `new Stripe(...)`: el mock debe ser un constructor.
  function MockStripe() {
    this.checkout = { sessions: { create: createMock } };
  }
  return { default: MockStripe };
});

import handler from '../../api/stripe-checkout.js';

function mockRes() {
  const res = {};
  res.setHeader = vi.fn();
  res.status = vi.fn((code) => { res.statusCode = code; return res; });
  res.json = vi.fn((body) => { res.body = body; return res; });
  res.end = vi.fn();
  return res;
}

function post(body) {
  return { method: 'POST', body };
}

beforeEach(() => {
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_123');
  createMock.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

async function createSession(body) {
  const req = post(body);
  const res = mockRes();
  await handler(req, res);
  expect(res.statusCode).toBe(200);
  expect(res.body.url).toBe('https://checkout.stripe.test/pay');
  return createMock.mock.calls.at(-1)[0];
}

describe('stripe checkout', () => {
  it('charges the page prices in MXN (pro $99/$990, elite $199/$1,990)', async () => {
    const monthly = await createSession({ biz_id: 'b1', plan_id: 'pro', interval: 'month', host_url: 'https://citymap.mx', currency: 'MXN' });
    expect(monthly.line_items[0].price_data.unit_amount).toBe(9900);
    expect(monthly.line_items[0].price_data.currency).toBe('mxn');
    expect(monthly.line_items[0].price_data.recurring.interval).toBe('month');

    const annual = await createSession({ biz_id: 'b1', plan_id: 'pro', interval: 'year', host_url: 'https://citymap.mx', currency: 'MXN' });
    expect(annual.line_items[0].price_data.unit_amount).toBe(99000);

    const eliteMonthly = await createSession({ biz_id: 'b1', plan_id: 'elite', interval: 'month', host_url: 'https://citymap.mx', currency: 'MXN' });
    expect(eliteMonthly.line_items[0].price_data.unit_amount).toBe(19900);

    const eliteAnnual = await createSession({ biz_id: 'b1', plan_id: 'elite', interval: 'year', host_url: 'https://citymap.mx', currency: 'MXN' });
    expect(eliteAnnual.line_items[0].price_data.unit_amount).toBe(199000);

    const fidMonthly = await createSession({ biz_id: 'b1', plan_id: 'fideliza', interval: 'month', host_url: 'https://citymap.mx', currency: 'MXN' });
    expect(fidMonthly.line_items[0].price_data.unit_amount).toBe(29900);
    expect(fidMonthly.line_items[0].price_data.product_data.name).toContain('Plan Fideliza');

    const fidAnnual = await createSession({ biz_id: 'b1', plan_id: 'fideliza', interval: 'year', host_url: 'https://citymap.mx', currency: 'MXN' });
    expect(fidAnnual.line_items[0].price_data.unit_amount).toBe(299000);
  });

  it('charges EUR/USD prices', async () => {
    const eur = await createSession({ biz_id: 'b1', plan_id: 'pro', interval: 'month', host_url: 'https://citymap.mx', currency: 'EUR' });
    expect(eur.line_items[0].price_data.unit_amount).toBe(999);
    const usd = await createSession({ biz_id: 'b1', plan_id: 'elite', interval: 'year', host_url: 'https://citymap.mx', currency: 'USD' });
    expect(usd.line_items[0].price_data.unit_amount).toBe(19900);
  });

  it('gives a 7-day free trial on the three paid plans, monthly and annual', async () => {
    const trial = await createSession({ biz_id: 'b1', plan_id: 'pro', interval: 'month', host_url: 'https://citymap.mx', currency: 'MXN' });
    expect(trial.subscription_data).toEqual({ trial_period_days: 7 });
    expect(trial.success_url).toContain('/cuenta?success=true');
    expect(trial.success_url).toContain('&trial=1');
    expect(trial.client_reference_id).toBe('b1');
    expect(trial.metadata.plan_tier).toBe('pro');

    const trialElite = await createSession({ biz_id: 'b1', plan_id: 'elite', interval: 'month', host_url: 'https://citymap.mx', currency: 'MXN' });
    expect(trialElite.subscription_data).toEqual({ trial_period_days: 7 });
    expect(trialElite.success_url).toContain('&trial=1');
    expect(trialElite.metadata.plan_tier).toBe('elite');

    const trialAnnual = await createSession({ biz_id: 'b1', plan_id: 'pro', interval: 'year', host_url: 'https://citymap.mx', currency: 'MXN' });
    expect(trialAnnual.subscription_data).toEqual({ trial_period_days: 7 });
    expect(trialAnnual.success_url).toContain('&trial=1');

    const trialEliteAnnual = await createSession({ biz_id: 'b1', plan_id: 'elite', interval: 'year', host_url: 'https://citymap.mx', currency: 'MXN' });
    expect(trialEliteAnnual.subscription_data).toEqual({ trial_period_days: 7 });

    const trialFid = await createSession({ biz_id: 'b1', plan_id: 'fideliza', interval: 'month', host_url: 'https://citymap.mx', currency: 'MXN' });
    expect(trialFid.subscription_data).toEqual({ trial_period_days: 7 });
    expect(trialFid.metadata.plan_tier).toBe('fideliza');

    const trialFidAnnual = await createSession({ biz_id: 'b1', plan_id: 'fideliza', interval: 'year', host_url: 'https://citymap.mx', currency: 'MXN' });
    expect(trialFidAnnual.subscription_data).toEqual({ trial_period_days: 7 });
  });

  it('rejects unknown plans and missing keys', async () => {
    const res = mockRes();
    await handler(post({ biz_id: 'b1', plan_id: 'nope', interval: 'month', host_url: 'https://citymap.mx', currency: 'MXN' }), res);
    expect(res.statusCode).toBe(400);

    vi.stubEnv('STRIPE_SECRET_KEY', '');
    const res2 = mockRes();
    await handler(post({ biz_id: 'b1', plan_id: 'pro', interval: 'month', host_url: 'https://citymap.mx', currency: 'MXN' }), res2);
    expect(res2.statusCode).toBe(500);
  });
});
