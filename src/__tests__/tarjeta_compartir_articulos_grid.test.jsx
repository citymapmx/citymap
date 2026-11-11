import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import ExperienceShareCardTemplate from '../components/ExperienceShareCardTemplate.jsx';
import {
  EXPERIENCE_SHARE_CARD_FORMATS,
  EXPERIENCE_SHARE_CARD_GRID_LAYOUT,
  EXPERIENCE_SHARE_CARD_GRID_MIN_PHOTOS,
  EXPERIENCE_SHARE_CARD_STYLE_LIST,
  buildExperienceShareCardData,
  computeExperienceShareCardLayoutStyled,
  experienceShareCardGridAvailable,
  experienceShareCardStyleList,
  resolveExperienceShareCardStyle,
} from '../lib/experienceShareCard.js';
import { measureShareCardText } from '../lib/shareCard.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// Estilo «Grid» para la tarjeta de artículos (demo
// `propuestas-de-tarjetas-con-grid`, diseño 4, 10 nov 2026; Jonathan:
// «Haz las 4»): 1 foto grande arriba y 2 chicas abajo, sobre fondo
// blanco, con logotipo oficial, pastilla de ubicación GRIS, título
// centrado y precio en texto plano («DESDE $1,941 MXN por persona»,
// sin pastilla azul), pie «Descúbrelo en www.citymap.mx».
//
// Tour real de la demo: Tour del fútbol por Guadalajara, Zapopan ·
// Tour, DESDE $1,941 MXN por persona, 3 fotos en su galería.
const FUTBOL = {
  title: 'Tour del fútbol por Guadalajara',
  slug: 'tour-del-futbol-por-guadalajara',
  city_slug: 'zapopan',
  activity_type: 'Tour',
  description:
    '<h2>Tour del fútbol</h2><p>Para los forofos del deporte más popular del mundo: un tour por los estadios más famosos de Guadalajara.</p>',
  duration: '5 horas',
  languages: 'Español',
  people: null,
  price: 1941,
  rating: 0,
  review_count: 0,
  gallery: [
    'https://dpkjxhjkzdlkvyotoeai.supabase.co/storage/v1/object/public/media/cityguide/zapopan-tour-del-futbol-por-guadalajara-foto2.webp',
    'https://dpkjxhjkzdlkvyotoeai.supabase.co/storage/v1/object/public/media/cityguide/zapopan-tour-del-futbol-por-guadalajara-foto3.webp',
    'https://dpkjxhjkzdlkvyotoeai.supabase.co/storage/v1/object/public/media/cityguide/zapopan-tour-del-futbol-por-guadalajara-foto4.webp',
  ],
};

const dataFor = (exp, cityName = 'Zapopan') =>
  buildExperienceShareCardData(exp, { cityName });
const withGallery = (n) => ({ ...FUTBOL, gallery: FUTBOL.gallery.slice(0, n) });

