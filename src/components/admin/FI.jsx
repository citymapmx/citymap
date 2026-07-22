import React from 'react';

export default function FI({ label, field, src, set, type = "text", rows, ph = "" }) {
  const handleChange = e => {
    const val = type === "number" ? e.target.value : e.target.value;
    set(prev => ({ ...prev, [field]: val }));
  };
  const inputStyle = { padding: "11px 14px", border: "1.5px solid #E4E8E4", borderRadius: 10, fontSize: 16, color: "#0F1A14", background: "#fff", fontFamily: "inherit", width: "100%" };
  
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8 }}>{label}</label>
      {rows
        ? <textarea rows={rows} defaultValue={src[field] || ""} placeholder={ph} onBlur={handleChange} style={{ ...inputStyle, resize: "vertical" }} />
        : <input type={type} defaultValue={src[field] ?? ""} placeholder={ph} key={`${field}-${src?.id || "new"}`} onBlur={handleChange} style={inputStyle} />
      }
    </div>
  );
}
