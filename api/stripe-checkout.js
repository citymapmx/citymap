import Stripe from 'stripe';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Falta configurar STRIPE_SECRET_KEY en Vercel' });
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { biz_id, plan_id, interval, user_id, host_url } = req.body;
    
    // Configurar precios
    let unit_amount = 0;
    let name = "";
    
    if (plan_id === 'pro') {
      name = "Plan Destacado";
      unit_amount = interval === 'year' ? 99000 : 9900; // $990 MXN o $99 MXN
    } else if (plan_id === 'elite') {
      name = "Plan Premium";
      unit_amount = interval === 'year' ? 199000 : 19900; // $1,990 MXN o $199 MXN
    } else {
      return res.status(400).json({ error: 'Plan no válido' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'mxn',
            product_data: {
              name: name + (interval === 'year' ? ' (Anual)' : ' (Mensual)'),
              description: 'Suscripción CityGuide para tu negocio',
            },
            unit_amount: unit_amount,
            recurring: {
              interval: interval === 'year' ? 'year' : 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${host_url}/perfil?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${host_url}/planes?canceled=true`,
      client_reference_id: biz_id, // Para saber a qué negocio aplicar el plan
      metadata: {
        user_id: user_id,
        plan_tier: plan_id
      },
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("Stripe Checkout Error:", error);
    res.status(500).json({ error: error.message });
  }
}
