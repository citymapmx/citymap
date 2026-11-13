import { useRef, useEffect } from "react";
import useGMaps from "./useGMaps.js";
import { createOverlayMarker } from "../../lib/googleOverlayMarker.js";

// Pin rojo clásico de Google (gota), dibujado con OverlayView:
// google.maps.Marker se eliminó de la API weekly (v3.66) y `new Marker`
// tumbaba el selector al abrirlo.
function pinContent() {
  const div = document.createElement('div');
  div.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="44" viewBox="0 0 32 44"><path d="M16 1C8 1 1.5 7.5 1.5 15.5 1.5 27 16 43 16 43s14.5-16 14.5-27.5C30.5 7.5 24 1 16 1z" fill="#EA4335" stroke="#fff" stroke-width="1.5"/><circle cx="16" cy="15" r="5.5" fill="#fff"/></svg>`;
  return div;
}

export default function MapPicker({ onPick, onClose, initLat, initLng }) {
  const ref = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const ok = useGMaps();
  useEffect(() => {
    if (!ok || !ref.current || map.current) return;
    const lat = parseFloat(initLat) || 21.5042;
    const lng = parseFloat(initLng) || -104.8944;
    map.current = new window.google.maps.Map(ref.current, { center: { lat, lng }, zoom: 15, disableDefaultUI: true, zoomControl: true, gestureHandling: "greedy" });
    if (initLat && initLng) marker.current = createOverlayMarker(window.google, { map: map.current, position: { lat, lng }, content: pinContent() });
    map.current.addListener("click", e => {
      const lt = e.latLng.lat();
      const ln = e.latLng.lng();
      if (marker.current) marker.current.setPosition({ lat: lt, lng: ln });
      else marker.current = createOverlayMarker(window.google, { map: map.current, position: { lat: lt, lng: ln }, content: pinContent() });
      onPick(lt.toFixed(6), ln.toFixed(6));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ok]);
  return <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", flexDirection: "column" }}>
    <div style={{ padding: "14px 16px", background: "rgba(0,0,0,.8)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
      <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>Toca el mapa para marcar la ubicacion</span>
      <button onClick={onClose} style={{ background: "#1A7A5E", border: "none", borderRadius: 8, padding: "8px 14px", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>Listo</button>
    </div>
    <div ref={ref} style={{ flex: 1 }} />
  </div>;
}