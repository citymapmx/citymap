import React, { memo } from 'react';
import { getThumbUrl } from '../../lib/utils';

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
  priority = false, 
  className, 
  style,
  onClick 
}) => {
  if (!src) return null;

  // Process the URL using the bucketed width logic
  const optimizedSrc = getThumbUrl(src, widthRequest);

  return (
    <img 
      src={optimizedSrc} 
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      fetchpriority={priority ? "high" : "auto"}
      className={className}
      style={style}
      onClick={onClick}
    />
  );
});

// Setting display name for debugging purposes
OptimizedImage.displayName = 'OptimizedImage';

export default OptimizedImage;
