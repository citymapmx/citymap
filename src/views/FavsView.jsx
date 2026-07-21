import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getT, FONT_BIZ } from "../lib/constants.js";
import { getThumbUrl, getScheduleStatus, isNear, isOpenNow, getKm } from "../lib/utils";
import { useInteractions } from "../hooks/useInteractions";
import { useFavorites } from "../hooks/useFavorites";
import { sb } from "../lib/supabase.js";
import { useDataStore } from "../store/useDataStore.js";
import { useAuthStore } from "../store/useAuthStore.js";
import useTimeStore from "../store/useTimeStore.js";
import Icon from "../components/ui/Icon.jsx";
import { useShallow } from 'zustand/react/shallow';

export default function FavsView({ hideHeader, navigate }) {
  const { dark, activeCity, toast$, userCoords, city, savedEventIds, movingBiz, setMovingBiz, activeCollection, setActiveCollection, newColModal, setNewColModal, newColForm, setNewColForm, selectedEvent, setSelectedEvent, setSelected, view } = useUIStore(useShallow(s => ({ dark: s.dark, activeCity: s.activeCity, toast$: s.toast$, userCoords: s.userCoords, city: s.city, savedEventIds: s.savedEventIds, movingBiz: s.movingBiz, setMovingBiz: s.setMovingBiz, activeCollection: s.activeCollection, setActiveCollection: s.setActiveCollection, newColModal: s.newColModal, setNewColModal: s.setNewColModal, newColForm: s.newColForm, setNewColForm: s.setNewColForm, selectedEvent: s.selectedEvent, setSelectedEvent: s.setSelectedEvent, setSelected: s.setSelected, view: s.view })));
  const { collections, setCollections, favIds } = useDataStore(useShallow(s => ({ collections: s.collections, setCollections: s.setCollections, favIds: s.favIds })));
  const { user, setShowAuth } = useAuthStore(useShallow(s => ({ user: s.user, setShowAuth: s.setShowAuth })));
  const now = useTimeStore(s => s.now);
  const viewStyle = view === "list" ? "list" : "grid";
  const T = getT(dark);
  const { toggleFav, createCollection, updateCollection, deleteCollection } = useFavorites();
  const { trackEvent, goDir } = useInteractions({ activeCity, sb, toast$ });
  const { mapPins, events } = useDataStore(useShallow(s => ({ mapPins: s.mapPins, events: s.events })));

  return (
    <div style={hideHeader ? { paddingBottom: 20 } : { paddingBottom: 84, ...viewStyle }}>
          <div style={{ padding: hideHeader ? "10px 20px" : "calc(env(safe-area-inset-top, 0px) + 24px) 18px 20px" }}>
            {!hideHeader && <>
              <h2 style={{ fontFamily: "'Coolvetica', sans-serif", fontSize: 26, color: T.text, marginBottom: 4 }}>Colecciones</h2>
              <p style={{ fontSize: 14, color: T.sub, marginBottom: 20 }}>Tus lugares favoritos en {(city || "").split(",")[0]}</p>
            </>}
            {(() => {
              const allSavedBiz = mapPins.filter(b => favIds.includes(b.id) && b.city_slug === activeCity);
              const unsortedBiz = allSavedBiz.filter(b => !collections.some(c => c.items.includes(b.id)));
              const savedEv = events.filter(e => savedEventIds.includes(e.id) && (!e.city_slug || e.city_slug === "all" || e.city_slug === activeCity));
              const hasFavs = allSavedBiz.length > 0 || savedEv.length > 0;

              if (activeCollection) {
                const colItems = allSavedBiz.filter(b => activeCollection.items.includes(b.id));
                return <>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                    <button className="press" onClick={() => setActiveCollection(null)} style={{ width: 40, height: 40, borderRadius: "50%", background: T.white, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: T.shadow }}><Icon name="arrow_left" size={20} color={T.text} /></button>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: 20, fontWeight: 800, color: T.text, margin: 0 }}>{activeCollection.emoji} {activeCollection.name}</h3>
                      <div style={{ fontSize: 13, color: T.sub }}>{colItems.length} lugares</div>
                    </div>
                    <button className="press" onClick={() => {
                      if(window.confirm("¿Estás seguro de eliminar esta colección? Los lugares no se borrarán, solo volverán a la sección 'Sin organizar'.")) {
                        deleteCollection(activeCollection.id);
                        setActiveCollection(null);
                      }
                    }} style={{ width: 40, height: 40, borderRadius: "50%", background: T.white, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: T.shadow }}><Icon name="trash" size={20} color={T.red} /></button>
                  </div>
                  {colItems.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 20px" }}>
                      <p style={{ color: T.sub }}>Esta colección está vacía.<br/>Guarda lugares para que aparezcan aquí.</p>
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      {colItems.map(b => (
                        <div key={b.id} className="press" onClick={() => { setSelected(b); navigate("detail"); }} style={{ background: T.bg, borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column", position: "relative" }}>
                          <div style={{ height: 140, background: T.border, position: "relative" }}>
                            {b.photos?.[0]?.url ? <img src={b.photos[0].url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="store" size={24} color={T.sub} /></div>}
                            <button onClick={e => toggleFav(b.id, e)} style={{ position: "absolute", top: 10, right: 10, background: "transparent", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))" }}><Icon name="heart_overlay_f" size={26} color="none" /></button>
                          </div>
                          <div style={{ padding: "10px 12px" }}>
                            <div style={{ fontFamily: FONT_BIZ, fontWeight: 800, fontSize: 13, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.name}</div>
                            <div style={{ fontSize: 11, color: T.sub, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.type}</div>
                            <button onClick={e => { e.stopPropagation(); goDir(b, null); }} style={{ marginTop: 8, width: "100%", background: T.greenL, border: "none", borderRadius: 8, padding: "6px 0", fontSize: 11, fontWeight: 700, color: T.green, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}><Icon name="nav" size={10} color={T.green} />Cómo llegar</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>;
              }

              return <>
                {/* COLECCIONES GRID */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
                  {collections.map(col => {
                    const validItems = col.items.filter(id => favIds.includes(id));
                    return (
                      <div key={col.id}
                        onClick={() => setActiveCollection(col)}
                        onDragOver={e => { e.preventDefault(); e.currentTarget.style.transform = "scale(1.05)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.15)"; }}
                        onDragLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
                        onDrop={e => {
                          e.preventDefault();
                          e.currentTarget.style.transform = "scale(1)";
                          e.currentTarget.style.boxShadow = T.shadow;
                          const bizId = e.dataTransfer.getData("bizId");
                          if (bizId) {
                            const updatedCol = { ...col, items: [...new Set([...col.items, bizId])] };
                            updateCollection(updatedCol);
                            toast$(`Agregado a ${col.name}`);
                          }
                        }}
                        style={{ background: T.white, borderRadius: 24, padding: "20px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, transition: "all .2s ease", cursor: "pointer", boxShadow: T.shadow }}>
                        <div style={{ fontSize: 36, filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.1))" }}>{col.emoji}</div>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: T.text, lineHeight: 1.2 }}>{col.name}</div>
                          <div style={{ fontSize: 11, color: T.sub, marginTop: 4 }}>{validItems.length} {validItems.length === 1 ? "lugar" : "lugares"}</div>
                        </div>
                      </div>
                    );
                  })}
                  {collections.length < 6 && (
                    <div className="press" onClick={() => setNewColModal(true)} style={{ background: T.bg, borderRadius: 24, padding: "20px 16px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, cursor: "pointer", border: `2px dashed ${T.border}` }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, padding: "24px 0" }}>
                        <div style={{ width: 44, height: 44, borderRadius: "50%", background: T.white, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 10px rgba(0,0,0,0.1)" }}><Icon name="plus" size={20} color={T.green} /></div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Crear Colección</div>
                      </div>
                    </div>
                  )}
                </div>

                {!hasFavs && <div style={{ textAlign: "center", padding: "60px 20px" }}>
                  <div style={{ width: 80, height: 80, borderRadius: 24, background: T.greenL, margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="heart" size={36} color={T.green} /></div>
                  <h3 style={{ fontFamily: "'Coolvetica', sans-serif", fontSize: 20, color: T.text, marginBottom: 8 }}>Aún no hay favoritos</h3>
                  <p style={{ fontSize: 14, color: T.sub, lineHeight: 1.5, marginBottom: 24 }}>Explora la ciudad y guarda los lugares o eventos que más te gusten para tenerlos a la mano.</p>
                  <button className="btn-g press" onClick={() => navigate("home")}>Explorar ciudad</button>
        </div>}

                {unsortedBiz.length > 0 && <div style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: T.text, marginBottom: 12 }}>Sin organizar</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {unsortedBiz.map(b => (
                      <div key={b.id} className="press" draggable={true} onDragStart={e => { e.dataTransfer.setData("bizId", b.id); e.currentTarget.style.opacity = "0.5"; }} onDragEnd={e => { e.currentTarget.style.opacity = "1"; }} onClick={() => setMovingBiz(b)} style={{ background: T.bg, borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column", position: "relative", cursor: "grab" }}>
                        <div style={{ height: 140, background: T.border, position: "relative" }}>
                          {b.photos?.[0]?.url ? <img src={b.photos[0].url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="store" size={24} color={T.sub} /></div>}
                          <button onClick={e => toggleFav(b.id, e)} style={{ position: "absolute", top: 10, right: 10, background: "transparent", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))" }}><Icon name="heart_overlay_f" size={26} color="none" /></button>
                        </div>
                        <div style={{ padding: "10px 12px" }}>
                          <div style={{ fontFamily: FONT_BIZ, fontWeight: 800, fontSize: 13, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.name}</div>
                          <div style={{ fontSize: 11, color: T.sub, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.type}</div>
                          <button onClick={e => { e.stopPropagation(); goDir(b, null); }} style={{ marginTop: 8, width: "100%", background: T.greenL, border: "none", borderRadius: 8, padding: "6px 0", fontSize: 11, fontWeight: 700, color: T.green, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}><Icon name="nav" size={10} color={T.green} />Cómo llegar</button>
                        </div>
                      </div>
                    ))}
                  </div>
        </div>}

                {savedEv.length > 0 && <div style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: T.text, marginBottom: 12 }}>Eventos Guardados</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {savedEv.map(e => (
                      <div key={e.id} className="press" onClick={() => setSelectedEvent(e)} style={{ display: "flex", background: T.bg, borderRadius: 16, overflow: "hidden", position: "relative", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                        <div style={{ width: 100, height: 100, background: T.border, flexShrink: 0, position: "relative" }}>
                          {e.img_url ? (
                            <img src={e.img_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} loading="lazy" />
                          ) : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="calendar" size={24} color={T.sub} /></div>}
                        </div>
                        <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", justifyContent: "center", flex: 1 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: T.green, textTransform: "uppercase", letterSpacing: .6, marginBottom: 4 }}>{e.date && new Date(e.date + "T00:00:00").toLocaleDateString("es", { day: "numeric", month: "short" })}</div>
                          <div style={{ fontFamily: FONT_BIZ, fontWeight: 800, fontSize: 14, color: T.text, lineHeight: 1.2, marginBottom: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{e.title}</div>
                          {e.venue_name && <div style={{ fontSize: 12, color: T.sub }}><Icon name="pin" size={10} color={T.sub} /> {e.venue_name}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
        </div>}

                {/* ACTION SHEET PARA MOVER BIZ */}
                {movingBiz && <div style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", flexDirection: "column", justifyContent: "flex-start" }}>
                  <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} onClick={() => setMovingBiz(null)} />
                  <div style={{ background: T.white, borderRadius: "0 0 24px 24px", width: "100%", maxHeight: "85vh", overflowY: "auto", padding: "calc(env(safe-area-inset-top, 0px) + 24px) 20px 32px", position: "relative", animation: "slideDown .3s cubic-bezier(0.1, 1, 0.2, 1)", boxShadow: "0 12px 40px rgba(0,0,0,0.2)" }}>
                    <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 24 }}>
                      <div style={{ width: 60, height: 60, borderRadius: 12, background: T.bg, overflow: "hidden" }}>
                        {movingBiz.photos?.[0]?.url ? <img src={movingBiz.photos[0].url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="store" size={24} color={T.sub} /></div>}
                      </div>
                      <div>
                        <h3 style={{ fontSize: 18, fontWeight: 800, color: T.text, margin: "0 0 4px" }}>{movingBiz.name}</h3>
                        <p style={{ fontSize: 13, color: T.sub, margin: 0 }}>¿Qué deseas hacer?</p>
                      </div>
                    </div>
                    
                    <button className="press" onClick={() => { setMovingBiz(null); setSelected(movingBiz); navigate("detail"); }} style={{ width: "100%", background: T.bg, border: "none", borderRadius: 16, padding: "16px", fontSize: 16, fontWeight: 700, color: T.text, cursor: "pointer", display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}><div style={{ width: 32, height: 32, borderRadius: "50%", background: T.white, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="nav" size={16} color={T.text} /></div> Ver detalles del lugar</button>

                    <div style={{ margin: "24px 0 12px", fontSize: 13, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 1 }}>Mover a colección</div>
                    
                    {collections.map(col => (
                      <button key={col.id} className="press" onClick={() => {
                        const updatedCol = { ...col, items: [...new Set([...col.items, movingBiz.id])] };
                        updateCollection(updatedCol);
                        setMovingBiz(null);
                        toast$(`Agregado a ${col.name}`);
                      }} style={{ width: "100%", background: T.white, border: `1px solid ${T.border}`, borderRadius: 16, padding: "16px", fontSize: 16, fontWeight: 700, color: T.text, cursor: "pointer", display: "flex", alignItems: "center", gap: 12, marginBottom: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}><div style={{ fontSize: 24 }}>{col.emoji}</div> <div style={{ flex: 1, textAlign: "left" }}>{col.name}</div></button>
                    ))}
                  </div>
        </div>}
                {/* NEW COLLECTION MODAL */}
                {newColModal && <div style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
                  <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} onClick={() => setNewColModal(false)} />
                  <div style={{ background: T.white, borderRadius: 24, padding: 24, width: "100%", maxWidth: 360, position: "relative", animation: "popIn .3s cubic-bezier(0.1, 1, 0.2, 1)", boxShadow: "0 12px 40px rgba(0,0,0,0.2)" }}>
                    <h3 style={{ fontSize: 20, fontWeight: 800, color: T.text, margin: "0 0 20px", textAlign: "center" }}>Nueva Colección</h3>
                    <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.sub, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Nombre</div>
                        <input type="text" value={newColForm.name} onChange={e => setNewColForm(f => ({...f, name: e.target.value}))} placeholder="Ej. Mis lugares favoritos..." style={{ width: "100%", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 16px", fontSize: 16, color: T.text, outline: "none", fontFamily: "inherit" }} />
                      </div>
                      <div style={{ width: 80 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.sub, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Emoji</div>
                        <div style={{ position: "relative" }}>
                          <select value={newColForm.emoji} onChange={e => setNewColForm(f => ({...f, emoji: e.target.value}))} style={{ width: "100%", height: 50, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12, fontSize: 24, outline: "none", cursor: "pointer", appearance: "none", textAlign: "center", padding: 0 }}>
                            {["🌟","📌","🍔","🍻","☕","🌳","💖","🌮","🍣","🍕","👗","👟","🎉"].map(em => <option key={em} value={em}>{em}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 12 }}>
                      <button className="press" onClick={() => setNewColModal(false)} style={{ flex: 1, background: T.bg, border: "none", borderRadius: 16, padding: "14px", fontSize: 15, fontWeight: 700, color: T.sub, cursor: "pointer" }}>Cancelar</button>
                      <button className="press" onClick={() => {
                        if (!newColForm.name.trim()) return toast$("Ingresa un nombre válido");
                        createCollection(newColForm.name.trim(), newColForm.emoji);
                        setNewColModal(false);
                        setNewColForm({ name: "", emoji: "🌟" });
                        toast$("Colección creada");
                      }} style={{ flex: 1, background: T.greenL, border: "none", borderRadius: 16, padding: "14px", fontSize: 15, fontWeight: 700, color: T.green, cursor: "pointer" }}>Crear</button>
                    </div>
                  </div>
        </div>}

              </>;
            })()}
          </div>
        </div>


  );
}
