import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import { HelmetProvider } from 'react-helmet-async'
import { LazyMotion, domAnimation } from 'framer-motion'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

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
  });
} else {
  // App normal
  import('./App.jsx').then(({ default: App }) => {
    import('./components/GlobalErrorBoundary.jsx').then(({ GlobalErrorBoundary }) => {

      // Check for updates every 30 min via Service Worker
      import('virtual:pwa-register').then(({ registerSW }) => {
        const updateSW = registerSW({
          onNeedRefresh() { updateSW(true); },
          onRegistered(r) {
            r && setInterval(() => { r.update(); }, 30 * 60 * 1000);
          },
          onRegisterError(error) { console.error('SW registration error', error); }
        });
      }).catch(() => {});

      sessionStorage.removeItem('chunk_reload_guard');

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
  });
}
