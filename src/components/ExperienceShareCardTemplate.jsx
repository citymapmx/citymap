// Plantilla de la tarjeta para compartir el artículo / experiencia
// (mismo patrón que la de eventos, PR #152): los 2 estilos que eligió
// Jonathan de la demo — «Foto completa» (fondo oscuro, la foto llena
// la tarjeta y el precio va en una pastilla blanca protagonista) y
// «Dividida» (fondo claro, foto a la izquierda y ficha de datos a la
// derecha). La foto es la primera de la galería y crece (flex: 1, con
// altura mínima) para comerse el espacio libre: nunca queda franja
// vacía entre la información y el pie. El logotipo es /logo-brand.png:
// blanco en «foto», oscuro en «dividida» (el PNG es blanco y no se
// vería sobre fondo blanco, igual que en Editorial). Sin foto no hay
// imagen rota: sale un bloque con la inicial del título.
// La vista previa y el PNG exportado comparten la misma geometría:
// EXPERIENCE_SHARE_CARD_LAYOUT + computeExperienceShareCardLayout en
// lib/experienceShareCard.js, así que lo que se ve es lo que se descarga.
import { getThumbUrl } from '../lib/utils.js';
import {
  SHARE_CARD_FORMATS,
  EXPERIENCE_SHARE_CARD_LAYOUT,
  computeExperienceShareCardLayout,
} from '../lib/experienceShareCard.js';

