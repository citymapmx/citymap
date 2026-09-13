'use client';

import React, { useState, useEffect, useRef } from "react";
import { MarkerClusterer } from "@googlemaps/markerclusterer";

const GMAPS_KEY = process.env.NEXT_PUBLIC_GMAPS_KEY || "AIzaSyD_fPxRqRJe6r9BiBsTZBj2K_KZnrhIf4M";

export const CAT_EMOJI = {
  restaurantes: "🍽️", cafe: "☕", cafeteria: "☕", cafeterias: "☕",
  salud: "🏥", belleza: "💅", fitness: "💪", gimnasios: "💪",
  compras: "🛍️", tiendas: "🛍️", tech: "💻", ocio: "🎭",
  hoteles: "🏨", hospedaje: "🏨", educacion: "📚", servicios: "🔧",
  bares: "🍻", "antros-y-bares": "🍻", lugar: "📍", evento: "📅"
};

export function getThumbUrl(url, w, h) {
  if (!url) return "";
  if (url.includes('googleusercontent.com') || url.includes('citymap.mx/og-image') || url.includes('data:image')) return url;
  if (url.includes("res.cloudinary.com")) {
    const parts = url.split("/upload/");
    return parts.length === 2 ? `${parts[0]}/upload/c_fill,w_${w},h_${h},q_auto,f_auto/${parts[1]}` : url;
  }
  return url;
}

