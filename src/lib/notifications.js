// Lógica pura de notificaciones y de solicitudes de negocio (sin React):
// se prueba como unitaria. La usan UserNotifs, AccountView, AdminPanel,
// BottomNav y el aviso de sin leer del store.
import { createSlug, cleanCityPrefix } from './utils.js';

// ── Conteo / globito ──────────────────────────────────────────────────────
export function unreadCount(notifs) {
  return (notifs || []).filter((n) => !n.read).length;
}

// Texto del globito: '' cuando no hay sin leer (no se muestra nada).
export function badgeText(count) {
  if (!count || count <= 0) return '';
  return count > 99 ? '99+' : String(count);
}

// Copia local con todo marcado como leído (al abrir la lista).
export function markAllReadLocal(notifs) {
  return (notifs || []).map((n) => ({ ...n, read: true }));
}

// ── Enlace profundo a la edición de un negocio ───────────────────────────
export function buildEditBizDeepLink(bizId) {
  return `/cuenta?editarNegocio=${bizId}`;
}

// Devuelve el id del negocio si el enlace es /cuenta?editarNegocio=<id>;
// null en cualquier otro caso (enlace normal, externo o ausente).
export function parseEditBizDeepLink(link) {
  if (!link || typeof link !== 'string') return null;
  try {
    const url = new URL(link, 'https://citymap.mx');
    if (url.pathname !== '/cuenta') return null;
    return url.searchParams.get('editarNegocio') || null;
  } catch {
    return null;
  }
}

// Qué hace el tap sobre una notificación. El tap NUNCA se queda en
// silencio: si no hay enlace, el destino se resuelve desde los datos de
// la notificación (business_id si lo trae, o el nombre del negocio en el
// cuerpo) y, si de verdad no hay destino, se abre /cuenta.
// - con enlace de edición → abre la edición de ese negocio;
// - con otro enlace → navega a esa URL;
// - cambio de negocio sin enlace → edición de ESE negocio;
// - negocio aprobado / reclamo aprobado sin enlace → ficha pública;
// - reserva sin enlace → /manage de ese negocio (o del único negocio);
// - lo demás sin enlace → /cuenta.
export function resolveNotifAction(n, myBizList = []) {
  const link = n?.deep_link || n?.action_url;
  if (link) {
    const bizId = parseEditBizDeepLink(link);
    if (bizId) return { kind: 'edit-biz', bizId, url: buildEditBizDeepLink(bizId) };
    return { kind: 'url', url: link };
  }
  const list = Array.isArray(myBizList) ? myBizList : [];
  // business_id directo, si la notificación lo trae (las viejas no lo
  // tienen: la tabla notifications no tiene esa columna).
  const bizId = n?.business_id || n?.biz_id || null;
  const byId = bizId ? list.find((b) => b.id === bizId) : null;
  const parsed = byId ? null : parseNotifBiz(n);
  const biz = byId || (parsed ? findBizByName(list, parsed.name) : null);
  if (biz) {
    if (parsed?.dest === 'manage' || n?.type === 'booking') {
      return { kind: 'url', url: `/manage/${biz.slug || biz.id}` };
    }
    if (parsed?.dest === 'page') {
      return { kind: 'biz-page', bizId: biz.id, url: bizPageUrl(biz) };
    }
    return { kind: 'edit-biz', bizId: biz.id, url: buildEditBizDeepLink(biz.id) };
  }
  // Reserva sin negocio identificable: con un solo negocio, es el suyo.
  if (n?.type === 'booking' && list.length === 1) {
    const only = list[0];
    return { kind: 'url', url: `/manage/${only.slug || only.id}` };
  }
  return { kind: 'cuenta', url: '/cuenta' };
}

// Nombre del negocio que menciona el cuerpo de la notificación y qué
// destino le toca: 'edit' (pedir cambios), 'page' (aprobado / reclamo)
// o 'manage' (reserva). null si el cuerpo no menciona ningún negocio.
// Los nombres se comparan sin espacios de más ni mayúsculas: «Prueba »
// (con espacio al final en la base) casa con «Prueba».
export function parseNotifBiz(n) {
  const body = String(n?.body || '');
  const patterns = [
    [/^Revisa las notas para (.+)\.$/, 'edit'],
    [/^Tu negocio (.+) ya es público\.$/, 'page'],
    [/^Eres el administrador oficial de (.+)\.$/, 'page'],
    [/^Tu reserva en (.+) ha sido /, 'manage'],
  ];
  for (const [re, dest] of patterns) {
    const m = body.match(re);
    if (m) return { name: m[1].trim(), dest };
  }
  return null;
}

export function normalizeBizName(name) {
  return String(name || '').trim().toLowerCase();
}

export function findBizByName(myBizList, name) {
  const target = normalizeBizName(name);
  if (!target) return null;
  return (myBizList || []).find((b) => normalizeBizName(b?.name) === target) || null;
}

// URL pública de la ficha: /<ciudad>/<slug sin prefijo de ciudad>.
export function bizPageUrl(biz) {
  const city = biz?.city_slug || '';
  if (!city) return '/cuenta';
  const slug = cleanCityPrefix(biz?.slug || createSlug(biz?.name || ''), city);
  return `/${city}/${slug}`;
}

// ── «Se requieren cambios» (admin → dueño) ───────────────────────────────
export function changeRequestTitle() {
  return 'Se requieren cambios';
}

export function changeRequestBody(bizName) {
  return `Revisa las notas para ${bizName}.`;
}

// Ya hay una igual sin leer para este negocio: no se vuelve a avisar.
// Falla abierta: si la consulta falla, el llamador avisa igual.
export function isDuplicateChangeRequest(existingNotifs, bizName) {
  const body = changeRequestBody(bizName);
  return (existingNotifs || []).some(
    (n) => !n.read && n.title === changeRequestTitle() && n.body === body,
  );
}

// Estado de una tarjeta de «Mis solicitudes»: qué pastilla lleva y si se
// puede editar. La pastilla de cambios es «Se requieren cambios» (no
// «En revisión»): el dueño lo ve sin entrar a Notificaciones.
export function bizRequestState(b) {
  const needsChanges = b?.status === 'needs_changes';
  return {
    needsChanges,
    pillKey: needsChanges ? 'requiere_cambios' : 'en_revision',
    pillDefault: needsChanges ? 'Se requieren cambios' : 'En revisión',
    showEdit: needsChanges,
  };
}
