import { useEffect, useState } from "react";
import { m } from "framer-motion";
import Icon from "./Icon.jsx";
import { useSaveBurst } from "../../hooks/useSaveBurst.js";

// Corazón al guardar (demo #1 de "15 animaciones para citymap", elegida
// por Jonathan, nov 2026): al tocar el corazón para GUARDAR, el corazón
// se llena de rojo con un saltito (pop único: escala 0.4 → 1.35 → 1 en
// 0.45 s) y suelta un estallido de 10 chispitas de colores (0.65 s) que
// salen del corazón. Al tocar de nuevo para QUITAR, el corazón se vacía
// sin pop ni chispas.
//
// NO es el confeti grande de celebración de la #15 (Jonathan: «No el
// 15»): solo el burst pequeño propio de la demo #1.
//
// El diseño actual queda intacto: mismo botón 44x44, misma posición,
// mismo tamaño y colores del corazón; la animación es solo
// transform/opacity + partículas que no mueven el layout. Sin movimiento
// reducido: solo el llenado, sin pop ni partículas (guarda CSS en
// index.css + guarda JS en HeartBurst).

// Geometría determinista (sin Math.random: el mismo estallido en cada
// toque, estable entre renders y en pruebas).
const SPARK_COLORS = ["#FF2D55", "#FFC531", "#2D9CDB", "#27AE60", "#9B51E0", "#FF6B35", "#00C2A8", "#F2994A", "#EB5757", "#56CCF2"];
const SPARKS = SPARK_COLORS.map((color, i) => {
  const angle = (i / SPARK_COLORS.length) * Math.PI * 2;
  const dist = 24 + (i % 3) * 5;
  return {
    color,
    tx: `${(Math.cos(angle) * dist).toFixed(1)}px`,
    ty: `${(Math.sin(angle) * dist).toFixed(1)}px`,
  };
});

// 10 chispitas de colores (0.65 s) alrededor del corazón. Solo se monta
// al guardar; se desmonta 1 s después. Con movimiento reducido no se
// monta nada (además del guarda CSS).
export function HeartBurst({ burstKey }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!burstKey) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    setVisible(true);
    const t = window.setTimeout(() => setVisible(false), 1000);
    return () => window.clearTimeout(t);
  }, [burstKey]);
  if (!visible) return null;
  return (
    <span key={burstKey} className="heart-burst" aria-hidden="true">
      {SPARKS.map((s, i) => (
        <span key={`spark-${i}`} className="heart-spark" style={{ background: s.color, "--tx": s.tx, "--ty": s.ty }} />
      ))}
    </span>
  );
}

// Botón de guardar con el diseño actual intacto. El pop va en un span
// interior (key={burstKey} lo remonta y reinicia la animación solo al
// guardar); el whileTap del botón se conserva como estaba.
export default function SaveHeartButton({
  isFav,
  onToggle,
  size = 26,
  overlay = true,
  T,
  title,
  ariaLabel,
  buttonStyle,
  iconStyle,
  whileTapScale = 0.7,
  className,
}) {
  const burstKey = useSaveBurst(isFav);
  return (
    <m.button
      whileTap={{ scale: whileTapScale }}
      onClick={onToggle}
      title={title}
      aria-label={ariaLabel}
      aria-pressed={isFav}
      className={className}
      style={{
        width: 44,
        height: 44,
        background: "transparent",
        border: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        outline: "none",
        position: "relative",
        filter: overlay ? "drop-shadow(0 2px 4px rgba(0,0,0,0.6))" : "none",
        ...buttonStyle,
      }}
    >
      <span key={burstKey} className={burstKey ? "heart-pop-once" : undefined} style={{ display: "flex" }}>
        <Icon
          name={overlay ? (isFav ? "heart_overlay_f" : "heart_overlay") : (isFav ? "heart_f" : "heart")}
          size={size}
          color={overlay ? "none" : (isFav ? "#F07060" : T?.sub)}
          style={iconStyle}
        />
      </span>
      <HeartBurst burstKey={burstKey} />
    </m.button>
  );
}
