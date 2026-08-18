import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import ErrorBoundary from '../components/ErrorBoundary.jsx';

const LoaderFallback = () => <div style={{position:"fixed",inset:0,background:"#F7F8F6",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:30,height:30,border:"3px solid #E4E8E4",borderTop:"3px solid #000000",borderRadius:"50%",animation:"spin .8s linear infinite"}}/></div>;

const ItinerariesList = React.lazy(() => import('../views/ItinerariesList.jsx'));
const ItineraryDetail = React.lazy(() => import('../views/ItineraryDetail.jsx'));
const DetailView = React.lazy(() => import('../views/DetailView.jsx'));
const MenuView = React.lazy(() => import('../views/MenuView.jsx'));

// Paths that are NOT the home/category view
const NON_HOME_PREFIXES = ['/mapa', '/eventos', '/mis-planes', '/experiencias', '/planes', '/favoritos', '/cuenta', '/itinerarios', '/itinerario/', '/plan/', '/about', '/privacy', '/terms', '/admin_notifs', '/user_notifs', '/manage/'];

function isHomePath(pathname) {
  if (pathname === '/') return true;
  // /:city (one segment, not a known non-home prefix)
  if (NON_HOME_PREFIXES.some(p => pathname.startsWith(p))) return false;
  // Two segments (/:city/:slug) = detail view, but HomeView should STAY MOUNTED
  // So we include detail paths too – HomeView just renders behind DetailView
  const segments = pathname.split('/').filter(Boolean);
  return segments.length <= 2; // / or /:city or /:city/:slug
}

function isDetailPath(pathname) {
  if (NON_HOME_PREFIXES.some(p => pathname.startsWith(p))) return false;
  const segments = pathname.split('/').filter(Boolean);
  return segments.length === 2; // /:city/:slug
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
    setShowPlans,
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
    MapView,
    TripsView,
    EventsView,
    FavsView,
    AccountView,
    About,
    Privacy,
    Terms,
    AdminNotifs,
    UserNotifs,
    OwnerDashboardView
  } = props;

  const location = useLocation();
  const pathname = location.pathname;

  // Show HomeView whenever we're on the home screen OR on a detail page
  // (detail page shows HomeView behind it). This prevents unmount on back navigation.
  const showHomeView = isHomePath(pathname) || isEventDetailPath(pathname);

  // Show detail overlay on top of HomeView
  const showDetail = isDetailPath(pathname) || isEventDetailPath(pathname);

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoaderFallback/>}>

        {/* ── HOME VIEW ──────────────────────────────────────────────────
            Always kept mounted when on home or detail paths.
            This avoids the React.lazy remount / Suspense white-screen
            bug that occurred when pressing back from a detail view.
        ──────────────────────────────────────────────────────────────── */}
        {showHomeView && <HomeView isBackground={showDetail} />}

        {/* ── DETAIL OVERLAY ────────────────────────────────────────── */}
        {showDetail && (
          <Routes>
            <Route path="/:city/:slug" element={<DetailView />} />
            <Route path="/evento/:slug" element={<DetailView />} />
            <Route path="/itinerario/:id" element={<ItineraryDetail T={T} dark={dark} navigate={navigate} id={pathname.split('/itinerario/')[1]} userCoords={userCoords} />} />
            <Route path="/plan/:token" element={<ItineraryDetail T={T} dark={dark} navigate={navigate} token={pathname.split('/plan/')[1]} userCoords={userCoords} />} />
          </Routes>
        )}

        {/* ── ALL OTHER ROUTES (non-home, non-detail) ───────────────── */}
        {!showHomeView && !showDetail && (
          <Routes>
            <Route path="/:city/:slug/menu" element={<MenuView T={T} dark={dark} navigate={navigate} />} />
            
            <Route path="/mapa" element={<MapView />} />
            <Route path="/mapa/:city" element={<MapView />} />
            <Route path="/eventos" element={<EventsView />} />

            <Route path="/mis-planes" element={<TripsView T={T} dark={dark} navigate={navigate} mapPins={mapPins} activeCity={activeCity} cities={cities} user={user} userCoords={userCoords} profile={profile} initialPlanId={initialPlanParam?.current} initialJoinToken={initialJoinParam?.current} onInitialPlanOpened={() => { if(initialPlanParam) initialPlanParam.current = null; if(initialJoinParam) initialJoinParam.current = null; }} />} />
            <Route path="/experiencias/:city" element={<TripsView T={T} dark={dark} navigate={navigate} mapPins={mapPins} activeCity={activeCity} cities={cities} user={user} userCoords={userCoords} profile={profile} initialPlanId={initialPlanParam?.current} initialJoinToken={initialJoinParam?.current} onInitialPlanOpened={() => { if(initialPlanParam) initialPlanParam.current = null; if(initialJoinParam) initialJoinParam.current = null; }} />} />
            <Route path="/planes" element={<TripsView T={T} dark={dark} navigate={navigate} mapPins={mapPins} activeCity={activeCity} cities={cities} user={user} userCoords={userCoords} profile={profile} initialPlanId={initialPlanParam?.current} initialJoinToken={initialJoinParam?.current} onInitialPlanOpened={() => { if(initialPlanParam) initialPlanParam.current = null; if(initialJoinParam) initialJoinParam.current = null; }} />} />

            <Route path="/favoritos" element={<FavsView hideHeader={false} />} />
            <Route path="/cuenta" element={<AccountView
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
            />} />

            <Route path="/itinerarios" element={<ItinerariesList T={T} dark={dark} navigate={navigate} />} />
            <Route path="/itinerario/:id" element={<ItineraryDetail T={T} dark={dark} navigate={navigate} id={pathname.split('/itinerario/')[1]} userCoords={userCoords} />} />
            <Route path="/plan/:token" element={<ItineraryDetail T={T} dark={dark} navigate={navigate} token={pathname.split('/plan/')[1]} userCoords={userCoords} />} />

            <Route path="/about" element={<About T={T} onBack={() => navigate("account")} />} />
            <Route path="/privacy" element={<Privacy T={T} onBack={() => navigate("account")} />} />
            <Route path="/terms" element={<Terms T={T} onBack={() => navigate("account")} />} />
            <Route path="/admin_notifs" element={<AdminNotifs T={T} onBack={() => navigate("account")} />} />
            <Route path="/user_notifs" element={<UserNotifs T={T} user={user} onBack={() => navigate("account")} />} />

            <Route path="/manage/*" element={<OwnerDashboardView />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}

      </Suspense>
    </ErrorBoundary>
  );
}
