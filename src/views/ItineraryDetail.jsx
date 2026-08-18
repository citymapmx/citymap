import React, { useState, useEffect } from "react";
import { m, Reorder } from "framer-motion";
import { useDataStore } from "../store/useDataStore.js";
import { useAuthStore } from "../store/useAuthStore.js";
import * as dbService from "../services/dbService.js";
import Icon from "../components/ui/Icon.jsx";
import CompactCard from "../components/cards/CompactCard.jsx";
import ItineraryItemCard from "../components/cards/ItineraryItemCard.jsx";
import { getKm } from "../lib/utils.js";

import ItinerarySettingsModal from "../components/modals/ItinerarySettingsModal.jsx";
import SearchPlacesModal from "../components/modals/SearchPlacesModal.jsx";
import { PageLogo } from "../components/Brand.jsx";


export default function ItineraryDetail({ T, dark, navigate, token, id, userCoords }) {
  const { mapPins, experiences, myItineraries } = useDataStore();
  const { user } = useAuthStore();
  
  const [itinerary, setItinerary] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit Settings state
  const [showSettings, setShowSettings] = useState(false);

  // Search Places state
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [addingPlace, setAddingPlace] = useState(false);

  // Time picker state
  const [showTimePickerFor, setShowTimePickerFor] = useState(null);
  const [showFixedTimePickerFor, setShowFixedTimePickerFor] = useState(null);
  const [fixedTimeStr, setFixedTimeStr] = useState("12:00");

  // Note editor state
  const [editingNoteFor, setEditingNoteFor] = useState(null);
  const [editNoteText, setEditNoteText] = useState("");

  // Day picker state
  const [showDayPickerFor, setShowDayPickerFor] = useState(null);

  const isOwner = user && itinerary && itinerary.user_id === user.id;

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        let itinData = null;
        if (token) {
          itinData = await dbService.getItineraryByToken(token);
        } else if (id) {
          itinData = myItineraries.find(i => i.id === id);
        }
        
        if (itinData) {
          setItinerary(itinData);
          const rawItems = await dbService.getItineraryItems(itinData.id);
          
          // First pass: hydrate from in-memory store
          const firstPass = rawItems.map(item => {
            if (!item.biz_id && item.custom_place) {
              return { ...item, biz: { id: `custom_${item.id}`, name: item.custom_place.name, address: item.custom_place.address, lat: item.custom_place.lat, lng: item.custom_place.lng, _isCustom: true } };
            }
            let biz = mapPins.find(b => b.id === item.biz_id);
            if (!biz) {
              const e = experiences.find(x => x.id === item.biz_id);
              if (e) biz = { ...e, name: e.title, photos: e.gallery ? e.gallery.map(url => ({ url })) : null };
            }
            return { ...item, biz };
          });

          // Second pass: fetch from DB any biz_id not found in memory
          const missingIds = firstPass
            .filter(i => i.biz_id && !i.biz)
            .map(i => i.biz_id);

          let fetchedBizMap = {};
          if (missingIds.length > 0) {
            try {
              const fetched = await Promise.all(
                missingIds.map(bizId => dbService.getBusinessBySlugOrId(bizId, true))
              );
              fetched.forEach((result, idx) => {
                if (result && result.length > 0) fetchedBizMap[missingIds[idx]] = result[0];
              });
            } catch (fetchErr) {
              console.warn("Could not fetch missing businesses:", fetchErr);
            }
          }

          const hydrated = firstPass.map(item => {
            if (!item.biz && item.biz_id && fetchedBizMap[item.biz_id]) {
              return { ...item, biz: fetchedBizMap[item.biz_id] };
            }
            return item;
          }).filter(i => i.biz);
          
          setItems(hydrated);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [token, id, myItineraries, mapPins, experiences]);

  const handleShare = () => {
    if (!itinerary) return;
    const url = `https://citymap.mx/plan/${itinerary.share_token}`;
    if (navigator.share) {
      navigator.share({ title: itinerary.title, url }).catch(()=>{});
    } else {
      navigator.clipboard.writeText(url);
      alert("Enlace copiado");
    }
  };

  const handleSetTime = async (itemId, minutes) => {
    try {
      setItems(items.map(i => i.id === itemId ? { ...i, estimated_minutes: minutes } : i));
      setShowTimePickerFor(null);
      await dbService.updateItineraryItemTime(itemId, minutes);
    } catch (e) {
      console.error(e);
      alert("Error al actualizar tiempo");
    }
  };

  const handleSetFixedTime = async (itemId, timeStr) => {
    try {
      setItems(items.map(i => i.id === itemId ? { ...i, fixed_time: timeStr } : i));
      setShowFixedTimePickerFor(null);
      await dbService.updateItineraryItem(itemId, { fixed_time: timeStr });
    } catch (e) {
      console.error(e);
      alert("Error al actualizar hora fija");
    }
  };

  const handleSaveNote = async (itemId) => {
    try {
      setItems(items.map(i => i.id === itemId ? { ...i, notes: editNoteText } : i));
      setEditingNoteFor(null);
      await dbService.updateItineraryItemNote(itemId, editNoteText);
    } catch (e) {
      console.error(e);
      alert("Error al guardar nota");
    }
  };

  const handleChangeDay = async (itemId, dayNumber) => {
    try {
      setItems(items.map(i => i.id === itemId ? { ...i, day_number: dayNumber } : i));
      setShowDayPickerFor(null);
      await dbService.updateItineraryItemDay(itemId, dayNumber);
    } catch (e) {
      console.error(e);
      alert("Error al cambiar de d\u00eda");
    }
  };

  const formatMinutes = (m) => {
    if (!m) return "+ Tiempo estimado";
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return `${h} h${rem > 0 ? ` ${rem} min` : ""}`;
  };

  const formatFullMinutes = (m) => {
    if (!m) return "";
    const h = Math.floor(m / 60);
    const rem = m % 60;
    let str = "";
    if (h > 0) str += `${h} hora${h > 1 ? "s" : ""}`;
    if (rem > 0) {
      if (h > 0) str += " y ";
      str += `${rem} minuto${rem > 1 ? "s" : ""}`;
    }
    return str;
  };

  const handleReorder = async (newItems) => {
    if (!isOwner) return;
    setItems(newItems);
    try {
      await Promise.all(
        newItems.map((item, index) => {
          if (item.sort_order !== index) {
            item.sort_order = index;
            return dbService.updateItineraryItemOrder(item.id, index);
          }
          return Promise.resolve();
        })
      );
    } catch (e) {
      console.error("Error reordering items", e);
    }
  };

  const handleRemove = async (itemId) => {
    if (!isOwner) return;
    setItems(items.filter(i => i.id !== itemId));
    await dbService.deleteItineraryItem(itemId);
  };

  const handleAddPlace = async (biz) => {
    if (!isOwner) return;
    setAddingPlace(true);
    try {
      await dbService.addItineraryItem({
        itinerary_id: itinerary.id,
        biz_id: biz.id,
        sort_order: items.length
      });
      // Reload items to get the DB ID and ensure correctness
      const rawItems = await dbService.getItineraryItems(itinerary.id);
      const hydrated = rawItems.map(item => {
        if (!item.biz_id && item.custom_place) {
          return { ...item, biz: { id: `custom_${item.id}`, name: item.custom_place.name, address: item.custom_place.address, lat: item.custom_place.lat, lng: item.custom_place.lng, _isCustom: true } };
        }
        let b = mapPins.find(p => p.id === item.biz_id);
        if (!b) {
          const e = experiences.find(x => x.id === item.biz_id);
          if (e) b = { ...e, name: e.title, photos: e.gallery ? e.gallery.map(url => ({ url })) : null };
        }
        return { ...item, biz: b };
      }).filter(i => i.biz);
      setItems(hydrated);
      setShowSearchModal(false);
    } catch (e) {
      console.error(e);
      alert("Error al añadir lugar");
    } finally {
      setAddingPlace(false);
    }
  };

  const handleAddCustomPlace = async (placeData) => {
    if (!isOwner) return;
    setAddingPlace(true);
    try {
      await dbService.addItineraryItem({
        itinerary_id: itinerary.id,
        biz_id: null,
        custom_place: placeData,
        sort_order: items.length
      });
      const rawItems = await dbService.getItineraryItems(itinerary.id);
      const hydrated = rawItems.map(item => {
        if (!item.biz_id && item.custom_place) {
          return { ...item, biz: { id: `custom_${item.id}`, name: item.custom_place.name, address: item.custom_place.address, lat: item.custom_place.lat, lng: item.custom_place.lng, _isCustom: true } };
        }
        let b = mapPins.find(p => p.id === item.biz_id);
        if (!b) {
          const e = experiences.find(x => x.id === item.biz_id);
          if (e) b = { ...e, name: e.title, photos: e.gallery ? e.gallery.map(url => ({ url })) : null };
        }
        return { ...item, biz: b };
      }).filter(i => i.biz);
      setItems(hydrated);
      setShowSearchModal(false);
    } catch (e) {
      console.error(e);
      alert("Error al añadir lugar personalizado");
    } finally {
      setAddingPlace(false);
    }
  };

  // Helper function to calculate accumulated time
  const parseTime = (timeStr) => {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };
  const formatTime = (totalMins) => {
    const h = Math.floor(totalMins / 60) % 24;
    const m = totalMins % 60;
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
  };

  const handleOpenRoute = () => {
    if (items.length === 0) return;
    
    // Calculate active origin: User's location if available
    const origLat = userCoords?.lat;
    const origLng = userCoords?.lng;

    let originStr = "";
    let destinationStr = "";
    let waypoints = [];
    
    if (origLat && origLng) {
      originStr = `${origLat},${origLng}`;
      destinationStr = `${items[items.length - 1].biz.lat},${items[items.length - 1].biz.lng}`;
      if (items.length > 1) {
        waypoints = items.slice(0, items.length - 1).map(i => `${i.biz.lat},${i.biz.lng}`);
      } else {
        waypoints = [`${items[0].biz.lat},${items[0].biz.lng}`];
      }
    } else {
      originStr = `${items[0].biz.lat},${items[0].biz.lng}`;
      destinationStr = `${items[items.length - 1].biz.lat},${items[items.length - 1].biz.lng}`;
      if (items.length > 2) {
        waypoints = items.slice(1, -1).map(i => `${i.biz.lat},${i.biz.lng}`);
      }
    }
    
    let url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originStr)}&destination=${encodeURIComponent(destinationStr)}&travelmode=driving`;
    if (waypoints.length > 0) {
      url += `&waypoints=${encodeURIComponent(waypoints.join('|'))}`;
    }
    window.open(url, "_blank");
  };

  let currentAccumulatedMins = null;

  // Determine origin for the first item (User location)
  const originLat = userCoords?.lat;
  const originLng = userCoords?.lng;

  if (items.length > 0 && originLat && originLng && items[0].biz?.lat && items[0].biz?.lng) {
    const km = getKm(originLat, originLng, items[0].biz.lat, items[0].biz.lng);
    const isWalking = km < 0.8;
    const mins = isWalking ? Math.round(km * 12) || 1 : (km > 15 ? Math.round(km * 1.2) : Math.round(km * 2.5)) || 1;
    if (currentAccumulatedMins !== null) {
      currentAccumulatedMins += mins;
    }
  }

  if (loading) {
    return <div style={{ position: "fixed", inset: 0, background: T.bg, zIndex: 8000, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: 30, height: 30, border: `3px solid ${T.border}`, borderTop: `3px solid ${T.text}`, borderRadius: "50%", animation: "spin .8s linear infinite" }} /></div>;
  }

  if (!itinerary) {
    return (
      <div style={{ position: "fixed", inset: 0, background: T.bg, zIndex: 8000, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <Icon name="info" size={40} color={T.sub} />
        <h2 style={{ color: T.text, marginTop: 16 }}>Itinerario no encontrado</h2>
        <button onClick={() => navigate("home")} style={{ marginTop: 20, padding: "12px 24px", borderRadius: 12, background: T.text, color: T.bg, border: "none", fontWeight: 700, cursor: "pointer" }}>Volver al inicio</button>
      </div>
    );
  }

  return (
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
        <div style={{ display: "flex", alignItems: "center", flex: 1, overflow: "hidden" }}>
          <button onClick={() => {
            if (window.history.length > 2) {
              window.history.back();
            } else {
              navigate(isOwner ? "itineraries" : "mis-planes");
            }
          }} style={{ background: "transparent", border: "none", color: T.text, padding: "8px 12px 8px 0", cursor: "pointer", display: "flex", alignItems: "center" }}>
            <Icon name="arrow_left" size={24} color={T.text} />
          </button>
          <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
            <PageLogo dark={dark} />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isOwner && (
            <button onClick={() => setShowSettings(true)} style={{ background: "transparent", border: "none", color: T.text, cursor: "pointer", display: "flex", alignItems: "center", padding: 8 }}>
              <Icon name="settings" size={20} color={T.text} />
            </button>
          )}
          <button onClick={handleShare} style={{ background: "transparent", border: "none", color: T.text, cursor: "pointer", display: "flex", alignItems: "center", padding: 8 }}>
            <Icon name="share" size={20} color={T.text} />
          </button>
        </div>
      </div>

      {/* Cover image banner */}
      {itinerary.cover_image && (
        <div style={{ width: "100%", height: 200, position: "relative", flexShrink: 0, overflow: "hidden" }}>
          <img src={itinerary.cover_image} alt="portada" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "50%", background: `linear-gradient(to top, ${T.white}, transparent)`, pointerEvents: "none" }} />
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>

        {itinerary.start_time && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: T.white, border: `1px dashed ${T.border}`, borderRadius: 16, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon name="clock" size={20} color={T.text} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: T.sub, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Hora de Inicio</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: T.text, marginTop: 2 }}>
                {(() => { const [h, m] = itinerary.start_time.split(":"); const hr = parseInt(h); const ampm = hr >= 12 ? "p.m." : "a.m."; const h12 = hr % 12 || 12; return `${h12}:${m} ${ampm}`; })()}
              </div>
            </div>
          </div>
        )}

        <h1 style={{ margin: "0 0 12px 0", fontSize: 28, fontWeight: 900, color: T.text, fontFamily: "var(--heading)", letterSpacing: "-0.5px", lineHeight: 1.1 }}>
          {itinerary.title}
        </h1>

        {itinerary.author_name && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: T.sub }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: T.border, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="user" size={14} color={T.sub} />
              </div>
              <span>Organizado por: <strong style={{ color: T.text }}>{itinerary.author_name}</strong></span>
            </div>
            {itinerary.author_whatsapp && (
              <button 
                className="press" 
                onClick={() => window.open(`https://wa.me/${itinerary.author_whatsapp}?text=Hola, te contacto sobre tu plan "${itinerary.title}" en CityMap.`, "_blank")}
                style={{ background: "#25D366", border: "none", color: "#fff", display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
              >
                <Icon name="whatsapp" size={14} color="#fff" />
                Contactar
              </button>
            )}
          </div>
        )}

        {itinerary.description && (
          <p style={{ margin: "0 0 20px 0", fontSize: 16, color: T.text, lineHeight: 1.6, whiteSpace: "pre-wrap", textAlign: "left" }}>
            {itinerary.description}
          </p>
        )}

        {itinerary.tags && itinerary.tags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
            {itinerary.tags.map(tag => (
              <span key={tag} style={{ background: T.border, color: T.text, padding: "4px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Date & Duration summary */}
        {(itinerary.start_date || itinerary.total_days > 1) && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, marginBottom: 16 }}>
            <span style={{ fontSize: 18 }}>📅</span>
            <div>
              {itinerary.start_date && (
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>
                  {new Date(itinerary.start_date + "T12:00:00").toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                </div>
              )}
              {itinerary.total_days > 1 && (
                <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>{itinerary.total_days} d\u00edas</div>
              )}
            </div>
          </div>
        )}



        {items.length === 0 ? (
          <div style={{ textAlign: "center", marginTop: 40 }}>
            <p style={{ margin: 0, fontSize: 15, color: T.sub }}>El itinerario está vacío.</p>
            {isOwner && (
              <button 
                className="press"
                onClick={() => setShowSearchModal(true)}
                style={{ marginTop: 20, padding: "14px 28px", borderRadius: 16, background: T.text, color: T.bg, border: "none", fontWeight: 800, fontSize: 15, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}
              >
                <Icon name="plus" size={16} color={T.bg} /> Añadir Lugar
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {(() => {
              // Group items by day_number (default 1)
              const totalDays = itinerary.total_days || 1;
              const days = Array.from({ length: totalDays }, (_, i) => i + 1);
              // Get all unique days actually used in items
              const usedDays = [...new Set(items.map(it => parseInt(it.day_number || 1, 10)))].sort((a,b) => a - b);
              const allDays = [...new Set([...days, ...usedDays])].sort((a,b) => a - b);

              const getDateForDay = (dayNum) => {
                if (!itinerary.start_date) return null;
                const d = new Date(itinerary.start_date + "T12:00:00");
                d.setDate(d.getDate() + (dayNum - 1));
                return d.toLocaleDateString("es-MX", { weekday: "short", month: "short", day: "numeric" });
              };

              let globalIndex = 0; // for numbering across all items
              return allDays.map(dayNum => {
                const dayItems = items.filter(it => parseInt(it.day_number || 1, 10) === dayNum);
                if (dayItems.length === 0) return null;
                const dayDate = getDateForDay(dayNum);

                // Reset per-day accumulated time
                let dayAccumMins = itinerary.start_time ? (() => { const [h, m] = itinerary.start_time.split(":"); return parseInt(h)*60 + parseInt(m); })() : null;

                return (
                  <div key={`day-${dayNum}`} style={{ marginBottom: 24 }}>
                    {/* Day Header */}
                    {(allDays.length > 1 || totalDays > 1) && (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, marginTop: dayNum > 1 ? 8 : 0 }}>
                        <div style={{ background: T.text, color: T.bg, padding: "4px 12px", borderRadius: 16, fontSize: 13, fontWeight: 800 }}>
                          Día {dayNum}
                        </div>
                        {dayDate && (
                          <div style={{ fontSize: 13, color: T.sub, fontWeight: 600 }}>
                            {dayDate}
                          </div>
                        )}
                        <div style={{ flex: 1, height: 1, background: T.border }} />
                      </div>
                    )}

                    <Reorder.Group 
                      axis="y" 
                      values={dayItems} 
                      onReorder={(newDayItems) => {
                        const newFullItems = [...items];
                        let offset = 0;
                        for (let i = 0; i < newFullItems.length; i++) {
                          if (parseInt(newFullItems[i].day_number || 1, 10) === dayNum) {
                            newFullItems[i] = newDayItems[offset];
                            offset++;
                          }
                        }
                        handleReorder(newFullItems);
                      }} 
                      style={{ display: "flex", flexDirection: "column", gap: 16, padding: 0, margin: 0, listStyle: "none" }}
                    >
                    {dayItems.map((item, idx) => {
                      const itemGlobalIndex = globalIndex++;
                      const estimatedArrivalTime = dayAccumMins;
                      if (item.fixed_time) { dayAccumMins = parseTime(item.fixed_time); }
                      const arrivalTime = dayAccumMins;
                      const hasFixedTimeOverride = item.fixed_time && estimatedArrivalTime !== null;

                      if (dayAccumMins !== null) {
                        if (item.estimated_minutes) { dayAccumMins += item.estimated_minutes; }
                        const nextDayItem = dayItems[idx + 1];
                        // Only calculate travel to next item if it's in the SAME day
                        if (nextDayItem && item.biz && nextDayItem.biz && item.biz.lat && item.biz.lng && nextDayItem.biz.lat && nextDayItem.biz.lng) {
                          const km = getKm(item.biz.lat, item.biz.lng, nextDayItem.biz.lat, nextDayItem.biz.lng);
                          const isRunning = itinerary.tags && itinerary.tags.includes("Carrera / Running");
                          const isWalking = km < 0.8 && !isRunning;
                          dayAccumMins += isRunning ? Math.round(km * 6) || 1 : (isWalking ? Math.round(km * 12) || 1 : Math.round(km * 3) || 1);
                        }
                      }

                      return (
                      <Reorder.Item key={item.id} value={item} style={{ position: "relative", marginBottom: 16 }} dragListener={isOwner}>
                        <div style={{ display: "flex", gap: 12, alignItems: "stretch" }}>
                          {/* Timeline Line */}
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 4 }}>
                            <div style={{ width: 28, height: 28, borderRadius: "50%", background: T.text, color: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flexShrink: 0, cursor: isOwner ? "grab" : "default" }}>
                              {isOwner ? <Icon name="grip" size={14} color={T.bg} /> : itemGlobalIndex + 1}
                            </div>
                            {idx < dayItems.length - 1 && (
                              <div style={{ width: 2, minHeight: 60, height: "100%", background: T.border, marginTop: 4, flex: 1, borderRadius: 2 }} />
                            )}
                          </div>

                          {/* Card & Time */}
                          <div style={{ flex: 1, paddingBottom: idx < dayItems.length - 1 ? 24 : 0 }}>
                            {arrivalTime !== null && (
                              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: idx === 0 ? 20 : 8 }}>
                                {hasFixedTimeOverride ? (
                                  <>
                                    <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12, fontWeight: 600, color: T.sub }}>
                                      <Icon name="clock" size={12} color={T.sub} /> Estimada {formatTime(estimatedArrivalTime)}
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 12, fontWeight: 700, color: "#b91c1c" }}>
                                      <Icon name="clock" size={12} color="#b91c1c" /> Fijada {formatTime(arrivalTime)}
                                    </div>
                                  </>
                                ) : (
                                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: T.sub }}>
                                    <Icon name="clock" size={14} color={T.sub} /> Llegada {formatTime(arrivalTime)} <span style={{ opacity: 0.6, fontSize: 11 }}>(aprox.)</span>
                                  </div>
                                )}
                              </div>
                            )}
                            <div style={{ position: "relative" }}>
                              {idx === 0 && dayNum === 1 && (
                                <div style={{ position: "absolute", top: -12, left: 24, display: "inline-flex", alignItems: "center", gap: 4, padding: "0 8px", height: 18, background: "#22c55e", borderRadius: 12, zIndex: 11, boxShadow: "0 2px 6px rgba(34,197,94,0.2)" }}>
                                  <span style={{ fontSize: 10 }}>🚩</span>
                                  <span style={{ fontSize: 9, fontWeight: 800, color: "#fff", letterSpacing: "0.5px", lineHeight: 1 }}>PUNTO DE PARTIDA</span>
                                </div>
                              )}
                              <ItineraryItemCard
                                item={item}
                                T={T}
                                dark={dark}
                                note={editingNoteFor !== item.id ? item.notes : null}
                                onEditNote={isOwner ? () => { setEditingNoteFor(item.id); setEditNoteText(item.notes); } : null}
                                stayTimeStr={formatFullMinutes(item.estimated_minutes)}
                              />
                              {isOwner && (
                                <button
                                  onClick={() => handleRemove(item.id)}
                                  style={{ position: "absolute", top: -8, right: -8, width: 28, height: 28, borderRadius: "50%", background: T.bg, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 10, boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}
                                >
                                  <Icon name="x" size={14} color={T.sub} />
                                </button>
                              )}
                            </div>

                            {/* Owner action buttons */}
                            {isOwner && (
                              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                  <button
                                    className="press"
                                    onClick={() => setShowFixedTimePickerFor(showFixedTimePickerFor === item.id ? null : item.id)}
                                    style={{ background: item.fixed_time ? T.text : T.bg, border: `1.5px solid ${item.fixed_time ? T.text : T.border}`, padding: "6px 12px", borderRadius: 12, fontSize: 12, fontWeight: 700, color: item.fixed_time ? T.bg : T.text, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", transition: "0.2s" }}
                                  >
                                    <Icon name="clock" size={14} color={item.fixed_time ? T.bg : T.text} />
                                    {item.fixed_time ? formatTime(parseTime(item.fixed_time)) : "Fijar hora"}
                                  </button>

                                  <button
                                    className="press"
                                    onClick={() => setShowTimePickerFor(showTimePickerFor === item.id ? null : item.id)}
                                    style={{ background: item.estimated_minutes ? T.text : T.bg, border: `1.5px solid ${item.estimated_minutes ? T.text : T.border}`, padding: "6px 12px", borderRadius: 12, fontSize: 12, fontWeight: 700, color: item.estimated_minutes ? T.bg : T.text, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", transition: "0.2s" }}
                                  >
                                    <Icon name="clock" size={14} color={item.estimated_minutes ? T.bg : T.text} />
                                    {item.estimated_minutes ? `Estancia: ${formatMinutes(item.estimated_minutes)}` : "Tiempo en el lugar"}
                                  </button>

                                  {/* Day selector button */}
                                  {(itinerary.total_days > 1 || items.some(it => (it.day_number || 1) > 1)) && (
                                    <button
                                      className="press"
                                      onClick={() => setShowDayPickerFor(showDayPickerFor === item.id ? null : item.id)}
                                      style={{ background: T.bg, border: `1.5px solid ${T.border}`, padding: "6px 12px", borderRadius: 12, fontSize: 12, fontWeight: 700, color: T.text, display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}
                                    >
                                      📆 D\u00eda {item.day_number || 1}
                                    </button>
                                  )}

                                  {!item.notes && editingNoteFor !== item.id && (
                                    <button
                                      className="press"
                                      onClick={() => { setEditingNoteFor(item.id); setEditNoteText(""); }}
                                      style={{ background: T.bg, border: `1.5px solid ${T.border}`, padding: "6px 12px", borderRadius: 12, fontSize: 12, fontWeight: 700, color: T.text, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", transition: "0.2s" }}
                                    >
                                      <Icon name="edit" size={14} color={T.text} /> Nota
                                    </button>
                                  )}
                                </div>

                                {/* Day picker panel */}
                                {showDayPickerFor === item.id && (
                                  <m.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: 10, display: "flex", gap: 6, flexWrap: "wrap", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", marginTop: 4 }}>
                                    <div style={{ width: "100%", fontSize: 11, fontWeight: 700, color: T.sub, marginBottom: 2 }}>Mover a d\u00eda:</div>
                                    {Array.from({ length: Math.max(itinerary.total_days || 1, Math.max(...items.map(it => it.day_number || 1))) }, (_, i) => i + 1).map(d => (
                                      <button key={d} onClick={() => handleChangeDay(item.id, d)} style={{ padding: "7px 14px", borderRadius: 10, background: (item.day_number || 1) === d ? T.text : T.bg, color: (item.day_number || 1) === d ? T.bg : T.text, border: `1px solid ${(item.day_number || 1) === d ? T.text : T.border}`, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                                        D\u00eda {d}
                                      </button>
                                    ))}
                                  </m.div>
                                )}

                                {showFixedTimePickerFor === item.id && (
                                  <m.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: 12, display: "flex", flexWrap: "wrap", gap: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.05)", zIndex: 10, marginTop: 4, width: "100%" }}>
                                    <input
                                      type="time"
                                      value={fixedTimeStr}
                                      onChange={(e) => setFixedTimeStr(e.target.value)}
                                      style={{ padding: "6px 10px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 14, color: T.text, outline: "none", background: T.bg }}
                                    />
                                    <button onClick={() => handleSetFixedTime(item.id, fixedTimeStr)} style={{ padding: "6px 14px", background: T.text, color: T.bg, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Guardar hora</button>
                                    {item.fixed_time && (
                                      <button onClick={() => handleSetFixedTime(item.id, null)} style={{ padding: "6px 10px", background: "#fee2e2", color: "#b91c1c", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Quitar</button>
                                    )}
                                  </m.div>
                                )}

                                {showTimePickerFor === item.id && (() => {
                                  const customH = Math.floor((item.estimated_minutes || 0) / 60);
                                  const customM = (item.estimated_minutes || 0) % 60;
                                  return (
                                  <m.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: 10, display: "flex", flexDirection: "column", gap: 6, boxShadow: "0 4px 12px rgba(0,0,0,0.05)", zIndex: 10, marginTop: 4 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: T.sub, marginBottom: 2 }}>¿Cuánto tiempo estarás aquí?</div>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                      {[
                                        { mins: 30, label: "🏃 Rápida (30m)" },
                                        { mins: 60, label: "⭐ Típica (1h)" },
                                        { mins: 90, label: "😌 Calma (1.5h)" },
                                        { mins: 120, label: "☕ Relajado (2h)" },
                                        { mins: 180, label: "📸 Tour (3h)" }
                                      ].map(opt => (
                                        <button key={opt.mins} onClick={() => handleSetTime(item.id, opt.mins)} style={{ padding: "8px 12px", background: item.estimated_minutes === opt.mins ? T.text : T.bg, color: item.estimated_minutes === opt.mins ? T.bg : T.text, border: `1px solid ${item.estimated_minutes === opt.mins ? T.text : T.border}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "0.2s" }}>
                                          {opt.label}
                                        </button>
                                      ))}
                                    </div>
                                    {/* Custom time row */}
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, padding: "8px 10px", background: T.bg, borderRadius: 10, border: `1px solid ${T.border}` }}>
                                      <span style={{ fontSize: 12, fontWeight: 700, color: T.sub, flexShrink: 0 }}>Personalizar:</span>
                                      <select
                                        value={customH}
                                        onChange={e => {
                                          const h = parseInt(e.target.value);
                                          const total = h * 60 + customM;
                                          if (total > 0) handleSetTime(item.id, total);
                                        }}
                                        style={{ padding: "4px 8px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.white, color: T.text, fontSize: 13, fontWeight: 700, outline: "none" }}
                                      >
                                        {Array.from({ length: 13 }, (_, i) => i).map(h => (
                                          <option key={h} value={h}>{h}h</option>
                                        ))}
                                      </select>
                                      <select
                                        value={customM}
                                        onChange={e => {
                                          const m = parseInt(e.target.value);
                                          const total = customH * 60 + m;
                                          if (total > 0) handleSetTime(item.id, total);
                                        }}
                                        style={{ padding: "4px 8px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.white, color: T.text, fontSize: 13, fontWeight: 700, outline: "none" }}
                                      >
                                        {[0, 15, 30, 45].map(m => (
                                          <option key={m} value={m}>{m}min</option>
                                        ))}
                                      </select>
                                    </div>
                                    {item.estimated_minutes && (
                                      <button onClick={() => handleSetTime(item.id, null)} style={{ marginTop: 4, alignSelf: "flex-start", padding: "6px 12px", background: "#fee2e2", color: "#b91c1c", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Quitar estimación</button>
                                    )}
                                  </m.div>
                                  );
                                })()}

                                {/* Note editor */}
                                {editingNoteFor === item.id && (
                                  <m.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} style={{ width: "100%", display: "flex", flexDirection: "column", gap: 6 }}>
                                    <textarea
                                      autoFocus
                                      value={editNoteText}
                                      onChange={(e) => setEditNoteText(e.target.value)}
                                      placeholder="Escribe una nota para este lugar..."
                                      style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 12, border: `1px solid ${T.border}`, background: T.white, color: T.text, fontSize: 13, minHeight: 60, resize: "none", outline: "none", fontFamily: "inherit" }}
                                    />
                                    <div style={{ display: "flex", gap: 8, alignSelf: "flex-end" }}>
                                      <button onClick={() => setEditingNoteFor(null)} style={{ padding: "6px 12px", borderRadius: 8, background: "transparent", color: T.sub, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
                                      <button onClick={() => handleSaveNote(item.id)} style={{ padding: "6px 12px", borderRadius: 8, background: T.text, color: T.bg, border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Guardar</button>
                                    </div>
                                  </m.div>
                                )}
                              </div>
                            )}

                            {/* Distance to NEXT item within the same day */}
                            {idx < dayItems.length - 1 && (
                              <div style={{ marginTop: 16, display: "flex" }}>
                                {(() => {
                                  const nextItem = dayItems[idx + 1];
                                  if (item.biz && nextItem.biz && item.biz.lat && item.biz.lng && nextItem.biz.lat && nextItem.biz.lng) {
                                    const km = getKm(item.biz.lat, item.biz.lng, nextItem.biz.lat, nextItem.biz.lng);
                                    const isRunning = itinerary.tags && itinerary.tags.includes("Carrera / Running");
                                    const isWalking = km < 0.8 && !isRunning;
                                    let mins;
                                    if (isRunning) { mins = Math.round(km * 6) || 1; }
                                    else if (isWalking) { mins = Math.round(km * 12) || 1; }
                                    else { mins = km > 15 ? Math.round(km * 1.2) : Math.round(km * 2.5); mins = mins || 1; }
                                    return (
                                      <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12, padding: "6px 12px", fontSize: 12, fontWeight: 700, color: T.sub, display: "flex", alignItems: "center", gap: 6, boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                                        <span>{isRunning ? "\ud83c\udfc3" : isWalking ? "\ud83d\udeb6" : "\ud83d\ude97"}</span>
                                        {mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)} h ${mins % 60 > 0 ? (mins % 60) + ' min' : ''}`} {km >= 1 && <span style={{ opacity: 0.6 }}>({km.toFixed(1)} km)</span>}
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            )}
                          </div>
                        </div>
                      </Reorder.Item>
                      );
                    })}
                    </Reorder.Group>
                  </div>
                );
              });
            })()}
            
            {isOwner && items.length > 0 && (
              <div style={{ display: "flex", justifyContent: "center", marginTop: 16, marginBottom: 32 }}>
                <button 
                  className="press"
                  onClick={() => setShowSearchModal(true)}
                  style={{ padding: "14px 28px", borderRadius: 16, background: T.text, color: T.bg, border: "none", fontWeight: 800, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}
                >
                  <Icon name="plus" size={16} color={T.bg} />
                  Añadir otro lugar
                </button>
              </div>
            )}
          </div>
        )}

        {/* Lista de equipaje / Recomendaciones */}
        {itinerary.packing_list && itinerary.packing_list.length > 0 && (
          <div style={{ marginTop: 32, marginBottom: 32, padding: "20px", background: dark ? "rgba(255,255,255,0.03)" : "#f9f9f9", borderRadius: 16, border: `1px solid ${T.border}` }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: 14, fontWeight: 800, color: T.text, letterSpacing: "0.5px", textTransform: "uppercase" }}>
              🎒 Qué recomendamos llevar
            </h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {itinerary.packing_list.map((item, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: T.white, border: `1px solid ${T.border}`, borderRadius: 20, fontSize: 14, fontWeight: 600, color: T.text, boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                  {item}
                </div>
              ))}
            </div>
          </div>
        )}

        {items.length > 0 && (
          <button
            className="press"
            onClick={handleOpenRoute}
            style={{ width: "100%", padding: "14px", borderRadius: 16, background: T.text, color: T.bg, border: "none", fontWeight: 700, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 24, marginBottom: 32, boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}
          >
            <Icon name="navigation" size={18} color={T.bg} />
            Ver ruta en Google Maps
          </button>
        )}
      </div>

      {showSettings && (
        <ItinerarySettingsModal 
          T={T}
          itinerary={itinerary}
          onClose={() => setShowSettings(false)}
          onSave={(updated) => setItinerary(updated)}
        />
      )}

      {showSearchModal && (
        <SearchPlacesModal 
          T={T}
          mapPins={mapPins}
          experiences={experiences}
          onClose={() => setShowSearchModal(false)}
          onPlaceSelected={handleAddPlace}
          onCustomPlaceSelected={handleAddCustomPlace}
          addingPlace={addingPlace}
        />
      )}
    </m.div>
  );
}
