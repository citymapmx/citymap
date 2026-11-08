import React from "react";
import { m, AnimatePresence } from "framer-motion";
import OptimizedImage from "../ui/OptimizedImage.jsx";
import { useUIStore } from "../../store/useUIStore.js";
import { SPRING_UI } from "../../lib/spring.js";

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

export default function BannerSlider({ activeBanners }) {
  const dark = useUIStore(s => s.dark);
  const [idx, setIdx] = React.useState(0);

  React.useEffect(() => {
    if (!activeBanners || activeBanners.length <= 1) return;
    const interval = setInterval(() => {
      setIdx(prev => (prev + 1) % activeBanners.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [activeBanners]);

  if (!activeBanners || activeBanners.length === 0) return null;

  const bn = activeBanners[idx % activeBanners.length];
  const mediaType = getMediaType(bn.img_url);
  const embedUrl = (mediaType === "youtube" || mediaType === "vimeo") ? getEmbedUrl(bn.img_url) : null;

  const handleClick = () => {
    if (bn.link_url && mediaType !== "youtube" && mediaType !== "vimeo") {
      let url = bn.link_url.trim();
      if (!url.match(/^https?:\/\//i) && !url.match(/^(mailto|tel|sms):/i)) url = "https://" + url;
      window.open(url, "_blank");
    }
  };

  return (
    <AnimatePresence initial={false}>
      <m.div
        key={bn.id}
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '-100%', opacity: 0 }}
        transition={SPRING_UI}
        style={{
          height: "100%", width: "100%", position: "absolute", top: 0, left: 0,
          zIndex: 10, filter: dark ? 'brightness(0.92)' : 'none',
        }}
        onClick={handleClick}
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
            title={bn.title || "Banner video"}
            allow="autoplay; fullscreen"
            style={{ width: "100%", height: "100%", border: "none", pointerEvents: "none" }}
          />
        ) : (
          <OptimizedImage
            src={bn.img_url}
            widthRequest={1400}
            priority
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
        }}>Publicidad</span>}
      </m.div>
    </AnimatePresence>
  );
}
