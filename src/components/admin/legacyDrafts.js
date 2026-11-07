// Limpieza única de los borradores del sistema anterior de autoguardado.
// Borra las claves citymap_blog_draft_* que hayan quedado en el navegador
// para que los avisos antiguos no vuelvan a aparecer. Solo toca esas claves.
export function clearLegacyDrafts(storage) {
  const store = storage || (typeof localStorage !== "undefined" ? localStorage : null);
  if (!store) return 0;
  let removed = 0;
  try {
    const keys = [];
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i);
      if (k && k.startsWith("citymap_blog_draft_")) keys.push(k);
    }
    keys.forEach(k => { store.removeItem(k); removed += 1; });
  } catch {
    // Ignorar errores de acceso a localStorage
  }
  return removed;
}
