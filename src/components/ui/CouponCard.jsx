import React, { useState, useEffect } from 'react';

export default function CouponCard({ coupon, bizName, isClaimed = false, onClick, onClaimClick, dark, T, uniqueCode, claimedAt }) {
  const bg = dark ? "#1E293B" : "#FFFFFF";
  const text = dark ? "#F8FAFC" : "#111827";
  const sub = dark ? "#94A3B8" : "#6B7280";
  const border = dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)";
  
  // Premium monochrome button
  const btnBg = dark ? "#F8FAFC" : "#111827";
  const btnText = dark ? "#0F172A" : "#FFFFFF";

  const [timeLeft, setTimeLeft] = useState("");
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!isClaimed || !claimedAt) return;

    const updateTimer = () => {
      const diff = 86400000 - (Date.now() - claimedAt);
      if (diff <= 0) {
        setExpired(true);
        setTimeLeft("Expirado");
      } else {
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`);
        setExpired(false);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isClaimed, claimedAt]);

  return (
    <div 
      onClick={onClick}
      style={{ 
        width: "100%", 
        minWidth: 260,
        background: bg, 
        borderRadius: 16, 
        border: `1px solid ${border}`, 
        overflow: "hidden", 
        cursor: onClick ? "pointer" : "default",
        boxShadow: dark ? "0 4px 20px rgba(0,0,0,0.3)" : "0 4px 16px rgba(0,0,0,0.04)",
        display: "flex",
        flexDirection: "column",
        position: "relative"
      }}
    >
      {/* Top Part: Content */}
      <div style={{ padding: "16px", display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: sub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {bizName}
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, color: text, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {coupon.title}
          </div>
          {coupon.min_purchase > 0 && (
            <div style={{ fontSize: 12, fontWeight: 600, color: sub, marginTop: 6 }}>
              Consumo mín: ${coupon.min_purchase}
            </div>
          )}
        </div>
      </div>

      {/* Divider with Cutouts */}
      <div style={{ position: "relative", height: 20, display: "flex", alignItems: "center" }}>
        <div style={{ position: "absolute", left: -10, width: 20, height: 20, borderRadius: "50%", background: dark ? "#0F172A" : "#F8FAFC", borderRight: `1px solid ${border}` }} />
        <div style={{ flex: 1, borderTop: `2px dashed ${border}`, margin: "0 14px" }} />
        <div style={{ position: "absolute", right: -10, width: 20, height: 20, borderRadius: "50%", background: dark ? "#0F172A" : "#F8FAFC", borderLeft: `1px solid ${border}` }} />
      </div>

      {/* Bottom Part: Action / Code */}
      <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", background: dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)" }}>
        {isClaimed ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", overflow: "hidden" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
               <div style={{ fontSize: 10, fontWeight: 700, color: sub, textTransform: "uppercase", letterSpacing: 0.5 }}>CÓDIGO SECRETO</div>
               <div style={{ fontSize: 16, fontWeight: 900, color: text, letterSpacing: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: "monospace" }}>{uniqueCode}</div>
            </div>
            <div style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${expired ? border : 'transparent'}`, background: expired ? "transparent" : btnBg, color: expired ? sub : btnText, fontWeight: 800, fontSize: 12, display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              {expired ? "Expirado" : `⏳ ${timeLeft}`}
            </div>
          </div>
        ) : (
          <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: sub, letterSpacing: 2, fontFamily: "monospace", opacity: 0.6 }}>{coupon.code}</div>
            <div 
              onClick={(e) => {
                if (onClaimClick) {
                  e.stopPropagation();
                  onClaimClick(e);
                }
              }}
              style={{ padding: "8px 14px", borderRadius: 20, background: btnBg, color: btnText, fontWeight: 800, fontSize: 12, display: "flex", alignItems: "center", gap: 4, cursor: onClaimClick ? "pointer" : "default" }}
            >
              Reclamar
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
