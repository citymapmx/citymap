import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          ['babel-plugin-react-compiler', {
            target: '19',  // React 19 mode — enables all optimizations
          }]
        ]
      }
    }),
    VitePWA({
      registerType: 'autoUpdate',
      // SW REVIVIDO (nov 2026, parte B del «sin internet al abrir»):
      // el SW estuvo muerto a conciencia tras la #229 (hallazgo #5), y
      // sin él nada sirve el shell en un arranque en frío sin internet:
      // el WebView falla antes de que arranque la web y no llegan a
      // actuar ni la caché de localStorage (#382) ni LoadFailureView
      // (#385). La causa del bucle de la #229 era selfDestroying: el
      // script se desinstalaba y recargaba la página en cada visita
      // mientras el cliente lo volvía a registrar. Sin selfDestroying
      // no hay nada que desinstalar ni recargar: el SW es normal,
      // autoUpdate + skipWaiting + clientsClaim lo actualizan en
      // segundo plano y onNeedRefresh NUNCA recarga (main.jsx). La
      // espiral de caché de sep 2026 (shell viejo con chunks nuevos
      // que ya no existen) queda cubierta por el guardia de recarga de
      // loadRecovery.js (solo ante error de chunk obsoleto, solo con
      // red, una vez cada 15 s) y por cleanupOutdatedCaches.
      includeAssets: ['icon-192.png'],
      workbox: {
        // navigateFallback: las rutas SPA (/, /tepic, /tepic/<negocio>)
        // sirven el index.html precacheado cuando no hay red — es lo
        // que hace posible el arranque en frío sin internet.
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/native-auth\.html/],
        // Only precache static assets, NOT JS chunks (they change every deploy)
        globPatterns: ['**/*.{css,html,ico,png,svg,webp,jpg,jpeg,otf}'],
        // Precaché solo primera pantalla (nov 2026, optimización 2):
        // antes precacheaba 4,27 MB en la primera visita, incluyendo
        // imágenes que casi nadie ve al abrir la app. Esas se descargan
        // bajo demanda cuando se ven. Se queda: index.html, CSS, logos,
        // iconos del manifest y og-image.png (portada para compartir).
        // La fuente Brunson del encabezado NO va en el precaché (el glob
        // no incluye ttf): se descarga por @font-face como antes.
        // NO tocar navigateFallback ni el registro del SW (PR #392).
        globIgnores: [
          '**/scooter-reparto.png',
          '**/plans/**',
          '**/onboarding_1.jpg',
          '**/onboarding_2.jpg',
          '**/verificado.png',
          '**/pedido.png',
          '**/tripadvisor.png',
          '**/hoteles.com.png',
          '**/expedia.png',
          '**/getyourguide.png',
          '**/tiqets.png',
          '**/civitatis.png',
          '**/booking.png',
          '**/airbnb.svg',
          '**/google*.html',
          // Coolvetica no se usa en la app Vite (su @font-face se quitó
          // de index.css): su OTF de 67 KB se descargaba en cada visita.
          // El patrón va sin el nombre completo a propósito: el test de
          // rendimiento_telefono prohíbe esa cadena en vite.config.js.
          '**/Coolvetica*.otf',
          // Iconos viejos sin referencia (optimización 4): el favicon y
          // el icono de Apple ahora apuntan a icon-192.png. Los archivos
          // quedan en public/ para /favicon.png directo y el script de
          // icono iOS (scripts/generar-icono-ios.py).
          '**/favicon.png',
          '**/apple-icon.png',
          '**/apple-touch-icon.png',
        ],
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          },
          {
            // JS/CSS assets: NetworkFirst so users always get the latest
            urlPattern: /\.(?:js|css)$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'assets-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 }
            }
          },
          {
            // Supabase API requests: NetworkFirst to always get fresh data (fixes stale data bugs after edits)
            urlPattern: /^https:\/\/dpkjxhjkzdlkvyotoeai\.supabase\.co\/rest\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 }, // Cache for 7 days
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // CDN Images & photos: CacheFirst (logos, business cards, itineraries, event posters)
            urlPattern: /^https:\/\/(?:dpkjxhjkzdlkvyotoeai\.supabase\.co\/storage\/v1\/object\/public\/media\/|res\.cloudinary\.com\/).*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cdn-cache',
              expiration: {
                maxEntries: 150,
                maxAgeSeconds: 60 * 60 * 24 * 30 // Cache for 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      manifest: {
        name: 'CityMap México',
        short_name: 'CityMap',
        description: 'Descubre los mejores negocios cerca de ti',
        theme_color: '#000000',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  build: {
    target: 'esnext',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Solo react y react-dom exactos. 'node_modules/react' a secas
          // también casa con react-virtuoso, react-easy-crop o
          // react-qr-code y los metía en el chunk 'react', que se precarga
          // en el inicio aunque solo se usen en el Uploader o la Wallet.
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react'
          }
        }
      }
    }
  }
})
