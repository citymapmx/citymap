// Plantilla de la tarjeta para compartir el artículo / experiencia
// (mismo patrón que la de eventos, PR #152): UN SOLO estilo,
// «Foto completa», EXACTAMENTE como la propuesta 2 de la demo
// `propuestas-de-tarjetas-para-articulos` (corrección de Jonathan
// 10 Nov ~10:54: el segundo estilo, de fondo claro, se veía mal en vivo): la foto
// llena TODA la tarjeta a sangre, el texto va encima con degradados,
// pastilla «citymap.mx» arriba a la izquierda, pastilla de calificación
// arriba a la derecha (solo si es real), pastilla azul de ciudad · tipo,
// título, descripción, duración · idiomas, y el precio en una pastilla
// AZUL grande («DESDE $1,881 MXN por persona»). Sin logotipo grande ni
// pie: la marca es la pastilla citymap.mx, como en la demo. Sin foto no
// hay imagen rota: sale un degradado oscuro con la inicial del título.
// La vista previa y el PNG exportado comparten la misma geometría:
// EXPERIENCE_SHARE_CARD_LAYOUT + computeExperienceShareCardLayout en
// lib/experienceShareCard.js, así que lo que se ve es lo que se descarga.
import { getThumbUrl } from '../lib/utils.js';
import {
  EXPERIENCE_SHARE_CARD_FORMATS,
  EXPERIENCE_SHARE_CARD_BLUE,
  computeExperienceShareCardLayout,
} from '../lib/experienceShareCard.js';

