import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import ShareCardSheet from '../components/ShareCardSheet.jsx';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

const noop = () => {};

// Carrito La Paz Tostadas de Atún (Tepic), el negocio real de las
// capturas de Jonathan: con menú, así la hoja ofrece los 4 estilos
// (Oscura, Clara, Para pedir y QR del menú) en el teléfono.
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

function renderSheet(props = {}) {
  return renderToStaticMarkup(
    <ShareCardSheet biz={CARRITO} onClose={noop} onShareLink={noop} {...props} />,
  );
}

// Hoja de compartir recortada (este PR): al abrirla desde «Compartir mi
// negocio» (Mi Perfil → Redes → «Tarjeta del perfil» → Abrir) la hoja
// no se veía completa en el teléfono de Jonathan (moto g54 5G): se
// cortaba por abajo y los botones no se alcanzaban.
// Causa raíz: la hoja es un overlay `position: fixed` que vivía como
// hijo del modal del hub (AccountView), cuyo div interior lleva
// `animation: scaleFadeIn ... both` — el keyframe final es
// `transform: scale(1)` y con fill `both` ese transform PERSISTE, así
// que ese div se vuelve el bloque contenedor de los fixed y el overlay
// solo cubría la caja del hub (~380 px) en vez de la ventana; el panel
// (~600 px) desbordaba esa caja y el `overflowY: auto` del hub lo
// cortaba por abajo, sin que el scroll propio de la hoja (maxHeight
// 92dvh) llegara a activarse. El arreglo: la hoja se monta con
// createPortal en document.body, así el overlay cuelga de la ventana
// en cualquier sitio que la abra (hub, ficha, panel del negocio).
describe('hoja de compartir recortada', () => {
  it('la hoja se monta con portal en document.body (no como hija del hub)', () => {
    const src = read('../components/ShareCardSheet.jsx');
    expect(src).toContain("import { createPortal } from 'react-dom'");
    expect(src).toContain('createPortal(sheet, document.body)');
    // Sin document (SSR/pruebas) se pinta en línea, nunca se rompe.
    expect(src).toContain("typeof document === 'undefined'");
  });

  it('el overlay es fixed a toda la ventana y el panel cabe con scroll', () => {
    const html = renderSheet();
    // El overlay cubre la ventana completa (ahora la de verdad, con
    // el portal: antes solo cubría la caja del hub).
    expect(html).toContain('position:fixed');
    expect(html).toContain('inset:0');
    // El panel está acotado a la altura visible y hace scroll si el
    // contenido no cabe: en una pantalla chica nada queda fuera.
    expect(html).toContain('max-height:92dvh');
    expect(html).toContain('overflow-y:auto');
  });

  it('las dos acciones están dentro de la hoja, después de la vista previa', () => {
    const html = renderSheet();
    // Sin menú cargado (el efecto no corre en el render estático) la
    // hoja ofrece Oscura y Clara: 2 puntos. Con menú son 4.
    expect(html).toContain('Estilo Oscura');
    expect(html).toContain('Estilo Clara');
    // En el teléfono los dos botones quedaban cortados: ahora van en
    // flujo normal al final del panel, dentro de su zona con scroll.
    expect(html).toContain('Descargar imagen');
    expect(html).toContain('Compartir enlace');
    // La plantilla parte el nombre en dos líneas («Carrito La Paz» /
    // «Tostadas de Atún»), así que el nombre completo no sale contiguo
    // en el HTML: se busca la primera línea como ancla de la vista
    // previa.
    expect(html).toContain('Carrito La Paz');
    expect(html).toContain('Tostadas de Atún');
    const preview = html.indexOf('Carrito La Paz');
    const dots = html.indexOf('Estilo Oscura');
    const download = html.indexOf('Descargar imagen');
    const link = html.indexOf('Compartir enlace');
    expect(preview).toBeGreaterThan(-1);
    expect(dots).toBeGreaterThan(preview);
    expect(download).toBeGreaterThan(dots);
    expect(link).toBeGreaterThan(download);
    // La hoja se puede cerrar sin depender del hub.
    expect(html).toContain('aria-label="Cerrar"');
  });

  it('el hub sigue abriendo la misma hoja (el portal no cambia su uso)', () => {
    const hub = read('../components/BizShareHub.jsx');
    expect(hub).toContain('<ShareCardSheet biz={biz}');
    expect(hub).toContain("setSheet('perfil')");
    expect(hub).toContain("setSheet('menu')");
  });
});
