import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// Tarjeta para compartir el negocio (PR #142, v1; PR #143): al presionar
// Compartir en la ficha se genera una imagen PNG lista para
// Instagram/Facebook. v1: UN estilo oscuro, dos formatos (Historia IG y
// Post IG). Facebook y los otros estilos quedan para después.
// PR #143: el PNG se dibuja en canvas (el de html-to-image salía en
// blanco), con el logotipo oficial, la calificación de Google con su
// conteo, sin precio y con la foto creciendo para llenar la tarjeta.
// PR #144: el logo circular del negocio (mismo que la ficha) a caballo
// sobre el borde inferior de la foto, y la hoja compacta con los botones
// en un pie fijo para que se vean sin bajar.
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

  it('la tarjeta lleva el logotipo oficial de CityMap', () => {
    // /logo-brand.png es el logo real de la app (encabezado y splash),
    // en blanco sobre el fondo oscuro (misma inversión que Brand.jsx).
    expect(template).toContain('src="/logo-brand.png"');
    expect(template).toContain('brightness(0) invert(1)');
    // El exportador de canvas también lo dibuja, en blanco.
    expect(lib).toContain("'/logo-brand.png'");
    expect(lib).toContain('source-in');
    // El pie con la marca sigue.
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

  it('la calificación es la de Google, con su conteo de reseñas', () => {
    // La hoja pasa el displayRating completo (misma fuente que las
    // tarjetas de negocio: google_ratings_cache).
    expect(sheet).toContain('displayRating(biz, googleRatings)');
    expect(sheet).toContain('buildShareCardData(biz, { disp, cityName })');
    // Solo con dato vigente de Google hay píldora: la interna de
    // CityMap no se muestra en la tarjeta.
    expect(lib).toContain("disp?.source === 'google'");
    expect(lib).toContain('reviewCount');
    expect(lib).toContain('formatReviewCount');
    // La píldora muestra calificación + conteo, con la G de Google.
    expect(template).toContain('data.rating.toFixed(1)');
    expect(template).toContain('formatReviewCount(data.reviewCount');
    expect(template).toContain('src="/googlelogo.svg"');
    expect(lib).toContain("'/googlelogo.svg'");
  });

  it('el precio ya no se muestra en la tarjeta', () => {
    // buildShareCardData conserva el campo como dato, pero ni la
    // plantilla ni el exportador lo dibujan.
    expect(template).not.toContain('price');
    expect(lib).not.toContain('data.price');
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

  it('la imagen se genera dibujando en canvas, nunca en blanco', () => {
    // PR #143: html-to-image sobre el nodo fuera de pantalla
    // (left: -10000) devolvía un PNG 100% transparente. Ahora la imagen
    // se dibuja directo en canvas 2D y se comprueba que no salga en
    // blanco antes de descargar.
    expect(lib).not.toContain("import('html-to-image')");
    expect(lib).toContain("getContext('2d')");
    expect(lib).toContain('createImageBitmap');
    expect(lib).toContain('canvas.toBlob');
    expect(lib).toContain('drawImage');
    expect(lib).toContain('getImageData');
    expect(lib).toContain('blank-canvas');
    expect(sheet).not.toContain('left: -10000');
    expect(sheet).not.toContain('exportRef');
  });

  it('la foto crece y llena la tarjeta: sin franja vacía', () => {
    // Una sola geometría para la vista previa y el canvas.
    expect(lib).toContain('SHARE_CARD_LAYOUT');
    expect(lib).toContain('computeShareCardLayout');
    expect(template).toContain('computeShareCardLayout');
    expect(template).toContain('minHeight: L.photoMinH');
    expect(template).toContain('flex: 1');
    // El separador flexible que dejaba el hueco antes del pie ya no existe.
    expect(template).not.toContain('<div style={{ flex: 1 }} />');
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

  it('el logo circular del negocio (PR #144): mismo que la ficha, solo si lo tiene', () => {
    // La ficha (DetailView) solo muestra el círculo a los planes de
    // pago con logo_url; la tarjeta replica esa regla.
    expect(lib).toContain('bizShowsLogoCircle');
    expect(lib).toContain('logo_url');
    expect(lib).toContain("'premium'");
    expect(lib).toContain("'destacado'");
    expect(lib).toContain('bizLogoUrl');
    // Geometría compartida: diámetro y hueco en el layout, círculo
    // centrado sobre el borde inferior de la foto.
    expect(lib).toContain('bizLogoD');
    expect(lib).toContain('bizLogoGap');
    expect(lib).toContain('bizLogo');
    // La vista previa lo dibuja con el mismo estilo que la ficha
    // (círculo blanco, anillo y sombra) y lo quita si no carga.
    expect(template).toContain('getThumbUrl(data.bizLogoUrl, 300, 300)');
    expect(template).toContain('onBizLogoError');
    expect(template).toContain("borderRadius: '50%'");
    expect(template).toContain('0 6px 16px rgba(0,0,0,0.12)');
    // El exportador de canvas también lo dibuja (círculo + contain) y
    // si no carga, la tarjeta sale sin círculo.
    expect(lib).toContain('loadShareCardBizLogo');
    expect(lib).toContain('drawContainImage');
    expect(lib).toContain('ctx.arc');
    expect(sheet).toContain('onBizLogoError');
    expect(sheet).toContain('bizLogoFailed');
  });

  it('la hoja cabe sin bajar: vista previa chica y botones en pie fijo (PR #144)', () => {
    // Vista previa de 200 px (Historia: 356 px de alto) en vez de 300.
    const m = sheet.match(/const PREVIEW_W = (\d+)/);
    expect(m).not.toBeNull();
    expect(Number(m[1])).toBeLessThanOrEqual(220);
    // Los dos botones viven en un pie fijo al fondo de la hoja.
    expect(sheet).toContain("position: 'sticky'");
    expect(sheet).toContain('bottom: 0');
    expect(sheet).toContain('Compartir enlace');
    // La hoja sigue acotada en altura y con cierre.
    expect(sheet).toContain("maxHeight: '92dvh'");
    expect(sheet).toContain('onClose');
    // El párrafo largo de descripción se quitó para que quepa todo.
    expect(sheet).not.toContain('Una imagen con la foto y los datos del negocio');
  });
});
