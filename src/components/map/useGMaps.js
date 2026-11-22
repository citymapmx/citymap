import { useState, useEffect } from "react";
import { ensureGoogleMapsScript } from "../../lib/googleMapsPreload.js";

 
export default function useGMaps() {
  const [ok, setOk] = useState(!!window.google?.maps);
  useEffect(() => { 
    if (window.google?.maps) {
      setOk(true);
      return; 
    }
    // El script es el mismo de la precarga (M18): si ya se creó en
    // segundo plano, se reutiliza; si no, se crea aquí.
    const s = ensureGoogleMapsScript();
    
    const onLoad = () => setOk(true);
    s.addEventListener("load", onLoad);
    if (window.google?.maps) setOk(true);
    
    return () => s.removeEventListener("load", onLoad);
  }, []);
  return ok;
}