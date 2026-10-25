import React, { memo } from 'react';
import CompactCard from '../cards/CompactCard.jsx';
import { useDataStore } from "../../store/useDataStore.js";
import { useUIStore } from "../../store/useUIStore.js";
import Icon from '../ui/Icon.jsx';

export default memo(function HomeTopGrids({
  topFavs, showMoreTopFavs, setShowMoreTopFavs,
  topRated, showMoreTopRated, setShowMoreTopRated,
  userCoords, getKm, dark, T, favIds, toggleFav, handleCardTap, globalFavCounts, t, ratedStatus
}) {
  const sectionRef = React.useRef(null);
  const activeCity = useUIStore(s => s.activeCity);
  const loadHighlights = useDataStore(s => s.loadHomeHighlights);
  const dbReady = useDataStore(s => s.dbReady);
  React.useEffect(() => {
    if (!dbReady || !activeCity) return;
    const node = sectionRef.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      loadHighlights(activeCity);
      return;
    }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        loadHighlights(activeCity);
        observer.disconnect();
      }
    }, { rootMargin: '300px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [activeCity, dbReady, loadHighlights]);

  const visibleFavs = topFavs.slice(0, showMoreTopFavs ? 10 : 5);
  const visibleRated = topRated.slice(0, showMoreTopRated ? 10 : 5);

  return (
    <div ref={sectionRef} style={{ minHeight: 1 }}>
      {topFavs.length > 0 && (
        <div style={{ margin: "32px 20px 24px" }}>
          <div style={{ textAlign: "left", marginBottom: 16 }}>
            <h2 style={{ fontFamily: "var(--heading)", fontWeight: 800, fontSize: 20, color: T.text, letterSpacing: "-0.5px", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))", display: "flex" }}><Icon name="heart_overlay_f" size={20} color="#EF4444" /></div>
              {t("los_mas_guardados", "Los más guardados")}
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {visibleFavs.map((b, index) => {
              const dist = userCoords ? getKm(userCoords.lat, userCoords.lng, parseFloat(b.lat), parseFloat(b.lng)) : null;
              const distStr = dist !== null ? (dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`) : null;
              
              const numColor = dark ? "#fff" : "#4B5563";
              const pillBg = dark ? "#333" : "#F3F4F6";

              return (
                <div key={b.id} style={{ position: "relative", paddingBottom: 0 }}>
                  <div style={{ position: "absolute", top: index < 3 ? -2 : -2, left: index < 3 ? -2 : -2, width: index < 3 ? 38 : 34, height: index < 3 ? 38 : 34, borderRadius: "50%", background: index < 3 ? "transparent" : pillBg, color: numColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: index < 3 ? 32 : 15, fontWeight: 900, boxShadow: index < 3 ? "none" : "0 4px 10px rgba(0,0,0,0.15)", zIndex: 10, border: index < 3 ? "none" : `2.5px solid ${dark ? "#111" : "#f4f4f5"}`, filter: index < 3 ? "drop-shadow(0 4px 6px rgba(0,0,0,0.2))" : "none" }}>
                    {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                  </div>
                  <CompactCard b={b} T={T} dark={dark} isFav={favIds.includes(b.id)} toggleFav={toggleFav} onTap={handleCardTap} distStr={distStr} realFavs={globalFavCounts[b.id] || 0} hideReviews={true} hideSchedule={true} />
                </div>
              );
            })}
          </div>
          
          {topFavs.length > 5 && (
            <button onClick={() => setShowMoreTopFavs(v => !v)} className="press" style={{ width: "100%", padding: "12px", background: "none", border: `1px solid ${T.border}`, borderRadius: 12, marginTop: 12, fontSize: 13, fontWeight: 700, color: T.green, cursor: "pointer", fontFamily: "inherit" }}>
              {showMoreTopFavs ? t("ver_menos", "Ver menos") : t("ver_mas", "Ver 5 más")}
            </button>
          )}
        </div>
      )}

      <div id="mejor-calificados" style={{scrollMarginTop:20}} />
      {ratedStatus && topRated.length === 0 && <section style={{margin:'32px 20px 24px',textAlign:'left'}}>
        <h2 style={{fontSize:20,fontWeight:800,color:T.text}}>⭐ {t('los_mas_valorados','Los más valorados')}</h2>
        <p role="status" style={{fontSize:14,color:T.sub}}>{ratedStatus === 'loading' ? 'Cargando calificaciones…' : ratedStatus === 'error' ? 'No pudimos cargar las calificaciones. Vuelve a intentarlo cuando tengas conexión.' : 'Todavía no hay negocios con reseñas en esta ciudad.'}</p>
      </section>}
      {topRated.length > 0 && (
        <div style={{ margin: "32px 20px 24px" }}>
          <div style={{ textAlign: "left", marginBottom: 16 }}>
            <h2 style={{ fontFamily: "var(--heading)", fontWeight: 800, fontSize: 20, color: T.text, letterSpacing: "-0.5px", margin: 0 }}>⭐ {t("los_mas_valorados", "Los más valorados")}</h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {visibleRated.map((b, index) => {
              const dist = userCoords ? getKm(userCoords.lat, userCoords.lng, parseFloat(b.lat), parseFloat(b.lng)) : null;
              const distStr = dist !== null ? (dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`) : null;
              
              const numColor = dark ? "#fff" : "#4B5563";
              const pillBg = dark ? "#333" : "#F3F4F6";

              return (
                <div key={b.id} style={{ position: "relative", paddingBottom: 0 }}>
                  <div style={{ position: "absolute", top: index < 3 ? -2 : -2, left: index < 3 ? -2 : -2, width: index < 3 ? 38 : 34, height: index < 3 ? 38 : 34, borderRadius: "50%", background: index < 3 ? "transparent" : pillBg, color: numColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: index < 3 ? 32 : 15, fontWeight: 900, boxShadow: index < 3 ? "none" : "0 4px 10px rgba(0,0,0,0.15)", zIndex: 10, border: index < 3 ? "none" : `2.5px solid ${dark ? "#111" : "#f4f4f5"}`, filter: index < 3 ? "drop-shadow(0 4px 6px rgba(0,0,0,0.2))" : "none" }}>
                    {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                  </div>
                  <CompactCard b={b} T={T} dark={dark} isFav={favIds.includes(b.id)} toggleFav={toggleFav} onTap={handleCardTap} distStr={distStr} realFavs={globalFavCounts[b.id] || 0} hideFavs={true} hideSchedule={true} />
                </div>
              );
            })}
          </div>
          
          {topRated.length > 5 && (
            <button onClick={() => setShowMoreTopRated(v => !v)} className="press" style={{ width: "100%", padding: "12px", background: "none", border: `1px solid ${T.border}`, borderRadius: 12, marginTop: 12, fontSize: 13, fontWeight: 700, color: T.green, cursor: "pointer", fontFamily: "inherit" }}>
              {showMoreTopRated ? t("ver_menos", "Ver menos") : t("ver_mas", "Ver 5 más")}
            </button>
          )}
        </div>
      )}
    </div>
  );
});