export default function ExperienceShareCardTemplate({ data, format, onPhotoError }) {
  const f = format || EXPERIENCE_SHARE_CARD_FORMATS.story;
  const L = computeExperienceShareCardLayout(data, format).L;
  const width = f.width;
  // Las líneas (título, ciudad, descripción, datos, pastillas) se
  // calculan con la misma función que usa el exportador de canvas:
  // el corte y los anchos son idénticos en ambos.
  const layout = computeExperienceShareCardLayout(data, format);
  // La foto se pide ancha (1080w por el bucket de getThumbUrl) para que
  // salga nítida en la exportación a 1080 px.
  const photoSrc = data?.photoUrl ? getThumbUrl(data.photoUrl, 1080) : null;
  const initial = (data?.title || 'C').trim().charAt(0).toUpperCase() || 'C';
  const gradTopH = Math.round(f.height * L.gradTopH);
  const gradBottomH = Math.round(f.height * L.gradBottomH);

  const pill = (geo, children, extra) => (
    <div
      style={{
        position: 'absolute',
        left: geo.x,
        top: geo.y,
        width: geo.w,
        height: geo.h,
        borderRadius: geo.h / 2,
        display: 'flex',
        alignItems: 'center',
        boxSizing: 'border-box',
        padding: `0 ${geo.padX}px`,
        ...extra,
      }}
    >
      {children}
    </div>
  );

  return (
    <div
      style={{
        width,
        height: f.height,
        boxSizing: 'border-box',
        background: '#111111',
        color: '#FFFFFF',
        fontFamily: "var(--heading), system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        textAlign: 'left',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Foto a sangre completa (o degradado + inicial sin foto) */}
      {photoSrc ? (
        <img
          src={photoSrc}
          crossOrigin="anonymous"
          onError={onPhotoError}
          alt=""
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      ) : (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, #262626 0%, #111111 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              color: 'rgba(255,255,255,0.35)',
              fontSize: Math.round(Math.min(width, f.height) * 0.3),
              fontWeight: 800,
              lineHeight: 1,
            }}
          >
            {initial}
          </span>
        </div>
      )}

      {/* Degradados para que se lea el texto */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: gradTopH,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: gradBottomH,
          background: 'linear-gradient(0deg, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0) 100%)',
        }}
      />

      {/* Pastilla citymap.mx (arriba a la izquierda) */}
      {pill(
        layout.brandPill,
        <>
          <span style={{ fontSize: layout.brandPill.size, fontWeight: 800, lineHeight: 1, color: '#FFFFFF' }}>
            citymap
          </span>
          <span style={{ fontSize: layout.brandPill.size, fontWeight: 800, lineHeight: 1, color: '#60A5FA' }}>
            .mx
          </span>
        </>,
        { background: '#111827' },
      )}

      {/* Pastilla de calificación (arriba a la derecha, solo si es real) */}
      {layout.ratingPill
        ? pill(
            layout.ratingPill,
            <>
              <span style={{ fontSize: layout.ratingPill.size, fontWeight: 800, lineHeight: 1, color: '#F59E0B', marginRight: 6 }}>
                ★
              </span>
              <span style={{ fontSize: layout.ratingPill.size, fontWeight: 600, lineHeight: 1, color: '#111827' }}>
                {layout.ratingPill.text}
              </span>
            </>,
            { background: '#FFFFFF' },
          )
        : null}

      {/* Pastilla azul de ciudad · tipo */}
      {layout.cityPill
        ? pill(
            layout.cityPill,
            <span style={{ fontSize: layout.cityPill.size, fontWeight: 600, lineHeight: 1, color: '#FFFFFF', whiteSpace: 'nowrap' }}>
              {layout.cityPill.text}
            </span>,
            { background: EXPERIENCE_SHARE_CARD_BLUE },
          )
        : null}

      {/* Título */}
      {layout.title ? (
        <div
          style={{
            position: 'absolute',
            left: layout.title.x,
            top: layout.title.y - layout.title.lineH / 2,
            width: f.width - L.pad * 2 - (L.priceBeside ? layout.pricePill.w + L.colGap : 0),
          }}
        >
          {layout.title.lines.map((line, i) => (
            <div
              key={i}
              style={{
                fontSize: layout.title.size,
                fontWeight: 800,
                lineHeight: L.titleLineH,
                letterSpacing: -1,
                color: '#FFFFFF',
              }}
            >
              {line}
            </div>
          ))}
        </div>
      ) : null}

      {/* Descripción */}
      {layout.desc ? (
        <div
          style={{
            position: 'absolute',
            left: layout.desc.x,
            top: layout.desc.y - layout.desc.lineH / 2,
            width: f.width - L.pad * 2 - (L.priceBeside ? layout.pricePill.w + L.colGap : 0),
          }}
        >
          {layout.desc.lines.map((line, i) => (
            <div
              key={i}
              style={{
                fontSize: layout.desc.size,
                fontWeight: 600,
                lineHeight: L.descLineH,
                color: 'rgba(255,255,255,0.75)',
              }}
            >
              {line}
            </div>
          ))}
        </div>
      ) : null}

      {/* Duración · idiomas · personas */}
      {layout.dataRows ? (
        <div
          style={{
            position: 'absolute',
            left: layout.dataRows.x,
            top: layout.dataRows.y - layout.dataRows.lineH / 2,
            width: f.width - L.pad * 2 - (L.priceBeside ? layout.pricePill.w + L.colGap : 0),
          }}
        >
          {layout.dataRows.lines.map((line, i) => (
            <div
              key={i}
              style={{
                fontSize: layout.dataRows.size,
                fontWeight: 600,
                lineHeight: L.dataLineH,
                color: 'rgba(255,255,255,0.85)',
              }}
            >
              {line}
            </div>
          ))}
        </div>
      ) : null}

      {/* Pastilla AZUL de precio protagonista */}
      {pill(
        layout.pricePill,
        layout.pricePill.priced ? (
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: '100%' }}>
            <div style={{ fontSize: layout.pricePill.desdeSize, fontWeight: 800, lineHeight: 1, color: '#FFFFFF', marginBottom: layout.pricePill.desdeGap }}>
              DESDE
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: layout.pricePill.rowGap }}>
              <span style={{ fontSize: layout.pricePill.priceSize, fontWeight: 800, lineHeight: 1, color: '#FFFFFF' }}>
                {layout.pricePill.text}
              </span>
              <span style={{ fontSize: layout.pricePill.porSize, fontWeight: 600, lineHeight: 1, color: 'rgba(255,255,255,0.9)' }}>
                por persona
              </span>
            </div>
          </div>
        ) : (
          <span style={{ fontSize: layout.pricePill.priceSize, fontWeight: 800, lineHeight: 1, color: '#FFFFFF' }}>
            {layout.pricePill.text}
          </span>
        ),
        { background: EXPERIENCE_SHARE_CARD_BLUE },
      )}
    </div>
  );
}