export function useGMaps() {
  const [ok, setOk] = useState(false);
  useEffect(() => { 
    if (window.google?.maps) { setOk(true); return; }
    const s = document.getElementById("gms") || (() => { 
      const el = document.createElement("script"); 
      el.id = "gms"; 
      el.src = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_KEY}&libraries=places`; 
      el.async = true; 
      document.head.appendChild(el); 
      return el; 
    })(); 
    const onLoad = () => setOk(true);
    s.addEventListener("load", onLoad);
    if (window.google?.maps) setOk(true);
    return () => s.removeEventListener("load", onLoad);
  }, []);
  return ok;
}

function flyToLocation(map, lat, lng, zoom = 14) {
  map.panTo({ lat, lng });
  map.setZoom(zoom);
}

class HTMLMarker {
  constructor(position, content, title, zIndex, onClick) {
    this.position = position;
    this.content = content;
    this.title = title;
    this.zIndex = zIndex;
    this.onClick = onClick;
  }
}

const GMap = React.memo(({ businesses, selected, onBoundsChanged, onMarkerClick, onRequestLocation, userLocation, categories = [], utilityFilter = null, showRoute = false }) => {
  const ok = useGMaps();
  const ref = useRef(null);
  const map = useRef(null);
  const clusterer = useRef(null);
  const pins = useRef([]);

  useEffect(() => {
    if (!ok || !ref.current) return;
    if (!map.current) {
      map.current = new window.google.maps.Map(ref.current, {
        center: { lat: 21.5033, lng: -104.8947 }, // Default Tepic
        zoom: 13,
        disableDefaultUI: true,
        styles: [
          { elementType: "geometry", stylers: [{ color: "#F5F5F5" }] },
          { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
          { elementType: "labels.text.fill", stylers: [{ color: "#2d3748" }] },
          { featureType: "water", elementType: "geometry", stylers: [{ color: "#BEE3F8" }] },
          { featureType: "poi.business", stylers: [{ visibility: "off" }] }
        ]
      });

      map.current.addListener("idle", () => {
        if (onBoundsChanged && map.current) {
          const b = map.current.getBounds();
          if (b) onBoundsChanged({
            minLat: b.getSouthWest().lat(),
            maxLat: b.getNorthEast().lat(),
            minLng: b.getSouthWest().lng(),
            maxLng: b.getNorthEast().lng(),
            center: map.current.getCenter().toJSON(),
            zoom: map.current.getZoom()
          });
        }
      });
    }

    const AdvancedMarkerElement = window.google.maps.marker.AdvancedMarkerElement || window.google.maps.Marker;

    // Filter businesses locally just in case
    let toShow = businesses || [];
    if (categories.length > 0) toShow = toShow.filter(b => categories.includes(b.category));

    // Update pins
    const newPinsSet = new Set();
    const pinsToAdd = [];

    toShow.forEach(b => {
      const existing = pins.current.find(p => p.bizId === b.id);
      if (existing) {
        newPinsSet.add(existing);
      } else if (b.lat && b.lng && !b.hide_location) {
        const div = document.createElement("div");
        div.className = b.is_place === false ? "gmap-event-pulse" : "";
        div.style.width = "32px";
        div.style.height = "32px";
        div.style.backgroundColor = selected?.id === b.id ? "#1A7A5E" : "#ffffff";
        div.style.border = selected?.id === b.id ? "2px solid #ffffff" : "1.5px solid #1A7A5E";
        div.style.borderRadius = "50%";
        div.style.display = "flex";
        div.style.alignItems = "center";
        div.style.justifyContent = "center";
        div.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
        div.style.fontSize = "16px";
        div.style.cursor = "pointer";
        div.style.transition = "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)";
        div.style.zIndex = selected?.id === b.id ? "100" : "1";
        
        let emoji = b.emoji || CAT_EMOJI[b.category] || "📍";
        
        div.innerHTML = `<span style="transform: ${selected?.id === b.id ? 'scale(1.2)' : 'scale(1)'}">${emoji}</span>`;
        
        const m = new AdvancedMarkerElement({
          position: { lat: parseFloat(b.lat), lng: parseFloat(b.lng) },
          content: div,
          title: b.name
        });
        m.bizId = b.id;
        
        m.addListener("click", () => {
          if (onMarkerClick) onMarkerClick(b);
        });

        pinsToAdd.push(m);
        newPinsSet.add(m);
      }
    });

    const newPins = Array.from(newPinsSet).concat(pinsToAdd);
    const pinsToRemove = (pins.current || []).filter(p => !newPinsSet.has(p));
    pins.current = newPins;

    const renderer = {
      render: (cluster, stats, map) => {
        const content = document.createElement("div");
        content.style.width = "30px";
        content.style.height = "30px";
        content.style.backgroundColor = "rgba(15, 23, 42, 0.85)"; 
        content.style.color = "#fff";
        content.style.borderRadius = "50%";
        content.style.display = "flex";
        content.style.alignItems = "center";
        content.style.justifyContent = "center";
        content.style.fontSize = "13px";
        content.style.fontWeight = "800";
        content.style.boxShadow = "0 4px 12px rgba(0,0,0,0.25)";
        content.innerText = String(cluster.count);

        const m = new AdvancedMarkerElement({
          position: cluster.position,
          content: content,
          zIndex: 100
        });
        m.addListener('click', () => {
           if (cluster.bounds) map.fitBounds(cluster.bounds, { padding: 50 });
        });
        return m;
      }
    };

    if (clusterer.current) {
      clusterer.current.renderer = renderer;
      if (pinsToRemove.length > 0) clusterer.current.removeMarkers(pinsToRemove, true);
      if (pinsToAdd.length > 0) clusterer.current.addMarkers(pinsToAdd, false);
      else if (pinsToRemove.length > 0) clusterer.current.render();
    } else {
      clusterer.current = new MarkerClusterer({
        map: map.current,
        markers: pins.current,
        renderer: renderer
      });
    }

    if (selected?.lat && selected?.lng && !showRoute) {
      flyToLocation(map.current, parseFloat(selected.lat), parseFloat(selected.lng), 15);
    }
  }, [ok, businesses, selected, userLocation, showRoute, categories, onBoundsChanged, onMarkerClick]);

  if (!ok) return (
    <div style={{ width: "100%", height: "100%", background: "#F2F4F2", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
      <div style={{ width: 28, height: 28, border: "2px solid #EAF4F0", borderTop: "2px solid #1A7A5E", borderRadius: "50%", animation: "spin .9s linear infinite" }} />
      <span style={{ fontSize: 13, color: "#5A6872" }}>Cargando mapa…</span>
    </div>
  );
  
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={ref} style={{ width: "100%", height: "100%" }} />
      <div style={{ position: "absolute", bottom: 30, right: 14, display: "flex", flexDirection: "column", gap: 10, zIndex: 10 }}>
        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (onRequestLocation) onRequestLocation(); }} style={{ width: 42, height: 42, background: "rgba(255, 255, 255, 0.9)", backdropFilter: "blur(12px)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 14, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Mi ubicación">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1f2937" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="2" x2="12" y2="5"></line><line x1="12" y1="19" x2="12" y2="22"></line><line x1="2" y1="12" x2="5" y2="12"></line><line x1="19" y1="12" x2="22" y2="12"></line></svg>
        </button>
        <div style={{ display: "flex", flexDirection: "column", background: "rgba(255, 255, 255, 0.9)", backdropFilter: "blur(12px)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 14, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", overflow: "hidden" }}>
          <button onClick={() => map.current && map.current.setZoom(map.current.getZoom() + 1)} style={{ width: 42, height: 42, background: "transparent", border: "none", borderBottom: "1px solid rgba(0,0,0,0.08)", cursor: "pointer" }}><svg style={{margin:'auto'}} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1f2937" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></button>
          <button onClick={() => map.current && map.current.setZoom(map.current.getZoom() - 1)} style={{ width: 42, height: 42, background: "transparent", border: "none", cursor: "pointer" }}><svg style={{margin:'auto'}} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1f2937" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg></button>
        </div>
      </div>
    </div>
  );
});

export default GMap;
