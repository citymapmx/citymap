// Plantilla de la tarjeta para compartir (PR #142, v1): UN estilo oscuro
// tipo «Glass» — foto arriba, categoría en versales, nombre grande,
// píldoras con calificación/ciudad/precio y «Descúbrelo en CityMap» al pie.
// Solo estilos en línea: html-to-image clona el nodo y los estilos en
// línea viajan con él sin depender de la hoja de la app. Sin
// backdrop-filter ni animaciones: la tarjeta es una imagen estática.
// La foto lleva crossOrigin="anonymous" para que html-to-image pueda
// leerla (Supabase y Cloudinary responden Access-Control-Allow-Origin: *).
// Sin foto no hay imagen rota: sale un bloque oscuro con la inicial del
// nombre. Sin precio no hay píldora de precio: nunca se inventa.
import { getThumbUrl } from '../lib/utils.js';

const LAYOUT = {
  story: { pad: 64, photoH: 1080, catSize: 32, nameSize: 76, pillSize: 34, footSize: 30, radius: 40 },
  post: { pad: 48, photoH: 480, catSize: 28, nameSize: 60, pillSize: 30, footSize: 26, radius: 32 },
};

export default function ShareCardTemplate({ data, format, onPhotoError }) {
  const f = format || { id: 'story', width: 1080, height: 1920 };
  const L = LAYOUT[f.id] || LAYOUT.story;
  const width = f.width;
  const photoW = width - L.pad * 2;
  // La foto se pide ancha (1600w por el bucket de getThumbUrl) para que
  // salga nítida en la exportación a 1080 px.
  const photoSrc = data?.photoUrl ? getThumbUrl(data.photoUrl, 1080) : null;

  return (
    <div
      style={{
        width,
        height: f.height,
        boxSizing: 'border-box',
        padding: L.pad,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: 'linear-gradient(180deg, #1B1B1B 0%, #0B0B0B 100%)',
        color: '#FFFFFF',
        fontFamily: "var(--heading), system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        textAlign: 'center',
        overflow: 'hidden',
      }}
    >
      {photoSrc ? (
        <img
          src={photoSrc}
          crossOrigin="anonymous"
          onError={onPhotoError}
          alt=""
          style={{
            width: photoW,
            height: L.photoH,
            objectFit: 'cover',
            borderRadius: L.radius,
            display: 'block',
            backgroundColor: '#262626',
          }}
        />
      ) : (
        <div
          style={{
            width: photoW,
            height: L.photoH,
            borderRadius: L.radius,
            background: '#262626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255,255,255,0.35)',
            fontSize: L.photoH * 0.45,
            fontWeight: 800,
            lineHeight: 1,
          }}
        >
          {(data?.name || 'C').trim().charAt(0).toUpperCase()}
        </div>
      )}

      {data?.category ? (
        <div
          style={{
            marginTop: L.pad * 0.55,
            fontSize: L.catSize,
            fontWeight: 700,
            letterSpacing: 6,
            textTransform: 'uppercase',
            color: '#A3A3A3',
          }}
        >
          {data.category}
        </div>
      ) : null}

      <div
        style={{
          marginTop: 18,
          fontSize: L.nameSize,
          fontWeight: 800,
          lineHeight: 1.12,
          letterSpacing: -1,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {data?.name || ''}
      </div>

      <div
        style={{
          marginTop: 30,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 16,
        }}
      >
        {typeof data?.rating === 'number' && data.rating > 0 ? (
          <span
            style={{
              background: 'rgba(255,255,255,0.12)',
              borderRadius: 999,
              padding: '12px 26px',
              fontSize: L.pillSize,
              fontWeight: 700,
            }}
          >
            ★ {data.rating.toFixed(1)}
          </span>
        ) : null}
        {data?.cityName ? (
          <span
            style={{
              background: 'rgba(255,255,255,0.12)',
              borderRadius: 999,
              padding: '12px 26px',
              fontSize: L.pillSize,
              fontWeight: 700,
            }}
          >
            {data.cityName}
          </span>
        ) : null}
        {data?.price ? (
          <span
            style={{
              background: 'rgba(255,255,255,0.12)',
              borderRadius: 999,
              padding: '12px 26px',
              fontSize: L.pillSize,
              fontWeight: 700,
            }}
          >
            {data.price}
          </span>
        ) : null}
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ fontSize: L.footSize, letterSpacing: 2, color: '#A3A3A3' }}>
        Descúbrelo en <span style={{ color: '#FFFFFF', fontWeight: 800 }}>CityMap</span>
      </div>
    </div>
  );
}
