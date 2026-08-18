import React, { useState, Suspense, lazy, useEffect } from 'react';
import { m, AnimatePresence } from "framer-motion";
import { Helmet } from 'react-helmet-async';
import Icon from './ui/Icon';
import StarRow from './ui/StarRow';
import { useAppContext } from '../context/AppContext';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { useShallow } from 'zustand/react/shallow';
import { getThumbUrl } from '../lib/utils';

const Gallery = lazy(() => import('./Gallery').catch(() => {
  window.location.reload();
  return { default: () => null };
}));

const renderInline = (lineContent, T) => {
  const tokenRegex = /(\*\*.*?\*\*|\[.*?\]\(.*?\))/g;
  const parts = lineContent.split(tokenRegex);
  return parts.map((part, j) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={j} style={{ fontWeight: 800, color: T.text }}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
      const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/);
      if (linkMatch) {
        return (
          <a
            key={j}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#FF5A5F", fontWeight: 600, textDecoration: "none" }}
            onMouseEnter={(e) => e.target.style.textDecoration = "underline"}
            onMouseLeave={(e) => e.target.style.textDecoration = "none"}
          >
            {linkMatch[1]}
          </a>
        );
      }
    }
    return part;
  });
};

const FormattedText = ({ text, T }) => {
  // Normalize line endings (Windows \r\n, old Mac \r → \n)
  const normalized = (text || "").replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Split into lines
  const lines = normalized.split('\n');

  const elements = [];
  let listBuffer = [];

  const flushList = (key) => {
    if (listBuffer.length === 0) return;
    elements.push(
      <ul key={`ul-${key}`} style={{ listStyle: "none", padding: 0, margin: "10px 0 14px 0" }}>
        {listBuffer.map((item, li) => (
          <li key={li} style={{ display: "flex", gap: 10, marginBottom: 6, alignItems: "flex-start" }}>
            <span style={{ color: "#FF5A5F", fontWeight: "bold", flexShrink: 0, marginTop: 2 }}>•</span>
            <span>{renderInline(item, T)}</span>
          </li>
        ))}
      </ul>
    );
    listBuffer = [];
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList(i);
      // Only add a spacer if the previous element wasn't already a spacer
      const last = elements[elements.length - 1];
      if (!last || last.type !== 'div') {
        elements.push(<div key={`sp-${i}`} style={{ height: 8 }} />);
      }
      return;
    }

    if (trimmed.startsWith('# ')) {
      flushList(i);
      elements.push(<h2 key={i} style={{ fontSize: 22, fontWeight: 900, color: T.text, margin: "20px 0 8px" }}>{trimmed.slice(2)}</h2>);
      return;
    }

    if (trimmed.startsWith('## ')) {
      flushList(i);
      elements.push(<h3 key={i} style={{ fontSize: 17, fontWeight: 800, color: T.text, margin: "16px 0 6px" }}>{trimmed.slice(3)}</h3>);
      return;
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      listBuffer.push(trimmed.substring(2));
      return;
    }

    flushList(i);
    elements.push(
      <p key={i} style={{ margin: "0 0 10px 0", lineHeight: 1.7 }}>
        {renderInline(line, T)}
      </p>
    );
  });

  flushList('end');

  return (
    <div style={{ fontSize: 16, color: T.text, lineHeight: 1.7 }}>
      {elements}
    </div>
  );
};

