import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FeaturedCard from '../cards/FeaturedCard.jsx';

export default function AutoSlider({ businesses, T, dark, favIds, toggleFav, onTap, goWhatsApp, goDir, doShare, getDistStr, globalFavCounts }) {
  const [idx, setIdx] = useState(0);
  
  useEffect(() => {
    if (!businesses || businesses.length <= 1) return;
    const interval = setInterval(() => {
      setIdx(prev => (prev + 1) % businesses.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [businesses]);

  if (!businesses || businesses.length === 0) return null;
  const b = businesses[idx];
  const distStr = getDistStr ? getDistStr(b) : null;

  return (
    <div style={{ padding: "0 20px 10px" }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={b.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <FeaturedCard b={b} T={T} dark={dark} isFav={favIds.includes(b.id)} toggleFav={toggleFav} onTap={onTap} goWhatsApp={goWhatsApp} goDir={goDir} doShare={doShare} distStr={distStr} realFavs={globalFavCounts?.[b.id] || 0} />
        </motion.div>
      </AnimatePresence>
      <div style={{ display: "none" }}>
        {[1, 2, 3].map(offset => {
          const nextB = businesses[(idx + offset) % businesses.length];
          const imgUrl = nextB?.photos?.[0]?.url || nextB?.img_url;
          return imgUrl ? <img key={"preload_" + nextB.id} src={imgUrl} alt="" loading="eager" fetchpriority="high" /> : null;
        })}
      </div>
      {businesses.length <= 15 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 14 }}>
          {businesses.map((_, i) => (
            <div key={i} onClick={() => setIdx(i)} style={{ width: i === idx ? 16 : 6, height: 6, borderRadius: 3, background: i === idx ? T.green : T.border, transition: "all 0.3s", cursor: "pointer" }} />
          ))}
        </div>
      )}
    </div>
  );
}
