import React from 'react';
import { useTranslation } from 'react-i18next';

export default function DetailGoogleReviews({ selected, googleData, isElite, dText, dSub, T, GoogleReviewItem, lang }) {
  const { t } = useTranslation();
  
  if (!selected.social_links?.google_place_id || !googleData || !googleData.reviews || googleData.reviews.length === 0) {
    return null;
  }

  return (
    <div style={{ padding: "32px 20px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img src="/googlelogo.svg" alt="Google" style={{ width: 20, height: 20, objectFit: "contain" }} />
          <span className="text-base" style={{ fontWeight: 800, color: dText }}>{t("resenas_google", "Reseñas en Google")}</span>
        </div>
        <div className="text-sm" style={{ fontWeight: 700, color: dSub }}>{googleData.rating} ★ ({googleData.count} {lang === 'en' ? 'reviews' : 'reseñas'})</div>
      </div>
      <div style={{ background: isElite ? (T.dark ? "#2A2A2A" : "#FFFFFF") : T.card, borderRadius: 16, padding: "16px", border: "none", display: "flex", flexDirection: "column", gap: 16 }}>
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
          {t("leer_todas_google", "Leer todas en Google Maps")}
        </a>
      </div>
    </div>
  );
}
