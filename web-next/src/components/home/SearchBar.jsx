'use client';

import { useState, useEffect } from 'react';
import Icon from '../ui/Icon';
import { useRouter } from 'next/navigation';

export default function SearchBar({ citySlug, placeholders = ["Buscar restaurantes...", "Buscar eventos...", "Buscar negocios..."] }) {
  const [search, setSearch] = useState('');
  const [phIdx, setPhIdx] = useState(0);
  const [displayedPlaceholder, setDisplayedPlaceholder] = useState('');
  const router = useRouter();

  // Rotate placeholders
  useEffect(() => {
    const t = setInterval(() => {
      setPhIdx(prev => (prev + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(t);
  }, [placeholders.length]);

  // Typewriter effect
  useEffect(() => {
    const targetText = placeholders[phIdx] || "";
    let i = 0;
    setDisplayedPlaceholder("|"); 
    
    const interval = setInterval(() => {
      setDisplayedPlaceholder(targetText.slice(0, i + 1) + (i < targetText.length - 1 ? "|" : ""));
      i++;
      if (i >= targetText.length) {
        clearInterval(interval);
        setDisplayedPlaceholder(targetText);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [phIdx, placeholders]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!search.trim()) return;
    // For now, redirect to the Vite app's search or handle it in Next.js if implemented
    window.location.href = `https://citymap.mx/${citySlug}?q=${encodeURIComponent(search)}`;
  };

  return (
    <form onSubmit={handleSearch} style={{ position: 'relative', width: '100%', maxWidth: 680, margin: '0 auto' }}>
      <input 
        style={{ 
          width: "100%", padding: "16px 16px 16px 48px", 
          border: "none", borderRadius: 100, 
          color: "#111", fontSize: 16, fontWeight: 600, 
          outline: "none", 
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          WebkitAppearance: 'none'
        }} 
        placeholder={displayedPlaceholder} 
        value={search} 
        onChange={e => setSearch(e.target.value)} 
      />
      <span style={{ position: "absolute", left: 18, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", display: "flex" }}>
        <Icon name="search" size={20} color="rgba(17,17,17,0.4)" sw={2.5} />
      </span>
      {search && (
        <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", display: "flex" }}>
          <button type="button" aria-label="Borrar búsqueda" onClick={() => setSearch("")} style={{ background: "rgba(17,17,17,0.08)", borderRadius: "50%", width: 28, height: 28, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
            <Icon name="x" size={14} color="#111" sw={3} />
          </button>
        </div>
      )}
    </form>
  );
}
