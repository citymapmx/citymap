// Contenido bilingüe (fase 2 de inglés): títulos y descripciones de
// artículos/tours (experiences) y eventos (events).
//
// La base tendrá columnas `title_en` y `description_en` en esas tablas.
// Regla: si `lang === 'en'` y el campo `_en` existe y no está vacío,
// se muestra el inglés; en cualquier otro caso, el español.
// Los nombres propios, slugs y categorías no se tocan: esto solo elige
// entre los dos textos que ya trae la fila.
function localizedField(item, lang, fieldEn, fieldEs) {
  if (!item) return '';
  if (lang === 'en') {
    const en = item[fieldEn];
    if (typeof en === 'string' && en.trim() !== '') return en;
  }
  const es = item[fieldEs];
  return typeof es === 'string' ? es : (es ?? '');
}

export function localizedTitle(item, lang) {
  return localizedField(item, lang, 'title_en', 'title');
}

export function localizedDescription(item, lang) {
  return localizedField(item, lang, 'description_en', 'description');
}
