import { useState, useEffect } from "react";
import { GMAPS_KEY } from "../../lib/supabase.js";

export default function useGMaps() {
  const [ok, setOk] = useState(!!window.google?.maps);
  useEffect(() => { if (window.google?.maps) return; const s = document.getElementById("gms") || (() => { const el = document.createElement("script"); el.id = "gms"; el.src = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_KEY}&libraries=places`; el.async = true; el.onload = () => setOk(true); document.head.appendChild(el); return el; })(); if (!ok) s.onload = () => setOk(true); }, []);
  return ok;
}