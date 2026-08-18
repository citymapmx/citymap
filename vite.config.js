import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-icon.png', 'Coolvetica Rg.otf'],
      workbox: {
        navigateFallbackDenylist: [/^\/native-auth\.html/],
        // Only precache static assets, NOT JS chunks (they change every deploy)
        globPatterns: ['**/*.{css,html,ico,png,svg,webp,jpg,jpeg,otf}'],
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
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react'
          }
          if (id.includes('node_modules/framer-motion')) {
            return 'motion'
          }
        }
      }
    }
  }
})
