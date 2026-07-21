import React, { useState } from 'react';
import Icon from './ui/Icon.jsx';

export default function BookingManager({ bookingConfig, onChange, T }) {
  const config = bookingConfig || {};
  const [newSvcName, setNewSvcName] = useState("");
  const [newSvcPrice, setNewSvcPrice] = useState("");
  
  // Advanced Fields
  const [newSvcDuration, setNewSvcDuration] = useState(60);
  const [newSvcStartTime, setNewSvcStartTime] = useState("");
  const [newSvcEndTime, setNewSvcEndTime] = useState("");
  const [hasCustomHours, setHasCustomHours] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showTechSettings, setShowTechSettings] = useState(false);

  const toggleEnabled = () => onChange({ ...config, enabled: !config.enabled });
  
  const setField = (field, value) => {
    onChange({ ...config, [field]: value });
  };

  const addService = () => {
    if (!newSvcName.trim()) return;
    const services = config.services || [];
    let timeRange = "";
    if (hasCustomHours && newSvcStartTime && newSvcEndTime) {
      timeRange = `${newSvcStartTime} - ${newSvcEndTime}`;
    }
    const newSvc = {
      id: "svc_" + Date.now(),
      name: newSvcName.trim(),
      price: newSvcPrice.trim() || "0",
      durationMin: parseInt(newSvcDuration) || 60,
      timeRange
    };
    onChange({ ...config, services: [...services, newSvc] });
    setNewSvcName("");
    setNewSvcPrice("");
    setNewSvcDuration(60);
    setNewSvcStartTime("");
    setNewSvcEndTime("");
    setHasCustomHours(false);
    setShowAdvanced(false);
  };

  const removeService = (id) => {
    const services = config.services || [];
    onChange({ ...config, services: services.filter(s => s.id !== id) });
  };

  return (
    <div style={{ background: T?.white || "#fff", borderRadius: 14, padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,.05)", border: `1px solid ${T?.border || "#E4E8E4"}`, marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: config.enabled ? "#DCFCE7" : "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="calendar" size={16} color={config.enabled ? "#16A34A" : "#9CA3AF"} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: T?.text || "#0F1A14" }}>Pedidos y Reservaciones</div>
            <div style={{ fontSize: 11, color: T?.sub || "#5A6872" }}>Activa esto para vender desde tu perfil</div>
          </div>
        </div>
        <button type="button" onClick={toggleEnabled} style={{ width: 44, height: 24, borderRadius: 12, background: config.enabled ? "#1A7A5E" : "#D1D5DB", border: "none", position: "relative", cursor: "pointer", transition: "all 0.2s" }}>
          <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: config.enabled ? 22 : 2, transition: "all 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
        </button>
      </div>

      {config.enabled && (
        <div style={{ marginTop: 20 }}>
          {!config.type ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, animation: "fadeIn 0.3s ease" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T?.text || "#0F1A14", textAlign: "center", marginBottom: 4 }}>¿Cómo quieres recibir a tus clientes?</div>
              
              <button type="button" onClick={() => setField("type", "native")} className="press" style={{ padding: 16, borderRadius: 12, border: `1.5px solid ${T?.border || "#E4E8E4"}`, background: T?.bg || "#F9FAFB", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "left", boxShadow: "0 2px 6px rgba(0,0,0,0.03)" }}>
                <div style={{ fontSize: 26 }}>📋</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: T?.text || "#0F1A14" }}>Crear mi menú o catálogo aquí</div>
                  <div style={{ fontSize: 11, color: T?.sub || "#5A6872", marginTop: 2, lineHeight: 1.3 }}>Vende tus servicios, productos o recibe citas directamente dentro de CityMap.</div>
                </div>
              </button>

              <button type="button" onClick={() => setField("type", "external")} className="press" style={{ padding: 16, borderRadius: 12, border: `1.5px solid ${T?.border || "#E4E8E4"}`, background: T?.bg || "#F9FAFB", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "left", boxShadow: "0 2px 6px rgba(0,0,0,0.03)" }}>
                <div style={{ fontSize: 26 }}>🔗</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: T?.text || "#0F1A14" }}>Usar otra aplicación externa</div>
                  <div style={{ fontSize: 11, color: T?.sub || "#5A6872", marginTop: 2, lineHeight: 1.3 }}>Lleva a tus clientes a UberEats, Airbnb, WhatsApp, Booking u otra página.</div>
                </div>
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "fadeIn 0.3s ease" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, borderBottom: `1px solid ${T?.border || "#E4E8E4"}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#1A7A5E", display: "flex", alignItems: "center", gap: 6 }}>
                  {config.type === "native" ? "📋 Menú o Catálogo Propio" : "🔗 Enlaces a otras Apps"}
                </div>
                <button type="button" onClick={() => setField("type", null)} style={{ background: "none", border: "none", color: T?.sub || "#9CA3AF", fontSize: 11, textDecoration: "underline", cursor: "pointer", padding: 0 }}>
                  Cambiar opción
                </button>
              </div>

              {config.type === "external" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <p style={{ fontSize: 12, color: T?.sub || "#5A6872", margin: 0, lineHeight: 1.4 }}>Agrega los enlaces a tus perfiles en otras aplicaciones. El botón tomará automáticamente el color y nombre oficial (Airbnb, Rappi, etc).</p>
                  
                  {(config.externalLinks || []).map((link, idx) => (
                    <div key={idx} style={{ display: "flex", gap: 8 }}>
                      <select
                        value={link.platform}
                        onChange={e => {
                          const newLinks = [...(config.externalLinks || [])];
                          newLinks[idx].platform = e.target.value;
                          setField("externalLinks", newLinks);
                        }}
                        style={{ width: "130px", padding: "12px", border: `1px solid ${T?.border || "#E4E8E4"}`, borderRadius: 10, fontSize: 13, background: T?.white || "#fff", color: T?.text || "#0F1A14", fontFamily: "inherit" }}
                      >
                        <option value="airbnb">Airbnb</option>
                        <option value="booking">Booking</option>
                        <option value="tripadvisor">TripAdvisor</option>
                        <option value="expedia">Expedia</option>
                        <option value="opentable">OpenTable</option>
                        <option value="resy">Resy</option>
                        <option value="ubereats">Uber Eats</option>
                        <option value="rappi">Rappi</option>
                        <option value="didifood">DiDi Food</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="otro">Otro / Web</option>
                      </select>
                      <input 
                        type="url" 
                        placeholder="Pega tu enlace aquí (https://...)" 
                        value={link.url}
                        onChange={e => {
                          const newLinks = [...(config.externalLinks || [])];
                          newLinks[idx].url = e.target.value;
                          setField("externalLinks", newLinks);
                        }}
                        style={{ flex: 1, padding: "12px", border: `1px solid ${T?.border || "#E4E8E4"}`, borderRadius: 10, fontSize: 13, background: T?.white || "#fff", color: T?.text || "#0F1A14", fontFamily: "inherit", minWidth: 0 }} 
                      />
                      <button 
                        type="button" 
                        onClick={() => {
                          const newLinks = [...(config.externalLinks || [])];
                          newLinks.splice(idx, 1);
                          setField("externalLinks", newLinks);
                        }}
                        style={{ width: 44, flexShrink: 0, background: "rgba(239, 68, 68, 0.1)", border: "none", borderRadius: 10, color: "#EF4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    </div>
                  ))}

                  <button 
                    type="button" 
                    onClick={() => {
                      const newLinks = [...(config.externalLinks || [])];
                      newLinks.push({ platform: "whatsapp", url: "" });
                      setField("externalLinks", newLinks);
                    }}
                    style={{ padding: "12px", background: "transparent", border: `1.5px dashed ${T?.border || "#C4B5FD"}`, borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#7C3AED", cursor: "pointer", width: "100%", marginTop: 4 }}
                  >
                    + Agregar otra plataforma
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  
                  {/* Lista de Servicios */}
                  {(config.services || []).length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {config.services.map(s => (
                        <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", background: T?.bg || "#F9FAFB", borderRadius: 10, border: `1px solid ${T?.border || "#E4E8E4"}` }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: T?.text || "#0F1A14" }}>{s.name}</div>
                            <div style={{ fontSize: 11, color: T?.sub || "#5A6872", marginTop: 2 }}>
                              {s.price !== "0" && s.price ? `$${s.price}` : "Precio a consultar"}
                              {s.durationMin !== 60 && ` · ${s.durationMin}m`}
                              {s.timeRange && ` · ${s.timeRange}`}
                            </div>
                          </div>
                          <button type="button" onClick={() => removeService(s.id)} style={{ background: "rgba(217, 79, 61, 0.1)", border: "none", width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                            <Icon name="trash" size={14} color="#D94F3D" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: T?.sub || "#9CA3AF", padding: "16px", background: T?.bg || "#F9FAFB", borderRadius: 10, textAlign: "center", border: `1px dashed ${T?.border || "#E4E8E4"}` }}>
                      Agrega tu primer producto o servicio 👇
                    </div>
                  )}

                  {/* Formulario Simplificado */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, background: T?.white || "#fff", padding: 14, borderRadius: 12, border: `1.5px solid ${T?.border || "#E4E8E4"}`, boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <div style={{ flex: 2 }}>
                        <input type="text" placeholder="¿Qué ofreces? (Ej: Corte de Cabello)" value={newSvcName} onChange={e => setNewSvcName(e.target.value)} style={{ width: "100%", padding: "12px", border: `1px solid ${T?.border || "#E4E8E4"}`, borderRadius: 8, fontSize: 13, background: T?.bg || "#F9FAFB", color: T?.text || "#0F1A14", fontFamily: "inherit" }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <input type="number" placeholder="Precio ($)" value={newSvcPrice} onChange={e => setNewSvcPrice(e.target.value)} style={{ width: "100%", padding: "12px", border: `1px solid ${T?.border || "#E4E8E4"}`, borderRadius: 8, fontSize: 13, background: T?.bg || "#F9FAFB", color: T?.text || "#0F1A14", fontFamily: "inherit" }} />
                      </div>
                    </div>
                    
                    {showAdvanced && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 10, background: T?.bg || "#F9FAFB", borderRadius: 8, border: `1px solid ${T?.border || "#E4E8E4"}`, marginTop: 4 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: T?.sub || "#5A6872", textTransform: "uppercase" }}>Más detalles (Opcional)</div>
                        
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <div style={{ fontSize: 12, color: T?.text || "#0F1A14", width: 70 }}>Duración:</div>
                          <select value={newSvcDuration} onChange={e => setNewSvcDuration(parseInt(e.target.value))} style={{ flex: 1, padding: "8px", border: `1px solid ${T?.border || "#E4E8E4"}`, borderRadius: 8, fontSize: 12, background: T?.white || "#fff", color: T?.text || "#0F1A14" }}>
                            <option value={15}>15 minutos</option>
                            <option value={30}>30 minutos</option>
                            <option value={45}>45 minutos</option>
                            <option value={60}>1 hora (Por defecto)</option>
                            <option value={90}>1.5 horas</option>
                            <option value={120}>2 horas</option>
                            <option value={1440}>Día Completo / Pedido Abierto</option>
                          </select>
                        </div>
                        
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                          <div style={{ fontSize: 12, color: T?.text || "#0F1A14" }}>¿Solo disponible a cierta hora?</div>
                          <button type="button" onClick={() => setHasCustomHours(!hasCustomHours)} style={{ width: 36, height: 20, borderRadius: 10, background: hasCustomHours ? "#1A7A5E" : "#D1D5DB", border: "none", position: "relative", cursor: "pointer", transition: "all 0.2s" }}>
                            <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: hasCustomHours ? 18 : 2, transition: "all 0.2s", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }} />
                          </button>
                        </div>

                        {hasCustomHours && (
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                            <input type="time" value={newSvcStartTime} onChange={e => setNewSvcStartTime(e.target.value)} style={{ flex: 1, padding: "8px", border: `1px solid ${T?.border || "#E4E8E4"}`, borderRadius: 6, fontSize: 12, background: T?.white || "#fff", color: T?.text || "#0F1A14", fontFamily: "inherit" }} />
                            <span style={{ color: T?.sub || "#9CA3AF", fontSize: 12 }}>a</span>
                            <input type="time" value={newSvcEndTime} onChange={e => setNewSvcEndTime(e.target.value)} style={{ flex: 1, padding: "8px", border: `1px solid ${T?.border || "#E4E8E4"}`, borderRadius: 6, fontSize: 12, background: T?.white || "#fff", color: T?.text || "#0F1A14", fontFamily: "inherit" }} />
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                      <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} style={{ background: "none", border: "none", color: T?.sub || "#9CA3AF", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, padding: 0 }}>
                        <Icon name={showAdvanced ? "chevron" : "settings"} size={12} style={{ transform: showAdvanced ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} /> 
                        {showAdvanced ? "Menos detalles" : "Más detalles"}
                      </button>
                      <button type="button" onClick={addService} style={{ background: "#1A7A5E", color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 4px 10px rgba(26,122,94,0.2)" }}>
                        <Icon name="plus" size={14} /> Guardar
                      </button>
                    </div>
                  </div>

                  {/* Configuraciones Súper Técnicas Ocultas */}
                  <div style={{ marginTop: 12, borderTop: `1px solid ${T?.border || "#E4E8E4"}`, paddingTop: 16 }}>
                    <button type="button" onClick={() => setShowTechSettings(!showTechSettings)} style={{ background: "none", border: "none", color: T?.sub || "#9CA3AF", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: "100%", gap: 6 }}>
                      <Icon name="sliders" size={14} /> Ajustes técnicos del sistema (Avanzado)
                    </button>
                    
                    {showTechSettings && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16, background: T?.bg || "#F9FAFB", padding: 12, borderRadius: 10, border: `1px solid ${T?.border || "#E4E8E4"}` }}>
                        <div style={{ gridColumn: "1 / -1" }}>
                          <label style={{ fontSize: 10, fontWeight: 700, color: T?.sub || "#5A6872", textTransform: "uppercase", marginBottom: 4, display: "block" }}>Etiqueta del botón principal</label>
                          <input type="text" placeholder="Ej: Ver Menú, Reservar..." defaultValue={config.label || "Reservaciones"} onBlur={e => setField("label", e.target.value || "Reservaciones")} onChange={e => setField("label", e.target.value)} style={{ width: "100%", padding: "8px", border: `1px solid ${T?.border || "#E4E8E4"}`, borderRadius: 8, fontSize: 12, background: T?.white || "#fff", color: T?.text || "#0F1A14" }} />
                        </div>
                        <div>
                          <label style={{ fontSize: 10, fontWeight: 700, color: T?.sub || "#5A6872", textTransform: "uppercase", marginBottom: 4, display: "block" }}>Aprobación</label>
                          <select value={config.autoApprove ? "auto" : "manual"} onChange={e => setField("autoApprove", e.target.value === "auto")} style={{ width: "100%", padding: "8px", border: `1px solid ${T?.border || "#E4E8E4"}`, borderRadius: 8, fontSize: 12, background: T?.white || "#fff", color: T?.text || "#0F1A14" }}>
                            <option value="manual">Manual (Yo acepto cada una)</option>
                            <option value="auto">Automática (Libre)</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: 10, fontWeight: 700, color: T?.sub || "#5A6872", textTransform: "uppercase", marginBottom: 4, display: "block" }}>Max. a la vez</label>
                          <input type="number" defaultValue={config.maxPerSlot || 1} min={1} onBlur={e => setField("maxPerSlot", parseInt(e.target.value) || 1)} onChange={e => { const v = parseInt(e.target.value); if (v >= 1) setField("maxPerSlot", v); }} style={{ width: "100%", padding: "8px", border: `1px solid ${T?.border || "#E4E8E4"}`, borderRadius: 8, fontSize: 12, background: T?.white || "#fff", color: T?.text || "#0F1A14" }} />
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
