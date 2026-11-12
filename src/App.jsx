import CityArrivalSplash from './components/CityArrivalSplash.jsx';
import { isAdminUser } from './lib/adminAccess.js';
const AutoSliderEv = ({ children }) => <div className="scroll-fade-x" style={{display:"flex", overflowX:"auto", gap:10}}>{children}</div>;
import { useState, useRef, useEffect, useCallback, lazy as reactLazy, Suspense, useMemo } from "react";
const lazy = reactLazy;
import { m } from "framer-motion";
import './App.css';
import { sb, cloudUpload } from './lib/supabase.js';
import * as dbService from './services/dbService.js';

import BottomNav from './components/BottomNav.jsx';
import { useAuthStore } from "./store/useAuthStore.js";
import { useShallow } from 'zustand/react/shallow';
import { useDataStore } from './store/useDataStore.js';
import { useUIStore } from './store/useUIStore.js';
import { useGeolocation } from './hooks/useGeolocation.js';
import { useTranslation } from './hooks/useTranslation.js';

const AuthModal = lazy(() => import('./components/AuthModal.jsx'));
const GalleryModals = lazy(() => import('./components/GalleryModals.jsx'));
import { useFavorites } from './hooks/useFavorites.js';
import { useLocation, useNavigate } from 'react-router-dom';
import { CITY_TZ, FONT_BIZ, EVENT_CATS, getT } from './lib/constants.js';
import { searchMatches } from './lib/utils.js';
import { SPRING_UI } from './lib/spring.js';
import { IS_WORLD, buildCityPath, buildBizUrl } from './lib/domain.js';
import { sectionPathForCity, isSectionCityPath } from './lib/sectionRouting.js';
import { eventUrl, resolveEventSlug } from './lib/eventUrls.js';
import { isStayOnInitialPath, resolveHomePath } from './lib/initialRoute.js';
import Icon from './components/ui/Icon.jsx';
import BrandSplash from './components/ui/BrandSplash.jsx';

import { getEventStatus, CAT_EMOJI, isOpenNow, createSlug, parseMenuUrls, cleanCityPrefix, isNear } from './lib/utils.js';
import { bizToForm } from './lib/bizForm.js';
const ClaimModal = lazy(() => import('./components/ClaimModal.jsx'));
const PlanPaymentModal = lazy(() => import('./components/PlanPaymentModal.jsx'));
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
const OwnerStatsView = lazy(() => import("./views/OwnerStatsView.jsx"));
const LoyaltyCardView = lazy(() => import("./views/LoyaltyCardView.jsx"));
const ScanView = lazy(() => import("./views/ScanView.jsx"));
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
import CountryPickerDropdown from "./components/CountryPickerDropdown.jsx";
import CosmicBackground from "./components/ui/CosmicBackground.jsx";

const LoaderFallback = () => <BrandSplash />;
const PAGE_LOAD_SEED = Math.random();


// Clean base URL — strips any accidental /rest/v1 suffix



import { AppContext } from "./context/AppContext.jsx";
const HomeView = lazy(() => import("./views/HomeView.jsx"));
const GlobalHomeView = lazy(() => import("./views/GlobalHomeView.jsx"));
const DetailView = lazy(() => import("./views/DetailView.jsx"));
const MapView = lazy(() => import("./views/MapView.jsx"));
const EventsView = lazy(() => import("./views/EventsView.jsx"));
const ReservationsAgenda = lazy(() => import("./components/ReservationsAgenda.jsx"));
const CreateEventModal = lazy(() => import("./components/modals/CreateEventModal.jsx"));
const EventDetailModal = lazy(() => import("./components/modals/EventDetailModal.jsx"));
const ScheduleModal = lazy(() => import("./components/modals/ScheduleModal.jsx"));

import AutoSlider from './components/ui/sliders/AutoSlider.jsx';
import AppRouter from './router/AppRouter.jsx';
const SideMenu = lazy(() => import('./components/SideMenu.jsx'));


import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { useCapacitorHardwareBack } from './hooks/useCapacitorHardwareBack.js';
import { useCapacitorStatusBar } from './hooks/useCapacitorStatusBar.js';
import { usePushNotifications } from './hooks/usePushNotifications.js';
import { orderBusinessIds, appendBusinessIds, getBusinessQueryState } from './lib/businessListing.js';
import EventReminderPrompt from './components/EventReminderPrompt.jsx';
import { useWebPush } from './hooks/useWebPush.js';
import { useInAppNotifications } from './hooks/useInAppNotifications.js';
import { useAppSEO } from './hooks/useAppSEO.js';
import { useAppInitialization } from './hooks/useAppInitialization.js';
import OfflineScreen from './components/OfflineScreen.jsx';
// Event listing routes already identify their screen and city; startup must preserve them.
const isEventsRoute = (pathname) => {
  const segments = pathname.split('/').filter(Boolean);
  return segments.length >= 1 && segments.length <= 2 && (segments[0] === 'eventos' || segments[0] === 'explorar');
};
import { categoryFromUrl } from './lib/categoryRouting.js';
import { rankTopRated } from './lib/googleRatings.js';
const NON_HOME_PREFIXES = ['/mapa', '/eventos', '/explorar', '/explorer', '/mis-planes', '/revista', '/experiencias', '/tours', '/negocios', '/planes', '/favoritos', '/cuenta', '/itinerarios', '/itinerario', '/plan', '/about', '/privacy', '/terms', '/admin_notifs', '/user_notifs', '/manage', '/stats', '/precios', '/lealtad', '/wallet', '/scan', '/login'];

function isHomePath(pathname) {
  if (pathname === '/') return true;
  if (NON_HOME_PREFIXES.some(p => pathname.startsWith(p))) return false;
  const segments = pathname.split('/').filter(Boolean);
  const maxHomeSegments = IS_WORLD ? 2 : 1;
  return segments.length <= maxHomeSegments;
}

