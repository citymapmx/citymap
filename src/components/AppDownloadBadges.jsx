import { APP_STORE_URL, PLAY_STORE_URL } from "../lib/structuredData.js";

// Botones de descarga de la app con las insignias OFICIALES (SVG en
// public/badges/, las mismas del pie): App Store (arte oficial de Apple) y
// Google Play (arte oficial de Google). Mismo componente para el menú
// lateral y el inicio; el pie usa las mismas imágenes directo.
// Prop opcional `title`: encabezado chico («Descarga la app») sobre las
// insignias, con el mismo estilo del título del pie (11 px, 800,
// mayúsculas, letterSpacing 0.8). Solo lo usan la ficha de evento y los
// artículos de Revista/tours; el menú, los inicios y el pie no llevan
// título aquí (el pie ya tiene el suyo propio fuera del componente).
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

export default function AppDownloadBadges({ title, titleColor }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      {title ? (
        <div style={{ fontSize: 11, fontWeight: 800, color: titleColor || "inherit", textTransform: "uppercase", letterSpacing: 0.8 }}>
          {title}
        </div>
      ) : null}
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
    </div>
  );
}
