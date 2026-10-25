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
  await client.patch('businesses', business.id, {is_catalog:value});
  try {
    const target = storage || (typeof window !== 'undefined' ? window.localStorage : null);
    target?.setItem(`biz_iscatalog_${business.id}`,String(value));
  } catch { /* The saved business setting still works when local storage is blocked. */ }
  return {...business,is_catalog:value};
}