export default function ExperienceShareCardTemplate({ data, format, styleId, onPhotoError }) {
  const f = format || SHARE_CARD_FORMATS.story;
  const style = styleId === 'dividida' ? 'dividida' : 'foto';
  const L = (EXPERIENCE_SHARE_CARD_LAYOUT[style] || EXPERIENCE_SHARE_CARD_LAYOUT.foto)[f.id]
    || EXPERIENCE_SHARE_CARD_LAYOUT.foto.story;
  const width = f.width;
  const photoW = width - L.pad * 2;
  // Las líneas (título, ciudad, descripción, datos, pastilla) se
  // calculan con la misma función que usa el exportador de canvas:
  // el corte y los anchos son idénticos en ambos.
  const layout = computeExperienceShareCardLayout(data, format, style);
  // La foto se pide ancha (1080w por el bucket de getThumbUrl) para que
  // salga nítida en la exportación a 1080 px.
  const photoSrc = data?.photoUrl ? getThumbUrl(data.photoUrl, 1080) : null;
  const initial = (data?.title || 'C').trim().charAt(0).toUpperCase() || 'C';
  const dark = style === 'dividida';
  const firstBlock = layout.title && layout.title.lines.length
    ? 'title'
    : layout.city
      ? 'city'
      : layout.rating
        ? 'rating'
        : layout.desc && layout.desc.lines.length
          ? 'desc'
          : layout.dataRows && layout.dataRows.lines.length
            ? 'data'
            : layout.pricePill
              ? 'price'
              : 'foot';

  const photoBlock = (
    <div
      style={{
        width: dark ? L.photoW : photoW,
        flex: dark ? 'none' : 1,
        minHeight: dark ? undefined : L.photoMinH,
        height: dark ? '100%' : undefined,
        borderRadius: L.photoRadius,
        overflow: 'hidden',
        background: dark ? '#E5E7EB' : '#262626',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {photoSrc ? (
        <img
          src={photoSrc}
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
            color: dark ? 'rgba(17,17,17,0.35)' : 'rgba(255,255,255,0.35)',
            fontSize: Math.round(Math.min(dark ? L.photoW : photoW, layout.photo.h) * 0.4),
            fontWeight: 800,
            lineHeight: 1,
          }}
        >
          {initial}
        </span>
      )}
    </div>
  );

  const titleBlock = layout.title && layout.title.lines.length ? (
    <div
      style={{
        marginTop: dark ? 0 : firstBlock === 'title' ? layout.firstGap : L.titleGap,
        width: dark ? undefined : photoW,
        flexShrink: 0,
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
            color: dark ? '#111111' : '#FFFFFF',
          }}
        >
          {line}
        </div>
      ))}
    </div>
  ) : null;

  const cityBlock = layout.city ? (
    <div
      style={{
        marginTop: dark ? L.titleGap : firstBlock === 'city' ? layout.firstGap : L.cityGap,
        fontSize: layout.city.size,
        fontWeight: 600,
        lineHeight: L.titleLineH,
        color: dark ? '#6B7280' : 'rgba(255,255,255,0.85)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        flexShrink: 0,
      }}
    >
      {layout.city.text}
    </div>
  ) : null;

  const ratingBlock = layout.rating ? (
    <div
      style={{
        marginTop: dark ? L.cityGap : firstBlock === 'rating' ? layout.firstGap : L.cityGap,
        fontSize: layout.rating.size,
        fontWeight: 600,
        lineHeight: L.titleLineH,
        color: dark ? '#6B7280' : 'rgba(255,255,255,0.85)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        flexShrink: 0,
      }}
    >
      {layout.rating.text}
    </div>
  ) : null;

  const descBlock = layout.desc && layout.desc.lines.length ? (
    <div
      style={{
        marginTop: dark ? L.descGap : firstBlock === 'desc' ? layout.firstGap : L.descGap,
        width: dark ? undefined : photoW,
        flexShrink: 0,
      }}
    >
      {layout.desc.lines.map((line, i) => (
        <div
          key={i}
          style={{
            fontSize: layout.desc.size,
            fontWeight: 600,
            lineHeight: L.descLineH,
            color: dark ? '#4B5563' : 'rgba(255,255,255,0.75)',
          }}
        >
          {line}
        </div>
      ))}
    </div>
  ) : null;

  const dataBlock = layout.dataRows && layout.dataRows.lines.length ? (
    <div
      style={{
        marginTop: dark ? L.dataGap : firstBlock === 'data' ? layout.firstGap : L.dataGap,
        width: dark ? undefined : photoW,
        flexShrink: 0,
      }}
    >
      {layout.dataRows.lines.map((line, i) => (
        <div
          key={i}
          style={{
            fontSize: layout.dataRows.size,
            fontWeight: 600,
            lineHeight: L.dataLineH,
            color: dark ? '#4B5563' : 'rgba(255,255,255,0.85)',
          }}
        >
          {line}
        </div>
      ))}
    </div>
  ) : null;

  const priceBlock = layout.pricePill ? (
    <div
      style={{
        marginTop: dark ? L.priceGap : firstBlock === 'price' ? layout.firstGap : L.priceGap,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          background: dark ? '#111111' : '#FFFFFF',
          color: dark ? '#FFFFFF' : '#111111',
          borderRadius: 999,
          padding: `${L.pricePadY}px ${L.pricePadX}px`,
          fontSize: L.priceSize,
          fontWeight: 800,
          lineHeight: 1,
          display: 'inline-block',
        }}
      >
        {layout.pricePill.text}
      </span>
    </div>
  ) : null;

  return (
    <div
      style={{
        width,
        height: f.height,
        boxSizing: 'border-box',
        padding: L.pad,
        display: 'flex',
        flexDirection: 'column',
        alignItems: dark ? 'stretch' : 'center',
        background: dark ? '#FFFFFF' : 'linear-gradient(180deg, #1B1B1B 0%, #0B0B0B 100%)',
        color: dark ? '#111111' : '#FFFFFF',
        fontFamily: "var(--heading), system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        textAlign: dark ? 'left' : 'center',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          flexShrink: 0,
          marginBottom: L.logoGap,
        }}
      >
        <img
          src="/logo-brand.png"
          alt="CityMap"
          style={{
            height: L.logoH,
            width: 'auto',
            display: 'block',
            filter: dark ? 'brightness(0)' : 'brightness(0) invert(1)',
          }}
        />
      </div>

      {dark ? (
        <div
          style={{
            display: 'flex',
            flex: 1,
            gap: L.colGap,
            minHeight: 0,
          }}
        >
          {photoBlock}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            {titleBlock}
            {cityBlock}
            {ratingBlock}
            {descBlock}
            {dataBlock}
            {priceBlock}
          </div>
        </div>
      ) : (
        <>
          {photoBlock}
          {titleBlock}
          {cityBlock}
          {ratingBlock}
          {descBlock}
          {dataBlock}
          {priceBlock}
        </>
      )}

      <div
        style={{
          marginTop: dark ? L.footGap : firstBlock === 'foot' ? layout.firstGap : L.footGap,
          fontSize: L.footSize,
          lineHeight: 1,
          letterSpacing: 2,
          color: dark ? '#9CA3AF' : '#A3A3A3',
          flexShrink: 0,
          textAlign: 'center',
        }}
      >
        Descúbrelo en <span style={{ color: dark ? '#111111' : '#FFFFFF', fontWeight: 800 }}>CityMap</span>
      </div>
    </div>
  );
}
