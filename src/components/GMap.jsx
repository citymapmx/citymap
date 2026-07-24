import React, { useState, useEffect, useRef } from "react";
import { GMAPS_KEY } from "../lib/supabase.js";
import { CAT_EMOJI } from "../lib/utils.js";

export function useGMaps() {
  const [ok, setOk] = useState(!!window.google?.maps);
  useEffect(() => { 
    if (window.google?.maps) return; 
    const s = document.getElementById("gms") || (() => { 
      const el = document.createElement("script"); 
      el.id = "gms"; 
      el.src = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_KEY}&libraries=places,marker`; 
      el.async = true; 
      el.onload = () => setOk(true); 
      document.head.appendChild(el); 
      return el; 
    })(); 
    if (!ok) s.onload = () => setOk(true); 
  }, [ok]);
  return ok;
}

const GMap = React.memo(function GMap({ businesses, selected, onPin, userLocation, onRequestLocation, categories = [], radiusKm }) {
  const ref = useRef(); 
  const map = useRef(); 
  const pins = useRef([]); 
  const infoWin = useRef(null); 
  const userPin = useRef(null);
  const radiusCircle = useRef(null);
  const ok = useGMaps();

  // Trigger Google Maps resize whenever the container changes size (e.g. flex animations)
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(() => {
      if (map.current) {
        window.google?.maps?.event?.trigger(map.current, 'resize');
      }
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [ok]);

  useEffect(() => {
    if (!ok || !ref.current) return;

    // Init map once
    if (!map.current) {
      map.current = new window.google.maps.Map(ref.current, {
        center: { lat: 21.5042, lng: -104.8944 },
        zoom: 13,
        disableDefaultUI: true,
        zoomControl: false,
        gestureHandling: "greedy",
        styles: [
          { featureType: "poi", stylers: [{ visibility: "off" }] },
          { featureType: "poi.business", stylers: [{ visibility: "off" }] },
          { featureType: "poi.park", elementType: "labels", stylers: [{ visibility: "off" }] },
          { featureType: "transit", stylers: [{ visibility: "off" }] },
          { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
          { featureType: "administrative.neighborhood", elementType: "labels.text.fill", stylers: [{ color: "#9ca3af" }] },
          { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
          { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#f3f4f6" }] },
          { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#e5e7eb" }] },
          { featureType: "water", elementType: "geometry", stylers: [{ color: "#bfdbfe" }] },
          { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#f9fafb" }] },
          { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ color: "#f3f4f6" }] },
        ],
      });
      infoWin.current = new window.google.maps.InfoWindow();
    }

    // Clear old business markers
    pins.current.forEach(m => m.setMap(null));
    pins.current = [];

    // ── User location marker & Radius ──
    if (userPin.current) { userPin.current.setMap(null); userPin.current = null; }
    if (radiusCircle.current) { radiusCircle.current.setMap(null); radiusCircle.current = null; }

    if (userLocation?.lat && userLocation?.lng) {
      const svgUser = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r="20" fill="rgba(59,130,246,0.12)"/>
        <circle cx="22" cy="22" r="14" fill="rgba(59,130,246,0.20)"/>
        <circle cx="22" cy="22" r="9" fill="#fff"/>
        <circle cx="22" cy="22" r="6" fill="#3B82F6"/>
        <circle cx="22" cy="22" r="9" fill="none" stroke="#3B82F6" stroke-width="1.5" opacity="0.6"/>
      </svg>`;
      userPin.current = new window.google.maps.Marker({
        position: { lat: userLocation.lat, lng: userLocation.lng },
        map: map.current,
        title: "Tu ubicación",
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgUser)}`,
          scaledSize: new window.google.maps.Size(44, 44),
          anchor: new window.google.maps.Point(22, 22),
        },
        zIndex: 1000,
      });

      // Draw Radius Circle if provided and NO pin is selected
      if (radiusKm && !selected) {
        radiusCircle.current = new window.google.maps.Circle({
          strokeColor: "#3B82F6",
          strokeOpacity: 0.20,
          strokeWeight: 1.5,
          fillColor: "#3B82F6",
          fillOpacity: 0.03,
          map: map.current,
          center: { lat: userLocation.lat, lng: userLocation.lng },
          radius: radiusKm * 1000 // km to meters
        });
      }

      // Center map on user if no business is selected
      if (!selected) {
        if (radiusCircle.current) {
          // Fit bounds to circle if it exists
          map.current.fitBounds(radiusCircle.current.getBounds(), { top: 60, bottom: 60, left: 20, right: 20 });
        } else {
          map.current.panTo({ lat: userLocation.lat, lng: userLocation.lng });
          map.current.setZoom(14);
        }
      }
    }

    // Custom HTML Marker class for rich markers without mapId
    class HTMLMarker extends window.google.maps.OverlayView {
      constructor(position, content, title, zIndex, onClick) {
        super();
        this.position = position;
        this.content = content;
        this.div = document.createElement("div");
        this.div.style.position = "absolute";
        this.div.style.cursor = "pointer";
        this.div.title = title;
        this.div.style.zIndex = zIndex;
        this.div.appendChild(this.content);
        if (onClick) {
          this.div.addEventListener("click", (e) => {
            e.stopPropagation();
            onClick();
          });
        }
      }
      onAdd() {
        this.getPanes().overlayMouseTarget.appendChild(this.div);
      }
      draw() {
        const pos = this.getProjection().fromLatLngToDivPixel(this.position);
        if (pos) {
          this.div.style.left = pos.x + "px";
          this.div.style.top = pos.y + "px";
          this.div.style.transform = "translate(-50%, -50%)"; // anchor center
        }
      }
      onRemove() {
        if (this.div.parentNode) this.div.parentNode.removeChild(this.div);
      }
    }

    businesses.forEach(biz => {
      if (!biz.lat || !biz.lng) return;
      const sel = selected?.id === biz.id;
      const emoji = biz.emoji || categories.find(c => c.id === biz.category)?.icon || CAT_EMOJI[biz.category] || "📍";

      // Dispersión Automática (Jittering) basada en el ID para evitar empalmes perfectos
      const strId = String(biz.id);
      const hash = (strId.charCodeAt(0) || 0) + (strId.charCodeAt(strId.length - 1) || 0) + strId.length;
      const offsetLat = ((hash % 10) - 5) * 0.00004; // ~4 metros max offset
      const offsetLng = (((hash * 3) % 10) - 5) * 0.00004;

      const isPremiumLogo = (biz.plan === "premium" || biz.plan === "destacado" || biz.plan === "pro") && biz.logo_url;
      const size = isPremiumLogo ? (sel ? 38 : 30) : (sel ? 44 : 36);
      const content = document.createElement("div");
      content.style.width = `${size}px`;
      content.style.height = `${size}px`;
      content.style.display = "flex";
      content.style.alignItems = "center";
      content.style.justifyContent = "center";
      content.style.transition = "all 0.2s ease";

      if (isPremiumLogo) {
        content.style.borderRadius = "50%";
        content.style.boxShadow = "0 3px 6px rgba(0,0,0,0.4)";
        content.style.background = "#fff";
        content.style.border = sel ? "2px solid #3B82F6" : "1px solid #e5e7eb";
        
        const img = document.createElement("img");
        img.src = biz.logo_url;
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "contain";
        img.style.borderRadius = "50%";
        img.style.padding = "1px";
        img.style.boxSizing = "border-box";
        content.appendChild(img);
      } else {
        const emojiVal = biz.emoji || categories.find(c => c.id === biz.category)?.icon || CAT_EMOJI[biz.category] || "📍";
        const cleanEmoji = typeof emojiVal === 'string' ? emojiVal.trim() : emojiVal;
        const isImg = typeof cleanEmoji === 'string' && (cleanEmoji.toLowerCase().endsWith('.svg') || cleanEmoji.toLowerCase().endsWith('.png'));

        if (isImg) {
          const img = document.createElement("img");
          img.src = `/${cleanEmoji}`;
          img.style.width = `${sel ? 28 : 22}px`;
          img.style.height = `${sel ? 28 : 22}px`;
          img.style.objectFit = "contain";
          img.style.filter = "drop-shadow(0 3px 6px rgba(0,0,0,0.4))";
          content.appendChild(img);
        } else {
          content.innerText = cleanEmoji;
          content.style.fontSize = `${sel ? 28 : 22}px`;
          content.style.textShadow = "0 3px 6px rgba(0,0,0,0.4)";
        }
      }

      const m = new HTMLMarker(
        new window.google.maps.LatLng(parseFloat(biz.lat) + offsetLat, parseFloat(biz.lng) + offsetLng),
        content,
        biz.name,
        sel ? 999 : 1,
        () => onPin(biz)
      );
      m.setMap(map.current);
      pins.current.push(m);
    });

    // Clear previous route
    if (map.current._activeRoute) {
      map.current._activeRoute.setMap(null);
      map.current._activeRoute = null;
    }

    // Handle pin selection and route drawing
    if (selected?.lat && selected?.lng) {
      const dest = { lat: parseFloat(selected.lat), lng: parseFloat(selected.lng) };
      
      // Draw route if user location is available
      if (userLocation?.lat && userLocation?.lng) {
        const origin = { lat: userLocation.lat, lng: userLocation.lng };
        
        // Zoom to fit the route
        const bounds = new window.google.maps.LatLngBounds();
        bounds.extend(origin);
        bounds.extend(dest);
        
        // Padding para que no quede pegado a los bordes
        map.current.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });

        const reqId = Date.now();
        map.current._routeRequestId = reqId;

        try {
          const ds = new window.google.maps.DirectionsService();
          const dr = new window.google.maps.DirectionsRenderer({
            map: map.current,
            suppressMarkers: true,
            preserveViewport: true // We manually call fitBounds
          });
          
          ds.route({ origin, destination: dest, travelMode: 'DRIVING' }, (res, status) => {
            // Check if selection changed while fetching route (avoid closure capture bugs)
            if (map.current._routeRequestId !== reqId) {
              dr.setMap(null);
              return;
            }
            
            if (status === 'OK') {
              dr.setDirections(res);
              map.current._activeRoute = dr;
            } else {
              // Fallback to straight line with Google Maps blue style
              map.current._activeRoute = new window.google.maps.Polyline({
                path: [origin, dest], strokeColor: "#3B82F6", strokeOpacity: 0.9, strokeWeight: 6, map: map.current
              });
            }
          });
        } catch(e) {
          if (map.current._routeRequestId !== reqId) return;
          map.current._activeRoute = new window.google.maps.Polyline({
            path: [origin, dest], strokeColor: "#1A73E8", strokeOpacity: 0.9, strokeWeight: 6, map: map.current
          });
        }
      } else {
        // If no user location, just pan to the pin
        map.current.panTo(dest);
        map.current.setZoom(15);
      }
    }
  }, [ok, businesses, selected, userLocation]);

  if (!ok) return (
    <div style={{ width: "100%", height: "100%", background: "#F2F4F2", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
      <div style={{ width: 28, height: 28, border: "2px solid #EAF4F0", borderTop: "2px solid #1A7A5E", borderRadius: "50%", animation: "spin .9s linear infinite" }} />
      <span style={{ fontSize: 13, color: "#5A6872" }}>Cargando mapa…</span>
    </div>
  );
  
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={ref} style={{ width: "100%", height: "100%" }} />
      <div style={{
        position: "absolute",
        bottom: 30,
        right: 14,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        zIndex: 10,
      }}>
        {/* Mi Ubicación */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (onRequestLocation) onRequestLocation();
            if (userLocation?.lat && userLocation?.lng && map.current) {
              map.current.panTo({ lat: userLocation.lat, lng: userLocation.lng });
              map.current.setZoom(15);
            }
          }}
          style={{
            width: 38,
            height: 38,
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "50%",
            boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "transform 0.2s"
          }}
          title="Mi ubicación"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="2" x2="12" y2="5"></line>
            <line x1="12" y1="19" x2="12" y2="22"></line>
            <line x1="2" y1="12" x2="5" y2="12"></line>
            <line x1="19" y1="12" x2="22" y2="12"></line>
          </svg>
        </button>

        {/* Zoom Controls */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          background: "rgba(0, 0, 0, 0.65)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 20,
          boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
          overflow: "hidden"
        }}>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (map.current) map.current.setZoom(map.current.getZoom() + 1); }}
            style={{ width: 38, height: 38, background: "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.15)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s" }}
            title="Acercar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (map.current) map.current.setZoom(map.current.getZoom() - 1); }}
            style={{ width: 38, height: 38, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s" }}
            title="Alejar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
        </div>
      </div>
    </div>
  );
}, (prev, next) => {
  return (
    prev.businesses === next.businesses &&
    prev.selected?.id === next.selected?.id &&
    prev.userLocation?.lat === next.userLocation?.lat &&
    prev.userLocation?.lng === next.userLocation?.lng &&
    prev.categories === next.categories
  );
});

export default GMap;
