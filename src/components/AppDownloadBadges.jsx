import { APP_STORE_URL, PLAY_STORE_URL } from "../lib/structuredData.js";

// Botones de descarga de la app con las insignias OFICIALES (SVG en
// public/badges/, las mismas del pie): App Store (arte oficial de Apple) y
// Google Play (arte oficial de Google). Mismo componente para el menú
// lateral y el inicio; el pie usa las mismas imágenes directo.
const BADGES = [
  {
    name: "App Store",
    url: APP_STORE_URL,
    img: "/badges/app-store.svg",
    alt: "Descargar en App Store",
    width: 120,
  },
  {
    name: "Google Play",
    url: PLAY_STORE_URL,
    img: "/badges/google-play.svg",
    alt: "Disponible en Google Play",
    width: 135,
  },
];

export default function AppDownloadBadges() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
      {BADGES.map((b) => (
        <a
          key={b.name}
          href={b.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={b.alt}
          style={{ display: "block", flexShrink: 0 }}
        >
          <img src={b.img} alt={b.alt} width={b.width} height={40} style={{ display: "block", height: 40, width: b.width }} />
        </a>
      ))}
    </div>
  );
}
