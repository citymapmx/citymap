import { useRef, useEffect } from "react";
import useGMaps from "./useGMaps.js";

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
    if (initLat && initLng) marker.current = new window.google.maps.Marker({ position: { lat, lng }, map: map.current });
    map.current.addListener("click", e => {
      const lt = e.latLng.lat();
      const ln = e.latLng.lng();
      if (marker.current) marker.current.setPosition({ lat: lt, lng: ln });
      else marker.current = new window.google.maps.Marker({ position: { lat: lt, lng: ln }, map: map.current });
      onPick(lt.toFixed(6), ln.toFixed(6));
    });
  }, [ok]);
  return <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", flexDirection: "column" }}>
    <div style={{ padding: "14px 16px", background: "rgba(0,0,0,.8)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
      <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>Toca el mapa para marcar la ubicacion</span>
      <button onClick={onClose} style={{ background: "#1A7A5E", border: "none", borderRadius: 8, padding: "8px 14px", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>Listo</button>
    </div>
    <div ref={ref} style={{ flex: 1 }} />
  </div>;
}