export default function ExperienceViewer({ exp, T, dark, onClose }) {
  const [activeFaq, setActiveFaq] = useState(null);
  const [fullGalleryIdx, setFullGalleryIdx] = useState(null);
  const [showAllReviews, setShowAllReviews] = useState(false);
  
  const { reviews, loadExperienceReviews, postExperienceReview, showReview, setShowReview, reviewStar, setReviewStar, reviewText, setReviewText, reviewImgFile, setReviewImgFile, reviewImgLoading, toggleLikeReview, sb, isAdmin, toast$ } = useAppContext();
  const { user, setShowAuth } = useAuthStore(useShallow(s => ({ user: s.user, setShowAuth: s.setShowAuth })));
  const { setShowItineraryModal, setItineraryTargetBiz } = useUIStore(useShallow(s => ({ setShowItineraryModal: s.setShowItineraryModal, setItineraryTargetBiz: s.setItineraryTargetBiz })));

  useEffect(() => {
    if (exp?.id) loadExperienceReviews(exp.id);
  }, [exp?.id, loadExperienceReviews]);
  
  if (!exp) return null;

  const gallery = Array.isArray(exp.gallery) ? exp.gallery : [];
  const cover = gallery.length > 0 ? gallery[0] : null;
  const curr = (exp.booking_config && exp.booking_config.currency) ? exp.booking_config.currency : 'MXN';
  const priceFormatted = exp.price > 0 ? `$${exp.price.toLocaleString("en-US")} ${curr}` : 'Gratis';

  const PLATFORM_STYLES = {
    airbnb: { color: "#FF5A5F", label: "Airbnb", img: "/airbnb.svg" },
    booking: { color: "#003580", label: "Booking.com", img: "/booking.png" },
    tiqets: { color: "#4bc2c5", label: "Comprar entradas", img: "/tiqets.png" },
    tripadvisor: { color: "#000000", label: "TripAdvisor", img: "/tripadvisor.png" },
    expedia: { color: "#00005C", label: "Expedia", img: "/expedia.png" },
    hoteles: { color: "#D11013", label: "Hoteles.com", img: "/hoteles.com.png" },
    getyourguide: { color: "#FF5B00", label: "GetYourGuide", img: "/getyourguide.png" },
    didifood: { color: "#F76B1C", label: "DiDi Food", icon: "🥡" },
    whatsapp: { color: "#25D366", label: "WhatsApp", icon: "💬" },
    comprar_entradas: { color: "#111827", label: "Comprar Entradas", icon: "🎟️" },
    otro: { color: "#1877F2", label: "Sitio Web", icon: "🔗" }
  };

  const openLink = (url) => {
    let finalUrl = url;
    if (!finalUrl.startsWith('http') && !finalUrl.startsWith('wa.me')) finalUrl = 'https://' + finalUrl;
    window.open(finalUrl, '_blank', 'noopener,noreferrer');
  };

  const renderIcon = (s, size = 16) => {
    if (s.img) return <img src={s.img} alt={s.label} style={{ height: size * 1.4, width: "auto", display: "block" }} />;
    return <span style={{ fontSize: size }}>{s.icon}</span>;
  };

  const bookingConfig = exp.booking_config || {};
  const externalLinks = bookingConfig.type === "external" ? (bookingConfig.externalLinks || []) : [];

  const canonicalUrl = `https://citymap.mx/experiencias/${exp.city_slug || 'todas'}/${exp.slug || exp.id}`;
  const schemaJson = JSON.stringify([
    {
      "@context": "https://schema.org",
      "@type": "TouristAttraction",
      "name": exp.title,
      "description": exp.description ? exp.description.substring(0, 160) : "",
      "url": canonicalUrl,
      "image": cover ? [cover] : []
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://citymap.mx" },
        { "@type": "ListItem", "position": 2, "name": "Experiencias", "item": `https://citymap.mx/experiencias/${exp.city_slug || ''}` },
        { "@type": "ListItem", "position": 3, "name": exp.title, "item": canonicalUrl }
      ]
    }
  ]);

  const formatCityName = (slug) => {
    if (!slug) return '';
    return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };
  const cityName = formatCityName(exp.city_slug);
  const metaTitle = cityName ? `${exp.title} en ${cityName} | CityMap` : `${exp.title} | CityMap`;

  return (
    <m.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      style={{ position: 'fixed', inset: 0, zIndex: 99999, background: dark ? "#000" : "#fff", overflowY: "auto", fontFamily: "inherit" }}
    >
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={exp.description ? exp.description.substring(0, 160) : `Reserva entradas y descubre más sobre ${exp.title}.`} />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={exp.description ? exp.description.substring(0, 160) : `Reserva entradas y descubre más sobre ${exp.title}.`} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        {cover && <meta property="og:image" content={cover} />}
        <script type="application/ld+json">{schemaJson}</script>
      </Helmet>

      {/* Header / Hero */}
      <div style={{ position: "relative", width: "100%", height: "35vh", minHeight: 280, background: cover ? `url(${getThumbUrl(cover, 900, 600)}) center/cover` : (dark ? "#222" : "#E5E7EB") }}>
        {/* Top bar */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "calc(env(safe-area-inset-top, 0px) + 16px) 20px", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 10 }}>
          <button onClick={onClose} style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 20, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Icon name="arrow_left" size={20} color="#fff" />
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button 
              onClick={() => {
                setItineraryTargetBiz(exp);
                setShowItineraryModal(true);
              }}
              style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 20, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <Icon name="plus" size={18} color="#fff" />
            </button>
            <button 
              onClick={() => {
              const shareText = `Descubre la experiencia ${exp.title} en CityMap.`;
              if (navigator.share) {
                navigator.share({ title: exp.title, text: shareText, url: window.location.href }).catch(()=>{});
              } else {
                navigator.clipboard.writeText(window.location.href);
                alert("Enlace copiado al portapapeles");
              }
            }}
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 20, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <Icon name="share" size={18} color="#fff" />
            </button>
          </div>
        </div>

        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 30%)", pointerEvents: "none" }} />
        
        <div style={{ position: "absolute", bottom: 16, left: 20, right: 20, display: "flex", flexWrap: "wrap", gap: 16, zIndex: 10 }}>
          {exp.duration && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#fff", fontSize: 14, fontWeight: 600, textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>
              <Icon name="clock" size={16} color="#fff" /> {exp.duration}
            </div>
          )}
          {exp.people && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#fff", fontSize: 14, fontWeight: 600, textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>
              <Icon name="user" size={16} color="#fff" /> {exp.people}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#fff", fontSize: 14, fontWeight: 600, textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>
            <Icon name="heart" size={16} color="#fff" /> {exp.id ? (exp.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 350 + 24) : 120}
          </div>
        </div>
      </div>

      <div style={{ padding: "24px 20px 100px", maxWidth: 600, margin: "0 auto", textAlign: "left" }}>
        
        {/* Title Area */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: T.sub, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>
            {exp.activity_type || "Experiencia"}
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: T.text, margin: "0 0 12px 0", lineHeight: 1.1 }}>
            {exp.title}
          </h1>
        </div>
        
        {exp.author_name && (
          <div style={{ color: T.sub, fontSize: 13, marginBottom: 16, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: dark ? "rgba(255,255,255,0.1)" : "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="user" size={12} color={T.sub} />
            </div>
            <span>Escrito por <strong style={{ color: T.text }}>{exp.author_name}</strong></span>
            {exp.created_at && (
              <>
                <span style={{ margin: "0 4px", color: T.border }}>•</span>
                <span>{new Date(exp.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </>
            )}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: priceFormatted === 'Gratis' ? 14 : 22, fontWeight: 900, color: T.text, textTransform: priceFormatted === 'Gratis' ? "uppercase" : "none", letterSpacing: priceFormatted === 'Gratis' ? 0.5 : 0 }}>{priceFormatted}</span>
          {priceFormatted !== 'Gratis' && (
            <span style={{ fontSize: 13, color: T.sub, fontWeight: 500 }}>(los precios pueden variar)</span>
          )}
        </div>

        {/* Price & Book CTA — buttons only if external links exist */}
        {(externalLinks.length > 0 || exp.route_url) && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", flexDirection: "column" }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {externalLinks.map((l, i) => {
                  let s = PLATFORM_STYLES[l.platform] || PLATFORM_STYLES.otro;
                  
                  // Botón Inteligente por Marca
                  if (l.url) {
                    const urlLow = l.url.toLowerCase();
                    if (urlLow.includes('ticketmaster')) {
                      s = { color: "#026CDF", label: l.label || "Ticketmaster", icon: "🎟️" };
                    } else if (urlLow.includes('eventbrite')) {
                      s = { color: "#F05537", label: l.label || "Eventbrite", icon: "🎫" };
                    } else if (urlLow.includes('boletia')) {
                      s = { color: "#6D28D9", label: l.label || "Boletia", icon: "🎟️" };
                    } else if (urlLow.includes('feverup') || urlLow.includes('fever')) {
                      s = { color: "#FF3366", label: l.label || "Fever", icon: "🔥" };
                    } else if (s === PLATFORM_STYLES.otro) {
                      s = { ...s, color: "#222" }; // Fallback más elegante
                    }
                  }

                  return (
                    <button 
                      key={i} 
                      onClick={() => openLink(l.url)} 
                      style={{ flex: 1, background: s.color, border: "none", borderRadius: 14, padding: "12px 16px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: `0 4px 12px ${s.color}66`, transition: "transform 0.1s" }}
                    >
                      {renderIcon(s, 16)}
                      <span>{l.label || s.label}</span>
                    </button>
                  );
                })}
              </div>
              {exp.route_url && (() => {
                const isWikiloc = exp.route_url.toLowerCase().includes('wikiloc');
                const isAllTrails = exp.route_url.toLowerCase().includes('alltrails');
                let routeBg = "#4B5563";
                let routeText = "Ver ruta completa (Mapa GPS)";
                let shadowColor = "rgba(75, 85, 99, 0.4)";
                
                if (isWikiloc) {
                  routeBg = "#4E922F";
                  routeText = "Ver ruta en Wikiloc";
                  shadowColor = "rgba(78, 146, 47, 0.4)";
                } else if (isAllTrails) {
                  routeBg = "#2B4B27";
                  routeText = "Ver ruta en AllTrails";
                  shadowColor = "rgba(43, 75, 39, 0.4)";
                }

                return (
                  <button 
                    onClick={() => openLink(exp.route_url)} 
                    style={{ width: "100%", background: routeBg, border: "none", borderRadius: 14, padding: "12px 16px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: `0 4px 12px ${shadowColor}`, transition: "transform 0.1s" }}
                  >
                    <Icon name="nav" size={16} color="#fff" />
                    <span>{routeText}</span>
                  </button>
                )
              })()}
            </div>
          </div>
        )}

        {/* Gallery */}
        {gallery.length > 1 && (
          <div style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: T.text, marginBottom: 12 }}>Galería</h3>
            <div className="no-scrollbar" style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8, scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}>
              {gallery.map((url, i) => (
                <div key={i} onClick={() => setFullGalleryIdx(i)} style={{ flexShrink: 0, width: 220, height: 160, borderRadius: 16, background: `url(${getThumbUrl(url, 400, 300)}) center/cover`, scrollSnapAlign: "start", border: `1px solid ${T.border}`, boxShadow: "0 4px 12px rgba(0,0,0,0.05)", cursor: "pointer" }} />
              ))}
            </div>
          </div>
        )}

        {/* Quick Facts */}
        {(exp.booking_config?.quick_facts?.length > 0) && (
          <div style={{ marginBottom: 32 }}>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {exp.booking_config.quick_facts.map((fact, i) => (
                <li key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15, fontWeight: 600, color: T.text }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.green }} />
                  {fact}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Description */}
        {exp.description && (
          <div style={{ marginBottom: 36 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: T.text, marginBottom: 14, letterSpacing: -0.3 }}>Sobre esta experiencia</h3>
            <FormattedText text={exp.description} T={T} />
          </div>
        )}

        {/* Details List */}
        {(exp.languages || exp.meeting_point) && (
          <>
            <hr style={{ border: "none", borderTop: `1px solid ${T.border}`, margin: "0 0 32px 0" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32, padding: "20px", background: dark ? "rgba(255,255,255,0.03)" : "#fff", borderRadius: 16, border: `1px solid ${T.border}` }}>
            {exp.languages && (
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: dark ? "rgba(255,255,255,0.08)" : "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="globe" size={18} color={T.text} /></div>
                <div>
                  <div style={{ fontSize: 13, color: T.sub, fontWeight: 600 }}>Idiomas</div>
                  <div style={{ fontSize: 15, color: T.text, fontWeight: 700 }}>{exp.languages}</div>
                </div>
              </div>
            )}
            {(exp.meeting_point || exp.meeting_url) && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {exp.meeting_point && (
                  <div style={{ display: "flex", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: dark ? "rgba(255,255,255,0.08)" : "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="map-pin" size={18} color={T.text} /></div>
                    <div>
                      <div style={{ fontSize: 13, color: T.sub, fontWeight: 600 }}>Punto de encuentro</div>
                      <div style={{ fontSize: 15, color: T.text, fontWeight: 700, lineHeight: 1.4, marginTop: 4 }}>{exp.meeting_point}</div>
                    </div>
                  </div>
                )}
                <button 
                  className="press" 
                  onClick={() => window.open(exp.meeting_url || `https://maps.google.com/?q=${encodeURIComponent(exp.meeting_point)}`, '_blank')}
                  style={{ width: "100%", padding: "12px", borderRadius: 12, background: dark ? "rgba(255,255,255,0.1)" : "#F3F4F6", border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", fontSize: 14, fontWeight: 700, color: T.text }}
                >
                  <Icon name="nav" size={16} color={T.text} />
                  {exp.meeting_point ? "Cómo llegar" : "Ver ubicación en el mapa"}
                </button>
              </div>
            )}
          </div>
          </>
        )}

        {/* Includes / Not Includes */}
        {(exp.includes?.length > 0 || exp.not_includes?.length > 0) && (
          <div style={{ marginBottom: 32 }}>
            <hr style={{ border: "none", borderTop: `1px solid ${T.border}`, margin: "0 0 28px 0" }} />
            <h3 style={{ fontSize: 18, fontWeight: 800, color: T.text, marginBottom: 16 }}>¿Qué esperar?</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
              {exp.includes?.map((inc, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <Icon name="check-circle" size={18} color="#10B981" style={{ marginTop: 2 }} />
                  <span style={{ fontSize: 15, color: T.text, lineHeight: 1.4 }}>{inc}</span>
                </div>
              ))}
              {exp.not_includes?.map((ninc, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <Icon name="x-circle" size={18} color="#EF4444" style={{ marginTop: 2 }} />
                  <span style={{ fontSize: 15, color: T.sub, lineHeight: 1.4, textDecoration: "line-through" }}>{ninc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bring Items */}
        {(bookingConfig.bring_items?.length > 0) && (
          <div style={{ marginBottom: 32 }}>
            <hr style={{ border: "none", borderTop: `1px solid ${T.border}`, margin: "0 0 28px 0" }} />
            <h3 style={{ fontSize: 18, fontWeight: 800, color: T.text, marginBottom: 16 }}>Lo que recomendamos llevar</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
              {bookingConfig.bring_items.map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.text, marginTop: 8, flexShrink: 0 }} />
                  <span style={{ fontSize: 15, color: T.text, lineHeight: 1.4 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Affiliate Products */}
        {exp.affiliate_products?.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <hr style={{ border: "none", borderTop: `1px solid ${T.border}`, margin: "0 0 28px 0" }} />
            <h3 style={{ fontSize: 18, fontWeight: 800, color: T.text, marginBottom: 16 }}>Equipamiento recomendado</h3>
            <div className="no-scrollbar" style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 16, scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", margin: "0 -20px", padding: "0 20px 16px" }}>
              {exp.affiliate_products.map((prod, i) => (
                <div key={i} onClick={() => openLink(prod.url)} className="press" style={{ flexShrink: 0, width: 160, background: dark ? "rgba(255,255,255,0.03)" : "#fff", borderRadius: 16, border: `1px solid ${T.border}`, overflow: "hidden", scrollSnapAlign: "start", cursor: "pointer", display: "flex", flexDirection: "column", boxShadow: "0 4px 12px rgba(0,0,0,0.04)" }}>
                  <div style={{ width: "100%", height: 140, background: dark ? "#111" : "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    {prod.image_url ? (
                      <img src={prod.image_url} alt={prod.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <Icon name="shopping-bag" size={32} color={T.sub} />
                    )}
                  </div>
                  <div style={{ padding: "12px", display: "flex", flexDirection: "column", flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text, lineHeight: 1.3, marginBottom: 6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{prod.title}</div>
                    <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 14, fontWeight: 900, color: T.text }}>{prod.price || "Ver producto"}</span>
                      <div style={{ background: dark ? "rgba(255,255,255,0.1)" : "#f1f5f9", padding: "4px 8px", borderRadius: 8, display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: T.sub, textTransform: "uppercase", letterSpacing: 0.5 }}>Comprar</span>
                        <Icon name="external-link" size={12} color={T.sub} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* FAQs */}
        {exp.faq?.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <hr style={{ border: "none", borderTop: `1px solid ${T.border}`, margin: "0 0 28px 0" }} />
            <h3 style={{ fontSize: 18, fontWeight: 800, color: T.text, marginBottom: 16 }}>Preguntas Frecuentes</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {exp.faq.map((f, i) => (
                <div key={i} onClick={() => setActiveFaq(activeFaq === i ? null : i)} style={{ background: dark ? "rgba(255,255,255,0.03)" : "#fff", borderRadius: 16, border: `1px solid ${T.border}`, overflow: "hidden", cursor: "pointer" }}>
                  <div style={{ padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: T.text, paddingRight: 16 }}>{f.q}</div>
                    <Icon name={activeFaq === i ? "chevron-up" : "chevron-down"} size={16} color={T.sub} />
                  </div>
                  <AnimatePresence>
                    {activeFaq === i && (
                      <m.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: "hidden" }}
                      >
                        <div style={{ padding: "0 16px 16px", fontSize: 14, color: T.sub, lineHeight: 1.6 }}>{f.a}</div>
                      </m.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reseñas Internas */}
        <div style={{ marginBottom: 20 }}>
          <div className="text-base" style={{ fontWeight: 800, color: T.text, marginBottom: 16 }}>Reseñas</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, background: dark ? "rgba(255,255,255,0.03)" : "#f9fafb", borderRadius: 16, padding: "16px 16px", border: `1px solid ${T.border}` }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ width: 48, height: 48, background: "#fff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}><img src="/estrella.svg" alt="Estrella" style={{ width: 24, height: 24, objectFit: "contain" }} /></div>
              <div>
                <StarRow n={0} size={16} />
                <div className="text-xs" style={{ color: T.sub, marginTop: 4 }}>{reviews.length > 0 ? "Comparte tu experiencia" : "Sé el primero en dejar reseña"}</div>
              </div>
            </div>
            <button className="press" onClick={() => { if (!user) { setShowAuth(true); return; } setShowReview(v => !v); }} style={{ padding: "10px 16px", border: "1px solid #111", borderRadius: 10, fontSize: 12, fontWeight: 700, color: "#111", background: "#fff", cursor: "pointer", fontFamily: "inherit" }}>Escribir reseña</button>
          </div>

          {showReview && <div style={{ background: dark ? "rgba(255,255,255,0.03)" : "#f9fafb", borderRadius: 12, padding: 14, marginBottom: 16, border: `1px solid ${T.border}` }}>
            <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>{[1, 2, 3, 4, 5].map(s => <button key={s} onClick={() => setReviewStar(s)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}><img src="/estrella.svg" alt="star" style={{ width: 24, height: 24, filter: s <= reviewStar ? "none" : "grayscale(1) opacity(0.3)", marginTop: -2 }} /></button>)}</div>
            <textarea className="inp" rows={3} style={{ resize: "none", marginBottom: 10, background: dark ? "rgba(255,255,255,0.05)" : "#fff", color: T.text, border: `1px solid ${T.border}` }} placeholder="Comparte tu experiencia…" value={reviewText} onChange={e => setReviewText(e.target.value)} />
            
            {reviewImgFile && (
              <div style={{ position: "relative", width: 80, height: 80, marginBottom: 10, borderRadius: 8, overflow: "hidden", border: `1px solid ${T.border}` }}>
                <img src={URL.createObjectURL(reviewImgFile)} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <button onClick={() => setReviewImgFile(null)} style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icon name="x" size={10} color="#fff" /></button>
              </div>
            )}
            
            <div style={{ display: "flex", gap: 10 }}>
              <label style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 12, background: T.bg, border: `1px dashed ${T.border}`, cursor: "pointer", flexShrink: 0 }}>
                <input type="file" accept="image/*" hidden onChange={e => { if(e.target.files[0]) setReviewImgFile(e.target.files[0]); }} />
                <Icon name="camera" size={20} color={T.sub} />
              </label>
              <button className="btn-g press" style={{ flex: 1, padding: 12, opacity: reviewImgLoading ? 0.7 : 1 }} onClick={() => postExperienceReview(exp.id)} disabled={reviewImgLoading}>
                {reviewImgLoading ? "Publicando..." : "Publicar reseña"}
              </button>
            </div>
          </div>}
          
          {reviews.slice(0, showAllReviews ? reviews.length : 3).map((r, i) => <div key={i} style={{ padding: "16px 0", borderBottom: `1px solid ${T.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="text-sm" style={{ width: 40, height: 40, borderRadius: "50%", background: r.user_color || "#111", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff", flexShrink: 0 }}>{r.user_init}</div>
                <div>
                  <div className="text-sm" style={{ fontWeight: 800, color: T.text }}>{r.user_name}</div>
                  <div className="text-xs" style={{ color: T.sub, marginTop: 2 }}>{new Date(r.created_at).toLocaleDateString("es-MX", { day: "numeric", month: "long" })}</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                <StarRow n={r.stars} size={14} />
                {(isAdmin || user?.id === r.user_id) && <button onClick={async () => { 
                  if(window.confirm("¿Eliminar esta reseña?")){ 
                    try {
                      await sb.del("reviews", r.id); 
                      loadExperienceReviews(exp.id);
                      toast$("Reseña eliminada"); 
                    } catch (err) {
                      toast$("Error al eliminar la reseña.");
                    }
                  } 
                }} style={{ background: "none", border: "none", color: T.red, fontSize: 11, fontWeight: 700, cursor: "pointer", padding: 0 }}>Eliminar</button>}
              </div>
            </div>
            <p className="text-sm" style={{ color: T.text, lineHeight: 1.6, marginTop: 10, marginBottom: r.img_url ? 10 : 12 }}>{r.text}</p>
            {r.img_url && (
              <div style={{ marginBottom: 12, borderRadius: 12, overflow: "hidden", border: `1px solid ${T.border}`, width: "100%", maxWidth: 300, background: "#f5f5f5" }}>
                <img src={getThumbUrl(r.img_url, 600, 600)} alt="Foto de la reseña" loading="lazy" style={{ width: "100%", height: "auto", display: "block", maxHeight: 300, objectFit: "cover" }} />
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button className="press" onClick={() => user ? handleLikeReview(r) : setShowAuth(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", border: `1px solid ${r.liked_by?.includes(user?.id) ? "#000" : T.border}`, borderRadius: 16, background: r.liked_by?.includes(user?.id) ? "#000" : "transparent", fontSize: 13, fontWeight: 700, color: r.liked_by?.includes(user?.id) ? "#fff" : T.sub, cursor: "pointer", fontFamily: "inherit" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill={r.liked_by?.includes(user?.id) ? "#fff" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg> Útil ({r.liked_by?.length || 0})
              </button>
            </div>
          </div>)}
          
          {reviews.length > 3 && (
            <button 
              className="press" 
              onClick={() => setShowAllReviews(!showAllReviews)} 
              style={{ width: "100%", padding: "14px", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12, fontSize: 14, fontWeight: 700, color: T.text, cursor: "pointer", marginTop: 16, fontFamily: "inherit" }}
            >
              {showAllReviews ? "Mostrar menos" : `Ver todas las reseñas (${reviews.length})`}
            </button>
          )}
        </div>

        {/* Disclaimer Legal */}
        <div style={{ marginTop: 20, paddingTop: 20, borderTop: `1px solid ${T.border}`, fontSize: 11, color: T.sub, lineHeight: 1.5, textAlign: "justify" }}>
          CityMap muestra información proporcionada por nuestros socios. Los precios, itinerarios, horarios y actividades pueden modificarse sin previo aviso. El precio final se mostrará al momento de abrir el enlace de la reserva.
        </div>

      </div>

      {/* Fullscreen Gallery Modal */}
      {fullGalleryIdx !== null && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999, background: "#000000", display: "flex", flexDirection: "column" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "16px 20px", display: "flex", justifyContent: "flex-start", zIndex: 10 }}>
            <button className="press" onClick={() => setFullGalleryIdx(null)} style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", marginTop: 20 }}>
              <Icon name="x" size={24} color="#fff" />
            </button>
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", width: "100%" }}>
            <Suspense fallback={<div style={{ height: "100dvh", width: "100%", background: "#000" }} />}>
              <Gallery photos={gallery.map(u => ({ url: u }))} h="100dvh" fit="contain" bg="transparent" initialIndex={fullGalleryIdx} />
            </Suspense>
          </div>
        </div>
      )}
    </m.div>
  );
}
