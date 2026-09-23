import Stripe from 'stripe';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: CORS });
}

export async function POST(req) {
  if (!process.env.STRIPE_SECRET_KEY)
    return Response.json({ error: 'Falta configurar STRIPE_SECRET_KEY' }, { status: 500, headers: CORS });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const { biz_id, plan_id, interval, user_id, host_url, currency: clientCurrency } = await req.json();
    const currency = (clientCurrency || 'mxn').toLowerCase();

    let unit_amount = 0, name = '';
    if (currency === 'eur') {
      if (plan_id === 'pro')   { name = 'Plan Destacado'; unit_amount = interval === 'year' ? 9900 : 999; }
      if (plan_id === 'elite') { name = 'Plan Premium';   unit_amount = interval === 'year' ? 19900 : 1999; }
    } else if (currency === 'usd') {
      if (plan_id === 'pro')   { name = 'Plan Destacado'; unit_amount = interval === 'year' ? 9900 : 999; }
      if (plan_id === 'elite') { name = 'Plan Premium';   unit_amount = interval === 'year' ? 19900 : 1999; }
    } else {
      if (plan_id === 'pro')   { name = 'Plan Destacado'; unit_amount = interval === 'year' ? 99000 : 9900; }
      if (plan_id === 'elite') { name = 'Plan Premium';   unit_amount = interval === 'year' ? 199000 : 19900; }
    }

    if (!unit_amount) return Response.json({ error: 'Plan o combinación no válidos' }, { status: 400, headers: CORS });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      allow_promotion_codes: true,
      line_items: [{
        price_data: {
          currency,
          product_data: {
            name: name + (interval === 'year' ? ' (Anual)' : ' (Mensual)'),
            description: 'Suscripción CityMap para tu negocio',
          },
          unit_amount,
          recurring: { interval: interval === 'year' ? 'year' : 'month' },
        },
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${host_url}/perfil?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${host_url}/planes?canceled=true`,
      client_reference_id: biz_id,
      metadata: { user_id, plan_tier: plan_id },
    });

    return Response.json({ url: session.url }, { headers: CORS });
  } catch (error) {
    console.error('Stripe Checkout Error:', error);
    return Response.json({ error: error.message }, { status: 500, headers: CORS });
  }
}
