import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import ExperienceShareCardTemplate from '../components/ExperienceShareCardTemplate.jsx';
import {
  EXPERIENCE_SHARE_CARD_LAYOUT,
  EXPERIENCE_SHARE_CARD_STYLE_LIST,
  EXPERIENCE_SHARE_CARD_DEFAULT_STYLE,
  buildExperienceShareCardData,
  experienceShareCardFileName,
  experienceShareUrl,
  experienceShareCardPriceText,
  computeExperienceShareCardLayout,
  SHARE_CARD_FORMATS,
} from '../lib/experienceShareCard.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// Tarjeta para compartir el ARTÍCULO / experiencia de Revista: lo mismo
// que la tarjeta de eventos (PR #152) — botón Compartir en el detalle,
// hoja centrada Historia/Post, PNG dibujado en canvas — pero con los
// datos de la fila de `experiences` y los 2 estilos que eligió Jonathan
// de la demo `propuestas-de-tarjetas-para-articulos`: «Foto completa»
// (la foto llena la tarjeta y el precio va en una pastilla protagonista)
// y «Dividida» (foto a la izquierda y ficha de datos a la derecha).
// Sin círculo de logo (eso es solo para negocios con plan de pago).

// Tour real de la base como caso de prueba: Excursión a Tequila con
// La Rojeña, Guadalajara, $1,881, 6–8 horas, Español/Inglés, SIN
// reseñas (rating 0) — la demo mostraba un «4.9 · 13,275 reseñas»
// ILUSTRATIVO que no existe en la base y aquí nunca se copia.
const TEQUILA = {
  title: 'Excursión a Tequila con visita a la destilería La Rojeña de José Cuervo',
  slug: 'excursion-a-tequila-la-rojeña',
  city_slug: 'guadalajara',
  activity_type: 'Tour',
  description:
    '<h2>Tequila</h2><p>Excursión de día completo a Tequila con visita a la destilería La Rojeña de José Cuervo, degustación y tiempo libre en el pueblo mágico.</p>',
  duration: '6 horas - 8 horas',
  languages: 'Español, Inglés',
  people: null,
  price: 1881,
  rating: 0,
  review_count: 0,
  gallery: [
    'https://dpkjxhjkzdlkvyotoeai.supabase.co/storage/v1/object/public/media/cityguide/1794186715000_guadalajara-tequila.webp',
  ],
};
// Guía gratuita sin foto ni precio: el precio es «Gratis» y la tarjeta
// sale con el bloque de la inicial, nunca rota.
const GUIA_GRATIS = {
  title: 'Guía de Chapala: qué hacer en un día',
  slug: 'guia-de-chapala-que-hacer-en-un-dia',
  city_slug: 'guadalajara',
  activity_type: 'Guía',
  description: 'Qué ver, dónde comer y cómo llegar a Chapala en un día desde Guadalajara.',
  duration: null,
  languages: null,
  people: null,
  price: 0,
  rating: 0,
  review_count: 0,
  gallery: [],
};
// Tour CON calificación real en la fila: la tarjeta sí la muestra.
const CON_RESENAS = {
  ...TEQUILA,
  title: 'Tour de Tequila con cata premium',
  slug: 'tour-de-tequila-con-cata-premium',
  rating: 4.8,
  review_count: 132,
};
// Título largo (97 caracteres): debe caber completo, achicando la
// fuente, sin «…». Más largo que esto (~108 caracteres en «foto») ya no
// entra en 3 líneas ni al tamaño mínimo y se corta — ese es el límite
// diseñado, igual que en la tarjeta de eventos (PR #153).
const LARGO = {
  ...TEQUILA,
  title:
    'Excursión privada a Tequila y Amatitán con cata premium en la destilería La Rojeña de José Cuervo',
  slug: 'excursion-privada-tequila-amatitan',
};

function fotoEnds(geo) {
  const ends = [];
  if (geo.title) {
    ends.push(
      geo.title.y +
        (geo.title.lines.length - 1) * geo.title.lineH +
        geo.title.lineH / 2,
    );
  }
  if (geo.city) ends.push(geo.city.y + (geo.city.size * geo.L.titleLineH) / 2);
  if (geo.rating) ends.push(geo.rating.y + (geo.rating.size * geo.L.titleLineH) / 2);
  if (geo.desc) {
    ends.push(
      geo.desc.y +
        (geo.desc.lines.length - 1) * geo.desc.lineH +
        geo.desc.lineH / 2,
    );
  }
  if (geo.dataRows) {
    ends.push(
      geo.dataRows.y +
        (geo.dataRows.lines.length - 1) * geo.dataRows.lineH +
        geo.dataRows.lineH / 2,
    );
  }
  if (geo.pricePill) ends.push(geo.pricePill.y + geo.pricePill.h);
  return ends;
}

