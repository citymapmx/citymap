import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { m, AnimatePresence } from 'framer-motion';
import Icon from '../components/ui/Icon.jsx';
import QRCode from 'react-qr-code';
import { getThumbUrl } from '../lib/utils.js';
import { loyaltyBgFirstColor } from '../lib/loyaltyColorStyles.js';
import { normalizeWhatsApp } from '../lib/loyaltyWhatsapp.js';
import { clearPrefetchedLoyaltyEntries } from '../lib/loyaltyMemberships.js';
import { sb } from '../lib/supabase.js';

// El detalle de la tarjeta es un overlay fixed que debe cubrir TODA
// la ventana y centrarse en la pantalla visible: se monta con
// createPortal en document.body para que ningún ancestro con transform
// lo descentre. Causa raíz (Jonathan, 12 nov 2026, moto g54): desde
// el perfil, el modal vivía dentro de AccountView, cuya raíz lleva
// `...viewStyle` (App.jsx) — `transform: translateY(0)` persistente
// tras el fade — y ese transform vuelve la raíz el bloque contenedor
// de los fixed: el overlay cubría toda la página del perfil (larga)
// y el modal quedaba centrado en el medio de la página, debajo de la
// pantalla visible. Con el portal el overlay cuelga del body y el
// flex lo centra en la ventana visible. En Recompensas (WalletView)
// la raíz no lleva transform y el modal ya se veía bien, pero el
// portal lo deja a salvo en los dos sitios que lo usan. En SSR/pruebas
// (sin document) se pinta en línea, como siempre.
// Desde la ficha del negocio (DetailView, nov 2026) el modal se abre
// también para quien NO es miembro: en ese caso enseña el formulario
// «Únete al programa» (el mismo de LoyaltyCardView) en vez de no
// pintarse. La guarda solo exige tarjeta y negocio; sin miembro se
// pinta el alta y el QR solo aparece cuando ya hay membresía.
// `user` y `setShowAuth` solo los pasa DetailView (perfil y Wallet
// siempre abren con miembro); `onEnrolled` avisa a la ficha para que
// refresque su membresía tras el alta.
export default function LoyaltyCardModal({ open, onClose, member, card, biz, user, setShowAuth, onEnrolled, loading, T }) {
  // La membresía vive en estado local: al unirse desde el formulario el
  // modal pasa a mostrar sellos + QR sin esperar a que la ficha
  // refresque su consulta. Se resincroniza cuando cambia la prop.
  const [currentMember, setCurrentMember] = useState(member || null);
  useEffect(() => { setCurrentMember(member || null); }, [member]);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [whatsapp, setWhatsapp] = useState('');
  const [whatsappError, setWhatsappError] = useState('');
  const [walletLoading, setWalletLoading] = useState(false);

  const handleEnroll = async () => {
    if (!user) {
      if (setShowAuth) setShowAuth(true); // Pedimos login
      return;
    }
    if (!card || !biz || enrollLoading) return;

    // WhatsApp obligatorio: se guarda normalizado (+52) para que el
    // negocio tenga el número registrado en su lista de clientes.
    const normalizedWhatsapp = normalizeWhatsApp(whatsapp);
    if (!normalizedWhatsapp) {
      setWhatsappError('Escribe tu número de WhatsApp (10 dígitos) para unirte al programa.');
      return;
    }
    setWhatsappError('');

    setEnrollLoading(true);
    // Inscribir al usuario (mismo flujo que LoyaltyCardView).
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
        res = await sb.post('loyalty_members', payload);
      } catch (e) {
        // Si la columna whatsapp aún no existe en la base (la migración
        // del PR no se ha aplicado en el editor SQL), el join no debe
        // romperse: reintentamos sin el número y la membresía se crea
        // igual.
        if (String(e?.message || '').includes('whatsapp')) {
          const { whatsapp: _ignored, ...payloadWithoutWhatsapp } = payload;
          res = await sb.post('loyalty_members', payloadWithoutWhatsapp);
        } else {
          throw e;
        }
      }
      if (res && res[0]) {
        setCurrentMember(res[0]);
        // La precarga del perfil es una foto anterior al join: si no se
        // invalida, la tarjeta nueva no aparece en el perfil hasta
        // recargar la página (12 Nov 2026).
        clearPrefetchedLoyaltyEntries();
        if (onEnrolled) onEnrolled(res[0]);
      }
    } catch (e) {
      alert('Error al inscribirte: ' + e.message);
    }
    setEnrollLoading(false);
  };

  // Pase de Google Wallet: mismo flujo que LoyaltyCardView (POST a
  // /api/loyalty-wallet con la membresía y abre el enlace del pase).
  // Usa currentMember para que funcione también justo después de
  // unirse, sin esperar a que la ficha refresque su consulta.
  const handleGoogleWallet = async () => {
    if (!currentMember || !card || !biz) return;
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
          stamps: currentMember.stamps,
          stamps_required: card.stamps_required,
          member_id: currentMember.id,
          member_name: currentMember.name || currentMember.email || 'Cliente',
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

  // Pase de Apple Wallet (.pkpass): mismo flujo que LoyaltyCardView
  // (GET a /api/loyalty-wallet con format=apple; primero ?check=1 para
  // avisar en claro si aún no está configurado; luego se abre la URL
  // del pase con el navegador del sistema en la app nativa, que es
  // lo que muestra la hoja de Wallet en iOS).
  const handleAppleWallet = async () => {
    if (!currentMember || !card || !biz) return;
    setWalletLoading(true);
    try {
      const params = new URLSearchParams({
        format: 'apple',
        biz_id: biz.id,
        biz_slug: biz.slug || biz.id,
        biz_name: biz.name,
        logo_url: card.logo_url || '',
        bg_color: card.bg_color || '',
        text_color: card.text_color || '',
        primary_color: card.primary_color || '',
        reward_text: card.reward_text || '',
        stamps: String(currentMember.stamps || 0),
        stamps_required: String(card.stamps_required || 5),
        member_id: currentMember.id,
        member_name: currentMember.name || currentMember.email || 'Cliente',
      });
      const url = `/api/loyalty-wallet?${params.toString()}`;
      const check = await fetch(`${url}&check=1`);
      if (!check.ok) {
        const data = await check.json().catch(() => ({}));
        alert(data.error || 'Apple Wallet aún no está configurado');
        return;
      }
      if (window.location.origin.includes('capacitor') || window.location.origin.includes('localhost')) {
        const { Browser } = await import('@capacitor/browser');
        await Browser.open({ url });
      } else {
        window.open(url, '_blank');
      }
    } catch (e) {
      alert('Error de conexión: ' + e.message);
    }
    setWalletLoading(false);
  };

  if (!card || !biz) {
    // Sin tarjeta no hay modal; pero si se abrió desde la ficha y la
    // consulta aún no resuelve, se enseña «Cargando tarjeta...» en vez
    // de no hacer nada al tocar el botón.
    if (!open || !loading) return null;
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 100000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
        <div style={{ textAlign: 'center', padding: 40, background: T?.white || '#fff', color: T?.text || '#111', borderRadius: 24, width: '100%', maxWidth: 360, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>Cargando tarjeta...</div>
      </div>
    );
  }
  const currentStamps = currentMember?.stamps || 0;
  const STAMPS = Array.from({ length: 10 });
  const isCompleted = currentStamps >= (card.stamps_required || 5);

  const coverImage = biz.banner_url || (biz.photos && biz.photos[0]?.url) || null;

  const modal = (
    <AnimatePresence>
      {open && (
        <>
          {/* OVERLAY */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(10px)', zIndex: 100000
            }}
          />

          <div style={{
            position: 'fixed', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100001,
            pointerEvents: 'none', 
            padding: 16
          }}>
            {/* MODAL CONTENT — misma entrada scale-in-center que las
                tarjetas del mapa (MapView): el exterior de framer-motion
                solo posiciona y anima la salida (initial={false}); el
                div interior lleva la clase CSS y TODOS los estilos
                visuales de la tarjeta (fondo, borde, sombra), para que
                la tarjeta completa crezca desde el centro. El initial
                con y/scale de antes competía con el keyframe CSS por
                el transform y se quitó. El overlay conserva su fundido. */}
            <m.div
              initial={false}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              style={{
                width: '100%',
                maxWidth: 360,
                maxHeight: '90vh',
                overflowY: 'auto',
                pointerEvents: 'auto',
                position: 'relative'
              }}
            >
            <div
              className="scale-in-center"
              style={{
                width: '100%',
                background: card.bg_color,
                borderRadius: 24,
                boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                position: 'relative'
              }}
            >
            {/* Close Button */}
            <button
              onClick={onClose}
              style={{
                position: 'absolute', top: 12, right: 12,
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)',
                border: 'none', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', zIndex: 10
              }}
            >
              <Icon name="x" size={18} color="#fff" />
            </button>

            {/* Header with Cover Image */}
            <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              {/* Cover Image Background */}
              {coverImage ? (
                <div style={{ width: "100%", height: 100, backgroundImage: `url(${getThumbUrl(coverImage, 800, 300)})`, backgroundSize: "cover", backgroundPosition: "center" }} />
              ) : (
                <div style={{ width: "100%", height: 80, background: "rgba(0,0,0,0.05)" }} />
              )}
              
              {/* Logo overlapping the cover */}
              <div style={{ marginTop: biz.image_url ? -32 : -40, position: "relative", zIndex: 2 }}>
                {card.logo_url ? (
                  <div style={{ width: 64, height: 64, borderRadius: "50%", background: card.bg_color, padding: 4, marginBottom: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                    <img src={card.logo_url} alt="Logo" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                  </div>
                ) : (
                  <div style={{ width: 64, height: 64, borderRadius: "50%", background: card.bg_color, padding: 4, marginBottom: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                    <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "rgba(0,0,0,0.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon name="award" size={28} color={card.text_color} />
                    </div>
                  </div>
                )}
              </div>

              <div style={{ padding: "0 20px 16px" }}>
                <h2 style={{ fontSize: 20, fontWeight: 900, color: card.text_color, margin: 0, lineHeight: 1.1, letterSpacing: "-0.5px" }}>{biz.name}</h2>
                <div style={{ fontSize: 12, color: card.text_color, opacity: 0.7, fontWeight: 600, marginTop: 6 }}>Programa de Lealtad</div>
              </div>
            </div>

            {/* Stamps Grid */}
            <div style={{ padding: "0 20px" }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: card.text_color, textAlign: "center", marginBottom: 12, letterSpacing: 1, textTransform: "uppercase" }}>
                {currentStamps} DE {card.stamps_required || 5} SELLOS
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
                {STAMPS.slice(0, card.stamps_required || 5).map((_, i) => {
                  const isFilled = i < currentStamps;
                  const stampIcon = card.type?.includes('|') ? card.type.split('|')[1] : "star";
                  return (
                    <div key={i} style={{
                      width: 44, height: 44, borderRadius: "50%",
                      background: isFilled ? (card.primary_color || card.text_color) : "transparent",
                      border: `3px solid ${card.primary_color || card.text_color}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      opacity: isFilled ? 1 : 0.3,
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}>
                      {isFilled && <Icon name={stampIcon} size={20} color={loyaltyBgFirstColor(card.bg_color)} />}
                    </div>
                  );
                })}
              </div>

              {/* Reward info */}
              <div style={{ marginTop: 20, textAlign: "center", background: "rgba(0,0,0,0.05)", padding: 12, borderRadius: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: card.text_color, opacity: 0.6, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                  Premio al completar
                </div>
                <div style={{ fontSize: 14, fontWeight: 900, color: card.text_color }}>{card.reward_text}</div>
              </div>
            </div>

            {/* QR Code — solo con membresía: sin miembro no hay código
                que mostrar; en su lugar va el formulario de alta. */}
            {currentMember ? (
            <div style={{ padding: "20px 20px 24px", display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
              <div style={{ background: "#fff", padding: 10, borderRadius: 14, display: "inline-block" }}>
                <QRCode
                  value={`https://citymap.mx/scan/${currentMember.id}`}
                  size={120}
                  level="Q"
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>
              <div style={{ fontSize: 11, color: card.text_color, opacity: 0.8, fontWeight: 700, textAlign: "center", padding: "0 10px" }}>
                {isCompleted ? "Muestra este código en el negocio para canjear tu premio" : "Muestra este código en el negocio para recibir tu sello"}
              </div>
              {/* Google Wallet: mismo botón que la página, debajo del QR. */}
              <button onClick={handleGoogleWallet} disabled={walletLoading} style={{ width: "100%", padding: 16, borderRadius: 100, border: "2px solid #E8eaed", background: "#fff", color: "#3c4043", fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, cursor: "pointer", opacity: walletLoading ? 0.7 : 1, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
                {walletLoading ? "Generando pase..." : "Añadir a Google Wallet"}
              </button>
              {/* Apple Wallet: mismo botón negro que la página, debajo del de Google. */}
              <button onClick={handleAppleWallet} disabled={walletLoading} style={{ width: "100%", padding: 16, borderRadius: 100, border: "none", background: "#000", color: "#fff", fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, cursor: "pointer", opacity: walletLoading ? 0.7 : 1, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                <Icon name="tag" size={24} color="#fff" />
                {walletLoading ? "Generando pase..." : "Añadir a Apple Wallet"}
              </button>
            </div>
            ) : (
            /* Alta al programa — mismo formulario que LoyaltyCardView
               (sin botón de Wallet: aparece debajo del QR una vez que
               ya hay membresía): pide el WhatsApp, valida con
               normalizeWhatsApp y crea la membresía; sin sesión abre
               el login. */
            <div style={{ padding: "20px 20px 24px", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ padding: 24, background: "rgba(0,0,0,0.05)", borderRadius: 24, textAlign: "center", width: "100%", boxSizing: "border-box" }}>
                <h3 style={{ margin: "0 0 8px", color: card.text_color, fontSize: 20, fontWeight: 900 }}>Únete al programa</h3>
                <p style={{ margin: "0 0 20px", color: card.text_color, opacity: 0.8, fontSize: 14 }}>Guarda sellos en cada visita y canjéalos por recompensas exclusivas.</p>
                <label style={{ display: "block", textAlign: "left", fontSize: 11, fontWeight: 800, color: card.text_color, opacity: 0.8, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>WhatsApp</label>
                {/* El placeholder va en el color del texto de la tarjeta y
                    a opacidad completa; el autofill de Safari/iOS pinta
                    el input de amarillo pálido (:-webkit-autofill), así
                    que se anula con una sombra interior del color del
                    input y el color de texto de la tarjeta. */}
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
            </m.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );

  // Sin document (SSR/pruebas) no hay portal: se pinta en línea.
  if (typeof document === 'undefined' || !document.body) return modal;
  return createPortal(modal, document.body);
}
