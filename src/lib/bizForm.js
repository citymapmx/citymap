// Prefill del formulario de negocio (AddBizModal) a partir de una fila
// de `businesses`. Lo comparten AccountView (abrir la edición), AppRouter
// (onAddBiz con negocio existente) y App (convertir una apertura de
// creación en edición cuando el usuario ya tiene negocio).
// Se copian TODOS los campos que submitForm vuelve a enviar, para que la
// edición no borre datos que el asistente no muestra (mercado_libre,
// tags, video_url, booking_config...). El formulario viejo no prellenaba
// mercado_libre_nickname y cada edición lo dejaba en null.
export function bizToForm(b) {
  if (!b) return null;
  return {
    name: b.name || '',
    category: b.category || b.type || '',
    emoji: b.emoji || '',
    description: b.description || '',
    address: b.address || '',
    city: b.city_slug || '',
    phone: b.phone || '',
    whatsapp: b.whatsapp || '',
    website: b.website || '',
    mercado_libre_nickname: b.mercado_libre_nickname || '',
    video_url: b.video_url || '',
    logo_url: b.logo_url || '',
    menu_pdf_url: b.menu_pdf_url || '',
    booking_config: b.booking_config || null,
    lat: b.lat || '',
    lng: b.lng || '',
    tags: b.tags || [],
    photos: (b.photos || []).map((p) => p.url).filter(Boolean),
    facebook: b.facebook || '',
    instagram: b.instagram || '',
    tiktok: b.tiktok || '',
    schedule: b.schedule || {},
    owner_id: b.owner_id,
    user_id: b.user_id,
    plan: b.plan,
    status: b.status,
  };
}

// ¿Es este usuario el dueño del negocio? Dueño = owner_id o user_id
// coinciden. Los negocios creados con el asistente llevan user_id y
// owner_id en null; los reclamados llevan owner_id. El formulario viejo
// solo miraba owner_id y trataba al dueño como si no lo fuera.
export function isBizOwner(b, userId) {
  if (!b || !userId) return false;
  return b.owner_id === userId || b.user_id === userId;
}
