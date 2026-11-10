// robots.txt real para Google. Antes no existía esta ruta y la dinámica [city]
// capturaba /robots.txt como si fuera una ciudad, devolviendo el HTML de
// "Ciudad no encontrada". Mismas reglas que el robots.txt de la raíz.
export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/manage', '/stats/'],
      },
    ],
    sitemap: 'https://citymap.mx/sitemap.xml',
  };
}
