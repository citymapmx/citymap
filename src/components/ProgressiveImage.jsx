import { useState } from 'react';
import { m } from "framer-motion";

const globalLoadedImages = new Set();

// Placeholder de color mientras carga la foto real (hallazgo #7, nov
// 2026): antes cada tarjeta pedía además un thumb de 20×20 al Render
// API solo para el desenfoque — una petición extra por tarjeta (con 20
// tarjetas, 40 peticiones de imagen en la primera tanda). Ahora el
// fondo de color/gradiente hace de placeholder y la foto real aparece
// con un fundido suave al cargar. Sin thumb: la mitad de peticiones,
// mismo aspecto.
export default function ProgressiveImage({
  src,
  alt,
  style = {},
  className = "",
  variants,
  transition,
  // srcset del mismo patrón que OptimizedImage: cadena ya construida con
  // getThumbSrcSet (el candidato mayor nunca supera el ancho de `src`) y
  // sizes con el ancho en pantalla del hueco. Solo va en la imagen real.
  srcSet = undefined,
  sizes = undefined,
  // Fondo del placeholder mientras carga (CSS background). El llamador
  // lo pasa según el tema (claro/oscuro); el valor por defecto es un
  // gris claro neutro.
  placeholder = 'linear-gradient(135deg, #EDEFF2 0%, #E2E6EB 100%)',
  ...props
}) {
  const [isLoaded, setIsLoaded] = useState(() => globalLoadedImages.has(src));

  return (
    <m.div
      className={className}
      variants={variants}
      transition={transition}
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: placeholder,
        ...style
      }}
      {...props}
    >
      {/* Actual High Res Image: aparece con fundido sobre el placeholder */}
      <img
        src={src}
        alt={alt}
        srcSet={srcSet}
        sizes={sizes}
        loading="lazy"
        onLoad={() => {
          globalLoadedImages.add(src);
          setIsLoaded(true);
        }}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: style.objectFit || 'cover',
          objectPosition: style.objectPosition || 'center',
          backgroundColor: 'transparent',
          opacity: isLoaded ? 1 : 0,
          transition: isLoaded ? 'none' : 'opacity 0.25s ease-out'
        }}
      />
    </m.div>
  );
}
