import React, { useState, useEffect, lazy, Suspense } from "react";
import { m, AnimatePresence } from "framer-motion";
import { useAppContext } from "../context/AppContext";
import { useUIStore } from "../store/useUIStore.js";
import { useDataStore } from "../store/useDataStore.js";
import { useAuthStore } from "../store/useAuthStore.js";
import { useShallow } from 'zustand/react/shallow';
import * as dbService from '../services/dbService';
import useTimeStore from "../store/useTimeStore.js";
import Icon from "../components/ui/Icon.jsx";
import StarRow from "../components/ui/StarRow.jsx";
import { ErrorBoundary } from "../components/ErrorBoundary.jsx";
import { haptic } from "../lib/utils.js";
import { CAT_EMOJI, isOpenNow, getThumbUrl, getCategoryDescription, parseMenuUrls, getScheduleStatus, getSmartScheduleInfo } from "../lib/utils";

const MapPicker = lazy(() => import('../components/map/MapPicker.jsx'));
const Gallery = lazy(() => import('../components/Gallery.jsx'));
const BookingModal = lazy(() => import('../components/BookingModal.jsx'));
import BusinessStore from '../components/store/BusinessStore.jsx';
import MercadoLibreShowcase from '../components/MercadoLibreShowcase.jsx';
import { Helmet } from 'react-helmet-async';

