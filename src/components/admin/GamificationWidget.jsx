import React from 'react';
import { calculateTierProgress } from '../../lib/gamification';
import { useAppContext } from '../../context/AppContext';
import Icon from '../ui/Icon';

export default function GamificationWidget({ ownerView }) {
  const { T } = useAppContext();
  
  const rating = ownerView.rating || 5.0;
  const reviewsCount = ownerView.reviews_count || 0;
  
  const { progress, missingReviews, missingRating, nextTier } = calculateTierProgress(reviewsCount, rating);
  const currentTier = getBizTier(reviewsCount, rating);

  return (
    <div style={{ background: T.white, borderRadius: 16, padding: "20px", marginBottom: 24, border: `1.5px solid ${T.border}`, boxShadow: "0 4px 12px rgba(0,0,0,0.02)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: T.text, display: "flex", alignItems: "center", gap: 8 }}>
            Nivel del Negocio
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: T.sub, fontWeight: 500 }}>Sube de nivel para destacar más.</p>
        </div>
        <div style={{ background: currentTier ? currentTier.color : '#f1f5f9', padding: "8px 12px", borderRadius: 12, display: "flex", alignItems: "center", gap: 6, color: currentTier ? '#fff' : T.text, fontWeight: 800, fontSize: 14 }}>
          <span>{currentTier ? currentTier.icon : '🌱'}</span>
          {currentTier ? currentTier.name : 'Nuevo'}
        </div>
      </div>

      {nextTier ? (
        <>
          <div style={{ background: T.bg, height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 12 }}>
            <div style={{ background: nextTier.color, height: "100%", width: `${progress}%`, transition: "width 0.5s ease", borderRadius: 4 }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600, color: T.sub }}>
            <span>Progreso al nivel {nextTier.name} {nextTier.icon}</span>
            <span>{progress}%</span>
          </div>

          <div style={{ marginTop: 16, background: T.bg, borderRadius: 12, padding: "12px", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: T.text }}>Requisitos para subir:</div>
            
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: missingReviews > 0 ? T.text : '#10b981', fontWeight: 600 }}>
              <Icon name={missingReviews > 0 ? "circle" : "check_circle"} size={16} color={missingReviews > 0 ? T.sub : '#10b981'} />
              <span>{nextTier.minReviews} reseñas reales {missingReviews > 0 && <span style={{ color: T.sub }}>(faltan {missingReviews})</span>}</span>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: missingRating > 0 ? T.text : '#10b981', fontWeight: 600 }}>
              <Icon name={missingRating > 0 ? "circle" : "check_circle"} size={16} color={missingRating > 0 ? T.sub : '#10b981'} />
              <span>Calificación mínima de {nextTier.minRating} ⭐ {missingRating > 0 && <span style={{ color: T.sub }}>(tienes {rating.toFixed(1)})</span>}</span>
            </div>
          </div>
        </>
      ) : (
        <div style={{ background: 'linear-gradient(135deg, rgba(229, 228, 226, 0.2), rgba(255, 215, 0, 0.1))', padding: "16px", borderRadius: 12, textAlign: "center", marginTop: 12, border: "1px solid rgba(229, 228, 226, 0.5)" }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>👑</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.text, marginBottom: 4 }}>¡Nivel Máximo Alcanzado!</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: T.sub }}>Eres de los mejores lugares en tu ciudad.</div>
        </div>
      )}
    </div>
  );
}

// Ensure getBizTier is imported
import { getBizTier } from '../../lib/gamification';
