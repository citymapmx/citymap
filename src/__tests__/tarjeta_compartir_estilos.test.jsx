import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import ShareCardTemplate from '../components/ShareCardTemplate.jsx';
import {
  buildShareCardData,
  bizShowsLogoCircle,
  computeShareCardLayout,
  resolveShareCardStyle,
  shareCardLayoutTable,
  wrapShareCardText,
  SHARE_CARD_FORMATS,
  SHARE_CARD_LAYOUT,
  EDITORIAL_SHARE_CARD_LAYOUT,
  SHARE_CARD_STYLE_COLORS,
  SHARE_CARD_STYLE_LIST,
} from '../lib/shareCard.js';

import { EVENT_SHARE_CARD_LAYOUT } from '../lib/eventShareCard.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// Dos estilos para la tarjeta de negocios (PR #154 los creó, PR #155
// los deja en dos): Oscura (el de siempre, por defecto) y Clara
// (claro tipo revista; PR #156: antes se llamaba «Editorial»,
// Jonathan la renombró «Clara»; el id interno sigue siendo
// 'editorial'). PR #160: Clara TAMBIÉN lleva el círculo del logo del
// negocio (misma regla que Oscura: logo_url + plan de pago), con
// anillo gris visible sobre blanco; antes no lo llevaba por diseño
// («la limpieza es el estilo»), pero Jonathan pidió que Clara también
// tuviera el logotipo del negocio (Vulcanos Chapalita, con logo y plan
// premium, salía sin nada en Clara).
// La Ficha completa se quitó en el PR #155 (Jonathan): quedan solo
// Oscura y Clara, que se cambian con chevrones ‹ › y puntos en la
// hoja en vez de botones. La categoría sale de ambas versiones, la
// foto es más corta y el nombre y las píldoras más grandes (la
// información gana presencia), el logo oficial crece y en Clara va
// en oscuro (el PNG es blanco y no se veía sobre blanco).
// La vista previa y el PNG comparten UNA geometría por estilo, como la
// tarjeta actual.
describe('tarjeta para compartir: estilos Oscura y Clara (PR #154, ajustes PR #155, PR #156)', () => {
  const biz = {
    name: 'Xokol',
    type: 'Restaurantes',
    city_slug: 'guadalajara',
    price: '$$',
    photos: [{ url: 'https://example.supabase.co/object/public/media/cityguide/xokol.jpg' }],
  };
  const googleDisp = { rating: 4.5, count: 1234, source: 'google' };
  // Barbarella: plan de pago con logo, como en la captura de Jonathan.
  const bizLogo = {
    ...biz,
    name: 'Barbarella',
    logo_url: 'https://example.supabase.co/object/public/media/cityguide/barbarella-logo.png',
    plan: 'premium',
  };
  const googleDispBarbarella = { rating: 4.5, count: 4569, source: 'google' };

  it('solo dos estilos y el oscuro sigue siendo el por defecto', () => {
    expect(SHARE_CARD_STYLE_LIST.map((s) => s.id)).toEqual([
      'glass',
      'editorial',
    ]);
    expect(SHARE_CARD_STYLE_LIST.find((s) => s.id === 'editorial').label).toBe(
      'Clara',
    );
    expect(resolveShareCardStyle('glass').id).toBe('glass');
    expect(resolveShareCardStyle('editorial').id).toBe('editorial');
    // La Ficha completa ya no existe: cae al oscuro, nunca a una
    // tarjeta rota. Igual un estilo desconocido o ausente.
    expect(resolveShareCardStyle('ficha').id).toBe('glass');
    expect(resolveShareCardStyle('invento').id).toBe('glass');
    expect(resolveShareCardStyle(undefined).id).toBe('glass');
    // Sin estilo, la geometría es la de siempre.
    const d = buildShareCardData(biz, { disp: googleDisp, cityName: 'Guadalajara' });
    const def = computeShareCardLayout(d, SHARE_CARD_FORMATS.story, true);
    const glass = computeShareCardLayout(d, SHARE_CARD_FORMATS.story, true, 'glass');
    expect(def.style).toBe('glass');
    expect(def.photo.h).toBe(glass.photo.h);
    expect(def.name.lines).toEqual(glass.name.lines);
  });

  it('la Ficha completa no queda en ningún lado (ni código muerto)', () => {
    const lib = read('../lib/shareCard.js');
    const template = read('../components/ShareCardTemplate.jsx');
    const sheet = read('../components/ShareCardSheet.jsx');
    for (const src of [lib, template, sheet]) {
      expect(src).not.toContain('FICHA_SHARE_CARD_LAYOUT');
      // La etiqueta 'Ficha completa' como valor (los comentarios de
      // historia del #154/#155 sí la nombran, sin comillas).
      expect(src).not.toContain("'Ficha completa'");
      expect(src).not.toContain('shareCardHoursLine');
      expect(src).not.toContain('shareCardWhatsapp');
      expect(src).not.toContain('formatShareCardHour');
      expect(src).not.toContain("style.id === 'ficha'");
      expect(src).not.toContain("'ficha'");
    }
    // buildShareCardData ya no lleva los datos de la Ficha.
    const d = buildShareCardData(
      {
        ...biz,
        address: 'Av. Chapultepec Sur 123, Guadalajara',
        whatsapp: '33 1234 5678',
        plan: 'premium',
        schedule: { lun: '9:00 AM - 11:00 PM' },
      },
      { disp: googleDisp, cityName: 'Guadalajara' },
    );
    expect(d.hoursLine).toBeUndefined();
    expect(d.address).toBeUndefined();
    expect(d.whatsapp).toBeUndefined();
  });

  it('sin categoría en ninguna de las dos versiones (vista previa y canvas)', () => {
    const lib = read('../lib/shareCard.js');
    const template = read('../components/ShareCardTemplate.jsx');
    // Los datos SÍ llevan la categoría (para los estilos con grid, que
    // la muestran), pero Oscura y Clara no la pintan.
    const d = buildShareCardData(biz, { disp: googleDisp, cityName: 'Guadalajara' });
    expect(d.category).toBe('Restaurantes');
    // La geometría no tiene bloque de categoría en ninguno de los dos
    // estilos (en los estilos con grid sí lo hay: ver
    // tarjeta_compartir_grid.test.jsx).
    for (const styleId of ['glass', 'editorial']) {
      for (const format of [SHARE_CARD_FORMATS.story, SHARE_CARD_FORMATS.post]) {
        const geo = computeShareCardLayout(d, format, true, styleId);
        expect(geo.category).toBeNull();
        expect(geo.name.lines.length).toBeGreaterThan(0);
      }
    }
    // La plantilla y el canvas pintan la categoría SOLO en los estilos
    // con grid (Grid 2×2, tira y collage): la plantilla la lee de la
    // geometría (layout.category), nunca del dato directo, y el canvas
    // de geo.category.
    expect(template).not.toContain('data.category');
    expect(template).not.toContain('data?.category');
    expect(template).toContain('layout.category');
    expect(lib).toContain('data?.category');
    expect(lib).toContain('geo.category');
    expect(lib).toContain('categoryBox');
  });

  it('sin regla en Clara (la línea negra sobre el título se fue con la categoría)', () => {
    const lib = read('../lib/shareCard.js');
    const template = read('../components/ShareCardTemplate.jsx');
    expect(lib).not.toContain("style.id === 'editorial'");
    expect(lib).not.toContain('geo.width / 2 - 36');
    // PR #159: la única mención a 'editorial' en la plantilla es la
    // puerta de las píldoras («Para pedir» y el QR no llevan píldoras);
    // la línea negra sobre el título sigue sin existir.
    expect(template.match(/style\.id === 'editorial'/g)).toHaveLength(1);
    // Los estilos con grid también llevan píldoras (Grid 2×2 y tira);
    // el Collage editorial no (su calificación va como texto plano).
    expect(template).toContain("style.id === 'grid'");
    expect(template).toContain("style.id === 'tira'");
    expect(template).not.toContain('geo.width / 2 - 36');
  });

  it('el logo oficial va en oscuro en Clara y en blanco en Oscura', () => {
    expect(SHARE_CARD_STYLE_COLORS.editorial.logoWhite).toBe(false);
    expect(SHARE_CARD_STYLE_COLORS.glass.logoWhite).toBe(true);
    const lib = read('../lib/shareCard.js');
    const template = read('../components/ShareCardTemplate.jsx');
    // La vista previa usa el mismo patrón que Brand.jsx en modo claro:
    // brightness(0) vuelve negro el PNG blanco.
    expect(template).toContain(
      "palette.logoWhite ? 'brightness(0) invert(1)' : 'brightness(0)'",
    );
    // El canvas recolorea el logo a oscuro (#111111) con source-in para
    // Clara, igual que el blanco lo hace para Oscura.
    expect(lib).toContain("x.fillStyle = '#111111'");
    expect(lib).toContain('palette.logoWhite ? assets?.logoWhite : assets?.logoDark');
    expect(lib).toContain('loadShareCardLogoDark');
  });

  it('el logo oficial es más grande en ambos estilos y formatos (PR #155, PR #156)', () => {
    expect(SHARE_CARD_LAYOUT.story.logoH).toBe(76);
    expect(SHARE_CARD_LAYOUT.post.logoH).toBe(76);
    expect(EDITORIAL_SHARE_CARD_LAYOUT.story.logoH).toBe(76);
    expect(EDITORIAL_SHARE_CARD_LAYOUT.post.logoH).toBe(76);
    // Más grande que antes (56/44) sin tapar la foto: el logo va
    // arriba con su hueco y la foto empieza después. En Post el logo
    // subió a 76 en el PR #156 (era 60 y en la vista previa de 200 px
    // no se apreciaba).
    for (const styleId of ['glass', 'editorial']) {
      for (const format of [SHARE_CARD_FORMATS.story, SHARE_CARD_FORMATS.post]) {
        const d = buildShareCardData(biz, { disp: googleDisp, cityName: 'Guadalajara' });
        const geo = computeShareCardLayout(d, format, true, styleId);
        expect(geo.logo.h).toBeGreaterThan(44);
        expect(geo.logo.y + geo.logo.h).toBeLessThanOrEqual(geo.photo.y);
        expect(geo.logo.w).toBeLessThan(geo.width);
      }
    }
  });

  it('la foto es más corta y la información gana presencia (PR #155)', () => {
    // Nombre y píldoras más grandes que antes (76→88 y 34→40 en
    // Oscura Historia; 68→80 y 32→38 en Editorial Historia).
    expect(SHARE_CARD_LAYOUT.story.nameSize).toBe(88);
    expect(SHARE_CARD_LAYOUT.story.pillSize).toBe(40);
    expect(EDITORIAL_SHARE_CARD_LAYOUT.story.nameSize).toBe(80);
    expect(EDITORIAL_SHARE_CARD_LAYOUT.story.pillSize).toBe(38);
    // La foto de un negocio típico es más baja que antes (Historia
    // ~1439 → ~1331; Post ~697 → ~630) y sigue llenando su franja.
    for (const styleId of ['glass', 'editorial']) {
      const d = buildShareCardData(biz, { disp: googleDisp, cityName: 'Guadalajara' });
      const geoStory = computeShareCardLayout(d, SHARE_CARD_FORMATS.story, true, styleId);
      const geoPost = computeShareCardLayout(d, SHARE_CARD_FORMATS.post, true, styleId);
      expect(geoStory.photo.h).toBeLessThan(1400);
      expect(geoStory.photo.h).toBeGreaterThanOrEqual(geoStory.L.photoMinH);
      expect(geoPost.photo.h).toBeLessThan(700);
      expect(geoPost.photo.h).toBeGreaterThanOrEqual(geoPost.L.photoMinH);
      // Sin franja vacía entre píldoras y pie.
      for (const geo of [geoStory, geoPost]) {
        const lastRow = geo.pillRows[geo.pillRows.length - 1];
        const pillsEnd = lastRow[0].y + lastRow[0].h;
        const footTop = geo.height - geo.L.pad - geo.L.footSize;
        expect(footTop - pillsEnd).toBe(geo.L.footGap);
      }
    }
  });

  it('el logo tiene presencia en Post: tan grande como en Historia (PR #156)', () => {
    // Causa raíz (captura de Jonathan, Cristina en Post + Clara): el
    // logo SÍ se pintaba, en negro, pero con logoH 60 en una vista
    // previa de 200 px se veía a ~11 px y parecía no estar; en Historia
    // (76 en 356 px) se leía claro. El logo de Post sube a 76, igual
    // que en Historia, en ambos estilos.
    expect(SHARE_CARD_LAYOUT.post.logoH).toBe(76);
    expect(EDITORIAL_SHARE_CARD_LAYOUT.post.logoH).toBe(76);
    expect(SHARE_CARD_LAYOUT.post.logoGap).toBe(36);
    expect(EDITORIAL_SHARE_CARD_LAYOUT.post.logoGap).toBe(36);
    for (const styleId of ['glass', 'editorial']) {
      for (const format of [SHARE_CARD_FORMATS.story, SHARE_CARD_FORMATS.post]) {
        const d = buildShareCardData(biz, { disp: googleDisp, cityName: 'Guadalajara' });
        const geo = computeShareCardLayout(d, format, true, styleId);
        // El logo va arriba, dentro de la tarjeta, y la foto empieza
        // después de él: no se tapa ni se sale.
        expect(geo.logo.h).toBe(76);
        expect(geo.logo.y).toBe(geo.L.pad);
        expect(geo.logo.y + geo.logo.h).toBeLessThanOrEqual(geo.photo.y);
        expect(geo.logo.w).toBeLessThan(geo.width);
      }
    }
    // La plantilla pinta el logo en la versión clara en Post (vista
    // previa) con el filtro oscuro, igual que en Historia.
    for (const format of [SHARE_CARD_FORMATS.story, SHARE_CARD_FORMATS.post]) {
      const d = buildShareCardData(biz, { disp: googleDisp, cityName: 'Guadalajara' });
      const html = renderToStaticMarkup(
        <ShareCardTemplate data={d} format={format} styleId="editorial" />,
      );
      expect(html).toContain('/logo-brand.png');
      expect(html).toContain('brightness(0)');
    }
    // Y el canvas lo dibuja con el logo oscuro recolorado en la
    // posición de la geometría.
    const lib = read('../lib/shareCard.js');
    expect(lib).toContain('palette.logoWhite ? assets?.logoWhite : assets?.logoDark');
    expect(lib).toContain('ctx.drawImage(logoImg, geo.logo.x, geo.logo.y, geo.logo.w, geo.logo.h)');
  });

  it('la hoja da la vuelta al cambiar de estilo: carrusel infinito con clones (PR #158)', () => {
    const sheet = read('../components/ShareCardSheet.jsx');
    // PR #156: la vista previa es una pista deslizante con los dos
    // estilos en fila y una transición suave de 0,5 s, como las tiras
    // del #149, en vez del corte instantáneo de antes.
    // PR #158: al dar › en el último ya NO se regresa deslizándose
    // hacia atrás (así quedó el #156 y a Jonathan no le gustó): la
    // pista es un carrusel infinito con clones — un clon del último
    // antes del primero y un clon del primero después del último — y
    // al llegar al clon se resetea al índice real SIN transición.
    expect(sheet).toContain('trackStyles');
    expect(sheet).toContain('availableStyles[styleCount - 1]');
    expect(sheet).toContain('...availableStyles');
    expect(sheet).toContain('availableStyles[0]');
    // PR #160: durante el arrastre táctil la pista sigue al dedo
    // (dragX), así que el translateX lleva el desplazamiento.
    expect(sheet).toContain('translateX(${-trackPos * PREVIEW_W + (dragX ?? 0)}px)');
    expect(sheet).toContain('transform 0.5s cubic-bezier(0.32, 0.72, 0, 1)');
    // El reseteo silencioso: sin transición (noAnim), a los 0,5 s (lo
    // que dura el deslizamiento), y el clon vuelve a su posición real
    // (0 → último, n+1 → primero).
    expect(sheet).toContain('noAnim');
    expect(sheet).toContain('setTimeout');
    expect(sheet).toContain('}, 500);');
    expect(sheet).toContain('trackPos === 0 ? styleCount : 1');
    // Mientras la pista está en un clon (reseteo pendiente) se ignora
    // el toque, para no salirse del rango de la pista.
    expect(sheet).toContain('trackPos === 0 || trackPos === styleCount + 1');
    // Los chevrones y los puntos van fuera de la pista y siguen
    // cambiando el estilo; la exportación no cambia (sigue el estilo
    // elegido).
    expect(sheet).toContain('goStyle(-1)');
    expect(sheet).toContain('goStyle(1)');
    expect(sheet).toContain('goToStyle(n)');
    expect(sheet).toContain('setStyleId(availableStyles[next].id)');
    expect(sheet).toContain('exportShareCardPng(dataToExport, format, styleId)');
    // Con «reducir movimiento» no desliza: cambia al instante.
    expect(sheet).toContain('prefers-reduced-motion: reduce');
    // Los puntos marcan el índice real (styleIndex), no la posición
    // de la pista (trackPos): en el clon, el punto del estilo real ya
    // está activo.
    expect(sheet).toContain('n === styleIndex ? 16 : 6');
    expect(sheet).toContain('n === styleIndex ? 1 : 0.25');
  });

  it('los chevrones van separados de la vista previa (PR #158)', () => {
    const sheet = read('../components/ShareCardSheet.jsx');
    // Jonathan (captura de Vincent Andares, Clara/Historia): los
    // chevrones estaban muy pegados a la tarjeta (hueco de 2 px y
    // relleno de 4 px a cada lado: solo 6 px de aire). Ahora llevan
    // hueco de 14 px y relleno de 8 px: 22 px de aire a cada lado, que
    // se nota en el teléfono.
    expect(sheet).toContain('gap: 14,');
    expect(sheet.match(/padding: '8px 8px'/g)).toHaveLength(2);
    expect(sheet).not.toContain('gap: 2,');
    expect(sheet).not.toContain("padding: '8px 4px'");
    // Siguen centrados verticalmente sobre la vista previa, a los
    // lados, fuera de la pista.
    expect(sheet).toContain("alignItems: 'center'");
    expect(sheet).toContain('Estilo anterior');
    expect(sheet).toContain('Estilo siguiente');
  });

  it('Clara: con círculo de logo del negocio, con anillo visible sobre blanco y sin desbordar (PR #160)', () => {
    expect(SHARE_CARD_STYLE_COLORS.editorial.bg[0]).toBe('#FFFFFF');
    expect(SHARE_CARD_STYLE_COLORS.editorial.logoWhite).toBe(false);
    expect(SHARE_CARD_STYLE_COLORS.glass.logoWhite).toBe(true);
    // La tabla de Clara lleva las medidas del círculo, igual que la
    // oscura (mismo diámetro, a caballo sobre el borde de la foto).
    expect(EDITORIAL_SHARE_CARD_LAYOUT.story.showBizLogo).toBe(true);
    expect(EDITORIAL_SHARE_CARD_LAYOUT.post.showBizLogo).toBe(true);
    expect(EDITORIAL_SHARE_CARD_LAYOUT.story.bizLogoD).toBe(240);
    expect(EDITORIAL_SHARE_CARD_LAYOUT.post.bizLogoD).toBe(190);
    expect(EDITORIAL_SHARE_CARD_LAYOUT.story.bizLogoGap).toBe(28);
    expect(EDITORIAL_SHARE_CARD_LAYOUT.post.bizLogoGap).toBe(22);
    for (const format of [SHARE_CARD_FORMATS.story, SHARE_CARD_FORMATS.post]) {
      const d = buildShareCardData(bizLogo, {
        disp: googleDispBarbarella,
        cityName: 'Guadalajara',
      });
      const geo = computeShareCardLayout(d, format, true, 'editorial');
      expect(geo.style).toBe('editorial');
      // Con logo y plan de pago, Clara SÍ lleva círculo (antes no, por
      // diseño del #154; Jonathan lo pidió con Vulcanos Chapalita).
      expect(geo.bizLogo).not.toBeNull();
      expect(geo.bizLogo.d).toBe(geo.L.bizLogoD);
      expect(geo.bizLogo.x).toBe(Math.round((geo.width - geo.L.bizLogoD) / 2));
      // El círculo no tapa el nombre (regla del #158, también en
      // Clara): la primera línea empieza por debajo del círculo.
      const nameTop = geo.name.y - (geo.L.nameSize * geo.L.nameLineH) / 2;
      const circleBottom = geo.bizLogo.y + geo.bizLogo.d;
      expect(nameTop - circleBottom).toBeCloseTo(geo.L.bizLogoGap, 0);
      expect(geo.photo.h).toBeGreaterThanOrEqual(geo.L.photoMinH);
      const lastRow = geo.pillRows[geo.pillRows.length - 1];
      const pillsEnd = lastRow[0].y + lastRow[0].h;
      const footTop = geo.height - geo.L.pad - geo.L.footSize;
      expect(footTop - pillsEnd).toBe(geo.L.footGap);
      // Vista previa: el círculo se pinta a la y calculada, con el
      // anillo solo blanco, y el nombre no se reparte.
      const markup = renderToStaticMarkup(
        <ShareCardTemplate data={d} format={format} styleId="editorial" />,
      );
      expect(markup).toContain(`top:${geo.bizLogo.y}px`);
      expect(markup).toContain('border-radius:50%');
      expect(markup).toContain('border:2px solid #FFFFFF');
      expect(markup).not.toContain('#D4D4D8');
      expect(markup).toContain('white-space:nowrap');
    }
    // Sin logo o con plan gratuito, Clara NO lleva círculo (misma
    // regla que en Oscura: el círculo es un beneficio de plan).
    for (const noCircleBiz of [
      { ...bizLogo, plan: 'free' },
      { ...bizLogo, logo_url: '' },
      biz,
    ]) {
      for (const format of [SHARE_CARD_FORMATS.story, SHARE_CARD_FORMATS.post]) {
        const d = buildShareCardData(noCircleBiz, {
          disp: googleDispBarbarella,
          cityName: 'Guadalajara',
        });
        const geo = computeShareCardLayout(d, format, true, 'editorial');
        expect(geo.bizLogo).toBeNull();
      }
    }
    // Peor caso (nombre largo, ciudad larga): tampoco se desborda.
    const longBiz = {
      ...biz,
      name: 'Restaurante El Gran Buffet Internacional de la Abuela María',
    };
    for (const format of [SHARE_CARD_FORMATS.story, SHARE_CARD_FORMATS.post]) {
      const d = buildShareCardData(longBiz, {
        disp: googleDisp,
        cityName: 'San Pedro Garza García',
      });
      const geo = computeShareCardLayout(d, format, true, 'editorial');
      expect(geo.name.lines.length).toBeLessThanOrEqual(3);
      expect(geo.photo.h).toBeGreaterThanOrEqual(geo.L.photoMinH);
      const lastRow = geo.pillRows[geo.pillRows.length - 1];
      const pillsEnd = lastRow[0].y + lastRow[0].h;
      const footTop = geo.height - geo.L.pad - geo.L.footSize;
      expect(footTop - pillsEnd).toBe(geo.L.footGap);
    }
  });

  it('el anillo del círculo es solo blanco en Clara y sigue fino en Oscura (PR #160)', () => {
    // El círculo blanco con su anillo fino casi invisible no se
    // distinguía del fondo blanco de Clara; el anillo gris que se
    // puso entonces se veía mal (Jonathan, 10 nov 2026) y ahora es
    // solo blanco en Clara. Cada estilo define el color de su anillo.
    expect(SHARE_CARD_STYLE_COLORS.editorial.bizLogoRing).toBe('#FFFFFF');
    expect(SHARE_CARD_STYLE_COLORS.glass.bizLogoRing).toBe('rgba(0,0,0,0.06)');
    const lib = read('../lib/shareCard.js');
    const template = read('../components/ShareCardTemplate.jsx');
    // El canvas dibuja el anillo con el color de la paleta.
    expect(lib).toContain('ctx.strokeStyle = palette.bizLogoRing;');
    // La plantilla pone el anillo con el color de la paleta.
    expect(template).toContain('palette.bizLogoRing');
  });

  it('la hoja cambia de estilo deslizando con el dedo (swipe táctil, PR #160)', () => {
    const sheet = read('../components/ShareCardSheet.jsx');
    // Mismo patrón que las tiras del inicio (StoryStrip, PR #149): la
    // pista sigue al dedo durante el gesto, completa el cambio si el
    // deslizamiento supera 60 px, touchAction pan-y para no robar el
    // scroll vertical, y un gesto vertical cancela el cambio.
    expect(sheet).toContain('SWIPE_MIN_PX = 60');
    expect(sheet).toContain('onTouchStart');
    expect(sheet).toContain('onTouchMove');
    expect(sheet).toContain('onTouchEnd');
    expect(sheet).toContain('onTouchCancel');
    expect(sheet).toContain("touchAction: 'pan-y'");
    // La pista sigue al dedo: el desplazamiento vive en dragX y se
    // suma al translateX; sin transición mientras se arrastra.
    expect(sheet).toContain('const [dragX, setDragX] = useState(null)');
    expect(sheet).toContain('translateX(${-trackPos * PREVIEW_W + (dragX ?? 0)}px)');
    expect(sheet).toContain('dragX !== null');
    // Al soltar, si el gesto supera el umbral cambia de estilo con
    // goStyle (a la izquierda avanza, a la derecha retrocede); si no,
    // vuelve a su sitio sin cambiar nada.
    expect(sheet).toContain('Math.abs(dx) > SWIPE_MIN_PX');
    expect(sheet).toContain('goStyle(dx < 0 ? 1 : -1)');
    // Gesto vertical: se cancela el arrastre y el panel hace scroll.
    expect(sheet).toContain('Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10');
    // Funciona CON el bucle del #158: goStyle avanza o retrocede
    // desde el clon igual que el chevron; mientras la pista está en
    // un clon (reseteo pendiente) el gesto no empieza.
    expect(sheet).toContain('if (trackPos === 0 || trackPos === styleCount + 1) return;');
    // Los puntos siguen marcando el índice real sin transición.
    expect(sheet).toContain('n === styleIndex ? 16 : 6');
    // Con «reducir movimiento» la pista no sigue al dedo (cambia al
    // instante con goStyle), pero el gesto sí se registra.
    expect(sheet).toContain('if (!reduceMotion) setDragX(dx)');
    expect(sheet).toContain('touchStart.current.dx = dx');
    // La exportación no cambia: sigue el estilo elegido.
    expect(sheet).toContain('exportShareCardPng(dataToExport, format, styleId)');
  });

  it('Oscura: el peor caso con logo y círculo tampoco se desborda', () => {
    const worst = {
      ...bizLogo,
      name: 'Restaurante El Gran Buffet Internacional de la Abuela María',
    };
    for (const format of [SHARE_CARD_FORMATS.story, SHARE_CARD_FORMATS.post]) {
      const d = buildShareCardData(worst, {
        disp: googleDispBarbarella,
        cityName: 'San Pedro Garza García',
      });
      const geo = computeShareCardLayout(d, format, true, 'glass');
      expect(geo.bizLogo).not.toBeNull();
      expect(geo.name.lines.length).toBeLessThanOrEqual(3);
      expect(geo.photo.h).toBeGreaterThanOrEqual(geo.L.photoMinH);
      const lastRow = geo.pillRows[geo.pillRows.length - 1];
      const pillsEnd = lastRow[0].y + lastRow[0].h;
      const footTop = geo.height - geo.L.pad - geo.L.footSize;
      expect(footTop - pillsEnd).toBe(geo.L.footGap);
    }
  });

  it('wrapShareCardText corta a N líneas con puntos suspensivos', () => {
    expect(wrapShareCardText('Hola mundo', 1000, 30, 2)).toEqual(['Hola mundo']);
    expect(wrapShareCardText('', 1000, 30, 2)).toEqual([]);
    const lines = wrapShareCardText(
      'Restaurante El Gran Buffet Internacional de la Abuela María',
      300,
      30,
      2,
    );
    expect(lines.length).toBe(2);
    expect(lines[1].endsWith('…')).toBe(true);
    // La tabla de medidas existe para los 2 estilos y los 2 formatos.
    for (const styleId of ['glass', 'editorial']) {
      for (const formatId of ['story', 'post']) {
        const L = shareCardLayoutTable(styleId, formatId);
        expect(typeof L.pad).toBe('number');
        expect(typeof L.photoMinH).toBe('number');
        expect(typeof L.nameSize).toBe('number');
      }
    }
    expect(bizShowsLogoCircle(bizLogo)).toBe(true);
  });

  it('la tarjeta de eventos no hereda los cambios de negocios (PR #155)', () => {
    // La geometría de eventos era un spread de la de negocios: los
    // cambios de este PR (logo más grande, foto más corta, sin
    // categoría) se le colaban y la foto salía NaN por el catSize que
    // ya no existe. Ahora fija su propia base con los valores de antes.
    // (El Post volvió el 11 nov 2026: eventos Historia y Post.)
    expect(EVENT_SHARE_CARD_LAYOUT.story.logoH).toBe(56);
    expect(EVENT_SHARE_CARD_LAYOUT.post.logoH).toBe(44);
    expect(EVENT_SHARE_CARD_LAYOUT.post.catSize).toBe(28);
    expect(EVENT_SHARE_CARD_LAYOUT.post.pillSize).toBe(30);
    expect(EVENT_SHARE_CARD_LAYOUT.post.photoMinH).toBe(300);
    expect(EVENT_SHARE_CARD_LAYOUT.story.catSize).toBe(32);
    expect(EVENT_SHARE_CARD_LAYOUT.story.pillSize).toBe(34);
    expect(EVENT_SHARE_CARD_LAYOUT.story.photoMinH).toBe(960);
  });

  it('la hoja cambia de estilo con chevrones y puntos, sin botones de estilo', () => {
    const lib = read('../lib/shareCard.js');
    const template = read('../components/ShareCardTemplate.jsx');
    const sheet = read('../components/ShareCardSheet.jsx');
    // Chevrones ‹ › a los lados de la vista previa, con envoltura.
    expect(sheet).toContain('Estilo anterior');
    expect(sheet).toContain('Estilo siguiente');
    expect(sheet).toContain('‹');
    expect(sheet).toContain('›');
    expect(sheet).toContain('goStyle');
    // Puntos debajo de la vista previa, mismo lenguaje que StoryStrip:
    // activo píldora de 16 px, inactivo 6 px con opacidad 0.25, sin
    // transición; tocar un punto salta a ese estilo (goToStyle, PR #158).
    expect(sheet).toContain('n === styleIndex ? 16 : 6');
    expect(sheet).toContain('n === styleIndex ? 1 : 0.25');
    expect(sheet).toContain('goToStyle(n)');
    // Ya no hay botones de estilo: las etiquetas solo aparecen en el
    // aria-label de los puntos, nunca como texto de botón. (La etiqueta
    // 'Ficha completa' como valor tampoco: los comentarios de historia
    // del #154 sí la nombran, sin comillas.)
    expect(sheet.match(/\{s\.label\}/g)).toHaveLength(1);
    expect(sheet).not.toContain("'Ficha completa'");
    // El PNG se exporta con el estilo elegido y la vista previa lleva
    // los dos estilos en la pista (PR #156).
    expect(sheet).toContain('exportShareCardPng(dataToExport, format, styleId)');
    expect(sheet).toContain('styleId={s.id}');
    expect(lib).toContain('export async function exportShareCardPng(data, format, styleId');
    expect(lib).toContain('renderShareCardCanvas(data, format, styleId');
    expect(lib).toContain('loadShareCardLogoDark');
    // La plantilla pinta el estilo elegido con su paleta.
    expect(template).toContain('styleId');
    expect(template).toContain('SHARE_CARD_STYLE_COLORS');
    // La tarjeta de eventos sigue usando la base sin cambios: sus
    // imports y su layout no se tocaron.
    const eventLib = read('../lib/eventShareCard.js');
    expect(eventLib).toContain('SHARE_CARD_LAYOUT');
    expect(eventLib).toContain('loadShareCardLogoWhite');
  });
});
