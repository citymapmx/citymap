// Lógica pura de notificaciones y de solicitudes de negocio (sin React):
// se prueba como unitaria. La usan UserNotifs, AccountView, AdminPanel,
// BottomNav y el aviso de sin leer del store.

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

// Qué hace el tap sobre una notificación:
// - con enlace de edición → abre la edición de ese negocio;
// - con otro enlace → navega a esa URL;
// - sin enlace → no abre nada.
export function resolveNotifAction(n) {
  const link = n?.deep_link || n?.action_url;
  if (!link) return { kind: 'none' };
  const bizId = parseEditBizDeepLink(link);
  if (bizId) return { kind: 'edit-biz', bizId };
  return { kind: 'url', url: link };
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
