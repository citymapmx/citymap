// Plantilla de la tarjeta para compartir el artículo / experiencia
// (mismo patrón que la de eventos, PR #152): UN SOLO estilo,
// «Foto completa», EXACTAMENTE como la propuesta 2 de la demo
// `propuestas-de-tarjetas-para-articulos` (corrección de Jonathan
// 10 Nov ~10:54: el segundo estilo, de fondo claro, se veía mal en vivo). En Post y
// Horizontal la foto llena TODA la tarjeta a sangre, el texto va encima
// con degradados; en Historia (PR #177) la foto va en un bloque
// CENTRADO con márgenes y esquinas redondeadas, como en la tarjeta de
// eventos, y el contenido va DEBAJO sobre fondo oscuro. Logotipo oficial
// arriba a la izquierda (corrección de Jonathan 10 Nov ~11:39: en lugar
// de la pastilla de texto «citymap.mx»), pastilla de calificación arriba
// a la derecha (solo si es real), pastilla GLASS de ciudad · tipo
// (corrección de Jonathan 10 Nov ~11:39: translúcida, no azul sólida), título, descripción,
// duración · idiomas, y el precio en una pastilla AZUL grande
// («DESDE $1,881 MXN por persona»). Sin pie. Sin foto no hay imagen
// rota: sale un degradado oscuro con la inicial del título.
// La vista previa y el PNG exportado comparten la misma geometría:
// EXPERIENCE_SHARE_CARD_LAYOUT + computeExperienceShareCardLayout en
// lib/experienceShareCard.js, así que lo que se ve es lo que se descarga.
import { getThumbUrl } from '../lib/utils.js';
import {
  EXPERIENCE_SHARE_CARD_FORMATS,
  EXPERIENCE_SHARE_CARD_BLUE,
  EXPERIENCE_SHARE_CARD_GLASS_BG,
  EXPERIENCE_SHARE_CARD_GLASS_BORDER,
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
  // En Historia (PR #177) la foto va en un bloque centrado con
  // márgenes, como en eventos; en Post y Horizontal sigue a sangre.
  const centeredPhoto = Boolean(L.centeredPhoto);
  const photo = layout.photo;
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
        // Historia: fondo oscuro (igual que la tarjeta de eventos);
        // Post y Horizontal llevan la foto a sangre encima.
        background: centeredPhoto
          ? 'linear-gradient(180deg, #1B1B1B 0%, #0B0B0B 100%)'
          : '#111111',
        color: '#FFFFFF',
        fontFamily: "var(--heading), system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        textAlign: 'left',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Foto: en Historia, bloque centrado con esquinas redondeadas;
          en Post y Horizontal, a sangre completa (o degradado + inicial
          sin foto) */}
      {photoSrc ? (
        <img
          src={photoSrc}
          crossOrigin="anonymous"
          onError={onPhotoError}
          alt=""
          style={{
            position: 'absolute',
            left: photo.x,
            top: photo.y,
            width: photo.w,
            height: photo.h,
            objectFit: 'cover',
            borderRadius: photo.radius || 0,
            display: 'block',
          }}
        />
      ) : (
        <div
          style={{
            position: 'absolute',
            left: photo.x,
            top: photo.y,
            width: photo.w,
            height: photo.h,
            borderRadius: photo.radius || 0,
            background: centeredPhoto
              ? '#262626'
              : 'linear-gradient(180deg, #262626 0%, #111111 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              color: 'rgba(255,255,255,0.35)',
              fontSize: Math.round(Math.min(photo.w, photo.h) * 0.3),
              fontWeight: 800,
              lineHeight: 1,
            }}
          >
            {initial}
          </span>
        </div>
      )}

      {/* Degradados para que se lea el texto (solo con la foto a
          sangre: en Historia el texto va sobre el fondo oscuro) */}
      {!centeredPhoto && (
        <>
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
        </>
      )}

      {/* Logotipo oficial (arriba a la izquierda): blanco sobre la foto */}
      <img
        src="/logo-brand.png"
        alt="CityMap"
        style={{
          position: 'absolute',
          left: layout.brandLogo.x,
          top: layout.brandLogo.y,
          width: layout.brandLogo.w,
          height: layout.brandLogo.h,
          display: 'block',
        }}
      />

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

      {/* Pastilla GLASS de ciudad · tipo: translúcida + borde claro.
          Pin y etiqueta por separado (PR #177): cada uno se centra por
          su caja visual en su propia línea; con un solo span, el emoji
          📍 arrastraba el texto hacia arriba. */}
      {layout.cityPill
        ? pill(
            layout.cityPill,
            <>
              {layout.cityPill.pin ? (
                <span style={{ fontSize: layout.cityPill.size, fontWeight: 600, lineHeight: 1, color: '#FFFFFF', whiteSpace: 'nowrap' }}>
                  {layout.cityPill.pin}
                </span>
              ) : null}
              <span
                style={{
                  fontSize: layout.cityPill.size,
                  fontWeight: 600,
                  lineHeight: 1,
                  color: '#FFFFFF',
                  whiteSpace: 'nowrap',
                  marginLeft: layout.cityPill.pin ? layout.cityPill.pinGap : 0,
                }}
              >
                {layout.cityPill.label}
              </span>
            </>,
            {
              background: EXPERIENCE_SHARE_CARD_GLASS_BG,
              border: `1.5px solid ${EXPERIENCE_SHARE_CARD_GLASS_BORDER}`,
            },
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
