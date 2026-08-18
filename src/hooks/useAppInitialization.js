import { useRef, useMemo } from 'react';
import { getIdFromSlug } from '../lib/utils.js';
import { parseSegments } from '../lib/domain.js';

export function useAppInitialization() {
  const initialView = useMemo(() => {
    const p = window.location.pathname;
    if (p.startsWith("/mapa")) return "map";
    if (p.startsWith("/eventos")) return "events";
    if (p.startsWith("/mis-planes")) return "mis-planes";
    if (p.startsWith("/experiencias")) return "mis-planes";
    if (p.startsWith("/cuenta")) return "account";
    if (p.startsWith("/admin_notifs")) return "admin_notifs";
    if (p.startsWith("/admin")) return "admin";
    if (p.startsWith("/manage/")) return "owner_dashboard";
    if (p.startsWith("/planes")) return "plans";
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
    
    if (storedCity && (["favoritos", "itinerarios", "experiencias", "manage", "itinerario", "plan"].includes(storedCity) || storedCity.includes("/"))) {
      localStorage.removeItem("cg_city_slug");
      storedCity = "";
    }
    let currentCity = storedCity || "";

    if (segments.length === 2) {
      if (segments[0] === "evento") {
        ev = getIdFromSlug(segments[1]);
        const isUUID = ev && ev.length === 36 && ev.split('-').length === 5;
        if (!isUUID && ev && currentCity && !ev.startsWith(currentCity + "-")) ev = currentCity + "-" + ev;
      } else if (segments[0] === "mapa") {
        vista = "map";
        currentCity = segments[1].toLowerCase();
        localStorage.setItem("cg_city_slug", currentCity);
      } else if (segments[0] === "experiencias") {
        vista = "mis-planes";
        currentCity = segments[1].toLowerCase();
        localStorage.setItem("cg_city_slug", currentCity);
      } else if (segments[0] === "plan") {
        vista = "plan_" + segments[1];
      } else if (segments[0] === "itinerario") {
        vista = "itinerary_detail_" + segments[1];
      } else if (segments[0] === "vista") {
        vista = segments[1];
      } else if (segments[0] === "manage") {
        manage = segments[1];
      } else {
        currentCity = segments[0].toLowerCase();
        localStorage.setItem("cg_city_slug", currentCity);
        const validCats = ["restaurantes", "cafe", "salud", "belleza", "fitness", "compras", "tech", "ocio", "hoteles", "educacion", "antros-y-bares", "servicios", "mascotas"];
        if (validCats.includes(segments[1])) {
          cat = segments[1].replace(/-/g, ' ');
        } else {
          b = getIdFromSlug(segments[1]);
          if (b && currentCity && !b.startsWith(currentCity + "-")) b = currentCity + "-" + b;
        }
      }
    } else if (segments.length === 3 && segments[2] === "menu") {
      vista = "menu_direct";
      currentCity = segments[0].toLowerCase();
      localStorage.setItem("cg_city_slug", currentCity);
    } else if (segments.length >= 3 && segments[0] === "experiencias") {
      vista = "mis-planes";
      currentCity = segments[1].toLowerCase();
      localStorage.setItem("cg_city_slug", currentCity);
      expSlug = segments[2];
    } else if (segments.length >= 3 && segments[1] === "plan") {
      planId = segments[2];
      vista = "mis-planes";
    } else if (segments.length === 1) {
      if (["mapa", "admin", "mis-planes", "planes", "cuenta", "eventos", "admin_notifs", "user_notifs", "about", "privacy", "terms", "favoritos", "itinerarios", "experiencias", "manage", "itinerario", "plan"].includes(segments[0])) {
        vista = segments[0];
      } else {
        localStorage.setItem("cg_city_slug", segments[0].toLowerCase());
      }
    }
    
    return { b, ev, vista, cat, manage, planId, joinToken, expSlug, citySlug: localStorage.getItem("cg_city_slug") };
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
