import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useUIStore } from "../store/useUIStore.js";
import { getT } from "../lib/constants.js";

// Rendered for removed sections (e.g. /planes). The matching server rewrite in
// vercel.json answers these URLs with a real HTTP 404; this view covers
// in-app navigation to them.
export default function NotFoundView() {
  const location = useLocation();
  const dark = useUIStore(s => s.dark);
  const T = getT(dark);

  useEffect(() => {
    const prevTitle = document.title;
    document.title = "404 — Página no encontrada | CityMap";
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex";
    document.head.appendChild(robots);
    return () => {
      document.title = prevTitle;
      robots.remove();
    };
  }, [location.pathname]);

  return (
    <div role="alert" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 24, textAlign: "center", background: T.bg, color: T.text }}>
      <h1 style={{ margin: 0, fontSize: 56, fontWeight: 900 }}>404</h1>
      <p style={{ margin: 0, fontSize: 16, color: T.sub }}>Página no encontrada</p>
      <a href="/" style={{ marginTop: 8, padding: "10px 20px", borderRadius: 9999, background: dark ? "#FFFFFF" : "#0F172A", color: dark ? "#000000" : "#FFFFFF", fontWeight: 800, textDecoration: "none" }}>
        Ir al inicio
      </a>
    </div>
  );
}
