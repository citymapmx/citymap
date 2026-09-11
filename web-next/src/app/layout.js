import "./globals.css";

export const metadata = {
  title: "CityMap",
  description: "Descubre los mejores negocios cerca de ti",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="antialiased">
      <body className="flex flex-col min-h-screen">
        {children}
      </body>
    </html>
  );
}
