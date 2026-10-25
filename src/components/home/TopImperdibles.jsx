import React, { memo } from "react";
import { useNavigate } from "react-router-dom";
import { createSlug } from "../../lib/utils.js";

export default memo(function TopImperdibles({ experiences, T, city }) {
  const navigate = useNavigate();
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
    <div style={{ padding: "24px 20px 10px" }}>
      <div style={{ marginBottom: 12 }}>
        <h2 style={{ fontFamily: "var(--heading)", fontWeight: 900, fontSize: 22, color: T.text, letterSpacing: "-0.5px", textAlign: "center", margin: 0 }}>Los 5 imperdibles de {cityName} 🥇</h2>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {top5.map((exp, index) => {
          const imgUrl = exp.gallery?.[0];
          const slug = createSlug(exp.title) || exp.id;
          const cSlug = exp.city_slug ? exp.city_slug.split(',')[0] : (city?.slug || "");
          const href = `/revista/${cSlug}/${slug}`;
          return (
            <a 
              key={exp.id} 
              className="press" 
              href={href}
              aria-label={exp.title}
              onClick={(e) => {
                e.preventDefault(); 
                navigate(href, { state: { articleOrigin: true } });
              }}
              style={{ 
                 display: "flex",
                 alignItems: "flex-end",
                 padding: "62px 16px 16px",
                 boxSizing: "border-box",
                 textDecoration: "none",
                 position: "relative",
                 minHeight: 150, 
                 borderRadius: 16, 
                 background: T.card,
                 cursor: "pointer",
                 boxShadow: T.shadow,
                 border: `1px solid ${T.border}`,
                 overflow: "hidden"
              }}
            >
              {imgUrl && <img src={imgUrl} loading="lazy" decoding="async" alt="" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition:"center", display:"block" }} />}
              <div aria-hidden="true" style={{position:'absolute',inset:0,background:'linear-gradient(180deg, rgba(0,0,0,0.04) 15%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0.85) 100%)',pointerEvents:'none'}} />
              <h3 style={{position:'relative',zIndex:1,margin:0,color:'#fff',fontFamily:'var(--sans, system-ui, sans-serif)',fontSize:'clamp(18px, 4.8vw, 22px)',fontWeight:700,lineHeight:1.25,letterSpacing:'-0.025em',textAlign:'left',overflowWrap:'anywhere',textShadow:'0 1px 4px rgba(0,0,0,0.4)'}}>{exp.title}</h3>
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
});
