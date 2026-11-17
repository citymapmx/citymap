import { useState } from "react";
import { getThumbUrl } from "../lib/utils.js";

// Avatar de reseña: la foto de perfil del autor en el mismo círculo de
// 40 px que hoy muestra las iniciales. La foto ya es chica de origen
// (el avatar subido se limita a 300 px / 0.1 MB y el de Google trae su
// parámetro de tamaño) y getThumbUrl solo transforma URLs de Supabase o
// Cloudinary: las externas pasan tal cual, sin romperse. Si la imagen no
// carga, se cae al círculo de iniciales de siempre.
export default function ReviewAvatar({ avatarUrl, userInit, userColor }) {
  const [failed, setFailed] = useState(false);
  const circle = { width: 40, height: 40, borderRadius: "50%", flexShrink: 0 };
  if (avatarUrl && !failed) {
    return (
      <img
        src={getThumbUrl(avatarUrl, 80, 80)}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        style={{ ...circle, objectFit: "cover", display: "block" }}
      />
    );
  }
  return (
    <div className="text-sm" style={{ ...circle, background: userColor || "#111", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff" }}>{userInit}</div>
  );
}
