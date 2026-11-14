import LoadFailureView from './components/LoadFailureView.jsx';
import { initializeTheme } from './lib/theme.js';
import { useUIStore } from './store/useUIStore.js';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import { HelmetProvider } from 'react-helmet-async'
import { LazyMotion, domAnimation } from 'framer-motion'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const stopTheme = initializeTheme(useUIStore);
if (import.meta.hot) import.meta.hot.dispose(stopTheme);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes (cache time)
      refetchOnWindowFocus: false, // Prevents refetching when switching tabs for speed
      retry: 1, // Only retry once on failure
    },
  },
});

// Import failures propagate to a boundary or the startup fallback; they do not
// trigger a cache purge/reload merely because the connection failed.
const renderStartupFailure = error => {
  document.getElementById('boot-splash')?.remove();
  createRoot(document.getElementById('root')).render(<LoadFailureView error={error} fullPage/>);
};

// ─── Ruta /admin — carga sólo el panel sin la app completa ───────────────────
const isAdminRoute = window.location.pathname === '/admin' || window.location.pathname === '/admin/';

if (isAdminRoute) {
  // Importación dinámica: el bundle de la app principal NO se carga
  import('./AdminApp.jsx').then(({ default: AdminApp }) => {
    createRoot(document.getElementById('root')).render(
      <StrictMode>
        <HelmetProvider>
          <QueryClientProvider client={queryClient}>
            <AdminApp />
          </QueryClientProvider>
        </HelmetProvider>
      </StrictMode>
    );
  }).catch(renderStartupFailure);
} else {
  // App normal
  import('./App.jsx').then(({ default: App }) => {
    return import('./components/GlobalErrorBoundary.jsx').then(({ GlobalErrorBoundary }) => {

      // Sin registro del Service Worker, a conciencia (hallazgo #5, nov 2026):
      // el SW está muerto (VitePWA selfDestroying) y /sw.js sirve el script
      // autodestructivo para desinstalar el SW viejo de quien lo tenga. NO se
      // llama a registerSW(): registrar el autodestructivo en cada carga haría
      // que se instalara, se desinstalara y recargara la página en cada
      // visita — el bucle de recarga de la #229. Los navegadores con el SW
      // viejo lo actualizan solos con su chequeo automático de /sw.js y se
      // limpian con una sola recarga; el resto nunca instala nada.
      // (El SW de push, /firebase-messaging-sw.js, es otro registro aparte
      // y sigue intacto en useWebPush.js.)

      // chunk_reload_guard now uses timestamps

      createRoot(document.getElementById('root')).render(
        <StrictMode>
          <GlobalErrorBoundary>
            <HelmetProvider>
              <QueryClientProvider client={queryClient}>
                <BrowserRouter>
                  <LazyMotion features={domAnimation}>
                    <App />
                  </LazyMotion>
                </BrowserRouter>
              </QueryClientProvider>
            </HelmetProvider>
          </GlobalErrorBoundary>
        </StrictMode>
      );
    });
  }).catch(renderStartupFailure);
}
