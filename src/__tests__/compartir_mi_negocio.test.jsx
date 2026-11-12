import React from 'react';
import { describe, expect, it, beforeAll } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { MemoryRouter } from 'react-router-dom';
import BizShareHub from '../components/BizShareHub.jsx';
import {
  COMPARTIR_TABS,
  buildBareQrUrl,
  buildBizProfileUrl,
  buildQrCardData,
  compartirMaterials,
  qrCardFileName,
} from '../lib/compartirNegocio.js';
import { TRANSLATIONS, ensureEnglishTranslations } from '../lib/i18n.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

const T = {
  text: '#111',
  sub: '#666',
  bg: '#fff',
  white: '#fff',
  border: '#eee',
  green: '#000',
};

// Carrito La Paz Tostadas de Atún (Tepic), el negocio real de las
// capturas de Jonathan: el slug guardado lleva el prefijo de la ciudad
// y cleanCityPrefix lo quita para la URL pública.
const CARRITO = {
  id: 'biz-carrito',
  name: 'Carrito La Paz Tostadas de Atún',
  status: 'approved',
  plan: 'premium',
  city_slug: 'tepic',
  slug: 'tepic-carrito-la-paz-tostadas-de-atun',
  category: 'restaurantes',
  rating: 5,
  review_count: 12,
  photos: [{ url: 'https://example.org/carrito.jpg' }],
  logo_url: 'https://example.org/carrito-logo.png',
};

const MENU_ITEMS = [
  { name: 'Tostada de atún', priceLabel: '$70' },
  { name: 'Tostada de ceviche', priceLabel: '$65' },
];

function renderHub(props = {}) {
  return renderToStaticMarkup(
    <MemoryRouter>
      <BizShareHub biz={CARRITO} T={T} menuItems={[]} {...props} />
    </MemoryRouter>,
  );
}

beforeAll(async () => {
  await ensureEnglishTranslations();
});

