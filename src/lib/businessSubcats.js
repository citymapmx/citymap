// Subcategorías de la barra de filtros de una categoría: salen del campo
// `subcategory` de cada negocio y, si no tiene, de su `type`.
// Un `type` que es solo el nombre del propio negocio ("Cristina") no es
// un subtipo: no debe aparecer como filtro.
export function getAvailableSubcats(biz) {
  if (!Array.isArray(biz)) return [];
  const subcatMap = new Map();

  biz.forEach(b => {
    const candidates = [];
    if (b.subcategory) {
      candidates.push(...String(b.subcategory).split(/[,/•|]/));
    } else if (b.type) {
      candidates.push(...String(b.type).split(/[,/•|]/));
    }

    candidates.forEach(raw => {
      const item = raw.trim();
      if (!item || item.length <= 1) return;
      if (item.toLowerCase() === (b.name || '').trim().toLowerCase()) return;
      const key = item.toLowerCase();
      if (!subcatMap.has(key)) {
        subcatMap.set(key, item.charAt(0).toUpperCase() + item.slice(1));
      }
    });
  });

  return Array.from(subcatMap.values()).sort((a, b) => a.localeCompare(b));
}
