import React from "react";
import { m, AnimatePresence } from "framer-motion";
import OptimizedImage from "../ui/OptimizedImage.jsx";
import { SRCSET_BANNER } from "../../lib/utils.js";
import { useUIStore } from "../../store/useUIStore.js";
import { useTranslation } from "../../hooks/useTranslation.js";

// Detect URL type
function getMediaType(url) {
  if (!url) return "image";
  const u = url.trim().toLowerCase();
  if (u.match(/\.(mp4|webm|ogg)(\?.*)?$/)) return "video";
  if (u.includes("youtube.com/watch") || u.includes("youtu.be/") || u.includes("youtube.com/shorts")) return "youtube";
  if (u.includes("vimeo.com/")) return "vimeo";
  return "image";
}

function getEmbedUrl(url) {
  if (!url) return null;
  const u = url.trim();
  // YouTube: extract video ID
  const ytMatch = u.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) {
    const id = ytMatch[1];
    return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&modestbranding=1&playsinline=1`;
  }
  // Vimeo: extract video ID
  const vimeoMatch = u.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&muted=1&loop=1&background=1`;
  }
  return null;
}

// Animación del banner: lenta y suave. El resorte de la interfaz (SPRING_UI)
// es demasiado brusco para un carrusel que cambia solo: un tween de 0.7 s
// con ease-out hace que el cambio se sienta calmado, y el banner se queda
// 8 s en pantalla antes de avanzar.
const BANNER_TRANSITION = { type: "tween", duration: 0.7, ease: [0.22, 1, 0.36, 1] };
const AUTOPLAY_MS = 8000;
const SWIPE_MIN_PX = 50;

const slideVariants = {
  enter: (dir) => ({ x: dir >= 0 ? "100%" : "-100%", opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir >= 0 ? "-100%" : "100%", opacity: 0 }),
};

export default function BannerSlider({ activeBanners }) {
  const { t } = useTranslation();
  const dark = useUIStore(s => s.dark);
  const [idx, setIdx] = React.useState(0);
  const [dir, setDir] = React.useState(1);
  const touchRef = React.useRef({ x: 0, y: 0, moved: false });
  const suppressClickRef = React.useRef(false);

  const count = activeBanners?.length || 0;

  const goTo = (i) => {
    if (count <= 1) return;
    const target = ((i % count) + count) % count;
    if (target === idx) return;
    const d = (target === 0 && idx === count - 1) ? 1
      : (target === count - 1 && idx === 0) ? -1
      : (target > idx ? 1 : -1);
    setDir(d);
    setIdx(target);
  };

  // Autoplay: cada cambio de banner (automático o manual) reinicia el
  // temporizador, así después de moverlo con el dedo hay 8 s tranquilos
  // antes del siguiente cambio.
  React.useEffect(() => {
    if (count <= 1) return;
    const interval = setInterval(() => {
      setDir(1);
      setIdx((prev) => (prev + 1) % count);
    }, AUTOPLAY_MS);
    return () => clearInterval(interval);
  }, [activeBanners, idx, count]);

  if (count === 0) return null;

  const safeIdx = idx % count;
  const bn = activeBanners[safeIdx];
  const mediaType = getMediaType(bn.img_url);
  const embedUrl = (mediaType === "youtube" || mediaType === "vimeo") ? getEmbedUrl(bn.img_url) : null;

  const handleClick = () => {
    // No abrir el enlace si el toque fue un deslizamiento.
    if (suppressClickRef.current) return;
    if (bn.link_url && mediaType !== "youtube" && mediaType !== "vimeo") {
      let url = bn.link_url.trim();
      if (!url.match(/^https?:\/\//i) && !url.match(/^(mailto|tel|sms):/i)) url = "https://" + url;
      window.open(url, "_blank");
    }
  };

  const onTouchStart = (e) => {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY, moved: false };
  };
  const onTouchMove = (e) => {
    const t = e.touches[0];
    if (Math.abs(t.clientX - touchRef.current.x) > 10 || Math.abs(t.clientY - touchRef.current.y) > 10) {
      touchRef.current.moved = true;
    }
  };
  const onTouchEnd = (e) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - touchRef.current.x;
    const dy = t.clientY - touchRef.current.y;
    if (Math.abs(dx) > SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) goTo(idx + 1);
      else goTo(idx - 1);
    }
    if (touchRef.current.moved) {
      // El clic llega justo después del touchend: suprimirlo un momento.
      suppressClickRef.current = true;
      setTimeout(() => { suppressClickRef.current = false; }, 350);
    }
  };

  return (
    <div style={{ margin: "6px 20px 8px" }}>
      <div style={{ borderRadius: 14, overflow: "hidden", aspectRatio: "21/9", position: "relative", background: "transparent" }}>
        <AnimatePresence initial={false} custom={dir}>
          <m.div
            key={bn.id}
            custom={dir}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={BANNER_TRANSITION}
            style={{
              height: "100%", width: "100%", position: "absolute", top: 0, left: 0,
              zIndex: 10, filter: dark ? 'brightness(0.92)' : 'none', touchAction: "pan-y",
            }}
            onClick={handleClick}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {mediaType === "video" ? (
              <video
                src={bn.img_url}
                autoPlay
                muted
                loop
                playsInline
                style={{ width: "100%", height: "100%", objectFit: "cover", cursor: bn.link_url ? "pointer" : "default", display: "block" }}
              />
            ) : embedUrl ? (
              <iframe
                src={embedUrl}
                title={bn.title || t("home_banner_video", "Banner video")}
                allow="autoplay; fullscreen"
                style={{ width: "100%", height: "100%", border: "none", pointerEvents: "none" }}
              />
            ) : (
              <OptimizedImage
                src={bn.img_url}
                widthRequest={1400}
                priority
                srcSetWidths={SRCSET_BANNER}
                sizes="100vw"
                alt={bn.title || ""}
                style={{ width: "100%", height: "100%", objectFit: "cover", cursor: bn.link_url ? "pointer" : "default" }}
              />
            )}
            {bn.is_advertisement === true && <span style={{
              position: "absolute", top: 0, left: 0, zIndex: 2,
              padding: "2px 7px 2px 9px", borderRadius: "0 0 6px 0",
              background: "rgba(0,0,0,0.62)", color: "#fff",
              fontSize: 10, lineHeight: "14px", fontWeight: 500,
              letterSpacing: 0.15, pointerEvents: "none"
            }}>{t("home_publicidad", "Publicidad")}</span>}
          </m.div>
        </AnimatePresence>
      </div>
      {count > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 8 }}>
          {activeBanners.map((b, i) => (
            <button
              key={b.id || i}
              type="button"
              aria-label={`${t("home_ver_banner", "Ver banner")} ${i + 1} ${t("home_de", "de")} ${count}`}
              aria-current={i === safeIdx}
              onClick={() => goTo(i)}
              style={{
                // Área táctil de 24×24 (WCAG 2.2): el punto visual sigue
                // midiendo 6 px de alto; el margen negativo compensa el
                // alto para que la fila no crezca (el diseño no cambia).
                width: 24,
                height: 24,
                margin: "-9px 0",
                padding: 0,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: i === safeIdx ? 18 : 6,
                  height: 6,
                  borderRadius: 999,
                  background: i === safeIdx
                    ? (dark ? "#FFFFFF" : "#0F172A")
                    : (dark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.22)"),
                  transition: "width 0.3s ease, background 0.3s ease",
                  display: "block",
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
