import { useEffect, useRef, useState } from "react";

export default function AdBanner({ style = {} }) {
  const containerRef = useRef(null);
  const pushed = useRef(false);
  const [adStatus, setAdStatus] = useState("loading"); // loading, filled, unfilled

  useEffect(() => {
    if (pushed.current) return;
    
    let observer;
    
    const timer = setTimeout(() => {
      try {
        if (window.adsbygoogle && containerRef.current) {
          const ins = containerRef.current.querySelector("ins");
          
          // Observe the <ins> tag for attribute changes by AdSense
          observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              if (mutation.attributeName === "data-ad-status") {
                const status = ins.getAttribute("data-ad-status");
                if (status === "unfilled") {
                  setAdStatus("unfilled");
                } else if (status === "filled") {
                  setAdStatus("filled");
                }
              }
            });
          });
          
          if (ins) {
            observer.observe(ins, { attributes: true });
          }

          (window.adsbygoogle = window.adsbygoogle || []).push({});
          pushed.current = true;
        }
      } catch (e) {
        console.error("AdSense Error:", e);
        setAdStatus("unfilled");
      }
    }, 300);

    const fallbackTimer = setTimeout(() => {
      setAdStatus(prev => prev === "loading" ? "unfilled" : prev);
    }, 3000);

    return () => {
      clearTimeout(timer);
      clearTimeout(fallbackTimer);
      if (observer) observer.disconnect();
    };
  }, []);

  // If ad is confirmed unfilled, hide the entire wrapper so we don't have blank spaces
  if (adStatus === "unfilled") {
    return null;
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        overflow: "hidden",
        display: "block",
        minHeight: adStatus === "filled" ? "auto" : "100px", // Provide space initially
        ...style,
      }}
    >
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-format="fluid"
        data-ad-layout-key="-6t+ed+2i-1n-4w"
        data-ad-client="ca-pub-6883476912475263"
        data-ad-slot="7194246652"
      />
    </div>
  );
}
