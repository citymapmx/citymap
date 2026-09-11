import React, { useState, useEffect, useRef } from "react";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { GMAPS_KEY } from "../lib/supabase.js";
import { CAT_EMOJI, getThumbUrl } from "../lib/utils.js";

// eslint-disable-next-line react-refresh/only-export-components
export function useGMaps() {
  const [ok, setOk] = useState(!!window.google?.maps);
  useEffect(() => { 
    if (window.google?.maps) {
      setOk(true);
      return; 
    }
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

function flyToLocation(mapInstance, lat, lng, targetZoom = 15) {
  if (!mapInstance) return;
  
  // Iniciar el paneo suave
  mapInstance.panTo({ lat, lng });
  
  const currentZoom = mapInstance.getZoom();
  if (currentZoom === targetZoom) return;

  // Zoom suave directo hacia el objetivo sin "rebotar" hacia atrás
  const smoothZoom = (targetZ, currentZ) => {
    if (currentZ === targetZ) return;
    const step = currentZ < targetZ ? 1 : -1;
    const nextZoom = currentZ + step;
    mapInstance.setZoom(nextZoom);
    setTimeout(() => smoothZoom(targetZ, nextZoom), 80);
  };

  // Esperar un poco para que el paneo inicie y luego ajustar el zoom suavemente
  setTimeout(() => smoothZoom(targetZoom, currentZoom), 200);
}

const GMap = React.memo(function GMap({ events = [], businesses, selected, onPin, userLocation, onRequestLocation, categories = [], radiusKm, utilityFilter, onBoundsChanged, showRoute = false }) {
  const ref = useRef(); 
  const map = useRef(); 
  const pins = useRef([]); 
  const markerCache = useRef(new Map());
  const clusterer = useRef(null);
  const infoWin = useRef(null); 
  const userPin = useRef(null);
  const radiusCircle = useRef(null);
  const utilityPins = useRef([]);
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
    if (!ok || !map.current) return;
    
    // Clear old utility pins
     
    utilityPins.current.forEach(m => m.setMap(null));
    utilityPins.current = [];

    if (!utilityFilter) return;

    const service = new window.google.maps.places.PlacesService(map.current);
    const request = {
      location: map.current.getCenter(),
      radius: 5000,
      type: [utilityFilter]
    };

    service.nearbySearch(request, (results, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
        results.forEach(place => {
          if (!place.geometry || !place.geometry.location) return;
          const iconStr = utilityFilter === 'gas_station' ? '⛽' : utilityFilter === 'atm' ? '🏧' : '💊';
          const marker = new window.google.maps.Marker({
            map: map.current,
            position: place.geometry.location,
            title: place.name,
            label: { text: iconStr, fontSize: "20px" },
            icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 0 }
          });
          utilityPins.current.push(marker);
        });
      }
    });
  }, [ok, utilityFilter]);

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
        tilt: 0,
        maxZoom: 18,
        minZoom: 10,
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
      
      window.google.maps.event.addListener(map.current, 'idle', () => {
        if (onBoundsChanged) {
          const bounds = map.current.getBounds();
          if (bounds) {
            const ne = bounds.getNorthEast();
            const sw = bounds.getSouthWest();
            onBoundsChanged({
              minLat: sw.lat(),
              maxLat: ne.lat(),
              minLng: sw.lng(),
              maxLng: ne.lng(),
            });
          }
        }
      });
    }

    // Clear old business markers
    if (clusterer.current) {
      clusterer.current.clearMarkers();
    }
     
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
      if (!selected && !map.current._hasCentered) {
        map.current._hasCentered = true;
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
        this.onMarkerClick = onClick;
        this.div = document.createElement("div");
        this.div.style.position = "absolute";
        this.div.style.cursor = "pointer";
        this.div.title = title;
        this.div.style.zIndex = zIndex;
        
        this.div.appendChild(this.content);
        this.div.addEventListener("click", (e) => {
          e.stopPropagation();
          if (this.onMarkerClick) this.onMarkerClick();
        });
      }
      onAdd() {
        this.getPanes().overlayMouseTarget.appendChild(this.div);
      }
      draw() {
        const pos = this.getProjection().fromLatLngToDivPixel(this.position);
        if (pos) {
          this.div.style.left = pos.x + "px";
          this.div.style.top = pos.y + "px";
          
          if (this.lastClusterPosition) {
            const oldPos = this.getProjection().fromLatLngToDivPixel(this.lastClusterPosition);
            if (oldPos) {
              const dx = oldPos.x - pos.x;
              const dy = oldPos.y - pos.y;
              // Reset transition and apply offset transform
              this.div.style.transition = "none";
              this.div.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
              
              // Force reflow
              void this.div.offsetWidth;
              
              // Animate to origin
              this.div.style.transition = "transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)";
              this.div.style.transform = "translate(-50%, -50%)";
            } else {
              this.div.style.transform = "translate(-50%, -50%)";
            }
            this.lastClusterPosition = null;
          } else if (!this.div.style.transition) {
            this.div.style.transform = "translate(-50%, -50%)";
          }
        }
      }
      onRemove() {
        if (this.div.parentNode) this.div.parentNode.removeChild(this.div);
      }
      getPosition() { return this.position; }
      getVisible() { return true; }
    }

    const newPins = [];

    businesses.forEach(biz => {
      if (!biz.lat || !biz.lng) return;
      const sel = selected?.id === biz.id;
      const cacheKey = "pin_" + biz.id;

      let m = markerCache.current.get(cacheKey);

      if (!m) {
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
          content.style.position = "relative";
          
          const spinner = document.createElement("div");
          spinner.style.position = "absolute";
          spinner.style.inset = "0";
          spinner.style.display = "flex";
          spinner.style.alignItems = "center";
          spinner.style.justifyContent = "center";
          spinner.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="3" stroke-linecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/></path></svg>`;
          content.appendChild(spinner);
          
          const img = document.createElement("img");
          img.src = getThumbUrl(biz.logo_url, 100, 100);
          img.style.width = "100%";
          img.style.height = "100%";
          img.style.objectFit = "cover";
          img.style.borderRadius = "50%";
          img.style.padding = "1px";
          img.style.boxSizing = "border-box";
          img.style.opacity = "0"; // oculto hasta que cargue
          img.style.transition = "opacity 0.2s";
          
          img.onload = () => {
            if (spinner.parentNode) spinner.parentNode.removeChild(spinner);
            img.style.opacity = "1";
          };
          
          img.onerror = () => {
            if (spinner.parentNode) spinner.parentNode.removeChild(spinner);
            img.style.display = "none";
            const fallback = document.createElement("div");
            fallback.innerText = "📍";
            fallback.style.fontSize = "16px";
            fallback.style.lineHeight = "1";
            content.appendChild(fallback);
          };
          
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

        // 2. Animación de rebote (pulse) para los eventos del día
        const isEvent = biz.type === 'event' || biz.category === 'eventos' || biz.event_category;
        if (isEvent && biz.date) {
          try {
            const nowStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            if (biz.date === nowStr || biz.date <= nowStr && (biz.end_date && biz.end_date >= nowStr)) {
              content.classList.add("gmap-event-pulse");
            }
          } catch (e) { console.error(e); }
        }

        m = new HTMLMarker(
          new window.google.maps.LatLng(parseFloat(biz.lat) + offsetLat, parseFloat(biz.lng) + offsetLng),
          content,
          biz.name,
          sel ? 999 : 1,
          () => onPin(biz)
        );
        markerCache.current.set(cacheKey, m);
      } else {
        // Asegurar que el zIndex se mantiene correcto aunque reciclemos
        m.div.style.zIndex = sel ? 999 : 1;
        // Solo para estar seguros de llamar a la última función onPin
        m.onMarkerClick = () => onPin(biz);
        m.div.onclick = null; // Clean up old double-firing listener if any
      }
      
      newPins.push(m);
    });

    // RENDER EVENTS (UP TO 3 DAYS IN ADVANCE)
    const todayObj = new Date();
    todayObj.setHours(0,0,0,0);
    
    events.forEach(ev => {
      if (!ev.lat || !ev.lng || !ev.date) return;
      
      const evDate = new Date(ev.date + "T00:00:00");
      const diffTime = evDate - todayObj;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Only show if it is today, or up to 4 days in the future
      if (diffDays < 0 || diffDays > 4) return;
      const cacheKey = "event_" + ev.id;
      let m = markerCache.current.get(cacheKey);

      if (!m) {
        const size = 46;
        const content = document.createElement("div");
        content.style.width = `${size}px`;
        content.style.height = `${size}px`;
        content.style.display = "flex";
        content.style.alignItems = "center";
        content.style.justifyContent = "center";
        content.style.transition = "all 0.2s ease";
        content.style.borderRadius = "50%";
        content.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.6)";
        content.style.background = "#000";
        content.style.border = "3px solid #fff";
        content.style.position = "relative";
        content.style.zIndex = "999";
        content.className = "party-pin";
        
        // El emoji de fiesta
        const eDiv = document.createElement("div");
        eDiv.textContent = "🎉";
        eDiv.style.fontSize = "22px";
        eDiv.style.lineHeight = "1";
        eDiv.style.transform = "translateY(-1px)";
        content.appendChild(eDiv);

        content.addEventListener("click", () => {
          if (onPin) onPin({ ...ev, _isEvent: true });
        });

        m = new HTMLMarker(new window.google.maps.LatLng(ev.lat, ev.lng), content);
        markerCache.current.set(cacheKey, m);
      }
      
      // Update active state based on selected
      const sel = selected?.id === ev.id;
      m.content.style.border = sel ? "4px solid #FCD34D" : "3px solid #fff";
      m.content.style.transform = sel ? "scale(1.15)" : "scale(1)";

      if (m.getMap() !== map.current) m.setMap(map.current);
      newPins.push(m);
    });
    
    const oldPinsSet = new Set(pins.current || []);
    const newPinsSet = new Set(newPins);
    
    const pinsToAdd = newPins.filter(p => !oldPinsSet.has(p));
    const pinsToRemove = (pins.current || []).filter(p => !newPinsSet.has(p));

    pins.current = newPins;

    // 3. Inicializar el MarkerClusterer oficial
    const renderer = {
      render: (cluster, stats, map) => {
        if (cluster.markers) {
          cluster.markers.forEach(m => {
            m.lastClusterPosition = cluster.position;
          });
        }
        
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
        content.style.border = "none";
        content.style.backdropFilter = "blur(4px)";
        content.style.WebkitBackdropFilter = "blur(4px)";
        content.style.boxShadow = "0 4px 12px rgba(0,0,0,0.25)";
        content.innerText = String(cluster.count);

        return new HTMLMarker(cluster.position, content, `${cluster.count} lugares`, 100, () => {
          if (cluster.bounds) map.fitBounds(cluster.bounds, { padding: 50 });
        });
      }
    };

    if (clusterer.current) {
      clusterer.current.renderer = renderer;
      if (pinsToRemove.length > 0) {
        clusterer.current.removeMarkers(pinsToRemove, true);
      }
      if (pinsToAdd.length > 0) {
        clusterer.current.addMarkers(pinsToAdd, false);
      } else if (pinsToRemove.length > 0) {
        clusterer.current.render();
      }
    } else {
      clusterer.current = new MarkerClusterer({
        map: map.current,
        markers: pins.current,
        renderer: renderer
      });
    }

    // Clear previous route
    if (map.current._activeRoute) {
      map.current._activeRoute.setMap(null);
      map.current._activeRoute = null;
    }

    // Handle pin selection and route drawing
    if (selected?.lat && selected?.lng) {
      const dest = { lat: parseFloat(selected.lat), lng: parseFloat(selected.lng) };

      if (showRoute && userLocation?.lat && userLocation?.lng && window.google?.maps) {
        // Draw a driving route in fullscreen mode
        const directionsService = new window.google.maps.DirectionsService();
        const directionsRenderer = new window.google.maps.DirectionsRenderer({
          suppressMarkers: true,
          polylineOptions: {
            strokeColor: "#6366F1",
            strokeWeight: 5,
            strokeOpacity: 0.85,
          },
        });
        directionsRenderer.setMap(map.current);
        map.current._activeRoute = directionsRenderer;

        directionsService.route(
          {
            origin: { lat: userLocation.lat, lng: userLocation.lng },
            destination: dest,
            travelMode: window.google.maps.TravelMode.DRIVING,
          },
          (result, status) => {
            if (status === "OK") {
              directionsRenderer.setDirections(result);
            } else {
              // Fallback: just pan if route fails
              flyToLocation(map.current, dest.lat, dest.lng, 15);
            }
          }
        );
      } else {
        // Mini map mode: just pan to the pin without drawing a route
        flyToLocation(map.current, dest.lat, dest.lng, 15);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ok, businesses, selected, userLocation, showRoute]);

  if (!ok) return (
    <div style={{ width: "100%", height: "100%", background: "#F2F4F2", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
      <div style={{ width: 28, height: 28, border: "2px solid #EAF4F0", borderTop: "2px solid #1A7A5E", borderRadius: "50%", animation: "spin .9s linear infinite" }} />
      <span style={{ fontSize: 13, color: "#5A6872" }}>Cargando mapa…</span>
    </div>
  );
  
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <style>{`
        @keyframes gmapBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .gmap-event-pulse {
          animation: gmapBounce 1s infinite ease-in-out;
        }
      `}</style>
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
          className="press"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (onRequestLocation) onRequestLocation();
            if (userLocation?.lat && userLocation?.lng && map.current) {
              flyToLocation(map.current, userLocation.lat, userLocation.lng, 15);
            }
          }}
          style={{
            width: 42,
            height: 42,
            background: "rgba(255, 255, 255, 0.9)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: 14,
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "transform 0.2s"
          }}
          title="Mi ubicación"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1f2937" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
          background: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 14,
          boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
          overflow: "hidden"
        }}>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (map.current) map.current.setZoom(map.current.getZoom() + 1); }}
            style={{ width: 42, height: 42, background: "transparent", border: "none", borderBottom: "1px solid rgba(0,0,0,0.08)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            title="Acercar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1f2937" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (map.current) map.current.setZoom(map.current.getZoom() - 1); }}
            style={{ width: 42, height: 42, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            title="Alejar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1f2937" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
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
    prev.categories === next.categories &&
    prev.utilityFilter === next.utilityFilter
  );
});

export default GMap;
