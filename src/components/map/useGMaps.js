import { useState, useEffect } from "react";
import { GMAPS_KEY } from "../../lib/supabase.js";

 
export default function useGMaps() {
  const [ok, setOk] = useState(!!window.google?.maps);
  useEffect(() => { 
    if (window.google?.maps) {
      setOk(true);
      return; 
    }
    const s = document.getElementById("gms") || (() => { 
      const el = document.createElement("script"); 
      el.id = "gms"; 
      el.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GMAPS_KEY}&libraries=places`; 
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