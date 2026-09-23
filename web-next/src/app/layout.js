import "./globals.css";
import BottomNav from "../components/layout/BottomNav";
import { Providers } from "./providers";

export const metadata = {
  title: {
    default: "CityMap — Restaurantes, Cafés y Eventos en tu Ciudad",
    template: "%s | CityMap",
  },
  description: "Descubre los mejores restaurantes, cafés, eventos y negocios locales en tu ciudad. Horarios actualizados, reseñas y cupones exclusivos en CityMap.",
  metadataBase: new URL("https://citymap.mx"),
  alternates: {
    canonical: "https://citymap.mx",
    languages: {
      "es-MX": "https://citymap.mx",
      "es": "https://citymap.world",
      "x-default": "https://citymap.world",
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    siteName: "CityMap",
    title: "CityMap — Restaurantes, Cafés y Eventos en tu Ciudad",
    description: "Descubre los mejores restaurantes, cafés, eventos y negocios locales en tu ciudad.",
    url: "https://citymap.mx",
    images: [
      {
        url: "https://citymap.mx/og-image.png",
        width: 1200,
        height: 630,
        alt: "CityMap — Directorio local de negocios",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CityMap — Restaurantes, Cafés y Eventos en tu Ciudad",
    description: "Descubre los mejores restaurantes, cafés, eventos y negocios locales en tu ciudad.",
    images: ["https://citymap.mx/og-image.png"],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="antialiased">
      <body className="flex flex-col min-h-screen">
        <Providers>
          {children}
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
