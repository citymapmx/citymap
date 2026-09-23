import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// In Next.js App Router, we must disable body parsing to read the raw buffer for Stripe signature verification
export const config = { api: { bodyParser: false } };

export async function POST(req) {
  if (!process.env.STRIPE_SECRET_KEY)
    return new Response('Falta STRIPE_SECRET_KEY', { status: 500 });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const buf = await req.arrayBuffer();
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(Buffer.from(buf), sig, webhookSecret);
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const biz_id = session.client_reference_id;
        const plan_val = session.metadata?.plan_tier;
        const customer_id = session.customer;
        const subscription_id = session.subscription;

        if (biz_id && plan_val) {
          const { error } = await supabase
            .from('businesses')
            .update({ stripe_customer_id: customer_id, stripe_subscription_id: subscription_id, plan: plan_val, plan_status: 'active' })
            .eq('id', biz_id);
          if (error) throw error;
          console.log(`Plan ${plan_val} activado para negocio ${biz_id}`);
        }
        break;
      }
      case 'customer.subscription.deleted':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const { status, customer: customer_id } = subscription;
        const plan_status = status === 'active' ? 'active' : (status === 'canceled' || status === 'unpaid' ? 'canceled' : 'past_due');
        const { error } = await supabase.from('businesses').update({ plan_status }).eq('stripe_customer_id', customer_id);
        if (error) throw error;
        break;
      }
      default:
        console.log(`Evento no manejado: ${event.type}`);
    }
    return Response.json({ received: true });
  } catch (err) {
    console.error('Supabase Error:', err);
    return Response.json({ error: 'Database update failed' }, { status: 500 });
  }
}
