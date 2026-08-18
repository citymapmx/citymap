import React from 'react';
import Icon from './ui/Icon.jsx';
import { useUIStore } from '../store/useUIStore.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { useShallow } from 'zustand/react/shallow';
import { getKm } from '../lib/utils.js';

export default function CityEmptyState({ activeCity, userCoords, cities, T, dark }) {
  const { setShowCountryPicker, setActiveCity, setShowAddBiz, toast$ } = useUIStore(useShallow(s => ({
    setShowCountryPicker: s.setShowCountryPicker,
    setActiveCity: s.setActiveCity,
    setShowAddBiz: s.setShowAddBiz,
    toast$: s.toast$
  })));
  const { user, setShowAuth } = useAuthStore(useShallow(s => ({
    user: s.user,
    setShowAuth: s.setShowAuth
  })));

  let nearest = null;
  if (userCoords && userCoords.lat && userCoords.lng && cities && cities.length > 0) {
    let minD = Infinity;
    cities.forEach(c => {
      if (c.slug !== activeCity && c.lat && c.lng) {
        const d = getKm(userCoords.lat, userCoords.lng, c.lat, c.lng);
        if (d < minD) { minD = d; nearest = c; }
      }
    });
  }

  const cityName = (activeCity || "").replace(/-/g, " ");

  return (
    <div style={{ margin: "24px 20px 10px", padding: "30px 24px", background: dark ? "#111" : "#ffffff", borderRadius: 24, boxShadow: dark ? "0 12px 32px rgba(0,0,0,0.5)" : "0 8px 32px rgba(0,0,0,0.06)", border: `1px solid ${T.border}`, textAlign: "center", position: "relative" }}>
      <div style={{ display: "inline-flex", padding: "6px 12px", background: T.bg, borderRadius: 20, fontSize: 11, fontWeight: 800, color: T.text, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16, border: `1px solid ${T.border}` }}>Aún no llegamos aquí</div>
      <h2 style={{ fontFamily: "var(--heading)", letterSpacing: 0.5, fontSize: 26, color: T.text, margin: "0 0 14px", lineHeight: 1.15, textTransform: "capitalize" }}>¡Ups! {cityName} está vacía</h2>
      <p style={{ fontSize: 15, color: T.sub, margin: "0 0 24px", lineHeight: 1.5 }}>Actualmente no tenemos lugares registrados en esta ciudad. Explora lugares increíbles cambiando a una ciudad cercana.</p>
      
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {nearest && (
          <button className="press" onClick={() => { setActiveCity(nearest.slug); window.history.pushState(null, "", `/${nearest.slug}`); }} style={{ width: "100%", padding: "16px", background: dark ? "#ffffff" : "#000000", color: dark ? "#000000" : "#ffffff", border: "none", borderRadius: 16, fontSize: 15, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "transform 0.2s" }}>
            <Icon name="pin" size={16} color={dark ? "#000" : "#fff"} /> Explorar {nearest.name}
          </button>
        )}
        <button className="press" onClick={() => setShowCountryPicker(true)} style={{ width: "100%", padding: "16px", background: nearest ? T.bg : (dark ? "#ffffff" : "#000000"), color: nearest ? T.text : (dark ? "#000000" : "#ffffff"), border: nearest ? `1px solid ${T.border}` : "none", borderRadius: 16, fontSize: 15, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "transform 0.2s" }}>
          <Icon name="search" size={16} color={nearest ? T.text : (dark ? "#000" : "#fff")} /> Cambiar de ciudad
        </button>
      </div>
      
      <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${T.border}` }}>
        <button className="press" onClick={() => { if (!user) { setShowAuth(true); toast$("Inicia sesión para registrar un negocio"); } else { setShowAddBiz(true); } }} style={{ background: "transparent", border: "none", cursor: "pointer", color: T.sub, fontSize: 13, fontWeight: 600, textDecoration: "underline", fontFamily: "inherit" }}>
          ¿Quieres registrar un negocio aquí?
        </button>
      </div>
    </div>
  );
}
