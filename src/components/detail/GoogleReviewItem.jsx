import React, { useState } from "react";
import StarRow from "../StarRow.jsx";

const MAX_LEN = 140;

export default function GoogleReviewItem({ r, isElite, dText, dSub, T, isLast }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = r.text && r.text.length > MAX_LEN;
  const displayTxt = (!expanded && isLong) ? r.text.slice(0, MAX_LEN) + "..." : r.text;

  return (
    <React.Fragment>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {r.profile_photo_url ? (
               <img src={r.profile_photo_url} alt="Foto de perfil" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
            ) : (
               <div className="text-xs" style={{ width: 32, height: 32, borderRadius: "50%", background: "#4285F4", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0 }}>{r.author_name ? r.author_name.charAt(0).toUpperCase() : "U"}</div>
            )}
            <div>
              <div className="text-sm" style={{ fontWeight: 700, color: dText }}>{r.author_name}</div>
              <div className="text-xs" style={{ color: dSub, marginTop: 2 }}>{r.relative_time_description}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", flexDirection: "column" }}>
            <StarRow n={r.rating} size={12} />
          </div>
        </div>
        <div className="text-sm" style={{ color: dText, lineHeight: 1.5, textAlign: "left" }}>
          "{displayTxt}"
          {isLong && (
            <span onClick={() => setExpanded(!expanded)} style={{ color: T.green, fontWeight: 700, cursor: "pointer", marginLeft: 4 }}>
              {expanded ? "Mostrar menos" : "Leer más"}
            </span>
          )}
        </div>
      </div>
      {!isLast && <div style={{ height: 1, background: isElite ? "rgba(255,255,255,0.05)" : T.border }} />}
    </React.Fragment>
  );
}
