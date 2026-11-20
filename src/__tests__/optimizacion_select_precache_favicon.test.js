import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// Optimización 1+2+4 (nov 2026): selects recortados en el arranque,
// precaché del SW solo primera pantalla y favicon sin duplicar.
// Cada afirmación tiene su número medido en el PR.

const store = read('../store/useDataStore.js');
const trips = read('../components/TripsView.jsx');
const vite = read('../../vite.config.js');
const html = read('../../index.html');

const selectConst = (src, name) => {
  const m = src.match(new RegExp(`const ${name} = "([^"]+)"`));
  expect(m, `${name} debe existir`).not.toBeNull();
  return m[1].split(',');
};

describe('optimización 1: selects recortados en el arranque', () => {
  it('eventos: select explícito con las columnas que lee toda la cadena (rueda + ficha + búsqueda)', () => {
    const cols = selectConst(store, 'EVENTS_SELECT');
    // La ficha lee el objeto de la lista (no hay full fetch: getEventBySlugOrId
    // está sin usar), así que description, website (de ahí sale
    // booking_config), lat/lng, is_recurring, status y visibility VAN.
    // La lista es la misma que ya usaba EventDetailModal para «Más eventos».
    for (const col of ['id', 'title', 'title_en', 'description_en', 'slug', 'date', 'end_date', 'time', 'end_time', 'venue_name', 'venue_address', 'lat', 'lng', 'city_slug', 'img_url', 'img', 'status', 'description', 'event_category', 'is_recurring', 'biz_id', 'price', 'price_type', 'website', 'visibility', 'active']) {
      expect(cols).toContain(col);
    }
    // Muertas en el arranque (medido: nadie las lee): fuera.
    for (const col of ['updated_at', 'created_at', 'tag', 'currency', 'whatsapp']) {
      expect(cols).not.toContain(col);
    }
  });

  it('experiencias: select explícito sin las columnas que nadie lee', () => {
    const cols = selectConst(store, 'EXPERIENCES_SELECT');
    for (const col of ['id', 'slug', 'title', 'title_en', 'description', 'description_en', 'city_slug', 'price', 'duration', 'gallery', 'booking_config', 'activity_type', 'theme', 'meeting_point', 'meeting_url', 'route_url', 'includes', 'not_includes', 'languages', 'faq', 'people', 'author_name', 'affiliate_products', 'biz_id', 'created_at']) {
      expect(cols).toContain(col);
    }
    for (const col of ['updated_at', 'status', 'active', 'rating', 'review_count']) {
      expect(cols).not.toContain(col);
    }
  });

  it('ciudades: sin civitatis_widget_code ni created_at (el widget es el 79 % del payload)', () => {
    const cols = selectConst(store, 'CITIES_SELECT');
    for (const col of ['id', 'slug', 'name', 'state', 'country', 'country_code', 'lat', 'lng', 'bg_image', 'timezone', 'active']) {
      expect(cols).toContain(col);
    }
    expect(cols).not.toContain('civitatis_widget_code');
    expect(cols).not.toContain('created_at');
  });

  it('las 3 consultas de eventos/experiencias y las 2 de ciudades usan las constantes', () => {
    expect(store.match(/\?select=\$\{EVENTS_SELECT\}/g)).toHaveLength(3);
    expect(store.match(/\?select=\$\{EXPERIENCES_SELECT\}/g)).toHaveLength(3);
    expect(store.match(/\?select=\$\{CITIES_SELECT\}/g)).toHaveLength(2);
    // No queda ningún select=* en el arranque para estas tres tablas.
    expect(store).not.toMatch(/sb\.get\("events", `\?status=/);
    expect(store).not.toMatch(/sb\.get\("experiences", `\?status=/);
    expect(store).not.toMatch(/sb\.get\('cities','\?order=/);
    expect(store).not.toMatch(/sb\.get\("cities", "\?order=/);
  });

  it('loadCityPins NO se recorta: sus columnas son de primer render (Reservar, fotos, Abiertos ahora)', () => {
    const m = store.match(/loadCityPins[\s\S]*?const selectCols = "([^"]+)"/);
    expect(m).not.toBeNull();
    const cols = m[1].split(',');
    for (const col of ['schedule', 'rating', 'review_count', 'booking_config', 'photos']) {
      expect(cols).toContain(col);
    }
  });

  it('TripsView pide el código del widget bajo demanda para la ciudad activa', () => {
    expect(trips).toContain('?select=civitatis_widget_code&slug=eq.');
    // Y sigue aceptando el código si viene en el store (caché vieja).
    expect(trips).toContain("cities.find(c => c.slug === activeCity)?.civitatis_widget_code");
  });
});

describe('optimización 2: precaché del SW solo primera pantalla', () => {
  it('navigateFallback y el registro del SW no se tocan (PR #392)', () => {
    expect(vite).toContain("navigateFallback: 'index.html'");
    expect(vite).toContain('cleanupOutdatedCaches: true');
  });

  it('globIgnores excluye las imágenes pesadas fuera de la primera pantalla', () => {
    for (const entry of ['scooter-reparto.png', 'plans/**', 'onboarding_1.jpg', 'onboarding_2.jpg', 'verificado.png', 'pedido.png', 'tripadvisor.png', 'hoteles.com.png', 'expedia.png', 'getyourguide.png', 'tiqets.png', 'civitatis.png', 'booking.png', 'airbnb.svg', 'google*.html', 'Coolvetica*.otf', 'favicon.png', 'apple-icon.png', 'apple-touch-icon.png']) {
      expect(vite).toContain(entry);
    }
  });

  it('includeAssets ya no mete los iconos viejos de 136 KB', () => {
    expect(vite).toContain("includeAssets: ['icon-192.png']");
    expect(vite).not.toContain("includeAssets: ['favicon.png', 'apple-icon.png']");
  });
});

describe('optimización 4: favicon sin duplicar', () => {
  it('index.html ya no referencia los 3 archivos idénticos de 136 KB', () => {
    expect(html).not.toContain('href="/favicon.png"');
    expect(html).not.toContain('href="/apple-icon.png"');
    expect(html).not.toContain('href="/apple-touch-icon.png"');
    expect(html).toContain('<link rel="apple-touch-icon" href="/icon-192.png" />');
    expect(html).toContain('<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />');
  });

  it('el manifest sigue declarando el icono de 512 px para instalar la PWA', () => {
    expect(vite).toContain("src: 'icon-512.png'");
    expect(vite).toContain("src: 'icon-192.png'");
  });
});
