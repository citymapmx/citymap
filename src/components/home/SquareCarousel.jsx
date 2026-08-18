import OptimizedImage from "../ui/OptimizedImage.jsx";

export default function SquareCarousel({ title, list, handleCardTap, getThumbUrl, CAT_EMOJI, T, FONT_BIZ }) {
  if (!list || list.length === 0) return null;
  const isSingle = list.length === 1;

  return (
    <div style={{ padding: "24px 0 0" }}>
      <div style={{ padding: "0 20px", marginBottom: 12 }}>
        <h2 style={{ fontFamily: "var(--heading)", fontWeight: 900, fontSize: 22, color: T.text, letterSpacing: "-0.5px", textAlign: "center", margin: 0 }}>{title}</h2>
      </div>
      <div style={{ display: "flex", gap: 10, overflowX: isSingle ? "visible" : "auto", paddingLeft: 20, paddingRight: 20, paddingBottom: 6, scrollbarWidth: "none" }}>
        {list.map((b) => {
          const imgToUse = b.logo_url || b.photos?.[0]?.url;
          
          if (isSingle) {
            return (
              <div key={b.id} className="press" onClick={() => handleCardTap(b)} style={{ width: "100%", background: T.white, borderRadius: 16, padding: 12, display: "flex", alignItems: "center", gap: 14, boxShadow: T.shadow, cursor: "pointer", border: `1px solid ${T.border}` }}>
                <div style={{ width: 64, height: 64, borderRadius: 12, overflow: "hidden", background: T.border, flexShrink: 0, position: "relative" }}>
                  {imgToUse
                    ? <OptimizedImage src={imgToUse} widthRequest={200} heightRequest={200} alt={b.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: imgToUse === b.logo_url ? "contain" : "cover", display: "block" }} />
                    : <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{(b.emoji || CAT_EMOJI[b.category]) || "📍"}</div>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: FONT_BIZ, fontWeight: 800, fontSize: 16, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.2 }}>{b.name}</div>
                  <div style={{ fontSize: 13, color: T.sub, marginTop: 4, textTransform: "capitalize" }}>{b.category}</div>
                </div>
              </div>
            );
          }

          return (
            <div key={b.id} className="press" onClick={() => handleCardTap(b)} style={{ minWidth: 90, maxWidth: 90, flexShrink: 0, cursor: "pointer", display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ width: 90, height: 90, borderRadius: 20, overflow: "hidden", background: T.border, boxShadow: T.shadow, position: "relative" }}>
                {imgToUse
                  ? <OptimizedImage src={imgToUse} widthRequest={200} heightRequest={200} alt={b.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: imgToUse === b.logo_url ? "contain" : "cover", display: "block" }} />
                  : <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>{(b.emoji || CAT_EMOJI[b.category]) || "📍"}</div>
                }
              </div>
              <div style={{ fontFamily: FONT_BIZ, fontWeight: 800, fontSize: 11, color: T.text, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.1 }}>{b.name}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
