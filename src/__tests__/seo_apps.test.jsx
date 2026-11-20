import fs from 'node:fs';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import og from '../../api/og.js';
import {
  APP_STORE_URL,
  PLAY_STORE_URL,
  softwareApplicationSchema,
} from '../lib/structuredData.js';
import AppDownloadBadges from '../components/AppDownloadBadges.jsx';

// SEO de las apps + botones de descarga (nov 2026): Smart App Banner de
// iOS, nodo SoftwareApplication en el grafo JSON-LD de la home (estático,
// cliente y bots) y botones de descarga en el menú lateral, el inicio, el
// pie de la ficha de evento y el pie de los artículos de Revista/tours.
// Los .well-known ya existían y se sirven en vivo en los dos dominios.

const readSource = (rel) =>
  fs.readFileSync(new URL(rel, import.meta.url), 'utf8');

const request = (path, host = 'citymap.mx', agent = 'Googlebot') =>
  new Request(`https://${host}${path}`, { headers: { 'user-agent': agent } });

const ldScripts = (html) =>
  [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((m) => JSON.parse(m[1]));

const json = (rows) =>
  new Response(JSON.stringify(rows), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

describe('softwareApplicationSchema', () => {
  it('describe la app con datos reales y verificados, sin inventar nada', () => {
    const node = softwareApplicationSchema('https://citymap.mx');
    expect(node['@type']).toBe('SoftwareApplication');
    expect(node.name).toBe('CityMap');
    expect(node.operatingSystem).toEqual(['iOS', 'Android']);
    expect(node.applicationCategory).toBe('TravelApplication');
    expect(node.inLanguage).toBe('es');
    // Gratis, sin ratings ni descargas inventadas.
    expect(node.offers).toEqual({ '@type': 'Offer', price: 0, priceCurrency: 'MXN' });
    expect(node.downloadUrl).toEqual([APP_STORE_URL, PLAY_STORE_URL]);
    expect(node.author).toEqual({
      '@type': 'Organization',
      name: 'CityMap',
      url: 'https://citymap.mx/',
    });
  });

  it('usa las fichas oficiales de App Store y Google Play', () => {
    expect(APP_STORE_URL).toBe('https://apps.apple.com/app/citymap/id6834972842');
    expect(PLAY_STORE_URL).toBe('https://play.google.com/store/apps/details?id=mx.citymap.app');
  });

  it('usa el host que sirve la página para el author (en .world no apunta a .mx)', () => {
    expect(softwareApplicationSchema('https://www.citymap.world').author.url)
      .toBe('https://www.citymap.world/');
  });
});

describe('Smart App Banner + JSON-LD estático (index.html)', () => {
  it('lleva el meta apple-itunes-app con el app-id de CityMap', () => {
    const html = readSource('../../index.html');
    expect(html).toContain('<meta name="apple-itunes-app" content="app-id=6834972842"');
  });

  it('incluye el nodo SoftwareApplication en el grafo estático', () => {
    const html = readSource('../../index.html');
    expect(html).toContain('"@type": "SoftwareApplication"');
    expect(html).toContain('https://apps.apple.com/app/citymap/id6834972842');
    expect(html).toContain('https://play.google.com/store/apps/details?id=mx.citymap.app');
  });
});

describe('JSON-LD de la home en cliente y bots', () => {
  it('useAppSEO.js añade el nodo al grafo de la home genérica', () => {
    const src = readSource('../hooks/useAppSEO.js');
    expect(src).toContain('softwareApplicationSchema');
    // Solo en la home genérica (isGenericRoot), no en fichas ni categorías.
    expect(src).toMatch(/isGenericRoot[\s\S]*softwareApplicationSchema\(BASE_URL\)/);
  });

  it('api/og.js añade el nodo al homeSchema que reciben los bots', () => {
    const src = readSource('../../api/og.js');
    expect(src).toContain('softwareApplicationSchema(BASE_URL)');
  });
});

describe('og home para bots: el HTML servido lleva SoftwareApplication', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      const parsed = new URL(url);
      const table = parsed.pathname.split('/').pop();
      const records = {
        cities: [{ slug: 'guadalajara', country_code: 'mx', bg_image: null }],
        events: [],
      };
      return json(records[table] || []);
    }));
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('la home para Googlebot incluye el nodo SoftwareApplication con las dos tiendas', async () => {
    const response = await og(request('/api/og?_bot=1'));
    expect(response.status).toBe(200);
    const nodes = ldScripts(await response.text())[0];
    const app = nodes['@graph'].find((n) => n['@type'] === 'SoftwareApplication');
    expect(app).toBeDefined();
    expect(app.downloadUrl).toEqual([APP_STORE_URL, PLAY_STORE_URL]);
    expect(app.offers.price).toBe(0);
  });
});