function divididaFirstTop(geo) {
  if (geo.title) return geo.title.y - geo.title.lineH / 2;
  if (geo.city) return geo.city.y - (geo.city.size * geo.L.titleLineH) / 2;
  if (geo.rating) return geo.rating.y - (geo.rating.size * geo.L.titleLineH) / 2;
  if (geo.desc) return geo.desc.y - geo.desc.lineH / 2;
  if (geo.dataRows) return geo.dataRows.y - geo.dataRows.lineH / 2;
  return geo.pricePill.y;
}

describe('tarjeta para compartir el artículo: datos reales', () => {
  it('tequila: foto de la galería, ciudad, precio real, duración e idiomas', () => {
    const d = buildExperienceShareCardData(TEQUILA, { cityName: 'Guadalajara' });
    expect(d.photoUrl).toContain('1794186715000_guadalajara-tequila.webp');
    expect(d.title).toBe(
      'Excursión a Tequila con visita a la destilería La Rojeña de José Cuervo',
    );
    expect(d.cityName).toBe('Guadalajara');
    expect(d.cityLine).toBe('📍 Guadalajara');
    expect(d.priceText).toBe('$1,881 MXN');
    expect(d.dataLine).toBe('⏱ 6 horas - 8 horas · Español, Inglés');
    // La descripción trae HTML: se quitan las etiquetas, sin inventar nada.
    expect(d.description).not.toContain('<');
    expect(d.description).toContain('destilería La Rojeña');
    // El enlace es la URL del detalle: /revista/:ciudad/:slug.
    expect(d.shareUrl).toBe(
      'https://citymap.mx/revista/guadalajara/excursion-a-tequila-la-rojeña',
    );
    expect(experienceShareUrl(TEQUILA)).toBe(d.shareUrl);
    expect(experienceShareCardFileName(TEQUILA)).toBe(
      'citymap-experiencia-excursion-a-tequila-la-rojeña.png',
    );
  });

  it('precio 0 → «Gratis»; sin foto → photoUrl null', () => {
    const d = buildExperienceShareCardData(GUIA_GRATIS, { cityName: 'Guadalajara' });
    expect(d.priceText).toBe('Gratis');
    expect(experienceShareCardPriceText(GUIA_GRATIS)).toBe('Gratis');
    expect(d.photoUrl).toBeNull();
    expect(d.dataLine).toBe('');
  });

  it('calificación SOLO si es real: sin reseñas no se muestra nada (nunca el 4.9 de la demo)', () => {
    const sin = buildExperienceShareCardData(TEQUILA, { cityName: 'Guadalajara' });
    expect(TEQUILA.rating).toBe(0);
    expect(sin.ratingText).toBe('');
    const con = buildExperienceShareCardData(CON_RESENAS, { cityName: 'Guadalajara' });
    expect(con.ratingText).toBe('★ 4.8 (132)');
    // Rating sin reseñas, o reseñas sin rating: tampoco se muestra.
    expect(
      buildExperienceShareCardData(
        { ...CON_RESENAS, review_count: 0 },
        { cityName: 'Guadalajara' },
      ).ratingText,
    ).toBe('');
    expect(
      buildExperienceShareCardData(
        { ...CON_RESENAS, rating: 0 },
        { cityName: 'Guadalajara' },
      ).ratingText,
    ).toBe('');
  });

  it('la descripción se recorta a 170 caracteres y sin HTML', () => {
    const d = buildExperienceShareCardData(
      {
        ...TEQUILA,
        description: `<p>${'Una descripción larguísima '.repeat(12)}</p>`,
      },
      { cityName: 'Guadalajara' },
    );
    expect(d.description).not.toContain('<');
    expect(d.description.length).toBeLessThanOrEqual(171);
    expect(d.description.endsWith('…')).toBe(true);
  });

  it('los estilos son solo los 2 elegidos por Jonathan, «foto» por defecto', () => {
    expect(EXPERIENCE_SHARE_CARD_STYLE_LIST.map((s) => s.id)).toEqual([
      'foto',
      'dividida',
    ]);
    expect(EXPERIENCE_SHARE_CARD_DEFAULT_STYLE).toBe('foto');
  });
});

