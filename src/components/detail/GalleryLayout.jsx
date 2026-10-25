import { getThumbUrl } from '../../lib/utils.js';

export default function GalleryLayout({ photos, T, setShowGallery, bizName }) {
  const items = (photos || []).map((photo, index) => ({
    photo, index, url: typeof photo === 'string' ? photo : photo?.url,
  })).filter(item => item.url);
  if (!items.length) return null;

  return (
    <section aria-label={`Galería de fotos de ${bizName || 'este lugar'}`} style={{ padding: '20px 20px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: T.text, letterSpacing: '-0.5px' }}>Galería de fotos</h2>
        <button
          type="button"
          aria-label={`Ver todas las fotos (${items.length})`}
          onClick={() => setShowGallery(items[0].index)}
          style={{ border: 0, background: 'transparent', padding: '8px 0 8px 12px', color: T.sub || T.text, fontFamily: 'inherit', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer' }}
        >
          Ver todas <span aria-hidden="true">›</span>
        </button>
      </div>
      <style>{`
        .business-photo-masonry { column-count: 2; column-gap: 10px; }
        .business-photo-masonry.single-photo { column-count: 1; }
        .business-photo-button {
          display: block; width: 100%; padding: 0; margin: 0 0 10px;
          border: 0; border-radius: 14px; overflow: hidden; cursor: pointer;
          background: transparent; break-inside: avoid;
        }
        .business-photo-button:focus-visible { outline: 3px solid #1A7A5E; outline-offset: 3px; }
        .business-photo-button img { display: block; width: 100%; height: auto; }
      `}</style>
      <div className={`business-photo-masonry${items.length === 1 ? ' single-photo' : ''}`}>
        {items.slice(0, 6).map(({ photo, index, url }) => (
          <button
            key={`${url}-${index}`}
            type="button"
            className="business-photo-button"
            aria-label={`Abrir foto ${index + 1} de ${bizName || 'la galería'}`}
            onClick={() => setShowGallery(index)}
          >
            <img
              src={getThumbUrl(url, items.length === 1 ? 800 : 400)}
              alt={(typeof photo === 'object' && (photo.alt || photo.label)) || `Foto ${index + 1} de ${bizName || 'este lugar'}`}
              width={photo?.width || undefined}
              height={photo?.height || undefined}
              loading={index < 2 ? 'eager' : 'lazy'}
              decoding="async"
            />
          </button>
        ))}
      </div>
    </section>
  );
}
