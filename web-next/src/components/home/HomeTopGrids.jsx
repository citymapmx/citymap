import React from 'react';
import CompactCard from '../cards/CompactCard.jsx';
import Icon from '../ui/Icon.jsx';

export default function HomeTopGrids({
  topFavs, showMoreTopFavs, setShowMoreTopFavs,
  topRated, showMoreTopRated, setShowMoreTopRated,
  userCoords, getKm, dark, T, favIds, toggleFav, handleCardTap, globalFavCounts, t
}) {
  const visibleFavs = topFavs.slice(0, showMoreTopFavs ? 10 : 5);
  const visibleRated = topRated.slice(0, showMoreTopRated ? 10 : 5);

  return (
    <>
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
    </>
  );
}
