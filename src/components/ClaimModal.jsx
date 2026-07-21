import { useState } from "react";
import Icon from "./ui/Icon.jsx";

export default function ClaimModal({ biz, user, onClaim, onClose }) {
  const [step, setStep] = useState(1); 
  const [form, setForm] = useState({ role: "Propietario", phone: "", email: user?.email || "" });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", backdropFilter: "blur(8px)", zIndex: 99999, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", padding: "28px 24px 44px", width: "100%", maxWidth: 430, animation: "slideUp .35s cubic-bezier(.34,1.1,.64,1) both" }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "#E4E8E4", margin: "0 auto 28px" }} />
        {step === 1 ? (
          <>
            <h2 style={{ fontFamily: "'Coolvetica', sans-serif", fontSize: 22, color: "#0F1A14", marginBottom: 8 }}>Reclamar este perfil</h2>
            <p style={{ fontSize: 14, color: "#5A6872", lineHeight: 1.6, marginBottom: 20 }}>¿Eres el responsable de <strong>{biz.name}</strong>?</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              {[["Gestiona tu información", "Fotos, horarios y descripción"], ["Responde a reseñas", "Interactúa con clientes"], ["Publica eventos y cupones", "Solo planes Destacado y Premium"]].map(([t, s]) => (
                <div key={t} style={{ display: "flex", gap: 10, padding: "10px 12px", background: "#EAF4F0", borderRadius: 10 }}>
                  <Icon name="check" size={14} color="#1A7A5E" />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#0F1A14" }}>{t}</div>
                    <div style={{ fontSize: 12, color: "#5A6872", marginTop: 1 }}>{s}</div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setStep(2)} style={{ width: "100%", padding: 14, background: "#1A7A5E", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 15, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>Continuar</button>
            <button onClick={onClose} style={{ width: "100%", marginTop: 10, padding: 12, background: "transparent", border: "1.5px solid #E4E8E4", borderRadius: 12, fontWeight: 600, fontSize: 14, color: "#5A6872", cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
          </>
        ) : (
          <>
            <h2 style={{ fontFamily: "'Coolvetica', sans-serif", fontSize: 22, color: "#0F1A14", marginBottom: 18 }}>Datos de contacto</h2>
            {[["Tu rol", "role", "Propietario"], ["Tu nombre", "name", "Ej: Juan Pérez"], ["WhatsApp", "whatsapp", "+52 311 000-0000"], ["Email", "email", "tu@email.com"]].map(([l, f, ph]) => (
              <div key={f} style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 4 }}>{l}</label>
                <input value={form[f]} onChange={e => setForm(x => ({ ...x, [f]: e.target.value }))} placeholder={ph} style={{ width: "100%", padding: "11px 14px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 14, color: "#0F1A14", background: "#fff", fontFamily: "inherit" }} />
              </div>
            ))}
            <button onClick={() => { 
              const formattedForm = { ...form, phone: `WA: ${form.whatsapp} | Nombre: ${form.name}` };
              onClaim(biz.id, formattedForm); 
              onClose(); 
            }} style={{ width: "100%", padding: 14, background: "#1A7A5E", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 15, color: "#fff", cursor: "pointer", fontFamily: "inherit", marginTop: 8 }}>Enviar solicitud</button>
            <button onClick={() => setStep(1)} style={{ width: "100%", marginTop: 10, padding: 12, background: "transparent", border: "1.5px solid #E4E8E4", borderRadius: 12, fontWeight: 600, fontSize: 14, color: "#5A6872", cursor: "pointer", fontFamily: "inherit" }}>Atrás</button>
          </>
        )}
      </div>
    </div>
  );
}
