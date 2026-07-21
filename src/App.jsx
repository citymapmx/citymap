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
import { motion, AnimatePresence } from "framer-motion";
import { Geolocation } from '@capacitor/geolocation';
import './App.css';
import { sb, cloudUpload, cloudUploadPDF, SUPABASE_URL, SUPABASE_ANON, CLOUDINARY_CLOUD, CLOUDINARY_PRESET, GMAPS_KEY } from './lib/supabase.js';
import { useAuthStore } from "./store/useAuthStore.js";
import { useShallow } from 'zustand/react/shallow';
import { useDataStore } from './store/useDataStore.js';
import { useUIStore } from './store/useUIStore.js';
import { useGeolocation } from './hooks/useGeolocation.js';
import { useFavorites } from './hooks/useFavorites.js';
import { Routes, Route, useLocation, useNavigate, matchPath } from 'react-router-dom';
import { PLAN_META, CITY_TZ, FONT_BIZ, EVENT_CATS, getT, CATS_DEFAULT } from './lib/constants.js';
import { fuzzyMatch } from './lib/utils.js';
import Icon from './components/ui/Icon.jsx';
import RotatingBusinessBanner from './components/RotatingBusinessBanner.jsx';
import StarRow from './components/ui/StarRow.jsx';
import { Sk, CardSk } from './components/ui/Skeleton.jsx';

import { getEventStatus, CAT_EMOJI, isOpenNow, createSlug, getIdFromSlug, parseMenuUrls, cleanCityPrefix, isNear } from './lib/utils.js';
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
const StoreAdminPanel = lazy(() => import("./components/store/StoreAdminPanel.jsx"));
const CityPicker = lazy(() => import("./components/CityPicker.jsx"));
import { SplashScreen, PageLogo } from "./components/Brand.jsx";

const LoaderFallback = () => <div style={{position:"fixed",inset:0,background:"#F7F8F6",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:30,height:30,border:"3px solid #E4E8E4",borderTop:"3px solid #000000",borderRadius:"50%",animation:"spin .8s linear infinite"}}/></div>;
const PAGE_LOAD_SEED = Math.random();


// Clean base URL — strips any accidental /rest/v1 suffix

import { useInteractions } from './hooks/useInteractions.js';
import { useBusinessActions } from './hooks/useBusinessActions.js';
import { useAppInit } from './hooks/useAppInit.js';

import ErrorBoundary from "./components/ErrorBoundary.jsx";
const HomeView = lazy(() => import("./views/HomeView.jsx"));
const DetailView = lazy(() => import("./views/DetailView.jsx"));
const MapView = lazy(() => import("./views/MapView.jsx"));
const FavsView = lazy(() => import("./views/FavsView.jsx"));
const EventsView = lazy(() => import("./views/EventsView.jsx"));
const LocationPermissionModal = lazy(() => import("./components/LocationPermissionModal.jsx"));
import { shouldShowLocationModal } from "./lib/utils.js";
const ReservationsAgenda = lazy(() => import("./components/ReservationsAgenda.jsx"));
import { App as CapApp } from '@capacitor/app';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';


