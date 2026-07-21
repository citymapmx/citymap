import { useState, useCallback } from 'react';

export function useGeolocation({ toast$, cities, mapPins, setActiveCity }) {
  const [city, setCity] = useState(() => localStorage.getItem("cg_city_name") || "Tepic, Nayarit");
  const [locating, setLocating] = useState(false);
  const [userCoords, setUserCoords] = useState(() => {
    try {
      const saved = localStorage.getItem("cg_coords");
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return null;
  });
  const [detectedTown, setDetectedTown] = useState(null);
  const [detectedState, setDetectedState] = useState(null);

  const getKm = useCallback((lat1, lng1, lat2, lng2) => { 
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180; 
    const dLng = (lng2 - lng1) * Math.PI / 180; 
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2); 
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  }, []);

  const detectCity = useCallback(({ showToast = false, onDone, onError } = {}) => {
    if (!navigator.geolocation) {
      onError?.();
      return;
    }
    setLocating(true);
    
    // Fallback timer for MacOS/Safari bug where getCurrentPosition hangs indefinitely
    const fallbackTimer = setTimeout(() => {
      setLocating(false);
      if (showToast && toast$) toast$("Tiempo de GPS agotado");
      onError?.();
    }, 8000);

    navigator.geolocation.getCurrentPosition(
      pos => {
        clearTimeout(fallbackTimer);
        const { latitude: lat, longitude: lng } = pos.coords;
        const coords = { lat, lng };
        setUserCoords(coords);
        localStorage.setItem("cg_coords", JSON.stringify(coords));
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es`)
          .then(r => r.json())
          .then(d => {
            let name = d.address?.city || d.address?.town || d.address?.village || d.address?.county || "Tepic";
            let state = d.address?.state || "";
            
            setDetectedTown(name);
            setDetectedState(state);

            let slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-");
            let displayName = state ? `${name}, ${state}` : name;

            // Nearest City Logic: if detected city isn't supported, find closest supported city slug for backward compatibility
            // but keep the displayName as the ACTUAL town name.
            const isSupported = cities && cities.some(c => c.slug === slug);
            if (!isSupported && mapPins && mapPins.length > 0) {
              let closestBiz = null;
              let minD = Infinity;
              for (const b of mapPins) {
                if (!b.lat || !b.lng) continue;
                const dist = getKm(lat, lng, parseFloat(b.lat), parseFloat(b.lng));
                if (dist < minD) { minD = dist; closestBiz = b; }
              }
              if (closestBiz && minD < 60) {
                 const cityObj = cities.find(c => c.slug === closestBiz.city_slug);
                 if (cityObj) {
                     slug = cityObj.slug;
                     // We intentionally do NOT overwrite displayName anymore.
                 }
              }
            }

            setCity(displayName);
            const currentSlug = localStorage.getItem("cg_city_slug");
            if (setActiveCity && slug !== currentSlug) setActiveCity(slug);
            localStorage.setItem("cg_city_slug", slug);
            localStorage.setItem("cg_city_name", displayName);
            if (showToast && toast$) toast$(name);
            onDone?.(slug);
          })
          .catch(() => { 
            if (showToast && toast$) toast$("No se pudo obtener la ciudad"); 
            onError?.();
          })
          .finally(() => setLocating(false));
      },
      () => { 
        clearTimeout(fallbackTimer);
        setLocating(false); 
        if (showToast && toast$) toast$("Activa el GPS en ajustes"); 
        onError?.();
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }, [cities, mapPins, setActiveCity, toast$, getKm]);

  const handleCitySelect = useCallback((c) => {
    const displayName = c.state ? `${c.name}, ${c.state}` : c.name;
    setCity(displayName);
    if (setActiveCity) setActiveCity(c.slug);
    setDetectedTown(null);
    setDetectedState(null);
    try {
      localStorage.setItem("cg_city_slug", c.slug);
      localStorage.setItem("cg_city_name", displayName);
      localStorage.setItem("cg_manual_city", "true");
    } catch (e) {}
    if (toast$) toast$(`📍 ${c.name}`);
  }, [setActiveCity, toast$]);

  return {
    city, setCity,
    locating, setLocating,
    userCoords, setUserCoords,
    detectedTown, setDetectedTown,
    detectedState, setDetectedState,
    getKm, detectCity, handleCitySelect
  };
}

