import { Suspense, lazy } from 'react';
import Icon from './ui/Icon.jsx';
import { useUIStore } from '../store/useUIStore.js';
import { useShallow } from 'zustand/react/shallow';
import { parseMenuUrls } from '../lib/utils.js';

const Gallery = lazy(() => import('./Gallery.jsx'));

export default function GalleryModals() {
  const { selected, selectedEvent, showGallery, setShowGallery, showMenuGallery, setShowMenuGallery } = useUIStore(useShallow(s => ({ selected: s.selected, selectedEvent: s.selectedEvent, showGallery: s.showGallery, setShowGallery: s.setShowGallery, showMenuGallery: s.showMenuGallery, setShowMenuGallery: s.setShowMenuGallery })));

  return (
    <>
      {/* Fullscreen Gallery Modal */}
      {showGallery !== false && (selected || selectedEvent) && (() => {
        const galleryPhotos = selectedEvent && (selectedEvent.img_url || selectedEvent.img) ? [{ url: selectedEvent.img_url || selectedEvent.img, label: "Evento" }] : (selected?.photos?.length > 1 ? selected.photos.slice(1) : selected?.photos || []);
        if (galleryPhotos.length === 0) return null;
        const initialIdx = typeof showGallery === "number" ? showGallery : 0;
        return <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999, background: "#000000", display: "flex", flexDirection: "column" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "16px 20px", display: "flex", justifyContent: "flex-start", zIndex: 10 }}>
            <button className="press" onClick={() => setShowGallery(false)} style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", marginTop: 20 }}><Icon name="x" size={24} color="#fff" /></button>
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", width: "100%" }}>
             <Suspense fallback={<div style={{height: "100dvh", width: "100%", background: "#000"}}/>}>
               <Gallery photos={galleryPhotos} h="100dvh" fit="contain" bg="transparent" initialIndex={initialIdx} />
             </Suspense>
          </div>
        </div>;
      })()}

      {/* Fullscreen Menu Gallery Modal */}
      {showMenuGallery && selected && (() => {
        const menuUrls = parseMenuUrls(selected.menu_pdf_url).map((u, i) => ({ url: u, label: `Página ${i+1}` }));
        if (menuUrls.length === 0) return null;
        return <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999, background: "#000000", display: "flex", flexDirection: "column" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "16px 20px", display: "flex", justifyContent: "flex-start", zIndex: 10 }}>
            <button className="press" onClick={() => setShowMenuGallery(false)} style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", marginTop: 20 }}><Icon name="x" size={24} color="#fff" /></button>
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", width: "100%" }}>
             <Suspense fallback={<div style={{height: "100dvh", width: "100%", background: "#000"}}/>}>
               <Gallery photos={menuUrls} h="100dvh" fit="contain" bg="transparent" />
             </Suspense>
          </div>
        </div>;
      })()}
    </>
  );
}