import useThirdPartyScripts from './hooks/useThirdPartyScripts.js';

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
    globalFavCounts: s.globalFavCounts, setGlobalFavCounts: s.setGlobalFavCounts, loadData: s.loadData, loadMapPins: s.loadMapPins, loadMyBiz: s.loadMyBiz, setExperiences: s.setExperiences,
    fetchMoreBiz: s.fetchMoreBiz
  })));
  const {
    events, setEvents, promos, setPromos, coupons, setCoupons, banners, setBanners,
    reviews, setReviews, cats, setCats, cityCats, cities, setCities, wallet, setWallet, claimedCoupons,
    dbReady, setDbReady, dbError, setDbError, mapPins, setMapPins, myBizList, setMyBizList,
    globalFavCounts, setGlobalFavCounts, loadData, loadMapPins, loadMyBiz, setExperiences, fetchMoreBiz
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
  const { activeCat, setActiveCat, selected, setSelected, mapPin, setMapPin, mapFullScreen, showAdmin, setShowAdmin, showPlans, setShowPlans, claimBiz, setClaimBiz, showAddBiz, setShowAddBiz, showGallery, setShowGallery, showMenuGallery, setShowMenuGallery, showSchedule, setShowSchedule, showLocPicker, setShowLocPicker, selectedEvent, setSelectedEvent, activeCity, setActiveCity, showCountryPicker, setShowCountryPicker, dark, setDark, toast, toast$, setInstallPromptEvent, ownerView, setOwnerView } = useUIStore(useShallow(s => ({ activeCat: s.activeCat, setActiveCat: s.setActiveCat, selected: s.selected, setSelected: s.setSelected, mapPin: s.mapPin, setMapPin: s.setMapPin, mapFullScreen: s.mapFullScreen, showAdmin: s.showAdmin, setShowAdmin: s.setShowAdmin, showPlans: s.showPlans, setShowPlans: s.setShowPlans, claimBiz: s.claimBiz, setClaimBiz: s.setClaimBiz, showAddBiz: s.showAddBiz, setShowAddBiz: s.setShowAddBiz, showGallery: s.showGallery, setShowGallery: s.setShowGallery, showMenuGallery: s.showMenuGallery, setShowMenuGallery: s.setShowMenuGallery, showSchedule: s.showSchedule, setShowSchedule: s.setShowSchedule, showLocPicker: s.showLocPicker, setShowLocPicker: s.setShowLocPicker, selectedEvent: s.selectedEvent, setSelectedEvent: s.setSelectedEvent, activeCity: s.activeCity, setActiveCity: s.setActiveCity, showCountryPicker: s.showCountryPicker, setShowCountryPicker: s.setShowCountryPicker, dark: s.dark, setDark: s.setDark, toast: s.toast, toast$: s.toast$, setInstallPromptEvent: s.setInstallPromptEvent, ownerView: s.ownerView, setOwnerView: s.setOwnerView })));
  
  const { t } = useTranslation();

  // --- NATIVE BACK BUTTON & DEEP LINKS (Capacitor) ---
  useCapacitorHardwareBack();
  useCapacitorStatusBar(dark);

  // Track view changes logic removed as it's now handled by react-router history
  // ------------------------------------

  // --- NOTIFICATIONS ---
  usePushNotifications();
  useInAppNotifications();
  const { requestAndRegister: requestWebNotifications } = useWebPush({ citySlug: activeCity, userId: user?.id, enabled: true });


  useEffect(() => {
    if (initialParams.current.citySlug && initialParams.current.citySlug !== activeCity) {
      // La ciudad por defecto no se persiste: si se guardara como
      // "guadalajara", la entrada rápida y la "Segunda entrada" del
      // arranque leerían cg_city_slug y sacarían de "/" a esa ciudad en
      // la primera visita. En memoria sigue valiendo para cargar datos.
      setActiveCity(initialParams.current.citySlug, { persist: !initialParams.current.citySlugIsDefault });
      loadData(initialParams.current.citySlug);
    }
    
    if (initialParams.current.cat && initialParams.current.cat !== activeCat) {
      setActiveCat(initialParams.current.cat);
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
       
      setInstallPromptEvent(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Plan de pago pendiente: cuando alguien elige Destacado/Premium sin tener
  // negocio, el plan queda guardado y el flujo sigue al login o al registro
  // del negocio; al volver, los planes se reabren con ese plan elegido.
  const [pendingPlan, setPendingPlan] = useState(null);
  const pendingPlanHandledRef = useRef(null);
  // Regreso de Stripe: ?success=true o ?canceled=true en la URL.
  const [payStatus, setPayStatus] = useState(null);
  const payReturnRef = useRef(null);
  
  const [activeTab, setActiveTab] = useState("descubrir");
  const [search, setSearch] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("q") || "";
    }
    return "";
  });

  const [mapQ, setMapQ] = useState("");
  const [nearbyRadius, setNearbyRadius] = useState(1);
  const [nearbyFilter, setNearbyFilter] = useState("all"); // "all" | "open"
  const [fade, setFade] = useState(true);
  const [resolvingDeepLink, setResolvingDeepLink] = useState(!!initialParams.current.b || !!initialParams.current.ev);
  const [navbarVisible, setNavbarVisible] = useState(true);
  const [requireCitySelection, setRequireCitySelection] = useState(() => !initialParams.current.citySlug && !["lealtad", "wallet", "scan"].includes(initialView) && window.location.pathname !== "/");
  const [hasOnboarded, setHasOnboarded] = useState(() => localStorage.getItem('citymap_onboarded') === 'true');
  const lastScrollY = useRef(0);
  // Sección pendiente tras elegir ciudad en el muro global: cuando se toca
  // Eventos/Mapa/Revista en "/" se abre el seleccionador y, al elegir la
  // ciudad, se abre esa sección en esa ciudad (no la ciudad guardada).
  const pendingSectionRef = useRef(null);
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

  // Iniciar un plan de pago: con negocio, se abre el modal de pago
  // (PlanPaymentModal);
  // sin negocio, se guarda el plan y se sigue al login o al registro.
  const startPaidPlan = (plan, billing) => {
    setPendingPlan({ key: plan.key, billing });
    if (!user) { setShowPlans(false); setShowAuth(true); return; }
    if (!myBizList?.length) { setShowPlans(false); setShowAddBiz(true); return; }
    setShowPlans(true);
  };

  // Tras el login con un plan pendiente: abrir el registro del negocio
  // (o los planes, si ya tiene uno). Se consulta la lista fresca para no
  // abrir el registro a quien ya tiene negocio.
  useEffect(() => {
    if (!pendingPlan || !user || pendingPlanHandledRef.current === pendingPlan) return;
    pendingPlanHandledRef.current = pendingPlan;
    (async () => {
      const list = await loadMyBiz(user.id);
      if (list?.length) setShowPlans(true);
      else setShowAddBiz(true);
    })();
  }, [user, pendingPlan, loadMyBiz, setShowPlans, setShowAddBiz]);

  // Tras crear el negocio, volver a los planes con el plan elegido.
  useEffect(() => {
    if (!pendingPlan || !myBizList?.length) return;
    setShowPlans(true);
  }, [pendingPlan, myBizList, setShowPlans]);

  // Solo 1 negocio por cuenta: si se abre el registro y el usuario ya
  // tiene un negocio, se abre la edición de su negocio en vez de un
  // registro nuevo. Cubre los puntos que llaman setShowAddBiz directo
  // del store (pie, mapa, muro, estado vacío); /negocios y /cuenta ya lo
  // hacen directo en su propio handler.
  useEffect(() => {
    if (!showAddBiz || editBizId || !user) return;
    const first = myBizList?.[0];
    if (!first) return;
    setEditBizId(first.id);
    setAddBizForm(bizToForm(first));
  }, [showAddBiz, editBizId, user, myBizList, setEditBizId, setAddBizForm]);

  // Regreso de Stripe: leer ?success=true / ?canceled=true una sola vez y
  // limpiar la URL para no repetir el aviso al recargar.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      payReturnRef.current = { success: true, trial: params.get('trial') === '1' };
    } else if (params.get('canceled') === 'true') {
      toast$('Pago cancelado. Tu plan no cambió.');
    } else {
      return;
    }
    window.history.replaceState({}, '', window.location.pathname);
  }, [toast$]);

  // Confirmar el pago al volver: recargar los negocios y ver si el plan ya
  // quedó activo (el webhook puede tardar unos segundos).
  useEffect(() => {
    const ret = payReturnRef.current;
    if (!ret?.success || !user) return;
    payReturnRef.current = null;
    (async () => {
      setPayStatus({ state: 'confirming', trial: ret.trial });
      let plan = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const list = await loadMyBiz(user.id);
        plan = list?.[0]?.plan;
        if (plan === 'pro' || plan === 'elite' || plan === 'destacado' || plan === 'premium') break;
        await new Promise(r => setTimeout(r, 4000));
      }
      if (plan === 'pro' || plan === 'destacado') setPayStatus({ state: 'active', planName: 'Destacado', trial: ret.trial });
      else if (plan === 'elite' || plan === 'premium') setPayStatus({ state: 'active', planName: 'Premium', trial: ret.trial });
      else setPayStatus({ state: 'pending', trial: ret.trial });
    })();
  }, [user, loadMyBiz]);
  
  const { city, setCity, locating, setLocating, userCoords, setUserCoords, detectedTown, setDetectedTown, detectedState, setDetectedState, getKm, detectCity, handleCitySelect } = useGeolocation({ activeCity, cities, mapPins, toast$, setActiveCity: (s) => { const oldPath = buildCityPath(activeCity, cities); const newPath = buildCityPath(s, cities); const isOnHomePath = location.pathname === "/" || location.pathname === `/${activeCity}` || location.pathname === `/${s}` || location.pathname === oldPath || location.pathname === newPath || location.pathname.includes("/c/"); const sectionPath = sectionPathForCity(location.pathname, s); /* La navegación va ANTES de cambiar la ciudad en el store: así el splash «Preparando {ciudad}» se dispara al cambiar citySlug con la sección ya puesta (si fuera al revés, el efecto del splash vería el cambio de ciudad con la ruta vieja y no entraría). */ if (isOnHomePath || requireCitySelection) { routerNavigate(newPath, { replace: true, viewTransition: true }); } else if (sectionPath) { routerNavigate(sectionPath, { replace: true, viewTransition: true }); } setActiveCity(s); loadData(s); } });
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupons, dbReady]);

  const T = getT(dark);
  const cityImg = cities.find(c => c.slug === activeCity)?.bg_image || null;
  // El encabezado de la ciudad tiene la foto de fondo: mientras no se haya
  // hecho scroll, los iconos del encabezado fijo van en blanco para que se vean
  // sobre la foto; al bajar, el encabezado toma fondo sólido y vuelven a su color.
  const onCityHero = Boolean(cityImg) && (location.pathname === `/${activeCity}` || location.pathname.startsWith(`/${activeCity}/c/`));
  const rawTz = cities.find(c => c.slug === activeCity)?.timezone || CITY_TZ[activeCity] || "America/Mexico_City";
  const cityTz = rawTz.includes(";") ? rawTz.split(";")[0] : rawTz;
  if (typeof window !== "undefined") {
    window.CITY_TZ = cityTz;
  }
  const isOpen = useCallback(b => isOpenNow(b, cityTz), [cityTz]);



  // eslint-disable-next-line react-hooks/exhaustive-deps
  const loadReviews = useCallback(async bizId => { if (!bizId) return; try { const r = await dbService.getBusinessReviews(bizId); setReviews(Array.isArray(r) ? r : []); } catch { setReviews([]); }; }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const loadExperienceReviews = useCallback(async expId => { if (!expId) return; try { const r = await dbService.getExperienceReviews(expId); setReviews(Array.isArray(r) ? r : []); } catch { setReviews([]); }; }, []);


  // Track analytics
  const trackEvent = useCallback(async (bizId, type) => {
      try { await dbService.trackAnalyticsEvent(bizId, type, activeCity); } catch (e) { console.error(e); }
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

      // Entrada rápida a la ciudad guardada: decidir ANTES de cargar datos,
      // con la lista de ciudades del caché, para no mostrar el muro segundos
      // mientras carga. Sin hash (el regreso de Google OAuth lo necesita
      // intacto) ni query (los enlaces profundos usan ?b=, ?vista=, etc.).
      // Si no hay caché válido, cae al redirect tardío de la rama final.
      if (window.location.pathname === "/" && !window.location.hash && !window.location.search) {
        const savedCity = localStorage.getItem("cg_city_slug");
        if (savedCity) {
          try {
            const cached = JSON.parse(localStorage.getItem(`cg_data_${savedCity}_v5`) || "null");
            const knownCities = Array.isArray(cached?.ci) ? cached.ci : [];
            if (knownCities.some((c) => c.slug === savedCity)) {
              routerNavigate(buildCityPath(savedCity, knownCities), { replace: true });
            }
          } catch { /* sin caché válido: lo decide la rama final tras cargar */ }
        }
      }

      // Parsear token de Google OAuth si viene en la URL
      sb.parseOAuthHash();
      // Cargar sesión y datos en paralelo
      
      const [u] = await Promise.all([
        sb.getUser(),
        (async () => {
          if (localStorage.getItem("cg_city_slug")) {
            await loadData();
          } else {
            await useDataStore.getState().refreshCities();
          }
          // Calificaciones de Google en caché (para las tarjetas); sin
          // await, no frena el arranque. Sin dato, la tarjeta usa el
          // conteo propio de CityMap.
          useDataStore.getState().loadGoogleRatings();
        })()
      ]);

      // La carga inicial terminó: quitar la pantalla de arranque (index.html).
      // Desde aquí cubre la pantalla React (BrandSplash / splash de ciudad).
      document.getElementById("boot-splash")?.remove();
      
      if (u?.id) {
         
        setUser(u);
        let myProf = await useAuthStore.getState().loadProfile(u.id);
        
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
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sb._token || ''}` },
                body: JSON.stringify({ 
                  token: localToken, 
                   
                  user_id: u.id,
                  city_slug: useUIStore.getState().activeCity // Guardamos la ciudad actual del usuario
                })
              }).catch(e => console.error("Manual token sync error:", e));
            }
          } catch (_) { console.error(_); }
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
     const urlEv = resolveEventSlug(initialEvParam.current);
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
            // Slug corto sin ciudad (p. ej. `?ev=alfredo-olivas-en-tepic`):
            // reintentar con la ciudad guardada antes de buscar por título.
            const citySlug = initialParams.current.citySlug;
            if (citySlug && !urlEv.startsWith(citySlug + "-")) {
              r = await dbService.getEvents(`?slug=eq.${citySlug}-${urlEv}`);
            }
          }
          if (!r?.[0] && !isUUID) {
            const searchName = urlEv.split("-").join("%25");
            r = await dbService.getEvents(`?title=ilike.*${searchName}*&status=eq.approved`);
            // La búsqueda por título es aproximada: nunca debe abrir un evento
            // privado (el privado solo se abre con su enlace exacto).
            if (Array.isArray(r)) r = r.filter((ev) => ev.visibility !== 'private');
          }
           
          if (r?.[0]) {
            setSelectedEvent(r[0]);
            const eventPath = eventUrl(r[0]);
            // Reloading a detail must not execute home navigation, which clears it.
            if (window.location.pathname !== eventPath) routerNavigate(eventPath, { replace:true });
            if (r[0].city_slug && r[0].city_slug !== initialParams.current.citySlug) {
              setActiveCity(r[0].city_slug);
              loadData(r[0].city_slug);
            }
          } else navigate("events");
        } catch { navigate("events"); }
         
        finally { setResolvingDeepLink(false); }
      } else if (initialJoinParam.current) {
        navigate("mis-planes");
      } else if (initialPlanParam.current) {
        navigate("mis-planes");
      } else if (initialExpSlugParam.current) {
         
        useUIStore.setState({ selectedExpSlug: initialExpSlugParam.current });
        // Do not call navigate("mis-planes") here, because it strips the slug from the URL.
        // AppRouter now has a route for /experiencias/:city/:slug which handles it naturally.
      } else if (initialVistaParam.current) {
        const v = initialVistaParam.current;
        if (isEventsRoute(window.location.pathname)) {
          // The router already has the section and city.
        } else if (v.startsWith("plan_") || v.startsWith("itinerary_detail_")) navigate(v);
        else if (v === "eventos" || v === "events") navigate("events");
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
        else if (v === "precios") navigate("/negocios"); // /precios redirige a /negocios (la página de planes)
        else if (v === "mis-planes" || v === "experiencias" || v === "revista") navigate("mis-planes");
        else if (v === "itinerarios") navigate("itineraries");
        else if (v === "wallet" || v === "lealtad" || v === "scan") { /* DO NOTHING, let AppRouter handle it */ }
        else if (v === "login") { /* DO NOTHING, let AppRouter handle it */ }
        else if (v === "tours") { /* DO NOTHING, let AppRouter handle it */ }
        else if (v === "negocios") { /* DO NOTHING, let AppRouter handle it */ }
        else if (v === "planes") { /* Removed section: let AppRouter render the 404 */ }
        else if (v === "menu_direct") { /* DO NOTHING, let AppRouter handle it */ }
        else navigate("home");
      } else if (initialCatParam.current) {
         
        setActiveCat(initialCatParam.current);
        // Keep the category URL on reload; navigating home clears this selection.
      } else {
        // Si ya estamos en una ruta válida (detalle, categoría, sección o
        // inicio de ciudad como /tepic), NO navegar: AppRouter ya muestra
        // lo que corresponde a la URL. Antes, una ruta de ciudad de un solo
        // segmento caía en navigate("home") y, con la ciudad activa todavía
        // vacía en este efecto (perfil limpio), la app acababa en el muro
        // global ("/"). La URL de una ciudad borrada sigue su
        // comportamiento actual (no se redirige nada aquí).
        const currentPath = window.location.pathname;
        if (!isStayOnInitialPath(currentPath) && currentPath !== "/") {
          navigate("home");
        } else if (currentPath === "/" && !window.location.hash) {
          // Segunda entrada: abrir directo la ciudad guardada en vez del muro.
          // Sin hash (el regreso de Google OAuth lo necesita intacto).
          const savedCity = localStorage.getItem("cg_city_slug");
          const knownCities = useDataStore.getState().cities;
          if (savedCity && knownCities.some((c) => c.slug === savedCity)) {
            routerNavigate(buildCityPath(savedCity, knownCities), { replace: true });
          }
        }
        // else: stay on current path — AppRouter already shows the right view
      }
       
      setAuthChecked(true);
      deepLinkHandled.current = true;
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // SEO meta & JSON-LD structured data update
  useAppSEO({ city });

  // ── HISTORY API & NAVIGATION ──────────────────────────────────────────────
  // Secciones del menú que dependen de una ciudad (Eventos, Mapa, Revista).
  const CITY_SECTIONS = ['map', 'mapa', 'events', 'eventos', 'explorar', 'mis-planes', 'revista', 'experiencias'];
  // Abre una sección (Eventos/Mapa/Revista) en la ciudad indicada: se usa al
  // elegir ciudad en el seleccionador desde el muro global.
  const goToSectionInCity = (v, citySlug) => {
    const path = v === 'map' || v === 'mapa' ? `/mapa/${citySlug}`
      : v === 'events' || v === 'eventos' || v === 'explorar' ? `/eventos/${citySlug}`
      : `/revista/${citySlug}`;
    routerNavigate(path, { viewTransition: true });
    setFade(true);
    window.scrollTo(0, 0);
  };
  const navigate = v => {
    // En el muro global ("/") no hay ciudad elegida en esta visita: una
    // sección que depende de ciudad pide primero el seleccionador y al
    // elegirla abre esa sección en esa ciudad, en vez de saltar a la
    // ciudad guardada en el teléfono sin preguntar.
    if (location.pathname === '/' && CITY_SECTIONS.includes(v)) {
      pendingSectionRef.current = v;
      setShowCountryPicker(true);
      return;
    }
    const city = activeCity || "";
    const cityPrefix = buildCityPath(city, cities); // e.g. "/cancun" or "/mx/cancun"
    let path = cityPrefix;
    if (v === "map" || v === "mapa") path = city ? `/mapa/${city}` : "/mapa";
    else if (v === "events" || v === "eventos" || v === "explorar") path = city ? `/eventos/${city}` : "/eventos";
    else if (v === "mis-planes" || v === "revista" || v === "experiencias") path = city ? `/revista/${city}` : "/revista";
    else if (v === "admin") path = "/admin";
    else if (v === "precios") path = "/negocios"; // /precios redirige a /negocios (la página de planes)
    else if (v === "wallet") path = "/wallet";
    else if (v === "account" || v === "cuenta") path = "/cuenta";
    else if (v === "favs" || v === "favoritos") path = "/favoritos";
    else if (v === "about") path = "/about";
    else if (v === "privacy") path = "/privacy";
    else if (v === "terms") path = "/terms";
    else if (v === "admin_notifs") path = "/admin_notifs";
    else if (v === "user_notifs") path = "/user_notifs";
    else if (v === "itineraries") path = "/itinerarios";
    else if (v.startsWith("itinerary_detail_")) path = `/itinerario/${v.replace("itinerary_detail_", "")}`;
    else if (v.startsWith("plan_")) path = `/plan/${v.replace("plan_", "")}`;
    else if (v.startsWith("manage/")) path = `/${v}`;
    else if (v.startsWith("/")) {
      path = v;
      // Si la ruta es la página principal de una ciudad conocida, cambiar
      // también la ciudad activa: sin esto la URL cambia pero HomeView sigue
      // mostrando la ciudad guardada del dispositivo (por eso todas las
      // tarjetas del muro abrían la misma ciudad).
      const citySlug = cities.find((c) => buildCityPath(c.slug, cities) === v)?.slug;
      if (citySlug && citySlug !== activeCity) {
        setActiveCity(citySlug);
        loadData(citySlug);
      }
    }
    else if (v === "home") {
      if (location.state?.background) {
        setSelected(null);
        setSelectedEvent(null);
        routerNavigate(-1, { viewTransition: true });
        setTimeout(() => setFade(true), 50);
        return;
      }
      setActiveCat("explorar");
      setSearch("");
      setSelected(null);
      setSelectedEvent(null);
      setMapPin(null);
      // En el muro global ("/"), Inicio se queda en el muro, no salta a la ciudad.
      // La ciudad se lee del store en vivo: este navigate también se llama
      // desde el efecto de arranque, cuyo cierre capturó la ciudad inicial
      // (vacía en perfil limpio, o la ciudad anterior al abrir otro enlace),
      // y con ella la URL acababa en "/" o en la ciudad equivocada.
      path = resolveHomePath({
        pathname: location.pathname,
        activeCity: useUIStore.getState().activeCity || city,
        cities,
      });

      if (location.pathname !== path || location.search) {
        routerNavigate(path, { replace: false, viewTransition: true });
        setFade(true);
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (v === "detail") {
      return;
    }

    if (location.pathname !== path) {
      routerNavigate(path, { viewTransition: true });
      setFade(true);
      window.scrollTo(0, 0);
    }
  };

  // Restore category selection on reload and browser back/forward.
  useEffect(() => {
    const category = categoryFromUrl(location.pathname, location.search, cats, IS_WORLD);
    if (category !== null) setActiveCat(category);
    else if (isHomePath(location.pathname)) setActiveCat("explorar");
  }, [location.pathname, location.search, cats, setActiveCat]);

  const isSyncingFromUrl = useRef(false);

  // Sync search state from URL query parameter (e.g. on back/forward, direct link, reload)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlQuery = params.get("q") || "";
    // Only a URL change can restore input; typing must not restore the old URL.
    isSyncingFromUrl.current = true;
    setSearch(urlQuery);
  }, [location.search]);

  // Sync search state to URL query parameter
  useEffect(() => {
    if (isSyncingFromUrl.current) {
      isSyncingFromUrl.current = false;
      return;
    }

    const isNonHome = NON_HOME_PREFIXES.some(prefix => location.pathname.startsWith(prefix));
    if (isNonHome) return;

    const params = new URLSearchParams(location.search);
    const currentQ = params.get("q") || "";
    const trimmed = search.trim();

    if (trimmed === currentQ) return;

    if (trimmed) {
      params.set("q", trimmed);
    } else {
      params.delete("q");
    }

    const newQueryStr = params.toString() ? `?${params.toString()}` : "";
    const target = `${location.pathname}${newQueryStr}`;

    // If current URL already had a 'q' query param, replace history to avoid creating an entry per keystroke.
    // If it didn't have 'q' yet, push a new history entry for this search session.
    const shouldReplace = !!currentQ;
    routerNavigate(target, { replace: shouldReplace });
  }, [search, location.pathname, location.search, routerNavigate]);

  // Listen to native browser back/forward gestures and clear detail state
  // so stale `selected` can't re-push the detail route after navigation
  useEffect(() => {
    const handlePopState = () => {
      // Small delay to let React Router update location first
       
      setTimeout(() => {
        const path = window.location.pathname;
        const isDetailView = path.match(/\/[^/]+\/[^/]+/) && !path.startsWith('/mapa') && !path.startsWith('/mis-planes') && !path.startsWith('/favoritos') && !path.startsWith('/cuenta') && !path.startsWith('/eventos') && !path.startsWith('/itinerario') && !path.startsWith('/plan') && !path.startsWith('/manage') && !path.startsWith('/about') && !path.startsWith('/privacy') && !path.startsWith('/terms') && !path.startsWith('/admin_notifs') && !path.startsWith('/user_notifs');
        const isEventView = path.startsWith('/evento/');
        if (!isDetailView) {
           
          setSelected(null);
        }
        if (!isEventView) {
           
          setSelectedEvent(null);
        }
        if (!isDetailView || !isEventView) {
           
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCity, cities]);

  const handleCardTap = useCallback((b) => {
    setSelected(b);
    const bizCity = b.city_slug || activeCity;
    const slug = cleanCityPrefix(b.slug || createSlug(b.name), bizCity);
    const cityBase = buildCityPath(bizCity, cities);
    const targetPath = `${cityBase}/${slug}`;
    routerNavigate(targetPath, { state: { background: location }, viewTransition: true });
    trackEvent(b.id, "view");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackEvent, activeCity, cities, location]);

  const handleEventTap = useCallback((ev) => {
    setSelectedEvent(ev);
    const targetPath = eventUrl(ev);
    routerNavigate(targetPath, { state: { background: location } });
    // Business analytics has a business FK; event IDs must never be sent as biz IDs.
    if (ev.biz_id) trackEvent(ev.biz_id, "view_event");
    window.gtag?.('event', 'view_event', { event_id:ev.id, city_slug:activeCity });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackEvent, activeCity, location]);

  const doAuth = async () => {
    const uid = await handleAuth();
    if (uid) {
      await loadFavs(uid);
      setShowAuth(false);
      toast$("Bienvenido a CityMap");
    }
  };
  const doSignOut = async () => { 
    await handleSignOut(); 
    setFavIds([]); 
    navigate("home"); 
    toast$("Sesión cerrada"); 
  };



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

  const isAdmin = isAdminUser(user, profile);
  const requestLocation = (cb) => { 
    navigator.geolocation?.getCurrentPosition(pos => {
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setUserCoords(coords);
      localStorage.setItem("cg_coords", JSON.stringify(coords));
      if (typeof cb === 'function') cb(coords);
    }, () => {
      // Antes el error se tragaba en silencio y la ventana de GPS quedaba
      // para siempre: ahora se avisa y el usuario puede reintentar o cerrar.
      toast$(t("ubicacion_error", "No pudimos obtener tu ubicación"));
    }, { enableHighAccuracy: true, timeout: 10000 }); 
  };
  useEffect(() => {
    const cachedCity = localStorage.getItem("cg_city_slug") || activeCity;

    if (!cachedCity && cities.length > 0 && location.pathname !== '/') {
       
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cities]);

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
  }, [banners, activeCity, userCoords, mapPins]);

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (e.city_slug === "all") return true;
      const linkedBiz = e.business_id ? mapPins.find(biz => biz.id === e.business_id) : null;
      return isNear(linkedBiz || e, userCoords, activeCity);
    });
  }, [events, activeCity, userCoords, mapPins]);

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
        const shortText = [
          b.name,
          b.category,
          b.type,
          b.tagline,
          ...(b.tags || [])
        ].join(" ");
        // La descripción solo se busca literal: con coincidencia difusa,
        // un texto largo siempre contiene alguna palabra común a distancia
        // 2 de la consulta ("todos" ~ "tacos") y devolvía negocios ajenos.
        return searchMatches(search, shortText, b.description);
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
  }, [mapPins, activeCity, activeCat, search, cats, userCoords]);

  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [serverHasMore, setServerHasMore] = useState(true);
  const initialBizCount = useDataStore(s => s.initialBizCount);
  const homeCoreCity=useDataStore(s=>s.homeCoreCity);
  const homeCoreError=useDataStore(s=>s.homeCoreError);
  const homeSecondaryCity=useDataStore(s=>s.homeSecondaryCity);
  const homeSecondaryError=useDataStore(s=>s.homeSecondaryError);
  const mapPinsCity = useDataStore(s => s.mapPinsCity);
  const paginationKey = JSON.stringify([activeCity, activeCat, search]);
  const isFilteredBusinessQuery = Boolean(search || (activeCat && activeCat !== "todas" && activeCat !== "explorar"));
  const [businessQuery, setBusinessQuery] = useState({ key: null, ids: [], status: "loading" });
  const businessListStatus = isFilteredBusinessQuery && (initialBizCount === null || mapPinsCity !== activeCity) ? "loading" : getBusinessQueryState(businessQuery, paginationKey, isFilteredBusinessQuery);
  const businessListReady = businessListStatus === "ready";
  const businessListError = businessListStatus === "error";
  const activeBusinessQueryRef = useRef(paginationKey);
  const paginationRequestRef = useRef(null);
  const nextOffsetRef = useRef(20);

  const loadPaginatedBiz = useCallback(async () => {
    if (paginationRequestRef.current || initialBizCount === null || mapPinsCity !== activeCity) return;
    if (!serverHasMore) {
      setPage(p => p + 1);
      return;
    }
    const request = {};
    paginationRequestRef.current = request;
    setLoadingMore(true);
    const offset = nextOffsetRef.current;
    let rows = [];
    const count = await fetchMoreBiz({ targetCity: activeCity, query: search, category: activeCat, offset, limit: 20, onBatch: batch => { rows = batch; } });
    if (activeBusinessQueryRef.current !== paginationKey || paginationRequestRef.current !== request) return;
    paginationRequestRef.current = null;
    setLoadingMore(false);
    // A failed request must keep its offset so the user can retry it.
    if (count === null) {
      if (offset === 0) setBusinessQuery({ key: paginationKey, ids: [], status: "error" });
      return;
    }
    if (isFilteredBusinessQuery) setBusinessQuery(previous => ({ key: paginationKey, status: "ready", ids: appendBusinessIds(offset === 0 || previous.key !== paginationKey ? [] : previous.ids, orderBusinessIds(rows)) }));
    nextOffsetRef.current = offset + count;
    setServerHasMore(count === 20);
    setPage(p => offset === 0 ? 1 : p + 1);
  }, [serverHasMore, initialBizCount, mapPinsCity, activeCity, search, activeCat, fetchMoreBiz, paginationKey, isFilteredBusinessQuery, setBusinessQuery]);

  useEffect(() => {
    activeBusinessQueryRef.current = paginationKey;
    paginationRequestRef.current = null;
    setPage(1);
    setLoadingMore(false);
    const filtered = Boolean(search || (activeCat && activeCat !== "todas" && activeCat !== "explorar"));
    const isCategoryFilter = !search && activeCat && activeCat !== "todas" && activeCat !== "explorar";
    const fetchLimit = isCategoryFilter ? 100 : 20;

    nextOffsetRef.current = filtered ? 0 : 20;
    setServerHasMore(filtered || initialBizCount === null || initialBizCount === 20);
    if (!filtered || initialBizCount === null || mapPinsCity !== activeCity || !dbReady) return;

    setBusinessQuery({ key: paginationKey, ids: [], status: "loading" });
    const request = {};
    let rows = [];
    paginationRequestRef.current = request;
    setLoadingMore(true);
    fetchMoreBiz({ targetCity: activeCity, query: search, category: activeCat, offset: 0, limit: fetchLimit, onBatch: batch => { rows = batch; } }).then(count => {
      if (activeBusinessQueryRef.current !== paginationKey || paginationRequestRef.current !== request) return;
      paginationRequestRef.current = null;
      setLoadingMore(false);
      if (count === null) { setBusinessQuery({ key: paginationKey, ids: [], status: "error" }); return; }
      setBusinessQuery({ key: paginationKey, ids: orderBusinessIds(rows), status: "ready" });
      nextOffsetRef.current = count;
      setServerHasMore(count === fetchLimit);
      // La lista empieza paginada en 20 y se revela solo con "Ver más" (sin
      // autollenado al bajar, para que el botón no se desplace antes de poder
      // pulsarlo): antes se mostraba todo lo cargado de golpe y Virtuoso solo
      // renderiza lo visible, así que la categoría parecía tener solo los
      // 4 negocios que cabían en pantalla.
      setPage(1);
    });
  }, [paginationKey, activeCat, search, activeCity, fetchMoreBiz, initialBizCount, mapPinsCity, dbReady]);

  const displayList = useMemo(() => {
    if (isFilteredBusinessQuery) {
      if (!businessListReady) return [];
      const byId = new Map(filteredBiz.map(b => [b.id, b]));
      return businessQuery.ids.map(id => byId.get(id)).filter(Boolean).slice(0, page * 20);
    }
    return filteredBiz.slice(0, page * 20);
  }, [filteredBiz, page, isFilteredBusinessQuery, businessListReady, businessQuery]);

  const hasMore = serverHasMore || page * 20 < (isFilteredBusinessQuery ? businessQuery.ids.length : filteredBiz.length);
  
  // topFavsMemo is computed here without depending on time

  const viewStyle = { opacity: fade ? 1 : 0, transform: fade ? "translateY(0)" : "translateY(12px)", transition: "opacity .3s ease, transform .3s cubic-bezier(.22,1,.36,1)" };

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



  
  // Guardar/quitar evento de guardados: sin sesión pide iniciar sesión (como toggleFav).
  const toggleSaveEvent = (id, e) => {
    if (e) e.stopPropagation();
    if (!user) { setShowAuth(true); return; }
    const isSaved = (savedEventIds || []).includes(id);
    const nw = isSaved ? savedEventIds.filter((x) => x !== id) : [...(savedEventIds || []), id];
    setSavedEventIds(nw);
    try { localStorage.setItem('cg_saved_ev', JSON.stringify(nw)); } catch { /* localStorage no disponible, se ignora */ }
    if (toast$) toast$(isSaved ? 'Evento eliminado de guardados' : 'Evento guardado');
  };

  const homeHighlights = useDataStore(s => s.homeHighlights);
  const rankedBusinesses = useMemo(() => Array.from(new Map([...mapPins, ...homeHighlights].map(b => [b.id, b])).values()), [mapPins, homeHighlights]);

  const topFavsMemo = useMemo(() => {
    return [...rankedBusinesses].filter(b => isNear(b, userCoords, activeCity) && b.status === "approved" && globalFavCounts[b.id] > 0).sort((a, b) => (globalFavCounts[b.id] || 0) - (globalFavCounts[a.id] || 0)).slice(0, 10);
  }, [rankedBusinesses, activeCity, globalFavCounts, userCoords]);

  const googleRatings = useDataStore((s) => s.googleRatings);

  const topRatedMemo = useMemo(() => {
    return rankTopRated(
      rankedBusinesses.filter((b) => isNear(b, userCoords, activeCity) && b.status === "approved"),
      googleRatings
    );
  }, [rankedBusinesses, activeCity, userCoords, googleRatings]);

  const newBizMemo = useMemo(() => {
    return [...mapPins].filter(b => isNear(b, userCoords, activeCity) && b.status === "approved").sort((a, b) => new Date(b.created_at || 0).getTime() < new Date(a.created_at || 0).getTime() ? -1 : 1).slice(0, 8);
  }, [mapPins, activeCity, userCoords]);

  // Note: cats is already filtered by city in useDataStore.loadData

  // ── SPLASH ────────────────────────────────────────────────────────────────
  // Bypass onboarding if user arrived via a shared plan/join link
  const hasDeepLink = !!(initialPlanParam.current || initialJoinParam.current);
  // (Removed static splash screen that blocked city selection)

  const appContextValue = {
    businessListReady, businessListError, requestWebNotifications, viewStyle, cityImg, locating, detectCity, setShowCountryPicker, city, isAdmin, setShowAdmin, search, setSearch, user, setShowAuth, toast$, setShowAddBiz, dbReady, dark, cats, activeCat, setActiveCat, T, mapPins, activeCity, banners: filteredBanners, displayList, userCoords, getKm, favIds, toggleFav, setSelected, navigate, trackEvent, goWhatsApp, goDir, doShare, handleCardTap, handleEventTap, loadPaginatedBiz, hasMore, loadingMore, nearbyRadius, setNearbyRadius, nearbyFilter, setNearbyFilter, isOpen, topFavsMemo, showMoreTopFavs, setShowMoreTopFavs, globalFavCounts, topRatedMemo, showMoreTopRated, setShowMoreTopRated, newBizMemo, coupons, biz: filteredBiz, AutoSlider, CAT_EMOJI, FONT_BIZ, detectedTown, detectedState,
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

  useThirdPartyScripts(!requireCitySelection && homeCoreCity===activeCity && homeSecondaryCity===activeCity);
  const cityPicker = (
<Suspense fallback={null}>
          <CountryPickerDropdown 
            show={showCountryPicker || (requireCitySelection && hasOnboarded)}
            cities={cities} 
            activeCity={activeCity} 
            onSelectCity={(city) => { handleCitySelect(city); setRequireCitySelection(false); setShowCountryPicker(false); const pending = pendingSectionRef.current; pendingSectionRef.current = null; if (pending && city?.slug) goToSectionInCity(pending, city.slug); }} 
            onDetectCity={() => { if (!locating) detectCity({ showToast: true, onDone: (slug) => { const found = cities.find(c => c.slug === slug); if (found) handleCitySelect(found); setRequireCitySelection(false); const pending = pendingSectionRef.current; pendingSectionRef.current = null; if (pending && slug) goToSectionInCity(pending, slug); } }); setShowCountryPicker(false); }}
            locating={locating}
            onClose={() => { if(!requireCitySelection) { pendingSectionRef.current = null; setShowCountryPicker(false); } }} 
            onGoToWall={() => { setShowCountryPicker(false); routerNavigate("/", { viewTransition: true }); setFade(true); window.scrollTo(0, 0); }}
            dark={dark}
            isWelcome={requireCitySelection} 
          />
        </Suspense>
  );

  if (resolvingDeepLink) {
    return <LoaderFallback />;
  }

  // Prevent background HomeView rendering before onboarding completes
  if (requireCitySelection && !hasOnboarded) {
    return (
      <AppContext.Provider value={appContextValue}>
        <div style={{ fontFamily: "'DM Sans',system-ui,sans-serif", background: dark ? "transparent" : T.bg, minHeight: "100vh", width: "100%", position: "relative", transition: "background .3s" }}>
          {dark && <CosmicBackground />}
          <Suspense fallback={<LoaderFallback />}>
            <OnboardingModal 
              T={T} 
              onComplete={() => {
                localStorage.setItem('citymap_onboarded', 'true');
                setHasOnboarded(true);
              }} 
            />
          </Suspense>
        </div>
      </AppContext.Provider>
    );
  }

  if(requireCitySelection && hasOnboarded){
    return <AppContext.Provider value={appContextValue}>{cityPicker}</AppContext.Provider>;
  }

  return (
    <AppContext.Provider value={appContextValue}>
      <OfflineScreen />
      <CityArrivalSplash enabled={!requireCitySelection && (isHomePath(location.pathname) || isSectionCityPath(location.pathname)) && location.pathname !== '/'} waitingForCity={requireCitySelection} citySlug={activeCity} cityName={cities.find(c=>c.slug===activeCity)?.name || ''} ready={dbReady && mapPinsCity===activeCity && initialBizCount!==null && homeCoreCity===activeCity} error={dbError || businessListError || homeCoreError || homeSecondaryError} />

      <div style={{ fontFamily: "'DM Sans',system-ui,sans-serif", background: dark ? "transparent" : T.bg, minHeight: "100vh", width: "100%", position: "relative", transition: "background .3s" }}>
        {dark && <CosmicBackground />}
        {/* Main app container */}
        <div style={{ width: "100%", margin: "0 auto", minHeight: "100vh", position: "relative", background: dark ? "transparent" : T.bg }}>
        <style>{css}</style>

        {(!location.pathname.startsWith("/cuenta") && !location.pathname.startsWith("/about") && !location.pathname.startsWith("/privacy") && !location.pathname.startsWith("/terms")) && <FloatingParticles dark={dark} />}

        {toast && <div className="tb">{toast}</div>}

        {/* ── GLOBAL GLASS NAVBAR (Fixed: inicio, Revista, Mapa y Eventos) ── */}
        {(!location.pathname.startsWith("/planes") && 
          !location.pathname.startsWith("/cuenta") && 
          !location.pathname.startsWith("/admin") && 
          !location.pathname.startsWith("/favoritos") && 
          !location.pathname.startsWith("/explorer") && 
          !location.pathname.startsWith("/about") && 
          !location.pathname.startsWith("/privacy") && 
          !location.pathname.startsWith("/terms") && 
          !location.pathname.startsWith("/itinerarios") && 
          !location.pathname.startsWith("/itinerario/") && 
          !location.pathname.startsWith("/plan/") && 
          !location.pathname.startsWith("/manage/") && 
          !location.pathname.startsWith("/stats/") && 
          !location.pathname.includes("/lugar/") && 
          !location.pathname.includes("/evento/") &&
          !location.pathname.endsWith("/menu")) && (
          <div style={{ 
            position: "fixed", 
            top: 0, 
            left: "50%", 
            transform: `translateX(-50%)`, 
            width: "100%", 
            maxWidth: "1126px",
            height: 50, 
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr", 
            alignItems: "center", 
            padding: "0 16px", 
            zIndex: 998, 
            background: scrolled ? T.bg : "transparent", 
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
                  color: (dark || (!scrolled && onCityHero)) ? "#ffffff" : T.text
                }}
              >
                <Icon name="menu" size={24} color={(dark || (!scrolled && onCityHero)) ? "#ffffff" : T.text} />
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
                width={113}
                height={34}
                style={{ 
                  height: 34, 
                  width: 113,
                  objectFit: "contain",
                  cursor: "pointer",
                  filter: !dark ? "brightness(0)" : "drop-shadow(0 2px 8px rgba(56, 189, 248, 0.3))" 
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
                  color: (dark || (!scrolled && onCityHero)) ? "#ffffff" : T.text, 
                  transition: "all 0.2s" 
                }}
              >
                <Icon name="globe" size={20} color={(dark || (!scrolled && onCityHero)) ? "#ffffff" : T.text} />
              </button>
            </div>
          </div>
        )}

        {/* Removed CityPicker */}        {showAdmin && <Suspense fallback={null}><AdminPanel onClose={() => { setShowAdmin(false); loadData(); }} onToast={toast$} T={T} onOpenStoreAdmin={(biz) => setAdminStoreBiz(biz)} /></Suspense>}
        {adminStoreBiz && <Suspense fallback={null}><StoreAdminPanel business={adminStoreBiz} onClose={() => setAdminStoreBiz(null)} T={T} /></Suspense>}
        {showPlans && <Suspense fallback={null}><PlanPaymentModal T={T} dark={dark} onClose={() => setShowPlans(false)} myBizList={myBizList} user={user} pendingPlan={pendingPlan} onConsumePendingPlan={() => setPendingPlan(null)} onStartPaidPlan={startPaidPlan} /></Suspense>}
        {payStatus && (
          <div role="dialog" aria-modal="true" aria-label="Confirmación de pago" style={{ position: 'fixed', inset: 0, zIndex: 100001, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: 20 }}>
            <div style={{ background: T.bg, color: T.text, width: '100%', maxWidth: 340, borderRadius: 24, padding: 24, textAlign: 'center', boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}>
              {payStatus.state === 'confirming' && (<>
                <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Confirmando tu pago…</div>
                <p style={{ fontSize: 14, color: T.sub, margin: '0 0 20px' }}>Esto tarda unos segundos.</p>
                <button onClick={() => setPayStatus(null)} style={{ width: '100%', padding: 14, background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 999, fontWeight: 700, fontSize: 15, color: T.text, cursor: 'pointer' }}>Cerrar</button>
              </>)}
              {payStatus.state === 'active' && (<>
                <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>¡Tu plan {payStatus.planName} está activo!</div>
                <p style={{ fontSize: 14, color: T.sub, margin: '0 0 20px' }}>{payStatus.trial ? 'Tienes 7 días gratis. El primer cobro es después de la prueba.' : 'Tu pago se recibió y tu negocio ya tiene el plan.'}</p>
                <button onClick={() => setPayStatus(null)} style={{ width: '100%', padding: 14, background: T.text, border: 'none', borderRadius: 999, fontWeight: 800, fontSize: 15, color: T.bg, cursor: 'pointer' }}>Entendido</button>
              </>)}
              {payStatus.state === 'pending' && (<>
                <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Tu pago se recibió</div>
                <p style={{ fontSize: 14, color: T.sub, margin: '0 0 20px' }}>Estamos activando tu plan. Si en unos minutos no se refleja, escríbenos por WhatsApp.</p>
                <button onClick={() => window.open('https://wa.me/523223792428?text=Hola, pagué un plan y aún no se refleja en mi negocio.', '_blank')} style={{ width: '100%', padding: 14, background: T.text, border: 'none', borderRadius: 999, fontWeight: 800, fontSize: 15, color: T.bg, cursor: 'pointer', marginBottom: 10 }}>Hablar por WhatsApp</button>
                <button onClick={() => setPayStatus(null)} style={{ width: '100%', padding: 14, background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 999, fontWeight: 700, fontSize: 15, color: T.text, cursor: 'pointer' }}>Entendido</button>
              </>)}
            </div>
          </div>
        )}
        {claimBiz && <Suspense fallback={null}><ClaimModal biz={claimBiz} user={user} onClaim={doClaim} onClose={() => setClaimBiz(null)} /></Suspense>}

        {/* SIDE MENU */}
        <Suspense fallback={null}>
          <SideMenu 
            isOpen={showSidebar} 
            onClose={() => setShowSidebar(false)} 
            T={T} 
            dark={dark} 
            navigate={navigate}
            routerNavigate={routerNavigate} 
            user={user} 
            isAdmin={isAdmin}
            setShowAuth={setShowAuth} 
            setShowAdmin={setShowAdmin} 
          />
        </Suspense>

        {/* AUTH */}
        <Suspense fallback={null}>
          <AuthModal T={T} dark={dark} cities={cities} doAuth={doAuth} />
        </Suspense>



        {/* ════ VIEW WRAPPER ════ */}
        <m.div animate={{ opacity: fade ? 1 : 0, y: fade ? 0 : 12 }} transition={SPRING_UI}>
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
            GlobalHomeView={GlobalHomeView}
            MapView={MapView}
            TripsView={TripsView}
            EventsView={EventsView}
            AccountView={AccountView}
            About={About}
            Privacy={Privacy}
            Terms={Terms}
            AdminNotifs={AdminNotifs}
            UserNotifs={UserNotifs}
            OwnerDashboardView={OwnerDashboardView}
            OwnerStatsView={OwnerStatsView}
            LoyaltyCardView={LoyaltyCardView}
            ScanView={ScanView}
            startPaidPlan={startPaidPlan}
          />

        {storeAdminBiz && <Suspense fallback={null}><StoreAdminPanel business={storeAdminBiz} onClose={() => setStoreAdminBiz(null)} T={T} /></Suspense>}

        {/* ════ CREAR EVENTO MODAL ════ */}
        {showCreateEvent && <Suspense fallback={null}>
          <CreateEventModal showCreateEvent={showCreateEvent} setShowCreateEvent={setShowCreateEvent} />
        </Suspense>}

        <EventReminderPrompt />

        {/* ════ DETALLE EVENTO ════ */}
        {/* Solo se monta cuando hay un evento seleccionado: el componente
            no pinta nada sin selectedEvent, y montarlo siempre descargaba
            su chunk (13,4 KB) en cada carga inicial aunque nunca se abriera. */}
        <Suspense fallback={null}>
          {selectedEvent && <EventDetailModal savedEventIds={savedEventIds} setSavedEventIds={setSavedEventIds} />}
        </Suspense>

        {showLocPicker && <Suspense fallback={null}><MapPicker
          initLat={addBizForm.lat} initLng={addBizForm.lng}
          onPick={(lat, lng) => setAddBizForm(f => ({ ...f, lat, lng }))}
          onClose={() => setShowLocPicker(false)}
        /></Suspense>}

        {showAddBiz && <Suspense fallback={null}><AddBizModal
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
          pendingPlan={pendingPlan}
          setPendingPlan={setPendingPlan}
          toast$={toast$}
          T={T}
        /></Suspense>}

        </m.div>

        {/* ════ DETAIL (Ahora en AppRouter) ════ */}
        
        
        {/* ════ ADMIN FAB (Fixed globally for admins) ════ */}
        {isAdmin && !showAdmin && !mapFullScreen && (
          <button
            aria-label="Abrir panel de administración"
            onClick={() => setShowAdmin(true)}
            style={{ 
              position: "fixed", bottom: location.pathname.endsWith('/menu') ? 20 : 90, right: 20, zIndex: 9999, 
              background: "#1A7A5E", color: "#fff", border: "none", borderRadius: "50%", 
              width: 52, height: 52, display: "flex", alignItems: "center", justifyContent: "center", 
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)", cursor: "pointer", transition: "transform 0.2s" 
            }}
            onMouseOver={e => e.currentTarget.style.transform = "scale(1.05)"}
            onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}
          >
            <Icon name="db" size={24} color="#fff" />
          </button>
        )}

        <BottomNav dark={dark} navigate={navigate} />


        

        {cityPicker}


        <Suspense fallback={null}>
          <GalleryModals />
        </Suspense>


        {/* Schedule Modal */}
        <Suspense fallback={null}>
          <ScheduleModal selected={selected} showSchedule={showSchedule} setShowSchedule={setShowSchedule} />
        </Suspense>

      </div>
    </div>



    </AppContext.Provider>
  );
}
