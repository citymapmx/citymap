import React from "react";
import { m, AnimatePresence } from "framer-motion";
import OptimizedImage from "../ui/OptimizedImage.jsx";

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
  const [idx, setIdx] = React.useState(0);
  
  React.useEffect(() => {
    if (!activeBanners || activeBanners.length <= 1) return;
    const interval = setInterval(() => {
      setIdx(prev => (prev + 1) % activeBanners.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [activeBanners]);

  if (!activeBanners || activeBanners.length === 0) return null;
  const bn = activeBanners[idx];
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
    <>
      <AnimatePresence mode="wait">
        <m.div
          key={bn.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{ height: "100%", width: "100%", position: "absolute", top: 0, left: 0 }}
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
            <OptimizedImage src={bn.img_url} widthRequest={1400} alt={bn.title || ""} style={{ width: "100%", height: "100%", objectFit: "cover", cursor: bn.link_url ? "pointer" : "default" }} />
          )}
        </m.div>
      </AnimatePresence>
      <div style={{ display: "none" }}>
        {[1].map(offset => {
          const nextBn = activeBanners[(idx + offset) % activeBanners.length];
          const nextType = getMediaType(nextBn?.img_url);
          return nextBn?.img_url && nextType === "image" ? <OptimizedImage key={"preload_" + nextBn.id} src={nextBn.img_url} widthRequest={1400} priority={true} /> : null;
        })}
      </div>
    </>
  );
}