const GalleryLayout = ({ photos, T, setShowGallery, bizName }) => {
  if (!photos || photos.length === 0) return null;

  return (
    <div style={{ padding: "20px 0 0", position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, padding: "0 20px" }}>
        <div className="text-base" style={{ fontWeight: 800, color: T.text, letterSpacing: "-0.5px" }}>Galería de fotos</div>
      </div>

      <style>{`
        .mosaic-gallery {
          display: grid;
          gap: 12px;
          padding: 0 20px;
        }
        .mosaic-gallery.count-1 {
          grid-template-columns: 1fr;
        }
        .mosaic-gallery.count-2 {
          grid-template-columns: 1fr 1fr;
        }
        .mosaic-gallery.count-more {
          grid-template-columns: 1fr 1fr;
        }
        .mosaic-item {
          border-radius: 16px;
          overflow: hidden;
          background: ${T.border};
          cursor: pointer;
          position: relative;
          box-shadow: 0 4px 12px rgba(0,0,0,0.06);
          transition: transform 0.2s, box-shadow 0.2s;
          aspect-ratio: 4/3;
        }
        .mosaic-item:active {
          transform: scale(0.97);
        }
        .mosaic-item-lead {
          grid-column: 1 / -1;
          aspect-ratio: 2/1;
        }
        .mosaic-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
      `}</style>

      <div className={`mosaic-gallery ${photos.length === 1 ? 'count-1' : photos.length === 2 ? 'count-2' : 'count-more'}`}>
        {photos.slice(0, 3).map((photo, index) => {
          const isLead = photos.length >= 3 && index === 0;
          const isLastVisible = photos.length > 3 && index === 2;
          
          return (
            <div 
              key={index} 
              className={`mosaic-item ${isLead ? 'mosaic-item-lead' : ''}`}
              onClick={() => setShowGallery(index)}
            >
              <img 
                src={getThumbUrl(photo.url, isLead ? 1200 : 600, isLead ? 600 : 600)} 
                className="mosaic-img"
                alt={`Foto ${index + 1} de ${bizName || "galería"}`} 
                loading="lazy"
              />
              {isLastVisible && (
                <div className="text-xl" style={{ position: "absolute", inset: 0, background: "rgba(0, 0, 0, 0.4)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800 }}>
                  +{photos.length - 3}
                </div>
              )}
            </div>
          );
        })}
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
             <img src={r.profile_photo_url} alt="Foto de perfil" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />
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

const TikTokBlock = ({ url, videoId }) => {
  useEffect(() => {
    const existingScript = document.getElementById('tiktok-embed-script');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'tiktok-embed-script';
      script.src = 'https://www.tiktok.com/embed.js';
      script.async = true;
      document.body.appendChild(script);
    } else {
       if (window.tiktokEmbed && typeof window.tiktokEmbed.lib?.render === 'function') {
         setTimeout(() => window.tiktokEmbed.lib.render(), 100);
       }
    }
  }, [url]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', width: '100%', borderRadius: 16, overflow: 'hidden' }}>
      <blockquote 
        className="tiktok-embed" 
        cite={url} 
        data-video-id={videoId} 
        style={{ maxWidth: '100%', minWidth: '325px', margin: 0 }}
      >
        <section></section>
      </blockquote>
    </div>
  );
};

export default function DetailView() {
  const ctx = useAppContext();
  const { dark, activeCity, toast$, setShowItineraryModal, setItineraryTargetBiz } = useUIStore(useShallow(s => ({ dark: s.dark, activeCity: s.activeCity, toast$: s.toast$, setShowItineraryModal: s.setShowItineraryModal, setItineraryTargetBiz: s.setItineraryTargetBiz })));
  const { dbReady, promos, coupons, events, wallet, setWallet, claimedCoupons, setClaimedCoupons, reviews, setReviews, globalFavCounts, raffles, setRaffles } = useDataStore(useShallow(s => ({ dbReady: s.dbReady, promos: s.promos, coupons: s.coupons, events: s.events, wallet: s.wallet, setWallet: s.setWallet, claimedCoupons: s.claimedCoupons, setClaimedCoupons: s.setClaimedCoupons, reviews: s.reviews, setReviews: s.setReviews, globalFavCounts: s.globalFavCounts, raffles: s.raffles, setRaffles: s.setRaffles })));
  const { user, setShowAuth } = useAuthStore(useShallow(s => ({ user: s.user, setShowAuth: s.setShowAuth })));
  
  const { viewStyle, selected, setView, setFade, navigate, T, favIds, toggleFav, goWhatsApp, goDir, doShare, getEventStatus, setReviewStar, setReviewText, setShowReview, biz, userCoords, getKm, showGallery, setShowGallery, FONT_BIZ, isOpen, callPhone, setMapPin, setShowMenuGallery, goWeb, trackEvent, setSelectedEvent, handleEventTap, createSlug, showReview, reviewStar, reviewText, postReview, isAdmin, setBiz, setSelected, toggleLikeReview, setClaimBiz, reviewImgFile, setReviewImgFile, reviewImgLoading } = ctx;
  const now = useTimeStore(s => s.now);

  const mapsOk = useGMaps();
  const [googleData, setGoogleData] = useState(null);
  const [asyncEmbedUrl, setAsyncEmbedUrl] = useState(null);
  const [showBooking, setShowBooking] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

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

  useEffect(() => {
    if (selected && selected.id) {
      dbService.fetchFullBusiness(selected.id).then(res => {
        if (res && res.length > 0) {
          const fullData = { 
            ...selected, 
            ...res[0], 
            _fullFetched: true 
          };
          if (fullData.reviews) {
            const revs = [...fullData.reviews];
            revs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setReviews(revs);
            delete fullData.reviews;
          }
          setSelected(fullData);
        }
      }).catch(err => console.error("Error cargando detalles extra:", err));
    }
  }, [selected?.id]);

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
          if (data.videoId && data.finalUrl) {
            setAsyncEmbedUrl(JSON.stringify({ type: 'tiktok', url: data.finalUrl, id: data.videoId }));
          }
        })
        .catch(e => console.error("TikTok resolve error:", e));
    }
  }, [selected?.video_url]);

  if (!selected) return null;
  const isElite = false; // Desactivado por petición del usuario
          const dText = T.text;
          const dSub = T.sub;
          const dBg = T.bg;
          const dCard = T.white;
          const dIconBg = T.iconBg;
          
  const baseSchema = {
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

  const schemaOrgJSONLD = {
    "@context": "https://schema.org",
    "@graph": [
      baseSchema,
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "CityMap",
            "item": "https://citymap.mx"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": ((selected.city_slug || activeCity).split(',')[0] || "Tepic").replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            "item": `https://citymap.mx/${selected.city_slug || activeCity}`
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": selected.name,
            "item": baseSchema.url
          }
        ]
      }
    ]
  };

  const canonicalUrl = baseSchema.url;

  return (
    <div 
      style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, background: T.bg, display: "flex", flexDirection: "column", alignItems: "center" }}
      onClick={() => navigate("home")}
    >
      <Helmet>
        <title>{selected.name} en CityMap</title>
        <meta name="description" content={baseSchema.description} />
        <link rel="canonical" href={canonicalUrl} />
      </Helmet>
      
      {/* Schema.org Injection */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrgJSONLD).replace(/</g, '\\u003c').replace(/>/g, '\\u003e') }} />
      <m.div 
        initial={{ scale: 0.95, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        transition={{ duration: 0.2, ease: "easeOut" }} 
        onClick={e => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 600, height: "100%", overflowY: "auto", overflowX: "hidden", background: T.bg, position: "relative", boxShadow: "0 0 40px rgba(0,0,0,0.1)" }}
      >
        {/* Header Image Full Bleed */}
            <div style={{ height: isElite ? "45vh" : 280, position: "relative", background: "#111", overflow: "hidden", flexShrink: 0 }}>
              <img src={selected.photos?.[0]?.url ? getThumbUrl(selected.photos[0].url, 1200, 900) : ""} alt={`Foto de ${selected.name}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              {isElite && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "50%", background: "linear-gradient(to top, #111111 0%, rgba(17,17,17,0) 100%)" }} />}
              <div style={{ position: "absolute", top: 16, left: 16, right: 16, display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 20 }}>
                <button aria-label="Volver" className="press" onClick={() => navigate("home")} style={{ padding: 12, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="chevron" size={26} color="#fff" style={{ transform: "rotate(180deg)", filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.6))" }} />
                </button>
                <div style={{ display: "flex", gap: 0 }}>
                  <button aria-label="Añadir a plan" className="press" onClick={e => { e.stopPropagation(); haptic("light"); setItineraryTargetBiz(selected); setShowItineraryModal(true); }} style={{ padding: 12, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name="plus" size={24} color="#fff" style={{ filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.6))" }} />
                  </button>
                  <button aria-label={favIds.includes(selected.id) ? "Quitar de favoritos" : "Añadir a favoritos"} className="press" onClick={e => { haptic("light"); toggleFav(selected.id, e); }} style={{ padding: 12, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name={favIds.includes(selected.id) ? "heart_overlay_f" : "heart_overlay"} size={24} color="#fff" style={{ filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.6))" }} />
                  </button>
                  <button aria-label="Compartir" className="press" onClick={e => doShare(selected, e)} style={{ padding: 12, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name="share" size={24} color="#fff" style={{ filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.6))" }} />
                  </button>
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
              
              {selected.logo_url && (selected.plan === "premium" || selected.plan === "pro" || selected.plan === "destacado") && (
                <div style={{ position: "absolute", top: -48, left: 16, width: 96, height: 96, borderRadius: "50%", background: "#fff", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 6px 16px rgba(0,0,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 40, padding: 3, boxSizing: "border-box", overflow: "hidden" }}>
                  <img src={getThumbUrl(selected.logo_url, 300, 300)} width={90} height={90} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "50%" }} alt={`Logo de ${selected.name}`} />
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, marginTop: selected.logo_url && (selected.plan === "premium" || selected.plan === "pro" || selected.plan === "destacado") ? 38 : 0 }}>
                <div style={{ flex: 1, textAlign: "left" }}>
                  {selected.badge && (
                    <div style={{ display: 'inline-block', fontSize: 10, fontWeight: 800, color: "#C9A84C", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6, background: "rgba(201,168,76,0.1)", padding: "4px 8px", borderRadius: 12 }}>
                      {selected.badge}
                    </div>
                  )}
                  <h1 className="text-2xl" style={{ fontFamily: FONT_BIZ, color: dText, lineHeight: 1.15, fontWeight: 800, margin: "0", display: "flex", alignItems: "center" }}>
                    {selected.name}
                    {(selected.plan === "destacado" || selected.plan === "premium" || selected.plan === "pro") && (
                      <img src="/verificado.png" alt="Verificado" width="22" height="22" style={{ marginLeft: 6, flexShrink: 0 }} />
                    )}
                  </h1>
                  {(() => {
                    const rawParts = [
                      selected.type,
                      selected.tagline,
                      ...(Array.isArray(selected.tags) ? selected.tags : typeof selected.tags === 'string' ? selected.tags.split(',').map(t => t.trim()) : [])
                    ].filter(Boolean);
                    const parts = [...new Set(rawParts)];
                    if (parts.length === 0) return null;
                    return (
                      <p className="text-sm" style={{ color: dSub, fontWeight: 500, margin: "2px 0 0 0" }}>
                        {parts.length === 1 ? `• ${parts[0]}` : parts.join(" • ")}
                      </p>
                    );
                  })()}
                  
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {!selected.is_place && (() => {
                        const smartSt = getSmartScheduleInfo(selected, window.CITY_TZ, now);
                        return (
                          <>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: smartSt.color, display: "inline-block" }} />
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
            <div style={{ display: "flex", gap: 8, padding: "0 20px" }}>
              {(selected.phone) && <button className="press" onClick={() => callPhone(selected, null)} style={{ flex: "1 1 auto", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 12px", borderRadius: 24, background: "transparent", border: `1px solid ${T.border}`, cursor: "pointer", fontFamily: "inherit" }}>
                <img src="/telefono.svg" alt="Teléfono" style={{ width: 18, height: 18, objectFit: "contain" }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Llamar</span>
              </button>}
              
              {(selected.whatsapp) && <button className="press" onClick={() => goWhatsApp(selected, null)} style={{ flex: "1 1 auto", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 12px", borderRadius: 24, background: "transparent", border: `1px solid ${T.border}`, cursor: "pointer", fontFamily: "inherit" }}>
                <img src="/whatsapp.svg" alt="WhatsApp" style={{ width: 18, height: 18, objectFit: "contain" }} />
                <span className="text-sm" style={{ fontWeight: 700, color: T.text }}>WhatsApp</span>
              </button>}
              {!selected.hide_location && <button className="press" onClick={() => goDir(selected, null)} style={{ flex: "1 1 auto", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 12px", borderRadius: 24, background: "transparent", border: `1px solid ${T.border}`, cursor: "pointer", fontFamily: "inherit" }}>
                <img src="/mapa.svg" alt="Mapa" style={{ width: 18, height: 18, objectFit: "contain" }} />
                <span className="text-sm" style={{ fontWeight: 700, color: T.text }}>Mapa</span>
              </button>}
            </div>

            {selected.booking_config?.enabled && (
              <div style={{ marginTop: 16, marginBottom: 16 }}>
                {selected.booking_config.type === "external" && selected.booking_config.externalLinks?.length > 0 ? (
                  (() => {
                    const links = selected.booking_config.externalLinks;
                    const PLATFORM_STYLES = {
                      airbnb: { color: "#FF5A5F", label: "Airbnb", img: "/airbnb.svg" },
                      booking: { color: "#003580", label: "Booking.com", img: "/booking.png" },
                      tiqets: { color: "#4bc2c5", label: "Comprar entradas", img: "/tiqets.png" },
                      tripadvisor: { color: "#000000", label: "TripAdvisor", img: "/tripadvisor.png" },
                      expedia: { color: "#00005C", label: "Expedia.com", img: "/expedia.png" },
                      hoteles: { color: "#D11013", label: "Hoteles.com", img: "/hoteles.com.png" },
                      getyourguide: { color: "#FF5B00", label: "GetYourGuide", img: "/getyourguide.png" },
                      renta_auto: { color: "#E11D48", label: "Rentar Auto", icon: "🚗" },
                      opentable: { color: "#DA3743", label: "OpenTable", icon: "🍽️" },
                      ubereats: { color: "#06C167", label: "Uber Eats", icon: "🍔" },
                      rappi: { color: "#FF4500", label: "Rappi", icon: "🛵" },
                      didifood: { color: "#F76B1C", label: "DiDi Food", icon: "🥡" },
                      whatsapp: { color: "#25D366", label: "WhatsApp", icon: "💬" },
                      comprar_entradas: { color: "#111827", label: "Comprar Entradas", icon: "🎟️" },
                      otro: { color: "#1877F2", label: "Sitio Web", icon: "🔗" }
                    };
                    
                    const renderIcon = (s, size = 16) => {
                      if (s.img) return <img src={s.img} alt={s.label} style={{ height: size * 1.4, width: "auto", display: "block", filter: s.invertImg ? "invert(1) brightness(2)" : "none" }} />;
                      return <span style={{ fontSize: size }}>{s.icon}</span>;
                    };

                    const openLink = (url) => {
                      let finalUrl = url;
                      if (!finalUrl.startsWith('http') && !finalUrl.startsWith('wa.me')) finalUrl = 'https://' + finalUrl;
                      window.open(finalUrl, '_blank', 'noopener,noreferrer');
                    };

                    const getPrefix = (platform) => {
                      if (platform === 'tiqets') return '';
                      if (['ubereats', 'rappi', 'didifood'].includes(platform)) return 'Haz tu pedido en';
                      if (['whatsapp', 'otro'].includes(platform)) return 'Ir a';
                      return 'Reservar en';
                    };

                    if (links.length === 1) {
                      const l = links[0];
                      const s = PLATFORM_STYLES[l.platform] || PLATFORM_STYLES.otro;
                      const prefix = getPrefix(l.platform);
                      return (
                        <div style={{ display: "flex", justifyContent: "center", padding: "0 20px" }}>
                          <button className="press" onClick={() => openLink(l.url)} style={{ width: "100%", background: dark ? "#222" : "#ffffff", border: `1px solid ${dark ? "#333" : "#E5E7EB"}`, borderRadius: 16, padding: "14px", color: dark ? "#fff" : "#111827", fontSize: 15, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, boxShadow: dark ? "none" : "0 2px 12px rgba(0,0,0,0.04)" }}>
                            {renderIcon(s, 22)} {prefix ? prefix + ' ' : ''}{s.label}
                          </button>
                        </div>
                      );
                    }
                    
                    if (links.length === 2) {
                      return (
                        <div style={{ display: "flex", gap: 10, justifyContent: "center", padding: "0 20px" }}>
                          {links.map((l, i) => {
                            const s = PLATFORM_STYLES[l.platform] || PLATFORM_STYLES.otro;
                            const prefix = getPrefix(l.platform);
                            return (
                              <button key={i} className="press" onClick={() => openLink(l.url)} style={{ flex: 1, background: dark ? "#222" : "#ffffff", border: `1px solid ${dark ? "#333" : "#E5E7EB"}`, borderRadius: 16, padding: "12px", color: dark ? "#fff" : "#111827", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, boxShadow: dark ? "none" : "0 2px 12px rgba(0,0,0,0.04)" }}>
                                {renderIcon(s, 22)} 
                                <span style={{ textAlign: "center", lineHeight: 1.2 }}>{prefix ? prefix + ' ' : ''}{s.label}</span>
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
                            const prefix = getPrefix(l.platform);
                            return (
                              <button key={i} className="press" onClick={() => openLink(l.url)} style={{ background: dark ? "#222" : "#ffffff", border: `1px solid ${dark ? "#333" : "#E5E7EB"}`, borderRadius: 16, padding: "10px", color: dark ? "#fff" : "#111827", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, boxShadow: dark ? "none" : "0 2px 12px rgba(0,0,0,0.04)", textAlign: "center" }}>
                                {renderIcon(s, 18)} 
                                <span style={{ lineHeight: 1.2 }}>{prefix ? prefix + ' ' : ''}{s.label}</span>
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
                    }} style={{ background: dark ? "#ffffff" : "#111827", border: "none", borderRadius: 24, padding: "12px 24px", color: dark ? "#111827" : "#ffffff", fontSize: 14, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "all 0.2s", letterSpacing: 0.3, boxShadow: dark ? "0 4px 16px rgba(255,255,255,0.15)" : "0 4px 16px rgba(0,0,0,0.2)" }}>
                      <Icon name="calendar" size={16} color={dark ? "#111827" : "#ffffff"} /> {selected.booking_config.label || "Reservar"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Video Promocional (Premium) */}
          {asyncEmbedUrl && (() => {
            let embedData = { type: 'iframe', url: asyncEmbedUrl };
            if (asyncEmbedUrl.startsWith("{")) {
              try { embedData = JSON.parse(asyncEmbedUrl); } catch(e){}
            }
            return (
              <div style={{ padding: "20px 20px 0" }}>
                <div className="text-base" style={{ fontWeight: 800, color: dText, marginBottom: 14 }}>Video Promocional</div>
                {embedData.type === 'tiktok' ? (
                  <TikTokBlock url={embedData.url} videoId={embedData.id} />
                ) : (
                  <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, overflow: "hidden", borderRadius: 16, background: isElite ? "rgba(255,255,255,0.05)" : "#E4E8E4" }}>
                    <iframe 
                      src={embedData.url} 
                      style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none", borderRadius: 16 }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                      allowFullScreen
                    />
                  </div>
                )}
              </div>
            );
          })()}

          {/* Fotos */}
          {selected.photos?.length > 1 && (
            <GalleryLayout 
              photos={selected.photos.slice(1)} 
              T={T} 
              setShowGallery={setShowGallery} 
              bizName={selected.name}
            />
          )}

                    {/* Menú/Catálogo Store Module (Sólo Premium) */}
          {selected.plan === "premium" && <BusinessStore business={selected} T={T} isElite={isElite} />}

          {/* PRODUCTOS AFILIADOS */}
          {Array.isArray(selected.affiliate_products) && selected.affiliate_products.length > 0 && (
            <div style={{ padding: "20px 0 0" }}>
              <div className="text-base" style={{ fontWeight: 800, color: dText, marginBottom: 12, padding: "0 20px" }}>Productos Recomendados</div>
              <div style={{ display: "flex", gap: 12, overflowX: "auto", padding: "0 20px 10px", scrollSnapType: "x mandatory" }} className="no-scrollbar">
                {selected.affiliate_products.map((ap, i) => (
                  <a key={i} href={ap.url} target="_blank" rel="noreferrer" style={{ flexShrink: 0, width: 140, background: T.white, borderRadius: 12, overflow: "hidden", textDecoration: "none", border: `1px solid ${T.border}`, scrollSnapAlign: "start", display: "flex", flexDirection: "column", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
                    <div style={{ width: "100%", height: 140, background: T.bg, position: "relative" }}>
                      {ap.image ? <img src={ap.image} alt={ap.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>...</div>}
                      <div style={{ position: "absolute", bottom: 6, left: 6, background: "rgba(0,0,0,0.7)", color: "#fff", padding: "2px 6px", borderRadius: 6, fontSize: 11, fontWeight: 800, backdropFilter: "blur(4px)" }}>{ap.price}</div>
                    </div>
                    <div style={{ padding: "8px 10px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: T.text, lineHeight: 1.2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", textAlign: "center" }}>{ap.title}</div>
                      <div style={{ fontSize: 10, color: T.green, fontWeight: 800, marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 2 }}>
                         Ver producto
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* BANNER MERCADO LIBRE */}
          {selected.mercado_libre_url && (
            <MercadoLibreShowcase nickname={selected.mercado_libre_url} bizName={selected.name} />
          )}

          {/* Promociones / Cupones / Menú originales preservados */}
          {promos.filter(p => p?.biz_id === selected.id && p?.img_url).length > 0 && <div style={{ padding: "20px 20px 0" }}>
            <div className="text-base" style={{ fontWeight: 800, color: dText, marginBottom: 16 }}>Promociones destacadas</div>
            {promos.filter(p => p?.biz_id === selected.id && p?.img_url).slice(0, 3).map(p => <div key={p.id} style={{ borderRadius: 16, overflow: "hidden", marginBottom: 10 }}><img src={getThumbUrl(p?.img_url, 1200, 600)} alt={`Promoción de ${selected.name}`} style={{ width: "100%", display: "block", borderRadius: 16 }} loading="lazy" /></div>)}
          </div>}
          {coupons.filter(c => c.biz_id === selected.id).length > 0 && <div style={{ padding: "20px 20px 0" }}>
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
          {raffles && raffles.filter(r => r.biz_id === selected.id).length > 0 && <div style={{ padding: "20px 20px 0" }}>
            <div className="text-base" style={{ fontWeight: 800, color: dText, marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}><Icon name="gift" size={18} color="#D94F3D" />Sorteos Activos</div>
            {raffles.filter(r => r.biz_id === selected.id).map(r => {
              const participated = (r.participants || []).some(p => p.user_id === user?.id);
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
                  try {
                    await dbService.joinRaffle(r.id, user.id);
                    setRaffles(prev => prev.map(x => x.id === r.id ? { ...x, participants: [...(x.participants || []), { user_id: user.id }] } : x));
                    toast$("¡Estás participando en el sorteo!");
                  } catch (e) { console.log(e); }
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
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: dark ? '#F8FAFC' : '#111111', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon name="file" size={16} color={dark ? '#111111' : '#ffffff'} />
                  </div>
                  <span className="text-sm" style={{ fontWeight: 800, color: "#ffffff" }}>
                    {isSinglePdf ? "Abrir menú en PDF" : `Ver menú completo (${menuUrls.length} hojas)`}
                  </span>
                </button>
              </div>
            );
          })()}

          {/* Mercado Libre */}
          <MercadoLibreShowcase nickname={selected.mercado_libre_nickname} bizName={selected.name} dText={dText} dSub={dSub} T={T} />

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

          {/* Location & Schedule Native Style */}
          <div style={{ display: "flex", flexDirection: "column", padding: "0 20px" }}>
            
            {/* Horario Row */}
            <div style={{ padding: "20px 0", borderBottom: `1px solid ${isElite ? "rgba(255,255,255,0.1)" : T.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: Object.keys(selected.schedule || {}).length > 0 ? 12 : 4 }}>
                <Icon name="clock" size={22} color={dText} />
                <span className="text-base" style={{ fontWeight: 700, color: dText }}>Horario</span>
              </div>
              <div style={{ paddingLeft: 34 }}>
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
                            <span className="text-sm" style={{ fontWeight: isToday ? 800 : 500, color: isToday ? dText : dSub }}>{label}{isToday && " (Hoy)"}</span>
                            <span className="text-sm" style={{ fontWeight: closed ? 700 : (isToday ? 700 : 500), color: closed ? T.red : (isToday ? dText : dSub), whiteSpace: "pre-wrap", textAlign: "right", lineHeight: 1.3 }}>{val}</span>
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
            </div>

            {/* Ubicación Row */}
            {!selected.hide_location && <div style={{ padding: "20px 0", borderBottom: `1px solid ${isElite ? "rgba(255,255,255,0.1)" : T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Icon name="map-pin" size={22} color={dText} />
                  <span className="text-base" style={{ fontWeight: 700, color: dText }}>Ubicación</span>
                </div>
                <div className="text-sm" style={{ color: dSub, lineHeight: 1.5, paddingLeft: 34 }}>{selected.address}</div>
              </div>
              <button onClick={(e) => goDir(selected, e)} style={{ width: 44, height: 44, borderRadius: "50%", background: isElite ? "rgba(255,255,255,0.1)" : "#F3F4F6", border: "none", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }}>
                <Icon name="nav" size={20} color={dText} />
              </button>
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
              <div className="press" onClick={() => { handleEventTap(ev); }} style={{ display: "flex", gap: 12, border: `1px solid ${isElite ? "rgba(255,255,255,0.1)" : T.border}`, borderRadius: 16, padding: 12, alignItems: "center", cursor: "pointer" }}>
                <div style={{ width: 80, height: 60, borderRadius: 8, background: dBg, overflow: "hidden", flexShrink: 0 }}>
                  <img src={getThumbUrl(ev.img_url || ev.img || "", 200, 200)} alt={`Cartel del evento ${ev.title}`} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
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
          <div style={{ padding: "12px 20px 84px", marginBottom: 20 }}>
            <div style={{ padding: "20px 0", borderBottom: `1px solid ${isElite ? "rgba(255,255,255,0.1)" : T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, color: dText }}>
                  <Icon name="star_f" size={22} color={dText} />
                  <span className="text-base" style={{ fontWeight: 700 }}>Reseñas</span>
                </div>
                <div className="text-sm" style={{ color: dSub, lineHeight: 1.5, paddingLeft: 34 }}>{reviews.length > 0 ? "Comparte tu experiencia" : "Sé el primero en dejar reseña"}</div>
              </div>
              <button className="press" onClick={() => { if (!user) { setShowAuth(true); return; } setShowReview(v => !v); }} style={{ width: 44, height: 44, borderRadius: "50%", background: isElite ? "rgba(255,255,255,0.1)" : "#F3F4F6", border: "none", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }}>
                <Icon name="edit" size={20} color={dText} />
              </button>
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
                  <div className="text-sm" style={{ width: 40, height: 40, borderRadius: "50%", background: r.user_color || "#111", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff", flexShrink: 0 }}>{r.user_init}</div>
                  <div>
                    <div className="text-sm" style={{ fontWeight: 800, color: dText }}>{r.user_name}</div>
                    <div className="text-xs" style={{ color: dSub, marginTop: 2 }}>{new Date(r.created_at).toLocaleDateString("es-MX", { day: "numeric", month: "long" })}</div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  <StarRow n={r.stars} size={14} />
                  {(isAdmin || user?.id === r.user_id) && <button onClick={async () => { 
                      if (window.confirm("¿Seguro que deseas eliminar esta reseña?")) {
                        try {
                          await dbService.deleteReview(r.id); 
                          // Update cache
                          const rem = reviews.filter(x => x.id !== r.id);
                          setReviews(rem);
                          const count = rem.length;
                          const avg = count > 0 ? Math.round((rem.reduce((s, x) => s + (x.stars || 0), 0) / count) * 10) / 10 : 0;
                          if (selected && selected.id) {
                            dbService.updateBusinessStats(selected.id, { rating: avg, review_count: count });
                          }
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
                <button className="press" onClick={() => toggleLikeReview(r)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", border: `1px solid ${r.liked_by?.includes(user?.id) ? "#000" : (isElite ? "rgba(255,255,255,0.1)" : T.border)}`, borderRadius: 20, background: r.liked_by?.includes(user?.id) ? "#000" : dCard, color: r.liked_by?.includes(user?.id) ? "#fff" : dSub, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill={r.liked_by?.includes(user?.id) ? "#fff" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg> Útil ({r.liked_by?.length || 0})
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
        </m.div>
        
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

