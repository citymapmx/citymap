import React from "react";
import { getThumbUrl, createSlug } from "../../lib/utils.js";
import OptimizedImage from "../ui/OptimizedImage.jsx";

export default function TopImperdibles({ experiences, globalFavCounts, setViewingPlan, setIsViewing, T, FONT_BIZ, city }) {
  // Get top 5 sorted by likes
  // Seed-based random shuffle changing every 24 hours
  const top5 = React.useMemo(() => {
    if (!experiences) return [];
    
    const d = new Date();
    const seed = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    
    const simpleHash = (str) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
      }
      return hash;
    };

    return [...experiences].sort((a, b) => {
      return simpleHash(a.id + seed) - simpleHash(b.id + seed);
    }).slice(0, 5);
  }, [experiences]);

  if (!experiences || experiences.length === 0 || top5.length === 0) return null;

  const cityName = city?.name || "la ciudad";

  return (
    <div style={{ padding: "32px 20px 10px" }}>
      <h2 style={{ fontFamily: "var(--heading)", fontWeight: 800, fontSize: 20, color: T.text, letterSpacing: "-0.5px", marginBottom: 16, textAlign: "left" }}>Los 5 imperdibles de {cityName} 🥇</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {top5.map((exp, index) => {
          const imgUrl = exp.gallery?.[0];
          const slug = createSlug(exp.title) || exp.id;
          const cSlug = exp.city_slug ? exp.city_slug.split(',')[0] : (city?.slug || "");
          const href = `/experiencias/${cSlug}/${slug}`;
          return (
            <a 
              key={exp.id} 
              className="press" 
              href={href}
              onClick={(e) => {
                e.preventDefault(); 
                setViewingPlan(exp); 
                setIsViewing(true); 
                window.history.pushState({}, '', href);
              }}
              style={{ 
                 display: "block",
                 textDecoration: "none",
                 position: "relative",
                 height: 150, 
                 borderRadius: 16, 
                 background: T.card,
                 cursor: "pointer",
                 boxShadow: T.shadow,
                 border: `1px solid ${T.border}`,
                 overflow: "hidden"
              }}
            >
              {imgUrl && <OptimizedImage src={imgUrl} widthRequest={800} heightRequest={400} alt={exp.title} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
              <div style={{ position: "absolute", top: 12, left: 12, width: 34, height: 34, borderRadius: "50%", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.2)", zIndex: 2 }}>
                 <span style={{ fontSize: 18, fontWeight: 900, color: index === 0 ? "#FCD34D" : (index === 1 ? "#E5E7EB" : (index === 2 ? "#FCA5A5" : "#fff")), fontStyle: "italic", lineHeight: 1 }}>
                   {index + 1}
                 </span>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
