// Hallazgos #7 y #8 del análisis de fluidez (nov 2026): imágenes del
// menú (logo con prioridad, sin thumb 20×20 por tarjeta, foto de
// producto comprimida al subir) y re-renders (búsqueda con debounce,
// tick de 60 s que solo re-renderiza si cambia la franja horaria,
// listas memoizadas).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { menuTimeKey } from '../lib/menuCategoryHours.js';
import {
  MENU_PRODUCT_IMAGE_OPTIMIZE,
  resolveOptimizeOptions,
  shouldOptimizeImage,
} from '../lib/imageOptimize.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

describe('Hallazgo #7a: logo del menú y del modal con prioridad', () => {
  it('el logo del encabezado del menú es priority (eager + fetchpriority high, sin fundido)', () => {
    const src = read('../components/store/BusinessStore.jsx');
    const at = src.indexOf('Profile Logo Circular Superpuesto');
    expect(at).toBeGreaterThan(-1);
    const block = src.slice(at, at + 1500);
    expect(block).toContain('src={business.logo_url || business.logo}');
    expect(block).toContain('widthRequest={200}');
    expect(block).toContain('heightRequest={200}');
    expect(block).toContain('priority');
    // Sin getThumbUrl precalculado: OptimizedImage lo calcula con el
    // ancho pedido (antes pasaba 200×200 y el wrapper volvía a pedir 400).
    expect(block).not.toContain('getThumbUrl(business.logo_url');
  });

  it('el logo del modal de intención (ficha) es priority y ya no pide el original entero', () => {
    const src = read('../views/DetailView.jsx');
    const at = src.indexOf('¿Cómo nos visitas hoy?');
    expect(at).toBeGreaterThan(-1);
    const block = src.slice(at - 2500, at);
    expect(block).toContain('OptimizedImage');
    expect(block).toContain('src={selected.logo_url || selected.logo}');
    expect(block).toContain('widthRequest={200}');
    expect(block).toContain('heightRequest={200}');
    expect(block).toContain('priority');
    // Ya no hay un <img> plano con el logo original.
    expect(block).not.toMatch(/<img[^>]*selected\.logo_url/);
  });

  it('el logo de la pantalla de carga del menú también es priority', () => {
    const src = read('../components/store/MenuLoadingScreen.jsx');
    expect(src).toContain('src={business.logo_url || business.logo}');
    expect(src).toContain('widthRequest={200}');
    expect(src).toContain('priority');
  });
});

describe('Hallazgo #7b: tarjetas sin thumb 20×20, placeholder de color', () => {
  it('BusinessCard ya no pide el thumb 20×20 en ninguna variante', () => {
    const src = read('../components/cards/BusinessCard.jsx');
    expect(src).not.toContain('thumbSrc');
    expect(src).not.toContain('getThumbUrl(thumb.url, 20, 20)');
    // La foto real y su srcset siguen intactos en las tres variantes.
    expect(src).toContain('getThumbUrl(thumb.url, 300, 300)');
    expect(src).toContain('getThumbUrl(thumb.url, 600, 400)');
    expect(src).toContain('getThumbUrl(thumb.url, 800, 600)');
    expect(src).toContain('getThumbSrcSet(thumb.url, SRCSET_THUMB, 400)');
    expect(src).toContain('getThumbSrcSet(thumb.url, SRCSET_CARD, 533)');
    expect(src).toContain('getThumbSrcSet(thumb.url, SRCSET_CARD, 600)');
  });

  it('BusinessCard pasa un placeholder de color según el tema', () => {
    const src = read('../components/cards/BusinessCard.jsx');
    const uses = src.split('placeholder={thumbPlaceholder}').length - 1;
    expect(uses).toBe(3);
    expect(src).toContain('const thumbPlaceholder = dark');
  });

  it('ProgressiveImage ya no tiene thumb borroso: fondo de color + fundido de la foto real', () => {
    const src = read('../components/ProgressiveImage.jsx');
    expect(src).not.toContain('thumbSrc');
    expect(src).not.toContain('blur(20px)');
    expect(src).toContain('placeholder');
    expect(src).toContain("background: placeholder");
    // La foto real aparece con fundido sobre el placeholder (antes
    // quedaba en opacidad 1 desde el inicio porque el thumb tapaba).
    expect(src).toContain('opacity: isLoaded ? 1 : 0');
    // Una imagen ya cargada no vuelve a mostrar el placeholder al
    // remontarse la tarjeta (lo cubre tarjetas_scroll.test.jsx).
    expect(src).toContain('globalLoadedImages.has(src)');
  });
});

describe('Hallazgo #7c: foto de producto comprimida al subir', () => {
  it('el preset del menú es ≤800 px / ≤200 KB, siempre', () => {
    expect(MENU_PRODUCT_IMAGE_OPTIMIZE).toEqual({
      maxSizeMB: 0.2,
      maxWidthOrHeight: 800,
      initialQuality: 0.82,
      always: true,
    });
  });

  it('el preset se resuelve a los parámetros de compresión', () => {
    expect(resolveOptimizeOptions({ optimize: MENU_PRODUCT_IMAGE_OPTIMIZE })).toEqual({
      targetMB: 0.2,
      maxWidthOrHeight: 800,
      initialQuality: 0.82,
      always: true,
    });
  });

  it('con el preset, hasta una foto chica se optimiza (always); PDF y SVG nunca', () => {
    const opt = resolveOptimizeOptions({ optimize: MENU_PRODUCT_IMAGE_OPTIMIZE });
    const smallJpeg = { type: 'image/jpeg', size: 100 * 1024 };
    expect(shouldOptimizeImage(smallJpeg, opt)).toBe(true);
    expect(shouldOptimizeImage({ type: 'application/pdf', size: 5 * 1024 * 1024 }, opt)).toBe(false);
    expect(shouldOptimizeImage({ type: 'image/svg+xml', size: 1024 }, opt)).toBe(false);
  });

  it('StoreProductsTab pasa el preset al Uploader de la foto', () => {
    const src = read('../components/store/StoreProductsTab.jsx');
    expect(src).toContain('MENU_PRODUCT_IMAGE_OPTIMIZE');
    expect(src).toContain('optimize={MENU_PRODUCT_IMAGE_OPTIMIZE}');
  });
});

