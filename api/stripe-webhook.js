import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Necesitamos la llave de rol de servicio para hacer bypass de RLS y actualizar el negocio
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Desactivar el parseo de body de Vercel para que Stripe verifique la firma
export const config = {
  api: {
    bodyParser: false,
  },
};

// Función helper para leer el buffer
async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).send('Falta configurar STRIPE_SECRET_KEY en Vercel');
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // Manejar el evento
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        
        // Obtenemos los metadatos que mandamos al crear el checkout
        const biz_id = session.client_reference_id;
        const plan_tier = session.metadata?.plan_tier;
        const customer_id = session.customer;
        const subscription_id = session.subscription;

        if (biz_id && plan_tier) {
          // Actualizar el negocio en Supabase
          const { error } = await supabase
            .from('businesses')
            .update({
              stripe_customer_id: customer_id,
              stripe_subscription_id: subscription_id,
              plan_tier: plan_tier,
              plan_status: 'active'
            })
            .eq('id', biz_id);
            
          if (error) throw error;
          console.log(`Plan ${plan_tier} activado para el negocio ${biz_id}`);
        }
        break;
      }
      
      case 'customer.subscription.deleted':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const status = subscription.status; // active, past_due, canceled, unpaid
        const customer_id = subscription.customer;

        // Buscar el negocio por customer_id y actualizar su estado
        const { error } = await supabase
          .from('businesses')
          .update({
            plan_status: status === 'active' ? 'active' : (status === 'canceled' || status === 'unpaid' ? 'canceled' : 'past_due')
          })
          .eq('stripe_customer_id', customer_id);

        if (error) throw error;
        break;
      }
      
      default:
        console.log(`Evento no manejado: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error("Supabase Error:", err);
    res.status(500).json({ error: 'Database update failed' });
  }
}
