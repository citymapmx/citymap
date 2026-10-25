import { useState, useEffect, useRef } from "react";
import Icon from "./ui/Icon.jsx";
import { getThumbUrl } from "../lib/utils.js";

export default function Gallery({ photos, h = 320, fit = "cover", bg = "#111", initialIndex = 0 }) {
  const [i, setI] = useState(initialIndex);
  const [loadedUrl, setLoadedUrl] = useState(null);
  const [zoom, setZoom] = useState(false);
  const thumbsRef = useRef(null);
  const isFullscreen = h === "100dvh";


  // Auto-scroll the selected thumbnail into view
  useEffect(() => {
    if (!thumbsRef.current) return;
    const thumb = thumbsRef.current.children[i];
    if (thumb) thumb.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [i]);

  const raw = photos?.[i] || photos?.[0];
  const p = typeof raw === 'string' ? { url: raw } : raw;
  const loaded = loadedUrl === p?.url;
  const total = photos?.length || 0;
  const prev = () => { setZoom(false); setI(x => (x - 1 + total) % total); };
  const next = () => { setZoom(false); setI(x => (x + 1) % total); };

  if (!p?.url) return (
    <div style={{ height: h, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
      <Icon name="image" size={44} color="#283028" />
      <span style={{ fontSize: 13, color: "#8A9E96" }}>Sin fotografías</span>
    </div>
  );

  // Height minus thumbnail strip when fullscreen
  const mainH = isFullscreen && total > 1 ? "calc(100dvh - 90px)" : h;

  return (
    <div style={{ position: "relative", width: "100%", height: h, overflow: "hidden", background: bg, userSelect: "none", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
      {/* ── MAIN IMAGE ── */}
      <div style={{ position: "relative", flex: 1, overflow: "hidden", padding: isFullscreen ? "90px 0 0 0" : 0 }}>
        {/* Spinner Minimalista */}
        {!loaded && p.url && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", zIndex: 1 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.15)", borderTopColor: "#fff", animation: "spin 1s linear infinite" }} />
          </div>
        )}

        <div style={{ width: '100%', height: '100%', overflow: zoom ? 'auto' : 'hidden', WebkitOverflowScrolling: 'touch' }}>
        <img
          key={p.url}
          src={isFullscreen ? p.url : getThumbUrl(p.url, 1200, 1000, fit)}
          alt={p.alt || p.label || `Foto ${i + 1} de la galería`}
          loading="eager"
          onLoad={() => setLoadedUrl(p.url)}
          style={{ width: zoom ? "200%" : "100%", maxWidth: "none", height: zoom ? "200%" : "100%", objectFit: fit, objectPosition: "center", display: "block", opacity: loaded ? 1 : 0, transition: "opacity 0.25s ease-out" }}
        />

        </div>
        {isFullscreen && <button type="button" aria-label={zoom ? 'Reducir foto' : 'Ampliar foto'} aria-pressed={zoom} onClick={() => setZoom(value => !value)} style={{ position: 'absolute', top: 100, left: 16, zIndex: 10, border: '1px solid rgba(255,255,255,.25)', borderRadius: 20, background: 'rgba(0,0,0,.6)', color: '#fff', padding: '8px 12px', cursor: 'pointer' }}>{zoom ? '− Reducir' : '+ Ampliar'}</button>}

        {/* Counter */}
        {total > 1 && <div style={{ position: "absolute", top: isFullscreen ? 100 : 16, right: 16, background: "rgba(0,0,0,.52)", backdropFilter: "blur(8px)", borderRadius: 20, padding: "4px 12px", fontSize: 13, fontWeight: 700, color: "#fff", letterSpacing: .3, zIndex: 10 }}>{i + 1} / {total}</div>}
        {/* Arrows */}
        {total > 1 && <>
          <button type="button" aria-label="Foto anterior" className="gallery-btn" onClick={prev} style={{ position: "absolute", left: 4, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", width: 44, height: 44, cursor: "pointer", alignItems: "center", justifyContent: "center", zIndex: 10, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.8))" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", margin: "auto" }}><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <button type="button" aria-label="Foto siguiente" className="gallery-btn" onClick={next} style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", width: 44, height: 44, cursor: "pointer", alignItems: "center", justifyContent: "center", zIndex: 10, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.8))" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", margin: "auto" }}><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </>}
        {/* Swipe */}
        {total > 1 && !zoom && <div style={{ position: "absolute", inset: 0, zIndex: 5 }} onTouchStart={e => e.currentTarget._sx = e.touches[0].clientX} onTouchEnd={e => { const dx = e.changedTouches[0].clientX - (e.currentTarget._sx || 0); if (Math.abs(dx) > 40) { dx < 0 ? next() : prev(); } }} />}
      </div>

      {/* ── THUMBNAIL STRIP ── */}
      {total > 1 && (
        <div
          ref={thumbsRef}
          style={{
            display: "flex",
            justifyContent: total <= 5 ? "center" : "flex-start",
            gap: 6,
            padding: "8px 10px",
            overflowX: "auto",
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(16px)",
            flexShrink: 0,
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {photos.map((ph, j) => (
            <div
              key={j}
              onClick={() => { setZoom(false); setI(j); }}
              style={{
                flexShrink: 0,
                width: 72,
                height: 72,
                borderRadius: 8,
                overflow: "hidden",
                cursor: "pointer",
                border: j === i ? "2.5px solid #fff" : "2.5px solid transparent",
                opacity: j === i ? 1 : 0.75,
                transition: "all 0.2s ease",
                background: "#222",
              }}
            >
              <img
                src={getThumbUrl(typeof ph === "string" ? ph : ph.url, 120, 120, "cover")}
                alt=""
                loading="lazy"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