describe('Hallazgo #8: búsqueda con debounce', () => {
  it('el filtro se aplica 180 ms después de la última tecla, no por tecla', () => {
    const src = read('../components/store/BusinessStore.jsx');
    expect(src).toContain('setTimeout(() => setDebouncedSearch(menuSearch), 180)');
    expect(src).toContain('const searchLower = debouncedSearch.toLowerCase().trim();');
    // El input sigue siendo inmediato (teclear se siente al instante).
    expect(src).toContain('value={menuSearch}');
    expect(src).toContain('onChange={e => setMenuSearch(e.target.value)}');
    // El botón de borrar limpia el filtro aplicado al momento.
    expect(src).toContain("setMenuSearch(''); setDebouncedSearch('');");
    // El mensaje de «sin resultados» muestra la búsqueda aplicada.
    expect(src).toContain('No se encontraron productos para "{debouncedSearch}"');
  });

  it('el scroll-spy se recrea con la búsqueda aplicada, no por tecla', () => {
    const src = read('../components/store/BusinessStore.jsx');
    expect(src).toContain('}, [activeCategories, debouncedSearch]);');
  });
});

describe('Hallazgo #8: tick de 60 s solo si cambia la franja horaria', () => {
  const TZ = 'America/Mazatlan';
  // Sábado 14 nov 2026, hora de Mazatlán.
  const at = (hhmm) => new Date(`2026-11-14T${hhmm}:00-07:00`);
  const business = { timezone: TZ, schedule: { sab: '09:00 a.m. - 10:00 p.m.' } };
  const cats = [{ id: 'c1', available_from: '08:00', available_to: '12:00' }];

  it('la firma es estable si nada cambia de estado en un minuto', () => {
    const a = menuTimeKey({ business, categories: cats, now: at('10:00'), timeZone: TZ });
    const b = menuTimeKey({ business, categories: cats, now: at('10:01'), timeZone: TZ });
    expect(a).toBe(b);
  });

  it('la firma cambia cuando una categoría sale de horario', () => {
    const a = menuTimeKey({ business, categories: cats, now: at('11:59'), timeZone: TZ });
    const b = menuTimeKey({ business, categories: cats, now: at('12:00'), timeZone: TZ });
    expect(a).not.toBe(b);
  });

  it('la firma cambia cuando el negocio cierra', () => {
    const a = menuTimeKey({ business, categories: cats, now: at('21:00'), timeZone: TZ });
    const b = menuTimeKey({ business, categories: cats, now: at('23:00'), timeZone: TZ });
    expect(a).not.toBe(b);
  });

  it('la firma cambia cada minuto solo en la última hora («Cierra pronto (30m)»)', () => {
    const a = menuTimeKey({ business, categories: cats, now: at('21:30'), timeZone: TZ });
    const b = menuTimeKey({ business, categories: cats, now: at('21:31'), timeZone: TZ });
    expect(a).toContain('Cierra pronto (30m)');
    expect(b).toContain('Cierra pronto (29m)');
    expect(a).not.toBe(b);
  });

  it('la firma no rompe sin negocio ni categorías', () => {
    expect(() => menuTimeKey({ business: null, categories: null, now: at('10:00'), timeZone: TZ })).not.toThrow();
    expect(typeof menuTimeKey({ business: null, categories: [], now: at('10:00'), timeZone: TZ })).toBe('string');
  });

  it('el intervalo compara la firma y solo llama setNow si cambia', () => {
    const src = read('../components/store/BusinessStore.jsx');
    expect(src).not.toContain('setInterval(() => setNow(new Date()), 60000)');
    expect(src).toContain('menuTimeKey({ business: b, categories: cats, now: next, timeZone: tz }) !== lastMenuTimeKeyRef.current');
    expect(src).toContain('setNow(next)');
  });
});

describe('Hallazgo #8: listas memoizadas', () => {
  it('categorías activas, filtradas y productos de promos van con useMemo', () => {
    const src = read('../components/store/BusinessStore.jsx');
    expect(src).toContain('const activeCategories = useMemo(');
    expect(src).toContain('const filteredCategories = useMemo(');
    expect(src).toContain('const promotionProducts = useMemo(');
    expect(src).toContain('activeCategories.flatMap(');
    // El JSX ya no hace el flatMap en cada render.
    expect(src).toContain('products={promotionProducts}');
    expect(src).not.toContain('products={activeCategories.flatMap(');
    // La paleta y el onSelect de promos también son estables.
    expect(src).toContain('const menuT = useMemo(');
    expect(src).toContain('const handlePromotionSelect = useCallback(');
    expect(src).toContain('onSelect={handlePromotionSelect}');
  });

  it('StorePromotions es memo: no se vuelve a pintar con cada tecla del padre', () => {
    const src = read('../components/store/StorePromotions.jsx');
    expect(src).toContain('memo(function StorePromotions');
    // Su propio tick de 15 s (vigencia de promos) sigue intacto.
    expect(src).toContain('setInterval(update,15000)');
  });
});
