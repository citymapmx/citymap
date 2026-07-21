import React, { useState, useEffect, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getT, FONT_BIZ } from "../lib/constants.js";
import { useBusinessActions } from "../hooks/useBusinessActions.js";
import { useInteractions } from "../hooks/useInteractions.js";
import { useFavorites } from "../hooks/useFavorites.js";
import { sb } from "../lib/supabase.js";
import { useUIStore } from "../store/useUIStore.js";
import { useDataStore } from "../store/useDataStore.js";
import { useAuthStore } from "../store/useAuthStore.js";
import { useShallow } from 'zustand/react/shallow';
import useTimeStore from "../store/useTimeStore.js";
import Icon from "../components/ui/Icon.jsx";
import StarRow from "../components/ui/StarRow.jsx";
import { ErrorBoundary } from "../components/ErrorBoundary.jsx";
import { getThumbUrl, getKm, getEventStatus, createSlug, isOpenNow, CAT_EMOJI, getCategoryDescription, parseMenuUrls, getScheduleStatus, getSmartScheduleInfo, haptic } from "../lib/utils.js";

const MapPicker = lazy(() => import('../components/map/MapPicker.jsx'));
const Gallery = lazy(() => import('../components/Gallery.jsx'));
const BookingModal = lazy(() => import('../components/BookingModal.jsx'));
import BusinessStore from '../components/store/BusinessStore.jsx';
import { Helmet } from 'react-helmet-async';

