import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FONT_BIZ } from "../lib/constants";
import { getThumbUrl } from "../lib/utils";

function BentoCard({ cat, flex, onSelect, isSmall }) {
  if (!cat) return <div style={{ flex }} />;

  const imgToUse = cat.img_url ? getThumbUrl(cat.img_url, 400, 300) : null;
  const subtitleToUse = cat.subtitle || "Explora más";

  // Todos los degradados negros con menor intensidad
  const bgGradient = "linear-gradient(90deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.4) 55%, rgba(0,0,0,0.1) 100%)";
  const bgColor = "#000";

  return (
    <div
      className="press"
      onClick={() => onSelect(cat.id)}
      style={{
        flex,
        height: 100,
        borderRadius: 16,
        overflow: "hidden",
        position: "relative",
        cursor: "pointer",
        backgroundColor: bgColor,
        boxShadow: "0 4px 16px rgba(0,0,0,0.15)"
      }}
    >
      {/* Background Image */}
      {imgToUse && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url("${imgToUse}")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.85,
            maskImage: "linear-gradient(270deg, black 0%, black 40%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(270deg, black 0%, black 40%, transparent 100%)"
          }}
        />
      )}
      {/* Gradient Overlay */}
      <div style={{ position: "absolute", inset: 0, background: bgGradient, zIndex: 1 }} />
      {/* Content */}
      <div style={{ position: "relative", zIndex: 2, padding: "16px", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", textAlign: "left" }}>
        <span style={{ fontFamily: FONT_BIZ, fontWeight: 800, fontSize: 19, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
          {cat.label || cat.name}
        </span>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: 500, letterSpacing: 0.2, marginTop: 2 }}>
          {subtitleToUse}
        </span>
      </div>
    </div>
  );
}

function pickFour(categories, offset) {
  if (!categories || categories.length < 4) return categories || [];
  const n = categories.length;
  const picked = [0, 1, 2, 3].map(i => categories[(offset + i) % n]);
  const sorted = [...picked].sort((a, b) => ((b.label || b.name)?.length || 0) - ((a.label || a.name)?.length || 0));
  return [sorted[0], sorted[3], sorted[2], sorted[1]];
}

export default function BentoCategories({ categories, onSelectCategory }) {
  const [offset, setOffset] = useState(0);
  const [keySuffix, setKeySuffix] = useState(0);
  const INTERVAL = 4500;

  const rotate = useCallback(() => {
    setOffset(prev => (prev + 4) % Math.max(categories?.length || 4, 4));
    setKeySuffix(k => k + 1);
  }, [categories?.length]);

  useEffect(() => {
    if (!categories || categories.length <= 4) return;
    const t = setInterval(rotate, INTERVAL);
    return () => clearInterval(t);
  }, [rotate, categories?.length]);

  const selectedCats = pickFour(categories, offset);
  if (!selectedCats || selectedCats.length < 4) return null;

  const totalPages = Math.ceil((categories?.length || 4) / 4);
  const currentPage = Math.floor(offset / 4) % totalPages;

  return (
    <div style={{ padding: "24px 20px 0" }}>
      <div style={{ marginBottom: 16, textAlign: "center" }}>
        <h2 style={{ fontFamily: "'Coolvetica', sans-serif", fontSize: 22, color: "#000", margin: 0, letterSpacing: 0.5 }}>
          Explora por categoría
        </h2>
      </div>

      {/* Fixed-height container to prevent jumps */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Row 1 */}
        <div style={{ display: "flex", gap: 12, overflow: "hidden" }}>
          <AnimatePresence mode="popLayout">
            <motion.div
              key={`r1a-${keySuffix}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              style={{ flex: 1.6, minWidth: 0 }}
            >
              <BentoCard cat={selectedCats[0]} flex={1} onSelect={onSelectCategory} isSmall={false} />
            </motion.div>
            <motion.div
              key={`r1b-${keySuffix}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: "easeOut", delay: 0.05 }}
              style={{ flex: 1, minWidth: 0 }}
            >
              <BentoCard cat={selectedCats[1]} flex={1} onSelect={onSelectCategory} isSmall={true} />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Row 2 */}
        <div style={{ display: "flex", gap: 12, overflow: "hidden" }}>
          <AnimatePresence mode="popLayout">
            <motion.div
              key={`r2a-${keySuffix}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: "easeOut", delay: 0.08 }}
              style={{ flex: 1, minWidth: 0 }}
            >
              <BentoCard cat={selectedCats[2]} flex={1} onSelect={onSelectCategory} isSmall={true} />
            </motion.div>
            <motion.div
              key={`r2b-${keySuffix}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: "easeOut", delay: 0.12 }}
              style={{ flex: 1.6, minWidth: 0 }}
            >
              <BentoCard cat={selectedCats[3]} flex={1} onSelect={onSelectCategory} isSmall={false} />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Dots indicator */}
        {categories.length > 4 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 6, paddingTop: 4 }}>
            {Array.from({ length: totalPages }).map((_, i) => (
              <div key={i} style={{
                width: i === currentPage ? 18 : 6,
                height: 6,
                borderRadius: 3,
                background: i === currentPage ? "#0f172a" : "#d1d5db",
                transition: "all 0.3s ease"
              }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
