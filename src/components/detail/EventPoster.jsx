import { useState } from 'react';
import { getThumbUrl } from '../../lib/utils';

// Both uncropped layers share the same grid cell and their natural proportions.
export default function EventPoster({ src, alt = '' }) {
  const previewSrc = getThumbUrl(src, 400);
  const optimizedSrc = getThumbUrl(src, 800);
  const [useOriginal, setUseOriginal] = useState(false);
  const [loadedSrc, setLoadedSrc] = useState(null);
  const detailSrc = useOriginal ? src : optimizedSrc;
  const ready = loadedSrc === detailSrc;
  const hasPreview = previewSrc !== detailSrc;
  const imageStyle = {
    gridArea: '1 / 1', alignSelf: 'start', width: '100%', height: 'auto',
    display: 'block',
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', width: '100%', overflow: 'hidden' }}>
      {hasPreview && (
        <img
          src={previewSrc}
          alt=""
          aria-hidden="true"
          loading="eager"
          decoding="async"
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
        }}
        onError={() => {
          if (detailSrc !== src) setUseOriginal(true);
        }}
        style={{ ...imageStyle, opacity: hasPreview && !ready ? 0 : 1 }}
      />
    </div>
  );
}
