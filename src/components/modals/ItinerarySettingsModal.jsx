import React, { useState } from "react";
import { m } from "framer-motion";
import * as dbService from "../../services/dbService.js";
import { useDataStore } from "../../store/useDataStore.js";
import { cloudUpload, cloudDelete } from "../../lib/supabase.js";
import useGMaps from "../map/useGMaps.js";

export default function ItinerarySettingsModal({ T, itinerary, onClose, onSave }) {
  const [editTitle, setEditTitle] = useState(itinerary?.title || "");
  const [editDesc, setEditDesc] = useState(itinerary?.description || "");
  const [editPrivate, setEditPrivate] = useState(itinerary?.is_private !== false);
  const [editPackingList, setEditPackingList] = useState(itinerary?.packing_list || []);
  const [editStartTime, setEditStartTime] = useState(itinerary?.start_time ? itinerary.start_time.substring(0, 5) : "");
  const [editStartDate, setEditStartDate] = useState(itinerary?.start_date || "");
  const [editTotalDays, setEditTotalDays] = useState(itinerary?.total_days || 1);
  const [editStartLocation, setEditStartLocation] = useState(itinerary?.start_location || null);
  const [editTags, setEditTags] = useState(itinerary?.tags || []);
  const [editAuthorName, setEditAuthorName] = useState(itinerary?.author_name || "");
  const [editAuthorWhatsapp, setEditAuthorWhatsapp] = useState(itinerary?.author_whatsapp || "");
  const [savingSettings, setSavingSettings] = useState(false);
  const [customPackingItem, setCustomPackingItem] = useState("");
  const [coverImage, setCoverImage] = useState(itinerary?.cover_image || null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverUploadPct, setCoverUploadPct] = useState(0);
  const coverInputRef = React.useRef(null);




  // Compress image client-side before upload: resize to max 1200px wide, WebP format
  const compressImage = (file, maxW = 1200, quality = 0.85) => new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      canvas.toBlob(blob => {
        URL.revokeObjectURL(url);
        resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" }));
      }, "image/webp", quality);
    };
    img.src = url;
  });

  const handleCoverPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverUploading(true);
    setCoverUploadPct(0);
    try {
      const compressed = await compressImage(file);
      const url = await cloudUpload(compressed, pct => setCoverUploadPct(pct), "cityguide/itineraries");
      setCoverImage(url);
    } catch (err) {
      alert("Error al subir la foto: " + (err.message || err));
    } finally {
      setCoverUploading(false);
    }
  };

  const mapsOk = useGMaps();
  const inputRef = React.useRef(null);
  const autoRef = React.useRef(null);

  React.useEffect(() => {
    if (!mapsOk || !inputRef.current) return;
    autoRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
      fields: ["geometry", "name", "formatted_address"]
    });
    const listener = autoRef.current.addListener("place_changed", () => {
      const place = autoRef.current.getPlace();
      if (!place.geometry) return;
      setEditStartLocation({
        name: place.name,
        address: place.formatted_address,
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng()
      });
    });
    return () => {
      window.google.maps.event.removeListener(listener);
    };
  }, [mapsOk]);

  const handleSaveSettings = async () => {
    if (!editTitle.trim()) return;
    setSavingSettings(true);
    try {
      let wa = editAuthorWhatsapp.trim().replace(/\D/g, "");
      const updatedData = {
        title: editTitle.trim(),
        description: editDesc.trim(),
        is_private: editPrivate,
        packing_list: editPackingList,
        tags: editTags,
        start_time: editStartTime ? `${editStartTime.substring(0, 5)}:00` : null,
        start_date: editStartDate || null,
        total_days: editTotalDays || 1,
        author_name: editAuthorName.trim() || null,
        author_whatsapp: wa || null,
        cover_image: coverImage || null,
        // start_location: editStartLocation // Disabled temporarily until DB column is added
      };

      await dbService.updateItinerary(itinerary.id, updatedData);
      
      if (itinerary?.cover_image && itinerary.cover_image !== coverImage) {
        await cloudDelete(itinerary.cover_image).catch(err => {
          console.warn("Could not delete old cover image:", err);
        });
      }
      
      const newItinerary = { ...itinerary, ...updatedData };
      
      // Update in myItineraries in store
      const myItineraries = useDataStore.getState().myItineraries;
      const idx = myItineraries.findIndex(i => i.id === itinerary.id);
      if (idx !== -1) {
        const newArr = [...myItineraries];
        newArr[idx] = { ...newArr[idx], ...updatedData };
        useDataStore.getState().setMyItineraries(newArr);
      }
      
      if (onSave) {
        onSave(newItinerary);
      }
      onClose();
    } catch (e) {
      console.error(e);
      alert(`Error al guardar: ${e.message || e}`);
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} onClick={onClose} />
      <m.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} style={{ position: "relative", background: T.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", maxHeight: "90vh", paddingBottom: "calc(24px + env(safe-area-inset-bottom, 20px))" }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: T.text, fontFamily: "var(--heading)", flexShrink: 0 }}>Ajustes del Plan</h3>

        {/* Cover photo */}
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: T.sub, marginBottom: 8 }}>🖼️ Foto de portada</label>
          <div
            onClick={() => !coverUploading && coverInputRef.current?.click()}
            style={{ width: "100%", height: 160, borderRadius: 14, border: `2px dashed ${T.border}`, background: coverImage ? "transparent" : T.bg, position: "relative", overflow: "hidden", cursor: coverUploading ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            {coverImage
              ? <img src={coverImage} alt="portada" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <div style={{ textAlign: "center", color: T.sub }}>
                  <div style={{ fontSize: 32, marginBottom: 6 }}>📷</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Toca para subir una foto</div>
                  <div style={{ fontSize: 11, marginTop: 2 }}>Se optimizará automáticamente</div>
                </div>
            }
            {coverUploading && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Subiendo... {coverUploadPct}%</div>
                <div style={{ width: "60%", height: 6, background: "rgba(255,255,255,0.2)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: `${coverUploadPct}%`, height: "100%", background: "#22c55e", borderRadius: 4, transition: "width 0.3s" }} />
                </div>
              </div>
            )}
            {coverImage && !coverUploading && (
              <button
                onClick={e => { e.stopPropagation(); setCoverImage(null); }}
                style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: "50%", background: "rgba(0,0,0,0.5)", border: "none", color: "#fff", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}
              >×</button>
            )}
          </div>
          <input ref={coverInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleCoverPick} />
        </div>
        
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: T.sub, marginBottom: 6 }}>Título</label>
          <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: `1.5px solid ${T.border}`, background: T.bg, color: T.text, fontSize: 15, outline: "none" }} placeholder="Mi increíble fin de semana" />
        </div>
        

        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: T.sub, marginBottom: 6 }}>Descripción (Opcional)</label>
          <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: `1.5px solid ${T.border}`, background: T.bg, color: T.text, fontSize: 15, outline: "none", minHeight: 80, resize: "none" }} placeholder="Escribe un poco sobre este plan..." />
        </div>

        {/* Fecha inicio y Número de días */}
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 2 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.sub, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>📅 Fecha de inicio</label>
            <input type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)} style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: `1.5px solid ${T.border}`, background: T.bg, color: editStartDate ? T.text : T.sub, fontSize: 15, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.sub, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>🌙 Días</label>
            <input type="number" min={1} max={30} value={editTotalDays} onChange={e => setEditTotalDays(Math.max(1, parseInt(e.target.value) || 1))} style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: `1.5px solid ${T.border}`, background: T.bg, color: T.text, fontSize: 15, outline: "none", boxSizing: "border-box", textAlign: "center" }} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.sub, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Organizado por</label>
            <input type="text" value={editAuthorName} onChange={e => setEditAuthorName(e.target.value)} style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: `1.5px solid ${T.border}`, background: T.bg, color: T.text, fontSize: 15, outline: "none" }} placeholder="Nombre" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.sub, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>WhatsApp del org.</label>
            <input type="tel" value={editAuthorWhatsapp} onChange={e => setEditAuthorWhatsapp(e.target.value)} style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: `1.5px solid ${T.border}`, background: T.bg, color: T.text, fontSize: 15, outline: "none" }} placeholder="+52..." />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "12px 0" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Privacidad</div>
            <div style={{ fontSize: 13, color: T.sub }}>Selecciona quién puede ver tu plan</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button 
              onClick={() => setEditPrivate(false)} 
              style={{ flex: 1, padding: "12px", borderRadius: 12, background: !editPrivate ? T.text : "transparent", color: !editPrivate ? T.bg : T.text, border: `1.5px solid ${!editPrivate ? T.text : T.border}`, fontWeight: 700, fontSize: 14, cursor: "pointer", transition: "0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              🌍 Público
            </button>
            <button 
              onClick={() => setEditPrivate(true)} 
              style={{ flex: 1, padding: "12px", borderRadius: 12, background: editPrivate ? T.text : "transparent", color: editPrivate ? T.bg : T.text, border: `1.5px solid ${editPrivate ? T.text : T.border}`, fontWeight: 700, fontSize: 14, cursor: "pointer", transition: "0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              🔒 Privado
            </button>
          </div>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: T.sub, marginBottom: 12 }}>🏷️ Etiquetas del Plan</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[
              "Romántico",
              "Familiar",
              "Con Amigos",
              "Aventurero",
              "Relajante",
              "Cultural",
              "Gastronómico",
              "Fotografía",
              "Deportivo",
              "Rodada / Ciclismo",
              "Carrera / Running",
              "Pet Friendly",
              "Nocturno"
            ].map(tag => {
              const isSelected = editTags.includes(tag);
              return (
                <button 
                  key={tag}
                  onClick={() => {
                    if (isSelected) setEditTags(editTags.filter(t => t !== tag));
                    else setEditTags([...editTags, tag]);
                  }}
                  style={{ padding: "6px 12px", borderRadius: 20, background: isSelected ? T.text : "transparent", color: isSelected ? T.bg : T.text, border: `1px solid ${isSelected ? T.text : T.border}`, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "0.2s" }}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: T.sub, marginBottom: 12 }}>🎒 Qué recomendamos llevar</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {[
              "💧 Botella de agua",
              "👟 Calzado cómodo",
              "☀️ Protector solar",
              "💵 Efectivo",
              "🔋 Batería portátil",
              "🦟 Repelente",
              "🧢 Gorra o sombrero"
            ].map(preItem => {
              const isSelected = editPackingList.includes(preItem);
              return (
                <button 
                  key={preItem}
                  onClick={() => {
                    if (isSelected) setEditPackingList(editPackingList.filter(i => i !== preItem));
                    else setEditPackingList([...editPackingList, preItem]);
                  }}
                  style={{ padding: "8px 12px", borderRadius: 20, background: isSelected ? T.text : "transparent", color: isSelected ? T.bg : T.text, border: `1px solid ${isSelected ? T.text : T.border}`, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "0.2s" }}
                >
                  {isSelected ? "✓" : "+" } {preItem.split(" ").slice(1).join(" ")}
                </button>
              );
            })}
            {/* Custom items from the list that aren't in presets */}
            {editPackingList.filter(i => !["💧 Botella de agua", "👟 Calzado cómodo", "☀️ Protector solar", "💵 Efectivo", "🔋 Batería portátil", "🦟 Repelente", "🧢 Gorra o sombrero"].includes(i)).map(customItem => (
              <button 
                key={customItem}
                onClick={() => setEditPackingList(editPackingList.filter(i => i !== customItem))}
                style={{ padding: "8px 12px", borderRadius: 20, background: T.text, color: T.bg, border: `1px solid ${T.text}`, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                ✓ {customItem}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input 
              type="text" 
              value={customPackingItem} 
              onChange={e => setCustomPackingItem(e.target.value)} 
              onKeyDown={e => {
                if (e.key === "Enter" && customPackingItem.trim()) {
                  e.preventDefault();
                  if (!editPackingList.includes(customPackingItem.trim())) {
                    setEditPackingList([...editPackingList, customPackingItem.trim()]);
                  }
                  setCustomPackingItem("");
                }
              }}
              style={{ flex: 1, padding: "10px 14px", borderRadius: 12, border: `1px solid ${T.border}`, background: T.bg, color: T.text, fontSize: 14, outline: "none" }} 
              placeholder="Añadir ítem personalizado..." 
            />
            <button 
              onClick={() => {
                if (customPackingItem.trim() && !editPackingList.includes(customPackingItem.trim())) {
                  setEditPackingList([...editPackingList, customPackingItem.trim()]);
                }
                setCustomPackingItem("");
              }} 
              style={{ padding: "0 16px", borderRadius: 12, background: T.text, color: T.bg, border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
            >
              Añadir
            </button>
          </div>
        </div>

        <button onClick={handleSaveSettings} disabled={savingSettings || !editTitle.trim()} style={{ width: "100%", padding: 14, borderRadius: 12, background: T.text, color: T.bg, border: "none", fontWeight: 700, fontSize: 15, cursor: "pointer", marginTop: 8, opacity: (savingSettings || !editTitle.trim()) ? 0.6 : 1 }}>
          {savingSettings ? "Guardando..." : "Guardar cambios"}
        </button>
      </m.div>
    </div>
  );
}
