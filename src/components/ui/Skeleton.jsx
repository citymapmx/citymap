
export function Sk({ w, h, r, dark, style }) {
  const bg = dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
  const pulse = dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  return (
    <div style={{ width: w, height: h, borderRadius: r || 4, position: "relative", overflow: "hidden", ...style }}>
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
      {/* Banda de luz diagonal (demo #3): cruza el bloque cada 1,3 s. */}
      <div className="skel-shimmer" aria-hidden="true" />
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
      border: `1px solid ${dark ? "#2A2A2A" : "#F0F0F0"}`,
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Banda de luz diagonal (demo #3): cruza la tarjeta cada 1,3 s. */}
      <div className="skel-shimmer" aria-hidden="true" />
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
          <div className="skel-shimmer" aria-hidden="true" />
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
          <div className="skel-shimmer" aria-hidden="true" />
        </div>
      ))}
    </div>
  );
}

// Esqueleto con la misma altura que el carrusel de eventos (EventCoverflow):
// escenario clamp(240px, 70vw, 326px) + título y subtítulo centrados.
// Evita que el contenido de abajo salte cuando llegan los eventos.
export function CoverflowSk({ dark }) {
  return (
    <div style={{ padding: "4px 0 0" }}>
      <div style={{ height: "clamp(240px, 70vw, 326px)", padding: "0 20px" }}>
        <Sk w="100%" h="100%" r={14} dark={dark} />
      </div>
      <div style={{ padding: "6px 20px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <Sk w="60%" h={17} r={6} dark={dark} />
        <Sk w="40%" h={13} r={6} dark={dark} />
      </div>
    </div>
  );
}

// Esqueleto de "Los 5 imperdibles": título + 5 tarjetas de 150 px.
export function ImperdiblesSk({ dark }) {
  return (
    <div style={{ padding: "24px 20px 10px" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
        <Sk w="70%" h={22} r={6} dark={dark} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <Sk key={i} w="100%" h={150} r={16} dark={dark} />
        ))}
      </div>
    </div>
  );
}

// Esqueleto de la lista por horario (SquareCarousel): título + hilera de cuadros 90x90.
export function TimeListSk({ dark }) {
  return (
    <div style={{ padding: "24px 0 0" }}>
      <div style={{ display: "flex", justifyContent: "center", padding: "0 20px", marginBottom: 12 }}>
        <Sk w="60%" h={22} r={6} dark={dark} />
      </div>
      <div style={{ display: "flex", gap: 10, paddingLeft: 20, paddingRight: 20, paddingBottom: 6, overflow: "hidden" }}>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} style={{ minWidth: 90, maxWidth: 90, flexShrink: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            <Sk w={90} h={90} r={20} dark={dark} />
            <Sk w="80%" h={11} r={4} dark={dark} />
          </div>
        ))}
      </div>
    </div>
  );
}
// Esqueleto de la lista de Eventos (rejilla de 2 columnas): póster 5:7 +
// dos líneas, con la forma de la tarjeta real de evento. Se muestra
// mientras los eventos cargan (dbReady false) en vez del "Sin eventos
// por ahora", que es mentira mientras todavía están llegando.
export function EventGridSk({ dark }) {
  return (
    <div role="status" aria-label="Cargando eventos" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ aspectRatio: "5 / 7", borderRadius: 18, overflow: "hidden" }}>
            <Sk w="100%" h="100%" r={18} dark={dark} />
          </div>
          <Sk w="80%" h={15} r={6} dark={dark} />
          <Sk w="50%" h={12} r={6} dark={dark} />
        </div>
      ))}
    </div>
  );
}

// Esqueleto de un artículo de Revista: collage 21/9 + título + meta, con
// la forma de la tarjeta real de artículo. Se muestra mientras los
// artículos cargan (dbReady false) en vez del "Pronto habrá experiencias".
export function ArticleSk({ dark }) {
  return (
    <div role="status" aria-label="Cargando artículo" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ aspectRatio: "21 / 9", borderRadius: 16, overflow: "hidden" }}>
        <Sk w="100%" h="100%" r={16} dark={dark} />
      </div>
      <Sk w="70%" h={17} r={6} dark={dark} />
      <Sk w="45%" h={13} r={6} dark={dark} />
    </div>
  );
}