export default function CityGuide() {
  const location = useLocation();
  const routerNavigate = useNavigate();
  const [backgroundLocation, setBackgroundLocation] = useState(null);
  
  // Data
  const data = useDataStore(useShallow(s => ({
    events: s.events, setEvents: s.setEvents, promos: s.promos, setPromos: s.setPromos, coupons: s.coupons, setCoupons: s.setCoupons, banners: s.banners, setBanners: s.setBanners,
    reviews: s.reviews, setReviews: s.setReviews, cats: s.cats, setCats: s.setCats, cities: s.cities, setCities: s.setCities, wallet: s.wallet, setWallet: s.setWallet, claimedCoupons: s.claimedCoupons,
    dbReady: s.dbReady, setDbReady: s.setDbReady, dbError: s.dbError, setDbError: s.setDbError, mapPins: s.mapPins, setMapPins: s.setMapPins, myBizList: s.myBizList, setMyBizList: s.setMyBizList,
    globalFavCounts: s.globalFavCounts, setGlobalFavCounts: s.setGlobalFavCounts, loadData: s.loadData, loadMapPins: s.loadMapPins, loadMyBiz: s.loadMyBiz
  })));
  const {
    events, setEvents, promos, setPromos, coupons, setCoupons, banners, setBanners,
    reviews, setReviews, cats, setCats, cities, setCities, wallet, setWallet, claimedCoupons,
    dbReady, setDbReady, dbError, setDbError, mapPins, setMapPins, myBizList, setMyBizList,
    globalFavCounts, setGlobalFavCounts, loadData, loadMapPins, loadMyBiz
  } = data;

  // Auth
  const { user, setUser, authChecked, setAuthChecked, profile, setProfile, showAuth, setShowAuth, authMode, setAuthMode, authForm, setAuthForm, authLoading, authErr, setAuthErr, handleAuth, handleSignOut } = useAuthStore(useShallow(s => ({ user: s.user, setUser: s.setUser, authChecked: s.authChecked, setAuthChecked: s.setAuthChecked, profile: s.profile, setProfile: s.setProfile, showAuth: s.showAuth, setShowAuth: s.setShowAuth, authMode: s.authMode, setAuthMode: s.setAuthMode, authForm: s.authForm, setAuthForm: s.setAuthForm, authLoading: s.authLoading, authErr: s.authErr, setAuthErr: s.setAuthErr, handleAuth: s.handleAuth, handleSignOut: s.handleSignOut })));
  // UI
  const initialView = (() => {
    const p = window.location.pathname;
    if (p.startsWith("/mapa")) return "map";
    if (p.startsWith("/eventos")) return "events";
    if (p.startsWith("/mis-planes")) return "mis-planes";
    if (p.startsWith("/cuenta")) return "account";
    if (p.startsWith("/admin_notifs")) return "admin_notifs";
    if (p.startsWith("/admin")) return "admin";
    if (p.startsWith("/planes")) return "plans";
    if (p.startsWith("/plan/")) return "mis-planes";
    if (p.startsWith("/about")) return "about";
    if (p.startsWith("/privacy")) return "privacy";
    if (p.startsWith("/terms")) return "terms";
    return "onboarding";
  })();
  const deepLinkHandled = useRef(false);
  const initialParams = useRef((() => {
    const path = window.location.pathname;
    const segments = path.split('/').filter(Boolean);
    const p = new URLSearchParams(window.location.search);
    
    let b = p.get("b") || getIdFromSlug(p.get("lugar"));
    let ev = p.get("ev") || getIdFromSlug(p.get("evento"));
    let manage = p.get("manage");
    let vista = p.get("vista");
    let cat = p.get("cat");
    let planId = p.get("plan");
    let joinToken = p.get("join");
    let currentCity = localStorage.getItem("cg_city_slug") || "";

    if (segments.length === 2) {
      if (segments[0] === "evento") {
        ev = getIdFromSlug(segments[1]);
        if (ev && currentCity && !ev.startsWith(currentCity + "-")) ev = currentCity + "-" + ev;
      } else if (segments[0] === "plan") {
        planId = segments[1];
        vista = "mis-planes";
      } else if (segments[0] === "vista") {
        vista = segments[1];
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
    } else if (segments.length >= 3 && segments[1] === "plan") {
      planId = segments[2];
      vista = "mis-planes";
    } else if (segments.length === 1) {
      if (["mapa", "admin", "mis-planes", "planes", "cuenta", "eventos", "admin_notifs", "user_notifs", "about", "privacy", "terms"].includes(segments[0])) {
        vista = segments[0];
      } else {
        localStorage.setItem("cg_city_slug", segments[0].toLowerCase());
      }
    }
    
    return { b, ev, vista, cat, manage, planId, joinToken, citySlug: localStorage.getItem("cg_city_slug") };
  })());
  const initialBizParam = useRef(initialParams.current.b);
  const initialEvParam = useRef(initialParams.current.ev);
  const initialVistaParam = useRef(initialParams.current.vista);
  const initialManageParam = useRef(initialParams.current.manage);
  const initialPlanParam = useRef(initialParams.current.planId);
  const initialJoinParam = useRef(initialParams.current.joinToken);
  const initialCatParam = useRef(initialParams.current.cat);
  const { view, setView, lastView, setLastView, activeCat, setActiveCat, selected, setSelected, mapPin, setMapPin, showAdmin, setShowAdmin, showPlans, setShowPlans, claimBiz, setClaimBiz, showAddBiz, setShowAddBiz, showGallery, setShowGallery, showMenuGallery, setShowMenuGallery, showSchedule, setShowSchedule, showLocPicker, setShowLocPicker, selectedEvent, setSelectedEvent, activeCity, setActiveCity, showCityPicker, setShowCityPicker, dark, setDark, toast, toast$, setInstallPromptEvent } = useUIStore(useShallow(s => ({ view: s.view, setView: s.setView, lastView: s.lastView, setLastView: s.setLastView, activeCat: s.activeCat, setActiveCat: s.setActiveCat, selected: s.selected, setSelected: s.setSelected, mapPin: s.mapPin, setMapPin: s.setMapPin, showAdmin: s.showAdmin, setShowAdmin: s.setShowAdmin, showPlans: s.showPlans, setShowPlans: s.setShowPlans, claimBiz: s.claimBiz, setClaimBiz: s.setClaimBiz, showAddBiz: s.showAddBiz, setShowAddBiz: s.setShowAddBiz, showGallery: s.showGallery, setShowGallery: s.setShowGallery, showMenuGallery: s.showMenuGallery, setShowMenuGallery: s.setShowMenuGallery, showSchedule: s.showSchedule, setShowSchedule: s.setShowSchedule, showLocPicker: s.showLocPicker, setShowLocPicker: s.setShowLocPicker, selectedEvent: s.selectedEvent, setSelectedEvent: s.setSelectedEvent, activeCity: s.activeCity, setActiveCity: s.setActiveCity, showCityPicker: s.showCityPicker, setShowCityPicker: s.setShowCityPicker, dark: s.dark, setDark: s.setDark, toast: s.toast, toast$: s.toast$, setInstallPromptEvent: s.setInstallPromptEvent })));
  
  
  // --- NATIVE BACK BUTTON & DEEP LINKS (Capacitor) ---
  const viewHistoryRef = useRef([view]);
  
  useEffect(() => {
    // 1. Hardware Back Button Listener
    const backListener = CapApp.addListener('backButton', ({ canGoBack }) => {
      const ui = useUIStore.getState();
      
      // A. Close modals
      if (ui.showGallery || ui.showAddBiz || ui.showMenuGallery || ui.showLocPicker || ui.showPlans || ui.claimBiz || ui.showSchedule) {
        useUIStore.setState({ 
          showGallery: false, showAddBiz: false, showMenuGallery: false, 
          showLocPicker: false, showPlans: false, claimBiz: null, showSchedule: false
        });
        return;
      }
      
      // B. If detail view, go back
      if (ui.view === "detail") {
        const prev = viewHistoryRef.current.length > 1 
          ? viewHistoryRef.current[viewHistoryRef.current.length - 2] 
          : "home";
        viewHistoryRef.current.pop();
        useUIStore.setState({ view: prev, selected: null });
        return;
      }
      
      // C. If not home, go home
      if (ui.view !== "home" && ui.view !== "inicio") {
        viewHistoryRef.current = ["home"];
        useUIStore.setState({ view: "home" });
        return;
      }
      
      // D. Exit app if on home
      CapApp.exitApp();
    });

    // 2. Deep Link Listener for Supabase OAuth Callback
    const appUrlOpenListener = CapApp.addListener('appUrlOpen', async (event) => {
      // Supabase OAuth redirects back to mx.citymap.app://login or https://citymap.mx/login
      if (event.url.includes('citymap.mx') || event.url.includes('mx.citymap.app')) {
        try {
          const { Browser } = await import('@capacitor/browser');
          await Browser.close();
        } catch (e) {}
        const success = await sb.setSessionFromUrl(event.url);
        if (success) {
          // Force reload user session
          const u = await sb.getUser();
          if (u) {
            useAuthStore.setState({ user: u, authChecked: true });
            window.location.reload();
          }
        }
      } else if (event.url.startsWith('https://citymap.mx')) {
        const { Capacitor } = await import('@capacitor/core');
        if (Capacitor.getPlatform() === 'web') return; // Web handles its own URL natively

        const url = new URL(event.url);
        const path = url.pathname + url.search;
        if (path && path !== '/') {
          // On mobile, just replace location to trigger standard app routing/parsing
          window.location.href = path;
        }
      }
    });

    return () => {
      backListener.then(l => l.remove());
      appUrlOpenListener.then(l => l.remove());
    };
  }, []);

  // Track view changes in the history ref for Android back button
  useEffect(() => {
    if (view !== viewHistoryRef.current[viewHistoryRef.current.length - 1]) {
      viewHistoryRef.current.push(view);
      if (viewHistoryRef.current.length > 20) viewHistoryRef.current = viewHistoryRef.current.slice(-10);
    }
  }, [view]);
  // ------------------------------------

  // --- PUSH NOTIFICATIONS ---
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    
    PushNotifications.requestPermissions().then(result => {
      if (result.receive === 'granted') {
        PushNotifications.register();
      }
    });

    const regListener = PushNotifications.addListener('registration', async (token) => {
      console.log('Push token: ' + token.value);
      try {
        const u = useAuthStore.getState().user;
        if (!u?.id) return; // Esperar a que el usuario inicie sesión
        
        localStorage.setItem('cg_push_token', token.value);

        // Registrar el token de forma segura en el backend (elimina tokens huérfanos de otros usuarios en este dispositivo)
        await fetch(`https://citymap.mx/api/register-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: token.value, user_id: u.id })
        });
      } catch (err) {
        console.error("Error saving token:", err);
      }
    });

    const recvListener = PushNotifications.addListener('pushNotificationReceived', (notification) => {
      useUIStore.getState().toast$(notification.title + ': ' + notification.body);
    });

    // Cuando el usuario TOCA la notificación (app en background o cerrada)
    const actionListener = PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const deepLink = action.notification?.data?.deepLink;
      if (deepLink) {
        // Convertir la URL a una ruta relativa para el router interno
        try {
          const url = new URL(deepLink);
          routerNavigate(url.pathname);
        } catch (e) {
          console.error('Deep link error:', e);
        }
      }
    });

    return () => {
      regListener.remove();
      recvListener.remove();
      actionListener.remove();
    };
  }, []);

  // --- IN-APP REALTIME NOTIFICATIONS (POLLING) ---
  const lastNotifCheckRef = useRef(new Date().toISOString());
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      try {
        const notifs = await sb.get("notifications", `?user_id=eq.${user.id}&read=eq.false&created_at=gt.${lastNotifCheckRef.current}&order=created_at.desc`);
        if (notifs && notifs.length > 0) {
          lastNotifCheckRef.current = new Date().toISOString();
          
          // Play a short chime sound
          try {
            const audio = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
            audio.volume = 0.5;
            audio.play();
          } catch(e) {}
          
          // Show toast for the most recent one
          const latest = notifs[0];
          useUIStore.getState().toast$(latest.title + ': ' + latest.body);
        }
      } catch (err) {
        // ignore network errors on background poll
      }
    }, 15000); // Check every 15 seconds

    return () => clearInterval(interval);
  }, [user]);

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
  const { search, setSearch, nearbyRadius, setNearbyRadius, nearbyFilter, setNearbyFilter, fade, setFade, navbarVisible, setNavbarVisible, showMoreTopRated, setShowMoreTopRated, showMoreTopFavs, setShowMoreTopFavs, showLocModal, setShowLocModal } = useUIStore();
  const { ownerRes, setOwnerRes, ownerView, setOwnerView, storeAdminBiz, setStoreAdminBiz, adminStoreBiz, setAdminStoreBiz, ownerStats, setOwnerStats } = useDataStore();

  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [createEvForm, setCreateEvForm] = useState({ title: "", description: "", date: "", time: "", end_date: "", end_time: "", price_type: "gratis", price: "", event_category: "", venue_name: "", venue_address: "", whatsapp: "", img_url: "" });
  const [savedEventIds, setSavedEventIds] = useState(() => { try { return JSON.parse(localStorage.getItem("cg_saved_ev") || "[]"); } catch { return []; } });
  const [addBizForm, setAddBizForm] = useState({ name: "", category: "", emoji: "", description: "", address: "", phone: "", whatsapp: "", website: "", video_url: "", lat: "", lng: "", photos: [], facebook: "", instagram: "", tiktok: "", schedule: {} });
  const [editBizId, setEditBizId] = useState(null);
  
  const [activeTab, setActiveTab] = useState("descubrir");
  const [mapQ, setMapQ] = useState("");
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
  
  const { city, setCity, locating, setLocating, userCoords, setUserCoords, detectedTown, setDetectedTown, detectedState, setDetectedState, getKm, detectCity, handleCitySelect } = useGeolocation({ cities, mapPins, toast$, setActiveCity: (s) => { setActiveCity(s); loadData(s); if (view === "home" || view === "onboarding") { routerNavigate(`/${s}`, { replace: true }); } } });
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
  const cityTz = cities.find(c => c.slug === activeCity)?.timezone || CITY_TZ[activeCity] || "America/Mexico_City";
  if (typeof window !== "undefined") {
    window.CITY_TZ = cityTz;
  }
  const isOpen = useCallback(b => isOpenNow(b, cityTz), [cityTz]);



  const loadReviews = useCallback(async bizId => { if (!bizId) return; try { const r = await sb.get("reviews", `?biz_id=eq.${bizId}&order=created_at.desc`); setReviews(r); } catch { setReviews([]); }; }, []);


  const { trackEvent, goDir, callPhone, goWhatsApp, goWeb, doShare } = useInteractions({ activeCity, sb, toast$ });
  const {
    reviewText, setReviewText, reviewStar, setReviewStar, showReview, setShowReview,
    reviewImgFile, setReviewImgFile, reviewImgLoading, setReviewImgLoading,
    showBooking, setShowBooking, bookingForm, setBookingForm, bookingLoading, setBookingLoading,
    submitBooking, postReview, toggleLikeReview, doClaim
  } = useBusinessActions({ sb, user, profile, toast$, setShowAuth, setMapPins, setSelected, loadReviews, reviews, setReviews });

  // useAppInit will be called further down, after `navigate` is defined.

  useEffect(() => { localStorage.setItem("cg_dark", dark); }, [dark]);

  // SEO meta & JSON-LD structured data update
  useEffect(() => {
    const CAT_SEO = {
      restaurantes: { title: "Los Mejores Restaurantes en {city} — Horarios y Reseñas", desc: "Encuentra los mejores restaurantes en {city}. Consulta menús, horarios, ubicaciones y reseñas de clientes. ¡Descubre dónde comer hoy!", label: "Restaurantes" },
      cafe:         { title: "Las Mejores Cafeterías en {city} — Menús y Horarios", desc: "Descubre las mejores cafeterías en {city}. Coffee shops, postres, ambiente y horarios actualizados. Tu próximo café favorito te espera.", label: "Cafeterías" },
      salud:        { title: "Salud y Bienestar en {city} — Clínicas, Doctores y Más", desc: "Encuentra clínicas, consultorios médicos, farmacias y centros de bienestar en {city}. Horarios, direcciones y reseñas.", label: "Salud y Bienestar" },
      belleza:      { title: "Las Mejores Estéticas y Spas en {city} — Belleza y Cuidado Personal", desc: "Salones de belleza, barberías, spas y estéticas en {city}. Reserva tu cita, consulta precios y encuentra el lugar perfecto para ti.", label: "Belleza y Estética" },
      fitness:      { title: "Los Mejores Gimnasios en {city} — Fitness y Entrenamiento", desc: "Gimnasios, crossfit, yoga y centros deportivos en {city}. Horarios, precios y promociones para ponerte en forma.", label: "Gimnasios y Fitness" },
      compras:      { title: "Las Mejores Tiendas en {city} — Compras y Comercios", desc: "Tiendas, boutiques y comercios en {city}. Encuentra las mejores opciones para tus compras con horarios y ubicaciones exactas.", label: "Tiendas y Compras" },
      tech:         { title: "Tecnología y Servicios Digitales en {city} — Tiendas y Reparación", desc: "Tiendas de tecnología, reparación de celulares, cómputo y servicios digitales en {city}. Encuentra lo que necesitas.", label: "Tecnología" },
      ocio:         { title: "Entretenimiento y Ocio en {city} — Bares, Antros y Diversión", desc: "Los mejores bares, antros, centros de entretenimiento y diversión en {city}. Horarios, eventos especiales y reseñas.", label: "Entretenimiento y Ocio" },
      hoteles:      { title: "Los Mejores Hoteles en {city} — Hospedaje y Alojamiento", desc: "Hoteles, posadas, Airbnb y hospedaje en {city}. Compara opciones, consulta precios y reserva tu estancia ideal.", label: "Hoteles y Hospedaje" },
      educacion:    { title: "Escuelas y Educación en {city} — Colegios, Cursos y Más", desc: "Escuelas, universidades, academias y cursos en {city}. Encuentra opciones educativas con horarios e información de contacto.", label: "Educación" },
    };
    const cityName = city || activeCity || "tu ciudad";
    const cityCapitalized = cityName.charAt(0).toUpperCase() + cityName.slice(1);
    
    let title = `CityMap ${cityCapitalized} — Restaurantes, Cafés y Negocios Locales`;
    let desc = `Descubre los mejores restaurantes, cafés, eventos y negocios en ${cityCapitalized}. Horarios actualizados, ubicaciones exactas, reseñas y cupones exclusivos.`;
    let image = "https://citymap.mx/og-image.jpg";
    let schemaJson = "";
    let canonical = `https://citymap.mx/${activeCity || "tepic"}`;

    if (selected?.id) {
      // Reviews will be fetched joined with the business in DetailView.jsx
      if (!selected._fullFetched) {
        setReviews([]);
      }
      
      const bizCity = selected.city_slug || activeCity || "tepic";
      const bizCityName = bizCity.charAt(0).toUpperCase() + bizCity.slice(1).replace(/-/g, " ");
      const catName = (CAT_SEO[selected.category] || {}).label || selected.type || "Negocio";
      
      // Rich title: "Mariscos El Cadopez — Menú, Horarios y Reseñas en Tepic | CityMap"
      title = `${selected.name} — ${catName} en ${bizCityName} | CityMap`;
      desc = selected.description 
        ? selected.description.slice(0, 155) + (selected.description.length > 155 ? "…" : "")
        : `Visita ${selected.name} en ${bizCityName}. Consulta horarios, menú, ubicación exacta, reseñas y promociones exclusivas en CityMap.`;
      if (selected.photos?.[0]?.url) image = selected.photos[0].url;
      
      const slug = selected.slug || "";
      canonical = `https://citymap.mx/${bizCity}/${slug.startsWith(bizCity + "-") ? slug.slice(bizCity.length + 1) : slug}`;
      
      const businessSchema = {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "name": selected.name,
        "image": selected.photos?.map(p => p.url) || [],
        "description": selected.description || `${selected.name} en ${bizCityName}`,
        "telephone": selected.phone || selected.whatsapp || "",
        "url": canonical,
        "address": { 
          "@type": "PostalAddress", 
          "streetAddress": selected.address || "", 
          "addressLocality": bizCityName, 
          "addressRegion": "Nayarit",
          "addressCountry": "MX" 
        },
        "geo": selected.lat ? { "@type": "GeoCoordinates", "latitude": parseFloat(selected.lat), "longitude": parseFloat(selected.lng) } : undefined,
        "priceRange": "$$"
      };
      if (selected.review_count > 0 && selected.rating) {
        businessSchema.aggregateRating = {
          "@type": "AggregateRating",
          "ratingValue": String(selected.rating),
          "reviewCount": String(selected.review_count),
          "bestRating": "5"
        };
      }
      // Add opening hours if available
      if (selected.schedule && typeof selected.schedule === "object") {
        const dayMap = { lun: "Monday", mar: "Tuesday", mie: "Wednesday", jue: "Thursday", vie: "Friday", sab: "Saturday", dom: "Sunday" };
        const hours = [];
        for (const [key, val] of Object.entries(selected.schedule)) {
          if (key === "type" || !val || /cerrado/i.test(val)) continue;
          if (dayMap[key]) hours.push(`${dayMap[key]} ${val}`);
        }
        if (hours.length > 0) businessSchema.openingHours = hours;
      }
      schemaJson = JSON.stringify(businessSchema);
      
    } else if (selectedEvent?.id) {
      title = `${selectedEvent.title} — Evento en ${cityCapitalized} | CityMap`;
      desc = selectedEvent.description 
        ? selectedEvent.description.slice(0, 155) + (selectedEvent.description.length > 155 ? "…" : "")
        : `No te pierdas ${selectedEvent.title} en ${cityCapitalized}. Fecha, ubicación, precios y todos los detalles en CityMap.`;
      if (selectedEvent.image) image = selectedEvent.image;
      canonical = `https://citymap.mx/evento/${selectedEvent.slug || selectedEvent.id}`;
      
      schemaJson = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Event",
        "name": selectedEvent.title,
        "startDate": selectedEvent.date_start,
        "endDate": selectedEvent.date_end || selectedEvent.date_start,
        "location": { "@type": "Place", "name": selectedEvent.venue_name || selectedEvent.location || cityCapitalized, "address": { "@type": "PostalAddress", "addressLocality": cityCapitalized, "addressCountry": "MX" } },
        "image": selectedEvent.image ? [selectedEvent.image] : [],
        "description": selectedEvent.description || "",
        "eventStatus": "https://schema.org/EventScheduled",
        "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode"
      });
    } else {
      // Category-specific titles for SEO
      if (activeCat && activeCat !== "explorar" && CAT_SEO[activeCat]) {
        const catInfo = CAT_SEO[activeCat];
        title = catInfo.title.replace(/\{city\}/g, cityCapitalized) + " | CityMap";
        desc = catInfo.desc.replace(/\{city\}/g, cityCapitalized);
        canonical = `https://citymap.mx/${activeCity}/${activeCat}`;
        
        // ItemList schema for category pages
        const catBiz = (mapPins || []).filter(b => b.category === activeCat).slice(0, 10);
        if (catBiz.length > 0) {
          schemaJson = JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": `${catInfo.label} en ${cityCapitalized}`,
            "numberOfItems": catBiz.length,
            "itemListElement": catBiz.map((b, i) => ({
              "@type": "ListItem",
              "position": i + 1,
              "name": b.name,
              "url": `https://citymap.mx/${b.city_slug || activeCity}/${(b.slug || "").replace(new RegExp("^" + (b.city_slug || activeCity) + "-"), "")}`
            }))
          });
        }
      } else if (view === "events" || view === "eventos") {
        title = `Eventos y Conciertos en ${cityCapitalized} — Cartelera Actualizada | CityMap`;
        desc = `Descubre los próximos eventos, conciertos, festivales y actividades en ${cityCapitalized}. Fechas, precios y ubicaciones en CityMap.`;
        canonical = "https://citymap.mx/eventos";
      } else if (view === "map" || view === "mapa") {
        title = `Mapa de Negocios en ${cityCapitalized} — Encuentra Lugares Cercanos | CityMap`;
        desc = `Explora el mapa interactivo de ${cityCapitalized}. Encuentra restaurantes, cafés y negocios cercanos a ti con horarios y reseñas.`;
        canonical = "https://citymap.mx/mapa";
      } else if (view === "mis-planes") {
        title = `Mis Planes y Salidas — CityMap ${cityCapitalized}`;
        desc = `Tus itinerarios y salidas guardadas en CityMap. Organiza tus visitas a negocios y restaurantes en ${cityCapitalized}.`;
        canonical = "https://citymap.mx/mis-planes";
      } else if (view === "account") {
        title = `Mi Cuenta — CityMap`;
        desc = `Gestiona tu perfil, favoritos y reseñas en CityMap.`;
        canonical = "https://citymap.mx/cuenta";
      } else {
        // Home
        canonical = `https://citymap.mx/${activeCity || "tepic"}`;
        schemaJson = JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "CityMap",
          "url": "https://citymap.mx/",
          "description": desc,
          "potentialAction": {
            "@type": "SearchAction",
            "target": "https://citymap.mx/?buscar={search_term_string}",
            "query-input": "required name=search_term_string"
          }
        });
      }
    }

    document.title = title;
    const setMeta = (selector, content) => {
      let el = document.querySelector(selector);
      if (el) el.setAttribute("content", content);
    };
    
    setMeta('meta[name="description"]', desc);
    setMeta('meta[property="og:title"]', title);
    setMeta('meta[property="og:description"]', desc);
    setMeta('meta[property="og:image"]', image);
    setMeta('meta[property="og:url"]', canonical);
    setMeta('meta[name="twitter:title"]', title);
    setMeta('meta[name="twitter:description"]', desc);
    setMeta('meta[name="twitter:image"]', image);
    
    // Update canonical link
    let canonicalEl = document.querySelector('link[rel="canonical"]');
    if (!canonicalEl) {
      canonicalEl = document.createElement("link");
      canonicalEl.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute("href", canonical);

    let script = document.getElementById("json-ld-schema");
    if (!script) { 
      script = document.createElement("script"); 
      script.id = "json-ld-schema"; 
      script.type = "application/ld+json"; 
      document.head.appendChild(script); 
    }
    script.innerText = schemaJson;
  }, [selected, selectedEvent, city, view, activeCat, activeCity, mapPins, loadReviews]);

  // ── HISTORY API & NAVIGATION ──────────────────────────────────────────────
  const navigate = v => { 
    let path = `/${activeCity}`;
    if (v === "map" || v === "mapa") path = "/mapa";
    else if (v === "events" || v === "eventos") path = "/eventos";
    else if (v === "mis-planes") path = "/mis-planes";
    else if (v === "admin") path = "/admin";
    else if (v === "plans" || v === "planes") path = "/planes";
    else if (v === "account" || v === "cuenta") path = "/cuenta";
    else if (v === "about") path = "/about";
    else if (v === "privacy") path = "/privacy";
    else if (v === "terms") path = "/terms";
    else if (v === "admin_notifs") path = "/admin_notifs";
    else if (v === "user_notifs") path = "/user_notifs";

    if (v === "detail" || view === "detail") {
      if (v !== "detail") {
        if (location.pathname !== path) {
          routerNavigate(path);
        } else {
          setView(v);
          setLastView(v);
        }
      } else {
        setView(v);
      }
      return;
    }

    if (v !== view) {
      if (view === "onboarding") {
        setView(v);
        setLastView(v);
        setFade(true);
        window.scrollTo(0, 0);
      }
      routerNavigate(path);
    }
  };

  useEffect(() => {
    const p = location.pathname;
    let v = "home";
    if (p.startsWith("/mapa")) v = "map";
    else if (p.startsWith("/eventos")) v = "events";
    else if (p.startsWith("/mis-planes")) v = "mis-planes";
    else if (p.startsWith("/cuenta")) v = "account";
    else if (p.startsWith("/admin_notifs")) v = "admin_notifs";
    else if (p.startsWith("/admin")) v = "admin";
    else if (p.startsWith("/planes")) v = "plans";
    else if (p.startsWith("/about")) v = "about";
    else if (p.startsWith("/privacy")) v = "privacy";
    else if (p.startsWith("/terms")) v = "terms";
    else if (p.startsWith("/user_notifs")) v = "user_notifs";
    else {
      // Could be detail or home
      const parts = p.split('/').filter(Boolean);
      if (parts.length > 1 && parts[0] !== "evento") {
        if (location.state?.isDetail) v = "detail";
      } else if (parts[0] === "evento") {
        if (location.state?.isDetail) v = "detail";
      }
    }

    if (v !== view && view !== "onboarding") {
      if (v === "detail" || view === "detail") {
        setView(v);
        if (v !== "detail") {
          setLastView(v);
          if (location.state?.fromSync !== true) {
             setSelected(null);
             setSelectedEvent(null);
          }
        }
      } else {
        setView(v);
        setLastView(v);
        setFade(true);
        window.scrollTo(0, 0);
      }
    }
  }, [location.pathname, location.state]);

  useEffect(() => {
    if (selected) {
      const slug = cleanCityPrefix(selected.slug || createSlug(selected.name), selected.city_slug || activeCity);
      const targetPath = `/${selected.city_slug || activeCity}/${slug}`;
      if (location.pathname !== targetPath) {
        routerNavigate(targetPath, { state: { isDetail: true, fromSync: true } });
      }
    } else if (view === "detail" && lastView === "home") {
       // Handled by close button logic
    }
  }, [selected]);

  useEffect(() => {
    if (selectedEvent) {
      const targetPath = `/evento/${createSlug(selectedEvent.title)}_${selectedEvent.id}`;
      if (location.pathname !== targetPath) {
        routerNavigate(targetPath, { state: { isDetail: true, fromSync: true } });
      }
    }
  }, [selectedEvent]);

  useAppInit({
    sb, user, setUser, profile, setProfile, loadFavs, loadMyBiz, loadData, activeCity, view, navigate, routerNavigate,
    initialManageParam, initialBizParam, initialEvParam, initialJoinParam, initialPlanParam, initialVistaParam, initialCatParam,
    setActiveCat, setSelected, setSelectedEvent, setAuthChecked, deepLinkHandled, setOwnerView
  });

  const handleCardTap = useCallback((b) => {
    setSelected(b);
    setView("detail");
    trackEvent(b.id, "view");
  }, [trackEvent]);

  const doAuth = async () => {
    const uid = await handleAuth();
    if (uid) {
      await loadFavs(uid);
      setShowAuth(false);
      toast$("Bienvenido a CityMap");
    }
  };
  const doSignOut = async () => { await handleSignOut(); setFavIds([]); navigate("home"); toast$("Sesión cerrada"); };

  const isAdmin = profile?.role === "admin";
  const requestLocation = async () => { 
    try {
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setUserCoords(coords);
      localStorage.setItem("cg_coords", JSON.stringify(coords));
    } catch (e) {
      // Ignored on fail
    }
  };
  useEffect(() => {
    const cachedCity = localStorage.getItem("cg_city_slug");

    if (!cachedCity && cities.length > 0) {
      const setDefaultCity = () => {
        const defaultCity = cities.find(c => c.slug === "tepic") || cities[0];
        if (defaultCity) {
          const displayName = defaultCity.state ? `${defaultCity.name}, ${defaultCity.state}` : defaultCity.name;
          setActiveCity(defaultCity.slug);
          localStorage.setItem("cg_city_slug", defaultCity.slug);
          localStorage.setItem("cg_city_name", displayName);
          loadData(defaultCity.slug);
        }
      };

      detectCity({ 
        showToast: false, 
        onDone: (slug) => {
          loadData(slug);
        },
        onError: setDefaultCity
      });
    } else if (cachedCity && cities.length > 0) {
      // Auto-update location if permission was previously granted AND user hasn't manually locked city
      if (!localStorage.getItem("cg_manual_city")) {
        Geolocation.checkPermissions().then(result => {
          if (result.location === 'granted') {
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
      if (userCoords && userCoords.lat && userCoords.lng) {
        const linkedBiz = mapPins.find(biz => biz.id === b.business_id);
        return isNear(linkedBiz || b, userCoords, activeCity);
      }
      return b.city_slug === activeCity;
    });
  }, [banners, activeCity, detectedTown, userCoords, mapPins]);

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (userCoords && userCoords.lat && userCoords.lng) {
        const linkedBiz = mapPins.find(biz => biz.id === e.business_id);
        return isNear(linkedBiz || e, userCoords, activeCity);
      }
      return e.city_slug === activeCity;
    });
  }, [events, activeCity, detectedTown, userCoords, mapPins]);

  const filteredBiz = useMemo(() => {
    let filtered = mapPins.filter(b => b.status === "approved");
    
    // Si hay GPS, filtra por radio de distancia. Si no, por ciudad activa.
    filtered = filtered.filter(b => isNear(b, userCoords, activeCity));

    if (activeCat && activeCat !== "todas" && activeCat !== "explorar") {
      filtered = filtered.filter(b => b.category === activeCat);
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
    
    return [...filtered].sort((a, b) => {
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
    .tb{position:fixed;bottom:72px;left:50%;transform:translateX(-50%);background:${T.text};color:${T.bg};padding:12px 22px;border-radius:40px;font-size:14px;font-weight:600;z-index:999;white-space:nowrap;animation:fadeUp .3s ease;box-shadow:0 8px 24px rgba(0,0,0,.3);}
    .ov{position:fixed;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(8px);z-index:99999;display:flex;align-items:flex-start;justify-content:center;padding:40px 16px 20px;}
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



  // ── SPLASH ────────────────────────────────────────────────────────────────
  // Bypass onboarding if user arrived via a shared plan/join link
  const hasDeepLink = !!(initialPlanParam.current || initialJoinParam.current);
  if (view === "onboarding" && !hasDeepLink) {
    return <SplashScreen navigate={navigate} T={T} />;
  }

  return (
    <>
      <div style={{ fontFamily: "'DM Sans',system-ui,sans-serif", background: T.bg, minHeight: "100vh", width: "100%", position: "relative", transition: "background .3s" }}>
        {/* Center column on desktop */}
        <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", position: "relative", background: T.bg, boxShadow: "0 0 60px rgba(0,0,0,.08)" }}>
        <style>{css}</style>

        {toast && <div className="tb">{toast}</div>}

        {/* ── GLOBAL GLASS NAVBAR (Fixed, home only) ── */}
        {view === "home" && (
          <div style={{ position: "fixed", top: 0, left: "50%", transform: `translateX(-50%) translateY(${navbarVisible ? "0" : "-100%"})`, width: "100%", maxWidth: 480, height: 48, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 20px", zIndex: 998, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.08)", transition: "transform 0.35s cubic-bezier(0.4,0,0.2,1)" }}>
            <div style={{ pointerEvents: "none", display: "flex", alignItems: "center" }}>
              <img src="/citymap.mx.png" alt="CityMap" style={{ height: 36, objectFit: "contain" }} />
            </div>
            <button className="press" onClick={() => setShowCityPicker(true)} style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 100, padding: "6px 14px", display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: "#fff", fontSize: 13, fontWeight: 700, transition: "background 0.2s" }}>
              <Icon name="pin" size={14} color="#fff" />
              <span style={{ maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", transform: "translateY(1px)" }}>{detectedTown || (city || "").split(",")[0]}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
          </div>
        )}

        {showCityPicker && <Suspense fallback={<LoaderFallback/>}><CityPicker current={activeCity} cities={cities} onSelect={handleCitySelect} onClose={() => setShowCityPicker(false)} onDetectCity={() => { if (!locating) detectCity({ showToast: true }); setShowCityPicker(false); }} locating={locating} T={T} /></Suspense>}
        {showAdmin && <Suspense fallback={<LoaderFallback/>}><AdminPanel onClose={() => { setShowAdmin(false); loadData(); }} onToast={toast$} T={T} onOpenStoreAdmin={(biz) => setAdminStoreBiz(biz)} /></Suspense>}
        {adminStoreBiz && <Suspense fallback={<LoaderFallback/>}><StoreAdminPanel business={adminStoreBiz} onClose={() => setAdminStoreBiz(null)} T={T} /></Suspense>}
        {showPlans && <Suspense fallback={<LoaderFallback/>}><PlansPage T={T} onClose={() => setShowPlans(false)} myBizList={myBizList} onAddBiz={() => { if (!user) { setShowAuth(true); return; } setShowPlans(false); setShowAddBiz(true); }} /></Suspense>}
        {claimBiz && <Suspense fallback={<LoaderFallback/>}><ClaimModal biz={claimBiz} user={user} onClaim={doClaim} onClose={() => setClaimBiz(null)} /></Suspense>}

        {/* AUTH */}
        {showAuth && <div className="ov" onClick={() => setShowAuth(false)}><div className="sh" onClick={e => e.stopPropagation()}>
          <div style={{ position: "relative", marginBottom: 28, overflow: "hidden", borderRadius: 16, background: `linear-gradient(135deg, ${T.greenL}, rgba(59, 130, 246, 0.1))` }}>
            <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2))", filter: "blur(15px)" }}></div>
            <div style={{ padding: "24px 20px", display: "flex", alignItems: "center", gap: 16, position: "relative", zIndex: 1 }}>
               <div style={{ width: 56, height: 56, borderRadius: 16, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(0,0,0,0.06)" }}><Icon name="user" size={26} color={T.green} /></div>
               <div>
                 <h2 className="text-2xl" style={{ fontFamily: "'Coolvetica', sans-serif", color: T.text, margin: 0, lineHeight: 1.1 }}>{authMode === "login" ? "¡Hola de nuevo!" : "Únete a CityMap"}</h2>
                 <p className="text-sm" style={{ color: T.sub, margin: "4px 0 0 0", fontWeight: 500 }}>{authMode === "login" ? "Ingresa para acceder a tus favoritos" : "Descubre los mejores lugares locales"}</p>
               </div>
            </div>
          </div>
          {/* Google button */}
          <button className="press" onClick={() => sb.signInWithOAuth('google')} style={{ width: "100%", padding: "14px", background: T.white, border: `1px solid ${T.border}`, borderRadius: 14, fontWeight: 700, fontSize: 15, color: T.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 20, boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}>
            <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.9 2.5 30.3 0 24 0 14.7 0 6.7 5.5 2.9 13.6l7.8 6C12.5 13.1 17.8 9.5 24 9.5z" /><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17z" /><path fill="#FBBC05" d="M10.7 28.4A14.5 14.5 0 0 1 9.5 24c0-1.5.3-3 .7-4.4l-7.8-6A24 24 0 0 0 0 24c0 3.9.9 7.5 2.5 10.8l8.2-6.4z" /><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.2 1.5-5 2.4-8.4 2.4-6.2 0-11.5-4.2-13.4-9.8l-8.2 6.4C6.7 42.5 14.7 48 24 48z" /></svg>
            Continuar con Google
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}><div style={{ flex: 1, height: 1, background: T.border }} /><span className="text-xs" style={{ fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 1 }}>O ingresa con email</span><div style={{ flex: 1, height: 1, background: T.border }} /></div>
          {authErr && <div className="text-sm" style={{ padding: "12px 16px", background: "#FEF2F2", border: "1px solid #FEE2E2", borderRadius: 12, color: "#DC2626", marginBottom: 16, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}><Icon name="info" size={16} color="#DC2626" />{authErr}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {authMode === "register" && (
              <>
                <input className="inp" placeholder="Tu nombre y apellido" value={authForm.name} onChange={e => setAuthForm(f => ({ ...f, name: e.target.value }))} style={{ padding: "14px 16px", borderRadius: 12, border: `1.5px solid ${T.border}`, fontSize: 15, background: T.white, color: T.text, outline: "none" }} />
                <select className="inp" style={{ padding: "14px 16px", borderRadius: 12, border: `1.5px solid ${T.border}`, fontSize: 15, background: T.white, color: T.text, outline: "none", appearance: "none" }} value={authForm.city} onChange={e => setAuthForm(f => ({ ...f, city: e.target.value }))}>
                  <option value="" disabled>Selecciona tu ciudad principal...</option>
                  {cities.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                </select>
              </>
            )}
            <input className="inp" placeholder="Correo electrónico" type="email" value={authForm.email} onChange={e => setAuthForm(f => ({ ...f, email: e.target.value }))} style={{ padding: "14px 16px", borderRadius: 12, border: `1.5px solid ${T.border}`, fontSize: 15, background: T.white, color: T.text, outline: "none" }} />
            <input className="inp" placeholder="Contraseña secreta" type="password" value={authForm.password} onChange={e => setAuthForm(f => ({ ...f, password: e.target.value }))} style={{ padding: "14px 16px", borderRadius: 12, border: `1.5px solid ${T.border}`, fontSize: 15, background: T.white, color: T.text, outline: "none" }} />
          </div>
          <button className="btn-g press" style={{ marginTop: 24, padding: "16px", borderRadius: 14, background: T.green, color: "#fff", fontWeight: 800, fontSize: 15, width: "100%", border: "none", cursor: "pointer", boxShadow: `0 8px 24px ${T.green}55`, opacity: authLoading ? .7 : 1 }} onClick={doAuth} disabled={authLoading}>{authLoading ? "Conectando…" : authMode === "login" ? "Ingresar a mi cuenta" : "Crear mi cuenta gratis"}</button>
          <p className="text-sm" style={{ textAlign: "center", marginTop: 24, color: T.sub }}>{authMode === "login" ? "¿Eres nuevo por aquí? " : "¿Ya eres parte de CityMap? "}<span style={{ color: T.green, fontWeight: 800, cursor: "pointer" }} onClick={() => { setAuthMode(m => m === "login" ? "register" : "login"); setAuthErr(""); }}>{authMode === "login" ? "Regístrate ahora" : "Inicia sesión"}</span></p>
        </div></div>}

        {/* ════ VIEW WRAPPER ════ */}
        <motion.div animate={{ opacity: fade ? 1 : 0 }} transition={{ duration: 0.15, ease: "easeInOut" }}>
          <ErrorBoundary>
            <Suspense fallback={<LoaderFallback/>}>
              {(view === "home" || (view === "detail" && lastView === "home")) && (
                <HomeView 
                  navigate={navigate}
                  handleCardTap={handleCardTap}
                  loadPaginatedBiz={loadPaginatedBiz}
                  hasMore={hasMore}
                  loadingMore={loadingMore}
                  detectCity={detectCity}
                  getKm={getKm}
                  biz={filteredBiz}
                  allNearby={allNearby}
                  cityImg={cityImg}
                />
              )}
              {(view === "map" || (view === "detail" && lastView === "map")) && (
                <MapView 
                  navigate={navigate}
                  allNearby={allNearby}
                />
              )}
              {(view === "mis-planes" || (view === "detail" && lastView === "mis-planes") || view === "plans" || (view === "detail" && lastView === "plans")) && <TripsView T={T} dark={dark} navigate={navigate} mapPins={mapPins} activeCity={activeCity} cities={cities} user={user} profile={profile} initialPlanId={initialPlanParam.current} initialJoinToken={initialJoinParam.current} onInitialPlanOpened={() => { initialPlanParam.current = null; initialJoinParam.current = null; }} />}
              {(view === "events" || (view === "detail" && lastView === "events")) && <EventsView navigate={navigate} />}
              {(view === "account" || (view === "detail" && lastView === "account")) && <AccountView
            user={user} authChecked={authChecked} profile={profile} isAdmin={isAdmin} T={T} dark={dark} setDark={setDark}
            favIds={favIds} reviews={reviews} wallet={wallet} coupons={coupons} claimedCoupons={claimedCoupons}
            biz={mapPins} myBizList={myBizList}
            setShowAdmin={setShowAdmin} setShowPlans={setShowPlans}
            setShowAuth={setShowAuth} setAuthMode={setAuthMode}
            setEditBizId={setEditBizId} setAddBizForm={setAddBizForm}
            setShowAddBiz={setShowAddBiz} setOwnerView={setOwnerView}
            setSelected={setSelected} navigate={navigate}
            doSignOut={doSignOut} toast$={toast$} viewStyle={viewStyle}
            setUser={setUser} setStoreAdminBiz={setStoreAdminBiz}
          />}
          </Suspense>
          {view === "about" && <Suspense fallback={<LoaderFallback/>}><About T={T} onBack={() => navigate("account")} /></Suspense>}
          {view === "privacy" && <Suspense fallback={<LoaderFallback/>}><Privacy T={T} onBack={() => navigate("account")} /></Suspense>}
          {view === "terms" && <Suspense fallback={<LoaderFallback/>}><Terms T={T} onBack={() => navigate("account")} /></Suspense>}
          {view === "admin_notifs" && <Suspense fallback={<LoaderFallback/>}><AdminNotifs T={T} onBack={() => navigate("account")} /></Suspense>}
          {view === "user_notifs" && <Suspense fallback={<LoaderFallback/>}><UserNotifs T={T} user={user} onBack={() => navigate("account")} /></Suspense>}
          </ErrorBoundary>

        {showBooking && selected && (() => {
          const cfg = selected.booking_config || {};
          const services = cfg.services || [];
          const slots = cfg.slots || [];
          const blocked = (cfg.blocked_slots || selected.blocked_slots || []).filter(s => s.date === bookingForm.date).map(s => s.time);
          const blockedDates = cfg.blocked_dates || [];
          const isDateBlocked = blockedDates.includes(bookingForm.date);
          const today = getLocalIsoDate(new Date());
          const ready = bookingForm.service && bookingForm.date && (!isDateBlocked && bookingForm.time) && bookingForm.name.trim();
          return <div className="ov" onClick={() => setShowBooking(false)}>
            <div className="sh" onClick={e => e.stopPropagation()}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: T.border, margin: "0 auto 20px" }} />
              <h2 className="text-xl" style={{ fontFamily: "'Coolvetica', sans-serif", color: T.text, marginBottom: 4 }}>Reservar</h2>
              <p className="text-sm" style={{ color: T.sub, marginBottom: 20 }}>{selected.name}</p>
              {services.length > 0 && <div style={{ marginBottom: 16 }}>
                <div className="text-xs" style={{ fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: .6, marginBottom: 8 }}>Servicio</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {services.map(s => <button key={s} onClick={() => setBookingForm(f => ({ ...f, service: s }))} style={{ padding: "8px 16px", border: `1.5px solid ${bookingForm.service === s ? T.green : T.border}`, borderRadius: 20, fontSize: 13, fontWeight: 600, background: bookingForm.service === s ? T.greenL : T.white, color: bookingForm.service === s ? T.green : T.sub, cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}>{s}</button>)}
                </div>
              </div>}
              <div style={{ marginBottom: 16 }}>
                <div className="text-xs" style={{ fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: .6, marginBottom: 8 }}>Fecha</div>
                <input type="date" min={today} value={bookingForm.date} onChange={e => setBookingForm(f => ({ ...f, date: e.target.value, time: "" }))} style={{ width: "100%", padding: "12px 14px", background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 12, fontSize: 15, color: T.text, fontFamily: "inherit" }} />
              </div>
              {bookingForm.date && slots.length > 0 && <div style={{ marginBottom: 16 }}>
                <div className="text-xs" style={{ fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: .6, marginBottom: 8 }}>Horario</div>
                {isDateBlocked ? (
                  <div className="text-sm" style={{ padding: 12, textAlign: "center", background: "#FEF2F2", color: "#991B1B", borderRadius: 12, fontWeight: 700, border: "1.5px dashed #FCA5A5" }}>
                    Este día no está disponible para reservaciones.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {slots.map(t => {
                      const off = blocked.includes(t)
                      return <button key={t} onClick={() => !off && setBookingForm(f => ({ ...f, time: t }))} disabled={off} style={{ padding: "8px 14px", border: `1.5px solid ${bookingForm.time === t ? T.green : T.border}`, borderRadius: 10, fontSize: 13, fontWeight: 600, background: bookingForm.time === t ? T.greenL : T.white, color: bookingForm.time === t ? T.green : off ? T.border : T.sub, cursor: off ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: off ? 0.4 : 1, transition: "all .15s" }}>{t}</button>
                    })}
                  </div>
                )}
              </div>}
              <div style={{ marginBottom: 20 }}>
                <div className="text-xs" style={{ fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: .6, marginBottom: 8 }}>Tu nombre</div>
                <input className="inp" placeholder="Nombre completo" value={bookingForm.name} onChange={e => setBookingForm(f => ({ ...f, name: e.target.value }))} style={{ marginBottom: 12 }} />
                
                <div className="text-xs" style={{ fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: .6, marginBottom: 8 }}>Notas (Opcional)</div>
                <textarea className="inp" placeholder="Instrucciones adicionales, peticiones especiales..." value={bookingForm.notes || ""} onChange={e => setBookingForm(f => ({ ...f, notes: e.target.value }))} style={{ minHeight: 60, resize: "vertical" }} />
              </div>
              <button className="btn-g press" onClick={submitBooking} disabled={bookingLoading || !ready} style={{ opacity: (bookingLoading || !ready) ? 0.5 : 1, padding: 15 }}>{bookingLoading ? "Enviando..." : "Confirmar reserva"}</button>
            </div>
          </div>
        })()}

        {ownerView && (() => {
          const pendingRes = ownerRes.filter(r => r.status === "pending");
          const bizW = (ownerView.whatsapp || ownerView.phone || "").replace(/\D/g, "");
          return <div className="ov" onClick={() => setOwnerView(null)}>
            <div className="sh" style={{ maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
              <div style={{ position: "relative", paddingBottom: 16 }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, background: T.border, margin: "0 auto" }} />
                <button className="press" onClick={() => setOwnerView(null)} style={{ position: "absolute", top: -8, left: 0, width: 44, height: 44, background: T.iconBg, borderRadius: "50%", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: T.text }}><Icon name="x" size={18} /></button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{ width: 52, height: 52, borderRadius: 12, overflow: "hidden", flexShrink: 0, background: T.border }}>
                  {ownerView.photos?.[0]?.url ? <img src={ownerView.photos[0].url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="store" size={22} color={T.sub} /></div>}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="text-lg" style={{ fontFamily: FONT_BIZ, fontWeight: 800, color: T.text }}>{ownerView.name}</div>
                  <div className="text-xs" style={{ color: T.sub, marginTop: 2 }}>{ownerView.type}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span className={isOpen(ownerView) ? "dot-o" : "dot-c"} />
                  <span className="text-xs" style={{ fontWeight: 700, color: isOpen(ownerView) ? "#16A34A" : T.red }}>{isOpen(ownerView) ? "Abierto" : "Cerrado"}</span>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 18 }}>
                {[["Visitas", ownerStats.views, "#3B82F6"], ["WhatsApp", ownerStats.whatsapp, "#25D366"], ["Reservas", ownerRes.length, T.green]].map(([lbl, val, col]) => <div key={lbl} style={{ background: T.bg, borderRadius: 12, padding: "12px 0", textAlign: "center" }}>
                  <div className="text-xl" style={{ fontWeight: 800, color: col }}>{val}</div>
                  <div className="text-micro" style={{ color: T.sub, fontWeight: 600, textTransform: "uppercase", letterSpacing: .5, marginTop: 2 }}>{lbl}</div>
                </div>)}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: T.white, border: `1.5px solid ${T.border}`, padding: "10px 14px", borderRadius: 12, marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon name="link" size={16} color={T.sub} />
                  <span className="text-xs" style={{ fontWeight: 600, color: T.sub }}>Acceso directo al panel</span>
                </div>
                <button className="press text-xs" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/?manage=${ownerView.id}`); toast$("¡Enlace de administración copiado!"); }} style={{ background: T.bg, padding: "6px 12px", borderRadius: 8, fontWeight: 700, color: T.text, border: "none", cursor: "pointer" }}>
                  Copiar Link
                </button>
              </div>
              <ReservationsAgenda ownerView={ownerView} ownerRes={ownerRes} setOwnerRes={setOwnerRes} />
              {ownerView.plan === "free" && (
                <div onClick={() => { setOwnerView(null); setShowPlans(true); }} style={{ background: "linear-gradient(135deg, #C9A84C, #D4B663)", padding: "14px", borderRadius: 12, marginBottom: 16, cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", gap: 10 }}>
                  <Icon name="award" size={24} color="#fff" />
                  <div style={{ flex: 1 }}>
                    <div className="text-sm" style={{ fontWeight: 800 }}>Sube de nivel tu negocio</div>
                    <div className="text-xs" style={{ fontWeight: 600, opacity: 0.9, marginTop: 2 }}>Desbloquea WhatsApp directo y Menú en PDF.</div>
                  </div>
                  <Icon name="chevron" size={16} color="#fff" />
                </div>
              )}
            </div>
          </div>;
        })()}

        {storeAdminBiz && <Suspense fallback={<LoaderFallback/>}><StoreAdminPanel business={storeAdminBiz} onClose={() => setStoreAdminBiz(null)} T={T} /></Suspense>}

        {/* ════ EVENTOS ════ */}
        {view === "eventos" && <EventsView navigate={navigate} />}

        {/* ════ CREAR EVENTO MODAL ════ */}
        {showCreateEvent && <div className="ov" onClick={() => setShowCreateEvent(false)}>
          <div className="sh" style={{ maxHeight: "92vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: T.border, margin: "0 auto 16px" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
              <div>
                <h2 className="text-xl" style={{ fontFamily: "'Coolvetica', sans-serif", color: T.text, marginBottom: 4 }}>Crear evento</h2>
                <p className="text-sm" style={{ color: T.sub }}>Se publicará tras la aprobación del admin</p>
              </div>
              <button onClick={() => setShowCreateEvent(false)} style={{ width: 44, height: 44, borderRadius: "50%", background: T.border, color: T.text, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}><Icon name="x" size={18} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div className="text-xs" style={{ fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: .6, marginBottom: 6 }}>Imagen del evento</div>
                <Uploader onDone={url => setCreateEvForm(f => ({ ...f, img_url: url }))} />
                {createEvForm.img_url && <img src={createEvForm.img_url} alt="" style={{ width: "100%", height: 110, objectFit: "cover", borderRadius: 10, marginTop: 8 }} loading="lazy" />}
              </div>
              <div><div className="text-xs" style={{ fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: .6, marginBottom: 6 }}>Título</div><input className="inp" placeholder="Nombre del evento" value={createEvForm.title} onChange={e => setCreateEvForm(f => ({ ...f, title: e.target.value }))} /></div>
              <div><div className="text-xs" style={{ fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: .6, marginBottom: 6 }}>Descripción</div><textarea className="inp" placeholder="Describe el evento..." rows={3} value={createEvForm.description} onChange={e => setCreateEvForm(f => ({ ...f, description: e.target.value }))} style={{ resize: "none", height: 80 }} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><div className="text-xs" style={{ fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: .6, marginBottom: 6 }}>Fecha de inicio</div><input type="date" value={createEvForm.date} onChange={e => setCreateEvForm(f => ({ ...f, date: e.target.value }))} style={{ width: "100%", padding: "12px 14px", background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 12, fontSize: 14, color: T.text, fontFamily: "inherit" }} /></div>
                <div><div className="text-xs" style={{ fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: .6, marginBottom: 6 }}>Hora de inicio</div><input type="time" value={createEvForm.time} onChange={e => setCreateEvForm(f => ({ ...f, time: e.target.value }))} style={{ width: "100%", padding: "12px 14px", background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 12, fontSize: 14, color: T.text, fontFamily: "inherit" }} /></div>
                <div><div className="text-xs" style={{ fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: .6, marginBottom: 6 }}>Fecha de fin <span className="text-micro" style={{ opacity: 0.6 }}>(Opcional)</span></div><input type="date" value={createEvForm.end_date} onChange={e => setCreateEvForm(f => ({ ...f, end_date: e.target.value }))} style={{ width: "100%", padding: "12px 14px", background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 12, fontSize: 14, color: T.text, fontFamily: "inherit" }} /></div>
                <div><div className="text-xs" style={{ fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: .6, marginBottom: 6 }}>Hora de fin <span className="text-micro" style={{ opacity: 0.6 }}>(Opcional)</span></div><input type="time" value={createEvForm.end_time} onChange={e => setCreateEvForm(f => ({ ...f, end_time: e.target.value }))} style={{ width: "100%", padding: "12px 14px", background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 12, fontSize: 14, color: T.text, fontFamily: "inherit" }} /></div>
              </div>
              <div><div className="text-xs" style={{ fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: .6, marginBottom: 8 }}>Precio</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {["gratis", "paid"].map(pt => <button key={pt} onClick={() => setCreateEvForm(f => ({ ...f, price_type: pt }))} style={{ flex: 1, padding: "10px 0", border: `1.5px solid ${createEvForm.price_type === pt ? T.green : T.border}`, borderRadius: 10, fontSize: 13, fontWeight: 700, background: createEvForm.price_type === pt ? T.greenL : T.white, color: createEvForm.price_type === pt ? T.green : T.sub, cursor: "pointer", fontFamily: "inherit" }}>{pt === "gratis" ? "Gratis" : "De pago"}</button>)}
                </div>
                {createEvForm.price_type === "paid" && <input className="inp" placeholder="Ej: $200" value={createEvForm.price} onChange={e => setCreateEvForm(f => ({ ...f, price: e.target.value }))} style={{ marginTop: 8 }} />}
              </div>
              <div><div className="text-xs" style={{ fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: .6, marginBottom: 6 }}>Categoría</div>
                <input className="inp" placeholder="Ej: Concierto" value={createEvForm.event_category || ""} onChange={e => setCreateEvForm(f => ({ ...f, event_category: e.target.value }))} />
              </div>
              <div><div className="text-xs" style={{ fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: .6, marginBottom: 6 }}>Nombre del lugar</div><input className="inp" placeholder="Club 24, Tepic Centro..." value={createEvForm.venue_name} onChange={e => setCreateEvForm(f => ({ ...f, venue_name: e.target.value }))} /></div>
              <div><div className="text-xs" style={{ fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: .6, marginBottom: 6 }}>Dirección</div><input className="inp" placeholder="Av. México 123..." value={createEvForm.venue_address} onChange={e => setCreateEvForm(f => ({ ...f, venue_address: e.target.value }))} /></div>
              <div><div className="text-xs" style={{ fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: .6, marginBottom: 6 }}>WhatsApp de contacto</div><input className="inp" placeholder="3111234567" value={createEvForm.whatsapp} onChange={e => setCreateEvForm(f => ({ ...f, whatsapp: e.target.value }))} /></div>
              <div><div className="text-xs" style={{ fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: .6, marginBottom: 6 }}>Sitio web / Boletos <span className="text-micro" style={{ opacity: 0.6 }}>(Opcional)</span></div><input className="inp" placeholder="https://..." value={createEvForm.website || ""} onChange={e => setCreateEvForm(f => ({ ...f, website: e.target.value }))} /></div>
              <button onClick={async () => { 
                if (!createEvForm.title) { toast$("El título es obligatorio"); return; } 
                try { 
                  let baseSlug = createSlug(createEvForm.title);
                  if (!baseSlug.startsWith(activeCity + "-")) baseSlug = `${activeCity}-${baseSlug}`;
                  let newSlug = baseSlug;
                  let counter = 1;
                  while (events.some(e => e.slug === newSlug)) { newSlug = `${baseSlug}-${counter++}`; }
                  
                  await sb.post("events", { ...createEvForm, slug: newSlug, city_slug: activeCity, user_id: user.id, status: "pending", active: false }); 
                  toast$("Evento enviado para revisión"); 
                  setShowCreateEvent(false); 
                  setCreateEvForm({ title: "", description: "", date: "", time: "", end_date: "", end_time: "", price_type: "gratis", price: "", event_category: "", venue_name: "", venue_address: "", whatsapp: "", website: "", img_url: "" }); 
                } catch(e) { 
                  toast$("Error: " + e.message); 
                } 
              }} style={{ padding: 15, background: T.green, border: "none", borderRadius: 14, fontSize: 15, fontWeight: 800, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>Enviar evento</button>
            </div>
          </div>
        </div>}

        {/* ════ DETALLE EVENTO ════ */}
        <AnimatePresence>
        {selectedEvent && (() => {
          const ev = selectedEvent;
          const imgSrc = ev.img_url || ev.img;
          const isSaved = savedEventIds.includes(ev.id);
          const evContactMsg = `Hola, me interesa asistir al evento "${ev.title}".`;
          const evShareMsg = `Échale un vistazo a este evento:`;
          const fmtDate = d => {
            if (!d) return "";
            const [y, m, day] = d.split("-").map(Number);
            const dt = new Date(y, m - 1, day);
            const days = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
            const months = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
            return `${days[dt.getDay()]} ${day} de ${months[m - 1]} del ${y}`;
          };
          const fmtTime = t => {
            if (!t) return "";
            const [h, mn] = t.split(":").map(Number);
            const p = h >= 12 ? "PM" : "AM";
            const h12 = h % 12 || 12;
            return `${h12}:${String(mn).padStart(2, "0")} ${p}`;
          };
          return <div
            key="event-modal"
            style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100dvh", background: T.bg, zIndex: 100000, overflowY: "auto", WebkitOverflowScrolling: "touch" }}
          >
            <div style={{ width: "100%", maxWidth: 460, margin: "0 auto", padding: 0, display: "flex", flexDirection: "column", minHeight: "100%" }}>
              
              {/* --- HERO IMAGE SECTION --- */}
              <div style={{ position: "relative", width: "100%", height: "45vh", minHeight: 300, background: T.border, overflow: "hidden" }}>
                {imgSrc ? (
                  <>
                    <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${imgSrc})`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(20px) brightness(0.6)", transform: "scale(1.1)" }} />
                    <img src={imgSrc} alt="" style={{ position: "relative", width: "100%", height: "100%", objectFit: "contain", zIndex: 1 }} loading="eager" />
                  </>
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#E5E7EB" }}>
                    <Icon name="calendar" size={48} color="#9CA3AF" />
                  </div>
                )}
                
                {/* Floating Back Button */}
                <button onClick={(e) => { e.stopPropagation(); setSelectedEvent(null); }} style={{ position: "absolute", top: "calc(env(safe-area-inset-top, 0px) + 16px)", left: 16, width: 44, height: 44, borderRadius: 22, background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
                  <Icon name="chevron" size={22} color="#fff" style={{ transform: "rotate(180deg)", marginLeft: -2 }} />
                </button>
              </div>

              {/* --- CONTENT CARD (No overlap) --- */}
              <div style={{ position: "relative", zIndex: 2, background: T.bg, padding: "20px 20px 40px", flex: 1, display: "flex", flexDirection: "column" }}>

                <h1 style={{ fontFamily: FONT_BIZ, fontSize: 24, fontWeight: 900, color: T.text, lineHeight: 1.1, marginBottom: ev.event_category ? 4 : 16 }}>{ev.title}</h1>
                
                {ev.event_category && <div style={{ fontSize: 13, fontWeight: 700, color: T.text, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 20 }}>{ev.event_category}</div>}
                
                {/* --- PREMIUM BENTO GRID --- */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 32 }}>
                  
                  {/* Fecha (Large Card) */}
                  {ev.date && (
                    <div style={{ gridColumn: "1 / -1", background: dark ? "rgba(255,255,255,0.04)" : "#fff", border: `1px solid ${T.border}`, borderRadius: 20, padding: 18, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.03)", textAlign: "center" }}>
                      <div style={{ width: 44, height: 44, borderRadius: 14, background: dark ? "#fff" : "#111827", color: dark ? "#000" : "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                        <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", marginTop: -2, letterSpacing: 0.5, opacity: 0.9 }}>
                          {(() => { const [,m] = ev.date.split("-").map(Number); return ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"][m-1]; })()}
                        </span>
                        <span style={{ fontSize: 18, fontWeight: 900, lineHeight: 1, letterSpacing: "-0.5px" }}>{ev.date.split('-')[2]}</span>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: T.sub, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>Fecha y Hora</div>
                        <div style={{ color: T.text, fontSize: 15, fontWeight: 800, letterSpacing: "-0.2px", lineHeight: 1.2 }}>{fmtDate(ev.date)}</div>
                        {ev.time && <div style={{ color: T.sub, fontSize: 13, fontWeight: 600, marginTop: 3 }}>{fmtTime(ev.time)}</div>}
                      </div>
                    </div>
                  )}

                  {/* Ubicación (Half Card) */}
                  {ev.venue_name && (
                    <div style={{ background: dark ? "rgba(255,255,255,0.04)" : "#fff", border: `1px solid ${T.border}`, borderRadius: 20, padding: "16px 12px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.03)", textAlign: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: T.sub }}>
                        <Icon name="pin" size={14} color={T.sub} sw={2.5} />
                        <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.2 }}>Ubicación</span>
                      </div>
                      <div style={{ color: T.text, fontSize: 14, fontWeight: 800, lineHeight: 1.3, letterSpacing: "-0.2px" }}>{ev.venue_name}</div>
                    </div>
                  )}

                  {/* Entradas (Half Card) */}
                  <div style={{ background: dark ? "rgba(255,255,255,0.04)" : "#fff", border: `1px solid ${T.border}`, borderRadius: 20, padding: "16px 12px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.03)", textAlign: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: T.sub }}>
                      <span style={{ fontSize: 14, fontWeight: 900, lineHeight: 1 }}>$</span>
                      <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.2 }}>Entradas</span>
                    </div>
                    <div style={{ color: ev.price_type === "gratis" ? "#16A34A" : T.text, fontSize: 14, fontWeight: 800, lineHeight: 1.3, letterSpacing: "-0.2px" }}>
                      {ev.price_type === "gratis" ? "Gratis" : `Desde ${ev.price || ""}`}
                    </div>
                  </div>

                </div>
                
                {/* Description */}
                {ev.description && (
                  <div style={{ marginBottom: 30 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 12 }}>Acerca del evento</h3>
                    <p className="text-sm" style={{ color: T.sub, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{ev.description}</p>
                  </div>
                )}
                
                <div style={{ flex: 1 }} /> {/* Spacer */}

                {/* --- BUTTONS --- */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {ev.venue_address && (
                      <button onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(ev.venue_address)}`, "_blank")} style={{ padding: "14px 0", background: dark ? "#333" : "#F3F4F6", border: `1px solid ${T.border}`, borderRadius: 16, fontSize: 13, fontWeight: 700, color: T.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all .2s" }}>
                        <Icon name="pin" size={16} color={T.text} /> Cómo llegar
                      </button>
                    )}
                    {ev.whatsapp && (
                      <button onClick={() => window.open(`https://wa.me/${ev.whatsapp.replace(/\D/g,"")}?text=${encodeURIComponent(evContactMsg)}`, "_blank")} style={{ padding: "14px 0", background: "#DCFCE7", border: "none", borderRadius: 16, fontSize: 13, fontWeight: 700, color: "#16A34A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                        <Icon name="whatsapp" size={16} color="#16A34A" /> WhatsApp
                      </button>
                    )}
                  </div>

                  {ev.website && (
                    <button onClick={() => window.open(ev.website.startsWith('http') ? ev.website : `https://${ev.website}`, "_blank")} style={{ width: "100%", padding: "16px 0", background: `linear-gradient(135deg, ${T.text}, ${dark ? "#444" : "#333"})`, border: "none", borderRadius: 16, fontSize: 14, fontWeight: 800, color: T.bg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: `0 4px 16px rgba(0,0,0,${dark ? 0.4 : 0.15})` }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg> Comprar Boletos
                    </button>
                  )}

                  <button onClick={() => { const nw = isSaved ? savedEventIds.filter(x => x !== ev.id) : [...savedEventIds, ev.id]; setSavedEventIds(nw); localStorage.setItem("cg_saved_ev", JSON.stringify(nw)); }} style={{ width: "100%", padding: "16px 0", background: isSaved ? "#FEE2E2" : T.bg, border: `1.5px solid ${isSaved ? "#FCA5A5" : T.border}`, borderRadius: 16, fontSize: 14, fontWeight: 700, color: isSaved ? "#D94F3D" : T.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <Icon name={isSaved ? "heart_f" : "heart"} size={16} color={isSaved ? "#D94F3D" : T.text} />
                    {isSaved ? "Evento guardado en tus planes" : "Guardar en mis planes"}
                  </button>
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button onClick={() => { const evUrl = `https://citymap.mx/evento/${cleanCityPrefix(ev.slug || createSlug(ev.title), activeCity)}_${ev.id}`; if (navigator.share) navigator.share({ title: ev.title, text: evShareMsg, url: evUrl }); else { navigator.clipboard?.writeText(evUrl); toast$("Enlace copiado"); } }} style={{ flex: 1, padding: "12px 0", background: "transparent", border: "none", fontSize: 13, fontWeight: 700, color: T.sub, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <Icon name="share" size={16} color={T.sub} /> Compartir
                  </button>
                  <button onClick={() => { const startStr = ev.date.replace(/-/g, '') + (ev.time ? `T${ev.time.replace(':', '')}00` : ''); const endStr = ev.end_date ? ev.end_date.replace(/-/g, '') + (ev.end_time ? `T${ev.end_time.replace(':', '')}00` : '') : (ev.time ? startStr : startStr + '/' + startStr); const calUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(ev.title)}&dates=${startStr}/${endStr}&details=${encodeURIComponent(ev.description || '')}&location=${encodeURIComponent(ev.venue_address || ev.venue_name || '')}`; window.open(calUrl, "_blank"); }} style={{ flex: 1, padding: "12px 0", background: "transparent", border: "none", fontSize: 13, fontWeight: 700, color: T.sub, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <Icon name="calendar" size={16} color={T.sub} /> Agendar
                  </button>
                </div>
              </div>
            </div>
          </div>;
        })()}
        </AnimatePresence>

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

        </motion.div>

        {/* ════ DETAIL (Independiente para animaciones) ════ */}
        {view === "detail" && selected && <Suspense fallback={<LoaderFallback/>}><DetailView /></Suspense>}

        {/* ════ BOTTOM NAV ════ */}
        <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, width: "100%", backdropFilter: "blur(24px) saturate(180%)", WebkitBackdropFilter: "blur(24px) saturate(180%)", background: T.glassBg, borderTop: `1px solid ${T.glassBorder}`, display: "flex", alignItems: "center", justifyContent: "space-around", padding: "4px 12px", paddingBottom: "calc(4px + env(safe-area-inset-bottom, 8px))", zIndex: 50, boxShadow: `0 -8px 32px rgba(0,0,0,${dark ? .3 : .08})` }}>
          {[{ id: "home", icon: "home", label: "Inicio" }, { id: "mis-planes", icon: "bookmark", label: "Planes" }, { id: "map", icon: "map_svg", label: "Mapa" }, { id: "eventos", icon: "calendar", label: "Eventos" }, { id: "account", icon: "user", label: "Mi Perfil" }].map(n => {
            const isActive = view === n.id || (n.id === "eventos" && view === "events");
            return <motion.button whileTap={{ scale: 0.85 }} key={n.id} onClick={() => { if (n.id === "account" && !user) { setShowAuth(true); return; } navigate(n.id); }} style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "4px 10px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", minWidth: 48 }}>
              {isActive && (
                <motion.div layoutId="activeNavBubble" style={{ position: "absolute", inset: 0, background: dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.05)", borderRadius: 36, zIndex: 0 }} transition={{ type: "spring", bounce: 0.25, duration: 0.5 }} />
              )}
              <div style={{ position: "relative", zIndex: 1, transform: isActive ? "scale(1.28)" : "scale(1)", transition: "transform .35s cubic-bezier(.34,1.56,.64,1)", display: 'flex', alignItems: 'center', justifyContent: 'center', height: 24 }}>
                <Icon name={n.icon} size={20} color={isActive ? T.green : T.sub} sw={1.8} />
              </div>
              <span className="text-micro" style={{ position: "relative", zIndex: 1, fontWeight: 600, color: isActive ? T.green : T.sub, whiteSpace: "nowrap", transition: "color .2s" }}>{n.label}</span>
            </motion.button>;
          })}
        </nav>

        {/* Fullscreen Gallery Modal */}
        {showGallery !== false && (selected || selectedEvent) && (() => {
          const galleryPhotos = selectedEvent && (selectedEvent.img_url || selectedEvent.img) ? [{ url: selectedEvent.img_url || selectedEvent.img, label: "Evento" }] : (selected?.photos?.length > 1 ? selected.photos.slice(1) : selected?.photos || []);
          if (galleryPhotos.length === 0) return null;
          const initialIdx = typeof showGallery === "number" ? showGallery : 0;
          return <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999, background: T.overlay, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", display: "flex", flexDirection: "column" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "16px 20px", display: "flex", justifyContent: "flex-start", zIndex: 10 }}>
              <button className="press" onClick={() => setShowGallery(false)} style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.25)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(12px)", marginTop: 20 }}><Icon name="x" size={24} color="#fff" /></button>
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
          return <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999, background: T.overlay, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", display: "flex", flexDirection: "column" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "16px 20px", display: "flex", justifyContent: "flex-start", zIndex: 10 }}>
              <button className="press" onClick={() => setShowMenuGallery(false)} style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.25)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(12px)", marginTop: 20 }}><Icon name="x" size={24} color="#fff" /></button>
            </div>
            <div style={{ flex: 1, display: "flex", alignItems: "center", width: "100%" }}>
               <Suspense fallback={<div style={{height: "100dvh", width: "100%", background: "#000"}}/>}>
                 <Gallery photos={menuUrls} h="100dvh" fit="contain" bg="transparent" />
               </Suspense>
            </div>
          </div>;
        })()}

        {/* Schedule Modal */}
        {showSchedule && selected && <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999, background: T.overlay, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: T.white, width: "100%", maxWidth: 360, borderRadius: 24, padding: "24px 20px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 className="text-xl" style={{ fontWeight: 800, color: T.text, margin: 0, fontFamily: FONT_BIZ }}>Horarios</h2>
              <button className="press" onClick={() => setShowSchedule(false)} style={{ width: 44, height: 44, borderRadius: "50%", background: T.iconBg, color: T.text, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icon name="x" size={18} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {(!selected.schedule?.type || selected.schedule.type === "regular" || selected.schedule.type === "advanced" || selected.schedule.type === "delivery") ? (
                [["lun", "Lunes"], ["mar", "Martes"], ["mie", "Miércoles"], ["jue", "Jueves"], ["vie", "Viernes"], ["sab", "Sábado"], ["dom", "Domingo"]].map(([k, label], i) => {
                  const formatTimeRange = (raw) => {
                    if (!raw || /cerrado/i.test(raw)) return "Cerrado";
                    return raw.split('\n').map(line => {
                      return line.split(/\s*[–-]\s*|\s+a\s+/i).map(t => {
                        const m = t.trim().match(/(\d{1,2})(?::(\d{2}))?/);
                        if (!m) return t.trim();
                        let h = parseInt(m[1]), mn = m[2] || "00";
                        if (/p\.?m\.?/i.test(t) && h < 12) h += 12;
                        if (/a\.?m\.?/i.test(t) && h === 12) h = 0;
                        const ampm = h >= 12 ? "PM" : "AM";
                        let outH = h % 12 || 12;
                        return `${String(outH).padStart(2,'0')}:${mn} ${ampm}`;
                      }).join(" - ");
                    }).join('\n');
                  };
                  const val = formatTimeRange((selected.schedule || {})[k]);
                  const closed = /cerrado/i.test(val);
                  return <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: i === 6 ? "none" : `1px solid ${T.border}`, paddingBottom: i === 6 ? 0 : 12 }}>
                    <span className="text-sm" style={{ fontWeight: 700, color: T.text }}>{label}</span>
                    <span className="text-sm" style={{ fontWeight: closed ? 700 : 600, color: closed ? T.red : T.sub, whiteSpace: "pre-wrap", textAlign: "right" }}>{val}</span>
                  </div>;
                })
              ) : (
                <div className="text-sm" style={{ color: T.sub, lineHeight: 1.5, fontWeight: 500, textAlign: "center", padding: "20px 0" }}>
                  {selected.schedule.type === "always_open" ? "Siempre Abierto (24/7)" : "Atención por previa cita o servicio. Contacta al negocio para más información."}
                </div>
              )}
            </div>
          </div>
        </div>}

      </div>
    </div>


    {showLocModal && (
      <LocationPermissionModal
        T={T}
        onGranted={(coords) => {
          setUserCoords(coords);
          detectCity({ showToast: false, onDone: (slug) => { loadData(slug); } });
          setShowLocModal(false);
        }}
        onDismiss={() => setShowLocModal(false)}
      />
    )}
    </>
  );
}