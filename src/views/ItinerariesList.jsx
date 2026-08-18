import React, { useState } from "react";
import { m } from "framer-motion";
import Icon from "../components/ui/Icon.jsx";
import { useDataStore } from "../store/useDataStore.js";
import { useAuthStore } from "../store/useAuthStore.js";
import * as dbService from "../services/dbService.js";

export default function ItinerariesList({ T, dark, navigate }) {
  const { myItineraries } = useDataStore();
  const { user } = useAuthStore();

  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!newTitle.trim() || !user) return;
    setSaving(true);
    try {
      const data = await dbService.createItinerary({
        user_id: user.id,
        title: newTitle.trim(),
        is_private: true,
        share_token: Math.random().toString(36).substring(2, 10)
      });
      if (data && data.length > 0) {
        useDataStore.getState().setMyItineraries([data[0], ...myItineraries]);
        setIsCreating(false);
        navigate(`itinerary_detail_${data[0].id}`);
      }
    } catch (e) {
      console.error(e);
      alert("Error al crear itinerario: " + (e.message || JSON.stringify(e)));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (window.confirm("¿Seguro que quieres eliminar este itinerario? Esta acción no se puede deshacer.")) {
      try {
        await dbService.deleteItinerary(id);
        useDataStore.getState().setMyItineraries(myItineraries.filter(i => i.id !== id));
      } catch (err) {
        console.error(err);
        alert("Error al eliminar itinerario: " + (err.message || ""));
      }
    }
  };

  return (
    <>
    <m.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      style={{
        position: "fixed", inset: 0, background: T.bg, zIndex: 8000,
        display: "flex", flexDirection: "column"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${T.border}`, background: T.white }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <button onClick={() => navigate("account")} style={{ background: "transparent", border: "none", color: T.text, padding: "8px 12px 8px 0", cursor: "pointer", display: "flex", alignItems: "center" }}>
            <Icon name="arrow_left" size={24} color={T.text} />
          </button>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: T.text, fontFamily: "var(--heading)", letterSpacing: "-0.5px" }}>Mis Planes</h1>
        </div>
        <button 
          className="press"
          onClick={() => setIsCreating(true)}
          style={{ background: T.text, color: T.bg, border: "none", borderRadius: 16, padding: "8px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
        >
          <Icon name="plus" size={16} /> Crear
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
        {myItineraries.length === 0 ? (
          <div style={{ textAlign: "center", marginTop: 40 }}>
            <div style={{ display: "inline-flex", padding: 20, borderRadius: "50%", background: T.border, marginBottom: 16 }}>
              <Icon name="map" size={32} color={T.sub} />
            </div>
            <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 800, color: T.text }}>Sin itinerarios aún</h3>
            <p style={{ margin: 0, fontSize: 14, color: T.sub }}>Explora lugares y presiona el ícono "+" para guardarlos en un plan.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {myItineraries.map((itin) => (
              <div 
                key={itin.id} 
                onClick={() => navigate(`itinerary_detail_${itin.id}`)}
                className="press"
                style={{ 
                  background: T.white, border: `1px solid ${T.border}`, borderRadius: 16, 
                  padding: "20px", display: "flex", alignItems: "center", justifyContent: "space-between",
                  cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
                }}
              >
                <div>
                  <h3 style={{ margin: "0 0 4px", fontSize: 19, fontWeight: 900, fontFamily: "var(--heading)", letterSpacing: "-0.5px", color: T.text }}>{itin.title}</h3>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: T.sub }}>
                    <span>{itin.is_private ? "🔒 Privado" : "🌍 Público"}</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button 
                    onClick={(e) => handleDelete(e, itin.id)}
                    style={{ background: "transparent", border: "none", color: "#F07060", cursor: "pointer", display: "flex", alignItems: "center", padding: 8 }}
                  >
                    <Icon name="trash" size={18} />
                  </button>
                  <Icon name="chevron" size={20} color={T.sub} style={{ transform: "rotate(-90deg)" }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </m.div>

      {/* Modal para Crear Nuevo */}
      {isCreating && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", flexDirection: "column", justifyContent: "flex-start" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} onClick={() => setIsCreating(false)} />
          <m.div initial={{ y: "-100%" }} animate={{ y: 0 }} exit={{ y: "-100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} style={{ position: "relative", background: T.white, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, padding: 24, display: "flex", flexDirection: "column", gap: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>
            <h3 style={{ margin: 0, fontSize: 19, fontWeight: 900, color: T.text, fontFamily: "var(--heading)", letterSpacing: "-0.5px" }}>Crear Nuevo Plan</h3>
            
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: T.sub, marginBottom: 6 }}>Nombre del Itinerario</label>
              <input 
                autoFocus
                type="text" 
                value={newTitle} 
                onChange={e => setNewTitle(e.target.value)} 
                style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: `1.5px solid ${T.border}`, background: T.bg, color: T.text, fontSize: 15, outline: "none", boxSizing: "border-box" }} 
                placeholder="Ej. Fin de semana en Tepic" 
              />
            </div>

            <button 
              onClick={handleCreate} 
              disabled={saving || !newTitle.trim()} 
              style={{ width: "100%", padding: 14, borderRadius: 12, background: T.text, color: T.bg, border: "none", fontWeight: 700, fontSize: 15, cursor: "pointer", marginTop: 8, opacity: (saving || !newTitle.trim()) ? 0.6 : 1 }}
            >
              {saving ? "Creando..." : "Crear y Continuar"}
            </button>
          </m.div>
        </div>
      )}
    </>
  );
}
