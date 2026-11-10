import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import ShareCardTemplate from '../components/ShareCardTemplate.jsx';
import {
  SHARE_CARD_FORMATS,
  SHARE_CARD_MENU_STYLE_LIST,
  SHARE_CARD_STYLE_LIST,
  buildMenuShareCardData,
  buildMenuShareUrl,
  buildShareCardData,
  computeShareCardLayout,
  flattenMenuProducts,
  formatOrderTime,
  generateMenuQrDataUrl,
  orderHoursLine,
  orderWhatsappUrl,
  shareCardStyleList,
} from '../lib/shareCard.js';

const here = dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(join(here, rel), 'utf8');

// PR #159: la tarjeta «Para pedir» (la opción 1, «La carta», que
// eligió Jonathan) y el QR del menú, solo para negocios con menú.
// Datos reales de Carrito La Paz: Tostada Adobada $70, Tostada Salsas
// Negras $70, Tostada Acapulco $60; abre 11:00 a. m. – 10:00 p. m.
describe('tarjeta para compartir: «Para pedir» y QR del menú (PR #159)', () => {
  const carrito = {
    id: 'carrito-la-paz-id',
    name: 'Carrito La Paz',
    type: 'Restaurantes',
    city_slug: 'tepic',
    slug: 'tepic-carrito-la-paz',
    whatsapp: '322 379 2428',
    schedule: {
      dom: '11:00am - 10:00pm',
      lun: '11:00am - 10:00pm',
      mar: '11:00am - 10:00pm',
      mie: '11:00am - 10:00pm',
      jue: '11:00am - 10:00pm',
      vie: '11:00am - 10:00pm',
      sab: '11:00am - 10:00pm',
    },
    photos: [{ url: 'https://example.supabase.co/object/public/media/cityguide/carrito.jpg' }],
  };
  const menuItems = [
    { name: 'Tostada Adobada', priceLabel: '$70' },
    { name: 'Tostada Salsas Negras', priceLabel: '$70' },
    { name: 'Tostada Acapulco', priceLabel: '$60' },
    { name: 'Tostada de Camarón', priceLabel: '$80' },
  ];
  const menuUrl = buildMenuShareUrl(carrito);
  const qrDataUrl = generateMenuQrDataUrl(menuUrl);
  const menuData = (biz = carrito, items = menuItems) =>
    buildMenuShareCardData(biz, {
      disp: null,
      cityName: 'Tepic',
      menuItems: items,
      hoursLine: orderHoursLine(biz, 'America/Mazatlan'),
      whatsappUrl: orderWhatsappUrl(biz),
      menuUrl,
      qrDataUrl,
    });

  it('con menú hay 4 estilos y sin menú solo 2 (la lista base no cambia)', () => {
    // La lista base sigue siendo Oscura y Clara, como antes.
    expect(SHARE_CARD_STYLE_LIST.map((s) => s.id)).toEqual(['glass', 'editorial']);
    expect(SHARE_CARD_MENU_STYLE_LIST.map((s) => s.id)).toEqual([
      'glass',
      'editorial',
      'pedido',
      'qr',
    ]);
    expect(shareCardStyleList(false).map((s) => s.id)).toEqual(['glass', 'editorial']);
    expect(shareCardStyleList(true).map((s) => s.id)).toEqual([
      'glass',
      'editorial',
      'pedido',
      'qr',
    ]);
    expect(shareCardStyleList(true).find((s) => s.id === 'pedido').label).toBe('Para pedir');
    expect(shareCardStyleList(true).find((s) => s.id === 'qr').label).toBe('QR del menú');
  });

  it('la hora se escribe en 12 h, como las de los eventos', () => {
    expect(formatOrderTime('11:00am')).toBe('11:00 a. m.');
    expect(formatOrderTime('10:00pm')).toBe('10:00 p. m.');
    expect(formatOrderTime('12:00am')).toBe('12:00 a. m.');
    expect(formatOrderTime('12:00pm')).toBe('12:00 p. m.');
    expect(formatOrderTime('9am')).toBe('9:00 a. m.');
  });

  it('la línea de horario es el rango completo de hoy, no solo la apertura', () => {
    // El horario es el mismo todos los días: «hoy» es determinista.
    expect(orderHoursLine(carrito, 'America/Mazatlan')).toBe('Hoy 11:00 a. m. – 10:00 p. m.');
    expect(orderHoursLine({ schedule: { type: 'always_open' } })).toBe('Abierto 24/7');
    expect(
      orderHoursLine({
        schedule: {
          dom: 'Cerrado',
          lun: 'Cerrado',
          mar: 'Cerrado',
          mie: 'Cerrado',
          jue: 'Cerrado',
          vie: 'Cerrado',
          sab: 'Cerrado',
        },
      }),
    ).toBe('Cerrado hoy');
    // Sin horario no se inventa ninguno: la línea se omite.
    expect(orderHoursLine({})).toBeNull();
    expect(orderHoursLine({ schedule: { type: 'none' } })).toBeNull();
    expect(orderHoursLine({ schedule: {} })).toBeNull();
  });

  it('el botón de pedido abre WhatsApp con el número de la ficha y un mensaje', () => {
    expect(orderWhatsappUrl(carrito)).toBe(
      'https://wa.me/523223792428?text=Hola%20Carrito%20La%20Paz%2C%20quiero%20hacer%20un%20pedido.',
    );
    // El teléfono sirve igual que el WhatsApp; el 52 se añade si falta.
    expect(orderWhatsappUrl({ name: 'X', phone: '3112008507' })).toBe(
      'https://wa.me/523112008507?text=Hola%20X%2C%20quiero%20hacer%20un%20pedido.',
    );
    // Sin número no se inventa uno: el botón lleva al menú.
    expect(orderWhatsappUrl({ name: 'X' })).toBeNull();
  });

  it('la URL del menú es la misma que abre el menú en la ficha', () => {
    expect(menuUrl).toBe('https://citymap.mx/tepic/carrito-la-paz/menu');
    // Sin prefijo de ciudad en el slug, la URL es la misma.
    expect(buildMenuShareUrl({ ...carrito, slug: 'carrito-la-paz' })).toBe(
      'https://citymap.mx/tepic/carrito-la-paz/menu',
    );
    expect(buildMenuShareUrl({})).toBeNull();
    expect(buildMenuShareUrl({ city_slug: 'tepic' })).toBeNull();
  });

  it('los platillos salen en el orden de la ficha, solo disponibles y con precio', () => {
    const cats = [
      {
        sort_order: 2,
        store_products: [
          { name: 'Combo', price: 150, is_available: true, sort_order: 1 },
          { name: 'Agotado', price: 90, is_available: false, sort_order: 0 },
        ],
      },
      {
        sort_order: 1,
        store_products: [
          { name: 'Tostada Adobada', price: 70, is_available: true, sort_order: 2 },
          { name: 'Sin precio', price: null, is_available: true, sort_order: 1 },
          { name: 'Tostada Acapulco', price: 60, is_available: true, sort_order: 0 },
        ],
      },
    ];
    expect(flattenMenuProducts(cats)).toEqual([
      { name: 'Tostada Acapulco', priceLabel: '$60' },
      { name: 'Tostada Adobada', priceLabel: '$70' },
      { name: 'Combo', priceLabel: '$150' },
    ]);
    expect(flattenMenuProducts([])).toEqual([]);
    expect(flattenMenuProducts(null)).toEqual([]);
  });

  it('el QR se genera en el cliente para la URL del menú, siempre igual', () => {
    expect(qrDataUrl).toMatch(/^data:image\//);
    expect(generateMenuQrDataUrl(menuUrl)).toBe(qrDataUrl);
    expect(generateMenuQrDataUrl('https://citymap.mx/tepic/otro/menu')).not.toBe(qrDataUrl);
    expect(generateMenuQrDataUrl(null)).toBeNull();
    expect(generateMenuQrDataUrl('')).toBeNull();
  });

  it('los datos del menú se limitan a 3 platillos', () => {
    const d = menuData();
    expect(d.menuItems).toHaveLength(3);
    expect(d.menuItems.map((m) => m.name)).toEqual([
      'Tostada Adobada',
      'Tostada Salsas Negras',
      'Tostada Acapulco',
    ]);
    expect(d.hoursLine).toBe('Hoy 11:00 a. m. – 10:00 p. m.');
    expect(d.whatsappUrl).toBe(orderWhatsappUrl(carrito));
    expect(d.menuUrl).toBe(menuUrl);
    expect(d.qrDataUrl).toBe(qrDataUrl);
    // Sin menú, los datos son los de siempre.
    const plain = buildShareCardData(carrito, { disp: null, cityName: 'Tepic' });
    expect(plain.menuItems).toBeUndefined();
    expect(plain.hoursLine).toBeUndefined();
  });

  it('geometría «Para pedir»: 3 platillos con precio, sin píldoras ni círculo, botón al pie', () => {
    for (const format of [SHARE_CARD_FORMATS.story, SHARE_CARD_FORMATS.post]) {
      const d = menuData();
      const geo = computeShareCardLayout(d, format, true, 'pedido');
      // Los 3 platillos con su precio real del menú.
      expect(geo.dishes).toHaveLength(3);
      expect(geo.dishes.map((x) => x.name)).toEqual([
        'Tostada Adobada',
        'Tostada Salsas Negras',
        'Tostada Acapulco',
      ]);
      expect(geo.dishes.map((x) => x.price)).toEqual(['$70', '$70', '$60']);
      // SIN etiqueta de ciudad: no hay píldoras en esta tarjeta.
      expect(geo.pillRows).toEqual([]);
      // SIN círculo de logo: el nombre va en su propio bloque y nada
      // lo tapa (la queja de Tangente del PR #158 no se repite).
      expect(geo.bizLogo).toBeNull();
      // El nombre completo, sin truncar con «…».
      expect(geo.name.lines.join(' ')).not.toContain('…');
      expect(geo.name.lines).toEqual(['Carrito La Paz']);
      // La foto respeta su mínimo.
      expect(geo.photo.h).toBeGreaterThanOrEqual(geo.L.photoMinH);
      // La línea de horario es el rango completo, no «abre a las 11».
      expect(geo.hours.text).toBe('Hoy 11:00 a. m. – 10:00 p. m.');
      // El botón verde «Hacer pedido» queda a su hueco del pie.
      expect(geo.orderButton.label).toBe('Hacer pedido');
      const footTop = geo.height - geo.L.pad - geo.L.footSize;
      expect(footTop - (geo.orderButton.y + geo.orderButton.h)).toBe(geo.L.footGap);
    }
  });

  it('geometría «Para pedir» con 1 platillo y sin horario tampoco se desborda', () => {
    const biz = { ...carrito, schedule: undefined };
    const d = buildMenuShareCardData(biz, {
      disp: null,
      cityName: 'Tepic',
      menuItems: [{ name: 'Tostada Adobada', priceLabel: '$70' }],
      hoursLine: orderHoursLine(biz),
      whatsappUrl: orderWhatsappUrl(biz),
      menuUrl,
      qrDataUrl,
    });
    for (const format of [SHARE_CARD_FORMATS.story, SHARE_CARD_FORMATS.post]) {
      const geo = computeShareCardLayout(d, format, true, 'pedido');
      expect(geo.dishes).toHaveLength(1);
      expect(geo.hours).toBeNull();
      expect(geo.orderButton).not.toBeNull();
      expect(geo.photo.h).toBeGreaterThanOrEqual(geo.L.photoMinH);
      const footTop = geo.height - geo.L.pad - geo.L.footSize;
      expect(footTop - (geo.orderButton.y + geo.orderButton.h)).toBe(geo.L.footGap);
    }
  });

  it('geometría QR: cuadrado blanco centrado, sin foto ni píldoras, con su CTA', () => {
    for (const format of [SHARE_CARD_FORMATS.story, SHARE_CARD_FORMATS.post]) {
      const d = menuData();
      const geo = computeShareCardLayout(d, format, true, 'qr');
      // Sin foto ni píldoras en la tarjeta del QR.
      expect(geo.photo).toBeNull();
      expect(geo.pillRows).toEqual([]);
      expect(geo.bizLogo).toBeNull();
      // El cuadrado blanco va centrado en su área, con el QR dentro
      // (zona de silencio qrPad por todos lados) y lado grande para
      // que se escanee bien. El centro puede quedar a medio píxel por
      // el redondeo de la caja: se acepta menos de 1 px.
      expect(geo.qr.box.x + geo.qr.box.size / 2).toBeCloseTo(geo.width / 2, 0);
      expect(geo.qr.img.size).toBe(geo.qr.box.size - geo.L.qrPad * 2);
      expect(geo.qr.img.size).toBeGreaterThanOrEqual(300);
      expect(geo.qr.cta.text).toBe('Escanea para ver el menú');
      expect(geo.name.lines).toEqual(['Carrito La Paz']);
    }
  });

  it('la vista previa de «Para pedir» lleva platillos, horario y botón, sin ciudad', () => {
    const html = renderToStaticMarkup(
      <ShareCardTemplate data={menuData()} format={SHARE_CARD_FORMATS.story} styleId="pedido" />,
    );
    expect(html).toContain('Tostada Adobada');
    expect(html).toContain('Tostada Salsas Negras');
    expect(html).toContain('Tostada Acapulco');
    expect(html).toContain('$70');
    expect(html).toContain('$60');
    expect(html).toContain('Hoy 11:00 a. m. – 10:00 p. m.');
    expect(html).toContain('Hacer pedido');
    // Sin la etiqueta de la ciudad ni la frase vieja de apertura.
    expect(html).not.toContain('Tepic');
    expect(html).not.toContain('abre a las 11');
    // El cuarto platillo no entra en la tarjeta (solo 3).
    expect(html).not.toContain('Tostada de Camarón');
  });

  it('la vista previa del QR lleva la imagen del QR, la CTA y el nombre', () => {
    const html = renderToStaticMarkup(
      <ShareCardTemplate data={menuData()} format={SHARE_CARD_FORMATS.story} styleId="qr" />,
    );
    expect(html).toContain(qrDataUrl);
    expect(html).toContain('Escanea para ver el menú');
    expect(html).toContain('Carrito La Paz');
    expect(html).not.toContain('Tepic');
  });

  it('la hoja carga el menú, ofrece 4 estilos con menú y el botón de pedido', () => {
    const sheet = read('../components/ShareCardSheet.jsx');
    // La hoja recibe si hay menú y lo carga (la misma consulta que
    // BusinessStore); hasta que llega, solo ofrece Oscura y Clara.
    expect(sheet).toContain('hasMenu');
    expect(sheet).toContain('loadMenuItems(biz.id)');
    expect(sheet).toContain('shareCardStyleList(hasMenuItems)');
    // La pista (con sus clones del PR #158) y los puntos usan la
    // lista disponible, no la base de 2.
    expect(sheet).toContain('availableStyles');
    expect(sheet).toContain('availableStyles.map((s, n)');
    // El botón verde de la hoja abre WhatsApp o el menú.
    expect(sheet).toContain('Hacer pedido');
    expect(sheet).toContain('data.whatsappUrl || data.menuUrl');
    // El detalle ya le pasa si el negocio tiene menú.
    const detail = read('../views/DetailView.jsx');
    expect(detail).toContain('hasMenu={hasMenu}');
  });

  it('el canvas dibuja los platillos, el botón y el QR (misma geometría que la vista previa)', () => {
    const lib = read('../lib/shareCard.js');
    expect(lib).toContain('geo.dishes');
    expect(lib).toContain('geo.hours');
    expect(lib).toContain('geo.orderButton');
    expect(lib).toContain('geo.qr');
    expect(lib).toContain('loadShareCardQr');
    expect(lib).toContain('drawImage(assets.qr');
    // El QR va sobre un bloque blanco (contraste alto) aunque la
    // tarjeta sea oscura.
    expect(lib).toContain("ctx.fillStyle = '#FFFFFF'");
  });
});
