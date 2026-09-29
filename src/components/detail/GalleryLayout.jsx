import React from "react";
import { getThumbUrl } from "../../lib/utils.js";

export default function GalleryLayout({ photos, T, setShowGallery, bizName }) {
  if (!photos || photos.length === 0) return null;

  return (
    <div style={{ padding: "20px 0 0", position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, padding: "0 20px" }}>
        <div className="text-base" style={{ fontWeight: 800, color: T.text, letterSpacing: "-0.5px" }}>Galería de fotos</div>
      </div>

      <style>{`
        .mosaic-gallery {
          display: grid;
          gap: 12px;
          padding: 0 20px;
        }
        .mosaic-gallery.count-1 {
          grid-template-columns: 1fr;
        }
        .mosaic-gallery.count-2 {
          grid-template-columns: 1fr 1fr;
        }
        .mosaic-gallery.count-more {
          grid-template-columns: 1fr 1fr;
        }
        .mosaic-item {
          border-radius: 16px;
          overflow: hidden;
          background: ${T.border};
          cursor: pointer;
          position: relative;
          box-shadow: 0 4px 12px rgba(0,0,0,0.06);
          transition: transform 0.2s, box-shadow 0.2s;
          aspect-ratio: 4/3;
        }
        .mosaic-item:active {
          transform: scale(0.97);
        }
        .mosaic-item-lead {
          grid-column: 1 / -1;
          aspect-ratio: 2/1;
        }
        .mosaic-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
      `}</style>

      <div className={`mosaic-gallery ${photos.length === 1 ? 'count-1' : photos.length === 2 ? 'count-2' : 'count-more'}`}>
        {photos.slice(0, 3).map((photo, index) => {
          const isLead = photos.length >= 3 && index === 0;
          const isLastVisible = photos.length > 3 && index === 2;
          const photoUrl = typeof photo === 'string' ? photo : photo?.url;

          return (
            <div
              key={index}
              className={`mosaic-item ${isLead ? 'mosaic-item-lead' : ''}`}
              onClick={() => setShowGallery(index)}
            >
              <img
                src={getThumbUrl(photoUrl, isLead ? 1200 : 600, isLead ? 600 : 600)}
                className="mosaic-img"
                alt={`Foto ${index + 1} de ${bizName || "galería"}`}
                loading="lazy"
              />
              {isLastVisible && (
                <div className="text-xl" style={{ position: "absolute", inset: 0, background: "rgba(0, 0, 0, 0.4)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800 }}>
                  +{photos.length - 3}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
