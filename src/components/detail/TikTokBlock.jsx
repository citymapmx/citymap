import React, { useEffect } from "react";

export default function TikTokBlock({ url, videoId }) {
  useEffect(() => {
    const existingScript = document.getElementById('tiktok-embed-script');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'tiktok-embed-script';
      script.src = 'https://www.tiktok.com/embed.js';
      script.async = true;
      document.body.appendChild(script);
    } else {
       if (window.tiktokEmbed && typeof window.tiktokEmbed.lib?.render === 'function') {
         setTimeout(() => window.tiktokEmbed.lib.render(), 100);
       }
    }
  }, [url]);

  return (
    <div style={{ width: "100%", display: "flex", justifyContent: "center", marginBottom: 24, overflow: "hidden" }}>
      <blockquote 
        className="tiktok-embed" 
        cite={url} 
        data-video-id={videoId} 
        style={{ maxWidth: 605, minWidth: 325, width: "100%", margin: 0 }}
      >
        <section></section>
      </blockquote>
    </div>
  );
}
