// Plantilla de la tarjeta para compartir el artículo / experiencia
// (mismo patrón que la de eventos, PR #152): DOS estilos: «Foto
// completa», EXACTAMENTE como la propuesta 2 de la demo
// `propuestas-de-tarjetas-para-articulos` (corrección de Jonathan
// 10 Nov ~10:54: el segundo estilo, de fondo claro, se veía mal en vivo), y
// «Grid» (demo `propuestas-de-tarjetas-con-grid`, 10 nov 2026: 1 foto
// grande arriba y 2 chicas abajo, sobre fondo blanco, con logotipo
// oficial, pastilla de ubicación gris, título y precio en texto plano,
// pie «Descúbrelo en www.citymap.mx»). «Foto completa»: la foto
// llena TODA la tarjeta a sangre, el texto va encima con degradados,
// logotipo oficial arriba a la izquierda (corrección de Jonathan
// 10 Nov ~11:39: en lugar de la pastilla de texto «citymap.mx»),
// pastilla de calificación arriba a la derecha (solo si es real),
// pastilla GLASS de ciudad · tipo (corrección de Jonathan
// 10 Nov ~11:39: translúcida, no azul sólida), título, descripción,
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

export default function ExperienceShareCardTemplate({ data, format, styleId = 'foto', onPhotoError }) {
  const f = format || EXPERIENCE_SHARE_CARD_FORMATS.story;
  const L = computeExperienceShareCardLayout(data, format, styleId).L;
  const width = f.width;
  // Las líneas (título, ciudad, descripción, datos, pastillas) se
  // calculan con la misma función que usa el exportador de canvas:
  // el corte y los anchos son idénticos en ambos.
  const layout = computeExperienceShareCardLayout(data, format, styleId);
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

  // Estilo «Grid» (demo `propuestas-de-tarjetas-con-grid`, diseño 4):
  // fondo blanco, 1 foto grande arriba (con el logotipo oficial
  // superpuesto) y 2 chicas abajo, pastilla de ubicación GRIS, título
  // centrado y precio en texto plano, pie «Descúbrelo en www.citymap.mx».
  // Todo en posiciones absolutas de la geometría, igual que el canvas,
  // así vista previa y PNG coinciden.
  if (layout.style === 'grid') {
    const cellImg = (cell, key) => {
      const src = (data?.photoUrls?.[cell.photoIndex] || null)
        ? getThumbUrl(data.photoUrls[cell.photoIndex], 1080)
        : null;
      return (
        <div
          key={key}
          style={{
            position: 'absolute',
            left: cell.x,
            top: cell.y,
            width: cell.w,
            height: cell.h,
            borderRadius: cell.radius,
            overflow: 'hidden',
            background: '#F0EFEA',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {src ? (
            <img
              src={src}
              crossOrigin="anonymous"
              onError={onPhotoError}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          ) : (
            <span
              style={{
                color: 'rgba(0,0,0,0.30)',
                fontSize: Math.round(Math.min(cell.w, cell.h) * 0.45),
                fontWeight: 800,
                lineHeight: 1,
              }}
            >
              {initial}
            </span>
          )}
        </div>
      );
    };
    return (
      <div
        style={{
          width,
          height: f.height,
          boxSizing: 'border-box',
          background: '#FFFFFF',
          color: '#141419',
          fontFamily: "var(--heading), system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          textAlign: 'center',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Foto grande + dúo */}
        {cellImg(layout.bigPhoto, 'big')}
        {(layout.duo || []).map((cell, i) => cellImg(cell, `duo-${i}`))}

        {/* Logotipo oficial superpuesto sobre la foto grande (blanco) */}
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
            filter: 'drop-shadow(0 2px 12px rgba(0,0,0,0.35))',
          }}
        />

        {/* Pastilla de ubicación GRIS */}
        {layout.pill
          ? pill(
              layout.pill,
              <span style={{ fontSize: layout.pill.size, fontWeight: 600, lineHeight: 1, color: '#141419', whiteSpace: 'nowrap' }}>
                {layout.pill.text}
              </span>,
              { background: '#F4F4F6' },
            )
          : null}

        {/* Título centrado (en Horizontal, en la columna de la
            derecha: el ancho es layout.infoW, no el de toda la tarjeta) */}
        {layout.title ? (
          <div
            style={{
              position: 'absolute',
              left: layout.title.x - layout.infoW / 2,
              top: layout.title.y - layout.title.lineH / 2,
              width: layout.infoW,
              textAlign: 'center',
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
                  color: '#141419',
                }}
              >
                {line}
              </div>
            ))}
          </div>
        ) : null}

        {/* Precio en texto plano, centrado (ancho de la columna en
            Horizontal, como el título) */}
        {layout.price ? (
          <div
            style={{
              position: 'absolute',
              left: layout.price.x - layout.infoW / 2,
              top: layout.price.y,
              width: layout.infoW,
              textAlign: 'center',
            }}
          >
            {layout.price.priced ? (
              <>
                <div style={{ fontSize: layout.price.desdeSize, fontWeight: 700, lineHeight: 1, letterSpacing: Math.round(layout.price.desdeSize * 0.3), color: '#8A8A96' }}>
                  DESDE
                </div>
                <div style={{ fontSize: layout.price.priceSize, fontWeight: 900, lineHeight: 1, color: '#141419', marginTop: layout.price.desdeGap }}>
                  {layout.price.text}
                </div>
                <div style={{ fontSize: layout.price.porSize, fontWeight: 600, lineHeight: 1, color: '#6D6D78', marginTop: layout.price.porGap }}>
                  por persona
                </div>
              </>
            ) : (
              <div style={{ fontSize: layout.price.priceSize, fontWeight: 900, lineHeight: 1, color: '#141419' }}>
                {layout.price.text}
              </div>
            )}
          </div>
        ) : null}

        {/* Pie: «Descúbrelo en www.citymap.mx», centrado en la columna
            (en Horizontal) con el tamaño ajustado de la geometría */}
        <div
          style={{
            position: 'absolute',
            left: layout.footer.x - layout.infoW / 2,
            width: layout.infoW,
            top: layout.footer.y - layout.footer.size / 2,
            fontSize: layout.footer.size,
            lineHeight: 1,
            letterSpacing: 2,
            color: '#6D6D78',
            textAlign: 'center',
          }}
        >
          Descúbrelo en <span style={{ color: '#141419', fontWeight: 800 }}>www.citymap.mx</span>
        </div>
      </div>
    );
  }

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

      {/* Pastilla GLASS de ciudad · tipo: translúcida + borde claro */}
      {layout.cityPill
        ? pill(
            layout.cityPill,
            <span style={{ fontSize: layout.cityPill.size, fontWeight: 600, lineHeight: 1, color: '#FFFFFF', whiteSpace: 'nowrap' }}>
              {layout.cityPill.text}
            </span>,
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
