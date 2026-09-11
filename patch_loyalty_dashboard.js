const fs = require('fs');
const file = '/Users/danielarana/Desktop/cityguide/src/components/loyalty/LoyaltyDesigner.jsx';
let content = fs.readFileSync(file, 'utf8');

const replacement = `
      {/* BODY: Dashboard or Editing */}
      {!isEditing && config.id ? (
        <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? 16 : 32, background: T.bg }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: T.text }}>Tus Clientes Activos</h3>
              <div style={{ fontSize: 13, color: T.sub, marginTop: 4 }}>Administra y sella sus tarjetas</div>
            </div>
            <button onClick={() => setIsEditing(true)} style={{ padding: "8px 14px", background: T.border, color: T.text, borderRadius: 10, border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <Icon name="edit" size={14} color={T.text} /> Diseño
            </button>
          </div>

          <div style={{ background: "#F4F7F9", borderRadius: 16, padding: "16px 20px", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#111" }}>Código QR para clientes</div>
              <div style={{ fontSize: 13, color: "#555", marginTop: 4 }}>Muestra el código en mostrador</div>
            </div>
            <button onClick={() => { setIsEditing(true); setActiveTab("qr"); }} style={{ width: 44, height: 44, background: "#000", color: "#fff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer" }}>
              <Icon name="maximize-2" size={20} color="#fff" />
            </button>
          </div>

          <div style={{ position: "relative", marginBottom: 16 }}>
            <div style={{ position: "absolute", left: 14, top: 13 }}><Icon name="search" size={18} color={T.sub} /></div>
            <input type="text" placeholder="Buscar por nombre o email..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ width: "100%", padding: "13px 13px 13px 40px", boxSizing: "border-box", borderRadius: 12, border: \`1px solid \${T.border}\`, background: T.surface || T.bg, color: T.text, outline: "none", fontSize: 14, fontWeight: 500 }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 0.5 }}>Lista de clientes</span>
              <button onClick={loadMembers} style={{ background: "none", border: "none", color: T.text, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>↻ Actualizar</button>
            </div>
            {membersLoading ? (
              <div style={{ textAlign: "center", padding: 32, color: T.sub, fontSize: 13 }}>Cargando...</div>
            ) : members.length === 0 ? (
              <div style={{ textAlign: "center", padding: 32, color: T.sub, fontSize: 13 }}>Aún no hay clientes inscritos.<br />Abre el código QR para que se unan.</div>
            ) : (
              members.filter(m => (m.name||"").toLowerCase().includes(searchQuery.toLowerCase()) || (m.email||"").toLowerCase().includes(searchQuery.toLowerCase())).map(m => (
                <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderRadius: 14, border: \`1px solid \${T.border}\`, background: T.bg, gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {m.name || m.email || "Cliente"}
                    </div>
                    <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>
                      {m.stamps} / {config.stamps_required} sellos
                      {m.last_stamp_at ? \` · \${new Date(m.last_stamp_at).toLocaleDateString("es-MX", {day:"numeric",month:"short"})}\` : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => giveStamp(m.id, m.stamps, config.stamps_required)}
                    disabled={stampingId === m.id}
                    style={{ padding: "8px 16px", background: "#000", color: "#fff", border: "none", borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: "pointer", opacity: stampingId === m.id ? 0.5 : 1, whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
                    {stampingId === m.id ? "..." : "+ Sello"}
                  </button>
                </div>
              ))
            )}
            {members.length > 0 && members.filter(m => (m.name||"").toLowerCase().includes(searchQuery.toLowerCase()) || (m.email||"").toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
              <div style={{ textAlign: "center", padding: 32, color: T.sub, fontSize: 13 }}>No se encontraron resultados</div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flex: 1, overflow: isMobile ? "auto" : "hidden", flexDirection: isMobile ? "column" : "row" }}>
`;

// Replace from `{/* BODY: Top (Preview) -> Bottom (Controls) on mobile.` up to `<div style={{ display: "flex", flex: 1, overflow: isMobile ? "auto" : "hidden", flexDirection: isMobile ? "column" : "row" }}>`
const targetStr = `{/* BODY: Top (Preview) -> Bottom (Controls) on mobile. Left (Controls) -> Right (Preview) on Desktop */}
      <div style={{ display: "flex", flex: 1, overflow: isMobile ? "auto" : "hidden", flexDirection: isMobile ? "column" : "row" }}>`;

content = content.replace(targetStr, replacement);

// And we need to add a closing tag `)}` right before the last closing `</div>` of the main container.
const endTargetStr = `      </div>
    </div>
  );
}`;

const endReplacement = `        </div>
      )}
    </div>
  );
}`;

content = content.replace(endTargetStr, endReplacement);
fs.writeFileSync(file, content);
