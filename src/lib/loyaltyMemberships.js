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
