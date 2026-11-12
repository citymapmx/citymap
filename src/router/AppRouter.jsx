import React, { Suspense, useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import ErrorBoundary from '../components/ErrorBoundary.jsx';
import RouteLoader from '../components/ui/RouteLoader.jsx';
import { IS_WORLD } from '../lib/domain.js';
import { bizToForm } from '../lib/bizForm.js';
import { parseRevistaPath } from '../lib/revistaRoute.js';
import { isDirectCategorySegments } from '../lib/categoryRouting.js';

// La carga de las rutas NO es la pantalla negra de marca (BrandSplash):
// al navegar se ven los tres puntos sobre el fondo de la página, sin
// tapar la pantalla de negro. La pantalla negra queda solo para el
// arranque de la app y el cambio de ciudad (CityArrivalSplash).
const LoaderFallback = () => <RouteLoader />;

const ItinerariesList = React.lazy(() => import('../views/ItinerariesList.jsx'));
const ItineraryDetail = React.lazy(() => import('../views/ItineraryDetail.jsx'));
const DetailView = React.lazy(() => import('../views/DetailView.jsx'));
const MenuView = React.lazy(() => import('../views/MenuView.jsx'));
const WalletView = React.lazy(() => import('../views/WalletView.jsx'));
const FavsView = React.lazy(() => import('../views/FavsView.jsx'));
const NotFoundView = React.lazy(() => import('../views/NotFoundView.jsx'));
const AppLoginView = React.lazy(() => import('../views/AppLoginView.jsx'));
const ToursView = React.lazy(() => import('../components/ToursView.jsx'));
const BusinessLanding = React.lazy(() => import('../components/BusinessLanding.jsx'));

// Paths that are NOT the home/category view
const NON_HOME_PREFIXES = ['/mapa', '/eventos', '/explorar', '/mis-planes', '/revista', '/experiencias', '/tours', '/negocios', '/planes', '/favoritos', '/cuenta', '/itinerarios', '/itinerario', '/plan', '/about', '/privacy', '/terms', '/admin_notifs', '/user_notifs', '/manage', '/stats', '/precios', '/lealtad', '/wallet', '/scan', '/login'];

function isCategoryPath(segments) {
  if (IS_WORLD) return (segments.length === 4 && segments[2] === 'c') || isDirectCategorySegments(segments, true);
  return (segments.length === 3 && segments[1] === 'c') || isDirectCategorySegments(segments);
}

function isHomePath(pathname) {
  if (pathname === '/') return true;
  if (NON_HOME_PREFIXES.some(p => pathname.startsWith(p))) return false;
  const segments = pathname.split('/').filter(Boolean);
  
  if (isCategoryPath(segments)) return true;
  
  // On citymap.world paths have an extra country prefix: /mx/cancun or /mx/cancun/slug
  const maxHomeSegments = IS_WORLD ? 3 : 2;
  return segments.length <= maxHomeSegments;
}

function isDetailPath(pathname) {
  if (NON_HOME_PREFIXES.some(p => pathname.startsWith(p))) return false;
  const segments = pathname.split('/').filter(Boolean);
  
  if (isCategoryPath(segments)) return false;
  
  // .world: /mx/cancun/slug = 3 segments | .mx: /cancun/slug = 2 segments
  return IS_WORLD ? segments.length === 3 : segments.length === 2;
}

function isEventDetailPath(pathname) {
  return pathname.startsWith('/evento/');
}

export default function AppRouter(props) {
  const {
    navigate,
    T,
    dark,
    setDark,
    mapPins,
    activeCity,
    cities,
    userCoords,
    user,
    authChecked,
    profile,
    isAdmin,
    initialPlanParam,
    initialJoinParam,
    favIds,
    reviews,
    wallet,
    coupons,
    claimedCoupons,
    myBizList,
    setShowAdmin,
    setShowAuth,
    setAuthMode,
    setEditBizId,
    setAddBizForm,
    setShowAddBiz,
    setOwnerView,
    setSelected,
    doSignOut,
    toast$,
    viewStyle,
    setUser,
    setStoreAdminBiz,
    HomeView,
    GlobalHomeView,
    MapView,
    TripsView,
    EventsView,
    AccountView,
    About,
    Privacy,
    Terms,
    AdminNotifs,
    UserNotifs,
    OwnerDashboardView,
    OwnerStatsView,
    LoyaltyCardView,
    ScanView,
    startPaidPlan
  } = props;

  const location = useLocation();
  const pathname = location.pathname;

  // Show HomeView whenever we're on the home screen OR on a detail page
  // (detail page shows HomeView behind it). This prevents unmount on back navigation.
  const showDetail = isDetailPath(pathname) || isEventDetailPath(pathname);
  const background = showDetail ? location.state?.background : null;
  const contentLocation = background || location;
  // Keep the actual source screen mounted under a detail, rather than loading
  // an unrelated HomeView when opening an event from Plans or a business from Map.
  const showHomeView = isHomePath(contentLocation.pathname) && !isEventDetailPath(contentLocation.pathname);
  // La raíz "/" es el muro global (todas las ciudades); "/:ciudad" sigue siendo el inicio de esa ciudad.
  const isGlobalHome = contentLocation.pathname === '/';

  // ── REVISTA (keep-alive) ──────────────────────────────────────────
  // TripsView se mantiene montada una vez visitada: al salir de la sección
  // y volver no se remontan las tarjetas ni se vuelven a pedir las fotos.
  // Vive fuera de <Routes> (por eso la ciudad y el artículo llegan por
  // props desde la URL), y se oculta con display:none cuando no es su ruta.
  const revistaRoute = parseRevistaPath(contentLocation.pathname);
  const isRevistaPath = Boolean(revistaRoute);
  const [revistaMounted, setRevistaMounted] = useState(isRevistaPath);
  useEffect(() => { if (isRevistaPath && !revistaMounted) setRevistaMounted(true); }, [isRevistaPath, revistaMounted]);

  // Show detail overlay on top of HomeView
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoaderFallback/>}>

        {/* ── HOME VIEW ──────────────────────────────────────────────────
            Always kept mounted when on home or detail paths.
            This avoids the React.lazy remount / Suspense white-screen
            bug that occurred when pressing back from a detail view.
        ──────────────────────────────────────────────────────────────── */}
        {showHomeView && (isGlobalHome ? <GlobalHomeView /> : <div inert={showDetail || undefined}><HomeView isBackground={showDetail} /></div>)}

        {/* ── REVISTA (keep-alive) ────────────────────────────────────
            Montada una vez visitada y oculta al salir, para que las fotos
            queden en caché y no parpadeen al volver a la sección.
        ──────────────────────────────────────────────────────────────── */}
        {revistaMounted && (
          <div style={{ display: isRevistaPath ? undefined : 'none' }} inert={showDetail || undefined}>
            <TripsView T={T} dark={dark} navigate={navigate} mapPins={mapPins} activeCity={activeCity} cities={cities} user={user} userCoords={userCoords} profile={profile} routeCity={revistaRoute?.city || undefined} routeSlug={revistaRoute?.slug || undefined} initialPlanId={initialPlanParam?.current} initialJoinToken={initialJoinParam?.current} onInitialPlanOpened={() => { if(initialPlanParam) initialPlanParam.current = null; if(initialJoinParam) initialJoinParam.current = null; }} />
          </div>
        )}

        {/* ── DETAIL OVERLAY ────────────────────────────────────────── */}
        <AnimatePresence>
          {showDetail && (
            <Routes location={location} key="detail-overlay">
              {/* citymap.mx routes */}
              <Route path="/:city/:slug" element={<DetailView />} />
              <Route path="/evento/:slug" element={<DetailView />} />
              <Route path="/evento/:city/:slug" element={<DetailView />} />
              {/* citymap.world routes (country prefix) */}
              <Route path="/:country/:city/:slug" element={<DetailView />} />
              <Route path="/itinerario/:id" element={<ItineraryDetail T={T} dark={dark} navigate={navigate} id={pathname.split('/itinerario/')[1]} userCoords={userCoords} />} />
              <Route path="/plan/:token" element={<ItineraryDetail T={T} dark={dark} navigate={navigate} token={pathname.split('/plan/')[1]} userCoords={userCoords} />} />
            </Routes>
          )}
        </AnimatePresence>

        {/* ── ALL OTHER ROUTES (non-home, non-detail) ───────────────── */}
        {!showHomeView && (!showDetail || background) && (
          <div inert={showDetail || undefined}><Routes location={contentLocation}>
            {/* /precios ya no existe como página: redirige a /negocios, LA
                página de planes (10 nov 2026). Se mantiene la ruta para no
                romper enlaces ni marcadores viejos. */}
            <Route path="/precios" element={<Navigate to="/negocios" replace />} />
            <Route path="/negocios" element={<BusinessLanding T={T} dark={dark} navigate={navigate} user={user} myBizList={myBizList} onAddBiz={() => { if (!user) { setShowAuth(true); return; } const first = myBizList?.[0]; if (first) { setEditBizId(first.id); setAddBizForm(bizToForm(first)); setShowAddBiz(true); return; } setShowAddBiz(true); }} onStartPaidPlan={startPaidPlan} setShowAuth={setShowAuth} />} />
            
            <Route path="/:city/:slug/menu" element={<MenuView T={T} dark={dark} navigate={navigate} />} />
            <Route path="/:country/:city/:slug/menu" element={<MenuView T={T} dark={dark} navigate={navigate} />} />
            
            <Route path="/mapa" element={<MapView />} />
            <Route path="/mapa/:city" element={<MapView />} />
            <Route path="/eventos" element={<EventsView />} />
            <Route path="/eventos/:city" element={<EventsView />} />
            <Route path="/tours" element={<ToursView T={T} dark={dark} navigate={navigate} cities={cities} />} />
            <Route path="/explorar" element={<EventsView />} />
            <Route path="/explorar/:city" element={<EventsView />} />
            {/* The legacy "Planes" section was removed: these URLs must answer 404 (no redirect). */}
            <Route path="/planes" element={<NotFoundView />} />
            <Route path="/planes/*" element={<NotFoundView />} />

            {/* Revista vive fuera de <Routes> (keep-alive); estas rutas solo evitan que el "*" de abajo redirija a "/". */}
            <Route path="/mis-planes" element={null} />
            <Route path="/revista/*" element={null} />
            <Route path="/experiencias/*" element={null} />

            <Route path="/favoritos" element={<FavsView />} />
            <Route path="/login" element={<AppLoginView T={T} dark={dark} navigate={navigate} />} />
            <Route path="/cuenta" element={<AccountView
              user={user} authChecked={authChecked} profile={profile} isAdmin={isAdmin} T={T} dark={dark} setDark={setDark}
              favIds={favIds} reviews={reviews} wallet={wallet} coupons={coupons} claimedCoupons={claimedCoupons}
              biz={mapPins} myBizList={myBizList}
              setShowAdmin={setShowAdmin}
              setShowAuth={setShowAuth} setAuthMode={setAuthMode}
              setEditBizId={setEditBizId} setAddBizForm={setAddBizForm}
              setShowAddBiz={setShowAddBiz} setOwnerView={setOwnerView}
              setSelected={setSelected} navigate={navigate}
              doSignOut={doSignOut} toast$={toast$} viewStyle={viewStyle}
              setUser={setUser} setStoreAdminBiz={setStoreAdminBiz}
            />} />

            <Route path="/itinerarios" element={<ItinerariesList T={T} dark={dark} navigate={navigate} />} />
            <Route path="/itinerario/:id" element={<ItineraryDetail T={T} dark={dark} navigate={navigate} id={pathname.split('/itinerario/')[1]} userCoords={userCoords} />} />
            <Route path="/plan/:token" element={<ItineraryDetail T={T} dark={dark} navigate={navigate} token={pathname.split('/plan/')[1]} userCoords={userCoords} />} />

            <Route path="/about" element={<About T={T} onBack={() => { if (window.history.length > 1) window.history.back(); else navigate("home"); }} />} />
            <Route path="/privacy" element={<Privacy T={T} onBack={() => { if (window.history.length > 1) window.history.back(); else navigate("home"); }} />} />
            <Route path="/terms" element={<Terms T={T} onBack={() => { if (window.history.length > 1) window.history.back(); else navigate("home"); }} />} />
            <Route path="/admin_notifs" element={<AdminNotifs T={T} onBack={() => { if (window.history.length > 1) window.history.back(); else navigate("home"); }} />} />
            <Route path="/user_notifs" element={<UserNotifs T={T} user={user} onBack={() => { if (window.history.length > 1) window.history.back(); else navigate("home"); }} />} />

            <Route path="/manage/*" element={<OwnerDashboardView />} />
            <Route path="/stats/*" element={<OwnerStatsView />} />
            <Route path="/lealtad/:bizId" element={<LoyaltyCardView T={T} user={user} setShowAuth={setShowAuth} />} />
            <Route path="/wallet" element={<WalletView T={T} dark={dark} user={user} setShowAuth={setShowAuth} />} />
            <Route path="/scan/:memberId" element={<ScanView T={T} dark={dark} user={user} setShowAuth={setShowAuth} />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes></div>
        )}

      </Suspense>
    </ErrorBoundary>
  );
}
