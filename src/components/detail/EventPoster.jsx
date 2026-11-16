import { useState } from 'react';
import { getThumbUrl } from '../../lib/utils';

// Both uncropped layers share the same grid cell and their natural proportions.
export default function EventPoster({ src, alt = '', dark = false }) {
  const previewSrc = getThumbUrl(src, 400);
  const optimizedSrc = getThumbUrl(src, 1200);
  const [useOriginal, setUseOriginal] = useState(false);
  const [loadedSrc, setLoadedSrc] = useState(null);
  const detailSrc = useOriginal ? src : optimizedSrc;
  const ready = loadedSrc === detailSrc;
  const hasPreview = previewSrc !== detailSrc;
  // La imagen ya cargó y su alto natural manda: la reserva de 360 px se
  // suelta y el contenedor se ciñe al póster. La vista previa (400 px)
  // tiene las mismas proporciones que el detalle, así que su onLoad ya
  // alcanza para soltarla; el onLoad del detalle cubre el caso sin vista
  // previa. Sin soltarla, los pósters apaisados (~220 px de alto en
  // teléfono) dejaban una banda gris vacía debajo de la imagen.
  const [sized, setSized] = useState(false);
  const imageStyle = {
    gridArea: '1 / 1', alignSelf: 'start', width: '100%', height: 'auto',
    display: 'block',
    // En oscuro, los pósters de fondo blanco deslumbran: se atenúan un poco.
    filter: dark ? 'brightness(0.85)' : 'none',
  };

  return (
    // El póster reserva su espacio desde el primer pintado (minHeight +
    // fondo): sin él el contenedor medía ~0 hasta que cargaba la imagen
    // y al llegar empujaba todo hacia abajo de golpe — al entrar al
    // evento primero se veía la información y luego el salto a la
    // imagen. 360 px es el punto medio medido en 15 pósters próximos
    // (verticales ~487 px, cuadrados ~390, apaisados ~220-340 en
    // teléfono). La reserva solo vive mientras carga: en cuanto la
    // imagen llega, minHeight baja a 0 con una transición suave y el
    // contenedor se ciñe al alto natural del póster, sin banda gris
    // debajo y sin salto brusco.
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', width: '100%', overflow: 'hidden', minHeight: sized ? 0 : 360, transition: 'min-height 300ms ease', background: dark ? '#232326' : '#E5E7EB' }}>
      {hasPreview && (
        <img
          src={previewSrc}
          alt=""
          aria-hidden="true"
          loading="eager"
          decoding="async"
          onLoad={() => setSized(true)}
          style={imageStyle}
        />
      )}
      <img
        src={detailSrc}
        alt={alt}
        loading="eager"
        fetchPriority="high"
        decoding="async"
        onLoad={async (event) => {
          const image = event.currentTarget;
          // Keep the preview painted until the browser can display the detail.
          try { await image.decode(); } catch { /* Loaded images can still be displayed. */ }
          if (image.isConnected) setLoadedSrc(detailSrc);
          setSized(true);
        }}
        onError={() => {
          if (detailSrc !== src) setUseOriginal(true);
        }}
        style={{ ...imageStyle, opacity: hasPreview && !ready ? 0 : 1 }}
      />
    </div>
  );
}
