import { useState, useEffect } from 'react';
import Icon from './ui/Icon.jsx';


// ─── SPLASH SCREEN ────────────────────────────────────────────────────────────
const LOGO_URL = "/logo-brand.png";

function SplashScreen({ T }) {
  return (
    <div style={{ fontFamily: "'DM Sans',system-ui,sans-serif", minHeight: "100vh", width: "100%", background: "#000", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <style>{`
        @keyframes logoIn{from{opacity:0;transform:scale(.85) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}
      `}</style>
      <img
        src={LOGO_URL}
        alt="CityGuide"
        style={{
          width: 200, maxWidth: "60%", objectFit: "contain",
          filter: "brightness(10)",
          position: "relative", zIndex: 1,
          animation: "logoIn .7s cubic-bezier(.34,1.1,.64,1) both"
        }}
      />
    </div>
  );
}

// ─── PAGE LOGO ───────────────────────────────────────────────────────────────
function PageLogo({ dark }) {
  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <div className="logo-container" style={{ height: 48 }}>
        <img
          src={LOGO_URL}
          alt="logo"
          style={{
            height: "100%",
            objectFit: "contain",
            opacity: dark ? .6 : 1,
            filter: dark ? "brightness(10)" : "brightness(0)",
            transition: "filter .3s,opacity .3s"
          }}
        />
      </div>
    </div>
  );
}

export { SplashScreen, PageLogo };
