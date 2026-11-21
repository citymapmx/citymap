import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const { createMock, getUserMock, maybeSingleMock } = vi.hoisted(() => ({
  createMock: vi.fn(async () => ({ url: 'https://checkout.stripe.test/pay' })),
  getUserMock: vi.fn(),
  maybeSingleMock: vi.fn(),
}));

vi.mock('stripe', () => {
  // El handler usa `new Stripe(...)`: el mock debe ser un constructor.
  function MockStripe() {
    this.checkout = { sessions: { create: createMock } };
  }
  return { default: MockStripe };
});

vi.mock('@supabase/supabase-js', () => ({
  // El handler crea dos clientes: con la anon key solo verifica el JWT
  // (auth.getUser) y con la service key lee el negocio. El mock los
  // distingue por la llave.
  createClient: vi.fn((_url, key) => {
    if (key === 'anon-key') return { auth: { getUser: getUserMock } };
    return {
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: maybeSingleMock }) }),
      }),
    };
  }),
}));

import handler from '../../api/stripe-checkout.js';

function mockRes() {
  const res = {};
  res.setHeader = vi.fn();
  res.status = vi.fn((code) => { res.statusCode = code; return res; });
  res.json = vi.fn((body) => { res.body = body; return res; });
  res.end = vi.fn();
  return res;
}

function post(body, headers = { authorization: 'Bearer valid-token' }) {
  return { method: 'POST', body, headers };
}

const OWNER_USER = { id: 'user-1', email: 'owner@test.com', app_metadata: {} };

beforeEach(() => {
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_123');
  vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key');
  createMock.mockClear();
  getUserMock.mockReset();
  maybeSingleMock.mockReset();
  getUserMock.mockResolvedValue({ data: { user: OWNER_USER }, error: null });
  maybeSingleMock.mockResolvedValue({
    data: { owner_id: 'user-1', stripe_customer_id: null, stripe_subscription_id: null },
    error: null,
  });
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

  it('does not give a trial when the business already had a Stripe subscription', async () => {
    maybeSingleMock.mockResolvedValue({
      data: { owner_id: 'user-1', stripe_customer_id: 'cus_123', stripe_subscription_id: 'sub_123' },
      error: null,
    });
    const session = await createSession({ biz_id: 'b1', plan_id: 'pro', interval: 'month', host_url: 'https://citymap.mx', currency: 'MXN' });
    expect(session.subscription_data).toBeUndefined();
    expect(session.success_url).not.toContain('&trial=1');
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

  it('returns 401 without a token and never creates a checkout session', async () => {
    const res = mockRes();
    await handler(post({ biz_id: 'b1', plan_id: 'pro', interval: 'month', host_url: 'https://citymap.mx', currency: 'MXN' }, {}), res);
    expect(res.statusCode).toBe(401);
    expect(createMock).not.toHaveBeenCalled();
  });

  it('returns 401 with an invalid token', async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null }, error: { message: 'Invalid JWT' } });
    const res = mockRes();
    await handler(post({ biz_id: 'b1', plan_id: 'pro', interval: 'month', host_url: 'https://citymap.mx', currency: 'MXN' }), res);
    expect(res.statusCode).toBe(401);
    expect(createMock).not.toHaveBeenCalled();
  });

  it('returns 403 when the caller does not own the business', async () => {
    maybeSingleMock.mockResolvedValueOnce({
      data: { owner_id: 'other-user', stripe_customer_id: null, stripe_subscription_id: null },
      error: null,
    });
    const res = mockRes();
    await handler(post({ biz_id: 'b1', plan_id: 'pro', interval: 'month', host_url: 'https://citymap.mx', currency: 'MXN' }), res);
    expect(res.statusCode).toBe(403);
    expect(createMock).not.toHaveBeenCalled();
  });

  it('returns 404 when the business does not exist', async () => {
    maybeSingleMock.mockResolvedValueOnce({ data: null, error: null });
    const res = mockRes();
    await handler(post({ biz_id: 'b1', plan_id: 'pro', interval: 'month', host_url: 'https://citymap.mx', currency: 'MXN' }), res);
    expect(res.statusCode).toBe(404);
    expect(createMock).not.toHaveBeenCalled();
  });

  it('lets an admin pay for a business they do not own', async () => {
    getUserMock.mockResolvedValueOnce({
      data: { user: { id: 'admin-1', email: 'admin@cityguide.com', app_metadata: { isAdmin: true } } },
      error: null,
    });
    maybeSingleMock.mockResolvedValueOnce({
      data: { owner_id: 'other-user', stripe_customer_id: null, stripe_subscription_id: null },
      error: null,
    });
    const session = await createSession({ biz_id: 'b1', plan_id: 'pro', interval: 'month', host_url: 'https://citymap.mx', currency: 'MXN' });
    expect(session.metadata.user_id).toBe('admin-1');
  });

  it('uses the verified user id in metadata even when the body sends another', async () => {
    const session = await createSession({ biz_id: 'b1', plan_id: 'pro', interval: 'month', host_url: 'https://citymap.mx', currency: 'MXN', user_id: 'spoofed' });
    expect(session.metadata.user_id).toBe('user-1');
  });

  it('keeps an allowed host_url and falls back to citymap.mx for an external one', async () => {
    const world = await createSession({ biz_id: 'b1', plan_id: 'pro', interval: 'month', host_url: 'https://citymap.world', currency: 'MXN' });
    expect(world.success_url.startsWith('https://citymap.world/cuenta')).toBe(true);
    expect(world.cancel_url.startsWith('https://citymap.world/precios')).toBe(true);

    const evil = await createSession({ biz_id: 'b1', plan_id: 'pro', interval: 'month', host_url: 'https://evil.example.com', currency: 'MXN' });
    expect(evil.success_url.startsWith('https://citymap.mx/cuenta')).toBe(true);
    expect(evil.cancel_url.startsWith('https://citymap.mx/precios')).toBe(true);
  });

  it('fails closed (500) when the Supabase keys are missing', async () => {
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    const res = mockRes();
    await handler(post({ biz_id: 'b1', plan_id: 'pro', interval: 'month', host_url: 'https://citymap.mx', currency: 'MXN' }), res);
    expect(res.statusCode).toBe(500);
    expect(createMock).not.toHaveBeenCalled();

    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    const res2 = mockRes();
    await handler(post({ biz_id: 'b1', plan_id: 'pro', interval: 'month', host_url: 'https://citymap.mx', currency: 'MXN' }), res2);
    expect(res2.statusCode).toBe(500);
    expect(createMock).not.toHaveBeenCalled();
  });
});
