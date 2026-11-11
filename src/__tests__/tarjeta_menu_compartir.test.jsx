import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  SHARE_CARD_MENU_ONLY_STYLE_LIST,
  buildMenuShareUrl,
  generateMenuQrDataUrl,
  shareCardStyleList,
} from '../lib/shareCard.js';

const here = dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(join(here, rel), 'utf8');

// PR #162: «Esas dos deben estar en el link del menú no en la tarjeta
// del negocio» (Jonathan, 10 nov 2026, con capturas de la hoja de
// Carrito La Paz). «Para pedir» y «QR del menú» salen de la hoja
// Compartir de la ficha del negocio (que vuelve a 2 estilos, Oscura
// y Clara, para todos) y pasan a la página del menú
// (/{ciudad}/{slug}/menu), con un botón «Compartir» ahí que ofrece
// solo esos 2 estilos. Las tarjetas no cambian de contenido ni de
// geometría (eso lo cubren las pruebas del PR #159).
describe('tarjeta para compartir: «Para pedir» y QR solo en el menú (PR #162)', () => {
  it('la lista de solo-menú tiene solo «Para pedir» y «QR del menú»', () => {
    expect(SHARE_CARD_MENU_ONLY_STYLE_LIST.map((s) => s.id)).toEqual(['pedido', 'qr']);
    expect(shareCardStyleList(false, { menuOnly: true }).map((s) => s.id)).toEqual([
      'pedido',
      'qr',
    ]);
    expect(shareCardStyleList(true, { menuOnly: true }).map((s) => s.id)).toEqual([
      'pedido',
      'qr',
    ]);
    expect(
      shareCardStyleList(false, { menuOnly: true }).find((s) => s.id === 'pedido').label,
    ).toBe('Para pedir');
    expect(
      shareCardStyleList(false, { menuOnly: true }).find((s) => s.id === 'qr').label,
    ).toBe('QR del menú');
    // Sin menuOnly, la lista no cambia (2 sin menú, 4 con menú).
    expect(shareCardStyleList(false).map((s) => s.id)).toEqual(['glass', 'editorial']);
    expect(shareCardStyleList(true).map((s) => s.id)).toEqual([
      'glass',
      'editorial',
      'pedido',
      'qr',
    ]);
  });

  it('la ficha de un negocio CON menú ya solo ofrece 2 estilos', () => {
    const detail = read('../views/DetailView.jsx');
    // La hoja de la ficha ya no recibe hasMenu: nunca carga el menú y
    // la lista disponible es la base de 2, tenga menú o no.
    expect(detail).toContain('<ShareCardSheet biz={selected}');
    expect(detail).not.toContain('hasMenu={hasMenu}');
    // El botón «VER MENÚ» de la ficha sigue ahí (ese hasMenu es otro:
    // el de la consulta que decide si se muestra el botón).
    expect(detail).toContain('VER MENÚ');
    expect(detail).toContain('selected.plan === "premium" && hasMenu');
  });

  it('la página del menú ya NO tiene botón «Compartir» en píldora; el icono superior se queda', () => {
    // 11 nov 2026 (Jonathan, con capturas de El Tentempié): la píldora
    // «Compartir» de abajo de la dirección sale de la página pública
    // del menú; las tarjetas pasan al panel del dueño. El icono de
    // compartir de la esquina superior se conserva (comparte el enlace
    // con el menú nativo del sistema, no es la hoja de tarjetas).
    const store = read('../components/store/BusinessStore.jsx');
    expect(store).not.toContain('setShowMenuShareCard');
    expect(store).not.toContain('menuShareItems');
    expect(store).not.toContain('menuOnly');
    expect(store).not.toContain('Compartir menú');
    expect(store).not.toContain('ShareCardSheet');
    // El icono superior sigue ahí.
    expect(store).toContain('aria-label="Compartir"');
    expect(store).toContain('onClick={handleShare}');
    // La ficha conserva su botón de compartir (ahí no se tocó nada).
    const detail = read('../views/DetailView.jsx');
    expect(detail).toContain('setShowShareCard(true)');
    expect(detail).toContain('<ShareCardSheet biz={selected}');
  });

  it('la hoja en modo menú arranca en «Para pedir» y espera a los platillos', () => {
    const sheet = read('../components/ShareCardSheet.jsx');
    expect(sheet).toContain('menuOnly = false');
    expect(sheet).toContain('menuItems: menuItemsProp = null');
    expect(sheet).toContain('SHARE_CARD_MENU_ONLY_STYLE_LIST[0].id');
    expect(sheet).toContain('shareCardStyleList(hasMenuItems, { menuOnly })');
    // Sin platillos, no se pinta una tarjeta a medias: «Cargando…».
    expect(sheet).toContain('menuReady');
    expect(sheet).toContain('Cargando menú…');
  });

  it('el QR sigue codificando la URL canónica del menú (la que abre el menú real)', () => {
    // El slug REAL de Carrito La Paz en la base es el largo: la URL
    // corta (/tepic/carrito-la-paz/menu) da «Menú no encontrado» y el
    // QR del #159 ya codifica la canónica (verificado con jsQR el
    // 10 nov 2026). El constructor de URL no cambia en este PR.
    const carritoReal = { city_slug: 'tepic', slug: 'tepic-carrito-la-paz-tostadas-de-atun' };
    expect(buildMenuShareUrl(carritoReal)).toBe(
      'https://citymap.mx/tepic/carrito-la-paz-tostadas-de-atun/menu',
    );
    expect(
      buildMenuShareUrl({ city_slug: 'tepic', slug: 'carrito-la-paz-tostadas-de-atun' }),
    ).toBe('https://citymap.mx/tepic/carrito-la-paz-tostadas-de-atun/menu');
    // El QR se genera para esa URL canónica, y es distinto del de la
    // URL corta (que no abre el menú).
    const qrCanonica = generateMenuQrDataUrl(buildMenuShareUrl(carritoReal));
    const qrCorta = generateMenuQrDataUrl('https://citymap.mx/tepic/carrito-la-paz/menu');
    expect(qrCanonica).toMatch(/^data:image\//);
    expect(qrCanonica).not.toBe(qrCorta);
    // La hoja del menú construye la URL del menú con ese constructor.
    const sheet = read('../components/ShareCardSheet.jsx');
    expect(sheet).toContain('buildMenuShareUrl(biz)');
  });
});
