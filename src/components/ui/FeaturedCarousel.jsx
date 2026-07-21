import React, { useState, useEffect } from 'react';
import FeaturedCard from '../cards/FeaturedCard.jsx';

export default function FeaturedCarousel({ items, T, dark, favIds, toggleFav, onTap, goWhatsApp, goDir, doShare, globalFavCounts }) {
  const [idx, setIdx] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    if (items.length <= 1) return;
    const t = setInterval(() => {
      setFade(false);
      setTimeout(() => { setIdx(i => (i + 1) % items.length); setFade(true); }, 350);
    }, 3000);
    return () => clearInterval(t);
  }, [items.length]);

  if (items.length === 0) return null;
  const b = items[idx];
  return (
    <div>
      <div style={{ opacity: fade ? 1 : 0, transform: fade ? "translateY(0)" : "translateY(8px)", transition: "opacity .35s ease,transform .35s ease" }}>
        <FeaturedCard b={b} T={T} dark={dark} isFav={favIds.includes(b.id)} toggleFav={toggleFav}
          onTap={onTap}
          goWhatsApp={goWhatsApp} goDir={goDir} doShare={doShare} realFavs={globalFavCounts?.[b.id] || 0} />
      </div>
      {items.length > 1 && <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 12 }}>
        {items.map((_, i) => (
          <div key={i} onClick={() => { setFade(false); setTimeout(() => { setIdx(i); setFade(true); }, 350); }}
            style={{ width: i === idx ? 20 : 6, height: 6, borderRadius: 3, background: i === idx ? T.green : `${T.green}44`, cursor: "pointer", transition: "all .3s cubic-bezier(.34,1.1,.64,1)" }} />
        ))}
      </div>}
    </div>
  );
}
