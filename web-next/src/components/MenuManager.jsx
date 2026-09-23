import { parseMenuUrls } from "../lib/utils.js";
import Uploader from "./Uploader.jsx";
import Icon from "./ui/Icon.jsx";
import { getThumbUrl } from "../lib/utils.js";

export default function MenuManager({ menuPdfUrl, onChange }) {
  const MAX_MENU_IMAGES = 5;
  const urls = parseMenuUrls(menuPdfUrl);
  const isSinglePdf = urls.length === 1 && urls[0].toLowerCase().includes(".pdf");

  const handleAdd = (url) => {
    if (isSinglePdf || url.toLowerCase().includes(".pdf")) {
      onChange(url);
    } else {
      if (urls.length >= MAX_MENU_IMAGES) return;
      const newUrls = [...urls, url];
      onChange(JSON.stringify(newUrls));
    }
  };

  const handleRemove = (index) => {
    if (urls.length === 1) {
      onChange(null);
    } else {
      const newUrls = [...urls];
      newUrls.splice(index, 1);
      onChange(JSON.stringify(newUrls));
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {urls.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .6 }}>
            {isSinglePdf ? "1 archivo PDF" : `${urls.length}/${MAX_MENU_IMAGES} imágenes`}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 10 }}>
            {urls.map((u, i) => {
              const isPdf = u.toLowerCase().includes(".pdf");
              return (
                <div key={i} style={{ position: "relative", height: 100, borderRadius: 10, overflow: "hidden", background: "#EAF4F0", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #1A7A5E" }}>
                  {isPdf ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: 10 }}>
                      <Icon name="file" size={24} color="#1A7A5E" />
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#1A7A5E", textAlign: "center" }}>Menú PDF</span>
                    </div>
                  ) : (
                    <img src={getThumbUrl(u, 300, 300)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  )}
                  <button
                    onClick={(e) => { e.preventDefault(); handleRemove(i); }}
                    style={{ position: "absolute", top: 4, right: 4, width: 24, height: 24, borderRadius: "50%", background: "rgba(255,255,255,0.9)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }}
                  >
                    <Icon name="trash" size={12} color="#D94F3D" />
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
      
      {(!isSinglePdf && urls.length < MAX_MENU_IMAGES) && (
        <Uploader 
          label={urls.length > 0 ? `Añadir página al menú (${MAX_MENU_IMAGES - urls.length} restantes)` : "Subir menú (Fotos o 1 PDF)"} 
          accept="image/*,.pdf,application/pdf" 
          onDone={handleAdd} 
        />
      )}
    </div>
  );
}
