import React from 'react';
import Icon from '../ui/Icon.jsx';

export default function LoyaltyWizard({ 
  wizardStep, 
  setWizardStep, 
  config, 
  setConfig, 
  business, 
  isMobile,
  handleSave,
  saving
}) {
  const STAMPS = Array.from({ length: 10 });
  
  const COLOR_PRESETS = [
    { bg: "#1B1107", text: "#F5E6D3", primary: "#C4841D", label: "Café" },
    { bg: "#1A1A2E", text: "#EAEAEA", primary: "#E94560", label: "Neón" },
    { bg: "#FDF2F8", text: "#831843", primary: "#EC4899", label: "Rosado" },
    { bg: "#0F172A", text: "#F8FAFC", primary: "#3B82F6", label: "Azul" },
    { bg: "#FFFFFF", text: "#1E293B", primary: "#10B981", label: "Eco" },
    { bg: "#18181B", text: "#FAFAFA", primary: "#F59E0B", label: "Gold" },
  ];

  const ICONS = [
    { id: "star", name: "Estrella" },
    { id: "coffee", name: "Café" },
    { id: "pizza", name: "Pizza" },
    { id: "heart_overlay", name: "Corazón" },
    { id: "gift", name: "Regalo" },
    { id: "shopping-bag", name: "Bolsa" },
    { id: "check_sq", name: "Palomita" }
  ];

  const renderCardPreview = () => (
    <div style={{ 
      width: "100%", 
      maxWidth: 260, 
      background: config.bg_color, 
      borderRadius: 20, 
      boxShadow: "0 12px 32px rgba(0,0,0,0.1)", 
      overflow: "hidden",
      border: `1px solid ${config.primary_color}30`,
      margin: "0 auto"
    }}>
      <div style={{ padding: "20px 16px 16px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        {config.logo_url ? (
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#fff", padding: 4, marginBottom: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
            <img src={config.logo_url} alt="Logo" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
          </div>
        ) : (
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12, border: `1px solid ${config.text_color}20` }}>
            <Icon name="image" size={24} color={config.text_color} />
          </div>
        )}
        <div style={{ fontSize: 16, fontWeight: 800, color: config.text_color, letterSpacing: "-0.5px" }}>
          {business?.name || "Tu Negocio"}
        </div>
      </div>
      
      <div style={{ padding: "0 16px 16px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
          {STAMPS.slice(0, config.stamps_required).map((_, i) => (
            <div key={i} style={{ width: 32, height: 32, borderRadius: "50%", background: i < 2 ? config.primary_color : "transparent", border: `2px solid ${config.primary_color}`, display: "flex", alignItems: "center", justifyContent: "center", opacity: i < 2 ? 1 : 0.4 }}>
              {i < 2 && <Icon name={config.type?.includes('|') ? config.type.split('|')[1] : "star"} size={16} color={config.bg_color} />}
            </div>
          ))}
        </div>
      </div>
      
      <div style={{ padding: "12px 16px", background: "rgba(0,0,0,0.03)", display: "flex", justifyContent: "center", alignItems: "center", borderTop: `1px solid ${config.text_color}10` }}>
          <div style={{ fontSize: 13, color: config.text_color, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>🎁 {config.reward_text || "Un premio increíble"}</div>
      </div>
    </div>
  );

  return (
    <div style={{ flex: 1, background: "#F4F7F9", display: "flex", flexDirection: "column", padding: isMobile ? 16 : 32, overflowY: "auto", alignItems: "center" }}>
      
      <div style={{ maxWidth: 500, width: "100%", background: "#fff", borderRadius: 24, boxShadow: "0 12px 32px rgba(0,0,0,0.06)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* WIZARD HEADER */}
        <div style={{ padding: "24px 32px", borderBottom: "1px solid #F1F5F9", textAlign: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#3B82F6", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
            Paso {wizardStep + 1} de 3
          </div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.5px" }}>
            {wizardStep === 0 ? "Elige tus colores" : wizardStep === 1 ? "Reglas e Icono" : "Vista Previa Final"}
          </h2>
        </div>

        {/* WIZARD BODY */}
        <div style={{ padding: 32, background: "#F8FAFC", flex: 1, display: "flex", flexDirection: "column", gap: 32 }}>
          
          {wizardStep === 0 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32 }}>
              {/* Preview card inside Step 1 */}
              <div style={{ width: "100%" }}>
                {renderCardPreview()}
              </div>

              {/* Compact Presets */}
              <div style={{ width: "100%", maxWidth: 320 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: "#475569", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5, textAlign: "center" }}>Estilos Rápidos</label>
                <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                  {COLOR_PRESETS.map((preset, i) => (
                    <button
                      key={i}
                      onClick={() => setConfig(prev => ({ ...prev, bg_color: preset.bg, text_color: preset.text, primary_color: preset.primary }))}
                      style={{
                        width: 44, height: 44, borderRadius: "50%",
                        background: preset.bg,
                        border: config.bg_color === preset.bg ? `3px solid ${preset.primary}` : "2px solid #E2E8F0",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                        transition: "all 0.2s"
                      }}
                      title={preset.label}
                    >
                      <div style={{ width: 16, height: 16, borderRadius: "50%", background: preset.primary }} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Manual Color Pickers */}
              <div style={{ width: "100%", maxWidth: 320, padding: "20px", background: "#F1F5F9", borderRadius: 20 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: "#475569", marginBottom: 16, textTransform: "uppercase", letterSpacing: 0.5, textAlign: "center" }}>O personalizar colores exactos</label>
                <div style={{ display: "flex", gap: 16, justifyContent: "space-between" }}>
                  
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                    <div style={{ position: "relative", width: 44, height: 44, borderRadius: "50%", background: config.bg_color, border: `2px solid #CBD5E1`, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                      <input type="color" value={config.bg_color} onChange={e => setConfig({...config, bg_color: e.target.value})} style={{ opacity: 0, position: "absolute", inset: 0, width: "100%", height: "100%", cursor: "pointer" }} />
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>Fondo</div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                    <div style={{ position: "relative", width: 44, height: 44, borderRadius: "50%", background: config.text_color, border: `2px solid #CBD5E1`, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                      <input type="color" value={config.text_color} onChange={e => setConfig({...config, text_color: e.target.value})} style={{ opacity: 0, position: "absolute", inset: 0, width: "100%", height: "100%", cursor: "pointer" }} />
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>Texto</div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                    <div style={{ position: "relative", width: 44, height: 44, borderRadius: "50%", background: config.primary_color, border: `2px solid #CBD5E1`, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                      <input type="color" value={config.primary_color} onChange={e => setConfig({...config, primary_color: e.target.value})} style={{ opacity: 0, position: "absolute", inset: 0, width: "100%", height: "100%", cursor: "pointer" }} />
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>Botón</div>
                  </div>

                </div>
              </div>
            </div>
          )}

          {wizardStep === 1 && (
            <>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: "#475569", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5, textAlign: "center" }}>Icono del sello</label>
                <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                  {ICONS.map(icon => {
                    const currentIcon = config.type?.includes('|') ? config.type.split('|')[1] : "star";
                    const isSelected = currentIcon === icon.id;
                    return (
                      <button key={icon.id} onClick={() => {
                        const baseType = config.type?.includes('|') ? config.type.split('|')[0] : config.type || "stamps";
                        setConfig({...config, type: `${baseType}|${icon.id}`});
                      }} style={{ width: 44, height: 44, borderRadius: 12, background: isSelected ? "#0F172A" : "#fff", border: `2px solid ${isSelected ? "#0F172A" : "#E2E8F0"}`, color: isSelected ? "#fff" : "#0F172A", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s" }} title={icon.name}>
                        <Icon name={icon.id} size={20} color={isSelected ? "#fff" : "#0F172A"} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Meta de sellos</label>
                <input type="number" min="2" max="10" value={config.stamps_required} onChange={e => setConfig({...config, stamps_required: Number(e.target.value)})} style={{ width: "100%", boxSizing: "border-box", padding: "14px", borderRadius: 12, border: "1px solid #E2E8F0", background: "#fff", color: "#0F172A", fontSize: 14, outline: "none", fontWeight: 600 }} />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Premio o Recompensa</label>
                <input type="text" value={config.reward_text} onChange={e => setConfig({...config, reward_text: e.target.value})} placeholder="Ej. Un café gratis" style={{ width: "100%", boxSizing: "border-box", padding: "14px", borderRadius: 12, border: "1px solid #E2E8F0", background: "#fff", color: "#0F172A", fontSize: 14, outline: "none", fontWeight: 600 }} />
              </div>
            </>
          )}

          {wizardStep === 2 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              {renderCardPreview()}
              <p style={{ margin: 0, fontSize: 14, color: "#64748B", textAlign: "center" }}>Así es como la verán tus clientes. ¡Lista para usarse!</p>
            </div>
          )}

        </div>

        {/* WIZARD FOOTER */}
        <div style={{ padding: "16px 32px", borderTop: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {wizardStep > 0 ? (
            <button onClick={() => setWizardStep(prev => prev - 1)} style={{ background: "none", border: "none", color: "#64748B", fontWeight: 700, fontSize: 14, cursor: "pointer", padding: "8px 0" }}>
              Atrás
            </button>
          ) : <div />}

          {wizardStep < 2 ? (
            <button onClick={() => setWizardStep(prev => prev + 1)} style={{ padding: "12px 24px", background: "#3B82F6", color: "#fff", border: "none", borderRadius: 100, fontWeight: 800, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
              Siguiente <Icon name="chevron" size={14} color="#fff" />
            </button>
          ) : (
            <button onClick={handleSave} disabled={saving} style={{ padding: "12px 24px", background: "#10B981", color: "#fff", border: "none", borderRadius: 100, fontWeight: 800, fontSize: 14, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Creando..." : "Crear Tarjeta"}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
