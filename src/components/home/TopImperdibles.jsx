import React from "react";
import { getThumbUrl, createSlug } from "../../lib/utils.js";

export default function TopImperdibles({ experiences, globalFavCounts, setViewingPlan, setIsViewing, T, FONT_BIZ, city }) {
  // Get top 5 sorted by likes
  const top5 = React.useMemo(() => {
    if (!experiences) return [];
    return [...experiences].sort((a, b) => {
      const likesA = globalFavCounts[a.id] || 0;
      const likesB = globalFavCounts[b.id] || 0;
      return likesB - likesA;
    }).slice(0, 5);
  }, [experiences, globalFavCounts]);

  if (!experiences || experiences.length === 0 || top5.length === 0) return null;

  const cityName = city?.name || "la ciudad";

  return (
    <div style={{ padding: "24px 20px 10px" }}>
      <h2 style={{ fontFamily: "var(--heading)", fontWeight: 900, fontSize: 22, color: T.text, letterSpacing: "-0.5px", marginBottom: 16 }}>Los 5 imperdibles de {cityName} 🥇</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {top5.map((exp, index) => {
          const imgUrl = getThumbUrl(exp.gallery?.[0], 800, 400);
          return (
            <div 
              key={exp.id} 
              className="press"
              onClick={() => { 
                setViewingPlan(exp); 
                setIsViewing(true); 
                const slug = createSlug(exp.title) || exp.id;
                const cSlug = exp.city_slug ? exp.city_slug.split(',')[0] : (city?.slug || "");
                window.history.pushState({}, '', `/experiencias/${cSlug}/${slug}`);
              }}
              style={{ 
                 position: "relative",
                 height: 150, 
                 borderRadius: 16, 
                 background: imgUrl ? `url(${imgUrl}) center/cover` : T.card,
                 cursor: "pointer",
                 boxShadow: T.shadow,
                 border: `1px solid ${T.border}`
              }}
            >
              <div style={{ position: "absolute", top: 12, left: 12, width: 34, height: 34, borderRadius: "50%", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.2)" }}>
                 <span style={{ fontSize: 18, fontWeight: 900, color: index === 0 ? "#FCD34D" : (index === 1 ? "#E5E7EB" : (index === 2 ? "#FCA5A5" : "#fff")), fontStyle: "italic", lineHeight: 1 }}>
                   {index + 1}
                 </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
