import React from "react";
import OptimizedImage from "../ui/OptimizedImage.jsx";

export default function GalleryLayout({ photos, T, setShowGallery, bizName }) {
  if (!photos || photos.length === 0) return null;

  return (
    <div style={{ position: "relative", width: "100%", paddingBottom: "75%", cursor: "pointer", background: T.border, borderRadius: "16px 16px 0 0", overflow: "hidden" }} onClick={() => setShowGallery(true)}>
      {photos.length === 1 && (
        <OptimizedImage src={photos[0]} alt={bizName} style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover" }} />
      )}
      {photos.length === 2 && (
        <div style={{ position: "absolute", inset: 0, display: "flex", gap: 2 }}>
          <OptimizedImage src={photos[0]} alt={bizName} style={{ flex: 1, width: "50%", height: "100%", objectFit: "cover" }} />
          <OptimizedImage src={photos[1]} alt={bizName} style={{ flex: 1, width: "50%", height: "100%", objectFit: "cover" }} />
        </div>
      )}
      {photos.length === 3 && (
        <div style={{ position: "absolute", inset: 0, display: "flex", gap: 2 }}>
          <OptimizedImage src={photos[0]} alt={bizName} style={{ flex: 2, width: "66.66%", height: "100%", objectFit: "cover" }} />
          <div style={{ flex: 1, width: "33.33%", display: "flex", flexDirection: "column", gap: 2 }}>
            <OptimizedImage src={photos[1]} alt={bizName} style={{ flex: 1, width: "100%", height: "50%", objectFit: "cover" }} />
            <OptimizedImage src={photos[2]} alt={bizName} style={{ flex: 1, width: "100%", height: "50%", objectFit: "cover" }} />
          </div>
        </div>
      )}
      {photos.length >= 4 && (
        <div style={{ position: "absolute", inset: 0, display: "flex", gap: 2 }}>
          <OptimizedImage src={photos[0]} alt={bizName} style={{ flex: 2, width: "66.66%", height: "100%", objectFit: "cover" }} />
          <div style={{ flex: 1, width: "33.33%", display: "flex", flexDirection: "column", gap: 2 }}>
            <OptimizedImage src={photos[1]} alt={bizName} style={{ flex: 1, width: "100%", height: "33.33%", objectFit: "cover" }} />
            <OptimizedImage src={photos[2]} alt={bizName} style={{ flex: 1, width: "100%", height: "33.33%", objectFit: "cover" }} />
            <div style={{ flex: 1, width: "100%", height: "33.33%", position: "relative" }}>
              <OptimizedImage src={photos[3]} alt={bizName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              {photos.length > 4 && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 16 }}>
                  +{photos.length - 4}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
