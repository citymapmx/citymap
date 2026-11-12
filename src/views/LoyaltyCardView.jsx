import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sb } from '../lib/supabase.js';
import { loyaltyBgFirstColor } from '../lib/loyaltyColorStyles.js';
import { normalizeWhatsApp } from '../lib/loyaltyWhatsapp.js';
import { clearPrefetchedLoyaltyEntries } from '../lib/loyaltyMemberships.js';
import Icon from '../components/ui/Icon.jsx';

export default function LoyaltyCardView({ T, user, setShowAuth }) {
  const { bizId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [card, setCard] = useState(null);
  const [biz, setBiz] = useState(null);
  const [member, setMember] = useState(null); // SI está logueado y suscrito
  
  const STAMPS = Array.from({ length: 10 });

  useEffect(() => {
    async function load() {
      if (!bizId) return;
      try {
        // Busca por UUID primero, si falla busca por slug (exacto o con prefijo de ciudad)
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bizId);
        let bizQuery, bizRes;
        if (isUUID) {
          bizQuery = `?id=eq.${bizId}&limit=1`;
          bizRes = await sb.get("businesses", bizQuery);
        } else {
          // Intenta slug exacto primero
          bizRes = await sb.get("businesses", `?slug=eq.${bizId}&limit=1`);
          // Si no encuentra, busca slug que termina con el bizId (con prefijo de ciudad)
          if (!bizRes?.[0]) {
            bizRes = await sb.get("businesses", `?slug=like.*${bizId}&limit=1`);
          }
        }
        const foundBiz = bizRes?.[0];
        if (!foundBiz) { setLoading(false); return; }

        setBiz(foundBiz);

        const [cardRes, memberRes] = await Promise.all([
          sb.get("loyalty_cards", `?biz_id=eq.${foundBiz.id}&active=eq.true&limit=1`),
          user ? sb.get("loyalty_members", `?user_id=eq.${user.id}&biz_id=eq.${foundBiz.id}&limit=1`) : Promise.resolve([])
        ]);

        if (cardRes?.[0]) setCard(cardRes[0]);
        if (memberRes?.[0]) setMember(memberRes[0]);

      } catch (e) {
        console.error("Error cargando tarjeta:", e);
      }
      setLoading(false);
    }
    load();
  }, [bizId, user]);

  const [enrollLoading, setEnrollLoading] = useState(false);
  const [whatsapp, setWhatsapp] = useState("");
  const [whatsappError, setWhatsappError] = useState("");

  const handleEnroll = async () => {
    if (!user) {
      setShowAuth(true); // Pedimos login
      return;
    }
    if (!card || enrollLoading) return;

    // WhatsApp obligatorio: se guarda normalizado (+52) para que el negocio
    // tenga el número registrado en su lista de clientes.
    const normalizedWhatsapp = normalizeWhatsApp(whatsapp);
    if (!normalizedWhatsapp) {
      setWhatsappError("Escribe tu número de WhatsApp (10 dígitos) para unirte al programa.");
      return;
    }
    setWhatsappError("");
    
    setEnrollLoading(true);
    // Inscribir al usuario
    try {
      const payload = {
        card_id: card.id,
        biz_id: biz.id,
        user_id: user.id,
        name: user.user_metadata?.full_name || user.email,
        email: user.email,
        whatsapp: normalizedWhatsapp,
        stamps: 0
      };
      let res;
      try {
        res = await sb.post("loyalty_members", payload);
      } catch (e) {
        // Si la columna whatsapp aún no existe en la base (la migración del
        // PR no se ha aplicado en el editor SQL), el join no debe romperse:
        // reintentamos sin el número y la membresía se crea igual.
        if (String(e?.message || "").includes("whatsapp")) {
          const { whatsapp: _ignored, ...payloadWithoutWhatsapp } = payload;
          res = await sb.post("loyalty_members", payloadWithoutWhatsapp);
        } else {
          throw e;
        }
      }
      if (res && res[0]) {
        setMember(res[0]);
        // La precarga del perfil es una foto anterior al join: si no se
        // invalida, la tarjeta nueva no aparece en el perfil hasta
        // recargar la página (12 Nov 2026). Al descartarla, la próxima
        // lectura (o el refresco del carrusel al entrar) ya trae la
        // membresía recién creada.
        clearPrefetchedLoyaltyEntries();
      }
    } catch(e) {
      alert("Error al inscribirte: " + e.message);
    }
    setEnrollLoading(false);
  };

  const [walletLoading, setWalletLoading] = useState(false);

  const handleGoogleWallet = async () => {
    if (!member || !card || !biz) return;
    setWalletLoading(true);
    try {
      const res = await fetch('/api/loyalty-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          biz_id: biz.id,
          biz_name: biz.name,
          logo_url: card.logo_url,
          bg_color: card.bg_color,
          text_color: card.text_color,
          primary_color: card.primary_color,
          reward_text: card.reward_text,
          stamps: member.stamps,
          stamps_required: card.stamps_required,
          member_id: member.id,
          member_name: member.name || member.email || 'Cliente',
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.open(data.url, '_blank');
      } else {
        alert('Error al generar el pase: ' + (data.error || 'desconocido'));
      }
    } catch (e) {
      alert('Error de conexión: ' + e.message);
    }
    setWalletLoading(false);
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ margin: "auto", color: T.text, fontWeight: "bold" }}>Cargando tarjeta...</div>
      </div>
    );
  }

  if (!card || !biz) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, padding: 20, textAlign: "center" }}>
        <h2 style={{ color: T.text, marginTop: 100 }}>Tarjeta no encontrada</h2>
        <p style={{ color: T.sub }}>Este negocio no tiene una tarjeta de lealtad activa.</p>
        <button onClick={() => navigate("/")} style={{ marginTop: 20, padding: "12px 24px", borderRadius: 12, border: "none", background: "#000", color: "#fff", fontWeight: "bold", cursor: "pointer" }}>Ir al Inicio</button>
      </div>
    );
  }

  const currentStamps = member?.stamps || 0;
  const fromWallet = new URLSearchParams(window.location.search).get("from") === "wallet";
  const fromBiz = new URLSearchParams(window.location.search).get("from") === "biz";

  return (
    <div style={{ height: "100%", background: T.bg, display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 20px 40px", position: "fixed", inset: 0, zIndex: 100000, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
      
      {/* Botón de regreso */}
      {!fromBiz && (
        <div style={{ width: "100%", maxWidth: 400, marginBottom: 20 }}>
          <button onClick={() => fromWallet ? navigate("/wallet") : navigate(-1)} style={{ display: "flex", alignItems: "center", gap: 8, border: "none", background: "none", color: T.text, fontWeight: "bold", fontSize: 16, cursor: "pointer", padding: 0 }}>
            <Icon name="arrow_left" size={20} color={T.text} />
            Volver a {fromWallet ? "Mi Wallet" : "CityMap"}
          </button>
        </div>
      )}
      {fromBiz && (
        <div style={{ width: "100%", maxWidth: 400, marginBottom: 20 }}>
          <button onClick={() => navigate(-1)} style={{ display: "flex", alignItems: "center", gap: 8, border: "none", background: "none", color: T.text, fontWeight: "bold", fontSize: 16, cursor: "pointer", padding: 0 }}>
            <Icon name="arrow_left" size={20} color={T.text} />
            Volver al perfil
          </button>
        </div>
      )}

      <div style={{ width: "100%", maxWidth: 320, background: card.bg_color, borderRadius: 24, boxShadow: "0 20px 40px rgba(0,0,0,0.15)", overflow: "hidden", position: "relative", flexShrink: 0 }}>
        
        {/* Cabecera (compacta: la tarjeta era demasiado alta en la página pública) */}
        <div style={{ padding: "12px 16px 8px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          {card.logo_url ? (
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#fff", padding: 3, marginBottom: 8, boxShadow: "0 8px 16px rgba(0,0,0,0.1)" }}>
              <img src={card.logo_url} alt="Logo" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
            </div>
          ) : (
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(0,0,0,0.1)", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="award" size={20} color={card.text_color} />
            </div>
          )}
          
          <h2 style={{ margin: "0 0 4px", color: card.text_color, fontSize: 16, fontWeight: 900, lineHeight: 1.2 }}>{biz.name}</h2>
          <div style={{ fontSize: 11, color: card.text_color, opacity: 0.8, fontWeight: 600 }}>Programa de Lealtad</div>
        </div>

        {/* Sellos */}
        <div style={{ padding: "0 16px 12px" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            <div style={{ width: "100%", textAlign: "center", marginBottom: 4, fontSize: 11, fontWeight: 800, color: card.text_color, letterSpacing: 1 }}>
              {currentStamps} DE {card.stamps_required || 5} SELLOS
            </div>
            
            {Array.from({ length: card.stamps_required || 5 }).map((_, i) => {
              const stampIcon = card.type?.includes('|') ? card.type.split('|')[1] : "star";
              return (
                <div key={i} style={{ 
                  width: 32, height: 32, borderRadius: "50%", 
                  background: i < currentStamps ? card.primary_color : "transparent", 
                  border: `2px solid ${card.primary_color}`, 
                  display: "flex", alignItems: "center", justifyContent: "center", 
                  opacity: i < currentStamps ? 1 : 0.4 
                }}>
                  {i < currentStamps && <Icon name={stampIcon} size={16} color={loyaltyBgFirstColor(card.bg_color)} />}
                </div>
              );
            })}
          </div>
          
          {currentStamps >= (card.stamps_required || 5) ? (
            <div style={{ textAlign: "center", marginTop: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: "#F59E0B", textTransform: "uppercase", letterSpacing: 1, textShadow: "0 2px 10px rgba(245, 158, 11, 0.4)", animation: "pulse 2s infinite" }}>✨ ¡Premio Desbloqueado! ✨</div>
              <div style={{ fontSize: 14, fontWeight: 900, color: card.text_color, marginTop: 4 }}>{card.reward_text}</div>
            </div>
          ) : (
            <div style={{ textAlign: "center", marginTop: 8 }}>
              <div style={{ fontSize: 10, color: card.text_color, opacity: 0.7, textTransform: "uppercase", fontWeight: 800, letterSpacing: 1 }}>Premio al completar</div>
              <div style={{ fontSize: 14, fontWeight: 900, color: card.text_color, marginTop: 4 }}>{card.reward_text}</div>
            </div>
          )}
        </div>

        {/* Footer QR inside card */}
        {member && (
          <div style={{ padding: "0 20px 16px", display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
            <div style={{ background: "#fff", padding: 6, borderRadius: 12, display: "inline-block", marginBottom: 6 }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`https://citymap.mx/scan/${member.id}`)}&bgcolor=ffffff&color=000000&qzone=1`}
                alt="Mi QR de lealtad"
                style={{ width: 96, height: 96, display: "block" }}
              />
            </div>
            <div style={{ fontSize: 11, color: card.text_color, opacity: 0.9, fontWeight: 700, textAlign: "center" }}>
              {currentStamps >= (card.stamps_required || 5) ? "Muestra este código al cajero para canjear tu premio" : "Muestra este código al cajero para recibir tu sello"}
            </div>
          </div>
        )}
      </div>

      {/* Buttons OUTSIDE the card */}
      {member ? (
        <div style={{ width: "100%", maxWidth: 400, marginTop: 30, display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
          <div style={{ fontSize: 13, color: T.text, opacity: 0.6, fontWeight: 700, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>O guárdala en tu celular</div>
          
          <button onClick={handleGoogleWallet} disabled={walletLoading} style={{ width: "100%", padding: 16, borderRadius: 100, border: "2px solid #E8eaed", background: "#fff", color: "#3c4043", fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, cursor: "pointer", opacity: walletLoading ? 0.7 : 1, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
            {walletLoading ? "Generando pase..." : "Añadir a Google Wallet"}
          </button>
          
          <button style={{ width: "100%", padding: 16, borderRadius: 100, border: "none", background: "#000", color: "#fff", fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
            <Icon name="tag" size={24} color="#fff" />
            Añadir a Apple Wallet
          </button>
        </div>
      ) : (
        <div style={{ width: "100%", maxWidth: 400, marginTop: 30, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ padding: 24, background: card.bg_color, borderRadius: 24, textAlign: "center", boxShadow: "0 10px 30px rgba(0,0,0,0.1)", width: "100%" }}>
            <h3 style={{ margin: "0 0 8px", color: card.text_color, fontSize: 20, fontWeight: 900 }}>Únete al programa</h3>
            <p style={{ margin: "0 0 20px", color: card.text_color, opacity: 0.8, fontSize: 14 }}>Guarda sellos en cada visita y canjéalos por recompensas exclusivas.</p>
            <label style={{ display: "block", textAlign: "left", fontSize: 11, fontWeight: 800, color: card.text_color, opacity: 0.8, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>WhatsApp</label>
            {/* El placeholder va en el color del texto de la tarjeta (blanco
              en esta tarjeta azul) y a opacidad completa; el autofill de
              Safari/iOS pinta el input de amarillo pálido
              (:-webkit-autofill), así que se anula con una sombra interior
              del color del input y el color de texto de la tarjeta. */}
            <style>{`
              .loyalty-whatsapp-input::placeholder { color: ${card.text_color}; opacity: 1; }
              .loyalty-whatsapp-input:-webkit-autofill { -webkit-box-shadow: 0 0 0 1000px rgba(255,255,255,0.15) inset; -webkit-text-fill-color: ${card.text_color}; caret-color: ${card.text_color}; transition: background-color 9999s ease-in-out 0s; }
            `}</style>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              className="loyalty-whatsapp-input"
              placeholder="Agrega tu número"
              value={whatsapp}
              onChange={(e) => { setWhatsapp(e.target.value); if (whatsappError) setWhatsappError(""); }}
              style={{ width: "100%", boxSizing: "border-box", padding: "14px 16px", borderRadius: 12, border: `1.5px solid ${card.text_color}55`, background: "rgba(255,255,255,0.15)", color: card.text_color, fontSize: 16, fontFamily: "inherit", outline: "none", marginBottom: whatsappError ? 6 : 16 }}
            />
            {whatsappError && <div style={{ color: card.text_color, fontSize: 12, fontWeight: 800, marginBottom: 12, textAlign: "left" }}>⚠️ {whatsappError}</div>}
            <button onClick={handleEnroll} disabled={enrollLoading} style={{ width: "100%", padding: 16, borderRadius: 16, border: "none", background: card.text_color, color: loyaltyBgFirstColor(card.bg_color), fontWeight: 800, fontSize: 16, cursor: "pointer", opacity: enrollLoading ? 0.7 : 1 }}>
              {enrollLoading ? "Generando tarjeta..." : "Obtener mi tarjeta"}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
