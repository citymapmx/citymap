// Botón de WhatsApp en la lista de clientes de lealtad.
//
// Abre el chat con el cliente (wa.me) con un mensaje personalizado según
// su progreso (ver src/lib/loyaltyWhatsapp.js). Solo se muestra cuando el
// cliente tiene un número de WhatsApp guardado; sin número no se pinta
// nada (nunca un botón roto).
import React from "react";
import Icon from "../ui/Icon.jsx";
import { loyaltyWhatsAppLink } from "../../lib/loyaltyWhatsapp.js";

export default function LoyaltyWhatsAppButton({ member, stampsRequired = 5, bizName = "", disabled = false }) {
  const link = loyaltyWhatsAppLink({
    whatsapp: member?.whatsapp,
    stamps: member?.stamps || 0,
    stampsRequired,
    bizName,
  });
  if (!link) return null;
  return (
    <button
      onClick={() => window.open(link, "_blank")}
      disabled={disabled}
      aria-label={`Enviar WhatsApp a ${member?.name || member?.email || "cliente"}`}
      title="Enviar WhatsApp"
      style={{
        width: 34, height: 34, borderRadius: "50%", background: "#25D366",
        color: "#fff", border: "none", display: "flex", alignItems: "center",
        justifyContent: "center", cursor: "pointer", flexShrink: 0,
        opacity: disabled ? 0.3 : 1,
      }}
    >
      <Icon name="whatsapp" size={18} color="#fff" />
    </button>
  );
}