describe('tarjeta para compartir el artículo: geometría «foto» (vista previa = PNG)', () => {
  it('la foto crece y no queda franja vacía entre el último bloque y el pie', () => {
    for (const format of [SHARE_CARD_FORMATS.story, SHARE_CARD_FORMATS.post]) {
      for (const exp of [TEQUILA, GUIA_GRATIS, CON_RESENAS]) {
        const d = buildExperienceShareCardData(exp, { cityName: 'Guadalajara' });
        const geo = computeExperienceShareCardLayout(d, format, 'foto');
        // La foto es más alta que su mínimo: se comió el espacio libre.
        expect(geo.photo.h).toBeGreaterThan(geo.L.photoMinH);
        // Entre el fin del último bloque y el pie hay exactamente el
        // hueco diseñado (footGap), no un tercio de tarjeta vacía.
        const lastEnd = Math.max(...fotoEnds(geo));
        const footTop = geo.height - geo.L.pad - geo.L.footSize;
        // Tolerancia de 1e-9 px: las alturas de línea (tamaño × 1.12)
        // son decimales no exactos en binario y la suma arrastra polvo
        // de coma flotante; el hueco diseñado es footGap, sin hueco
        // vacío ni desbordamiento.
        expect(footTop - lastEnd).toBeCloseTo(geo.L.footGap, 9);
      }
    }
  });

  it('la pastilla de precio es el precio real (o «Gratis») y está centrada', () => {
    for (const format of [SHARE_CARD_FORMATS.story, SHARE_CARD_FORMATS.post]) {
      const geo = computeExperienceShareCardLayout(
        buildExperienceShareCardData(TEQUILA, { cityName: 'Guadalajara' }),
        format,
        'foto',
      );
      expect(geo.pricePill.text).toBe('$1,881 MXN');
      expect(geo.pricePill.x + geo.pricePill.w / 2).toBe(geo.width / 2);
      const gratis = computeExperienceShareCardLayout(
        buildExperienceShareCardData(GUIA_GRATIS, { cityName: 'Guadalajara' }),
        format,
        'foto',
      );
      expect(gratis.pricePill.text).toBe('Gratis');
    }
  });

  it('el título cabe siempre completo, sin «…», en Historia y en Post', () => {
    for (const format of [SHARE_CARD_FORMATS.story, SHARE_CARD_FORMATS.post]) {
      for (const exp of [TEQUILA, LARGO]) {
        const d = buildExperienceShareCardData(exp, { cityName: 'Guadalajara' });
        const geo = computeExperienceShareCardLayout(d, format, 'foto');
        expect(geo.title.lines.length).toBeGreaterThan(0);
        expect(geo.title.lines.length).toBeLessThanOrEqual(
          EXPERIENCE_SHARE_CARD_LAYOUT.foto[format.id].titleMaxLines,
        );
        for (const line of geo.title.lines) expect(line).not.toContain('…');
        expect(geo.title.lines.join(' ')).toBe(exp.title);
        // La fuente nunca es mayor que la del estilo.
        expect(geo.title.size).toBeLessThanOrEqual(
          EXPERIENCE_SHARE_CARD_LAYOUT.foto[format.id].titleSize,
        );
      }
    }
  });
});

describe('tarjeta para compartir el artículo: geometría «dividida»', () => {
  it('la columna de datos va centrada en la fila dividida, sin desbordar', () => {
    for (const format of [SHARE_CARD_FORMATS.story, SHARE_CARD_FORMATS.post]) {
      for (const exp of [TEQUILA, GUIA_GRATIS, CON_RESENAS]) {
        const d = buildExperienceShareCardData(exp, { cityName: 'Guadalajara' });
        const geo = computeExperienceShareCardLayout(d, format, 'dividida');
        // La foto llena toda la altura de la fila dividida.
        expect(geo.photo.h).toBe(geo.split.h);
        expect(geo.photo.w).toBe(geo.L.photoW);
        const firstTop = divididaFirstTop(geo);
        const lastEnd = Math.max(...fotoEnds(geo));
        // Centrada: el hueco arriba de la columna es igual al de abajo.
        expect(geo.split.y + geo.split.h - lastEnd).toBeCloseTo(
          firstTop - geo.split.y,
          9,
        );
        // Nada se sale de la fila ni se come el pie.
        expect(firstTop).toBeGreaterThanOrEqual(geo.split.y - 1e-9);
        expect(lastEnd).toBeLessThanOrEqual(geo.split.y + geo.split.h + 1e-9);
        const footTop = geo.height - geo.L.pad - geo.L.footSize;
        expect(footTop - lastEnd).toBeGreaterThanOrEqual(geo.L.footGap - 1e-9);
      }
    }
  });

  it('la pastilla de precio va a la izquierda, en la columna de datos', () => {
    for (const format of [SHARE_CARD_FORMATS.story, SHARE_CARD_FORMATS.post]) {
      const geo = computeExperienceShareCardLayout(
        buildExperienceShareCardData(TEQUILA, { cityName: 'Guadalajara' }),
        format,
        'dividida',
      );
      expect(geo.pricePill.text).toBe('$1,881 MXN');
      expect(geo.pricePill.x).toBe(geo.L.pad + geo.L.photoW + geo.L.colGap);
      expect(geo.pricePill.x + geo.pricePill.w).toBeLessThanOrEqual(
        geo.width - geo.L.pad,
      );
    }
  });

  it('el título cabe completo en la columna, sin «…»', () => {
    // La columna es angosta (440 px en Historia): el título de ejemplo
    // (74 caracteres) cabe en 4 líneas achicando la fuente; uno más
    // largo ya no entraría y se cortaría, como en «foto».
    for (const format of [SHARE_CARD_FORMATS.story, SHARE_CARD_FORMATS.post]) {
      const d = buildExperienceShareCardData(TEQUILA, { cityName: 'Guadalajara' });
      const geo = computeExperienceShareCardLayout(d, format, 'dividida');
      expect(geo.title.lines.length).toBeLessThanOrEqual(
        EXPERIENCE_SHARE_CARD_LAYOUT.dividida[format.id].titleMaxLines,
      );
      for (const line of geo.title.lines) expect(line).not.toContain('…');
      expect(geo.title.lines.join(' ')).toBe(TEQUILA.title);
    }
  });
});

