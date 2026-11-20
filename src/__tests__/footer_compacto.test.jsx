import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { TRANSLATIONS, ensureEnglishTranslations } from '../lib/i18n.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// Pie compacto en 2 columnas + botones de descarga (19 nov 2026, captura
// de Jonathan en Safari): el pie era una sola columna larga y sin forma de
// bajar la app. Ahora: bloque de marca compacto, insignias oficiales de
// App Store y Google Play, y las secciones Para Negocios y Soporte y Legal
// en rejilla fija de 2 columnas que no se apila en móvil.

const T = {
  text: '#F4F4F5', sub: '#A1A1AA', bg: '#18181B', white: '#232326',
  border: '#3F3F46', green: '#F4F4F5', dark: true,
};

vi.mock('../context/AppContext', () => ({
  useAppContext: () => ({
    T,
    dark: true,
    navigate: vi.fn(),
    setShowPlans: vi.fn(),
    setShowAddBiz: vi.fn(),
    setShowAuth: vi.fn(),
    user: null,
  }),
}));
vi.mock('../hooks/useTranslation.js', () => ({
  useTranslation: () => ({ t: (key, fallback) => fallback ?? key, lang: 'es' }),
}));

import Footer from '../components/Footer.jsx';

function renderFooter() {
  return renderToStaticMarkup(<Footer />);
}

describe('footer compacto en 2 columnas + descarga de la app', () => {
  it('las dos secciones quedan en rejilla fija de 2 columnas (no se apilan en móvil)', () => {
    const html = renderFooter();
    expect(html).toContain('grid-template-columns:1fr 1fr');
    expect(html).toContain('Para Negocios');
    expect(html).toContain('Soporte y Legal');
  });

  it('botones de descarga: insignias oficiales con los enlaces correctos de las tiendas', () => {
    const html = renderFooter();
    expect(html).toContain('href="https://apps.apple.com/app/citymap/id6834972842"');
    expect(html).toContain('href="https://play.google.com/store/apps/details?id=mx.citymap.app"');
    expect(html).toContain('src="/badges/app-store.svg"');
    expect(html).toContain('src="/badges/google-play.svg"');
    expect(html).toContain('alt="Descargar en App Store"');
    expect(html).toContain('alt="Disponible en Google Play"');
    expect(html).toContain('Descarga la app');
  });

  it('las insignias son archivos SVG de texto en public/badges/ (sin binarios)', () => {
    const appStore = read('../../public/badges/app-store.svg');
    const googlePlay = read('../../public/badges/google-play.svg');
    expect(appStore).toContain('<svg');
    expect(appStore).toContain('Download_on_the_App_Store');
    expect(googlePlay).toContain('<svg');
    // El texto del badge de Google Play va como paths (sin texto literal):
    // se verifica por su viewBox y los colores del triángulo Play.
    expect(googlePlay).toContain('viewBox="0 0 180 53.333"');
    expect(googlePlay).toContain('#3bad49');
    expect(googlePlay).toContain('#eb3131');
    // Sin imágenes incrustadas ni scripts: arte vectorial puro.
    expect(appStore).not.toContain('<image');
    expect(googlePlay).not.toContain('<image');
    expect(appStore).not.toContain('<script');
    expect(googlePlay).not.toContain('<script');
  });

  it('el pie es más compacto que antes: padding superior 28px y espacios recortados', () => {
    const html = renderFooter();
    expect(html).toContain('padding:28px 20px 24px');
    // Las dos columnas ya no usan el flex-wrap con gap 48 que las apilaba:
    // la rejilla fija es lo que las mantiene lado a lado en móvil.
    const src = read('../components/Footer.jsx');
    expect(src).toContain("gridTemplateColumns: '1fr 1fr'");
    expect(src).not.toContain('gap: 48');
    expect(src).not.toContain('gap: 40');
  });

  it('los enlaces de negocios y legal siguen ahí (nada se perdió en el recorte)', () => {
    const html = renderFooter();
    for (const txt of [
      'Agrega tu negocio', 'Acceso a dueños', 'Planes para tu negocio',
      'Sobre nosotros', 'Aviso de privacidad', 'Términos y condiciones', 'Contáctanos',
    ]) {
      expect(html).toContain(txt);
    }
    expect(html).toContain('©');
    expect(html).toContain('Todos los derechos reservados.');
  });

  it('i18n: la clave menu_descarga_app existe en es y en', async () => {
    await ensureEnglishTranslations();
    expect(TRANSLATIONS.es.menu_descarga_app, 'es').toBe('Descarga la app');
    expect(TRANSLATIONS.en.menu_descarga_app, 'en').toBe('Download the app');
  });
});
