import React from "react";

// Tres puntos que rebotan en secuencia: el cargador de la pantalla de marca
// (fondo negro, logo oficial, puntos en blanco debajo). Se anima solo con CSS
// `transform` (translateY), que sí funciona en Safari/iPhone: el morph de
// infinito con CSS `d: path()` no se mueve ahí (la forma se queda en círculo),
// por eso se cambió a esto. Con movimiento reducido los puntos quedan fijos.
export default function ThreeDots({ size = 10, gap = 8, color = "#fff" }) {
  return (
    <div aria-hidden="true" style={{ display: "flex", alignItems: "center", gap }}>
      <style>
        {`
        @keyframes three-dots-bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
        .three-dots-dot { animation: three-dots-bounce 1.2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .three-dots-dot { animation: none; }
        }
        `}
      </style>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="three-dots-dot"
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            background: color,
            display: "block",
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
    </div>
  );
}
