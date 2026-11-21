import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://dpkjxhjkzdlkvyotoeai.supabase.co';
const ADMIN_EMAIL = 'admin@cityguide.com';
// Tras el pago solo se regresa a estos orígenes. Cualquier otro
// host_url del cliente cae a citymap.mx (sin open redirect).
const ALLOWED_HOSTS = ['https://citymap.mx', 'https://citymap.world'];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

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
  const auth = req.headers.get('authorization') || '';
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

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: CORS });
}

export async function POST(req) {
  if (!process.env.STRIPE_SECRET_KEY)
    return Response.json({ error: 'Falta configurar STRIPE_SECRET_KEY' }, { status: 500, headers: CORS });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  // Auth: solo el dueño del negocio (o un admin) puede crear el checkout.
  // Sin JWT válido no hay pago: antes cualquiera podía crear un checkout
  // para cualquier negocio con cualquier user_id.
  const caller = await verifyCaller(req);
  if (!caller.ok) {
    return Response.json(
      { error: caller.status === 500 ? 'Falta configurar la llave de Supabase' : 'Unauthorized' },
      { status: caller.status, headers: CORS },
    );
  }
  const user = caller.user;

  try {
    const { biz_id, plan_id, interval, host_url, currency: clientCurrency } = await req.json();
    const currency = (clientCurrency || 'mxn').toLowerCase();

    if (!biz_id)
      return Response.json({ error: 'Falta biz_id' }, { status: 400, headers: CORS });

    // El regreso tras el pago solo acepta orígenes conocidos.
    const host = ALLOWED_HOSTS.includes(host_url) ? host_url : 'https://citymap.mx';

    // Propiedad del negocio (fallo cerrado: sin service key o sin poder
    // leer el negocio, no se crea el checkout).
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey)
      return Response.json({ error: 'Falta configurar SUPABASE_SERVICE_ROLE_KEY' }, { status: 500, headers: CORS });
    const supabase = createClient(SUPABASE_URL, serviceRoleKey);
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('owner_id')
      .eq('id', biz_id)
      .maybeSingle();
    if (businessError) {
      console.error('Stripe Checkout business lookup failed:', businessError.message);
      return Response.json({ error: 'No se pudo verificar el negocio' }, { status: 500, headers: CORS });
    }
    if (!business)
      return Response.json({ error: 'Negocio no encontrado' }, { status: 404, headers: CORS });
    if (business.owner_id !== user.id && !isAdminUser(user))
      return Response.json({ error: 'Forbidden: solo el dueño del negocio puede pagar su plan' }, { status: 403, headers: CORS });

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
      success_url: `${host}/perfil?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${host}/precios?canceled=true`,
      client_reference_id: biz_id,
      // El user_id verificado, no el del cuerpo: es lo que lee el
      // webhook para aplicar el plan, y ahora es confiable.
      metadata: { user_id: user.id, plan_tier: plan_id },
    });

    return Response.json({ url: session.url }, { headers: CORS });
  } catch (error) {
    console.error('Stripe Checkout Error:', error);
    return Response.json({ error: error.message }, { status: 500, headers: CORS });
  }
}
