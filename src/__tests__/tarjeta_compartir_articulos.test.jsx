import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import ExperienceShareCardTemplate from '../components/ExperienceShareCardTemplate.jsx';
import { wrapShareCardText } from '../lib/shareCard.js';
import {
  EXPERIENCE_SHARE_CARD_LAYOUT,
  EXPERIENCE_SHARE_CARD_FORMATS,
  EXPERIENCE_SHARE_CARD_FORMAT_LIST,
  EXPERIENCE_SHARE_CARD_BLUE,
  buildExperienceShareCardData,
  experienceShareCardFileName,
  experienceShareUrl,
  experienceShareCardPriceText,
  computeExperienceShareCardLayout,
} from '../lib/experienceShareCard.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// Tarjeta para compartir el ARTÍCULO / experiencia de Revista: lo mismo
// que la tarjeta de eventos (PR #152) — botón Compartir en el detalle,
// hoja centrada, PNG dibujado en canvas — pero con los datos de la fila
// de `experiences` y UN SOLO estilo, «Foto completa», EXACTAMENTE como
// la propuesta 2 de la demo `propuestas-de-tarjetas-para-articulos`
// (corrección de Jonathan 10 Nov ~10:54: la «Dividida» clara se veía
// mal en vivo; el precio va en pastilla AZUL grande). Tres formatos:
// Historia 1080×1920, Post 1080×1080 y Horizontal 1080×566 (el tamaño
// oficial de Instagram para post horizontal). Sin círculo de logo (eso
// es solo para negocios con plan de pago).

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
// Tour real de la base con su descripción REAL (primer párrafo,
// textual): en vivo, en Horizontal 1080×566, la descripción se cortaba
// a mitad de palabra («…la cuna de la bebida más famos…») porque el
// recorte de la última línea quitaba caracteres uno a uno.
const TEQUILA_REAL = {
  ...TEQUILA,
  description:
    'Si estás en Guadalajara y quieres conocer de primera mano la cuna de la bebida más famosa de México, esta excursión a Tequila es el plan perfecto. En entre 6 y 8 horas te recogen en tu hotel, recorres los campos de agave, paseas por las calles de piedra del pueblo y terminas con una visita y una degustación en la destilería La Rojeña de José Cuervo.',
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

const ALL_FORMATS = [
  EXPERIENCE_SHARE_CARD_FORMATS.story,
  EXPERIENCE_SHARE_CARD_FORMATS.post,
  EXPERIENCE_SHARE_CARD_FORMATS.horizontal,
];

// Fin vertical del último bloque del texto (sin contar la pastilla de
// precio, que en Horizontal va al lado).
function textBlockEnd(geo) {
  const ends = [];
  if (geo.cityPill) ends.push(geo.cityPill.y + geo.cityPill.h);
  if (geo.title) {
    ends.push(
      geo.title.y +
        (geo.title.lines.length - 1) * geo.title.lineH +
        geo.title.lineH / 2,
    );
  }
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
  return Math.max(...ends);
}

describe('tarjeta para compartir el artículo: datos reales', () => {
  it('tequila: foto de la galería, ciudad · tipo, precio real, duración e idiomas', () => {
    const d = buildExperienceShareCardData(TEQUILA, { cityName: 'Guadalajara' });
    expect(d.photoUrl).toContain('1794186715000_guadalajara-tequila.webp');
    expect(d.title).toBe(
      'Excursión a Tequila con visita a la destilería La Rojeña de José Cuervo',
    );
    expect(d.cityName).toBe('Guadalajara');
    expect(d.activityType).toBe('Tour');
    expect(d.cityLine).toBe('📍 Guadalajara · Tour');
    expect(d.priceText).toBe('$1,881 MXN');
    expect(d.priced).toBe(true);
    expect(d.dataLine).toBe('⏱ 6 horas - 8 horas · 🌐 Español, Inglés');
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
    expect(d.priced).toBe(false);
    expect(experienceShareCardPriceText(GUIA_GRATIS)).toBe('Gratis');
    expect(d.photoUrl).toBeNull();
    expect(d.dataLine).toBe('');
    expect(d.cityLine).toBe('📍 Guadalajara · Guía');
  });

  it('calificación SOLO si es real: sin reseñas no se muestra nada (nunca el 4.9 de la demo)', () => {
    const sin = buildExperienceShareCardData(TEQUILA, { cityName: 'Guadalajara' });
    expect(TEQUILA.rating).toBe(0);
    expect(sin.ratingText).toBe('');
    const con = buildExperienceShareCardData(CON_RESENAS, { cityName: 'Guadalajara' });
    expect(con.ratingText).toBe('4.8 · 132 reseñas');
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

  it('los formatos son Historia, Post y Horizontal (1080×566, oficial de Instagram)', () => {
    expect(EXPERIENCE_SHARE_CARD_FORMAT_LIST.map((f) => f.id)).toEqual([
      'story',
      'post',
      'horizontal',
    ]);
    expect(EXPERIENCE_SHARE_CARD_FORMATS.story).toEqual({
      id: 'story',
      label: 'Historia IG',
      width: 1080,
      height: 1920,
    });
    expect(EXPERIENCE_SHARE_CARD_FORMATS.post).toEqual({
      id: 'post',
      label: 'Post IG',
      width: 1080,
      height: 1080,
    });
    expect(EXPERIENCE_SHARE_CARD_FORMATS.horizontal).toEqual({
      id: 'horizontal',
      label: 'Horizontal IG',
      width: 1080,
      height: 566,
    });
    // Proporción 1.91:1, la misma de la demo (1200×630).
    expect(1080 / 566).toBeCloseTo(1200 / 630, 2);
    // Ya no hay estilos: solo «Foto completa» (la «Dividida» se quitó).
    expect(EXPERIENCE_SHARE_CARD_BLUE).toBe('#2563EB');
  });
});

// Las palabras que muestra la descripción son siempre un prefijo de las
// palabras del texto recortado: si una línea se cortara a mitad de
// palabra, la última palabra mostrada sería un prefijo propio de la
// palabra real y el prefijo ya no coincidiría.
function descWordsArePrefix(excerpt, lines) {
  const shown = lines
    .join(' ')
    .replace(/…/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const words = excerpt
    .replace(/…/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return shown.every((w, i) => w === words[i]);
}

describe('tarjeta para compartir el artículo: la descripción nunca se corta a mitad de palabra', () => {
  it('wrapShareCardText recorta la última línea en límite de palabra, nunca «famos…»', () => {
    // Con la medida de los tests (sin document: ancho = nº de
    // caracteres × tamaño × 0,55), esta entrada obliga a recortar la
    // última línea: antes del arreglo salía «dddd eeee fff…».
    const lines = wrapShareCardText(
      'aaaa bbbb cccc dddd eeee ffff gggg hhhh',
      80,
      10,
      2,
    );
    expect(lines).toEqual(['aaaa bbbb cccc', 'dddd eeee…']);
    // Sin recorte no cambia nada.
    expect(wrapShareCardText('Hola mundo', 1000, 30, 2)).toEqual(['Hola mundo']);
  });

  it('una sola palabra más ancha que la tarjeta sigue recortándose por caracteres (no hay límite de palabra posible)', () => {
    const lines = wrapShareCardText('Supercalifragilisticoespialidoso corto', 80, 10, 1);
    expect(lines.length).toBe(1);
    expect(lines[0].endsWith('…')).toBe(true);
    expect(lines[0].startsWith('Supercalifrag')).toBe(true);
  });

  it('caso Tequila en Horizontal: la descripción real termina en límite de palabra en los 3 formatos', () => {
    const d = buildExperienceShareCardData(TEQUILA_REAL, { cityName: 'Guadalajara' });
    for (const format of ALL_FORMATS) {
      const geo = computeExperienceShareCardLayout(d, format);
      expect(geo.desc.lines.length).toBeGreaterThan(0);
      expect(descWordsArePrefix(d.description, geo.desc.lines)).toBe(true);
      // Y la línea de datos tampoco se parte a mitad de palabra.
      expect(descWordsArePrefix(d.dataLine, geo.dataRows.lines)).toBe(true);
    }
  });

  it('la descripción no se solapa con la línea de datos en la geometría compartida (vista previa = PNG)', () => {
    // La plantilla y el canvas usan el mismo layout: el fin del bloque
    // de descripción más el hueco es justo el inicio de los datos.
    const d = buildExperienceShareCardData(TEQUILA_REAL, { cityName: 'Guadalajara' });
    for (const format of ALL_FORMATS) {
      const geo = computeExperienceShareCardLayout(d, format);
      const descEnd =
        geo.desc.y + (geo.desc.lines.length - 1) * geo.desc.lineH + geo.desc.lineH / 2;
      const dataTop = geo.dataRows.y - geo.dataRows.lineH / 2;
      expect(dataTop - descEnd).toBeCloseTo(geo.L.dataGap, 9);
    }
  });
});

describe('tarjeta para compartir el artículo: geometría «Foto completa» (vista previa = PNG)', () => {
  it('la foto es a sangre completa y el bloque de texto termina en el margen inferior', () => {
    for (const format of ALL_FORMATS) {
      for (const exp of [TEQUILA, GUIA_GRATIS, CON_RESENAS]) {
        const d = buildExperienceShareCardData(exp, { cityName: 'Guadalajara' });
        const geo = computeExperienceShareCardLayout(d, format);
        // La foto llena TODA la tarjeta, como la demo.
        expect(geo.photo).toEqual({ x: 0, y: 0, w: format.width, h: format.height });
        // El bloque de texto (o la pastilla, que va debajo en
        // Historia/Post) termina exactamente en el margen inferior.
        const lastEnd = Math.max(
          textBlockEnd(geo),
          geo.pricePill.y + geo.pricePill.h,
        );
        expect(lastEnd).toBeCloseTo(geo.height - geo.L.pad, 9);
        // Nada se sale de la tarjeta.
        expect(geo.brandPill.x).toBeGreaterThanOrEqual(0);
        expect(geo.brandPill.y).toBeGreaterThanOrEqual(0);
        expect(geo.pricePill.x + geo.pricePill.w).toBeLessThanOrEqual(geo.width);
        expect(geo.pricePill.y + geo.pricePill.h).toBeLessThanOrEqual(geo.height);
        if (geo.ratingPill) {
          expect(geo.ratingPill.x + geo.ratingPill.w).toBeLessThanOrEqual(
            geo.width - geo.L.pad,
          );
        }
      }
    }
  });

  it('la pastilla de precio es azul, con el precio real (o «Gratis»), a la derecha', () => {
    for (const format of ALL_FORMATS) {
      const geo = computeExperienceShareCardLayout(
        buildExperienceShareCardData(TEQUILA, { cityName: 'Guadalajara' }),
        format,
      );
      expect(geo.pricePill.text).toBe('$1,881 MXN');
      expect(geo.pricePill.priced).toBe(true);
      // A la derecha, pegada al margen.
      expect(geo.pricePill.x + geo.pricePill.w).toBe(geo.width - geo.L.pad);
      const gratis = computeExperienceShareCardLayout(
        buildExperienceShareCardData(GUIA_GRATIS, { cityName: 'Guadalajara' }),
        format,
      );
      expect(gratis.pricePill.text).toBe('Gratis');
      expect(gratis.pricePill.priced).toBe(false);
    }
  });

  it('en Horizontal el precio va AL LADO del texto; en Historia/Post, DEBAJO', () => {
    const tequila = buildExperienceShareCardData(TEQUILA, { cityName: 'Guadalajara' });
    const h = computeExperienceShareCardLayout(
      tequila,
      EXPERIENCE_SHARE_CARD_FORMATS.horizontal,
    );
    // Al lado: la pastilla empieza a la derecha de la columna de texto
    // y su base coincide con la del bloque de texto.
    expect(h.pricePill.x).toBeGreaterThan(h.title.x + 200);
    expect(h.pricePill.y + h.pricePill.h).toBeCloseTo(textBlockEnd(h), 9);
    // La columna de texto deja hueco para la pastilla.
    expect(h.title.lines.join(' ')).toBe(TEQUILA.title);
    for (const format of [
      EXPERIENCE_SHARE_CARD_FORMATS.story,
      EXPERIENCE_SHARE_CARD_FORMATS.post,
    ]) {
      const geo = computeExperienceShareCardLayout(tequila, format);
      // Debajo: la pastilla empieza después de los datos y ocupa todo
      // el ancho disponible a la derecha.
      expect(geo.pricePill.y).toBeGreaterThan(textBlockEnd(geo) - geo.pricePill.h);
      expect(geo.pricePill.y + geo.pricePill.h).toBeCloseTo(
        geo.height - geo.L.pad,
        9,
      );
    }
  });

  it('las pastillas superiores: citymap.mx a la izquierda, calificación a la derecha (solo si es real)', () => {
    for (const format of ALL_FORMATS) {
      const sin = computeExperienceShareCardLayout(
        buildExperienceShareCardData(TEQUILA, { cityName: 'Guadalajara' }),
        format,
      );
      expect(sin.brandPill.x).toBe(sin.L.pad);
      expect(sin.brandPill.y).toBe(sin.L.pad);
      expect(sin.ratingPill).toBeNull();
      const con = computeExperienceShareCardLayout(
        buildExperienceShareCardData(CON_RESENAS, { cityName: 'Guadalajara' }),
        format,
      );
      expect(con.ratingPill).not.toBeNull();
      expect(con.ratingPill.text).toBe('4.8 · 132 reseñas');
      expect(con.ratingPill.x + con.ratingPill.w).toBe(con.width - con.L.pad);
      expect(con.ratingPill.y).toBe(con.L.pad);
      // La de ciudad · tipo va encima del título, a la izquierda.
      expect(con.cityPill.text).toBe('📍 Guadalajara · Tour');
      expect(con.cityPill.x).toBe(con.L.pad);
    }
  });

  it('el título cabe siempre completo, sin «…», en Historia y en Post', () => {
    for (const format of [
      EXPERIENCE_SHARE_CARD_FORMATS.story,
      EXPERIENCE_SHARE_CARD_FORMATS.post,
    ]) {
      for (const exp of [TEQUILA, LARGO]) {
        const d = buildExperienceShareCardData(exp, { cityName: 'Guadalajara' });
        const geo = computeExperienceShareCardLayout(d, format);
        expect(geo.title.lines.length).toBeGreaterThan(0);
        expect(geo.title.lines.length).toBeLessThanOrEqual(
          EXPERIENCE_SHARE_CARD_LAYOUT[format.id].titleMaxLines,
        );
        for (const line of geo.title.lines) expect(line).not.toContain('…');
        expect(geo.title.lines.join(' ')).toBe(exp.title);
        // La fuente nunca es mayor que la del formato.
        expect(geo.title.size).toBeLessThanOrEqual(
          EXPERIENCE_SHARE_CARD_LAYOUT[format.id].titleSize,
        );
      }
    }
  });

  it('en Horizontal el título cabe completo hasta ~90 caracteres; más largo se corta con «…» sin desbordar', () => {
    // La columna de Horizontal es angosta (la pastilla de precio va al
    // lado): el límite diseñado es menor que en Historia/Post, igual que
    // en la tarjeta de eventos (PR #153). El título real de Tequila
    // (74 caracteres) cabe completo; uno de 97 ya no entra en 3 líneas
    // ni al tamaño mínimo y se corta — sin salirse de la tarjeta.
    const format = EXPERIENCE_SHARE_CARD_FORMATS.horizontal;
    const tequila = computeExperienceShareCardLayout(
      buildExperienceShareCardData(TEQUILA, { cityName: 'Guadalajara' }),
      format,
    );
    expect(tequila.title.lines.length).toBeLessThanOrEqual(
      EXPERIENCE_SHARE_CARD_LAYOUT.horizontal.titleMaxLines,
    );
    for (const line of tequila.title.lines) expect(line).not.toContain('…');
    expect(tequila.title.lines.join(' ')).toBe(TEQUILA.title);
    const largo = computeExperienceShareCardLayout(
      buildExperienceShareCardData(LARGO, { cityName: 'Guadalajara' }),
      format,
    );
    expect(largo.title.lines.length).toBeLessThanOrEqual(
      EXPERIENCE_SHARE_CARD_LAYOUT.horizontal.titleMaxLines,
    );
    expect(largo.title.size).toBe(
      EXPERIENCE_SHARE_CARD_LAYOUT.horizontal.titleMinSize,
    );
    // Se corta con «…» pero no se desborda: todo queda dentro de la tarjeta.
    expect(largo.title.lines.join(' ').startsWith('Excursión privada')).toBe(true);
    expect(largo.title.x + 600).toBeLessThanOrEqual(largo.width);
  });
});

describe('tarjeta para compartir el artículo: la plantilla se renderiza (vista previa real)', () => {
  it('foto en Historia: pastilla citymap.mx, precio azul con DESDE, ciudad · Tour, datos; sin la calificación inventada', () => {
    const d = buildExperienceShareCardData(TEQUILA, { cityName: 'Guadalajara' });
    const html = renderToStaticMarkup(
      <ExperienceShareCardTemplate data={d} format={EXPERIENCE_SHARE_CARD_FORMATS.story} />,
    );
    expect(html).toContain('Excursión a Tequila');
    expect(html).toContain('La Rojeña');
    expect(html).toContain('citymap');
    expect(html).toContain('.mx');
    expect(html).toContain('DESDE');
    expect(html).toContain('$1,881 MXN');
    expect(html).toContain('por persona');
    expect(html).toContain('Guadalajara');
    expect(html).toContain('Tour');
    expect(html).toContain('6 horas - 8 horas');
    expect(html).toContain('Español, Inglés');
    // La pastilla de precio es AZUL, como la demo (no blanca).
    expect(html).toContain('#2563EB');
    // Sin logotipo grande ni pie: la marca es la pastilla citymap.mx.
    expect(html).not.toContain('/logo-brand.png');
    expect(html).not.toContain('Descúbrelo en');
    // La demo mostraba «4.9 · 13,275 reseñas»: ilustrativo, no real.
    expect(html).not.toContain('13,275');
    expect(html).not.toContain('4.9');
    expect(html).not.toContain('★');
  });

  it('horizontal: mismo contenido en 1080×566', () => {
    const d = buildExperienceShareCardData(TEQUILA, { cityName: 'Guadalajara' });
    const html = renderToStaticMarkup(
      <ExperienceShareCardTemplate data={d} format={EXPERIENCE_SHARE_CARD_FORMATS.horizontal} />,
    );
    expect(html).toContain('Excursión a Tequila');
    expect(html).toContain('DESDE');
    expect(html).toContain('$1,881 MXN');
    expect(html).toContain('por persona');
    expect(html).toContain('width:1080px');
    expect(html).toContain('height:566px');
  });

  it('con reseñas reales: la calificación sí se pinta (estrella + texto)', () => {
    const d = buildExperienceShareCardData(CON_RESENAS, { cityName: 'Guadalajara' });
    const html = renderToStaticMarkup(
      <ExperienceShareCardTemplate data={d} format={EXPERIENCE_SHARE_CARD_FORMATS.story} />,
    );
    expect(html).toContain('★');
    expect(html).toContain('4.8');
    expect(html).toContain('132 reseñas');
  });

  it('sin foto: sale el bloque con la inicial, no una imagen rota', () => {
    const d = buildExperienceShareCardData(GUIA_GRATIS, { cityName: 'Guadalajara' });
    const html = renderToStaticMarkup(
      <ExperienceShareCardTemplate data={d} format={EXPERIENCE_SHARE_CARD_FORMATS.post} />,
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

  it('la hoja es la misma centrada de eventos/negocios, con los tres formatos y SIN selector de estilo', () => {
    expect(sheet).toContain('EXPERIENCE_SHARE_CARD_FORMAT_LIST.map');
    expect(sheet).toContain('{f.label}');
    expect(sheet).toContain('{f.width} × {f.height}');
    expect(sheet).toContain('Compartir imagen');
    expect(sheet).toContain('Compartir enlace');
    expect(sheet).toContain("e?.name === 'AbortError'");
    expect(sheet).toContain('buildExperienceShareCardData(experience, { cityName })');
    expect(sheet).toContain('exportExperienceShareCardPng(dataToExport, format)');
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
    // Sin selector de estilo: un solo estilo, sin chevrones, puntos ni swipe.
    expect(sheet).not.toContain('EXPERIENCE_SHARE_CARD_STYLE_LIST');
    expect(sheet).not.toContain('Estilo anterior');
    expect(sheet).not.toContain('Estilo siguiente');
    expect(sheet).not.toContain('SWIPE_MIN_PX');
    expect(sheet).not.toContain('goStyle');
    expect(sheet).not.toContain('trackPos');
    expect(sheet).not.toContain('styleId');
  });

  it('la plantilla lleva la foto a sangre, las pastillas y el precio azul; sin logo ni pie', () => {
    expect(template).toContain('citymap');
    expect(template).toContain('.mx');
    expect(template).toContain('#60A5FA');
    expect(template).toContain('DESDE');
    expect(template).toContain('por persona');
    expect(template).toContain('EXPERIENCE_SHARE_CARD_BLUE');
    expect(template).toContain('crossOrigin="anonymous"');
    expect(template).toContain('{photoSrc ? (');
    expect(template).toContain('computeExperienceShareCardLayout');
    expect(template).toContain('objectFit:');
    expect(template).toContain("'cover'");
    expect(template).not.toContain('/logo-brand.png');
    expect(template).not.toContain('Descúbrelo en');
    expect(template).not.toContain('styleId');
    expect(template).not.toContain('dividida');
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
    expect(lib).not.toContain('loadShareCardLogoWhite');
    expect(lib).not.toContain('loadShareCardLogoDark');
    expect(lib).toContain('drawCoverImage');
    expect(lib).toContain('EXPERIENCE_SHARE_CARD_BLUE');
    expect(lib).toContain("'#2563EB'");
    expect(sheet).not.toContain('left: -10000');
    // La vista previa y el PNG comparten UNA geometría.
    expect(lib).toContain('EXPERIENCE_SHARE_CARD_LAYOUT');
    expect(lib).toContain('computeExperienceShareCardLayout');
    expect(template).toContain('computeExperienceShareCardLayout');
    // La calificación solo se muestra si es real (rating y reseñas).
    expect(lib).toContain('rating > 0');
    expect(lib).toContain('review_count > 0');
    // La «Dividida» se quitó del todo: ni en la librería ni en la hoja.
    expect(lib).not.toContain('dividida');
    expect(lib).not.toContain('Dividida');
    expect(sheet).not.toContain('dividida');
    // El formato horizontal oficial de Instagram.
    expect(lib).toContain('horizontal');
    expect(lib).toContain('1080');
    expect(lib).toContain('566');
  });
});
