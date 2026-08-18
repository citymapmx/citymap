import { useState, useRef, useEffect, useCallback, lazy as reactLazy, Suspense, useMemo } from "react";
const lazy = (importer) => reactLazy(async () => {
  try {
    const component = await importer();
    // Clear guards on successful load so next deploy can auto-reload again
    sessionStorage.removeItem('chunk_load_retry');
    sessionStorage.removeItem('chunk_reload_guard');
    return component;
  } catch (error) {
    const errStr = String(error?.message || error || '');
    const isChunkError = error.name === 'ChunkLoadError' || errStr.includes('fetch') || errStr.includes('dynamically imported') || errStr.includes('MIME type') || errStr.includes('text/html') || errStr.includes('Load failed') || errStr.includes('module');
    if (!sessionStorage.getItem('chunk_load_retry') && isChunkError) {
      sessionStorage.setItem('chunk_load_retry', 'true');
      sessionStorage.setItem('chunk_reload_guard', '1');
      if ('serviceWorker' in navigator) {
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (let reg of regs) await reg.unregister();
        } catch (e) {}
      }
      window.location.reload(true);
      return new Promise(() => {}); // Wait for reload
    }
    throw error;
  }
});
import { m, AnimatePresence } from "framer-motion";
import './App.css';
import { sb, cloudUpload, cloudUploadPDF, SUPABASE_URL, SUPABASE_ANON, CLOUDINARY_CLOUD, CLOUDINARY_PRESET, GMAPS_KEY } from './lib/supabase.js';
import * as dbService from './services/dbService.js';

import ItineraryModal from './components/modals/ItineraryModal.jsx';
import { useAuthStore } from "./store/useAuthStore.js";
import { useShallow } from 'zustand/react/shallow';
import { useDataStore } from './store/useDataStore.js';
import { useUIStore } from './store/useUIStore.js';
import { useGeolocation } from './hooks/useGeolocation.js';
import { useFavorites } from './hooks/useFavorites.js';
import { Routes, Route, useLocation, useNavigate, matchPath } from 'react-router-dom';
import { PLAN_META, CITY_TZ, FONT_BIZ, EVENT_CATS, getT, CATS_DEFAULT } from './lib/constants.js';
import { fuzzyMatch } from './lib/utils.js';
import { IS_WORLD, buildCityPath, buildBizUrl } from './lib/domain.js';
import Icon from './components/ui/Icon.jsx';
import StarRow from './components/ui/StarRow.jsx';
import { Sk, CardSk } from './components/ui/Skeleton.jsx';

import { getEventStatus, CAT_EMOJI, isOpenNow, createSlug, parseMenuUrls, cleanCityPrefix, isNear } from './lib/utils.js';
const ClaimModal = lazy(() => import('./components/ClaimModal.jsx'));
const PlansPage = lazy(() => import('./components/PlansPage.jsx'));
const Uploader = lazy(() => import('./components/Uploader.jsx'));
const AddBizModal = lazy(() => import('./components/AddBizModal.jsx'));
const AccountView = lazy(() => import('./components/AccountView.jsx'));
const Gallery = lazy(() => import('./components/Gallery.jsx'));
const Privacy = lazy(() => import('./Privacy.jsx'));
const Terms = lazy(() => import('./components/Terms.jsx'));
const About = lazy(() => import('./components/About.jsx'));
const AdminNotifs = lazy(() => import('./components/AdminNotifs.jsx'));
const UserNotifs = lazy(() => import('./components/UserNotifs.jsx'));
const TripsView = lazy(() => import('./components/TripsView.jsx'));
const GMap = lazy(() => import('./components/GMap.jsx'));
const MapPicker = lazy(() => import('./components/map/MapPicker.jsx'));
const AdminPanel = lazy(() => import("./components/AdminPanel.jsx"));
const OwnerDashboardView = lazy(() => import("./views/OwnerDashboardView.jsx"));
const StoreAdminPanel = lazy(() => import("./components/store/StoreAdminPanel.jsx"));
const OnboardingModal = lazy(() => import('./components/modals/OnboardingModal.jsx'));

const stardustParticles = [...Array(30)].map((_, i) => ({
  size: Math.random() * 2 + 1.5,
  left: Math.random() * 100,
  animDuration: Math.random() * 8 + 12,
  delay: Math.random() * 20
}));