function PhotoGallery({ photos, dText, T, getThumbUrl, setShowGallery }) {
  if (!photos || photos.length === 0) return null;

  return (
    <div style={{ padding: "20px 0 0", position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, padding: "0 20px" }}>
        <div className="text-lg" style={{ fontWeight: 800, color: dText, letterSpacing: "-0.5px" }}>Galería de fotos ({photos.length})</div>
        <div className="text-sm" style={{ fontWeight: 700, color: T.green, cursor: "pointer" }} onClick={() => setShowGallery(0)}>Ver todas</div>
      </div>

      <div style={{ padding: "0 20px" }}>
        {photos.length === 1 && (
          <div 
            onClick={() => setShowGallery(0)} 
            style={{ width: "100%", height: 240, borderRadius: 16, overflow: "hidden", background: T.border, cursor: "pointer" }}
          >
            <img src={getThumbUrl(photos[0].url, 800, 600)} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
          </div>
        )}

        {photos.length === 2 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, height: 200 }}>
            <div onClick={() => setShowGallery(0)} style={{ borderRadius: "16px 0 0 16px", overflow: "hidden", background: T.border, cursor: "pointer" }}>
              <img src={getThumbUrl(photos[0].url, 600, 600)} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
            </div>
            <div onClick={() => setShowGallery(1)} style={{ borderRadius: "0 16px 16px 0", overflow: "hidden", background: T.border, cursor: "pointer" }}>
              <img src={getThumbUrl(photos[1].url, 600, 600)} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
            </div>
          </div>
        )}

        {photos.length >= 3 && (
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gridTemplateRows: "1fr 1fr", gap: 8, height: 260 }}>
            <div 
              onClick={() => setShowGallery(0)} 
              style={{ gridColumn: "1 / 2", gridRow: "1 / 3", borderRadius: "16px 0 0 16px", overflow: "hidden", background: T.border, cursor: "pointer" }}
            >
              <img src={getThumbUrl(photos[0].url, 800, 800)} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
            </div>
            <div 
              onClick={() => setShowGallery(1)} 
              style={{ gridColumn: "2 / 3", gridRow: "1 / 2", borderRadius: "0 16px 0 0", overflow: "hidden", background: T.border, cursor: "pointer" }}
            >
              <img src={getThumbUrl(photos[1].url, 400, 400)} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
            </div>
            <div 
              onClick={() => setShowGallery(2)} 
              style={{ gridColumn: "2 / 3", gridRow: "2 / 3", borderRadius: "0 0 16px 0", overflow: "hidden", background: T.border, cursor: "pointer", position: "relative" }}
            >
              <img src={getThumbUrl(photos[2].url, 400, 400)} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
              {photos.length > 3 && (
                <div className="text-xl" style={{ position: "absolute", inset: 0, background: "rgba(0, 0, 0, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800 }}>
                  +{photos.length - 3}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import useGMaps from '../components/map/useGMaps.js';

const GoogleReviewItem = ({ r, isElite, dText, dSub, T, isLast }) => {
  const [expanded, setExpanded] = useState(false);
  const MAX_LEN = 150;
  const isLong = r.text && r.text.length > MAX_LEN;
  const displayTxt = (!expanded && isLong) ? r.text.slice(0, MAX_LEN) + "..." : r.text;

  return (
    <React.Fragment>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          {r.profile_photo_url ? (
             <img src={r.profile_photo_url} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />
          ) : (
             <div className="text-xs" style={{ width: 32, height: 32, borderRadius: "50%", background: "#4285F4", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{r.author_name ? r.author_name.charAt(0).toUpperCase() : "U"}</div>
          )}
          <div>
            <div className="text-sm" style={{ fontWeight: 700, color: dText }}>{r.author_name}</div>
            <div className="text-xs" style={{ color: dSub }}>{r.relative_time_description}</div>
          </div>
        </div>
        <StarRow n={r.rating} size={12} />
        <div className="text-sm" style={{ color: dSub, lineHeight: 1.5, marginTop: 6, textAlign: "left" }}>
          "{displayTxt}"
          {isLong && (
            <span onClick={() => setExpanded(!expanded)} style={{ color: T.green, fontWeight: 700, cursor: "pointer", marginLeft: 4 }}>
              {expanded ? "Mostrar menos" : "Leer más"}
            </span>
          )}
        </div>
      </div>
      {!isLast && <div style={{ height: 1, background: isElite ? "rgba(255,255,255,0.05)" : T.border }} />}
    </React.Fragment>
  );
};

export default function DetailView({ navigate }) {
  const { dark, activeCity, toast$, selected, setSelected, setView, setFade, userCoords, showGallery, setShowGallery, setShowMenuGallery, setClaimBiz } = useUIStore(useShallow(s => ({ dark: s.dark, activeCity: s.activeCity, toast$: s.toast$, selected: s.selected, setSelected: s.setSelected, setView: s.setView, setFade: s.setFade, userCoords: s.userCoords, showGallery: s.showGallery, setShowGallery: s.setShowGallery, setShowMenuGallery: s.setShowMenuGallery, setClaimBiz: s.setClaimBiz })));
  const { dbReady, promos, coupons, events, wallet, setWallet, claimedCoupons, setClaimedCoupons, reviews, setReviews, globalFavCounts, raffles, mapPins, setMapPins } = useDataStore(useShallow(s => ({ dbReady: s.dbReady, promos: s.promos, coupons: s.coupons, events: s.events, wallet: s.wallet, setWallet: s.setWallet, claimedCoupons: s.claimedCoupons, setClaimedCoupons: s.setClaimedCoupons, reviews: s.reviews, setReviews: s.setReviews, globalFavCounts: s.globalFavCounts, raffles: s.raffles, mapPins: s.mapPins, setMapPins: s.setMapPins })));
  const { user, setShowAuth, profile } = useAuthStore(useShallow(s => ({ user: s.user, setShowAuth: s.setShowAuth, profile: s.profile })));
  const isAdmin = profile?.role === "admin";
  const setBiz = setMapPins;
  
  const viewStyle = useUIStore(s => s.view === "list" ? "list" : "grid");
  const T = getT(dark);
  const { favIds, toggleFav } = useFavorites();
  const { trackEvent, goWhatsApp, goDir, doShare, callPhone, goWeb } = useInteractions();
  const { reviewText, setReviewText, reviewStar, setReviewStar, showReview, setShowReview, reviewImgFile, setReviewImgFile, reviewImgLoading, postReview, toggleLikeReview } = useBusinessActions();
  const isOpen = (b) => isOpenNow(b.schedule);
  const setMapPin = useUIStore(s => s.setMapPin);
  const setSelectedEvent = useUIStore(s => s.setSelectedEvent);
  
  const now = useTimeStore(s => s.now);

  const mapsOk = useGMaps();
  const [googleData, setGoogleData] = useState(null);

  useEffect(() => {
    if (!mapsOk || !selected?.social_links?.google_place_id) return;
    try {
      const service = new window.google.maps.places.PlacesService(document.createElement('div'));
      service.getDetails({
        placeId: selected.social_links.google_place_id,
        fields: ['name', 'rating', 'reviews', 'user_ratings_total']
      }, (place, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
          setGoogleData({
            rating: place.rating,
            count: place.user_ratings_total,
            reviews: place.reviews || []
          });
        }
      });
    } catch (e) {
      console.error("Error fetching Google Reviews:", e);
    }
  }, [mapsOk, selected?.social_links?.google_place_id]);

  if (!selected) return null;
  const isElite = false; // Desactivado por petición del usuario
  
  const getEmbedUrl = (url) => {
    if (!url) return null;
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      const shortsMatch = url.match(/shorts\/([^#&?/]+)/);
      if (shortsMatch && shortsMatch[1].length === 11) return `https://www.youtube.com/embed/${shortsMatch[1]}?autoplay=0&rel=0&modestbranding=1`;
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = url.match(regExp);
      if (match && match[2].length === 11) return `https://www.youtube.com/embed/${match[2]}?autoplay=0&rel=0&modestbranding=1`;
    } else if (url.includes("tiktok.com")) {
      const match = url.match(/video\/(\d+)/);
      if (match) return `https://www.tiktok.com/embed/v2/${match[1]}`;
    } else if (url.includes("instagram.com")) {
      const match = url.match(/(?:p|reel)\/([^/?#&]+)/);
      if (match) return `https://www.instagram.com/p/${match[1]}/embed/`;
    }
    return null;
  };

  const [asyncEmbedUrl, setAsyncEmbedUrl] = useState(null);
  const [showBooking, setShowBooking] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

  useEffect(() => {
    if (selected && !selected._fullFetched) {
      sb.get("businesses", `?id=eq.${selected.id}&select=*,reviews(*)`).then(res => {
        if (res && res[0]) {
          const parseJSON = (val) => {
            if (typeof val === 'string') { try { return JSON.parse(val); } catch(e) { return {}; } }
            return val || {};
          };
          
          const revs = res[0].reviews || [];
          revs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          setReviews(revs);
          
          const fullData = { 
            ...selected, 
            ...res[0], 
            _fullFetched: true, 
            schedule: parseJSON(res[0].schedule), 
            social_links: parseJSON(res[0].social_links), 
            booking_config: parseJSON(res[0].booking_config), 
            blocked_slots: parseJSON(res[0].blocked_slots), 
            photos: parseJSON(res[0].photos) 
          };
          // Remove reviews from fullData so we don't duplicate state
          delete fullData.reviews;
          setSelected(fullData);
        }
      }).catch(e => console.error("Failed to fetch full biz details", e));
    }
  }, [selected?.id, selected?._fullFetched]);

  useEffect(() => {
    setAsyncEmbedUrl(null);
    if (!selected?.video_url) return;

    const syncUrl = getEmbedUrl(selected.video_url);
    if (syncUrl) {
      setAsyncEmbedUrl(syncUrl);
      return;
    }

    if (selected.video_url.includes("tiktok.com")) {
      fetch(`/api/tiktok-resolve?url=${encodeURIComponent(selected.video_url)}`)
        .then(r => r.json())
        .then(data => {
          if (data.videoId) setAsyncEmbedUrl(`https://www.tiktok.com/embed/v2/${data.videoId}`);
        })
        .catch(e => console.error("TikTok resolve error:", e));
    }
  }, [selected?.video_url]);
          const dText = T.text;
          const dSub = T.sub;
          const dBg = T.bg;
          const dCard = T.white;
          const dIconBg = T.iconBg;
          
  const schemaOrgJSONLD = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": selected.name,
    "image": selected.photos?.[0]?.url || selected.logo_url || "https://citymap.mx/og-image.png",
    "description": selected.description || selected.tagline || `Descubre ${selected.name} en CityMap.`,
    "@id": `https://citymap.mx/${selected.city_slug || activeCity}/${ctx.cleanCityPrefix ? ctx.cleanCityPrefix(selected.slug || createSlug(selected.name), selected.city_slug || activeCity) : createSlug(selected.name)}`,
    "url": `https://citymap.mx/${selected.city_slug || activeCity}/${ctx.cleanCityPrefix ? ctx.cleanCityPrefix(selected.slug || createSlug(selected.name), selected.city_slug || activeCity) : createSlug(selected.name)}`,
    "telephone": selected.phone || selected.whatsapp || "",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": selected.address || "",
      "addressLocality": (selected.city_slug || activeCity).split(',')[0],
      "addressRegion": "MX",
      "addressCountry": "MX"
    },
    ...(selected.lat && selected.lng && {
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": selected.lat,
        "longitude": selected.lng
      }
    }),
    ...(selected.rating && selected.review_count && {
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": selected.rating,
        "reviewCount": selected.review_count
      }
    })
  };

  const canonicalUrl = schemaOrgJSONLD.url;

  return (
    <div 
      style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, background: T.bg, display: "flex", flexDirection: "column", alignItems: "center" }}
      onClick={() => navigate("home")}
    >
      <Helmet>
        <title>{selected.name} en CityMap</title>
        <meta name="description" content={schemaOrgJSONLD.description} />
        <link rel="canonical" href={canonicalUrl} />
      </Helmet>
      
      {/* Schema.org Injection */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrgJSONLD).replace(/</g, '\\u003c').replace(/>/g, '\\u003e') }} />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        transition={{ duration: 0.2, ease: "easeOut" }} 
        onClick={e => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 600, height: "100%", overflowY: "auto", overflowX: "hidden", background: T.bg, position: "relative", boxShadow: "0 0 40px rgba(0,0,0,0.1)" }}
      >
        {/* Header Image Full Bleed */}
            <div style={{ height: isElite ? "45vh" : 280, position: "relative", background: "#111", overflow: "hidden", flexShrink: 0 }}>
              <img src={selected.photos?.[0]?.url ? getThumbUrl(selected.photos[0].url, 1200, 900) : ""} alt={`Foto de ${selected.name}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 100, background: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 100%)", pointerEvents: "none" }} />
              {isElite && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "50%", background: "linear-gradient(to top, #111111 0%, rgba(17,17,17,0) 100%)" }} />}
              <div style={{ position: "absolute", top: 16, left: 16, right: 16, display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 20 }}>
                <button aria-label="Volver" className="press" onClick={() => navigate("home")} style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.75)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.4)", cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}><Icon name="chevron" size={20} color="#111" style={{ transform: "rotate(180deg)" }} /></button>
                <div style={{ display: "flex", gap: 10 }}>
                  <button aria-label={favIds.includes(selected.id) ? "Quitar de favoritos" : "Añadir a favoritos"} className="press" onClick={e => { haptic("light"); toggleFav(selected.id, e); }} style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.75)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.4)", cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}><Icon name={favIds.includes(selected.id) ? "heart_f" : "heart"} size={20} color={favIds.includes(selected.id) ? T.red : "#111"} /></button>
                  <button aria-label="Compartir" className="press" onClick={e => doShare(selected, e)} style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.75)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.4)", cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}><Icon name="share" size={18} color="#111" /></button>
                </div>
              </div>
              {/* Pill distance if available */}
              {userCoords && selected.lat && selected.lng && (() => {
                 const dist = getKm(userCoords.lat, userCoords.lng, parseFloat(selected.lat), parseFloat(selected.lng));
                 return <div className="text-xs" style={{ position: "absolute", bottom: isElite ? 60 : 40, right: 20, background: "rgba(0, 0, 0, 0.65)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", color: "#fff", borderRadius: 20, padding: "5px 10px", fontWeight: 700, display: "flex", alignItems: "center", gap: 4, zIndex: 20 }}><Icon name="nav" size={10} color="#fff" /> {dist < 1 ? Math.round(dist * 1000) + "m" : dist.toFixed(1) + " km"}</div>;
              })()}
            </div>

            {/* White Card Overlapping */}
            <div style={{ background: dBg, borderRadius: isElite ? "0" : "20px 20px 0 0", marginTop: isElite ? -40 : -20, position: "relative", padding: "16px 16px 0", zIndex: 30 }}>
              
              {selected.logo_url && (
                <div style={{ position: "absolute", top: -48, left: 16, width: 96, height: 96, borderRadius: "50%", background: "#fff", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 6px 16px rgba(0,0,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 40, padding: 3, boxSizing: "border-box", overflow: "hidden" }}>
                  <img src={getThumbUrl(selected.logo_url, 300, 300)} width={90} height={90} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "50%" }} alt={`Logo de ${selected.name}`} />
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, marginTop: selected.logo_url ? 38 : 0 }}>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <h1 className="text-2xl" style={{ fontFamily: FONT_BIZ, color: dText, lineHeight: 1.15, fontWeight: 800, margin: "0" }}>{selected.name}</h1>
                  {(selected.type || selected.tagline) && (
                    <p className="text-sm" style={{ color: dSub, fontWeight: 500, margin: "2px 0 0 0" }}>{selected.type}{selected.tagline ? ` • ${selected.tagline}` : ""}</p>
                  )}
                  
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {!selected.is_place && (() => {
                        const smartSt = getSmartScheduleInfo(selected, window.CITY_TZ, now);
                        return (
                          <>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: smartSt.color, display: "inline-block" }} />
                            <span className="text-sm" style={{ color: smartSt.color, fontWeight: 700 }}>{smartSt.text}</span>
                            <span className="text-sm" style={{ color: dSub, display: "flex", alignItems: "center", gap: 4 }}>· {selected.hours}</span>
                          </>
                        );
                      })()}
                    </div>

                    <div className="press" onClick={() => { if (!user) { setShowAuth(true); return; } setShowReview(true); }} style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                      {(() => {
                        const rCount = selected.review_count > 0 ? selected.review_count : reviews.length;
                        const rRating = selected.rating > 0 
                            ? Number(selected.rating).toFixed(1)
                            : (reviews.length > 0 ? (reviews.reduce((acc, r) => acc + (r.stars || 0), 0) / reviews.length).toFixed(1) : 0);
                        
                        if (rCount > 0) {
                          return (
                            <>
                              <img src="/estrella.svg" alt="star" style={{ width: 16, height: 16, marginTop: -2 }} />
                              <span className="text-sm" style={{ fontWeight: 800, color: dText }}>{rRating > 0 ? rRating : "Nuevo"}</span>
                              <span className="text-xs" style={{ color: dSub }}>({rCount})</span>
                            </>
                          );
                        } else {
                          return (
                            <div style={{ display: "flex", gap: 2 }}>
                              {[1,2,3,4,5].map(i => <Icon key={i} name="star" size={12} color={isElite ? "rgba(255,255,255,0.2)" : T.border} />)}
                            </div>
                          );
                        }
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Full Width Description */}
            {selected.description && (
              <p className="text-sm" style={{ color: dSub, fontWeight: 400, lineHeight: 1.6, margin: "0 0 16px 0", whiteSpace: "pre-wrap", textAlign: isElite ? "center" : "left" }}>{selected.description}</p>
            )}

            {/* Quick Actions Pills */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
              {(!selected.is_place && selected.phone) && <button className="press" onClick={() => callPhone(selected, null)} style={{ flex: "1 1 auto", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 12px", borderRadius: 24, background: "#F3F4F6", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                <img src="/telefono.svg" alt="Llamar" style={{ width: 18, height: 18, objectFit: "contain" }} />
                <span className="text-sm" style={{ fontWeight: 700, color: "#374151" }}>Llamar</span>
              </button>}
              {(!selected.is_place && selected.whatsapp) && <button className="press" onClick={() => goWhatsApp(selected, null)} style={{ flex: "1 1 auto", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 12px", borderRadius: 24, background: "#F3F4F6", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                <img src="/whatsapp.svg" alt="WhatsApp" style={{ width: 18, height: 18, objectFit: "contain" }} />
                <span className="text-sm" style={{ fontWeight: 700, color: "#374151" }}>WhatsApp</span>
              </button>}
              {!selected.hide_location && <button className="press" onClick={() => goDir(selected, null)} style={{ flex: "1 1 auto", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 12px", borderRadius: 24, background: "#F3F4F6", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                <img src="/mapa.svg" alt="Mapa" style={{ width: 18, height: 18, objectFit: "contain" }} />
                <span className="text-sm" style={{ fontWeight: 700, color: "#374151" }}>Mapa</span>
              </button>}
            </div>

            {selected.booking_config?.enabled && (
              <div style={{ marginBottom: 16 }}>
                {selected.booking_config.type === "external" && selected.booking_config.externalLinks?.length > 0 ? (
                  (() => {
                    const links = selected.booking_config.externalLinks;
                    const PLATFORM_STYLES = {
                      airbnb: { color: "#FF5A5F", label: "Airbnb", img: "/airbnb.svg" },
                      booking: { color: "#003580", label: "Booking.com", icon: "🧳" },
                      tripadvisor: { color: "#000000", label: "TripAdvisor", icon: "🦉" },
                      expedia: { color: "#00005C", label: "Expedia", icon: "✈️" },
                      opentable: { color: "#DA3743", label: "OpenTable", icon: "🍽️" },
                      resy: { color: "#B3282D", label: "Resy", icon: "🍷" },
                      ubereats: { color: "#06C167", label: "Uber Eats", icon: "🍔" },
                      rappi: { color: "#FF4500", label: "Rappi", icon: "🛵" },
                      didifood: { color: "#F76B1C", label: "DiDi Food", icon: "🥡" },
                      whatsapp: { color: "#25D366", label: "WhatsApp", icon: "💬" },
                      otro: { color: "#1877F2", label: "Sitio Web", icon: "🔗" }
                    };
                    
                    const renderIcon = (s, size = 16) => {
                      if (s.img) return <img src={s.img} alt={s.label} style={{ height: size * 1.4, width: "auto", display: "block" }} />;
                      return <span style={{ fontSize: size }}>{s.icon}</span>;
                    };

                    const openLink = (url) => {
                      let finalUrl = url;
                      if (!finalUrl.startsWith('http') && !finalUrl.startsWith('wa.me')) finalUrl = 'https://' + finalUrl;
                      window.open(finalUrl, '_blank', 'noopener,noreferrer');
                    };

                    const getPrefix = (platform) => {
                      if (['ubereats', 'rappi', 'didifood'].includes(platform)) return 'Haz tu pedido en';
                      if (['whatsapp', 'otro'].includes(platform)) return 'Ir a';
                      return 'Reservar en';
                    };

                    if (links.length === 1) {
                      const l = links[0];
                      const s = PLATFORM_STYLES[l.platform] || PLATFORM_STYLES.otro;
                      return (
                        <div style={{ display: "flex", justifyContent: "center" }}>
                          <button className="press" onClick={() => openLink(l.url)} style={{ background: s.color, border: "none", borderRadius: 24, padding: "8px 20px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
                            {renderIcon(s, 16)} {getPrefix(l.platform)} {s.label}
                          </button>
                        </div>
                      );
                    }
                    
                    if (links.length === 2) {
                      return (
                        <div style={{ display: "flex", gap: 10, justifyContent: "center", padding: "0 20px" }}>
                          {links.map((l, i) => {
                            const s = PLATFORM_STYLES[l.platform] || PLATFORM_STYLES.otro;
                            return (
                              <button key={i} className="press" onClick={() => openLink(l.url)} style={{ flex: 1, background: s.color, border: "none", borderRadius: 16, padding: "10px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                                {renderIcon(s, 18)} {s.label}
                              </button>
                            );
                          })}
                        </div>
                      );
                    }
                    
                    return (
                      <div style={{ padding: "0 20px" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: dSub, marginBottom: 8, textAlign: "center", textTransform: "uppercase", letterSpacing: 0.5 }}>Opciones disponibles:</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                          {links.map((l, i) => {
                            const s = PLATFORM_STYLES[l.platform] || PLATFORM_STYLES.otro;
                            return (
                              <button key={i} className="press" onClick={() => openLink(l.url)} style={{ background: s.color, border: "none", borderRadius: 12, padding: "8px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                                {renderIcon(s, 14)} {s.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <button className="press" onClick={() => { 
                      if (selected.booking_config?.type === "external" && selected.booking_config?.externalUrl) {
                        let url = selected.booking_config.externalUrl;
                        if (!url.startsWith('http') && !url.startsWith('wa.me')) url = 'https://' + url;
                        window.open(url, '_blank', 'noopener,noreferrer');
                        return;
                      }
                      setShowBooking(true); 
                    }} style={{ background: "#1877F2", border: "none", borderRadius: 24, padding: "6px 14px", color: "#ffffff", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "transform 0.2s" }}>
                      <Icon name="calendar" size={12} color="#ffffff" /> Solicitar {selected.booking_config.label || "Reservación"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Video Promocional (Premium) */}
          {asyncEmbedUrl && (
            <div style={{ padding: "20px 20px 0" }}>
              <div className="text-base" style={{ fontWeight: 800, color: dText, marginBottom: 14 }}>Video Promocional</div>
              <div style={{ position: "relative", paddingBottom: asyncEmbedUrl.includes("tiktok.com") ? "130%" : "56.25%", height: 0, overflow: "hidden", borderRadius: 16, background: isElite ? "rgba(255,255,255,0.05)" : "#E4E8E4" }}>
                <iframe 
                  src={asyncEmbedUrl} 
                  style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none", borderRadius: 16 }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen
                />
              </div>
            </div>
          )}

          {/* Fotos */}
          {selected.photos?.length > 1 && (
            <PhotoGallery 
              photos={selected.photos.slice(1)} 
              dText={dText} 
              T={T} 
              getThumbUrl={getThumbUrl}
              setShowGallery={setShowGallery}
            />
          )}

          {/* Menú/Catálogo Store Module (Sólo Premium) */}
          {selected.plan === 'premium' && <BusinessStore business={selected} T={T} isElite={isElite} />}

          {/* Promociones / Cupones / Menú originales preservados */}
          {!selected.is_place && promos.filter(p => p.biz_id === selected.id && p.img_url).length > 0 && <div style={{ padding: "20px 20px 0" }}>
            <div className="text-base" style={{ fontWeight: 800, color: dText, marginBottom: 16 }}>Promociones destacadas</div>
            {promos.filter(p => p.biz_id === selected.id && p.img_url).slice(0, 3).map(p => <div key={p.id} style={{ borderRadius: 16, overflow: "hidden", marginBottom: 10 }}><img src={getThumbUrl(p.img_url, 1200, 600)} alt="" style={{ width: "100%", display: "block", borderRadius: 16 }} loading="lazy" /></div>)}
          </div>}
          {!selected.is_place && coupons.filter(c => c.biz_id === selected.id).length > 0 && <div style={{ padding: "20px 20px 0" }}>
            <div className="text-base" style={{ fontWeight: 800, color: dText, marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}><Icon name="coupon" size={18} color={dText} />Cupones de descuento</div>
            {coupons.filter(c => c.biz_id === selected.id).map(c => {
              const saved = wallet.includes(c.id);
              const claimedAt = claimedCoupons[c.id];
              let timeLeftStr = "";
              let isExpired = false;
              let uniqueCode = c.code;
              
              if (claimedAt) {
                 const diff = 86400000 - (Date.now() - claimedAt);
                 if (diff <= 0) { isExpired = true; timeLeftStr = "Expirado"; }
                 else {
                    const h = Math.floor(diff / 3600000);
                    const m = Math.floor((diff % 3600000) / 60000);
                    timeLeftStr = `${h}h ${m}m restantes`;
                 }
                 uniqueCode = c.code + "-" + claimedAt.toString().slice(-4);
              }

              return <div key={c.id} style={{ background: isElite ? dCard : "#F5F3FF", borderRadius: 16, padding: "14px 16px", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                  <Icon name="coupon" size={24} color="#7C3AED" />
                  <div style={{ flex: 1 }}>
                    <div className="text-sm" style={{ fontWeight: 800, color: dText }}>{c.title} · {c.discount_pct}%</div>
                    <div className="text-xs" style={{ color: dSub, marginTop: 2 }}>{c.description}</div>
                    {c.expires_at && <div className="text-xs" style={{ color: "#D94F3D", marginTop: 4, fontWeight: 700 }}>Vence: {new Date(c.expires_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</div>}
                  </div>
                  {claimedAt ? (
                    <div className="text-sm" style={{ padding: "6px 8px", background: "#fff", border: "1.5px dashed #7C3AED", borderRadius: 8, fontWeight: 900, color: "#7C3AED", letterSpacing: 1, textAlign: "center", flexShrink: 0 }}>
                      <div className="text-micro" style={{ color: "#5A6872", letterSpacing: 0, marginBottom: 2 }}>TU CÓDIGO</div>
                      {uniqueCode}
                    </div>
                  ) : (
                    <div className="text-2xl" style={{ fontWeight: 900, color: "#D1D5DB", letterSpacing: 2, flexShrink: 0 }}>••••••</div>
                  )}
                </div>
                <button onClick={(e) => {
                  e.stopPropagation();
                  if (!user) { setShowAuth(true); toast$("Inicia sesión para reclamar"); return; }
                  if (!claimedAt) {
                    const newClaimed = { ...claimedCoupons, [c.id]: Date.now() };
                    setClaimedCoupons(newClaimed);
                    localStorage.setItem("citymap_claims", JSON.stringify(newClaimed));
                    if (!saved) {
                       const valid = [...wallet, c.id];
                       setWallet(valid);
                       localStorage.setItem("citymap_wallet", JSON.stringify(valid));
                    }
                    toast$("¡Cupón activado por 24 horas!");
                  }
                }} disabled={isExpired || !!claimedAt} style={{ width: "100%", padding: "10px", borderRadius: 10, border: "none", background: isExpired ? "#9CA3AF" : (claimedAt ? "#16A34A" : "#7C3AED"), color: "#fff", fontWeight: 700, fontSize: 13, cursor: (isExpired || claimedAt) ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  {isExpired ? "Cupón expirado" : (claimedAt ? <><Icon name="clock" size={14} color="#fff" /> {timeLeftStr}</> : <><Icon name="coupon" size={14} color="#fff" /> Reclamar Cupón</>)}
                </button>
              </div>;
            })}
          </div>}
          {!selected.is_place && raffles && raffles.filter(r => r.biz_id === selected.id).length > 0 && <div style={{ padding: "20px 20px 0" }}>
            <div className="text-base" style={{ fontWeight: 800, color: dText, marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}><Icon name="gift" size={18} color="#D94F3D" />Sorteos Activos</div>
            {raffles.filter(r => r.biz_id === selected.id).map(r => {
              const participated = JSON.parse(localStorage.getItem("citymap_raffles") || "{}")[r.id];
              const isEnded = new Date(r.ends_at).getTime() < Date.now();
              return <div key={r.id} style={{ background: "linear-gradient(135deg, #FFF9E6, #FFF0B3)", borderRadius: 16, padding: "16px", marginBottom: 10, border: "1.5px solid #FDE047" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "#F59E0B", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}><Icon name="gift" size={24} /></div>
                  <div style={{ flex: 1 }}>
                    <div className="text-base" style={{ fontWeight: 900, color: "#92400E" }}>{r.title}</div>
                    <div className="text-xs" style={{ color: "#B45309", marginTop: 2, fontWeight: 600 }}>{r.description}</div>
                  </div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.6)", borderRadius: 10, padding: "10px", marginBottom: 12, textAlign: "center" }}>
                  <div className="text-xs" style={{ fontWeight: 800, color: "#92400E", letterSpacing: 1, textTransform: "uppercase" }}>Premio</div>
                  <div className="text-sm" style={{ fontWeight: 900, color: "#D97706" }}>{r.prize}</div>
                </div>
                <button onClick={async (e) => {
                  e.stopPropagation();
                  if (!user) { setShowAuth(true); toast$("Inicia sesión para participar"); return; }
                  if (!participated && !isEnded) {
                    try {
                      await sb.post("raffle_participants", { raffle_id: r.id, user_id: user.id });
                    } catch(e) { console.log(e); }
                    const newParts = { ...JSON.parse(localStorage.getItem("citymap_raffles") || "{}"), [r.id]: true };
                    localStorage.setItem("citymap_raffles", JSON.stringify(newParts));
                    toast$("¡Estás participando en el sorteo!");
                    // Forzamos un re-render tonto cambiando algo en el store, o simplemente dejamos que el toast lo haga feliz.
                    setClaimBiz(Date.now().toString()); // trick to force render
                  }
                }} disabled={participated || isEnded} style={{ width: "100%", padding: "12px", borderRadius: 12, border: "none", background: participated ? "#16A34A" : (isEnded ? "#D1D5DB" : "#F59E0B"), color: "#fff", fontWeight: 800, fontSize: 14, cursor: (participated || isEnded) ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: participated || isEnded ? "none" : "0 4px 14px rgba(245, 158, 11, 0.4)" }}>
                  {isEnded ? "Sorteo finalizado" : (participated ? <><Icon name="check" size={16} color="#fff" /> ¡Estás participando!</> : <><Icon name="star" size={16} color="#fff" /> Participar Gratis</>)}
                </button>
              </div>;
            })}
          </div>}
          {selected.plan === 'destacado' && selected.menu_pdf_url && (() => {
            const menuUrls = parseMenuUrls(selected.menu_pdf_url);
            const isSinglePdf = menuUrls.length === 1 && menuUrls[0].toLowerCase().includes(".pdf");
            return (
              <div style={{ padding: "24px 20px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div className="text-base" style={{ fontWeight: 800, color: dText, letterSpacing: "-0.5px" }}>Menú</div>
                  {!isSinglePdf && menuUrls.length > 2 && (
                    <div onClick={() => setShowMenuGallery(true)} style={{ fontSize: 13, fontWeight: 700, color: T.green, cursor: "pointer" }}>Ver todo</div>
                  )}
                </div>

                {!isSinglePdf && (
                  <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 10, scrollSnapType: "x mandatory" }} className="no-scrollbar">
                    {menuUrls.slice(0, 3).map((url, i) => (
                      <div key={i} onClick={() => setShowMenuGallery(true)} style={{ flexShrink: 0, width: 140, height: 180, borderRadius: 12, overflow: "hidden", background: T.border, scrollSnapAlign: "start", cursor: "pointer", border: `1px solid ${isElite ? "rgba(255,255,255,0.1)" : T.border}`, position: "relative" }}>
                        <img src={getThumbUrl(url, 400, 600)} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="Menú" />
                        {i === 2 && menuUrls.length > 3 && (
                          <div className="text-base" style={{ position: "absolute", inset: 0, background: "rgba(0, 0, 0, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800 }}>
                            +{menuUrls.length - 3} hojas
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <button onClick={() => isSinglePdf ? window.open(menuUrls[0], '_blank') : setShowMenuGallery(true)} style={{ width: '100%', padding: '12px 16px', borderRadius: 14, background: dark ? '#1E293B' : '#0F172A', border: 'none', color: '#FFFFFF', fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', marginTop: isSinglePdf ? 0 : 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontFamily: "inherit" }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F97316', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon name="file" size={16} color="#ffffff" />
                  </div>
                  <span className="text-sm" style={{ fontWeight: 800, color: "#ffffff" }}>
                    {isSinglePdf ? "Abrir menú en PDF" : `Ver menú completo (${menuUrls.length} hojas)`}
                  </span>
                </button>
              </div>
            );
          })()}

          {/* Redes Sociales */}
          {((selected.instagram || selected.social_links?.instagram) || (selected.facebook || selected.social_links?.facebook) || (selected.tiktok || selected.social_links?.tiktok) || (selected.website || selected.social_links?.website)) && <div style={{ padding: "20px 20px 0" }}>
            <div className="text-base" style={{ fontWeight: 800, color: dText, marginBottom: 16, textAlign: "center" }}>Redes sociales</div>
            <div style={{ display: "flex", justifyContent: "center", gap: 14, overflowX: "auto", paddingBottom: 4 }}>
              {(selected.instagram || selected.social_links?.instagram) && <div onClick={() => window.open(`https://instagram.com/${(selected.instagram || selected.social_links?.instagram)?.replace("@","")}`, "_blank")} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", flexShrink: 0 }}>
                <div style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <img src="/instagram.svg" alt="Instagram" style={{ width: "28px", height: "28px", objectFit: "contain" }} />
                </div>
                <span className="text-sm" style={{ fontWeight: 600, color: dText }}>Instagram</span>
              </div>}
              {(selected.facebook || selected.social_links?.facebook) && <div onClick={() => window.open(`https://facebook.com/${(selected.facebook || selected.social_links?.facebook)?.replace("@","")}`, "_blank")} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", flexShrink: 0 }}>
                <div style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <img src="/facebook.svg" alt="Facebook" style={{ width: "28px", height: "28px", objectFit: "contain" }} />
                </div>
                <span className="text-sm" style={{ fontWeight: 600, color: dText }}>Facebook</span>
              </div>}
              {(selected.tiktok || selected.social_links?.tiktok) && <div onClick={() => window.open(`https://tiktok.com/${selected.tiktok || selected.social_links?.tiktok}`, "_blank")} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", flexShrink: 0 }}>
                <div style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <img src="/tiktok.svg" alt="TikTok" style={{ width: "28px", height: "28px", objectFit: "contain" }} />
                </div>
                <span className="text-sm" style={{ fontWeight: 600, color: dText }}>TikTok</span>
              </div>}
              {(selected.website || selected.social_links?.website) && <div onClick={() => goWeb(selected, null)} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", flexShrink: 0 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: dIconBg, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="globe" size={18} color="#0EA5E9" /></div>
                <span className="text-sm" style={{ fontWeight: 600, color: dText }}>Sitio web</span>
              </div>}
            </div>
          </div>}

          {/* Location & Schedule Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "20px 20px 0" }}>
            <div style={{ background: isElite ? dCard : T.card, borderRadius: 16, padding: "16px 14px", border: "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: Object.keys(selected.schedule || {}).length > 0 ? 16 : 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(22, 163, 74, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="clock" size={12} color="#16A34A" /></div>
                <span className="text-sm" style={{ fontWeight: 800, color: dText }}>Horario</span>
              </div>
              {(!selected.schedule?.type || selected.schedule.type === "regular" || selected.schedule.type === "advanced" || selected.schedule.type === "delivery") ? (
                Object.keys(selected.schedule || {}).filter(k => k !== 'type').length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {[["lun", "Lunes"], ["mar", "Martes"], ["mie", "Miércoles"], ["jue", "Jueves"], ["vie", "Viernes"], ["sab", "Sábado"], ["dom", "Domingo"]].map(([k, label]) => {
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
                      const val = formatTimeRange(selected.schedule[k]);
                      const closed = /cerrado/i.test(val);
                      const todayKey = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"][new Date().getDay()];
                      const isToday = k === todayKey;
                      return (
                        <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span className="text-sm" style={{ fontWeight: isToday ? 800 : 500, color: isToday ? T.text : dSub }}>{label}{isToday && " (Hoy)"}</span>
                          <span className="text-sm" style={{ fontWeight: closed ? 700 : (isToday ? 700 : 500), color: closed ? T.red : (isToday ? T.text : dSub), whiteSpace: "pre-wrap", textAlign: "right", lineHeight: 1.3 }}>{val}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm" style={{ color: dSub, lineHeight: 1.5, fontWeight: 500 }}>{selected.hours || "No hay horario registrado"}</div>
                )
              ) : (
                <div className="text-sm" style={{ color: dSub, lineHeight: 1.5, fontWeight: 500 }}>
                  {selected.schedule.type === "always_open" ? "Siempre Abierto (24/7)" : "Atención por previa cita o servicio. Contacta al negocio para más información."}
                </div>
              )}
            </div>

            {!selected.hide_location && <div style={{ background: isElite ? dCard : T.card, borderRadius: 16, padding: "16px 14px", border: "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(124, 58, 237, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="pin" size={12} color="#7C3AED" /></div>
                <span className="text-sm" style={{ fontWeight: 800, color: dText }}>Ubicación</span>
              </div>
              <div className="text-xs" style={{ color: dSub, lineHeight: 1.5, marginBottom: 12 }}>{selected.address}</div>
              <button onClick={(e) => goDir(selected, e)} style={{ width: "100%", padding: "10px 0", background: isElite ? "rgba(255,255,255,0.05)" : "#F5F3FF", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 12, color: "#7C3AED", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Icon name="nav" size={12} color="#7C3AED" /> Cómo llegar</button>
            </div>}
          </div>

          {/* Evento Destacado */}
          {(() => {
            const ev = events.find(e => e.biz_id === selected.id && e.status === "approved" && e.active !== false);
            if (!ev) return null;
            return <div style={{ padding: "20px 20px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div className="text-base" style={{ fontWeight: 800, color: dText }}>Evento destacado</div>
                <div onClick={() => navigate("events")} style={{ fontSize: 13, fontWeight: 700, color: T.green, cursor: "pointer" }}>Ver todos</div>
              </div>
              <div className="press" onClick={() => { setSelectedEvent(ev); }} style={{ display: "flex", gap: 12, border: `1px solid ${isElite ? "rgba(255,255,255,0.1)" : T.border}`, borderRadius: 16, padding: 12, alignItems: "center", cursor: "pointer" }}>
                <div style={{ width: 80, height: 60, borderRadius: 8, background: dBg, overflow: "hidden", flexShrink: 0 }}>
                  <img src={ev.img_url || ev.img || ""} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="text-sm" style={{ fontWeight: 800, color: dText }}>{ev.title}</div>
                  <div className="text-xs" style={{ color: dSub, marginTop: 2 }}>{ev.date} · {ev.time}</div>
                  <div className="text-xs" style={{ color: T.green, fontWeight: 700, marginTop: 4 }}>No te lo pierdas 🎉</div>
                </div>
                <Icon name="chevron" size={16} color={dSub} style={{ transform: "rotate(-90deg)" }} />
              </div>
            </div>;
          })()}

          {/* Reseñas de Google Maps */}
          {selected.social_links?.google_place_id && googleData && googleData.reviews && googleData.reviews.length > 0 && (
            <div style={{ padding: "32px 20px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <img src="/googlelogo.svg" alt="Google" style={{ width: 20, height: 20, objectFit: "contain" }} />
                  <span className="text-base" style={{ fontWeight: 800, color: dText }}>Reseñas en Google</span>
                </div>
                <div className="text-sm" style={{ fontWeight: 700, color: dSub }}>{googleData.rating} ★ ({googleData.count} reseñas)</div>
              </div>
              <div style={{ background: isElite ? dCard : T.card, borderRadius: 16, padding: "16px", border: "none", display: "flex", flexDirection: "column", gap: 16 }}>
                {googleData.reviews.slice(0, 3).map((r, i) => (
                  <GoogleReviewItem 
                    key={i} 
                    r={r} 
                    isElite={isElite} 
                    dText={dText} 
                    dSub={dSub} 
                    T={T} 
                    isLast={i === Math.min(googleData.reviews.length, 3) - 1} 
                  />
                ))}
                
                <a href={`https://search.google.com/local/reviews?placeid=${selected.social_links.google_place_id}`} target="_blank" rel="noreferrer" style={{ width: "100%", padding: "12px", background: "transparent", border: `1.5px solid ${isElite ? "rgba(255,255,255,0.1)" : T.border}`, borderRadius: 12, fontSize: 13, fontWeight: 700, color: dText, cursor: "pointer", marginTop: 4, display: "block", textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>
                  Leer todas en Google Maps
                </a>
              </div>
            </div>
          )}

          {/* Reseñas Internas */}
          <div style={{ padding: "32px 20px 84px", marginBottom: 20 }}>
            <div className="text-base" style={{ fontWeight: 800, color: dText, marginBottom: 16 }}>Reseñas</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, background: dBg, borderRadius: 16, padding: "16px 16px", border: `1px solid ${isElite ? "rgba(255,255,255,0.1)" : T.border}` }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 48, height: 48, background: "#fff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}><img src="/estrella.svg" alt="Estrella" style={{ width: 24, height: 24, objectFit: "contain" }} /></div>
                <div>
                  <StarRow n={0} size={16} />
                  <div className="text-xs" style={{ color: dSub, marginTop: 4 }}>{reviews.length > 0 ? "Comparte tu experiencia" : "Sé el primero en dejar reseña"}</div>
                </div>
              </div>
              <button className="press" onClick={() => { if (!user) { setShowAuth(true); return; } setShowReview(v => !v); }} style={{ padding: "10px 16px", border: "1px solid #7C3AED", borderRadius: 10, fontSize: 12, fontWeight: 700, color: "#7C3AED", background: isElite ? "rgba(124, 58, 237, 0.1)" : "#fff", cursor: "pointer", fontFamily: "inherit" }}>Escribir reseña</button>
            </div>

            {showReview && <div style={{ background: dBg, borderRadius: 12, padding: 14, marginBottom: 16, border: `1px solid ${isElite ? "rgba(255,255,255,0.1)" : T.border}` }}>
              <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>{[1, 2, 3, 4, 5].map(s => <button key={s} onClick={() => setReviewStar(s)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}><img src="/estrella.svg" alt="star" style={{ width: 24, height: 24, filter: s <= reviewStar ? "none" : "grayscale(1) opacity(0.3)", marginTop: -2 }} /></button>)}</div>
              <textarea className="inp" rows={3} style={{ resize: "none", marginBottom: 10 }} placeholder="Comparte tu experiencia…" value={reviewText} onChange={e => setReviewText(e.target.value)} />
              
              {reviewImgFile && (
                <div style={{ position: "relative", width: 80, height: 80, marginBottom: 10, borderRadius: 8, overflow: "hidden", border: `1px solid ${T.border}` }}>
                  <img src={URL.createObjectURL(reviewImgFile)} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button onClick={() => setReviewImgFile(null)} style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icon name="x" size={10} color="#fff" /></button>
                </div>
              )}
              
              <div style={{ display: "flex", gap: 10 }}>
                <label style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 12, background: isElite ? "rgba(255,255,255,0.1)" : T.bg, border: `1px dashed ${T.border}`, cursor: "pointer", flexShrink: 0 }}>
                  <input type="file" accept="image/*" hidden onChange={e => { if(e.target.files[0]) setReviewImgFile(e.target.files[0]); }} />
                  <Icon name="camera" size={20} color={dSub} />
                </label>
                <button className="btn-g press" style={{ flex: 1, padding: 12, opacity: reviewImgLoading ? 0.7 : 1 }} onClick={() => postReview(selected.id)} disabled={reviewImgLoading}>
                  {reviewImgLoading ? "Publicando..." : "Publicar reseña"}
                </button>
              </div>
            </div>}
            {reviews.slice(0, showAllReviews ? reviews.length : 3).map((r, i) => <div key={i} style={{ padding: "16px 0", borderBottom: `1px solid ${isElite ? "rgba(255,255,255,0.1)" : T.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div className="text-sm" style={{ width: 40, height: 40, borderRadius: "50%", background: r.user_color || "#7C3AED", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff", flexShrink: 0 }}>{r.user_init}</div>
                  <div>
                    <div className="text-sm" style={{ fontWeight: 800, color: dText }}>{r.user_name}</div>
                    <div className="text-xs" style={{ color: dSub, marginTop: 2 }}>{new Date(r.created_at).toLocaleDateString("es-MX", { day: "numeric", month: "long" })}</div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  <StarRow n={r.stars} size={14} />
                  {(isAdmin || user?.id === r.user_id) && <button onClick={async () => { 
                    if(window.confirm("¿Eliminar esta reseña?")){ 
                      try {
                        await sb.del("reviews", r.id); 
                        setReviews(p => {
                          const newReviews = p.filter(x => x.id !== r.id);
                          const count = newReviews.length;
                          const avg = count > 0 ? Math.round((newReviews.reduce((a, c) => a + (c.stars || 0), 0) / count) * 10) / 10 : 0;
                          
                          // Update business stats
                          sb.patch("businesses", selected.id, { rating: avg, review_count: count }).catch(() => {});
                          setBiz(prev => prev.map(b => b.id === selected.id ? { ...b, rating: avg, review_count: count } : b));
                          setSelected(prev => prev?.id === selected.id ? { ...prev, rating: avg, review_count: count } : prev);
                          
                          return newReviews;
                        }); 
                        toast$("Reseña eliminada"); 
                      } catch (err) {
                        alert("Error al eliminar la reseña. Puede ser un problema de permisos en la base de datos (RLS).");
                        console.error(err);
                      }
                    } 
                  }} style={{ background: "none", border: "none", color: T.red, fontSize: 11, fontWeight: 700, cursor: "pointer", padding: 0 }}>Eliminar</button>}
                </div>
              </div>
              <p className="text-sm" style={{ color: dText, lineHeight: 1.6, marginTop: 10, marginBottom: r.img_url ? 10 : 12 }}>{r.text}</p>
              {r.img_url && (
                <div style={{ marginBottom: 12, borderRadius: 12, overflow: "hidden", border: `1px solid ${isElite ? "rgba(255,255,255,0.1)" : T.border}`, width: "100%", maxWidth: 300, background: isElite ? "transparent" : "#f5f5f5" }}>
                  <img src={getThumbUrl(r.img_url, 600, 600)} alt="Foto de la reseña" loading="lazy" style={{ width: "100%", height: "auto", display: "block", maxHeight: 300, objectFit: "cover" }} />
                </div>
              )}
              <div style={{ display: "flex", gap: 10 }}>
                <button className="press" onClick={() => toggleLikeReview(r)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", border: `1px solid ${r.liked_by?.includes(user?.id) ? T.green : (isElite ? "rgba(255,255,255,0.1)" : T.border)}`, borderRadius: 20, background: r.liked_by?.includes(user?.id) ? "rgba(22, 163, 74, 0.05)" : dCard, color: r.liked_by?.includes(user?.id) ? T.green : dSub, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill={r.liked_by?.includes(user?.id) ? T.green : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg> Útil ({r.liked_by?.length || 0})
                </button>
              </div>
            </div>)}
            
            {reviews.length > 3 && (
              <button 
                className="press" 
                onClick={() => setShowAllReviews(!showAllReviews)} 
                style={{ width: "100%", padding: "14px", background: isElite ? "rgba(255,255,255,0.05)" : T.bg, border: `1px solid ${isElite ? "rgba(255,255,255,0.1)" : T.border}`, borderRadius: 12, fontSize: 14, fontWeight: 700, color: dText, cursor: "pointer", marginTop: 16, fontFamily: "inherit" }}
              >
                {showAllReviews ? "Mostrar menos" : `Ver todas las reseñas (${reviews.length})`}
              </button>
            )}
            
            {!selected.user_id && (
              <div style={{ marginTop: 24, paddingTop: 24, borderTop: `1px solid ${isElite ? "rgba(255,255,255,0.1)" : T.border}`, textAlign: "center" }}>
                <div className="text-sm" style={{ color: dSub, marginBottom: 12 }}>¿Eres el dueño o administrador de {selected.name}?</div>
                <button className="press" onClick={() => { if(!user){ setShowAuth(true); toast$("Inicia sesión para reclamar este negocio"); return; } setClaimBiz(selected); }} style={{ padding: "10px 20px", background: isElite ? dCard : T.white, border: `1.5px solid ${isElite ? "rgba(255,255,255,0.2)" : T.border}`, borderRadius: 20, fontSize: 13, fontWeight: 700, color: dText, cursor: "pointer", fontFamily: "inherit", boxShadow: isElite ? "none" : T.shadow }}>Reclamar este negocio</button>
              </div>
            )}
          </div>
        </motion.div>
        
        {showBooking && (
          <ErrorBoundary>
            <Suspense fallback={
              <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                <div style={{ textAlign: "center", padding: "40px", background: "#fff", borderRadius: 24, width: "100%", maxWidth: 440, boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}>Cargando reservaciones...</div>
              </div>
            }>
              <BookingModal biz={selected} onClose={() => setShowBooking(false)} />
            </Suspense>
          </ErrorBoundary>
        )}
    </div>
  );
}
