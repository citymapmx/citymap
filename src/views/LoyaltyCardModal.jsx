import React from 'react';
import { m, AnimatePresence } from 'framer-motion';
import Icon from '../components/ui/Icon.jsx';
import QRCode from 'react-qr-code';
import { getThumbUrl } from '../lib/utils.js';

export default function LoyaltyCardModal({ open, onClose, member, card, biz }) {
  if (!member || !card || !biz) return null;
  const currentStamps = member.stamps || 0;
  const STAMPS = Array.from({ length: 10 });
  const isCompleted = currentStamps >= (card.stamps_required || 5);

  const coverImage = biz.banner_url || (biz.photos && biz.photos[0]?.url) || null;

  return (
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
            {/* MODAL CONTENT */}
            <m.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              style={{
                width: '100%',
                maxWidth: 360,
                maxHeight: '90vh',
                overflowY: 'auto',
                pointerEvents: 'auto', 
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
                      {isFilled && <Icon name={stampIcon} size={20} color={card.bg_color} />}
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

            {/* QR Code */}
            <div style={{ padding: "20px 20px 24px", display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
              <div style={{ background: "#fff", padding: 10, borderRadius: 14, display: "inline-block" }}>
                <QRCode
                  value={`https://citymap.mx/scan/${member.id}`}
                  size={120}
                  level="Q"
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>
              <div style={{ fontSize: 11, color: card.text_color, opacity: 0.8, fontWeight: 700, textAlign: "center", padding: "0 10px" }}>
                {isCompleted ? "Muestra este código al cajero para canjear tu premio" : "Muestra este código al cajero para recibir tu sello"}
              </div>
            </div>
            </m.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
