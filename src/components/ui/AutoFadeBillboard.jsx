import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FeaturedCard from '../cards/FeaturedCard.jsx';

export default function AutoFadeBillboard({ businesses, T, dark, favIds, toggleFav, onTap, goWhatsApp, goDir, doShare, getDistStr, globalFavCounts }) {
  const [idx, setIdx] = useState(0);
  
  useEffect(() => {
    if (!businesses || businesses.length <= 1) return;
    const interval = setInterval(() => {
      setIdx(prev => (prev + 1) % businesses.length);
    }, 5000);
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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          <FeaturedCard b={b} T={T} dark={dark} isFav={favIds.includes(b.id)} toggleFav={toggleFav} onTap={onTap} goWhatsApp={goWhatsApp} goDir={goDir} doShare={doShare} distStr={distStr} realFavs={globalFavCounts?.[b.id] || 0} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
