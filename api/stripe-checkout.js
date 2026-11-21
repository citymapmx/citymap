/* global process */
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://dpkjxhjkzdlkvyotoeai.supabase.co';
const ADMIN_EMAIL = 'admin@cityguide.com';
// Tras el pago solo se regresa a estos orígenes. Cualquier otro
// host_url del cliente cae a citymap.mx (sin open redirect).
const ALLOWED_HOSTS = ['https://citymap.mx', 'https://citymap.world'];

// Regla de admin (misma que la PR #425): app_metadata.isAdmin, o correo
// en ADMIN_EMAILS (env, separado por comas), o admin@cityguide.com.
// user_metadata NUNCA autoriza: la edita el propio usuario.
function isAdminUser(user) {
  if (user?.app_metadata?.isAdmin === true) return true;
  if (typeof user?.email !== 'string') return false;
  const email = user.email.toLowerCase();
  if (email === ADMIN_EMAIL) return true;
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email);
}

// Verifica el JWT del llamador contra Supabase Auth.
// Devuelve { ok: true, user } o { ok: false, status }.
async function verifyCaller(req) {
  const auth = req.headers?.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return { ok: false, status: 401 };
  const apiKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!apiKey) return { ok: false, status: 500 };
  try {
    const supabase = createClient(SUPABASE_URL, apiKey);
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user?.id) return { ok: false, status: 401 };
    return { ok: true, user: data.user };
  } catch {
    return { ok: false, status: 401 };
  }
}

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

  // Auth: solo el dueño del negocio (o un admin) puede crear el checkout.
  // Sin JWT válido no hay pago: antes cualquiera podía crear un checkout
  // para cualquier negocio con cualquier user_id.
  const caller = await verifyCaller(req);
  if (!caller.ok) {
    return res.status(caller.status).json({
      error: caller.status === 500
        ? 'Falta configurar la llave de Supabase en Vercel'
        : 'Unauthorized',
    });
  }
  const user = caller.user;

  try {
    const { biz_id, plan_id, interval, host_url, currency: clientCurrency } = req.body;
    const currency = (clientCurrency || 'mxn').toLowerCase();

    if (!biz_id) {
      return res.status(400).json({ error: 'Falta biz_id' });
    }

    // El regreso tras el pago solo acepta orígenes conocidos.
    const host = ALLOWED_HOSTS.includes(host_url) ? host_url : 'https://citymap.mx';

    // Propiedad del negocio (fallo cerrado: sin service key o sin poder
    // leer el negocio, no se crea el checkout). La misma lectura sirve
    // para el chequeo anti-trial de abajo.
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return res.status(500).json({ error: 'Falta configurar SUPABASE_SERVICE_ROLE_KEY en Vercel' });
    }
    const supabase = createClient(SUPABASE_URL, serviceRoleKey);
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('owner_id,stripe_customer_id,stripe_subscription_id')
      .eq('id', biz_id)
      .maybeSingle();
    if (businessError) {
      console.error('Stripe Checkout business lookup failed:', businessError.message);
      return res.status(500).json({ error: 'No se pudo verificar el negocio' });
    }
    if (!business) {
      return res.status(404).json({ error: 'Negocio no encontrado' });
    }
    if (business.owner_id !== user.id && !isAdminUser(user)) {
      return res.status(403).json({ error: 'Forbidden: solo el dueño del negocio puede pagar su plan' });
    }

    // Configurar precios (price_data en línea, como siempre: no hay Price
    // IDs guardados en el Dashboard). Fideliza se suma como una rama más.
    let unit_amount = 0;
    let name = "";

    if (currency === 'eur') {
      if (plan_id === 'pro') {
        name = "Plan Presencia";
        unit_amount = interval === 'year' ? 9900 : 999; // €99.00 o €9.99
      } else if (plan_id === 'elite') {
        name = "Plan Ventas";
        unit_amount = interval === 'year' ? 19900 : 1999; // €199.00 o €19.99
      } else if (plan_id === 'fideliza') {
        name = "Plan Fideliza";
        unit_amount = interval === 'year' ? 29900 : 2999; // €299.00 o €29.99
      }
    } else if (currency === 'usd') {
      if (plan_id === 'pro') {
        name = "Plan Presencia";
        unit_amount = interval === 'year' ? 9900 : 999; // $99.00 o $9.99
      } else if (plan_id === 'elite') {
        name = "Plan Ventas";
        unit_amount = interval === 'year' ? 19900 : 1999; // $199.00 o $19.99
      } else if (plan_id === 'fideliza') {
        name = "Plan Fideliza";
        unit_amount = interval === 'year' ? 29900 : 2999; // $299.00 o $29.99
      }
    } else {
      // Default: MXN
      if (plan_id === 'pro') {
        name = "Plan Presencia";
        unit_amount = interval === 'year' ? 99000 : 9900; // $990 MXN o $99 MXN
      } else if (plan_id === 'elite') {
        name = "Plan Ventas";
        unit_amount = interval === 'year' ? 199000 : 19900; // $1,990 MXN o $199 MXN
      } else if (plan_id === 'fideliza') {
        name = "Plan Fideliza";
        unit_amount = interval === 'year' ? 299000 : 29900; // $2,990 MXN o $299 MXN
      }
    }

    if (unit_amount === 0) {
      return res.status(400).json({ error: 'Plan o combinación no válidos' });
    }

    // Prueba gratis de 7 días en los tres planes de pago, en mensual Y
    // en anual (15 nov 2026): la tarjeta se registra hoy y el primer
    // cobro es después de la prueba.
    // Anti-repetición: si el negocio YA tuvo una suscripción de Stripe
    // (tiene stripe_customer_id o stripe_subscription_id en la base),
    // no se le vuelve a dar prueba. El webhook escribe esos IDs al
    // completarse el primer checkout, así que la marca ya existe sin
    // necesidad de una columna nueva.
    let trialDays = ['pro', 'elite', 'fideliza'].includes(plan_id) ? 7 : 0;
    if (trialDays && (business.stripe_customer_id || business.stripe_subscription_id)) {
      trialDays = 0;
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      allow_promotion_codes: true,
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: name + (interval === 'year' ? ' (Anual)' : ' (Mensual)'),
              description: 'Suscripción CityMap para tu negocio',
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
      ...(trialDays ? { subscription_data: { trial_period_days: trialDays } } : {}),
      success_url: `${host}/cuenta?success=true&session_id={CHECKOUT_SESSION_ID}${trialDays ? '&trial=1' : ''}`,
      cancel_url: `${host}/precios?canceled=true`,
      client_reference_id: biz_id, // Para saber a qué negocio aplicar el plan
      metadata: {
        // El user_id verificado, no el del cuerpo: es lo que lee el
        // webhook para aplicar el plan, y ahora es confiable.
        user_id: user.id,
        plan_tier: plan_id
      },
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("Stripe Checkout Error:", error);
    res.status(500).json({ error: error.message });
  }
}
