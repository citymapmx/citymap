import "./globals.css";
import BottomNav from "../components/layout/BottomNav";
import { Providers } from "./providers";

export const metadata = {
  title: {
    default: "CityMap — Dónde comer, qué hacer y eventos en tu ciudad",
    template: "%s | CityMap",
  },
  description: "Descubre dónde comer, qué hacer y qué está pasando en tu ciudad. Encuentra lugares, explora experiencias y organiza tu próximo plan con CityMap.",
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
    title: "CityMap — Dónde comer, qué hacer y eventos en tu ciudad",
    description: "Descubre dónde comer, qué hacer y qué está pasando en tu ciudad. Encuentra lugares, explora experiencias y organiza tu próximo plan con CityMap.",
    url: "https://citymap.mx",
    images: [
      {
        url: "https://citymap.mx/og-image.png",
        width: 1200,
        height: 630,
        alt: "CityMap — Explora experiencias y organiza tu plan",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CityMap — Dónde comer, qué hacer y eventos en tu ciudad",
    description: "Descubre dónde comer, qué hacer y qué está pasando en tu ciudad. Encuentra lugares, explora experiencias y organiza tu próximo plan con CityMap.",
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
      
      <head>
        <link rel="preconnect" href="https://dpkjxhjkzdlkvyotoeai.supabase.co" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://dpkjxhjkzdlkvyotoeai.supabase.co" />
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
      </head>
      <body className="flex flex-col min-h-screen">


        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "CityMap",
              "url": "https://citymap.mx",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://citymap.mx/?buscar={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />

        <Providers>
          {children}
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
