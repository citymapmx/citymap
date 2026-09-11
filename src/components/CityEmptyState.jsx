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
    <div style={{ margin: "24px 20px 10px", padding: 30, paddingLeft: 24, paddingRight: 24, borderRadius: 24, textAlign: "center", position: "relative", background: dark ? '#111' : '#fff', boxShadow: dark ? '0 12px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.06)', border: `1px solid ${T.border}` }}>
      
      <div style={{ display: "inline-flex", padding: "6px 12px", borderRadius: 100, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16, border: `1px solid ${T.border}`, background: T.bg, color: T.text }}>
        Aún no llegamos aquí
      </div>
      
      <h2 style={{ fontFamily: "var(--heading)", letterSpacing: 0.5, fontSize: 26, margin: "0 0 14px", lineHeight: 1.15, textTransform: "capitalize", color: T.text, fontWeight: 800 }}>
        ¡Ups! {cityName} está vacía
      </h2>
      
      <p style={{ fontSize: 15, margin: "0 0 24px", lineHeight: 1.5, color: T.sub }}>
        Aún no hay lugares registrados aquí para hacer Match contigo. Explora una ciudad cercana y encuentra tu próxima gran experiencia.
      </p>
      
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {nearest && (
          <button 
            className="press"
            style={{ width: "100%", padding: 16, borderRadius: 16, fontSize: 15, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: dark ? '#fff' : '#000', color: dark ? '#000' : '#fff', border: "none" }}
            onClick={() => { setActiveCity(nearest.slug); window.history.pushState(null, "", `/${nearest.slug}`); }}
          >
            <Icon name="pin" size={16} color={dark ? "#000" : "#fff"} /> Explorar {nearest.name}
          </button>
        )}
        <button 
          className="press"
          style={{ width: "100%", padding: 16, borderRadius: 16, fontSize: 15, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: nearest ? T.bg : (dark ? '#fff' : '#000'), color: nearest ? T.text : (dark ? '#000' : '#fff'), border: nearest ? `1px solid ${T.border}` : "none" }}
          onClick={() => setShowCountryPicker(true)}
        >
          <Icon name="search" size={16} color={nearest ? T.text : (dark ? "#000" : "#fff")} /> Cambiar de ciudad
        </button>
      </div>
      
      <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${T.border}` }}>
        <button 
          className="press"
          style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, textDecoration: "underline", fontFamily: "inherit", color: T.sub }}
          onClick={() => { if (!user) { setShowAuth(true); toast$("Inicia sesión para registrar un negocio"); } else { setShowAddBiz(true); } }}
        >
          ¿Quieres registrar un negocio aquí?
        </button>
      </div>
    </div>
  );
}
