import React from "react";
import { m, AnimatePresence } from "framer-motion";
import OptimizedImage from "../ui/OptimizedImage.jsx";

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
          onClick={() => {
            if (bn.link_url) {
              let url = bn.link_url.trim();
              if (!url.match(/^https?:\/\//i) && !url.match(/^(mailto|tel|sms):/i)) {
                url = 'https://' + url;
              }
              window.open(url, "_blank");
            }
          }}
        >
          <OptimizedImage src={bn.img_url} widthRequest={1400} alt={bn.title || ""} style={{ width: "100%", height: "100%", objectFit: "cover", cursor: bn.link_url ? "pointer" : "default" }} />
            {bn.is_advertisement === true && <span style={{
              position: "absolute", top: 0, left: 0, zIndex: 2,
              padding: "2px 7px 2px 9px", borderRadius: "0 0 6px 0",
              background: "rgba(0,0,0,0.62)", color: "#fff",
              fontSize: 10, lineHeight: "14px", fontWeight: 500,
              letterSpacing: 0.15, pointerEvents: "none"
            }}>Publicidad</span>}
        </m.div>
      </AnimatePresence>
      <div style={{ display: "none" }}>
        {[1].map(offset => {
          const nextBn = activeBanners[(idx + offset) % activeBanners.length];
          return nextBn?.img_url ? <OptimizedImage key={"preload_" + nextBn.id} src={nextBn.img_url} widthRequest={1400} priority={true} /> : null;
        })}
      </div>
    </>
  );
}
