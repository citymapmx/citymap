import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { cleanCityPrefix, createSlug } from '../lib/utils.js';

export function useAppInit({
  sb, 
  user, 
  setUser, 
  profile, 
  setProfile, 
  loadFavs, 
  loadMyBiz, 
  loadData, 
  activeCity, 
  view, 
  navigate, 
  routerNavigate,
  initialManageParam, 
  initialBizParam, 
  initialEvParam, 
  initialJoinParam, 
  initialPlanParam, 
  initialVistaParam, 
  initialCatParam, 
  setActiveCat, 
  setSelected, 
  setSelectedEvent, 
  setAuthChecked, 
  deepLinkHandled,
  setOwnerView
}) {
  useEffect(() => {
    (async () => {
      // Limpieza de caché por versión
      const APP_VERSION = "1.1.0"; 
      if (localStorage.getItem("cg_app_version") !== APP_VERSION) {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith("cg_data_") || key.startsWith("cg_mapPins_")) {
            localStorage.removeItem(key);
          }
        });
        localStorage.setItem("cg_app_version", APP_VERSION);
        console.log("Caché limpiado por actualización de versión.");
      }

      // Parsear token de Google OAuth si viene en la URL
      sb.parseOAuthHash();
      
      // Cargar sesión y datos en paralelo
      const startTime = Date.now();
      
      const [u] = await Promise.all([
        sb.getUser(),
        (async () => {
          if (localStorage.getItem("cg_city_slug")) {
            await loadData();
          } else {
            await loadData("tepic"); // Fallback temporal antes de que el GPS decida
          }
        })()
      ]);
      
      // Asegurar que el logo dure como mínimo 600ms para evitar parpadeos
      const elapsed = Date.now() - startTime;
      if (elapsed < 600) {
        await new Promise(r => setTimeout(r, 600 - elapsed));
      }
      
      if (u?.id) {
        setUser(u);
        const profs = await sb.get("profiles", `?id=eq.${u.id}`).catch(() => []);
        let myProf = profs[0] || null;
        
        if (myProf && (!myProf.name || !myProf.avatar_url) && u.user_metadata) {
          const mName = u.user_metadata.full_name || u.user_metadata.name;
          const mAv = u.user_metadata.avatar_url || u.user_metadata.picture;
          if ((!myProf.name && mName) || (!myProf.avatar_url && mAv)) {
            const updates = {};
            if (!myProf.name && mName) updates.name = mName;
            if (!myProf.avatar_url && mAv) updates.avatar_url = mAv;
            const savedCity = localStorage.getItem("cg_city_slug");
            if (!myProf.city && savedCity) updates.city = savedCity;
            
            if (Object.keys(updates).length > 0) {
              await sb.patch("profiles", u.id, updates).catch(()=>{});
              myProf = { ...myProf, ...updates };
            }
          }
        }
        
        setProfile(myProf);
        await loadFavs(u.id);
        const myBizLoaded = await loadMyBiz(u.id);

        if (Capacitor.isNativePlatform()) {
          try {
            PushNotifications.register(); 
          } catch (_) {}
        }

        if (initialManageParam.current) {
          const mBiz = myBizLoaded.find(b => b.id === initialManageParam.current);
          if (mBiz) {
            setOwnerView(mBiz);
            navigate("account");
          }
          initialManageParam.current = null;
        }
      }

      // Abrir negocio directo si la URL tiene ?b=
      const urlB = initialBizParam.current;
      const urlEv = initialEvParam.current;
      
      if (urlB) {
        try {
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(urlB);
          const q = isUUID ? `?id=eq.${urlB}` : `?slug=eq.${urlB}`;
          let r = await sb.get("businesses", `${q}&status=eq.approved`);
          if (!r?.[0] && !isUUID) {
            const searchName = urlB.split("-").join("%25");
            r = await sb.get("businesses", `?name=ilike.*${searchName}*&status=eq.approved`);
          }
          if (r?.[0]) { 
            const parseJSON = (val) => {
              if (typeof val === 'string') {
                try { return JSON.parse(val); } catch(e) { return {}; }
              }
              return val || {};
            };
            const parsedB = {
              ...r[0],
              schedule: parseJSON(r[0].schedule),
              social_links: parseJSON(r[0].social_links),
              booking_config: parseJSON(r[0].booking_config),
              blocked_slots: parseJSON(r[0].blocked_slots),
              photos: parseJSON(r[0].photos)
            };
            setSelected(parsedB); 
            navigate("detail"); 
          }
          else navigate("home");
        } catch { navigate("home"); }
      } else if (urlEv) {
        try {
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(urlEv);
          let r = await sb.get("events", isUUID ? `?id=eq.${urlEv}` : `?slug=eq.${urlEv}`);
          if (!r?.[0] && !isUUID) {
            const searchName = urlEv.split("-").join("%25");
            r = await sb.get("events", `?title=ilike.*${searchName}*&status=eq.approved`);
          }
          if (r?.[0]) setSelectedEvent(r[0]);
          navigate("home");
        } catch { navigate("home"); }
      } else if (initialJoinParam.current) {
        navigate("plans");
      } else if (initialPlanParam.current) {
        navigate("mis-planes");
      } else if (initialVistaParam.current) {
        const v = initialVistaParam.current;
        if (v === "eventos") navigate("events");
        else if (v === "mapa") navigate("map");
        else if (v === "admin_notifs") navigate("admin_notifs");
        else if (v === "user_notifs") navigate("user_notifs");
        else if (v === "about") navigate("about");
        else if (v === "privacy") navigate("privacy");
        else if (v === "terms") navigate("terms");
        else if (v === "admin") navigate("admin");
        else if (v === "cuenta") navigate("account");
        else if (v === "favoritos") navigate("favs");
        else if (v === "planes") navigate("plans");
        else if (v === "mis-planes") navigate("mis-planes");
        else navigate("home");
      } else if (initialCatParam.current) {
        setActiveCat(initialCatParam.current);
        navigate("home");
      } else {
        navigate("home");
      }
      setAuthChecked(true);
      deepLinkHandled.current = true;
    })();
  }, []);
}
