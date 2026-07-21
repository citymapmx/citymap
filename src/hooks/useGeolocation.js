import { useCallback } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { useUIStore } from '../store/useUIStore.js';

export function useGeolocation({ toast$, cities, mapPins, setActiveCity }) {
  const { city, setCity, locating, setLocating, userCoords, setUserCoords, detectedTown, setDetectedTown, detectedState, setDetectedState } = useUIStore();

  const getKm = useCallback((lat1, lng1, lat2, lng2) => { 
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180; 
    const dLng = (lng2 - lng1) * Math.PI / 180; 
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2); 
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  }, []);

  const detectCity = useCallback(async ({ showToast = false, onDone, onError } = {}) => {
    setLocating(true);
    
    // Fallback timer for MacOS/Safari bug where getCurrentPosition hangs indefinitely
    const fallbackTimer = setTimeout(() => {
      setLocating(false);
      if (showToast && toast$) toast$("Tiempo de GPS agotado");
      onError?.();
    }, 8000);

    try {
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 8000, maximumAge: 0 });
      clearTimeout(fallbackTimer);
      const { latitude: lat, longitude: lng } = pos.coords;
      const coords = { lat, lng };
      setUserCoords(coords);
      localStorage.setItem("cg_coords", JSON.stringify(coords));
      
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es`);
      const d = await r.json();
      
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
        let nearestDist = Infinity;
        let cityObj = null;
        for (let i = 0; i < mapPins.length; i++) {
           const p = mapPins[i];
           const d = getKm(lat, lng, p.lat, p.lng);
           if (d < nearestDist) {
               nearestDist = d;
               cityObj = cities?.find(c => c.slug === p.city_slug);
           }
        }
        if (nearestDist < 50) { // arbitrary threshold, e.g., 50km
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
    } catch (e) {
      clearTimeout(fallbackTimer);
      if (showToast && toast$) toast$("No se pudo obtener la ubicación o ciudad");
      onError?.();
    } finally {
      setLocating(false);
    }
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
