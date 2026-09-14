'use client';

import { useState, useEffect } from 'react';
import Icon from '../ui/Icon';
import { useAuthStore } from '../../store/useAuthStore';
import { sb } from '../../lib/supabase';

export default function FavButton({ bizId }) {
  const [isFav, setIsFav] = useState(false);
  const user = useAuthStore(s => s.user);
  const setShowAuth = useAuthStore(s => s.setShowAuth);

  useEffect(() => {
    if (!user) {
      setIsFav(false);
      return;
    }
    // Check if fav in db
    sb.get("favorites", `?user_id=eq.${user.id}&biz_id=eq.${bizId}`)
      .then(res => {
        if (res && res.length > 0) setIsFav(true);
      })
      .catch(console.error);
  }, [user, bizId]);

  const toggleFav = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      setShowAuth(true);
      return;
    }
    
    setIsFav(!isFav); // optimistic UI
    try {
      if (isFav) {
        await sb.delete("favorites", `?user_id=eq.${user.id}&biz_id=eq.${bizId}`);
      } else {
        await sb.post("favorites", { user_id: user.id, biz_id: bizId });
      }
    } catch (err) {
      console.error(err);
      setIsFav(isFav); // revert
    }
  };

  return (
    <button 
      onClick={toggleFav}
      aria-label={isFav ? "Quitar de favoritos" : "Añadir a favoritos"}
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 0px) + 14px)',
        right: 16,
        zIndex: 100,
        width: 40,
        height: 40,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 12px rgba(0,0,0,0.14)',
      }}
    >
      <Icon name={isFav ? "heart_overlay_f" : "heart_overlay"} size={22} color={isFav ? "#E11D48" : "#0F172A"} />
    </button>
  );
}
