// Página de «evento no disponible» (25 nov 2026, Jonathan): un enlace a un
// evento que ya no existe (borrado o slug erróneo) abría la lista de eventos
// en silencio, sin ningún mensaje (verificado en vivo 25 nov 22:47 con un
// slug inventado). Ahora abre una página con el aviso y los próximos
// eventos de la ciudad debajo, igual que la de «ya terminó».
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p) => readFileSync(join(process.cwd(), p), "utf8");

describe("useUIStore: estado del evento no encontrado", () => {
  const src = read("src/store/useUIStore.js");

  it("guarda el slug y la ciudad del enlace roto", () => {
    expect(src).toContain("eventNotFound: null,");
    expect(src).toContain("setEventNotFound: (val) => set(s => ({ eventNotFound:");
  });
});

describe("App.jsx: el resolver ya no redirige en silencio a la lista", () => {
  const src = read("src/App.jsx");

  it("cuando el evento no existe, abre la página de no disponible", () => {
    expect(src).toContain("setEventNotFound({ slug: urlEv, city: initialParams.current.citySlug || '' });");
    expect(src).not.toContain('} else navigate("events");');
  });

  it("un error de red sigue cayendo en la lista (no es un «no existe»)", () => {
    expect(src).toContain('} catch { navigate("events"); }');
  });

  it("la página se monta solo cuando hay un enlace roto, como el detalle", () => {
    expect(src).toContain('const EventNotFound = lazy(() => import("./components/modals/EventNotFound.jsx"));');
    expect(src).toContain("{eventNotFound && <EventNotFound />}");
  });

  it("al salir de una ficha de evento también se limpia el no disponible", () => {
    expect(src).toContain("setSelectedEvent(null);\n          setEventNotFound(null);");
    expect(src).toContain("setSelectedEvent(null);\n      setEventNotFound(null);\n      setMapPin(null);");
  });
});

describe("EventNotFound: aviso y próximos eventos", () => {
  const src = read("src/components/modals/EventNotFound.jsx");

  it("muestra el aviso de no disponible con el texto del enlace roto", () => {
    expect(src).toContain('t("eventos_no_disponible", "Este evento ya no está disponible")');
    expect(src).toContain('t("eventos_no_disponible_texto", "Es posible que se haya eliminado o que el enlace esté incompleto.")');
  });

  it("lista los próximos eventos de la ciudad con el mismo helper del modal", () => {
    expect(src).toContain("upcomingEvents(Array.isArray(rows) ? rows : [], { city_slug: effCity || 'all' }, todayLocal, 4)");
    expect(src).toContain('t("eventos_proximos", "Próximos eventos")');
    expect(src).toContain('t("eventos_ver_todos", "Ver todos los eventos")');
  });

  it("la ciudad se deduce del prefijo del slug cuando el enlace es viejo", () => {
    expect(src).toContain("cities.find(c => c && slug.startsWith(`${c.slug}-`))?.slug");
  });

  it("abrir un evento de la lista limpia el aviso y abre su ficha", () => {
    expect(src).toContain("setEventNotFound(null);\n    setSelectedEvent(u);");
    expect(src).toContain("routerNavigate(eventUrl(u), { replace: true });");
  });

  it("el botón de volver lleva a la lista de eventos de la ciudad", () => {
    expect(src).toContain("routerNavigate(effCity ? `/eventos/${effCity}` : '/eventos', { replace: true });");
  });
});
