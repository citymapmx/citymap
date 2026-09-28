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
  const [loaded, setLoaded] = React.useState(() => globalLoadedImages.has(optimizedSrc));
  
  if (!src) return null;

  return (
    <img 
      src={optimizedSrc} 
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      fetchpriority={priority ? "high" : "auto"}
      className={className}
      style={{
        opacity: loaded ? 1 : 0,
        transition: loaded ? "none" : "opacity 0.4s ease-out",
        backgroundColor: "#F1F5F9",
        transform: "translateZ(0)",
        willChange: "opacity",
        ...style
      }}
      onLoad={() => {
        globalLoadedImages.add(optimizedSrc);
        setLoaded(true);
      }}
      onError={() => setLoaded(true)}
      onClick={onClick}
    />
  );
});

OptimizedImage.displayName = 'OptimizedImage';
export default OptimizedImage;