describe('tarjeta para compartir el artículo: la plantilla se renderiza (vista previa real)', () => {
  it('foto en Historia: título, precio, ciudad, datos y logo; sin la calificación inventada', () => {
    const d = buildExperienceShareCardData(TEQUILA, { cityName: 'Guadalajara' });
    const html = renderToStaticMarkup(
      <ExperienceShareCardTemplate data={d} format={SHARE_CARD_FORMATS.story} styleId="foto" />,
    );
    expect(html).toContain('Excursión a Tequila');
    expect(html).toContain('La Rojeña');
    expect(html).toContain('$1,881 MXN');
    expect(html).toContain('Guadalajara');
    expect(html).toContain('6 horas - 8 horas');
    expect(html).toContain('Español, Inglés');
    expect(html).toContain('/logo-brand.png');
    expect(html).toContain('Descúbrelo en');
    // La demo mostraba «4.9 · 13,275 reseñas»: ilustrativo, no real.
    expect(html).not.toContain('13,275');
    expect(html).not.toContain('4.9');
  });

  it('dividida en Post: fondo claro, logo oscuro, título y precio', () => {
    const d = buildExperienceShareCardData(TEQUILA, { cityName: 'Guadalajara' });
    const html = renderToStaticMarkup(
      <ExperienceShareCardTemplate data={d} format={SHARE_CARD_FORMATS.post} styleId="dividida" />,
    );
    expect(html).toContain('Excursión a Tequila');
    expect(html).toContain('$1,881 MXN');
    expect(html).toContain('background:#FFFFFF');
    expect(html).toContain('brightness(0)');
    expect(html).toContain('/logo-brand.png');
  });

  it('con reseñas reales: la calificación sí se pinta', () => {
    const d = buildExperienceShareCardData(CON_RESENAS, { cityName: 'Guadalajara' });
    const html = renderToStaticMarkup(
      <ExperienceShareCardTemplate data={d} format={SHARE_CARD_FORMATS.story} styleId="foto" />,
    );
    expect(html).toContain('4.8');
    expect(html).toContain('(132)');
  });

  it('sin foto: sale el bloque con la inicial, no una imagen rota', () => {
    const d = buildExperienceShareCardData(GUIA_GRATIS, { cityName: 'Guadalajara' });
    const html = renderToStaticMarkup(
      <ExperienceShareCardTemplate data={d} format={SHARE_CARD_FORMATS.post} styleId="foto" />,
    );
    expect(html).toContain('Guía de Chapala');
    expect(html).toContain('Gratis');
    expect(html).toContain('>G</span>');
    expect(html).not.toContain('<img src=""');
  });
});

