import React from 'react';

export function Sk({ w, h, r, dark, style }) {
  const bg = dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
  const pulse = dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  return (
    <div style={{ width: w, height: h, borderRadius: r || 4, ...style }}>
      <style>{`
        @keyframes skelPulse {
          0% { background-color: ${bg}; }
          50% { background-color: ${pulse}; }
          100% { background-color: ${bg}; }
        }
        .skel-block {
          animation: skelPulse 1.5s ease-in-out infinite;
        }
      `}</style>
      <div className="skel-block" style={{ width: '100%', height: '100%', borderRadius: r || 4 }} />
    </div>
  );
}

export function CardSk({ dark }) {
  const bg = dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
  const pulse = dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  
  return (
    <div style={{ 
      padding: 12, 
      background: dark ? "#1A1A1A" : "#FFFFFF", 
      borderRadius: 16, 
      display: "flex", 
      gap: 12, 
      marginBottom: 16,
      border: `1px solid ${dark ? "#2A2A2A" : "#F0F0F0"}`
    }}>
      <style>{`
        @keyframes skelPulse {
          0% { background-color: ${bg}; }
          50% { background-color: ${pulse}; }
          100% { background-color: ${bg}; }
        }
        .skel-block {
          animation: skelPulse 1.5s ease-in-out infinite;
          border-radius: 8px;
        }
      `}</style>
      
      {/* Imagen */}
      <div className="skel-block" style={{ width: 80, height: 80, borderRadius: 12, flexShrink: 0 }}></div>
      
      {/* Contenido */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 }}>
        <div className="skel-block" style={{ height: 18, width: "70%" }}></div>
        <div className="skel-block" style={{ height: 14, width: "40%" }}></div>
        <div className="skel-block" style={{ height: 14, width: "25%" }}></div>
      </div>
    </div>
  );
}

export function DuoSk({ dark }) {
  const bg = dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
  const pulse = dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  return (
    <div style={{ display: "flex", gap: 12, padding: "0 20px 10px" }}>
      {[1, 2].map(i => (
        <div key={i} style={{ flex: 1, minWidth: "calc(50% - 6px)", height: 140, borderRadius: 16, background: bg, position: "relative", overflow: "hidden" }}>
          <style>{`
            @keyframes skelPulse {
              0% { background-color: ${bg}; }
              50% { background-color: ${pulse}; }
              100% { background-color: ${bg}; }
            }
          `}</style>
          <div style={{ width: '100%', height: '100%', animation: 'skelPulse 1.5s ease-in-out infinite' }} />
        </div>
      ))}
    </div>
  );
}

export function EventSk({ dark }) {
  const bg = dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
  const pulse = dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  return (
    <div style={{ display: "flex", gap: 12, padding: "0 0 8px 20px", overflowX: "hidden" }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ width: 140, height: 180, flexShrink: 0, borderRadius: 4, background: bg, position: "relative", overflow: "hidden" }}>
          <style>{`
            @keyframes skelPulse {
              0% { background-color: ${bg}; }
              50% { background-color: ${pulse}; }
              100% { background-color: ${bg}; }
            }
          `}</style>
          <div style={{ width: '100%', height: '100%', animation: 'skelPulse 1.5s ease-in-out infinite' }} />
        </div>
      ))}
    </div>
  );
}