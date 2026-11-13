import { useRef, useMemo } from 'react';
import { getIdFromSlug } from '../lib/utils.js';
import { parseSegments, IS_WORLD } from '../lib/domain.js';
import { CATEGORY_SLUGS, isWorldCitySlug } from '../lib/seoRoutes.js';

export function useAppInitialization() {
  const initialView = useMemo(() => {
    const p = window.location.pathname;
    if (p.startsWith("/mapa")) return "map";
    if (p.startsWith("/eventos")) return "events";
    if (p.startsWith("/explorar")) return "events";
    if (p.startsWith("/mis-planes")) return "mis-planes";
    if (p.startsWith("/experiencias") || p.startsWith("/revista")) return "mis-planes";
    if (p.startsWith("/tours")) return "tours";
    if (p.startsWith("/negocios")) return "negocios";
    if (p.startsWith("/cuenta")) return "account";
    if (p.startsWith("/favoritos")) return "favs";
    if (p.startsWith("/admin_notifs")) return "admin_notifs";
    if (p.startsWith("/admin")) return "admin";
    if (p.startsWith("/lealtad")) return "lealtad";
    if (p.startsWith("/wallet")) return "wallet";
    if (p.startsWith("/scan")) return "scan";
    if (p.startsWith("/manage/")) return "owner_dashboard";
    // Removed section: keep a non-onboarding view so the router can render its 404.
    if (p.startsWith("/planes")) return "planes";
    if (p.startsWith("/precios")) return "negocios"; // /precios redirige a /negocios (la página de planes)
    if (p.startsWith("/itinerarios")) return "itineraries";
    if (p.startsWith("/itinerario/")) return "itinerary_detail_" + p.split('/')[2];
    if (p.startsWith("/plan/")) return "plan_" + p.split('/')[2];
    if (p.startsWith("/about")) return "about";
    if (p.startsWith("/privacy")) return "privacy";
    if (p.startsWith("/terms")) return "terms";
    return "onboarding";
  }, []);

  const deepLinkHandled = useRef(false);
  
  const initialParams = useRef((() => {
    const path = window.location.pathname;
    const rawSegments = path.split('/').filter(Boolean);
    // On citymap.world, strip country_code prefix (e.g. ["mx","cancun"] → ["cancun"])
    const { segments } = parseSegments(rawSegments);
    const p = new URLSearchParams(window.location.search);
    
    let b = p.get("b") || getIdFromSlug(p.get("lugar"));
    let ev = p.get("ev") || getIdFromSlug(p.get("evento"));
    let manage = p.get("manage");
    let vista = p.get("vista");
    let cat = p.get("cat");
    let planId = p.get("plan");
    let joinToken = p.get("join");
    let expSlug = null;
    let storedCity = localStorage.getItem("cg_city_slug");
    
    const SYSTEM_ROUTES = ["mapa", "admin", "mis-planes", "planes", "cuenta", "eventos", "explorar", "admin_notifs", "user_notifs", "about", "privacy", "terms", "favoritos", "explorer", "itinerarios", "revista", "experiencias", "manage", "stats", "itinerario", "plan", "evento", "precios", "lealtad", "wallet", "scan", "login", "tours", "negocios"];

    if (storedCity && (SYSTEM_ROUTES.includes(storedCity) || storedCity.includes("/"))) {
      localStorage.removeItem("cg_city_slug");
    }
    // La ciudad se deduce de la URL en cada rama (sin valor inicial: en
    // ninguna rama se lee antes de asignarse).
    let currentCity;

    if (segments.length === 2) {
      if (segments[0] === "evento") {
        // La URL ya trae el slug completo (`<ciudad>-<titulo>`, p. ej.
        // `tepic-alfredo-olivas-en-tepic`). NO anteponer la ciudad guardada:
        // si el evento es de otra ciudad, el slug quedaba corrupto
        // (`tlaquepaque-tepic-alfredo-olivas-en-tepic`), la búsqueda no lo
        // encontraba y la app caía en la lista de eventos de la ciudad
        // guardada. El slug corto sin ciudad se resuelve en App.jsx: tras
        // buscarlo tal cual, reintenta con la ciudad guardada.
        ev = getIdFromSlug(segments[1]);
      } else if (segments[0] === "mapa") {
        vista = "map";
        const cSlug = segments[1].toLowerCase();
        if (!SYSTEM_ROUTES.includes(cSlug)) {
          currentCity = cSlug;
          localStorage.setItem("cg_city_slug", currentCity);
        }
      } else if (segments[0] === "experiencias" || segments[0] === "revista") {
        vista = "mis-planes";
        const cSlug = segments[1].toLowerCase();
        if (!SYSTEM_ROUTES.includes(cSlug)) {
          currentCity = cSlug;
          localStorage.setItem("cg_city_slug", currentCity);
        }
      } else if (segments[0] === "explorar") {
        vista = "events";
        const cSlug = segments[1].toLowerCase();
        if (!SYSTEM_ROUTES.includes(cSlug)) {
          currentCity = cSlug;
          localStorage.setItem("cg_city_slug", currentCity);
        }
      } else if (segments[0] === "eventos") {
        vista = "events";
        const cSlug = segments[1].toLowerCase();
        if (!SYSTEM_ROUTES.includes(cSlug)) {
          currentCity = cSlug;
          localStorage.setItem("cg_city_slug", currentCity);
        }
      } else if (segments[0] === "plan") {
        vista = "plan_" + segments[1];
      } else if (segments[0] === "itinerario") {
        vista = "itinerary_detail_" + segments[1];
      } else if (segments[0] === "vista") {
        vista = segments[1];
      } else if (segments[0] === "manage") {
        manage = segments[1];
      } else if (SYSTEM_ROUTES.includes(segments[0].toLowerCase())) {
        vista = segments[0].toLowerCase();
      } else {
        const potentialCity = segments[0].toLowerCase();
        if (!SYSTEM_ROUTES.includes(potentialCity)) {
          currentCity = potentialCity;
          localStorage.setItem("cg_city_slug", currentCity);
          const validCats = CATEGORY_SLUGS;
          if (validCats.includes(segments[1])) {
            cat = segments[1].replace(/-/g, ' ');
          } else {
            b = getIdFromSlug(segments[1]);
            if (b && currentCity && !b.startsWith(currentCity + "-")) b = currentCity + "-" + b;
          }
        }
      }
    } else if (segments.length === 3 && segments[0] === "evento") {
      // Formato nuevo /evento/:ciudad/:slug-corto (p. ej. /evento/zapopan/zz-top):
      // la ciudad va en la URL y el slug corto se resuelve en App.jsx
      // anteponiendo la ciudad (`zapopan-zz-top`).
      const cSlug = segments[1].toLowerCase();
      if (!SYSTEM_ROUTES.includes(cSlug)) {
        currentCity = cSlug;
        localStorage.setItem("cg_city_slug", currentCity);
      }
      ev = getIdFromSlug(segments[2]);
    } else if (segments.length === 3 && segments[1] === "c") {
      const potentialCity = segments[0].toLowerCase();
      if (!SYSTEM_ROUTES.includes(potentialCity)) {
        currentCity = potentialCity;
        localStorage.setItem("cg_city_slug", currentCity);
        cat = segments[2].replace(/-/g, ' ');
      }
    } else if (segments.length === 3 && segments[2] === "menu") {
      vista = "menu_direct";
      const cSlug = segments[0].toLowerCase();
      if (!SYSTEM_ROUTES.includes(cSlug)) {
        currentCity = cSlug;
        localStorage.setItem("cg_city_slug", currentCity);
      }
    } else if (segments.length >= 3 && (segments[0] === "experiencias" || segments[0] === "revista")) {
      vista = "mis-planes";
      const cSlug = segments[1].toLowerCase();
      if (!SYSTEM_ROUTES.includes(cSlug)) {
        currentCity = cSlug;
        localStorage.setItem("cg_city_slug", currentCity);
      }
      expSlug = segments[2];
    } else if (segments.length >= 3 && segments[1] === "plan") {
      planId = segments[2];
      vista = "mis-planes";
    } else if (segments.length === 1) {
      if (SYSTEM_ROUTES.includes(segments[0])) {
        vista = segments[0];
      } else {
        const potentialCity = segments[0].toLowerCase();
        if (!SYSTEM_ROUTES.includes(potentialCity)) {
          localStorage.setItem("cg_city_slug", potentialCity);
        }
      }
    }
    
    // La ciudad por defecto (Guadalajara en .mx, París en .world) solo
    // existe en memoria: si no hay ciudad guardada ni ciudad en la URL,
    // citySlugIsDefault es true y el arranque NO debe persistirla como
    // elección del usuario (App.jsx usa setActiveCity con persist:false).
    // Si se guardara, la entrada rápida y la "Segunda entrada" leerían
    // cg_city_slug y sacarían de "/" a esa ciudad en la primera visita.
    // La redirección a la ciudad guardada solo se conserva cuando la
    // ciudad se eligió explícitamente (globo, URL o "Cerca de mí").
    // La ciudad guardada pertenece a su dominio: si el usuario guardó una
    // ciudad mexicana y abre .world (o al revés), se ignora y se usa la
    // ciudad por defecto de este dominio. No se borra el dato: al volver
    // al otro dominio se vuelve a usar. Se relee de localStorage (no se
    // usa `storedCity` de arriba): las ramas de la URL ya pudieron
    // guardar otra ciudad en este mismo arranque.
    const savedCity = localStorage.getItem("cg_city_slug");
    const savedCityIsHere = savedCity
      ? (IS_WORLD ? isWorldCitySlug(savedCity) : !isWorldCitySlug(savedCity))
      : false;
    const resolvedCity = savedCityIsHere ? savedCity : null;
    const defaultCity = IS_WORLD ? "paris" : "guadalajara";
    return { b, ev, vista, cat, manage, planId, joinToken, expSlug, citySlug: resolvedCity || defaultCity, citySlugIsDefault: !resolvedCity };
  })());

  const initialBizParam = useRef(initialParams.current.b);
  const initialEvParam = useRef(initialParams.current.ev);
  const initialVistaParam = useRef(initialParams.current.vista);
  const initialManageParam = useRef(initialParams.current.manage);
  const initialPlanParam = useRef(initialParams.current.planId);
  const initialJoinParam = useRef(initialParams.current.joinToken);
  const initialCatParam = useRef(initialParams.current.cat);
  const initialExpSlugParam = useRef(initialParams.current.expSlug);

  return {
    initialView,
    deepLinkHandled,
    initialParams,
    initialBizParam,
    initialEvParam,
    initialVistaParam,
    initialManageParam,
    initialPlanParam,
    initialJoinParam,
    initialCatParam,
    initialExpSlugParam
  };
}
