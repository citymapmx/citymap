import React, { useState, useEffect, useRef } from 'react';
import useGMaps from '../map/useGMaps.js';
import { useAuthStore } from '../../store/useAuthStore';
import { useDataStore } from '../../store/useDataStore';
import { useUIStore } from '../../store/useUIStore';
import { sb } from '../../lib/supabase';
import { getT, EVENT_CATEGORIES } from '../../lib/constants';
import { createSlug, randomToken } from '../../lib/utils';
import { privateEventUrl } from '../../lib/privateEvents.js';
import { EVENT_IMAGE_OPTIMIZE } from '../../lib/imageOptimize.js';
import Icon from '../ui/Icon';
import Uploader from '../Uploader';

const STEPS = [
  { n: 1, label: 'El evento' },
  { n: 2, label: 'Cuándo y dónde' },
  { n: 3, label: 'Entradas y contacto' },
];

const EMPTY_FORM = {
  title: "", description: "", date: "", time: "",
  price_type: "gratis", price: "",
  event_category: "", venue_name: "", venue_address: "",
  whatsapp: "", website: "", img_url: "", lat: null, lng: null
};

export default function CreateEventModal({ showCreateEvent, setShowCreateEvent }) {
  const { user } = useAuthStore();
  const { events } = useDataStore();
  const { activeCity, dark, toast$, setSelectedEvent } = useUIStore();

  const T = getT(dark);

  const mapsOk = useGMaps();
  const venueRef = useRef(null);

  const [step, setStep] = useState(1);
  const [showManualAddr, setShowManualAddr] = useState(false);
  const [createEvForm, setCreateEvForm] = useState(EMPTY_FORM);
  const [isPrivate, setIsPrivate] = useState(false);
  const [createdPrivate, setCreatedPrivate] = useState(null);

  // El autocompletado de Google solo existe en el paso 2 (ahí se renderiza
  // el input del lugar), así que se (re)inicializa cuando cambia el paso.
  useEffect(() => {
    if (!mapsOk || !venueRef.current || !showCreateEvent) return;

    let styleEl = document.getElementById("pac-z-fix-events-modal");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "pac-z-fix-events-modal";
      styleEl.textContent = `.pac-container { z-index: 9999999 !important; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important; margin-top: 4px; border: none; }`;
      document.head.appendChild(styleEl);
    }

    let ac;
    const init = () => {
      if (!venueRef.current) return;
      try {
        ac = new window.google.maps.places.Autocomplete(venueRef.current, {
          fields: ["name", "formatted_address", "geometry"],
        });
        ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          if (place && place.name) {
            setCreateEvForm(prev => ({
              ...prev,
              venue_name: place.name,
              venue_address: place.formatted_address || place.name,
              lat: place.geometry?.location?.lat() || null,
              lng: place.geometry?.location?.lng() || null
            }));
          }
        });
      } catch (e) {
        console.warn("Google Maps Autocomplete error:", e);
      }
    };

    const timer = setTimeout(init, 100);
    return () => {
      clearTimeout(timer);
      if (ac && window.google?.maps?.event) window.google.maps.event.clearInstanceListeners(ac);
    };
  }, [mapsOk, showCreateEvent, step]);

  // Al abrir el modal siempre se empieza en el paso 1 (el borrador se conserva).
  useEffect(() => {
    if (showCreateEvent) setStep(1);
  }, [showCreateEvent]);

  if (!showCreateEvent) return null;

  const close = () => { setShowCreateEvent(false); setStep(1); setIsPrivate(false); setCreatedPrivate(null); };

  const canContinue = () => {
    if (step === 1 && !createEvForm.title.trim()) { toast$("El título es obligatorio"); return false; }
    if (step === 2 && !createEvForm.date) { toast$("La fecha es obligatoria"); return false; }
    return true;
  };

  const submitEvent = async () => {
    if (!createEvForm.title.trim()) { toast$("El título es obligatorio"); return; }
    try {
      let baseSlug = createSlug(createEvForm.title);
      if (!baseSlug.startsWith(activeCity + "-")) baseSlug = `${activeCity}-${baseSlug}`;
      // El enlace secreto ES la URL: el slug del privado lleva un sufijo
      // aleatorio que nadie puede adivinar.
      if (isPrivate) baseSlug = `${baseSlug}-${randomToken(6)}`;
      let newSlug = baseSlug;
      let counter = 1;
      while (events.some(e => e.slug === newSlug)) { newSlug = `${baseSlug}-${counter++}`; }

      // El privado no pasa por aprobación (nunca sale en público): queda
      // activo de inmediato y solo se abre con su enlace.
      const rows = await sb.post("events", {
        ...createEvForm,
        slug: newSlug,
        city_slug: activeCity,
        user_id: user.id,
        visibility: isPrivate ? "private" : "public",
        status: isPrivate ? "approved" : "pending",
        active: isPrivate ? true : false,
      });
      if (isPrivate) {
        const created = Array.isArray(rows) && rows[0] ? rows[0] : { ...createEvForm, slug: newSlug, city_slug: activeCity, visibility: "private" };
        setCreatedPrivate(created);
        toast$("Evento privado creado");
        return;
      }
      toast$("Evento enviado para revisión");
      close();
      setCreateEvForm(EMPTY_FORM);
      setShowManualAddr(false);
    } catch (e) {
      toast$("Error: " + e.message);
    }
  };

  const formattedDate = () => {
    if (!createEvForm.date) return "";
    try {
      return new Date(createEvForm.date + "T00:00:00").toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
    } catch {
      return createEvForm.date;
    }
  };

  const labelStyle = { fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: .6, marginBottom: 6 };

  return (
    <div
      onClick={close}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", backdropFilter: "blur(8px)",
        zIndex: 999999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 440, maxHeight: "calc(100dvh - 48px)", overflowY: "auto",
          background: T.white, borderRadius: 24, padding: "20px 18px 16px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
        }}
      >
        {/* ── Encabezado ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <h2 className="text-xl" style={{ fontFamily: "var(--heading)", color: T.text, marginBottom: 4 }}>Crear evento</h2>
            <p className="text-sm" style={{ color: T.sub }}>{isPrivate ? "Solo visible con el enlace secreto · sin aprobación" : "Se publicará tras la aprobación del admin"}</p>
          </div>
          <button onClick={close} style={{ width: 36, height: 36, borderRadius: "50%", background: T.border, color: T.text, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}><Icon name="x" size={16} /></button>
        </div>

        {createdPrivate && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 4 }}>
            <div style={{ textAlign: "center", padding: "8px 0 0" }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🔒</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: T.text }}>¡Tu evento privado está listo!</div>
              <div style={{ fontSize: 13, color: T.sub, marginTop: 4 }}>Solo quien tenga este enlace podrá verlo. No sale en público.</div>
            </div>
            <div style={{ background: T.bg, border: `1.5px solid ${T.border}`, borderRadius: 12, padding: "12px 14px", fontSize: 13, color: T.text, wordBreak: "break-all", textAlign: "left" }}>{privateEventUrl(createdPrivate)}</div>
            <button onClick={() => { navigator.clipboard?.writeText(privateEventUrl(createdPrivate)); toast$("Enlace secreto copiado"); }} style={{ padding: "13px 0", background: T.green, border: "none", borderRadius: 14, fontSize: 14, fontWeight: 800, color: dark ? "#18181B" : "#FFFFFF", cursor: "pointer", fontFamily: "inherit" }}>Copiar enlace secreto</button>
            <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Te invito a mi evento privado: ${createdPrivate.title || "Evento"} ${privateEventUrl(createdPrivate)}`)}`, "_blank")} style={{ padding: "13px 0", background: "#25D366", border: "none", borderRadius: 14, fontSize: 14, fontWeight: 800, color: "#FFFFFF", cursor: "pointer", fontFamily: "inherit" }}>Compartir por WhatsApp</button>
            <button onClick={() => { const ev = createdPrivate; close(); setCreateEvForm(EMPTY_FORM); setShowManualAddr(false); setSelectedEvent(ev); }} style={{ padding: "13px 0", background: "transparent", border: `1.5px solid ${T.border}`, borderRadius: 14, fontSize: 14, fontWeight: 800, color: T.text, cursor: "pointer", fontFamily: "inherit" }}>Abrir evento</button>
          </div>
        )}
        {!createdPrivate && (<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* ── PASO 1: El evento ── */}
          {step === 1 && (
            <>
              <div>
                <div className="text-xs" style={labelStyle}>Imagen del evento</div>
                <Uploader onDone={url => setCreateEvForm(f => ({ ...f, img_url: url }))} optimize={EVENT_IMAGE_OPTIMIZE} />
                {createEvForm.img_url && <img src={createEvForm.img_url} alt="" style={{ width: "100%", height: 110, objectFit: "cover", borderRadius: 10, marginTop: 8 }} loading="lazy" />}
              </div>
              <div><div className="text-xs" style={labelStyle}>Título</div><input className="inp" placeholder="Nombre del evento" value={createEvForm.title} onChange={e => setCreateEvForm(f => ({ ...f, title: e.target.value }))} /></div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: T.greenL, borderRadius: 12, padding: "10px 12px" }}>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: T.text }}>🔒 Evento privado</div>
                  <div style={{ fontSize: 12, color: T.sub }}>Solo quien tenga el enlace podrá verlo. No sale en público ni necesita aprobación.</div>
                </div>
                <button type="button" role="switch" aria-checked={isPrivate} aria-label="Evento privado" onClick={() => setIsPrivate(v => !v)} style={{ width: 48, height: 28, borderRadius: 9999, border: "none", background: isPrivate ? T.green : T.border, position: "relative", cursor: "pointer", flexShrink: 0, padding: 0 }}>
                  <span style={{ position: "absolute", top: 3, left: isPrivate ? 23 : 3, width: 22, height: 22, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.3)", transition: "left .15s ease" }} />
                </button>
              </div>
              <div><div className="text-xs" style={labelStyle}>Descripción</div><textarea className="inp" placeholder="Describe el evento..." rows={3} value={createEvForm.description} onChange={e => setCreateEvForm(f => ({ ...f, description: e.target.value }))} style={{ resize: "none", height: 64 }} /></div>
              <div>
                <div className="text-xs" style={{ ...labelStyle, marginBottom: 6 }}>Categoría</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
                  {EVENT_CATEGORIES.map(cat => {
                    const isPreset = EVENT_CATEGORIES.filter(c => c !== "Otro").includes(createEvForm.event_category);
                    const isSelected = createEvForm.event_category === cat || (cat === "Otro" && createEvForm.event_category && !isPreset);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          if (cat === "Otro") {
                            setCreateEvForm(f => ({ ...f, event_category: isPreset ? "" : f.event_category }));
                          } else {
                            setCreateEvForm(f => ({ ...f, event_category: cat }));
                          }
                        }}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 9999,
                          border: isSelected ? "none" : `1.5px solid ${T.border}`,
                          background: isSelected ? (dark ? "#FFFFFF" : "#0F172A") : (dark ? "rgba(255,255,255,0.06)" : "#F8FAFC"),
                          color: isSelected ? (dark ? "#000000" : "#FFFFFF") : T.text,
                          fontSize: 12,
                          fontWeight: isSelected ? 800 : 600,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          fontFamily: "inherit"
                        }}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
                {(!createEvForm.event_category || !EVENT_CATEGORIES.filter(c => c !== "Otro").includes(createEvForm.event_category)) && (
                  <input
                    className="inp"
                    placeholder="Escribe otra categoría..."
                    value={createEvForm.event_category || ""}
                    onChange={e => setCreateEvForm(f => ({ ...f, event_category: e.target.value }))}
                    style={{ marginTop: 4 }}
                  />
                )}
              </div>
            </>
          )}

          {/* ── PASO 2: Cuándo y dónde ── */}
          {step === 2 && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><div className="text-xs" style={labelStyle}>Fecha</div><input type="date" value={createEvForm.date} onChange={e => setCreateEvForm(f => ({ ...f, date: e.target.value }))} style={{ width: "100%", padding: "12px 14px", background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 12, fontSize: 14, color: T.text, fontFamily: "inherit" }} /></div>
                <div><div className="text-xs" style={labelStyle}>Hora</div><input type="time" value={createEvForm.time} onChange={e => setCreateEvForm(f => ({ ...f, time: e.target.value }))} style={{ width: "100%", padding: "12px 14px", background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 12, fontSize: 14, color: T.text, fontFamily: "inherit" }} /></div>
              </div>
              <div>
                <div className="text-xs" style={{ ...labelStyle, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    Lugar del Evento {mapsOk && <img src="/googlelogo.svg" style={{ height: 12 }} alt="Google" />}
                  </div>
                  {!showManualAddr && (
                    <button
                      onClick={(e) => { e.preventDefault(); setShowManualAddr(true); }}
                      style={{ background: "transparent", border: "none", color: "#1A7A5E", fontWeight: 700, fontSize: 11, cursor: "pointer", padding: 0 }}
                    >
                      ¿Ingresar manual?
                    </button>
                  )}
                </div>
                <input
                  ref={venueRef}
                  className="inp"
                  placeholder="Ej: Auditorio Telmex (Buscar con Google)..."
                  value={createEvForm.venue_name || ""}
                  onChange={e => {
                    setCreateEvForm(f => ({ ...f, venue_name: e.target.value }));
                    if (!showManualAddr) setCreateEvForm(f => ({ ...f, venue_address: e.target.value }));
                  }}
                />
              </div>
              {showManualAddr && (
                <div style={{ animation: "fadeIn 0.3s ease" }}>
                  <div className="text-xs" style={{ ...labelStyle, display: "flex", justifyContent: "space-between" }}>
                    Dirección Manual
                    <button
                      onClick={(e) => { e.preventDefault(); setShowManualAddr(false); setCreateEvForm(f => ({ ...f, venue_address: f.venue_name })); }}
                      style={{ background: "transparent", border: "none", color: "#D94F3D", fontWeight: 700, fontSize: 11, cursor: "pointer", padding: 0 }}
                    >
                      Ocultar
                    </button>
                  </div>
                  <input
                    className="inp"
                    placeholder="Av. México 123, Colonia Centro..."
                    value={createEvForm.venue_address}
                    onChange={e => setCreateEvForm(f => ({ ...f, venue_address: e.target.value }))}
                  />
                </div>
              )}
            </>
          )}

          {/* ── PASO 3: Entradas y contacto ── */}
          {step === 3 && (
            <>
              <div><div className="text-xs" style={{ ...labelStyle, marginBottom: 8 }}>Precio</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {["gratis", "paid"].map(pt => <button key={pt} onClick={() => setCreateEvForm(f => ({ ...f, price_type: pt }))} style={{ flex: 1, padding: "10px 0", border: `1.5px solid ${createEvForm.price_type === pt ? T.green : T.border}`, borderRadius: 10, fontSize: 13, fontWeight: 700, background: createEvForm.price_type === pt ? T.greenL : T.white, color: createEvForm.price_type === pt ? T.green : T.sub, cursor: "pointer", fontFamily: "inherit" }}>{pt === "gratis" ? "Gratis" : "De pago"}</button>)}
                </div>
                {createEvForm.price_type === "paid" && <input className="inp" placeholder="Ej: $200" value={createEvForm.price} onChange={e => setCreateEvForm(f => ({ ...f, price: e.target.value }))} style={{ marginTop: 8 }} />}
              </div>
              <div><div className="text-xs" style={labelStyle}>WhatsApp de contacto</div><input className="inp" placeholder="3111234567" value={createEvForm.whatsapp} onChange={e => setCreateEvForm(f => ({ ...f, whatsapp: e.target.value }))} /></div>
              <div><div className="text-xs" style={labelStyle}>Sitio web / Boletos <span className="text-micro" style={{ opacity: 0.6 }}>(Opcional)</span></div><input className="inp" placeholder="https://..." value={createEvForm.website || ""} onChange={e => setCreateEvForm(f => ({ ...f, website: e.target.value }))} /></div>
              <div style={{ background: T.greenL, borderRadius: 12, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: T.sub, textTransform: "uppercase", letterSpacing: .6 }}>Tu evento</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>{createEvForm.title || "Sin título"}</div>
                {formattedDate() && <div style={{ fontSize: 13, color: T.sub }}>{formattedDate()}{createEvForm.time ? ` · ${createEvForm.time}` : ""}</div>}
                {createEvForm.venue_name && <div style={{ fontSize: 13, color: T.sub }}>{createEvForm.venue_name}</div>}
                {createEvForm.event_category && <div style={{ fontSize: 13, color: T.sub }}>{createEvForm.event_category}</div>}
                {isPrivate && <div style={{ fontSize: 13, color: T.sub }}>🔒 Privado · solo con el enlace secreto</div>}
              </div>
            </>
          )}

          {/* ── Navegación: flecha atrás, puntos, continuar ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
            {step > 1 ? (
              <button aria-label="Atrás" onClick={() => setStep(s => s - 1)} style={{ width: 44, height: 44, borderRadius: "50%", background: "transparent", border: `1.5px solid ${T.border}`, color: T.text, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}><Icon name="arrow_left" size={18} /></button>
            ) : (
              <div style={{ width: 44, height: 44, flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
              {STEPS.map(s => (
                <span key={s.n} style={{ width: step === s.n ? 22 : 8, height: 8, borderRadius: 9999, background: step >= s.n ? T.green : T.border, transition: "width .2s ease" }} />
              ))}
            </div>
            {step < 3 ? (
              <button onClick={() => { if (canContinue()) setStep(s => s + 1); }} style={{ padding: "13px 18px", background: T.green, border: "none", borderRadius: 14, fontSize: 14, fontWeight: 800, color: dark ? "#18181B" : "#FFFFFF", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>Continuar<Icon name="arrow_right" size={16} /></button>
            ) : (
              <button onClick={submitEvent} style={{ padding: "13px 18px", background: T.green, border: "none", borderRadius: 14, fontSize: 14, fontWeight: 800, color: dark ? "#18181B" : "#FFFFFF", cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>{isPrivate ? "Crear evento privado" : "Enviar evento"}</button>
            )}
          </div>
        </div>)}
      </div>
    </div>
  );
}
