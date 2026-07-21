import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary.jsx'

// Check for updates every 1 hour in background
const updateSW = registerSW({
  onNeedRefresh() {
    // New content available — auto-reload to avoid stale file errors
    updateSW(true)
  },
  onRegistered(r) {
    // Check for updates every 30 minutes
    r && setInterval(() => {
      r.update()
    }, 30 * 60 * 1000)
  },
  onRegisterError(error) {
    console.error('SW registration error', error)
  }
})

// Se eliminó la recarga forzada de SW para evitar doble carga.

import { HelmetProvider } from 'react-helmet-async'

sessionStorage.removeItem('chunk_reload_guard');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <HelmetProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </HelmetProvider>
    </GlobalErrorBoundary>
  </StrictMode>,
)
