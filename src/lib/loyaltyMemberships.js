// Carga de «Tus Tarjetas Activas»: las membresías de lealtad del usuario
// con su tarjeta y su negocio.
//
// Es la MISMA fuente que usa «Recompensas» (WalletView) y la nueva sección
// del perfil (ProfileLoyaltyCarousel): un solo camino de datos, no dos.
// - Una membresía por negocio (la primera, ordenada por último sello).
// - Se descartan las entradas sin tarjeta o sin negocio.
// - Sin usuario (o sin membresías) devuelve [].
import { sb } from './supabase.js';

export async function loadLoyaltyEntries(user) {
  if (!user) return [];
  let members = await sb.get('loyalty_members', `?user_id=eq.${user.id}&order=last_stamp_at.desc.nullslast`) || [];

  const seenBiz = new Set();
  members = members.filter(m => {
    if (seenBiz.has(m.biz_id)) return false;
    seenBiz.add(m.biz_id);
    return true;
  });

  const results = await Promise.all(members.map(async (m) => {
    const [cards, bizArr] = await Promise.all([
      sb.get('loyalty_cards', `?id=eq.${m.card_id}&limit=1`),
      sb.get('businesses', `?id=eq.${m.biz_id}&limit=1`),
    ]);
    return { member: m, card: cards?.[0] || null, biz: bizArr?.[0] || null };
  }));

  return results.filter(e => e.card && e.biz);
}

// Precarga al abrir la app (12 Nov 2026, Jonathan eligió «Cargarla al abrir
// la app»): la tarjeta tardaba en aparecer porque se cargaba al entrar en
// el perfil, con 2 consultas seguidas a la base y sin caché ni placeholder.
// App.jsx dispara prefetchLoyaltyEntries(user) en cuanto conoce la sesión
// (y al iniciar sesión después); el carrusel del perfil consume la promesa
// ya en curso o resuelta, así la tarjeta ya está ahí al abrir el perfil.
// - Solo se precarga una vez por usuario: la segunda llamada reusa la misma
//   promesa y NO vuelve a consultar la base.
// - Si la precarga falla, se descarta: el carrusel carga al entrar como
//   siempre (sin regresión ni crash).
// - Al cerrar sesión, App.jsx llama clearPrefetchedLoyaltyEntries() para no
//   enseñar las tarjetas del usuario anterior.
// - REFRESCO (12 Nov 2026, la tarjeta recién unida no aparecía sin
//   recargar): la promesa precargada es una foto del momento en que se
//   precargó; si el usuario se une a un programa DESPUÉS, la foto sigue
//   siendo la vieja (vacía). Por eso el carrusel, al entrar, muestra la
//   precarga al instante Y refresca en segundo plano con
//   refreshLoyaltyEntries(user), y el join invalida la caché con
//   clearPrefetchedLoyaltyEntries() al crear la membresía. Si el refresco
//   falla, la caché se descarta pero la llamada rechaza, para que quien la
//   esperaba no borre lo que ya mostraba.
let prefetchedUserId = null;
let prefetchedPromise = null;

export function prefetchLoyaltyEntries(user) {
  if (!user?.id) return;
  if (prefetchedUserId === user.id && prefetchedPromise) return;
  prefetchedUserId = user.id;
  prefetchedPromise = loadLoyaltyEntries(user).catch(() => {
    if (prefetchedUserId === user.id) {
      prefetchedUserId = null;
      prefetchedPromise = null;
    }
    return [];
  });
}

export function getPrefetchedLoyaltyEntries(user) {
  if (!user?.id || prefetchedUserId !== user.id || !prefetchedPromise) return null;
  return prefetchedPromise;
}

// Refresca las entradas en segundo plano y deja la lista fresca como la
// nueva precarga (stale-while-revalidate): el carrusel muestra la precarga
// al instante y actualiza cuando llega la lista fresca, así una tarjeta
// unida después de la precarga aparece sin recargar. Si el refresco falla,
// la caché se descarta (la próxima lectura vuelve a cargar) pero la promesa
// devuelta RECHAZA, para que quien la esperaba conserve lo que ya mostraba
// en vez de borrarlo. Sin usuario resuelve [] como loadLoyaltyEntries.
export function refreshLoyaltyEntries(user) {
  if (!user?.id) return Promise.resolve([]);
  const fresh = loadLoyaltyEntries(user);
  prefetchedUserId = user.id;
  prefetchedPromise = fresh;
  fresh.catch(() => {
    if (prefetchedPromise === fresh) {
      prefetchedUserId = null;
      prefetchedPromise = null;
    }
  });
  return fresh;
}

export function clearPrefetchedLoyaltyEntries() {
  prefetchedUserId = null;
  prefetchedPromise = null;
}
