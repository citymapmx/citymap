import React from 'react';

const stardustParticles = [...Array(30)].map((_, i) => ({
  size: Math.random() * 2 + 1.5,
  left: Math.random() * 100,
  animDuration: Math.random() * 8 + 12,
  delay: Math.random() * 20
}));

const CosmicBackground = () => {
  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", zIndex: -1, background: "#0F172A", overflow: "hidden", pointerEvents: "none" }}>
      {/* Fondo Premium / Espacial */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, background: "#060B14", overflow: "hidden" }}>
        {/* Subtle Glows */}
        <div style={{ position: "absolute", top: "-10%", left: "-10%", width: "70%", height: "70%", background: "radial-gradient(circle, rgba(124,58,237,0.12) 0%, rgba(124,58,237,0) 70%)", filter: "blur(40px)" }} />
        <div style={{ position: "absolute", bottom: "-10%", right: "-20%", width: "80%", height: "80%", background: "radial-gradient(circle, rgba(56,189,248,0.08) 0%, rgba(56,189,248,0) 70%)", filter: "blur(40px)" }} />
        
        {/* Floating Particles */}
        <style>{`
          @keyframes stardustFloat {
            0% { transform: translateY(20vh) scale(0.5); opacity: 0; }
            20% { opacity: 0.9; }
            80% { opacity: 0.9; }
            100% { transform: translateY(-80vh) scale(1.2); opacity: 0; }
          }
          .stardust {
            position: absolute;
            background: rgba(255, 255, 255, 0.9);
            border-radius: 50%;
            filter: blur(0.5px);
            bottom: 0;
            box-shadow: 0 0 6px rgba(255,255,255,0.6);
          }
        `}</style>
        {stardustParticles.map((p, i) => (
          <div
            key={i}
            className="stardust"
            style={{
              width: p.size,
              height: p.size,
              left: `${p.left}%`,
              animation: `stardustFloat ${p.animDuration}s linear infinite`,
              animationDelay: `-${p.delay}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default CosmicBackground;