describe('tarjeta para compartir el artículo: estilo «Grid» (demo 10 nov 2026)', () => {
  it('los 2 estilos existen y el Grid solo se ofrece con 2 o más fotos', () => {
    expect(EXPERIENCE_SHARE_CARD_STYLE_LIST.map((s) => s.id)).toEqual([
      'foto',
      'grid',
    ]);
    expect(EXPERIENCE_SHARE_CARD_GRID_MIN_PHOTOS).toBe(2);
    expect(resolveExperienceShareCardStyle('foto').label).toBe('Foto completa');
    expect(resolveExperienceShareCardStyle('grid').label).toBe('Grid');
    expect(resolveExperienceShareCardStyle('inexistente').id).toBe('foto');
    expect(experienceShareCardStyleList(0).map((s) => s.id)).toEqual(['foto']);
    expect(experienceShareCardStyleList(1).map((s) => s.id)).toEqual(['foto']);
    expect(experienceShareCardStyleList(2).map((s) => s.id)).toEqual([
      'foto',
      'grid',
    ]);
    expect(experienceShareCardStyleList(3).map((s) => s.id)).toEqual([
      'foto',
      'grid',
    ]);
    expect(experienceShareCardGridAvailable(1)).toBe(false);
    expect(experienceShareCardGridAvailable(2)).toBe(true);
  });

  it('los datos llevan hasta 3 fotos de la galería, en orden', () => {
    const d = dataFor(FUTBOL);
    expect(d.photoUrls).toHaveLength(3);
    expect(d.photoUrls[0]).toContain('foto2.webp');
    expect(d.photoUrls[2]).toContain('foto4.webp');
    expect(d.photoUrl).toBe(d.photoUrls[0]);
    expect(d.priceText).toBe('$1,941 MXN');
    expect(d.priced).toBe(true);
    expect(d.showPrice).toBe(true);
    expect(d.cityLine).toBe('📍 Zapopan');
    // Sin galería, [] (y sin foto principal de la galería).
    const d0 = dataFor({ ...FUTBOL, gallery: [] });
    expect(d0.photoUrls).toEqual([]);
    expect(d0.photoUrl).toBeNull();
  });

  it('Grid en Historia y Post: foto grande + dúo, pastilla gris, título y precio en texto, pie', () => {
    for (const format of [
      EXPERIENCE_SHARE_CARD_FORMATS.story,
      EXPERIENCE_SHARE_CARD_FORMATS.post,
    ]) {
      const d = dataFor(FUTBOL);
      const geo = computeExperienceShareCardLayoutStyled(d, format, 'grid');
      expect(geo.style).toBe('grid');
      expect(geo.cols).toBe(false);
      // Foto grande arriba, con márgenes y radio; el dúo debajo.
      const big = geo.bigPhoto;
      expect(big.x).toBe(geo.L.pad);
      expect(big.y).toBe(geo.L.pad);
      expect(big.w).toBe(geo.width - geo.L.pad * 2);
      expect(big.h).toBeGreaterThanOrEqual(geo.L.bigMinH);
      expect(big.photoIndex).toBe(0);
      expect(geo.duo).toHaveLength(2);
      expect(geo.duo.map((c) => c.photoIndex)).toEqual([1, 2]);
      expect(geo.duo[0].y).toBe(big.y + big.h + geo.L.duoGap);
      expect(geo.duo[1].x + geo.duo[1].w).toBe(geo.width - geo.L.pad);
      // Logotipo oficial superpuesto sobre la foto grande (arriba a la
      // izquierda, con margen).
      expect(geo.brandLogo.x).toBe(geo.L.pad + geo.L.logoInset);
      expect(geo.brandLogo.y).toBe(geo.L.pad + geo.L.logoInset);
      expect(geo.brandLogo.h).toBe(geo.L.logoH);
      // Pastilla de ubicación GRIS (no glass, no azul), centrada.
      // Solo la ciudad, sin el tipo.
      expect(geo.pill.text).toBe('📍 Zapopan');
      expect(geo.pill.x + geo.pill.w / 2).toBeCloseTo(geo.width / 2, 0);
      // Título centrado, completo (sin «…»).
      expect(geo.title.lines.join(' ')).toBe('Tour del fútbol por Guadalajara');
      expect(geo.title.lines.some((l) => l.endsWith('…'))).toBe(false);
      expect(geo.title.x).toBe(geo.width / 2);
      // Precio en texto plano (no pastilla azul): DESDE + precio + por persona.
      expect(geo.price.priced).toBe(true);
      expect(geo.price.text).toBe('$1,941 MXN');
      expect(geo.price.x).toBe(geo.width / 2);
      // Pie al final, centrado, sin desbordar.
      expect(geo.footer.x).toBe(geo.width / 2);
      expect(geo.footer.y + geo.footer.size / 2).toBeLessThanOrEqual(
        geo.height - geo.L.pad,
      );
      // Todo dentro de la tarjeta, sin solaparse: el dúo termina antes
      // de la pastilla y el precio antes del pie.
      expect(geo.duo[0].y + geo.duo[0].h).toBeLessThanOrEqual(geo.pill.y);
      expect(geo.title.y).toBeGreaterThan(geo.pill.y + geo.pill.h);
      expect(geo.price.y).toBeGreaterThan(geo.title.y);
      expect(geo.footer.y).toBeGreaterThan(geo.price.y);
    }
  });

  it('Grid en Horizontal: dos columnas (fotos a la izquierda, información a la derecha)', () => {
    const d = dataFor(FUTBOL);
    const geo = computeExperienceShareCardLayoutStyled(
      d,
      EXPERIENCE_SHARE_CARD_FORMATS.horizontal,
      'grid',
    );
    expect(geo.style).toBe('grid');
    expect(geo.cols).toBe(true);
    expect(geo.width).toBe(1080);
    expect(geo.height).toBe(566);
    // La columna de información mide 396 px (1080 − 40 − 580 − 24 − 40).
    expect(geo.infoW).toBe(396);
    // Fotos a la izquierda: la grande arriba y el dúo debajo, dentro
    // de la tarjeta.
    expect(geo.bigPhoto.x).toBe(geo.L.pad);
    expect(geo.bigPhoto.w).toBe(geo.L.bigW);
    expect(geo.bigPhoto.y + geo.bigPhoto.h).toBeLessThanOrEqual(
      geo.height - geo.L.pad,
    );
    expect(geo.duo[1].x + geo.duo[1].w).toBe(geo.bigPhoto.x + geo.bigPhoto.w);
    expect(geo.duo[0].y + geo.duo[0].h).toBeLessThanOrEqual(
      geo.height - geo.L.pad,
    );
    // Información a la derecha de las fotos, centrada en su columna.
    const colX = geo.L.pad + geo.L.bigW + geo.L.colGap;
    expect(geo.pill.x).toBeGreaterThanOrEqual(colX);
    expect(geo.title.x).toBeGreaterThan(colX);
    expect(geo.price.x).toBe(geo.title.x);
    expect(geo.footer.x).toBe(geo.title.x);
    expect(geo.title.lines.join(' ')).toBe('Tour del fútbol por Guadalajara');
    expect(geo.price.text).toBe('$1,941 MXN');
    expect(geo.footer.y + geo.footer.size / 2).toBeLessThanOrEqual(
      geo.height - geo.L.pad,
    );
    // El título se parte en 2 líneas DENTRO de la columna (antes salía
    // en una sola línea con el ancho completo y se cortaba por el borde
    // derecho — visto en el PNG horizontal, 10 nov 2026).
    expect(geo.title.lines).toHaveLength(2);
    expect(geo.title.lines).toEqual(['Tour del fútbol', 'por Guadalajara']);
    for (const line of geo.title.lines) {
      expect(measureShareCardText(line, geo.title.size, 800)).toBeLessThanOrEqual(
        geo.infoW,
      );
    }
    // El pie se achica hasta caber en la columna (a 30 px mide ~518 px
    // y también se salía por el borde derecho).
    expect(geo.footer.size).toBeLessThan(geo.L.footSize);
    const footW =
      measureShareCardText('Descúbrelo en ', geo.footer.size, 400) +
      2 * ('Descúbrelo en '.length - 1) +
      2 +
      measureShareCardText('www.citymap.mx', geo.footer.size, 800) +
      2 * ('www.citymap.mx'.length - 1);
    expect(footW).toBeLessThanOrEqual(geo.infoW);
    expect(geo.footer.x - footW / 2).toBeGreaterThanOrEqual(colX);
    expect(geo.footer.x + footW / 2).toBeLessThanOrEqual(geo.width - geo.L.pad);
    // El precio cabe en la columna sin achicarse (con este precio).
    expect(geo.price.priceSize).toBe(geo.L.priceSize);
    expect(
      measureShareCardText(geo.price.text, geo.price.priceSize, 900),
    ).toBeLessThanOrEqual(geo.infoW);
  });

  it('un precio largo en Horizontal se achica hasta caber en la columna', () => {
    const d = dataFor({ ...FUTBOL, price: 123456 });
    expect(d.priceText).toBe('$123,456 MXN');
    const geo = computeExperienceShareCardLayoutStyled(
      d,
      EXPERIENCE_SHARE_CARD_FORMATS.horizontal,
      'grid',
    );
    expect(geo.price.priceSize).toBeLessThan(geo.L.priceSize);
    expect(
      measureShareCardText(geo.price.text, geo.price.priceSize, 900),
    ).toBeLessThanOrEqual(geo.infoW + 1);
    // En Historia el mismo precio cabe sin achicarse.
    const geoStory = computeExperienceShareCardLayoutStyled(
      d,
      EXPERIENCE_SHARE_CARD_FORMATS.story,
      'grid',
    );
    expect(geoStory.price.priceSize).toBe(geoStory.L.priceSize);
  });

  it('tour gratis: el precio es solo «Gratis» en texto, sin DESDE', () => {
    const d = dataFor({ ...FUTBOL, price: 0 });
    const geo = computeExperienceShareCardLayoutStyled(
      d,
      EXPERIENCE_SHARE_CARD_FORMATS.story,
      'grid',
    );
    expect(geo.price.priced).toBe(false);
    expect(geo.price.text).toBe('Gratis');
  });

  it('Blog en Grid: sin precio en texto, con pastilla solo de ciudad y pie', () => {
    const blog = {
      title: '¿Fantasía o realidad? La verdad detrás de los túneles ocultos bajo la Catedral de Tepic',
      slug: 'tepic-fantasia-o-realidad-la-verdad-detras-de-los-tuneles-ocultos-bajo-la-catedral-de-tepic',
      city_slug: 'tepic',
      activity_type: 'Blog',
      description:
        '<p>Entre las historias más intrigantes del centro histórico de Tepic, ninguna despierta tanto misterio e imaginación como el relato de los túneles secretos bajo la Catedral de la Asunción.</p>',
      duration: '',
      languages: '',
      people: null,
      price: 0,
      rating: 5,
      review_count: 1,
      gallery: [
        'https://dpkjxhjkzdlkvyotoeai.supabase.co/storage/v1/object/public/media/cityguide/1792722264647_sqtnzl.webp',
        'https://dpkjxhjkzdlkvyotoeai.supabase.co/storage/v1/object/public/media/cityguide/tepic-tour-privado-por-tepic-galeria-2.webp',
      ],
    };
    const d = buildExperienceShareCardData(blog, { cityName: 'Tepic' });
    expect(d.showPrice).toBe(false);
    for (const format of [
      EXPERIENCE_SHARE_CARD_FORMATS.story,
      EXPERIENCE_SHARE_CARD_FORMATS.post,
      EXPERIENCE_SHARE_CARD_FORMATS.horizontal,
    ]) {
      const geo = computeExperienceShareCardLayoutStyled(d, format, 'grid');
      expect(geo.price).toBeNull();
      expect(geo.pill.text).toBe('📍 Tepic');
      // El pie sigue ahí y el título no se solapa con él.
      expect(geo.footer.y).toBeGreaterThan(geo.title.y);
      expect(geo.footer.y + geo.footer.size / 2).toBeLessThanOrEqual(
        geo.height - geo.L.pad,
      );
      const html = renderToStaticMarkup(
        <ExperienceShareCardTemplate data={d} format={format} styleId="grid" />,
      );
      expect(html).not.toContain('Gratis');
      expect(html).not.toContain('DESDE');
      expect(html).toContain('Descúbrelo en');
      expect(html).not.toContain('túneles secretos');
    }
  });

  it('«Foto completa» no hereda nada del Grid', () => {
    const d = dataFor(FUTBOL);
    for (const format of [
      EXPERIENCE_SHARE_CARD_FORMATS.story,
      EXPERIENCE_SHARE_CARD_FORMATS.post,
      EXPERIENCE_SHARE_CARD_FORMATS.horizontal,
    ]) {
      const geo = computeExperienceShareCardLayoutStyled(d, format, 'foto');
      expect(geo.style).toBe('foto');
      expect(geo.bigPhoto).toBeUndefined();
      expect(geo.duo).toBeUndefined();
      expect(geo.pricePill).toBeDefined();
      if (format.id === 'story') {
        // PR #177 (rebase): en Historia la foto es un bloque centrado
        // con márgenes, no a sangre (x/y/w/radio del bloque; la altura
        // es lo que sobra, con photoMinH 900 como mínimo).
        expect(geo.photo.x).toBe(64);
        expect(geo.photo.y).toBe(180);
        expect(geo.photo.w).toBe(952);
        expect(geo.photo.radius).toBe(40);
        expect(geo.photo.h).toBeGreaterThanOrEqual(900);
      } else {
        expect(geo.photo).toEqual({ x: 0, y: 0, w: 1080, h: format.height, radius: 0 });
      }
    }
    // Por defecto, sin estilo, sigue siendo «Foto completa».
    expect(computeExperienceShareCardLayoutStyled(d, EXPERIENCE_SHARE_CARD_FORMATS.story).style).toBe(
      'foto',
    );
  });

  it('la vista previa del Grid pinta las 3 fotos, el título, el precio y el pie', () => {
    const d = dataFor(FUTBOL);
    for (const format of [
      EXPERIENCE_SHARE_CARD_FORMATS.story,
      EXPERIENCE_SHARE_CARD_FORMATS.post,
      EXPERIENCE_SHARE_CARD_FORMATS.horizontal,
    ]) {
      const html = renderToStaticMarkup(
        <ExperienceShareCardTemplate data={d} format={format} styleId="grid" />,
      );
      // El título se reparte en 2 líneas (el corte depende del formato:
      // en Historia «Tour del fútbol / por Guadalajara», en Post
      // «Tour del fútbol por / Guadalajara»); las líneas exactas las
      // verifica el test de geometría de arriba.
      expect(html).toContain('Tour del fútbol');
      expect(html).toContain('Guadalajara');
      expect(html).toContain('DESDE');
      expect(html).toContain('$1,941 MXN');
      expect(html).toContain('por persona');
      expect(html).toContain('Zapopan');
      expect(html).toContain('Tour');
      expect(html).toContain('Descúbrelo en');
      expect(html).toContain('www.citymap.mx');
      // 3 fotos + logotipo oficial.
      expect(html.match(/<img/g)).toHaveLength(4);
      expect(html).toContain('/logo-brand.png');
      // Fondo blanco, pastilla gris (no azul sólida ni glass).
      expect(html).toContain('#F4F4F6');
      expect(html).not.toContain('#2563EB');
      // Sin descripción ni datos del tour (el Grid no los lleva).
      expect(html).not.toContain('forofos');
      expect(html).not.toContain('5 horas');
    }
    // «Foto completa» sigue sin pie en el render.
    const htmlFoto = renderToStaticMarkup(
      <ExperienceShareCardTemplate
        data={d}
        format={EXPERIENCE_SHARE_CARD_FORMATS.story}
        styleId="foto"
      />,
    );
    expect(htmlFoto).not.toContain('Descúbrelo en');
    expect(htmlFoto).toContain('#2563EB');
  });

  it('la hoja ofrece el Grid solo con 2 o más fotos en la galería', () => {
    const sheet = read('../components/ExperienceShareCardSheet.jsx');
    expect(sheet).toContain('experienceShareCardStyleList');
    expect(sheet).toContain('Estilo anterior');
    expect(sheet).toContain('Estilo siguiente');
    expect(sheet).toContain('exportExperienceShareCardPng(dataToExport, format, styleId)');
    // El Grid no se ofrece con 1 sola foto (la lista lo decide).
    expect(experienceShareCardStyleList(dataFor(withGallery(1)).photoUrls.length)).toEqual([
      { id: 'foto', label: 'Foto completa' },
    ]);
    expect(experienceShareCardStyleList(dataFor(withGallery(2)).photoUrls.length)).toEqual([
      { id: 'foto', label: 'Foto completa' },
      { id: 'grid', label: 'Grid' },
    ]);
  });

  it('las medidas del Grid son las de la demo (Historia 1080×1920)', () => {
    const L = EXPERIENCE_SHARE_CARD_GRID_LAYOUT.story;
    expect(L.pad).toBe(59);
    expect(L.logoH).toBe(56);
    expect(L.bigRadius).toBe(28);
    expect(L.duoRadius).toBe(24);
    expect(L.titleSize).toBe(93);
    expect(L.priceSize).toBe(108);
    expect(L.footSize).toBe(42);
  });
});
