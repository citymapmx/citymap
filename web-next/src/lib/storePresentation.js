export function readLegacyCatalog(businessId, storage) {
  try {
    const source = storage || (typeof window !== 'undefined' ? window.localStorage : null);
    const value = source?.getItem(`biz_iscatalog_${businessId}`);
    return value === 'true' ? true : value === 'false' ? false : null;
  } catch { return null; }
}
export function isCatalogBusiness(business, storage) {
  if (typeof business?.is_catalog === 'boolean') return business.is_catalog;
  return readLegacyCatalog(business?.id, storage) === true;
}
export async function saveStoreKind(business, catalog, client, storage) {
  const value = Boolean(catalog);
  // PostgREST devuelve [] (200) cuando RLS bloquea el UPDATE sin error:
  // sin esta comprobación el cambio parecía guardado («Menú guardado») y
  // al recargar volvía al tipo anterior (Fresas con crema Tepic, 26 nov
  // 2026: owner_id NULL, ningún UPDATE de businesses pasa por la app).
  // Si no hay filas actualizadas, es un fallo y no se toca localStorage.
  const updated = await client.patch('businesses', business.id, {is_catalog:value});
  if (!Array.isArray(updated) || updated.length === 0) {
    throw new Error('No se pudo guardar el tipo en la base. Intenta de nuevo.');
  }
  try {
    const target = storage || (typeof window !== 'undefined' ? window.localStorage : null);
    target?.setItem(`biz_iscatalog_${business.id}`,String(value));
  } catch { /* The saved business setting still works when local storage is blocked. */ }
  return {...business,is_catalog:value};
}
