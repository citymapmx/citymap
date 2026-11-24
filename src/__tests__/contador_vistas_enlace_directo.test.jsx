import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../App.jsx', import.meta.url), 'utf8');

describe('Contador: la visita por enlace directo también cuenta', () => {
  it('el resolver de deep link registra "view" al abrir la ficha desde la URL', () => {
    // La ficha abierta desde /:ciudad/:slug (Google, enlace compartido,
    // QR) se resuelve aquí: setSelected(parsedB) + navigate("detail").
    // Antes no registraba nada y el contador solo veía los toques en
    // la tarjeta: por eso Alo Andares tenía 3 clics en Search Console
    // y 0 vistas en Actividad de Negocios (23 Nov 2026).
    const openPos = src.indexOf('setSelected(parsedB)');
    expect(openPos).toBeGreaterThan(-1);
    const block = src.slice(openPos, openPos + 800);
    expect(block).toContain('navigate("detail")');
    expect(block).toContain('trackEvent(parsedB.id, "view")');
  });

  it('el toque en la tarjeta sigue registrando "view" (handleCardTap)', () => {
    const tapPos = src.indexOf('const handleCardTap');
    expect(tapPos).toBeGreaterThan(-1);
    const block = src.slice(tapPos, tapPos + 800);
    expect(block).toContain('trackEvent(b.id, "view")');
  });

  it('no hay doble conteo: el resolver corre una sola vez al arranque', () => {
    // El efecto del resolver lleva deps [] y marca deepLinkHandled, así
    // que el "view" del enlace directo no se repite al navegar dentro.
    expect(src).toContain('deepLinkHandled.current = true');
    const resolverPos = src.indexOf('setSelected(parsedB)');
    const effectEnd = src.indexOf('}, []);', resolverPos);
    expect(effectEnd).toBeGreaterThan(resolverPos);
    // Y solo hay un registro de "view" por enlace directo en todo App.jsx.
    const matches = src.match(/trackEvent\(parsedB\.id, "view"\)/g) || [];
    expect(matches).toHaveLength(1);
  });

  it('el "view" se escribe en la misma tabla que lee Actividad de Negocios', () => {
    const db = readFileSync(new URL('../services/dbService.js', import.meta.url), 'utf8');
    expect(db).toContain('sb.post("analytics"');
    expect(db).toContain('event_type: type');
    const panel = readFileSync(new URL('../components/admin/AdminActivityTab.jsx', import.meta.url), 'utf8');
    expect(panel).toContain('"view"');
    expect(panel).toContain('data.analytics');
  });
});

describe('Contador: el menú directo también cuenta', () => {
  it('MenuView registra "view" cuando se conoce el negocio', () => {
    // Quien llega directo a /:ciudad/:slug/menu (Google, QR del menú)
    // no pasaba por la ficha, así que no aparecía en el contador.
    const menu = readFileSync(new URL('../views/MenuView.jsx', import.meta.url), 'utf8');
    expect(menu).toContain('trackAnalyticsEvent');
    const pos = menu.indexOf('trackAnalyticsEvent(biz.id, "view", city)');
    expect(pos).toBeGreaterThan(-1);
    // El registro vive en un efecto que dispara al conocerse el negocio.
    const effectPos = menu.lastIndexOf('useEffect', pos);
    expect(effectPos).toBeGreaterThan(-1);
    expect(menu.slice(effectPos, pos)).toContain('biz?.id');
  });

  it('el menú no cuenta doble en el mismo montaje (ref de guardia)', () => {
    const menu = readFileSync(new URL('../views/MenuView.jsx', import.meta.url), 'utf8');
    expect(menu).toContain('menuViewTracked');
    expect(menu).toContain('useRef(false)');
  });

  it('el enlace de reservar pasa por el mismo resolver (y también cuenta)', () => {
    // /:ciudad/:slug/reservar se resuelve como el detalle normal: el
    // hook pone `b` y el resolver de App.jsx registra el "view".
    const hook = readFileSync(new URL('../hooks/useAppInitialization.js', import.meta.url), 'utf8');
    const resPos = hook.indexOf('segments[2] === "reservar"');
    expect(resPos).toBeGreaterThan(-1);
    expect(hook.slice(resPos, resPos + 600)).toContain('b = getIdFromSlug(segments[1])');
  });
});