describe('AppDownloadBadges', () => {
  it('renderiza las insignias oficiales con los dos enlaces de descarga', () => {
    const html = renderToStaticMarkup(<AppDownloadBadges />);
    expect(html).toContain(`href="${APP_STORE_URL}"`);
    expect(html).toContain(`href="${PLAY_STORE_URL}"`);
    // Las mismas insignias oficiales del pie (SVG en public/badges/).
    expect(html).toContain('src="/badges/app-store.svg"');
    expect(html).toContain('src="/badges/google-play.svg"');
    expect(html).toContain('target="_blank"');
  });

  it('usa el componente compartido en el menú lateral y en los dos inicios', () => {
    const usages = [
      ['../components/SideMenu.jsx', "import AppDownloadBadges from './AppDownloadBadges.jsx'"],
      ['../views/HomeView.jsx', "import AppDownloadBadges from \"../components/AppDownloadBadges.jsx\""],
      ['../views/GlobalHomeView.jsx', "import AppDownloadBadges from '../components/AppDownloadBadges.jsx'"],
    ];
    for (const [rel, importLine] of usages) {
      const src = readSource(rel);
      expect(src).toContain(importLine);
      expect(src).toContain('<AppDownloadBadges');
    }
    // El pie lo hace la otra PR: aquí no se toca.
    expect(readSource('../components/Footer.jsx')).not.toContain('AppDownloadBadges');
  });

  it('usa el mismo componente al pie de la ficha de evento y de los artículos de Revista/tours', () => {
    // Ficha de evento (EventDetailModal): abajo del todo, después de
    // «Más eventos» y por encima de la barra fija de boletos.
    const modal = readSource('../components/modals/EventDetailModal.jsx');
    expect(modal).toContain("import AppDownloadBadges from '../AppDownloadBadges.jsx';");
    expect(modal).toContain('<AppDownloadBadges');
    const masEventos = modal.indexOf('MÁS EVENTOS');
    const badgesModal = modal.indexOf('<AppDownloadBadges');
    const barraBoletos = modal.indexOf('Barra fija de boletos');
    expect(masEventos).toBeGreaterThan(-1);
    expect(badgesModal).toBeGreaterThan(masEventos);
    expect(barraBoletos).toBeGreaterThan(badgesModal);

    // Artículos de Revista y tours (ExperienceViewer, un solo lector
    // para los dos): abajo del todo, después del disclaimer legal y
    // antes de los modales (galería, hoja de compartir).
    const viewer = readSource('../components/ExperienceViewer.jsx');
    expect(viewer).toContain("import AppDownloadBadges from './AppDownloadBadges.jsx';");
    expect(viewer).toContain('<AppDownloadBadges');
    const disclaimer = viewer.indexOf('Disclaimer Legal');
    const badgesViewer = viewer.indexOf('<AppDownloadBadges');
    const galeria = viewer.indexOf('Fullscreen Gallery Modal');
    expect(disclaimer).toBeGreaterThan(-1);
    expect(badgesViewer).toBeGreaterThan(disclaimer);
    expect(galeria).toBeGreaterThan(badgesViewer);
  });
});

describe('.well-known: App Links ya en su sitio (sin cambios en esta PR)', () => {
  it('assetlinks.json cubre mx.citymap.app con la huella de la firma de Play', () => {
    const assetlinks = JSON.parse(readSource('../../public/.well-known/assetlinks.json'));
    const target = assetlinks[0].target;
    expect(target.package_name).toBe('mx.citymap.app');
    expect(target.sha256_cert_fingerprints).toContain(
      '92:6B:11:B2:E1:85:72:4D:52:12:26:76:3C:11:D2:8D:B7:0B:36:F3:2B:AA:62:68:B5:73:5C:83:60:21:86:C5',
    );
  });

  it('apple-app-site-association declara la app iOS con applinks en todas las rutas', () => {
    const aasa = JSON.parse(readSource('../../public/.well-known/apple-app-site-association'));
    expect(aasa.applinks.details[0].appID).toBe('74S45QN779.mx.citymap.app');
    expect(aasa.applinks.details[0].paths).toContain('*');
  });
});
