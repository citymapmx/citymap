import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// Tarjeta para compartir el negocio (PR #142, v1), como la de «Qué Plan»:
// al presionar Compartir en la ficha se genera una imagen PNG lista para
// Instagram/Facebook. v1: UN estilo oscuro, dos formatos (Historia IG y
// Post IG). Facebook y los otros estilos quedan para después.
describe('tarjeta para compartir el negocio', () => {
  const lib = read('../lib/shareCard.js');
  const template = read('../components/ShareCardTemplate.jsx');
  const sheet = read('../components/ShareCardSheet.jsx');
  const detail = read('../views/DetailView.jsx');

  it('el botón Compartir de la ficha abre la hoja de la tarjeta', () => {
    // El botón ya existía junto al corazón; ahora abre la hoja en vez
    // de compartir solo el enlace (eso queda como opción dentro).
    expect(detail).toContain("const ShareCardSheet = lazy(() => import('../components/ShareCardSheet.jsx'))");
    expect(detail).toContain('const [showShareCard, setShowShareCard] = useState(false)');
    expect(detail).toContain('setShowShareCard(true)');
    expect(detail).toContain('<ShareCardSheet biz={selected}');
    // El corazón al guardar sigue intacto en su sitio.
    expect(detail).toContain('SaveHeartButton');
  });

  it('dos formatos con sus medidas exactas', () => {
    expect(lib).toContain('width: 1080, height: 1920');
    expect(lib).toContain('width: 1080, height: 1080');
    expect(lib).toContain("label: 'Historia IG'");
    expect(lib).toContain("label: 'Post IG'");
    expect(sheet).toContain('Historia IG');
    expect(sheet).toContain('Post IG');
  });

  it('la tarjeta lleva la marca CityMap', () => {
    expect(template).toContain('Descúbrelo en CityMap');
  });

  it('compartir con el menú del sistema y fallback a descarga', () => {
    // Primero navigator.share con el archivo; si el navegador no puede
    // compartir archivos, descarga el PNG.
    expect(lib).toContain('navigator.canShare');
    expect(lib).toContain('navigator.share');
    expect(lib).toContain('createObjectURL');
    expect(lib).toContain('download');
    // La cancelación del menú por el usuario no es un error.
    expect(sheet).toContain("e?.name === 'AbortError'");
  });

  it('el precio no se inventa: sin precio no hay píldora', () => {
    expect(lib).toContain("? biz.price.trim() : null");
    expect(template).toContain('{data?.price ? (');
    // La calificación y la ciudad también son condicionales.
    expect(template).toContain('data.rating');
    expect(template).toContain('data?.cityName ? (');
  });

  it('la foto se lee con CORS y sin foto no hay imagen rota', () => {
    // Supabase y Cloudinary responden Access-Control-Allow-Origin: *
    // (verificado con curl el 10 nov 2026); la plantilla pide la foto
    // con crossOrigin anonymous y si falla sale el bloque sin foto.
    expect(template).toContain('crossOrigin="anonymous"');
    expect(template).toContain('{photoSrc ? (');
    expect(lib).toContain('isPhotoFetchable');
    expect(sheet).toContain('La foto no se pudo cargar');
  });

  it('la imagen se genera con html-to-image en el teléfono', () => {
    expect(lib).toContain("await import('html-to-image')");
    expect(lib).toContain('toBlob');
    expect(lib).toContain('pixelRatio: 1');
    // El nodo de exportación vive fuera de pantalla pero renderizado
    // (display:none no sirve para html-to-image) y no toca el layout.
    expect(sheet).toContain('left: -10000');
    expect(sheet).toContain('exportRef');
  });

  it('en web no se promete publicar directo en Instagram', () => {
    expect(sheet).not.toContain('Publicar en Instagram');
    expect(template).not.toContain('Publicar en Instagram');
    expect(lib).not.toContain('Publicar en Instagram');
    expect(sheet).toContain('Compartir imagen');
  });

  it('el «Compartir enlace» de antes sigue dentro de la hoja', () => {
    expect(sheet).toContain('Compartir enlace');
    expect(sheet).toContain('onShareLink');
    expect(detail).toContain('onShareLink={(b) => doShare(b)}');
  });
});
