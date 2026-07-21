import { useState, useEffect, useRef, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";

// ─── Fisher-Yates shuffle ─────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── ROTATING BUSINESS BANNER ─────────────────────────────────────────────────
export default function RotatingBusinessBanner({ biz, onTap }) {
  // Solo negocios con foto de portada
  const eligible = useMemo(
    () => biz.filter(b => b.photos?.[0]?.url),
    [biz]
  );

  // Cola de reproducción: arreglo mezclado, se rellena al agotarse
  const queueRef = useRef([]);
  const [current, setCurrent] = useState(null);
  const [idx, setIdx] = useState(0); // key para AnimatePresence

  // Inicializar al montar o cuando cambia la lista
  useEffect(() => {
    if (eligible.length === 0) return;
    queueRef.current = shuffle(eligible);
    setCurrent(queueRef.current[0]);
    setIdx(0);
  }, [eligible.length]);

  // Rotación automática cada 4 s
  useEffect(() => {
    if (eligible.length < 2) return;

    const tick = () => {
      queueRef.current = queueRef.current.slice(1);

      // Cola vacía → remezclar evitando repetir el último
      if (queueRef.current.length === 0) {
        let next = shuffle(eligible);
        // Evitar que el primer elemento del nuevo ciclo sea igual al actual
        if (next[0]?.id === current?.id && next.length > 1) {
          [next[0], next[1]] = [next[1], next[0]];
        }
        queueRef.current = next;
      }

      setCurrent(queueRef.current[0]);
      setIdx(i => i + 1);
    };

    const timer = setInterval(tick, 7000);
    return () => clearInterval(timer);
  }, [eligible, current]);

  if (!current) return null;

  return (
    <div style={{ padding: "16px 20px 0" }}>
      {/* Título de sección */}
      <div style={{ marginBottom: 10 }}>
        <span style={{
          fontFamily: "'Coolvetica', sans-serif",
          fontSize: 20,
          color: "var(--banner-text, #0F1A14)",
        }}>
          Descubre
        </span>
      </div>

      {/* Banner */}
      <div
        onClick={() => onTap?.(current)}
        style={{
          position: "relative",
          height: 156,
          borderRadius: 24,
          overflow: "hidden",
          cursor: "pointer",
          background: "#111",
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            style={{
              position: "absolute",
              inset: 0,
            }}
          >
            {/* Imagen */}
            <img
              src={current.photos[0].url}
              alt={current.name}
              loading="lazy"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center",
                display: "block",
              }}
            />

            {/* Degradado oscuro */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(to top, rgba(0,0,0,.75), rgba(0,0,0,.15))",
                pointerEvents: "none",
              }}
            />

            {/* Nombre del negocio */}
            <div
              style={{
                position: "absolute",
                bottom: 18,
                left: 20,
                right: 20,
              }}
            >
              <div
                style={{
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                  fontWeight: 700,
                  fontSize: 22,
                  color: "#fff",
                  lineHeight: 1.1,
                  textShadow: "0 2px 12px rgba(0,0,0,.5)",
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {current.name}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Indicadores de puntos */}
        {eligible.length > 1 && (
          <div
            style={{
              position: "absolute",
              top: 14,
              right: 16,
              display: "flex",
              gap: 4,
              alignItems: "center",
              zIndex: 10,
            }}
          >
            {Array.from({ length: Math.min(eligible.length, 6) }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === idx % Math.min(eligible.length, 6) ? 16 : 5,
                  height: 5,
                  borderRadius: 3,
                  background:
                    i === idx % Math.min(eligible.length, 6)
                      ? "rgba(255,255,255,.95)"
                      : "rgba(255,255,255,.35)",
                  transition: "width .4s cubic-bezier(.34,1.1,.64,1)",
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
