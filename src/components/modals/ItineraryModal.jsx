import React, { useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import Icon from "../ui/Icon.jsx";
import { useUIStore } from "../../store/useUIStore.js";
import { useDataStore } from "../../store/useDataStore.js";
import { useAuthStore } from "../../store/useAuthStore.js";
import * as dbService from "../../services/dbService.js";

export default function ItineraryModal({ T, dark }) {
  const { showItineraryModal, setShowItineraryModal, itineraryTargetBiz, setItineraryTargetBiz, toast$ } = useUIStore();
  const { myItineraries, setMyItineraries } = useDataStore();
  const { user } = useAuthStore();
  
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [loadingId, setLoadingId] = useState(null);

  if (!showItineraryModal || !user) return null;

  const close = () => {
    setShowItineraryModal(false);
    setTimeout(() => setItineraryTargetBiz(null), 300);
    setIsCreating(false);
    setNewTitle("");
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setLoadingId("new");
    try {
      const data = await dbService.createItinerary({
        user_id: user.id,
        title: newTitle.trim(),
        is_private: true
      });
      if (data && data.length > 0) {
        const newItin = data[0];
        setMyItineraries([newItin, ...myItineraries]);
        await handleAddToItinerary(newItin.id);
      }
    } catch (e) {
      toast$("Error al crear el itinerario");
      setLoadingId(null);
    }
  };

  const handleAddToItinerary = async (itineraryId) => {
    if (!itineraryTargetBiz) return;
    setLoadingId(itineraryId);
    try {
      const items = await dbService.getItineraryItems(itineraryId);
      const nextOrder = items.length > 0 ? Math.max(...items.map(i => i.sort_order)) + 1 : 0;
      
      await dbService.addItineraryItem({
        itinerary_id: itineraryId,
        biz_id: itineraryTargetBiz.id,
        sort_order: nextOrder
      });
      toast$("¡Añadido al itinerario!");
      close();
    } catch (e) {
      toast$("Error al añadir al itinerario");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <AnimatePresence>
      <m.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", zIndex: 999999, display: "flex", alignItems: "flex-start", justifyContent: "center" }}
        onClick={close}
      >
        <m.div 
          initial={{ y: "-100%" }} animate={{ y: 0 }} exit={{ y: "-100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
          style={{ width: "100%", maxWidth: 500, background: T.bg, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, padding: "24px 20px 32px", display: "flex", flexDirection: "column", gap: 20, maxHeight: "85vh", overflowY: "auto" }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: T.text, fontFamily: "var(--heading)" }}>
              Guardar en un Plan
            </h3>
            <button onClick={close} style={{ background: "none", border: "none", color: T.sub, padding: 4, cursor: "pointer", display: "flex" }}>
              <Icon name="x" size={24} color={T.sub} />
            </button>
          </div>

          <p style={{ margin: 0, fontSize: 14, color: T.sub }}>
            Agrega "{itineraryTargetBiz?.name || itineraryTargetBiz?.title}" a uno de tus itinerarios.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {myItineraries.map(itin => (
              <div key={itin.id} onClick={() => loadingId ? null : handleAddToItinerary(itin.id)} className="press" style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 16, padding: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: loadingId ? "wait" : "pointer", opacity: loadingId === itin.id ? 0.6 : 1 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: T.text, marginBottom: 2 }}>{itin.title}</div>
                  <div style={{ fontSize: 12, color: T.sub }}>{itin.is_private ? "🔒 Privado" : "🌍 Público"}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 10, background: T.border }}>
                  <Icon name="plus" size={16} color={T.text} />
                </div>
              </div>
            ))}
          </div>

          {isCreating ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
              <input 
                type="text" 
                placeholder="Nombre de tu viaje (ej. Fin de semana)" 
                value={newTitle} 
                onChange={e => setNewTitle(e.target.value)}
                autoFocus
                style={{ width: "100%", padding: "14px 16px", borderRadius: 14, border: `1px solid ${T.border}`, background: T.white, color: T.text, fontSize: 15, fontFamily: "inherit", outline: "none" }}
              />
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setIsCreating(false)} style={{ flex: 1, padding: "12px", borderRadius: 12, background: "transparent", border: `1px solid ${T.border}`, color: T.text, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
                  Cancelar
                </button>
                <button onClick={handleCreate} disabled={!newTitle.trim() || loadingId} style={{ flex: 1, padding: "12px", borderRadius: 12, background: T.text, border: "none", color: T.bg, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit", opacity: (!newTitle.trim() || loadingId) ? 0.5 : 1 }}>
                  {loadingId === "new" ? "Creando..." : "Crear y Añadir"}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setIsCreating(true)} className="press" style={{ marginTop: 8, padding: "16px", borderRadius: 16, background: "transparent", border: `1.5px dashed ${T.border}`, color: T.text, fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "inherit" }}>
              <Icon name="plus" size={18} color={T.text} /> Nuevo Plan
            </button>
          )}

        </m.div>
      </m.div>
    </AnimatePresence>
  );
}
