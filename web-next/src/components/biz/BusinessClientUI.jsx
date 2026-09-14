'use client';

import { useState, useEffect } from 'react';
import Icon from '../ui/Icon';
// import AuthModal from '../auth/AuthModal'; // We'll create this or use a simple version

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dpkjxhjkzdlkvyotoeai.supabase.co";
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwa2p4aGpremRsa3Z5b3RvZWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MzYzNTAsImV4cCI6MjA5NjAxMjM1MH0.R6ZoNQHKP-DDA4F8phgolf82AEOTII-mLUlWc3DWHyE";

export function FavButton({ bizId, initialFavs = [] }) {
  const [isFav, setIsFav] = useState(false);
  
  useEffect(() => {
    // Ideally we load this from user's favs in Zustand or localStorage
    const saved = JSON.parse(localStorage.getItem('cg_favs') || '[]');
    setIsFav(saved.includes(bizId));
  }, [bizId]);

  const toggleFav = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Simplified local toggle for now
    let saved = JSON.parse(localStorage.getItem('cg_favs') || '[]');
    if (saved.includes(bizId)) {
      saved = saved.filter(id => id !== bizId);
      setIsFav(false);
    } else {
      saved.push(bizId);
      setIsFav(true);
    }
    localStorage.setItem('cg_favs', JSON.stringify(saved));
    // TODO: Sync with DB
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