const FloatingParticles = ({ dark }) => {
  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
      <style>{`
        @keyframes stardustFloat {
          0% { transform: translateY(10vh) scale(0.5); opacity: 0; }
          10% { opacity: 0.9; }
          90% { opacity: 0.9; }
          100% { transform: translateY(-120vh) scale(1.2); opacity: 0; }
        }
        .stardust {
          position: absolute;
          background: ${dark ? "rgba(255, 255, 255, 0.8)" : "rgba(0, 0, 0, 0.25)"};
          border-radius: 50%;
          filter: blur(0.5px);
          bottom: 0;
          box-shadow: ${dark ? "0 0 6px rgba(255,255,255,0.6)" : "none"};
        }
      `}</style>
      {stardustParticles.map((p, i) => (
        <div
          key={i}
          className="stardust"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.left}%`,
            animation: `stardustFloat ${p.animDuration}s linear infinite`,
            animationDelay: `-${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
};
import { SplashScreen, PageLogo } from "./components/Brand.jsx";
import CountryPickerDropdown from "./components/CountryPickerDropdown.jsx";
import CosmicBackground from "./components/ui/CosmicBackground.jsx";

const LoaderFallback = () => <div style={{position:"fixed",inset:0,background:"#F7F8F6",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:30,height:30,border:"3px solid #E4E8E4",borderTop:"3px solid #000000",borderRadius:"50%",animation:"spin .8s linear infinite"}}/></div>;
const PAGE_LOAD_SEED = Math.random();


// Clean base URL — strips any accidental /rest/v1 suffix


import FeaturedCard from "./components/cards/FeaturedCard.jsx";
import CompactCard from "./components/cards/CompactCard.jsx";
import DestacadoCard from "./components/cards/DestacadoCard.jsx";

import { AppContext } from "./context/AppContext.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
const HomeView = lazy(() => import("./views/HomeView.jsx"));
const DetailView = lazy(() => import("./views/DetailView.jsx"));
const MapView = lazy(() => import("./views/MapView.jsx"));
const FavsView = lazy(() => import("./views/FavsView.jsx"));
const EventsView = lazy(() => import("./views/EventsView.jsx"));
const ReservationsAgenda = lazy(() => import("./components/ReservationsAgenda.jsx"));
const CreateEventModal = lazy(() => import("./components/modals/CreateEventModal.jsx"));
const EventDetailModal = lazy(() => import("./components/modals/EventDetailModal.jsx"));
const ScheduleModal = lazy(() => import("./components/modals/ScheduleModal.jsx"));

import AutoSlider from './components/ui/sliders/AutoSlider.jsx';
import AutoFadeBillboard from './components/ui/sliders/AutoFadeBillboard.jsx';
import FeaturedCarousel from './components/ui/sliders/FeaturedCarousel.jsx';
import AppRouter from './router/AppRouter.jsx';
import SideMenu from './components/SideMenu.jsx';


import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { useCapacitorHardwareBack } from './hooks/useCapacitorHardwareBack.js';
import { usePushNotifications } from './hooks/usePushNotifications.js';
import { useInAppNotifications } from './hooks/useInAppNotifications.js';
import { useAppSEO } from './hooks/useAppSEO.js';
import { useAppInitialization } from './hooks/useAppInitialization.js';
export default function CityGuide() {
  const location = useLocation();
  const routerNavigate = useNavigate();
  const [backgroundLocation, setBackgroundLocation] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 80);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Data
  const data = useDataStore(useShallow(s => ({
    events: s.events, setEvents: s.setEvents, promos: s.promos, setPromos: s.setPromos, coupons: s.coupons, setCoupons: s.setCoupons, banners: s.banners, setBanners: s.setBanners,
    reviews: s.reviews, setReviews: s.setReviews, cats: s.cats, setCats: s.setCats, cityCats: s.cityCats, cities: s.cities, setCities: s.setCities, wallet: s.wallet, setWallet: s.setWallet, claimedCoupons: s.claimedCoupons,
    dbReady: s.dbReady, setDbReady: s.setDbReady, dbError: s.dbError, setDbError: s.setDbError, mapPins: s.mapPins, setMapPins: s.setMapPins, myBizList: s.myBizList, setMyBizList: s.setMyBizList,
    globalFavCounts: s.globalFavCounts, setGlobalFavCounts: s.setGlobalFavCounts, loadData: s.loadData, loadMapPins: s.loadMapPins, loadMyBiz: s.loadMyBiz
  })));
  const {
    events, setEvents, promos, setPromos, coupons, setCoupons, banners, setBanners,
    reviews, setReviews, cats, setCats, cityCats, cities, setCities, wallet, setWallet, claimedCoupons,
    dbReady, setDbReady, dbError, setDbError, mapPins, setMapPins, myBizList, setMyBizList,
    globalFavCounts, setGlobalFavCounts, loadData, loadMapPins, loadMyBiz
  } = data;

  // Auth
  const { user, setUser, authChecked, setAuthChecked, profile, setProfile, showAuth, setShowAuth, authMode, setAuthMode, authForm, setAuthForm, authLoading, authErr, setAuthErr, handleAuth, handleSignOut } = useAuthStore(useShallow(s => ({ user: s.user, setUser: s.setUser, authChecked: s.authChecked, setAuthChecked: s.setAuthChecked, profile: s.profile, setProfile: s.setProfile, showAuth: s.showAuth, setShowAuth: s.setShowAuth, authMode: s.authMode, setAuthMode: s.setAuthMode, authForm: s.authForm, setAuthForm: s.setAuthForm, authLoading: s.authLoading, authErr: s.authErr, setAuthErr: s.setAuthErr, handleAuth: s.handleAuth, handleSignOut: s.handleSignOut })));
  // UI & Initialization
  const {
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
  } = useAppInitialization();
  const { activeCat, setActiveCat, selected, setSelected, mapPin, setMapPin, showAdmin, setShowAdmin, showPlans, setShowPlans, claimBiz, setClaimBiz, showAddBiz, setShowAddBiz, showGallery, setShowGallery, showMenuGallery, setShowMenuGallery, showSchedule, setShowSchedule, showLocPicker, setShowLocPicker, selectedEvent, setSelectedEvent, activeCity, setActiveCity, showCountryPicker, setShowCountryPicker, dark, setDark, toast, toast$, setInstallPromptEvent, ownerView, setOwnerView } = useUIStore(useShallow(s => ({ activeCat: s.activeCat, setActiveCat: s.setActiveCat, selected: s.selected, setSelected: s.setSelected, mapPin: s.mapPin, setMapPin: s.setMapPin, showAdmin: s.showAdmin, setShowAdmin: s.setShowAdmin, showPlans: s.showPlans, setShowPlans: s.setShowPlans, claimBiz: s.claimBiz, setClaimBiz: s.setClaimBiz, showAddBiz: s.showAddBiz, setShowAddBiz: s.setShowAddBiz, showGallery: s.showGallery, setShowGallery: s.setShowGallery, showMenuGallery: s.showMenuGallery, setShowMenuGallery: s.setShowMenuGallery, showSchedule: s.showSchedule, setShowSchedule: s.setShowSchedule, showLocPicker: s.showLocPicker, setShowLocPicker: s.setShowLocPicker, selectedEvent: s.selectedEvent, setSelectedEvent: s.setSelectedEvent, activeCity: s.activeCity, setActiveCity: s.setActiveCity, showCountryPicker: s.showCountryPicker, setShowCountryPicker: s.setShowCountryPicker, dark: s.dark, setDark: s.setDark, toast: s.toast, toast$: s.toast$, setInstallPromptEvent: s.setInstallPromptEvent, ownerView: s.ownerView, setOwnerView: s.setOwnerView })));
  
  // --- NATIVE BACK BUTTON & DEEP LINKS (Capacitor) ---
  useCapacitorHardwareBack();

  // Track view changes logic removed as it's now handled by react-router history
  // ------------------------------------

  // --- NOTIFICATIONS ---
  usePushNotifications();
  useInAppNotifications();


  useEffect(() => {
    if (initialParams.current.citySlug && initialParams.current.citySlug !== activeCity) {
      setActiveCity(initialParams.current.citySlug);
      loadData(initialParams.current.citySlug);
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPromptEvent(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);
  const [showMoreTopRated, setShowMoreTopRated] = useState(false);
  const [showMoreTopFavs, setShowMoreTopFavs] = useState(false);

  const [reviewText, setReviewText] = useState("");
  const [reviewStar, setReviewStar] = useState(5);
  const [showReview, setShowReview] = useState(false);
  const [reviewImgFile, setReviewImgFile] = useState(null);
  const [reviewImgLoading, setReviewImgLoading] = useState(false);


  const [storeAdminBiz, setStoreAdminBiz] = useState(null);
  const [adminStoreBiz, setAdminStoreBiz] = useState(null);
  const [showCreateEvent, setShowCreateEvent] = useState(false);

  const [savedEventIds, setSavedEventIds] = useState(() => { try { return JSON.parse(localStorage.getItem("cg_saved_ev") || "[]"); } catch { return []; } });
  const [savedExpIds, setSavedExpIds] = useState(() => { try { return JSON.parse(localStorage.getItem("cg_saved_exp") || "[]"); } catch { return []; } });
  const [addBizForm, setAddBizForm] = useState({ name: "", category: "", emoji: "", description: "", address: "", phone: "", whatsapp: "", website: "", video_url: "", lat: "", lng: "", photos: [], facebook: "", instagram: "", tiktok: "", schedule: {} });
  const [editBizId, setEditBizId] = useState(null);
  
  const [activeTab, setActiveTab] = useState("descubrir");
  const [search, setSearch] = useState("");

  const [mapQ, setMapQ] = useState("");
  const [nearbyRadius, setNearbyRadius] = useState(1);
  const [nearbyFilter, setNearbyFilter] = useState("all"); // "all" | "open"
  const [fade, setFade] = useState(true);
  const [resolvingDeepLink, setResolvingDeepLink] = useState(!!initialParams.current.b || !!initialParams.current.ev);
  const [navbarVisible, setNavbarVisible] = useState(true);
  const [requireCitySelection, setRequireCitySelection] = useState(() => !initialParams.current.citySlug);
  const [hasOnboarded, setHasOnboarded] = useState(() => localStorage.getItem('citymap_onboarded') === 'true');
  const lastScrollY = useRef(0);
  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY < 10) { setNavbarVisible(true); }
      else if (currentY > lastScrollY.current + 8) { setNavbarVisible(false); }
      else if (currentY < lastScrollY.current - 8) { setNavbarVisible(true); }
      lastScrollY.current = currentY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  
  const { city, setCity, locating, setLocating, userCoords, setUserCoords, detectedTown, setDetectedTown, detectedState, setDetectedState, getKm, detectCity, handleCitySelect } = useGeolocation({ cities, mapPins, toast$, setActiveCity: (s) => { setActiveCity(s); loadData(s); const isOnHomePath = location.pathname === "/" || location.pathname === `/${activeCity}` || location.pathname === `/${s}`; if (isOnHomePath || requireCitySelection) { routerNavigate(`/${s}`, { replace: true }); } } });
  const { favIds, setFavIds, collections, setCollections, movingBiz, setMovingBiz, activeCollection, setActiveCollection, newColModal, setNewColModal, newColForm, setNewColForm, loadFavs, toggleFav, createCollection, updateCollection, deleteCollection } = useFavorites({ sb, user, setShowAuth });
  
  useEffect(() => {
    if (dbError) {
      toast$("Problema de conexión o base de datos. Mostrando info guardada.");
    }
  }, [dbError, toast$]);

  useEffect(() => {
    if (!dbReady) return;
    const valid = wallet.filter(wId => {
      const cp = coupons.find(c => c.id === wId);
      if (!cp) return false;
      if (cp.expires_at) {
        const expDate = new Date(cp.expires_at);
        expDate.setHours(23, 59, 59, 999);
        if (expDate < new Date()) return false;
      }
      return true;
    });
    if (valid.length !== wallet.length) {
      setWallet(valid);
      localStorage.setItem("citymap_wallet", JSON.stringify(valid));
    }
  }, [coupons, dbReady]);

  const T = getT(dark);
  const cityImg = cities.find(c => c.slug === activeCity)?.bg_image || null;
  const rawTz = cities.find(c => c.slug === activeCity)?.timezone || CITY_TZ[activeCity] || "America/Mexico_City";
  const cityTz = rawTz.includes(";") ? rawTz.split(";")[0] : rawTz;
  if (typeof window !== "undefined") {
    window.CITY_TZ = cityTz;
  }
  const isOpen = useCallback(b => isOpenNow(b, cityTz), [cityTz]);



  const loadReviews = useCallback(async bizId => { if (!bizId) return; try { const r = await dbService.getBusinessReviews(bizId); setReviews(Array.isArray(r) ? r : []); } catch { setReviews([]); }; }, []);
  const loadExperienceReviews = useCallback(async expId => { if (!expId) return; try { const r = await dbService.getExperienceReviews(expId); setReviews(Array.isArray(r) ? r : []); } catch { setReviews([]); }; }, []);


  // Track analytics
  const trackEvent = useCallback(async (bizId, type) => {
      try { await dbService.trackAnalyticsEvent(bizId, type, activeCity); } catch { }
  }, [activeCity]);

useEffect(() => {
    (async () => {
      // Limpieza de caché por versión (Punto 9)
      const APP_VERSION = "1.1.0"; // Actualizar esta versión cuando cambien las estructuras de datos
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
            await loadData(); // Fallback temporal antes de que el GPS decida
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
        const profs = await dbService.getUserProfile(u.id);
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
              await dbService.updateUserProfile(u.id, updates);
              myProf = { ...myProf, ...updates };
            }
          }
        }
        
        setProfile(myProf);
        await loadFavs(u.id);
        const myBizLoaded = await loadMyBiz(u.id);
        
        const myItin = await dbService.getUserItineraries(u.id);
        useDataStore.getState().setMyItineraries(myItin);

        // Asociar token de push al usuario recién autenticado
        if (Capacitor.isNativePlatform()) {
          try {
            PushNotifications.register(); // Intentar registrar para obtener uno nuevo si es necesario
            
            // Si ya teníamos uno guardado, enviarlo manualmente para garantizar la sincronización
            const localToken = localStorage.getItem('cg_push_token');
            if (localToken) {
              fetch(`https://citymap.mx/api/register-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  token: localToken, 
                  user_id: u.id,
                  city_slug: useUIStore.getState().activeCity // Guardamos la ciudad actual del usuario
                })
              }).catch(e => console.error("Manual token sync error:", e));
            }
          } catch (_) {}
        }

        if (initialManageParam.current) {
          const manageKey = initialManageParam.current;
          const mBiz = myBizLoaded.find(b => b.id === manageKey || b.slug === manageKey || (b.slug && b.slug.endsWith('-' + manageKey)));
          if (mBiz) {
            setOwnerView(mBiz);
            navigate("manage/" + (mBiz.slug || mBiz.id));
            initialManageParam.current = null;
            setAuthChecked(true);
            deepLinkHandled.current = true;
            return;
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
          let r = await dbService.getBusinesses(`${q}&status=eq.approved`);
          if (!r?.[0] && !isUUID) {
            const searchName = urlB.split("-").join("%25");
            r = await dbService.getBusinesses(`?name=ilike.*${searchName}*&status=eq.approved`);
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
        finally { setResolvingDeepLink(false); }
      } else if (urlEv) {
        try {
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(urlEv);
          let r = await dbService.getEvents(isUUID ? `?id=eq.${urlEv}` : `?slug=eq.${urlEv}`);
          if (!r?.[0] && !isUUID) {
            const searchName = urlEv.split("-").join("%25");
            r = await dbService.getEvents(`?title=ilike.*${searchName}*&status=eq.approved`);
          }
          if (r?.[0]) setSelectedEvent(r[0]);
          navigate("home");
        } catch { navigate("home"); }
        finally { setResolvingDeepLink(false); }
      } else if (initialJoinParam.current) {
        navigate("plans");
      } else if (initialPlanParam.current) {
        navigate("mis-planes");
      } else if (initialExpSlugParam.current) {
        useUIStore.setState({ selectedExpSlug: initialExpSlugParam.current });
        navigate("mis-planes");
      } else if (initialVistaParam.current) {
        const v = initialVistaParam.current;
        if (v.startsWith("plan_") || v.startsWith("itinerary_detail_")) navigate(v);
        else if (v === "eventos") navigate("events");
        else if (v === "mapa" || v === "map") navigate("map");
        else if (v === "admin_notifs") navigate("admin_notifs");
        else if (v === "user_notifs") navigate("user_notifs");
        else if (v === "about") navigate("about");
        else if (v === "privacy") navigate("privacy");
        else if (v === "terms") navigate("terms");
        else if (v === "admin") navigate("admin");
        else if (v === "owner_dashboard") navigate("owner_dashboard");
        else if (v === "cuenta") navigate("account");
        else if (v === "favoritos") navigate("favs");
        else if (v === "planes") navigate("plans");
        else if (v === "mis-planes" || v === "experiencias") navigate("mis-planes");
        else if (v === "itinerarios") navigate("itineraries");
        else if (v === "menu_direct") { /* DO NOTHING, let AppRouter handle it */ }
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

  useEffect(() => { localStorage.setItem("cg_dark", dark); }, [dark]);

  // SEO meta & JSON-LD structured data update
  useAppSEO({ city });

  // ── HISTORY API & NAVIGATION ──────────────────────────────────────────────
  const navigate = v => { 
    const city = activeCity || "";
    const cityPrefix = buildCityPath(city, cities); // e.g. "/cancun" or "/mx/cancun"
    let path = cityPrefix;
    if (v === "map" || v === "mapa") path = city ? `/mapa/${city}` : "/mapa";
    else if (v === "events" || v === "eventos") path = "/eventos";
    else if (v === "mis-planes") path = city ? `/experiencias/${city}` : "/mis-planes";
    else if (v === "admin") path = "/admin";
    else if (v === "plans" || v === "planes") path = "/planes";
    else if (v === "account" || v === "cuenta") path = "/cuenta";
    else if (v === "favs") path = "/favoritos";
    else if (v === "about") path = "/about";
    else if (v === "privacy") path = "/privacy";
    else if (v === "terms") path = "/terms";
    else if (v === "admin_notifs") path = "/admin_notifs";
    else if (v === "user_notifs") path = "/user_notifs";
    else if (v === "itineraries") path = "/itinerarios";
    else if (v.startsWith("itinerary_detail_")) path = `/itinerario/${v.replace("itinerary_detail_", "")}`;
    else if (v.startsWith("plan_")) path = `/plan/${v.replace("plan_", "")}`;
    else if (v.startsWith("manage/")) path = `/${v}`;
    else if (v.startsWith("/")) path = v;
    else if (v === "home") {
      if (location.state?.background) {
        setSelected(null);
        setSelectedEvent(null);
        routerNavigate(-1);
        setTimeout(() => setFade(true), 50);
        return;
      }
      path = cityPrefix;
    }

    if (v === "detail") {
      return;
    }

    if (location.pathname !== path) {
      routerNavigate(path);
      setFade(true);
      window.scrollTo(0, 0);
    }
  };

  // Listen to native browser back/forward gestures and clear detail state
  // so stale `selected` can't re-push the detail route after navigation
  useEffect(() => {
    const handlePopState = () => {
      // Small delay to let React Router update location first
      setTimeout(() => {
        const path = window.location.pathname;
        const isDetailView = path.match(/\/[^/]+\/[^/]+/) && !path.startsWith('/mapa') && !path.startsWith('/mis-planes') && !path.startsWith('/favoritos') && !path.startsWith('/cuenta') && !path.startsWith('/eventos') && !path.startsWith('/itinerario') && !path.startsWith('/plan') && !path.startsWith('/manage') && !path.startsWith('/about') && !path.startsWith('/privacy') && !path.startsWith('/terms') && !path.startsWith('/admin_notifs') && !path.startsWith('/user_notifs');
        const isEventView = path.startsWith('/evento/');
        if (!isDetailView && !isEventView) {
          setSelected(null);
          setSelectedEvent(null);
          setFade(true);
        }
      }, 10);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Nudge scroll to fix Virtuoso blank screen bug on iOS Safari when returning from detail view
  useEffect(() => {
    const isDetailView = location.pathname.includes("/lugar/") || location.pathname.includes("/evento/");
    if (!isDetailView && !location.state?.background && activeCat !== "explorar") {
      const currentY = window.scrollY;
      if (currentY > 0) {
        window.scrollBy(0, 1);
        setTimeout(() => window.scrollBy(0, -1), 50);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.state?.background, activeCat]);

  const goDir = useCallback((b, e) => { if (e) e.stopPropagation(); trackEvent(b.id, "maps"); window.open(`https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}`, "_blank"); }, [trackEvent]);
  const callPhone = useCallback((b, e) => { if (e) e.stopPropagation(); trackEvent(b.id, "phone"); window.open(`tel:${b.phone}`); }, [trackEvent]);
  const goWhatsApp = useCallback((b, e) => { if (e) e.stopPropagation(); trackEvent(b.id, "whatsapp"); window.open(`https://wa.me/${(b.whatsapp || b.phone || "").replace(/\D/g, "")}`, "_blank"); }, [trackEvent]);
  const goWeb = useCallback((b, e) => { if (e) e.stopPropagation(); trackEvent(b.id, "website"); const url = (b.website.startsWith('http://') || b.website.startsWith('https://')) ? b.website : `https://${b.website}`; window.open(url, "_blank"); }, [trackEvent]);
  const doShare = useCallback((b, e) => {
    if (e) e.stopPropagation();
    const bizCity = b.city_slug || activeCity;
    const bizSlug = cleanCityPrefix(b.slug || createSlug(b.name), bizCity);
    const url = buildBizUrl(bizCity, bizSlug, cities);
    if (navigator.share) navigator.share({ title: b.name, url });
    else { navigator.clipboard?.writeText(url); toast$("Enlace copiado"); }
  }, [activeCity, cities]);

  const handleCardTap = useCallback((b) => {
    setSelected(b);
    const bizCity = b.city_slug || activeCity;
    const slug = cleanCityPrefix(b.slug || createSlug(b.name), bizCity);
    const cityBase = buildCityPath(bizCity, cities);
    const targetPath = `${cityBase}/${slug}`;
    routerNavigate(targetPath, { state: { background: location } });
    trackEvent(b.id, "view");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackEvent, activeCity, cities, location.pathname]);

  const handleEventTap = useCallback((ev) => {
    setSelectedEvent(ev);
    const slug = ev.slug || ev.id;
    const targetPath = `/evento/${slug}`;
    routerNavigate(targetPath, { state: { background: location } });
    trackEvent(ev.id, "view_event");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackEvent, location.pathname]);

  const doAuth = async () => {
    const uid = await handleAuth();
    if (uid) {
      await loadFavs(uid);
      setShowAuth(false);
      toast$("Bienvenido a CityMap");
    }
  };
  const doSignOut = async () => { await handleSignOut(); setFavIds([]); navigate("home"); toast$("Sesión cerrada"); };



  const postReview = async (bizId) => {
    if (!user) {
      setShowAuth(true);
      return;
    }
    if (reviewStar === 0) return toast$("Selecciona al menos 1 estrella");
    try {
      setReviewImgLoading(true);
      let img_url = null;
      if (reviewImgFile) {
        img_url = await cloudUpload(reviewImgFile, () => {}, "cityguide/reviews");
      }
      
      const cols = ["#7C3AED", "#DB2777", "#2563EB", "#059669", "#D97706"];
      const uName = user.user_metadata?.name || profile?.name || user.email.split("@")[0];
      const newReview = { 
        biz_id: bizId, 
        user_id: user.id, 
        user_name: uName, 
        user_init: uName.slice(0, 2).toUpperCase(), 
        user_color: cols[Math.floor(Math.random() * cols.length)], 
        stars: reviewStar, 
        text: reviewText.trim(),
        img_url
      };
      
      await dbService.createReview(newReview);
      
      const all = await dbService.getBusinessReviews(bizId).catch(() => []);
      
      // Ensure the new review is accounted for locally if there's a replica delay
      const allWithNew = all.find(r => r.user_id === user.id && r.text === newReview.text) ? all : [...all, newReview];
      
      const count = allWithNew.length;
      const avg = count > 0 ? Math.round((allWithNew.reduce((s, r) => s + (r.stars || 0), 0) / count) * 10) / 10 : 0;
      
      await dbService.updateBusinessStats(bizId, { rating: avg, review_count: count });
      
      const updateBiz = b => b.id === bizId ? { ...b, rating: avg, review_count: count } : b;
      setMapPins(prev => {
        const next = prev.map(updateBiz);
        if (activeCity) localStorage.setItem(`cg_mapPins_${activeCity}`, JSON.stringify(next));
        return next;
      });
      setMyBizList(prev => prev.map(updateBiz));
      setBanners(prev => prev.map(b => (b.business_id === bizId && b.businesses) ? { ...b, businesses: { ...b.businesses, rating: avg, review_count: count } } : b));
      setSelected(prev => prev?.id === bizId ? { ...prev, rating: avg, review_count: count } : prev);
      
      await loadReviews(bizId);
      setReviewText("");
      setReviewImgFile(null);
      setShowReview(false);
      toast$("Reseña publicada");
    } catch(err) {
      toast$("Error: " + err.message);
    } finally {
      setReviewImgLoading(false);
    }
  };
  const postExperienceReview = async expId => {
    if (!user) {
      toast$("Inicia sesión para opinar");
      setShowAuth(true);
      return;
    }
    if (reviewStar === 0) return toast$("Selecciona al menos 1 estrella");
    try {
      setReviewImgLoading(true);
      let img_url = null;
      if (reviewImgFile) {
        img_url = await cloudUpload(reviewImgFile, () => {}, "cityguide/reviews");
      }
      
      const cols = ["#7C3AED", "#DB2777", "#2563EB", "#059669", "#D97706"];
      const uName = user.user_metadata?.name || profile?.name || user.email.split("@")[0];
      const newReview = { 
        experience_id: expId, 
        user_id: user.id, 
        user_name: uName, 
        user_init: uName.slice(0, 2).toUpperCase(), 
        user_color: cols[Math.floor(Math.random() * cols.length)], 
        stars: reviewStar, 
        text: reviewText.trim(),
        img_url
      };
      await dbService.createReview(newReview);
      
      const all = await dbService.getExperienceReviews(expId).catch(() => []);
      
      const allWithNew = all.find(r => r.user_id === user.id && r.text === newReview.text) ? all : [...all, newReview];
      
      const count = allWithNew.length;
      const avg = count > 0 ? Math.round((allWithNew.reduce((s, r) => s + (r.stars || 0), 0) / count) * 10) / 10 : 0;
      await dbService.updateExperienceStats(expId, { rating: avg, review_count: count });
      
      setExperiences(prev => {
        const next = prev.map(e => e.id === expId ? { ...e, rating: avg, review_count: count } : e);
        if (activeCity) localStorage.setItem(`cg_experiences_${activeCity}`, JSON.stringify(next));
        return next;
      });
      setSelectedEvent(prev => prev?.id === expId ? { ...prev, rating: avg, review_count: count } : prev);
      await loadExperienceReviews(expId);
      setReviewText("");
      setReviewImgFile(null);
      setShowReview(false);
      toast$("Reseña publicada");
    } catch(err) {
      toast$("Error: " + err.message);
    } finally {
      setReviewImgLoading(false);
    }
  };

  const toggleLikeReview = async r => {
    if (!user) return setShowAuth(true);
    const hasLiked = r.liked_by?.includes(user.id);
    const newLikedBy = hasLiked ? (r.liked_by || []).filter(id => id !== user.id) : [...(r.liked_by || []), user.id];
    setReviews(prev => prev.map(rv => rv.id === r.id ? { ...rv, liked_by: newLikedBy, likes: newLikedBy.length } : rv));
    try {
      await dbService.toggleLikeOnReview(r.id, user.id);
    } catch {
      setReviews(prev => prev.map(rv => rv.id === r.id ? { ...rv, liked_by: r.liked_by, likes: (r.liked_by || []).length } : rv));
    }
  };

  const doClaim = async (bizId, claimForm) => { 
    if (!user) return; 
    try {
      await dbService.submitBusinessClaim({ 
        business_id: bizId, 
        user_id: user.id, 
        phone: claimForm.phone,
        email: claimForm.email,
        role: claimForm.role,
        status: 'pending'
      });
      toast$("Solicitud enviada — la revisaremos pronto"); 
    } catch (e) {
      toast$("Error al enviar solicitud: " + e.message);
    }
  };

  const isAdmin = profile?.role === "admin" || user?.email === "soporte@citymap.mx" || user?.email === "mendozadaniel1999@gmail.com";
  const requestLocation = () => { 
    navigator.geolocation?.getCurrentPosition(pos => {
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setUserCoords(coords);
      localStorage.setItem("cg_coords", JSON.stringify(coords));
    }, () => { }, { enableHighAccuracy: true, timeout: 10000 }); 
  };
  useEffect(() => {
    const cachedCity = localStorage.getItem("cg_city_slug");

    if (!cachedCity && cities.length > 0) {
      setRequireCitySelection(true);
    } else if (cachedCity && cities.length > 0 && navigator.permissions && navigator.geolocation) {
      // Auto-update location if permission was previously granted AND user hasn't manually locked city
      if (!localStorage.getItem("cg_manual_city")) {
        navigator.permissions.query({ name: 'geolocation' }).then(result => {
          if (result.state === 'granted') {
            detectCity({ 
              showToast: false, 
              onDone: (slug) => {
                if (slug !== cachedCity) {
                  loadData(slug);
                }
              }
            });
          }
        }).catch(() => {});
      }
    }
  }, [cities]);

  useEffect(() => {
    if (!ownerView) return;
    (async () => {
      const [rv, an] = await Promise.all([
        sb.get("reservations", `?biz_id=eq.${ownerView.id}&status=neq.deleted&order=date.asc`).catch(() => []),
        sb.get("analytics", `?biz_id=eq.${ownerView.id}`).catch(() => []),
      ]);
      setOwnerRes(Array.isArray(rv) ? rv : []);
      if (Array.isArray(an)) setOwnerStats({ views: an.filter(a => a.event_type === "view").length, whatsapp: an.filter(a => a.event_type === "whatsapp").length, phone: an.filter(a => a.event_type === "phone").length });
    })();
  }, [ownerView]);



  const allNearby = useMemo(() => {
    return userCoords ? mapPins.filter(b => isNear(b, userCoords, activeCity) && b.status === "approved" && b.lat && b.lng).map(b => ({ ...b, _km: getKm(userCoords.lat, userCoords.lng, parseFloat(b.lat), parseFloat(b.lng)) })).sort((a, b) => a._km - b._km) : [];
  }, [userCoords, mapPins, getKm, activeCity]);

  const isExcluded = (b) => {
    if (!b.category) return false;
    const c = b.category.toLowerCase();
    return c.includes("lugares") || c.includes("plaza") || c.includes("unidad") || c.includes("parque");
  };

  const filteredBanners = useMemo(() => {
    return banners.filter(b => {
      if (b.city_slug === "all") return true;
      const linkedBiz = b.business_id ? mapPins.find(biz => biz.id === b.business_id) : null;
      return isNear(linkedBiz || b, userCoords, activeCity);
    });
  }, [banners, activeCity, detectedTown, userCoords, mapPins]);

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (e.city_slug === "all") return true;
      const linkedBiz = e.business_id ? mapPins.find(biz => biz.id === e.business_id) : null;
      return isNear(linkedBiz || e, userCoords, activeCity);
    });
  }, [events, activeCity, detectedTown, userCoords, mapPins]);

  const filteredBiz = useMemo(() => {
    let filtered = mapPins.filter(b => b.status === "approved");
    
    // Si hay GPS, filtra por radio de distancia. Si no, por ciudad activa.
    filtered = filtered.filter(b => isNear(b, userCoords, activeCity));

    if (activeCat && activeCat !== "todas" && activeCat !== "explorar") {
      const catObj = cats.find(c => c.id === activeCat);
      const catLabel = catObj ? catObj.label : activeCat;
      
      filtered = filtered.filter(b => 
        b.category === activeCat || 
        b.category === catLabel || 
        (b.category && b.category.toLowerCase() === activeCat.toLowerCase()) || 
        (b.category && catLabel && b.category.toLowerCase() === catLabel.toLowerCase())
      );
    }
    
    if (search) {
      filtered = filtered.filter(b => {
        const textToSearch = [
          b.name,
          b.category,
          b.type,
          b.tagline,
          b.description,
          ...(b.tags || [])
        ].join(" ");
        return fuzzyMatch(search, textToSearch);
      });
    }
    
    const d = new Date();
    const seed = d.getFullYear() + d.getMonth() * 31 + d.getDate();
    
    return filtered.sort((a, b) => {
      const getPlanWeight = (plan) => {
        if (plan === "premium") return 3;
        if (plan === "destacado") return 2;
        return 1;
      };
      
      const weightA = getPlanWeight(a.plan);
      const weightB = getPlanWeight(b.plan);
      
      if (weightA !== weightB) {
        return weightB - weightA;
      }
      
      const pseudoRandA = Math.sin(seed + (a.name || "").charCodeAt(0)) * 10000;
      const pseudoRandB = Math.sin(seed + (b.name || "").charCodeAt(0)) * 10000;
      const aVal = pseudoRandA - Math.floor(pseudoRandA);
      const bVal = pseudoRandB - Math.floor(pseudoRandB);
      
      return aVal - bVal;
    });
  }, [mapPins, activeCity, activeCat, search]);

  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadPaginatedBiz = useCallback(() => {
    if (loadingMore || page * 20 >= filteredBiz.length) return;
    setLoadingMore(true);
    setTimeout(() => {
      setPage(p => p + 1);
      setLoadingMore(false);
    }, 500);
  }, [loadingMore, page, filteredBiz.length]);

  useEffect(() => {
    setPage(1);
  }, [mapPins, activeCat, search, activeCity]);

  const displayList = useMemo(() => {
    return filteredBiz.slice(0, page * 20);
  }, [filteredBiz, page]);

  const hasMore = page * 20 < filteredBiz.length;
  
  // topFavsMemo is computed here without depending on time

  const viewStyle = { opacity: fade ? 1 : 0, transform: fade ? "translateY(0)" : "translateY(24px)", transition: "opacity .45s ease, transform .45s cubic-bezier(.34,1.1,.64,1)" };

  const css = `
    .card{background:${T.card};border-radius:16px;overflow:hidden;box-shadow:${T.shadow};transition:box-shadow .2s,transform .2s,background .3s;cursor:pointer;}
    .card:hover{box-shadow:${T.shadowLg};transform:translateY(-2px);}
    .inp{width:100%;padding:14px 16px;background:${T.white};border:1.5px solid ${T.border};border-radius:12px;font-size:15px;color:${T.text};transition:border-color .2s,background .3s;}
    .inp:focus{border-color:${T.green};}.inp::placeholder{color:${T.sub};}
    .btn-g{background:${T.green};color:#fff;border:none;padding:15px;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;width:100%;transition:background .18s;}
    .btn-g:hover{background:${T.greenD};}
    .btn-s{background:${T.white};color:${T.green};border:1.5px solid ${T.green};padding:14px;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;width:100%;}
    .act{display:flex;flex-direction:column;align-items:center;gap:5px;padding:11px 6px;background:${T.white};border:1.5px solid ${T.border};border-radius:12px;cursor:pointer;transition:all .18s;flex:1;}
    .act:hover{border-color:${T.green};background:${T.greenL};}
    .tb{position:fixed;bottom:72px;left:0;right:0;margin:0 auto;width:max-content;background:rgba(0,0,0,0.75);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);color:#fff;padding:8px 16px;border-radius:20px;font-size:13px;font-family:${FONT_BIZ};font-weight:600;z-index:99999;white-space:nowrap;animation:fadeUp .3s ease;box-shadow:0 4px 12px rgba(0,0,0,0.2);}
    .ov{position:fixed;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(8px);z-index:999999;display:flex;align-items:flex-start;justify-content:center;padding:40px 16px 20px;}
    .sh{background:${T.white};border-radius:24px;padding:24px 20px 32px;width:100%;max-width:480px;max-height:85vh;overflow-y:auto;animation:fadeUp .35s cubic-bezier(.34,1.1,.64,1) both;box-shadow:0 20px 40px rgba(0,0,0,0.2);}
    .ir{display:flex;align-items:flex-start;gap:12px;padding:14px 16px;border-bottom:1px solid ${T.border};cursor:pointer;transition:background .15s;}
    .ir:hover{background:${T.bg};}
    .ii{width:36px;height:36px;border-radius:10px;background:${T.greenL};display:flex;align-items:center;justify-content:center;flex-shrink:0;}
    .chip{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:40px;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;border:none;transition:all .18s;background:transparent;color:${T.text};}
    .chip.on{background:linear-gradient(135deg, #60A5FA, #3B82F6);color:#fff;box-shadow:0 4px 12px rgba(59,130,246,0.3);}
    .chip:hover:not(.on){background:${T.bg};}
    .nb{display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 20px;cursor:pointer;font-size:10px;font-weight:700;letter-spacing:.4px;color:${T.sub};transition:color .18s;text-transform:uppercase;background:none;border:none;}
    .nb.on{color:${T.green};}
    .dot-c{width:6px;height:6px;border-radius:50%;background:${T.red};display:inline-block;}
    .dk{position:fixed;bottom:100px;right:16px;z-index:60;width:44px;height:44px;border-radius:50%;background:rgba(0,0,0,0.65);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.15);box-shadow:0 8px 32px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s;}
    .dk:hover{transform:scale(1.1);}
  `;

  // ── MEMOIZED COMPUTATIONS ──────────────────────────────────────────────────



  
  // Stubs for collection and event functions to prevent crashes

  const toggleSaveEvent = () => {};
  const AutoSliderEv = ({ children }) => <div style={{display:"flex", overflowX:"auto", gap:10}}>{children}</div>;

  const topFavsMemo = useMemo(() => {
    return [...mapPins].filter(b => isNear(b, userCoords, activeCity) && b.status === "approved" && globalFavCounts[b.id] > 0).sort((a, b) => (globalFavCounts[b.id] || 0) - (globalFavCounts[a.id] || 0)).slice(0, 10);
  }, [mapPins, activeCity, globalFavCounts, userCoords]);

  const topRatedMemo = useMemo(() => {
    return [...mapPins].filter(b => isNear(b, userCoords, activeCity) && b.status === "approved" && b.review_count > 0).sort((a, b) => b.rating - a.rating || b.review_count - a.review_count).slice(0, 10);
  }, [mapPins, activeCity, userCoords]);

  const newBizMemo = useMemo(() => {
    return [...mapPins].filter(b => isNear(b, userCoords, activeCity) && b.status === "approved").sort((a, b) => new Date(b.created_at || 0).getTime() < new Date(a.created_at || 0).getTime() ? -1 : 1).slice(0, 8);
  }, [mapPins, activeCity, userCoords]);

  // Note: cats is already filtered by city in useDataStore.loadData

  // ── SPLASH ────────────────────────────────────────────────────────────────
  // Bypass onboarding if user arrived via a shared plan/join link
  const hasDeepLink = !!(initialPlanParam.current || initialJoinParam.current);
  // (Removed static splash screen that blocked city selection)

  const appContextValue = {
    viewStyle, cityImg, locating, detectCity, setShowCountryPicker, city, isAdmin, setShowAdmin, search, setSearch, user, setShowAuth, toast$, setShowAddBiz, setShowPlans, dbReady, dark, cats, activeCat, setActiveCat, T, mapPins, activeCity, banners: filteredBanners, displayList, userCoords, getKm, favIds, toggleFav, setSelected, navigate, trackEvent, goWhatsApp, goDir, doShare, handleCardTap, handleEventTap, loadPaginatedBiz, hasMore, loadingMore, nearbyRadius, setNearbyRadius, nearbyFilter, setNearbyFilter, isOpen, topFavsMemo, showMoreTopFavs, setShowMoreTopFavs, globalFavCounts, topRatedMemo, showMoreTopRated, setShowMoreTopRated, newBizMemo, coupons, biz: filteredBiz, AutoSlider, CAT_EMOJI, FONT_BIZ, detectedTown, detectedState,
    // From MapView
    mapPin, setMapPin, requestLocation, allNearby,
    // From FavsView
    collections, activeCollection, setActiveCollection, newColModal, setNewColModal, newColForm, setNewColForm, createCollection, updateCollection, deleteCollection, setMovingBiz, movingBiz, setCollections,
    // From EventsView
    events: filteredEvents, EVENT_CATS, getEventStatus, savedEventIds, toggleSaveEvent, selectedEvent, setSelectedEvent, AutoSliderEv, setShowCreateEvent, createSlug, setSavedEventIds, cleanCityPrefix, savedExpIds, setSavedExpIds,
    // From DetailView
    selected, setView: () => {}, setFade, showGallery, setShowGallery, reviews, promos, wallet, setWallet, parseMenuUrls, setShowMenuGallery, goWeb, showReview, setShowReview, reviewStar, setReviewStar, reviewText, setReviewText, reviewImgFile, setReviewImgFile, reviewImgLoading, postReview, postExperienceReview, loadExperienceReviews, sb, setReviews, setBiz: setMapPins, toggleLikeReview, setClaimBiz, callPhone,
    // Globals
    LoaderFallback, GMap
  };

  if (resolvingDeepLink) {
    return <LoaderFallback />;
  }

  return (
    <AppContext.Provider value={appContextValue}>
      <div style={{ fontFamily: "'DM Sans',system-ui,sans-serif", background: dark ? "transparent" : T.bg, minHeight: "100vh", width: "100%", position: "relative", transition: "background .3s" }}>
        {dark && <CosmicBackground />}
        {/* Main app container */}
        <div style={{ width: "100%", margin: "0 auto", minHeight: "100vh", position: "relative", background: dark ? "transparent" : T.bg }}>
        <style>{css}</style>

        {(!location.pathname.startsWith("/cuenta") && !location.pathname.startsWith("/about") && !location.pathname.startsWith("/privacy") && !location.pathname.startsWith("/terms")) && <FloatingParticles dark={dark} />}

        {toast && <div className="tb">{toast}</div>}

        {/* ── GLOBAL GLASS NAVBAR (Fixed, home only) ── */}
        {(location.pathname === "/" || location.pathname === `/${activeCity}` || location.pathname === buildCityPath(activeCity, cities)) && !location.pathname.includes("/lugar/") && !location.pathname.includes("/evento/") && (
          <div style={{ 
            position: "fixed", 
            top: 0, 
            left: "50%", 
            transform: `translateX(-50%)`, 
            width: "100%", 
            height: 50, 
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr", 
            alignItems: "center", 
            padding: "0 16px", 
            zIndex: 998, 
            background: scrolled ? (dark ? "#0F172A" : "#FFFFFF") : "transparent", 
            backdropFilter: "none", 
            WebkitBackdropFilter: "none", 
            borderBottom: scrolled ? `1px solid ${dark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'}` : "1px solid transparent", 
            transition: "all 0.3s ease" 
          }}>
            {/* Left: Menu */}
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "flex-start",
              transition: "all 0.3s ease" 
            }}>
              <button 
                className="press" 
                onClick={() => setShowSidebar(true)} 
                style={{ 
                  background: "transparent", border: "none", outline: "none", cursor: "pointer", 
                  display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 0",
                  color: !dark ? T.text : "#ffffff"
                }}
              >
                <Icon name="menu" size={24} color={!dark ? T.text : "#ffffff"} />
              </button>
            </div>

            {/* Center: Logo */}
            <div style={{ 
              pointerEvents: scrolled ? "auto" : "none", 
              opacity: scrolled ? 1 : 0, 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              transform: scrolled ? "translateY(0)" : "translateY(-10px)",
              transition: "all 0.3s ease" 
            }}>
              <img 
                src="/citymap.mx.png" 
                alt="CityMap" 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                style={{ 
                  height: 32, 
                  objectFit: "contain",
                  cursor: "pointer",
                  filter: !dark ? "invert(1)" : "drop-shadow(0 2px 8px rgba(56, 189, 248, 0.3))" 
                }} 
              />
            </div>

            {/* Right: Globe */}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button 
                aria-label="Seleccionar ciudad o región"
                className="press" 
                onClick={(e) => { e.stopPropagation(); setShowCountryPicker(prev => !prev); }} 
                style={{ 
                  background: "transparent", border: "none", outline: "none", cursor: "pointer", 
                  display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 0",
                  color: !dark ? T.text : "#ffffff", 
                  transition: "all 0.2s" 
                }}
              >
                <Icon name="globe" size={20} color={!dark ? T.text : "#ffffff"} />
              </button>
            </div>
          </div>
        )}

        {/* Removed CityPicker */}        {showAdmin && <Suspense fallback={<LoaderFallback/>}><AdminPanel onClose={() => { setShowAdmin(false); loadData(); }} onToast={toast$} T={T} onOpenStoreAdmin={(biz) => setAdminStoreBiz(biz)} /></Suspense>}
        {adminStoreBiz && <Suspense fallback={<LoaderFallback/>}><StoreAdminPanel business={adminStoreBiz} onClose={() => setAdminStoreBiz(null)} T={T} /></Suspense>}
        {showPlans && <Suspense fallback={<LoaderFallback/>}><PlansPage T={T} onClose={() => setShowPlans(false)} myBizList={myBizList} onAddBiz={() => { if (!user) { setShowAuth(true); return; } setShowPlans(false); setShowAddBiz(true); }} /></Suspense>}
        {claimBiz && <Suspense fallback={<LoaderFallback/>}><ClaimModal biz={claimBiz} user={user} onClaim={doClaim} onClose={() => setClaimBiz(null)} /></Suspense>}

        {/* SIDE MENU */}
        <SideMenu 
          isOpen={showSidebar} 
          onClose={() => setShowSidebar(false)} 
          T={T} 
          dark={dark} 
          routerNavigate={routerNavigate} 
          user={user} 
          setShowAuth={setShowAuth} 
          setShowAdmin={setShowAdmin} 
        />

        {/* AUTH */}
        {showAuth && <div className="ov" onClick={() => setShowAuth(false)}><div className="sh" onClick={e => e.stopPropagation()}>

          {/* ── Header ── */}
          <div style={{ marginBottom: 28, textAlign: "center" }}>
            <h2 style={{ fontFamily: "var(--heading)", color: T.text, margin: "0 0 6px 0", lineHeight: 1.1, fontSize: 24, fontWeight: 900 }}>
              {authMode === "login" ? "¡Hola de nuevo!" : "Únete a CityMap"}
            </h2>
            <p style={{ color: T.sub, margin: 0, fontWeight: 500, fontSize: 14 }}>
              {authMode === "login" ? "Accede a tu cuenta de CityMap" : "Descubre los mejores lugares locales"}
            </p>
          </div>

          {/* ── Botón Google ── */}
          <button className="press" onClick={async () => {
            setAuthErr("");
            try { await sb.signInWithOAuth('google'); }
            catch (err) { setAuthErr("Error con Google: " + err.message); }
          }} style={{ width: "100%", padding: "14px", background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 14, fontWeight: 700, fontSize: 15, color: T.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.9 2.5 30.3 0 24 0 14.7 0 6.7 5.5 2.9 13.6l7.8 6C12.5 13.1 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17z"/><path fill="#FBBC05" d="M10.7 28.4A14.5 14.5 0 0 1 9.5 24c0-1.5.3-3 .7-4.4l-7.8-6A24 24 0 0 0 0 24c0 3.9.9 7.5 2.5 10.8l8.2-6.4z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.2 1.5-5 2.4-8.4 2.4-6.2 0-11.5-4.2-13.4-9.8l-8.2 6.4C6.7 42.5 14.7 48 24 48z"/></svg>
            Continuar con Google
          </button>

          {/* ── Divisor ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: T.border }} />
            <span style={{ fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 1, fontSize: 11 }}>O ingresa con email</span>
            <div style={{ flex: 1, height: 1, background: T.border }} />
          </div>

          {/* ── Error ── */}
          {authErr && <div style={{ padding: "12px 16px", background: "#FEF2F2", border: "1px solid #FEE2E2", borderRadius: 12, color: "#DC2626", marginBottom: 16, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}><Icon name="info" size={16} color="#DC2626" />{authErr}</div>}

          {/* ── Inputs ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {authMode === "register" && (
              <>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", pointerEvents: "none" }}>
                    <Icon name="user" size={16} color={T.sub} />
                  </span>
                  <input className="inp" placeholder="Tu nombre y apellido" value={authForm.name} onChange={e => setAuthForm(f => ({ ...f, name: e.target.value }))} style={{ padding: "14px 16px 14px 42px", borderRadius: 12, border: `1.5px solid ${T.border}`, fontSize: 15, background: T.white, color: T.text, outline: "none", width: "100%" }} />
                </div>
                <select className="inp" style={{ padding: "14px 16px", borderRadius: 12, border: `1.5px solid ${T.border}`, fontSize: 15, background: T.white, color: T.text, outline: "none", appearance: "none" }} value={authForm.city} onChange={e => setAuthForm(f => ({ ...f, city: e.target.value }))}>
                  <option value="" disabled>Selecciona tu ciudad principal...</option>
                  {cities.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                </select>
              </>
            )}
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", pointerEvents: "none" }}>
                <Icon name="mail" size={16} color={T.sub} />
              </span>
              <input className="inp" placeholder="Correo electrónico" type="email" value={authForm.email} onChange={e => setAuthForm(f => ({ ...f, email: e.target.value }))} style={{ padding: "14px 16px 14px 42px", borderRadius: 12, border: `1.5px solid ${T.border}`, fontSize: 15, background: T.white, color: T.text, outline: "none", width: "100%" }} />
            </div>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", pointerEvents: "none" }}>
                <Icon name="lock" size={16} color={T.sub} />
              </span>
              <input className="inp" placeholder="Contraseña" type="password" value={authForm.password} onChange={e => setAuthForm(f => ({ ...f, password: e.target.value }))} style={{ padding: "14px 16px 14px 42px", borderRadius: 12, border: `1.5px solid ${T.border}`, fontSize: 15, background: T.white, color: T.text, outline: "none", width: "100%" }} />
            </div>
          </div>

          {/* ── CTA ── */}
          <button className="press" style={{ marginTop: 20, padding: "16px", borderRadius: 14, background: dark ? "#f1f5f9" : "#0f172a", color: dark ? "#0f172a" : "#fff", fontWeight: 800, fontSize: 15, width: "100%", border: "none", cursor: "pointer", boxShadow: "0 8px 24px rgba(0,0,0,0.18)", opacity: authLoading ? 0.7 : 1 }} onClick={doAuth} disabled={authLoading}>
            {authLoading ? "Conectando…" : authMode === "login" ? "Ingresar a mi cuenta" : "Crear mi cuenta gratis"}
          </button>

          <p style={{ textAlign: "center", marginTop: 20, color: T.sub, fontSize: 14 }}>
            {authMode === "login" ? "¿Eres nuevo por aquí? " : "¿Ya eres parte de CityMap? "}
            <span style={{ color: T.green, fontWeight: 800, cursor: "pointer" }} onClick={() => { setAuthMode(m => m === "login" ? "register" : "login"); setAuthErr(""); }}>
              {authMode === "login" ? "Regístrate ahora" : "Inicia sesión"}
            </span>
          </p>
        </div></div>}

        {/* ════ VIEW WRAPPER ════ */}
        <m.div animate={{ opacity: fade ? 1 : 0 }} transition={{ duration: 0.15, ease: "easeInOut" }}>
          <AppRouter
            navigate={navigate}
            T={T}
            dark={dark}
            setDark={setDark}
            mapPins={mapPins}
            activeCity={activeCity}
            cities={cities}
            userCoords={userCoords}
            user={user}
            authChecked={authChecked}
            profile={profile}
            isAdmin={isAdmin}
            initialPlanParam={initialPlanParam}
            initialJoinParam={initialJoinParam}
            favIds={favIds}
            reviews={reviews}
            wallet={wallet}
            coupons={coupons}
            claimedCoupons={claimedCoupons}
            myBizList={myBizList}
            setShowAdmin={setShowAdmin}
            setShowPlans={setShowPlans}
            setShowAuth={setShowAuth}
            setAuthMode={setAuthMode}
            setEditBizId={setEditBizId}
            setAddBizForm={setAddBizForm}
            setShowAddBiz={setShowAddBiz}
            setOwnerView={setOwnerView}
            setSelected={setSelected}
            doSignOut={doSignOut}
            toast$={toast$}
            viewStyle={viewStyle}
            setUser={setUser}
            setStoreAdminBiz={setStoreAdminBiz}
            HomeView={HomeView}
            MapView={MapView}
            TripsView={TripsView}
            EventsView={EventsView}
            FavsView={FavsView}
            AccountView={AccountView}
            About={About}
            Privacy={Privacy}
            Terms={Terms}
            AdminNotifs={AdminNotifs}
            UserNotifs={UserNotifs}
            OwnerDashboardView={OwnerDashboardView}
          />

        {storeAdminBiz && <Suspense fallback={<LoaderFallback/>}><StoreAdminPanel business={storeAdminBiz} onClose={() => setStoreAdminBiz(null)} T={T} /></Suspense>}

        {/* ════ CREAR EVENTO MODAL ════ */}
        <Suspense fallback={null}>
          <CreateEventModal showCreateEvent={showCreateEvent} setShowCreateEvent={setShowCreateEvent} />
        </Suspense>

        {/* ════ DETALLE EVENTO ════ */}
        <Suspense fallback={null}>
          <EventDetailModal savedEventIds={savedEventIds} setSavedEventIds={setSavedEventIds} />
        </Suspense>

        {showLocPicker && <Suspense fallback={<LoaderFallback/>}><MapPicker
          initLat={addBizForm.lat} initLng={addBizForm.lng}
          onPick={(lat, lng) => setAddBizForm(f => ({ ...f, lat, lng }))}
          onClose={() => setShowLocPicker(false)}
        /></Suspense>}

        {showAddBiz && <Suspense fallback={<LoaderFallback/>}><AddBizModal
          showAddBiz={showAddBiz}
          setShowAddBiz={setShowAddBiz}
          editBizId={editBizId}
          setEditBizId={setEditBizId}
          addBizForm={addBizForm}
          setAddBizForm={setAddBizForm}
          user={user}
          activeCity={activeCity}
          cats={cats}
          biz={mapPins}
          setBiz={setMapPins}
          loadPaginatedBiz={loadPaginatedBiz}
          loadMapPins={loadMapPins}
          loadMyBiz={loadMyBiz}
          setShowPlans={setShowPlans}
          toast$={toast$}
          T={T}
        /></Suspense>}

        </m.div>

        {/* ════ DETAIL (Ahora en AppRouter) ════ */}
        
        {/* ════ BOTTOM NAV ════ */}
        {!location.pathname.endsWith('/menu') && (
        <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, width: "100%", background: dark ? "#1e293b" : "#FFFFFF", borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`, display: "flex", alignItems: "center", justifyContent: "space-around", padding: "4px 12px", paddingBottom: "calc(4px + env(safe-area-inset-bottom, 8px))", zIndex: 50, boxShadow: "0 -4px 20px rgba(0,0,0,0.03)" }}>
          {[{ id: "home", icon: "home", label: "Inicio" }, { id: "mis-planes", icon: "bookmark", label: "Planes" }, { id: "map", icon: "map_svg", label: "Mapa" }, { id: "eventos", icon: "calendar", label: "Eventos" }, { id: "account", icon: "user", label: "Mi Perfil" }].map(n => {
            const p = location.pathname;
            let isActive = false;
            if (n.id === "home") isActive = p === "/" || (!p.startsWith("/mapa") && !p.startsWith("/eventos") && !p.startsWith("/mis-planes") && !p.startsWith("/experiencias") && !p.startsWith("/planes") && !p.startsWith("/cuenta") && !p.startsWith("/admin") && !p.startsWith("/favoritos") && !p.startsWith("/about") && !p.startsWith("/privacy") && !p.startsWith("/terms") && !p.startsWith("/itinerarios") && !p.startsWith("/itinerario/") && !p.startsWith("/plan/") && !p.startsWith("/manage/") && !p.includes("/lugar/") && !p.includes("/evento/"));
            else if (n.id === "map") isActive = p.startsWith("/mapa");
            else if (n.id === "eventos") isActive = p.startsWith("/eventos");
            else if (n.id === "mis-planes") isActive = p.startsWith("/mis-planes") || p.startsWith("/experiencias") || p.startsWith("/planes");
            else if (n.id === "account") isActive = p.startsWith("/cuenta");
            
            return <m.button whileTap={{ scale: 0.85 }} key={n.id} onClick={() => { if (n.id === "account" && !user) { setShowAuth(true); return; } navigate(n.id); }} style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "4px 10px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", minWidth: 48 }}>
              {isActive && (
                <m.div layoutId="activeNavBubble" style={{ position: "absolute", inset: 0, background: dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)", borderRadius: 36, zIndex: 0 }} transition={{ type: "spring", bounce: 0.25, duration: 0.5 }} />
              )}
              <div style={{ position: "relative", zIndex: 1, transform: isActive ? "scale(1.28)" : "scale(1)", transition: "transform .35s cubic-bezier(.34,1.56,.64,1)", display: 'flex', alignItems: 'center', justifyContent: 'center', height: 24 }}>
                <Icon name={n.icon} size={20} color={isActive ? (dark ? "#FFFFFF" : "#111827") : (dark ? "rgba(255,255,255,0.6)" : "rgba(17,24,39,0.5)")} sw={1.8} />
              </div>
              <span className="text-micro" style={{ position: "relative", zIndex: 1, fontWeight: 600, color: isActive ? (dark ? "#FFFFFF" : "#111827") : (dark ? "rgba(255,255,255,0.6)" : "rgba(17,24,39,0.5)"), whiteSpace: "nowrap", transition: "color .2s" }}>{n.label}</span>
            </m.button>;
          })}
        </nav>
        )}

        {/* Country Picker Modal */}
        {requireCitySelection && !hasOnboarded && (
          <Suspense fallback={null}>
            <OnboardingModal 
              T={T} 
              onComplete={() => {
                localStorage.setItem('citymap_onboarded', 'true');
                setHasOnboarded(true);
              }} 
            />
          </Suspense>
        )}

        {(showCountryPicker || (requireCitySelection && hasOnboarded)) && (
          <CountryPickerDropdown 
            cities={cities} 
            activeCity={activeCity} 
            onSelectCity={(city) => { handleCitySelect(city); setRequireCitySelection(false); setShowCountryPicker(false); }} 
            onDetectCity={() => { if (!locating) detectCity({ showToast: true, onDone: (slug) => { const found = cities.find(c => c.slug === slug); if (found) handleCitySelect(found); setRequireCitySelection(false); } }); setShowCountryPicker(false); }}
            locating={locating}
            onClose={() => { if(!requireCitySelection) setShowCountryPicker(false); }} 
            dark={dark}
            isWelcome={requireCitySelection} 
          />
        )}

        {/* Fullscreen Gallery Modal */}
        {showGallery !== false && (selected || selectedEvent) && (() => {
          const galleryPhotos = selectedEvent && (selectedEvent.img_url || selectedEvent.img) ? [{ url: selectedEvent.img_url || selectedEvent.img, label: "Evento" }] : (selected?.photos?.length > 1 ? selected.photos.slice(1) : selected?.photos || []);
          if (galleryPhotos.length === 0) return null;
          const initialIdx = typeof showGallery === "number" ? showGallery : 0;
          return <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999, background: "#000000", display: "flex", flexDirection: "column" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "16px 20px", display: "flex", justifyContent: "flex-start", zIndex: 10 }}>
              <button className="press" onClick={() => setShowGallery(false)} style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", marginTop: 20 }}><Icon name="x" size={24} color="#fff" /></button>
            </div>
            <div style={{ flex: 1, display: "flex", alignItems: "center", width: "100%" }}>
               <Suspense fallback={<div style={{height: "100dvh", width: "100%", background: "#000"}}/>}>
                 <Gallery photos={galleryPhotos} h="100dvh" fit="contain" bg="transparent" initialIndex={initialIdx} />
               </Suspense>
            </div>
          </div>;
        })()}

        {/* Fullscreen Menu Gallery Modal */}
        {showMenuGallery && selected && (() => {
          const menuUrls = parseMenuUrls(selected.menu_pdf_url).map((u, i) => ({ url: u, label: `Página ${i+1}` }));
          if (menuUrls.length === 0) return null;
          return <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999, background: "#000000", display: "flex", flexDirection: "column" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "16px 20px", display: "flex", justifyContent: "flex-start", zIndex: 10 }}>
              <button className="press" onClick={() => setShowMenuGallery(false)} style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", marginTop: 20 }}><Icon name="x" size={24} color="#fff" /></button>
            </div>
            <div style={{ flex: 1, display: "flex", alignItems: "center", width: "100%" }}>
               <Suspense fallback={<div style={{height: "100dvh", width: "100%", background: "#000"}}/>}>
                 <Gallery photos={menuUrls} h="100dvh" fit="contain" bg="transparent" />
               </Suspense>
            </div>
          </div>;
        })()}

        {/* Schedule Modal */}
        <Suspense fallback={null}>
          <ScheduleModal selected={selected} showSchedule={showSchedule} setShowSchedule={setShowSchedule} />
        </Suspense>

        <ItineraryModal T={T} dark={dark} />

      </div>
    </div>



    </AppContext.Provider>
  );
}
