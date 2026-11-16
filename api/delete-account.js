import { authenticatePushRequest, pushCors } from '../server/pushTokenAuth.js';

// Eliminar cuenta (Guideline 2.1 de Apple: la app debe ofrecer borrar la
// cuenta). Borra los datos personales del usuario y, SOLO si la limpieza
// va bien, borra el usuario de Auth. Si un paso de limpieza falla, la
// cuenta queda intacta y el fallo es visible (500 con el paso que falló).
// Los negocios NUNCA se borran: solo quedan sin dueño (owner_id = null).
async function restDelete(auth, path) {
  const res = await fetch(`${auth.url}/rest/v1/${path}`, { method: 'DELETE', headers: auth.headers });
  if (!res.ok) throw new Error(`PostgREST ${res.status}`);
}

export default async function handler(req, res) {
  if (pushCors(req, res)) return;
  const auth = await authenticatePushRequest(req);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });
  const uid = encodeURIComponent(auth.userId);
  let step = 'favorites';
  try {
    // 1) Favoritos: negocios guardados y eventos guardados.
    await restDelete(auth, `favorites?user_id=eq.${uid}`);
    step = 'event_favorites';
    await restDelete(auth, `event_favorites?user_id=eq.${uid}`);
    // 2) Tarjetas de lealtad: primero el historial de sellos de sus
    //    membresías y luego las membresías (el historial referencia al
    //    miembro; el borrado en cascada también lo cubriría, pero se
    //    borra explícito para no depender de él).
    step = 'loyalty_members';
    const membersRes = await fetch(`${auth.url}/rest/v1/loyalty_members?user_id=eq.${uid}&select=id`, { headers: auth.headers });
    if (!membersRes.ok) throw new Error(`PostgREST ${membersRes.status}`);
    const members = await membersRes.json();
    const memberIds = (Array.isArray(members) ? members : []).map((m) => m.id).filter(Boolean);
    if (memberIds.length) {
      step = 'loyalty_stamp_events';
      await restDelete(auth, `loyalty_stamp_events?member_id=in.(${memberIds.join(',')})`);
    }
    await restDelete(auth, `loyalty_members?user_id=eq.${uid}`);
    // 3) Dispositivos push, reservaciones, reseñas y eventos creados.
    step = 'push_tokens';
    await restDelete(auth, `push_tokens?user_id=eq.${uid}`);
    step = 'reservations';
    await restDelete(auth, `reservations?user_id=eq.${uid}`);
    step = 'reviews';
    await restDelete(auth, `reviews?user_id=eq.${uid}`);
    step = 'events';
    await restDelete(auth, `events?user_id=eq.${uid}`);
    // 4) Fila de perfil (id = id del usuario).
    step = 'profiles';
    await restDelete(auth, `profiles?id=eq.${uid}`);
    // 5) Negocios: no se borran, solo quedan sin dueño.
    step = 'businesses';
    const bizRes = await fetch(`${auth.url}/rest/v1/businesses?owner_id=eq.${uid}`, {
      method: 'PATCH', headers: auth.headers, body: JSON.stringify({ owner_id: null }),
    });
    if (!bizRes.ok) throw new Error(`PostgREST ${bizRes.status}`);
    // 6) Solo con la limpieza completa: borrar el usuario de Auth.
    step = 'auth';
    const authRes = await fetch(`${auth.url}/auth/v1/admin/users/${uid}`, { method: 'DELETE', headers: auth.headers });
    if (!authRes.ok) throw new Error(`Auth ${authRes.status}`);
    return res.status(200).json({ deleted: true });
  } catch {
    // La cuenta queda intacta: el usuario de Auth NO se borró.
    return res.status(500).json({ error: 'No se pudo eliminar tu cuenta, inténtalo de nuevo', step });
  }
}