describe('Compartir mi negocio: materiales por pestaña (PR #240)', () => {
  it('las 3 pestañas son Redes, Para imprimir y QR suelto, en ese orden', () => {
    expect(COMPARTIR_TABS).toEqual(['redes', 'imprimir', 'qr']);
  });

  it('la URL del perfil es la pública, sin /menu', () => {
    expect(buildBizProfileUrl(CARRITO)).toBe(
      'https://citymap.mx/tepic/carrito-la-paz-tostadas-de-atun',
    );
    expect(buildBizProfileUrl({ city_slug: 'tepic', slug: 'carrito-la-paz-tostadas-de-atun' })).toBe(
      'https://citymap.mx/tepic/carrito-la-paz-tostadas-de-atun',
    );
    expect(buildBizProfileUrl({})).toBeNull();
    expect(buildBizProfileUrl(null)).toBeNull();
  });

  it('la URL del QR pelado es la de siempre (citymap.mx, con /menu para el menú)', () => {
    expect(buildBareQrUrl(CARRITO, 'perfil')).toBe(
      'https://citymap.mx/tepic/carrito-la-paz-tostadas-de-atun',
    );
    expect(buildBareQrUrl(CARRITO, 'menu')).toBe(
      'https://citymap.mx/tepic/carrito-la-paz-tostadas-de-atun/menu',
    );
  });

  it('el nombre del PNG de la tarjeta QR distingue perfil y menú', () => {
    expect(qrCardFileName(CARRITO, 'perfil')).toBe(
      'tarjeta-qr-perfil-carrito-la-paz-tostadas-de-atun.png',
    );
    expect(qrCardFileName(CARRITO, 'menu')).toBe(
      'tarjeta-qr-menu-carrito-la-paz-tostadas-de-atun.png',
    );
  });

  it('sin menú, cada pestaña ofrece solo el material del perfil', () => {
    const m = compartirMaterials(false);
    expect(m).toEqual({
      redes: ['tarjeta-perfil'],
      imprimir: ['qr-perfil'],
      qr: ['qr-suelto-perfil'],
    });
    expect(compartirMaterials([])).toEqual(m);
    expect(compartirMaterials(null)).toEqual(m);
  });

  it('con menú, cada pestaña suma también el material del menú', () => {
    expect(compartirMaterials(true)).toEqual({
      redes: ['tarjeta-perfil', 'tarjeta-menu'],
      imprimir: ['qr-perfil', 'qr-menu'],
      qr: ['qr-suelto-perfil', 'qr-suelto-menu'],
    });
  });

  it('la tarjeta QR del perfil lleva el QR de la URL del perfil y su «Escanea»', () => {
    const data = buildQrCardData(CARRITO, 'perfil', { cityName: 'Tepic' });
    expect(data).not.toBeNull();
    expect(data.name).toBe('Carrito La Paz Tostadas de Atún');
    expect(data.qrDataUrl).toMatch(/^data:image\//);
    expect(data.qrCta).toBe('Escanea para ver el perfil');
    // La tarjeta QR no lleva foto: no se pide con CORS al exportar.
    expect(data.photoUrl).toBeNull();
    expect(data.photoUrls).toEqual([]);
  });

  it('la tarjeta QR del menú lleva el QR de la URL del menú y su «Escanea»', () => {
    const perfil = buildQrCardData(CARRITO, 'perfil', { cityName: 'Tepic' });
    const menu = buildQrCardData(CARRITO, 'menu', { cityName: 'Tepic' });
    expect(menu).not.toBeNull();
    expect(menu.qrDataUrl).toMatch(/^data:image\//);
    expect(menu.qrDataUrl).not.toBe(perfil.qrDataUrl);
    expect(menu.qrCta).toBe('Escanea para ver el menú');
    expect(menu.menuUrl).toBe('https://citymap.mx/tepic/carrito-la-paz-tostadas-de-atun/menu');
  });

  it('sin URL no hay tarjeta QR (nunca rota)', () => {
    expect(buildQrCardData({}, 'perfil')).toBeNull();
    expect(buildQrCardData({}, 'menu')).toBeNull();
  });

  it('el texto «Escanea» es parametrizable en la plantilla y en el canvas', () => {
    const template = read('../components/ShareCardTemplate.jsx');
    expect(template).toContain("data?.qrCta || 'Escanea para ver el menú'");
    const lib = read('../lib/shareCard.js');
    expect(lib).toContain("text: data?.qrCta || 'Escanea para ver el menú'");
  });
});

describe('Compartir mi negocio: el centro renderiza por pestaña', () => {
  it('la pestaña Redes lista la tarjeta del perfil y, sin menú, no la del menú', () => {
    const html = renderHub();
    expect(html).toContain('Compartir mi negocio');
    expect(html).toContain('Redes');
    expect(html).toContain('Para imprimir');
    expect(html).toContain('QR suelto');
    expect(html).toContain('Tarjeta del perfil');
    expect(html).not.toContain('Tarjeta del menú');
  });

  it('con menú, la pestaña Redes también lista la tarjeta del menú', () => {
    const html = renderHub({ menuItems: MENU_ITEMS });
    expect(html).toContain('Tarjeta del perfil');
    expect(html).toContain('Tarjeta del menú');
  });

  it('la pestaña Para imprimir muestra la tarjeta QR del perfil con su QR', () => {
    const html = renderHub({ initialTab: 'imprimir' });
    expect(html).toContain('QR del perfil');
    expect(html).toContain('Escanea para ver el perfil');
    expect(html).toContain('Descargar');
    expect(html).toContain('data:image/');
    expect(html).not.toContain('QR del menú');
  });

  it('con menú, Para imprimir también muestra la tarjeta QR del menú', () => {
    const html = renderHub({ initialTab: 'imprimir', menuItems: MENU_ITEMS });
    expect(html).toContain('QR del perfil');
    expect(html).toContain('QR del menú');
    expect(html).toContain('Escanea para ver el menú');
  });

  it('la pestaña QR suelto ofrece el QR del perfil y, sin menú, no el del menú', () => {
    const html = renderHub({ initialTab: 'qr' });
    expect(html).toContain('Perfil');
    expect(html).toContain('Página principal');
    expect(html).not.toContain('Abre tu menú');
  });

  it('con menú, QR suelto también ofrece el QR del menú', () => {
    const html = renderHub({ initialTab: 'qr', menuItems: MENU_ITEMS });
    expect(html).toContain('Abre tu menú');
  });

  it('sin foto ni logo, el centro sigue renderizando (nunca imagen rota)', () => {
    const html = renderHub({ biz: { ...CARRITO, photos: [], logo_url: null } });
    expect(html).toContain('Compartir mi negocio');
    expect(html).toContain('Tarjeta del perfil');
  });
});

describe('Compartir mi negocio: cableado en Mi Perfil y en el panel', () => {
  it('la entrada de Mi Perfil ya se llama «Compartir mi negocio» y abre el centro', () => {
    const account = read('../components/AccountView.jsx');
    expect(account).toContain('compartir_mi_negocio');
    expect(account).toContain('Compartir mi negocio');
    expect(account).toContain('<BizShareHub');
    expect(account).toContain('owner_share_');
    expect(account).not.toContain('descargar_qr');
    expect(account).not.toContain('owner_qr_');
    expect(account).not.toContain('qrModalBiz');
    // Las descargas del QR pelado del negocio ya no viven aquí (las
    // lleva el centro): el api.qrserver.com que queda en AccountView
    // es el QR personal del usuario (180×180, /scan/), otra función.
    expect(account).not.toContain('size=1024x1024');
    expect(account).not.toContain('QR_Perfil_');
  });

  it('el panel del negocio usa el mismo centro (una sola experiencia de QR)', () => {
    const panel = read('../components/store/StoreAdminPanel.jsx');
    expect(panel).toContain('<BizShareHub');
    expect(panel).not.toContain('Códigos QR del Negocio');
    expect(panel).not.toContain('api.qrserver.com');
  });

  it('el centro reutiliza la hoja de compartir y la exportación de ShareCard', () => {
    const hub = read('../components/BizShareHub.jsx');
    expect(hub).toContain('ShareCardSheet');
    expect(hub).toContain('menuOnly');
    expect(hub).toContain('exportShareCardPng');
    expect(hub).toContain("styleId=\"qr\"");
    expect(hub).toContain('api.qrserver.com');
  });

  it('las claves nuevas existen en ES y EN, y las viejas ya no existen', () => {
    expect(TRANSLATIONS.es['compartir_mi_negocio']).toBe('Compartir mi negocio');
    expect(TRANSLATIONS.en['compartir_mi_negocio']).toBe('Share my business');
    expect(TRANSLATIONS.es['compartir_redes']).toBe('Redes');
    expect(TRANSLATIONS.es['compartir_para_imprimir']).toBe('Para imprimir');
    expect(TRANSLATIONS.es['compartir_qr_suelto']).toBe('QR suelto');
    expect(TRANSLATIONS.en['compartir_redes']).toBe('Social');
    expect(TRANSLATIONS.en['compartir_para_imprimir']).toBe('To print');
    expect(TRANSLATIONS.en['compartir_qr_suelto']).toBe('Plain QR');
    for (const key of ['descargar_qr', 'codigos_qr', 'descarga_qr_desc', 'descarga_qr_desc_2', 'error_qr']) {
      expect(TRANSLATIONS.es[key]).toBeUndefined();
      expect(TRANSLATIONS.en[key]).toBeUndefined();
    }
    const es = read('../lib/i18n.js');
    const en = read('../lib/i18n-en.js');
    expect(es).not.toContain('"descargar_qr"');
    expect(en).not.toContain('"descargar_qr"');
    expect(es).not.toContain('"codigos_qr"');
    expect(en).not.toContain('"codigos_qr"');
  });
});
