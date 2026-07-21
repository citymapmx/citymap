import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Geolocation } from '@capacitor/geolocation';

const STORAGE_KEY = "cg_loc_prompt_seen";

export default function LocationPermissionModal({ onGranted, onDismiss, T }) {
  const [loading, setLoading] = useState(false);
  const [denied, setDenied] = useState(false);

  const handleAllow = async () => {
    setLoading(true);
    try {
      const perm = await Geolocation.checkPermissions();
      if (perm.location !== 'granted') {
        const req = await Geolocation.requestPermissions();
        if (req.location !== 'granted') throw new Error("denied");
      }
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 12000 });
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      localStorage.setItem("cg_coords", JSON.stringify(coords));
      localStorage.setItem(STORAGE_KEY, "granted");
      setLoading(false);
      onGranted(coords);
    } catch (e) {
      localStorage.setItem(STORAGE_KEY, "denied");
      setLoading(false);
      setDenied(true);
    }
  };

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, "skipped");
    onDismiss();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          zIndex: 9999,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          padding: "0 0 0 0",
        }}
        onClick={handleSkip}
      >
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: "spring", damping: 26, stiffness: 260 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%",
            maxWidth: 480,
            background: T?.white || "#fff",
            borderRadius: "28px 28px 0 0",
            padding: "32px 28px 40px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 0,
            boxShadow: "0 -8px 48px rgba(0,0,0,0.18)",
          }}
        >
          {/* Pill handle */}
          <div style={{ width: 36, height: 4, borderRadius: 99, background: T?.border || "#e5e7eb", marginBottom: 28 }} />

          {/* Icon */}
          <div style={{
            width: 80, height: 80, borderRadius: "50%",
            background: "linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 38, marginBottom: 20,
            boxShadow: "0 8px 24px rgba(99,102,241,0.35)"
          }}>
            📍
          </div>

          {/* Title */}
          <div style={{
            fontWeight: 800, fontSize: 22,
            color: T?.text || "#111",
            textAlign: "center", marginBottom: 10,
            fontFamily: "inherit",
            lineHeight: 1.2
          }}>
            {denied ? "Permiso denegado" : "¿Dónde estás?"}
          </div>

          {/* Description */}
          <div style={{
            fontSize: 14, color: T?.sub || "#6b7280",
            textAlign: "center", lineHeight: 1.6,
            maxWidth: 300, marginBottom: 28
          }}>
            {denied
              ? "Para activar tu ubicación, ve a Ajustes de tu teléfono → Aplicaciones → Citymap → Permisos → Ubicación."
              : "Activa tu ubicación para descubrir negocios cerca de ti, ver distancias y encontrar lo mejor de tu zona."}
          </div>

          {/* Benefits */}
          {!denied && (
            <div style={{
              width: "100%", background: T?.bg || "#f9fafb",
              borderRadius: 16, padding: "14px 16px",
              marginBottom: 24, display: "flex", flexDirection: "column", gap: 10
            }}>
              {[
                { icon: "🏪", text: "Negocios abiertos cerca de ti" },
                { icon: "📏", text: "Distancia exacta a cada lugar" },
                { icon: "🗺️", text: "Tu posición en el mapa" },
              ].map(({ icon, text }) => (
                <div key={text} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 18 }}>{icon}</span>
                  <span style={{ fontSize: 13, color: T?.text || "#374151", fontWeight: 500 }}>{text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Buttons */}
          {!denied ? (
            <>
              <button
                onClick={handleAllow}
                disabled={loading}
                style={{
                  width: "100%", padding: "15px 0",
                  borderRadius: 16, border: "none",
                  background: loading
                    ? "#9CA3AF"
                    : "linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)",
                  color: "#fff", fontWeight: 800, fontSize: 16,
                  cursor: loading ? "not-allowed" : "pointer",
                  fontFamily: "inherit", marginBottom: 10,
                  boxShadow: loading ? "none" : "0 6px 20px rgba(99,102,241,0.4)",
                  transition: "all 0.2s"
                }}
              >
                {loading ? "Detectando ubicación…" : "Permitir ubicación"}
              </button>
              <button
                onClick={handleSkip}
                style={{
                  width: "100%", padding: "12px 0",
                  borderRadius: 16, border: "none",
                  background: "transparent",
                  color: T?.sub || "#6b7280", fontWeight: 600, fontSize: 14,
                  cursor: "pointer", fontFamily: "inherit"
                }}
              >
                Ahora no
              </button>
            </>
          ) : (
            <button
              onClick={handleSkip}
              style={{
                width: "100%", padding: "15px 0",
                borderRadius: 16, border: "none",
                background: T?.text || "#111",
                color: T?.bg || "#fff", fontWeight: 800, fontSize: 16,
                cursor: "pointer", fontFamily: "inherit"
              }}
            >
              Entendido
            </button>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/** Returns true if we should show the location modal */
export function shouldShowLocationModal() {
  // Already have coords cached → no need
  if (localStorage.getItem("cg_coords")) return false;
  // User already saw the prompt
  const seen = localStorage.getItem(STORAGE_KEY);
  if (seen) return false;
  return true;
}
