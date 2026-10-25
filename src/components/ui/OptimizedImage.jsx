import React, { memo } from 'react';
import { getThumbUrl } from '../../lib/utils';

const globalLoadedImages = new Set();

/**
 * OptimizedImage
 * Un wrapper inteligente para cargar imágenes optimizadas de Cloudinary/Supabase.
 * Usa React.memo para evitar que se re-rendericen imágenes si su URL no ha cambiado.
 *
 * Props:
 * - src: URL original de la imagen
 * - alt: Texto alternativo
 * - widthRequest: Ancho deseado para la transformación (default 400)
 * - priority: Si es true, usa loading="eager" y fetchpriority="high", y precarga la imagen (hero banners)
 * - className: Clases CSS (opcional)
 * - style: Estilos en línea (opcional)
 * - onClick: Evento de click (opcional)
 * 
 * Por defecto usa loading="lazy" (ideal para feeds y listas).
 */
const OptimizedImage = memo(({ 
  src, 
  alt = "", 
  widthRequest = 400, 
  heightRequest = null,
  priority = false, 
  className, 
  style,
  onClick 
}) => {
  const optimizedSrc = src ? getThumbUrl(src, widthRequest, heightRequest) : null;
  const [loadedSrc, setLoadedSrc] = React.useState(null);
  const [retrySrc, setRetrySrc] = React.useState(null);
  const [failedSrc, setFailedSrc] = React.useState(null);
  const displaySrc = retrySrc === optimizedSrc ? src : optimizedSrc;
  const loaded = loadedSrc === optimizedSrc || globalLoadedImages.has(optimizedSrc);
  const fallback = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="#e8ecf0"/><path d="M240 240l44-52 34 35 24-26 32 43z" fill="#a4afbb"/><circle cx="335" cy="164" r="15" fill="#a4afbb"/></svg>');
  
  if (!src) return null;

  return (
    <img 
      src={failedSrc === optimizedSrc ? fallback : displaySrc} 
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding={priority ? "sync" : "async"}
      className={className}
      style={{
        opacity: priority ? 1 : (loaded ? 1 : 0),
        transition: (priority || loaded) ? "none" : "opacity 0.2s ease-out",
        backgroundColor: "transparent",
        transform: "translateZ(0)",
        willChange: priority ? "auto" : "opacity",
        ...style
      }}
      onLoad={() => {
        globalLoadedImages.add(optimizedSrc);
        setLoadedSrc(optimizedSrc);
      }}
      onError={() => {
        if (displaySrc !== src) { setRetrySrc(optimizedSrc); return; }
        setFailedSrc(optimizedSrc);
        setLoadedSrc(optimizedSrc);
      }}
      onClick={onClick}
    />
  );
});

OptimizedImage.displayName = 'OptimizedImage';
export default OptimizedImage;
