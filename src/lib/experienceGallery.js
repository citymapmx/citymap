// Fotos de la sección «Galería» del detalle del artículo (Revista):
// la foto de portada (gallery[0], la misma del hero) NO se repite en la
// galería. Se excluye por URL: cualquier foto cuya URL sea igual a la de
// la portada queda fuera (si la portada apareciera duplicada en el arreglo,
// también se quitan las copias). El arreglo `gallery` de la base no se
// toca: solo cambia lo que se muestra.
export function galleryWithoutCover(gallery) {
  if (!Array.isArray(gallery) || gallery.length === 0) return [];
  const cover = gallery[0];
  return gallery.filter((url) => url !== cover);
}