describe('tarjeta para compartir el artículo: cableado', () => {
  const lib = read('../lib/experienceShareCard.js');
  const template = read('../components/ExperienceShareCardTemplate.jsx');
  const sheet = read('../components/ExperienceShareCardSheet.jsx');
  const viewer = read('../components/ExperienceViewer.jsx');

  it('el botón Compartir del detalle abre la hoja de la tarjeta', () => {
    expect(viewer).toContain(
      "const ExperienceShareCardSheet = lazy(() => import('./ExperienceShareCardSheet.jsx'))",
    );
    expect(viewer).toContain('const [showShareSheet, setShowShareSheet] = useState(false)');
    expect(viewer).toContain('setShowShareSheet(true)');
    expect(viewer).toContain('<ExperienceShareCardSheet');
    expect(viewer).toContain('experience={exp}');
    expect(viewer).toContain('onShareLink={handleShareLink}');
    // handleShareLink conserva el compartir nativo de antes.
    expect(viewer).toContain('navigator.share');
    expect(viewer).toContain('window.location.href');
  });

  it('la hoja es la misma centrada de eventos/negocios, con los dos formatos y los dos estilos', () => {
    expect(sheet).toContain('SHARE_CARD_FORMAT_LIST.map');
    expect(sheet).toContain('{f.label}');
    expect(sheet).toContain('{f.width} × {f.height}');
    expect(sheet).toContain('Compartir imagen');
    expect(sheet).toContain('Compartir enlace');
    expect(sheet).toContain("e?.name === 'AbortError'");
    expect(sheet).toContain('buildExperienceShareCardData(experience, { cityName })');
    expect(sheet).toContain('exportExperienceShareCardPng(dataToExport, format, styleId)');
    expect(sheet).toContain('experienceShareCardFileName(experience)');
    expect(sheet).toContain('La foto no se pudo cargar');
    // Tarjeta centrada con las 4 esquinas redondeadas (PR #147).
    expect(sheet).toContain("alignItems: 'center'");
    expect(sheet).toContain('borderRadius: 24,');
    expect(sheet).toContain("width: 'calc(100vw - 32px)'");
    expect(sheet).toContain('maxWidth: 460');
    expect(sheet).toContain("maxHeight: '92dvh'");
    expect(sheet).toContain('className="scale-in-center"');
    expect(sheet).not.toContain("position: 'sticky'");
    expect(sheet).not.toContain('Publicar en Instagram');
    const m = sheet.match(/const PREVIEW_W = (\d+)/);
    expect(m).not.toBeNull();
    expect(Number(m[1])).toBeLessThanOrEqual(220);
    // Selector de estilo como en negocios: chevrones, puntos y swipe.
    expect(sheet).toContain('EXPERIENCE_SHARE_CARD_STYLE_LIST');
    expect(sheet).toContain('Estilo anterior');
    expect(sheet).toContain('Estilo siguiente');
    expect(sheet).toContain('SWIPE_MIN_PX');
    expect(sheet).toContain('goStyle');
  });

  it('la plantilla lleva el logo oficial, la foto con CORS y el pie', () => {
    expect(template).toContain('src="/logo-brand.png"');
    expect(template).toContain('brightness(0) invert(1)');
    expect(template).toContain('Descúbrelo en');
    expect(template).toContain('>CityMap</span>');
    expect(template).toContain('crossOrigin="anonymous"');
    expect(template).toContain('{photoSrc ? (');
    expect(template).toContain('computeExperienceShareCardLayout');
    expect(template).toContain('L.photoMinH');
    expect(template).toContain("flex: dark ? 'none' : 1");
    // Sin círculo de logo del negocio: eso es solo para negocios.
    expect(template).not.toContain('bizLogo');
    expect(template).not.toContain('logo circular');
  });

  it('la imagen se genera dibujando en canvas, nunca en blanco', () => {
    // PR #143: html-to-image sobre el nodo fuera de pantalla devolvía
    // un PNG 100% transparente. La tarjeta de artículos nace ya en
    // canvas 2D, con el mismo guarda anti-blanco de los negocios.
    expect(lib).toContain("getContext('2d')");
    expect(lib).toContain('canvas.toBlob');
    expect(lib).toContain('assertCanvasNotBlank');
    expect(lib).not.toContain("import('html-to-image')");
    expect(lib).toContain('loadShareCardPhoto');
    expect(lib).toContain('loadShareCardLogoWhite');
    expect(lib).toContain('loadShareCardLogoDark');
    expect(lib).toContain('drawCoverImage');
    expect(sheet).not.toContain('left: -10000');
    // La vista previa y el PNG comparten UNA geometría.
    expect(lib).toContain('EXPERIENCE_SHARE_CARD_LAYOUT');
    expect(lib).toContain('computeExperienceShareCardLayout');
    expect(template).toContain('computeExperienceShareCardLayout');
    // La calificación solo se muestra si es real (rating y reseñas).
    expect(lib).toContain('rating > 0');
    expect(lib).toContain('review_count > 0');
  });
});
