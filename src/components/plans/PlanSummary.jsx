import React, { useMemo } from 'react';
import Icon from '../ui/Icon.jsx';
import { calculateHaversineDistance, formatDistance, estimateTravelTime, formatDuration } from '../../lib/utils.js';

export default function PlanSummary({ places, T, dark }) {
  const summary = useMemo(() => {
    let totalDistKm = 0;
    
    // Calculate sequential distance between places
    for (let i = 0; i < places.length - 1; i++) {
      const p1 = places[i]?.business;
      const p2 = places[i + 1]?.business;
      if (p1 && p2 && p1.lat && p1.lng && p2.lat && p2.lng) {
        totalDistKm += calculateHaversineDistance(
          parseFloat(p1.lat), parseFloat(p1.lng),
          parseFloat(p2.lat), parseFloat(p2.lng)
        );
      }
    }

    const travelMinutes = estimateTravelTime(totalDistKm);
    
    // Approximate duration: 1 hour (60 mins) per place + travel time
    const durationMinutes = (places.length * 60) + travelMinutes;

    return {
      count: places.length,
      distanceStr: totalDistKm > 0 ? formatDistance(totalDistKm) : "0 km",
      travelTimeStr: travelMinutes > 0 ? formatDuration(travelMinutes) : "0 min",
      durationStr: durationMinutes > 0 ? formatDuration(durationMinutes) : "0 min"
    };
  }, [places]);

  if (places.length === 0) return null;

  return (
    <div style={{ background: dark ? "rgba(255,255,255,0.05)" : "#F9FAFB", borderRadius: 16, padding: 16, border: `1px solid ${T.border}`, marginBottom: 24 }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Resumen del Recorrido</h3>
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: dark ? "rgba(255,255,255,0.1)" : "#E5E7EB", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="map-pin" size={16} color={T.text} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: T.sub, fontWeight: 600 }}>Lugares</div>
            <div style={{ fontSize: 15, color: T.text, fontWeight: 800 }}>{summary.count}</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: dark ? "rgba(255,255,255,0.1)" : "#E5E7EB", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="map" size={16} color={T.text} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: T.sub, fontWeight: 600 }}>Distancia</div>
            <div style={{ fontSize: 15, color: T.text, fontWeight: 800 }}>{summary.distanceStr}</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: dark ? "rgba(255,255,255,0.1)" : "#E5E7EB", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="compass" size={16} color={T.text} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: T.sub, fontWeight: 600 }}>Traslados</div>
            <div style={{ fontSize: 15, color: T.text, fontWeight: 800 }}>{summary.travelTimeStr}</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: dark ? "rgba(255,255,255,0.1)" : "#E5E7EB", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="clock" size={16} color={T.text} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: T.sub, fontWeight: 600 }}>Duración Total</div>
            <div style={{ fontSize: 15, color: T.text, fontWeight: 800 }}>{summary.durationStr}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
