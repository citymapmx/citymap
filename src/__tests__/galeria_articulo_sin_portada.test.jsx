import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { galleryWithoutCover } from '../lib/experienceGallery.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// En el detalle del artículo la galería repetía la foto de portada:
// el hero ya muestra gallery[0] y la sección «Galería» la volvía a poner
// como primera foto. Pedido por Jonathan con captura (Excursión a
// Mazamitla, 10 nov 2026): la galería no debe mostrar la portada, y si
// no queda ninguna foto, la sección no se muestra. Solo cambia la vista;
// el arreglo `gallery` de la base se queda como está.

// URLs reales de la base (Excursión a Mazamitla y la cascada El Salto):
// [0] es la iglesia de Mazamitla, la portada/hero.
const MAZAMITLA = [
  'https://dpkjxhjkzdlkvyotoeai.supabase.co/storage/v1/object/public/media/cityguide/guadalajara-mazamitla.webp',
  'https://dpkjxhjkzdlkvyotoeai.supabase.co/storage/v1/object/public/media/cityguide/guadalajara-excursion-a-mazamitla-y-la-cascada-el-salto-galeria-2.webp',
  'https://dpkjxhjkzdlkvyotoeai.supabase.co/storage/v1/object/public/media/cityguide/guadalajara-excursion-a-mazamitla-y-la-cascada-el-salto-galeria-3.webp',
];

describe('galleryWithoutCover', () => {
  it('galería de 3 con portada repetida muestra solo las 2 restantes', () => {
    const photos = galleryWithoutCover(MAZAMITLA);
    expect(photos).toHaveLength(2);
    expect(photos).toEqual([MAZAMITLA[1], MAZAMITLA[2]]);
    expect(photos).not.toContain(MAZAMITLA[0]);
  });

  it('galería de 2 deja solo la foto que no es portada', () => {
    expect(galleryWithoutCover([MAZAMITLA[0], MAZAMITLA[1]])).toEqual([MAZAMITLA[1]]);
  });

  it('galería de 1 sola foto (solo la portada) queda vacía', () => {
    expect(galleryWithoutCover([MAZAMITLA[0]])).toEqual([]);
  });

  it('galería vacía o sin arreglo queda vacía', () => {
    expect(galleryWithoutCover([])).toEqual([]);
    expect(galleryWithoutCover(null)).toEqual([]);
    expect(galleryWithoutCover(undefined)).toEqual([]);
  });

  it('si la portada aparece duplicada en el arreglo, se quitan todas las copias', () => {
    expect(galleryWithoutCover([MAZAMITLA[0], MAZAMITLA[1], MAZAMITLA[0]])).toEqual([MAZAMITLA[1]]);
  });

  it('no muta el arreglo original', () => {
    const original = [...MAZAMITLA];
    galleryWithoutCover(MAZAMITLA);
    expect(MAZAMITLA).toEqual(original);
  });
});

describe('ExperienceViewer usa la galería sin portada', () => {
  const src = read('../components/ExperienceViewer.jsx');

  it('la sección «Galería» y el modal usan la galería sin portada', () => {
    expect(src).toContain('galleryWithoutCover');
    expect(src).toContain('const galleryPhotos = galleryWithoutCover(gallery);');
    // La sección solo se muestra si queda alguna foto tras quitar la portada.
    expect(src).toContain('{galleryPhotos.length > 0 && (');
    // Las casillas del grid y el modal leen de la galería filtrada.
    expect(src).toContain('galleryPhotos[0]');
    expect(src).toContain('galleryPhotos[1]');
    expect(src).toContain('galleryPhotos[2]');
    expect(src).toContain('photos={galleryPhotos.map(u => ({ url: u }))}');
  });

  it('la condición vieja (mostrar la galería con la portada incluida) ya no existe', () => {
    expect(src).not.toContain('gallery.length > 1');
  });

  it('el hero y los metadatos siguen usando la portada', () => {
    // El hero es gallery[0] y la tarjeta para compartir también.
    expect(src).toContain('const coverUrl = exp?.gallery?.[0] || null;');
    expect(src).toContain('const cover = gallery.length > 0 ? gallery[0] : null;');
    expect(src).toContain('<meta property="og:image" content={cover} />');
  });
});
