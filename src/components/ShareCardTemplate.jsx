// Plantilla de la tarjeta para compartir (PR #142 v1, PR #143): UN estilo
// oscuro tipo «Glass» — logotipo oficial arriba, foto, categoría en
// versales, nombre grande, píldoras con la calificación de Google (con su
// conteo de reseñas) y la ciudad, y «Descúbrelo en CityMap» al pie.
// PR #144: el logo circular del negocio (mismo que la ficha, solo para
// planes de pago con logo_url) va centrado a caballo sobre el borde
// inferior de la foto, con anillo blanco; si no hay logo o no carga, la
// tarjeta queda igual que en el #143.
// La vista previa y el PNG exportado comparten la misma geometría:
// SHARE_CARD_LAYOUT + computeShareCardLayout en lib/shareCard.js, así que
// lo que se ve es lo que se descarga. La foto crece (flex: 1, con altura
// mínima) y se come el espacio libre: nunca queda franja vacía entre las
// píldoras y el pie. El logotipo es /logo-brand.png, el mismo del
// encabezado y del splash, en blanco sobre el fondo oscuro. Sin foto no
// hay imagen rota: sale un bloque oscuro con la inicial del nombre. Sin
// dato de Google no hay píldora de calificación: nunca se inventa. El
// precio ya no se muestra.
import { getThumbUrl } from '../lib/utils.js';
import { formatReviewCount } from '../lib/googleRatings.js';
import {
  SHARE_CARD_FORMATS,
  SHARE_CARD_LAYOUT,
  computeShareCardLayout,
} from '../lib/shareCard.js';

export default function ShareCardTemplate({ data, format, onPhotoError, onBizLogoError }) {
  const f = format || SHARE_CARD_FORMATS.story;
  const L = SHARE_CARD_LAYOUT[f.id] || SHARE_CARD_LAYOUT.story;
  const width = f.width;
  const photoW = width - L.pad * 2;
  // Las líneas del nombre se calculan con la misma función que usa el
  // exportador de canvas: el corte a 2 líneas es idéntico en ambos.
  const layout = computeShareCardLayout(data, format, true);
  // La foto se pide ancha (1600w por el bucket de getThumbUrl) para que
  // salga nítida en la exportación a 1080 px.
  const photoSrc = data?.photoUrl ? getThumbUrl(data.photoUrl, 1080) : null;
  const gSize = Math.round(L.pillSize * 0.85);
  const initial = (data?.name || 'C').trim().charAt(0).toUpperCase() || 'C';
  const hasRating = typeof data?.rating === 'number' && data.rating > 0;
  // El primer bloque tras la foto usa el hueco del círculo
  // (layout.firstGap) cuando hay logo; los demás conservan sus
  // márgenes normales, igual que en el canvas.
  const firstBlock = data?.category
    ? 'cat'
    : layout.name && layout.name.lines.length
      ? 'name'
      : hasRating || data?.cityName
        ? 'pills'
        : 'foot';
  // El logo circular se pide en 300×300, igual que la ficha.
  const logoSrc = data?.bizLogoUrl ? getThumbUrl(data.bizLogoUrl, 300, 300) : null;

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
        position: 'relative',
      }}
    >
      <img
        src="/logo-brand.png"
        alt="CityMap"
        style={{
          height: L.logoH,
          width: 'auto',
          display: 'block',
          filter: 'brightness(0) invert(1)',
          marginBottom: L.logoGap,
          flexShrink: 0,
        }}
      />

      <div
        style={{
          width: photoW,
          flex: 1,
          minHeight: L.photoMinH,
          borderRadius: L.photoRadius,
          overflow: 'hidden',
          background: '#262626',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
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
              color: 'rgba(255,255,255,0.35)',
              fontSize: L.photoMinH * 0.45,
              fontWeight: 800,
              lineHeight: 1,
            }}
          >
            {initial}
          </span>
        )}
      </div>

      {/* Círculo del logo del negocio (PR #144): absoluto, con la misma
          geometría que el canvas (layout.bizLogo), así no ocupa espacio
          en el flujo y la foto conserva su alto exacto. Si el logo no
          carga, onBizLogoError lo quita y la tarjeta queda como en el
          #143. */}
      {layout.bizLogo && logoSrc ? (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: layout.bizLogo.x,
            top: layout.bizLogo.y,
            width: layout.bizLogo.d,
            height: layout.bizLogo.d,
            borderRadius: '50%',
            background: '#FFFFFF',
            border: '1px solid rgba(0,0,0,0.06)',
            boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
            padding: layout.bizLogo.ring,
            boxSizing: 'border-box',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
          }}
        >
          <img
            src={logoSrc}
            crossOrigin="anonymous"
            onError={onBizLogoError}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              borderRadius: '50%',
              display: 'block',
            }}
          />
        </div>
      ) : null}

      {data?.category ? (
        <div
          style={{
            marginTop: firstBlock === 'cat' ? layout.firstGap : L.catGap,
            fontSize: L.catSize,
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: 6,
            textTransform: 'uppercase',
            color: '#A3A3A3',
            flexShrink: 0,
          }}
        >
          {data.category}
        </div>
      ) : null}

      {layout.name && layout.name.lines.length ? (
        <div style={{ marginTop: firstBlock === 'name' ? layout.firstGap : L.nameGap, width: photoW, flexShrink: 0 }}>
          {layout.name.lines.map((line, i) => (
            <div
              key={i}
              style={{
                fontSize: L.nameSize,
                fontWeight: 800,
                lineHeight: L.nameLineH,
                letterSpacing: -1,
              }}
            >
              {line}
            </div>
          ))}
        </div>
      ) : null}

      {hasRating || data?.cityName ? (
        <div
          style={{
            marginTop: firstBlock === 'pills' ? layout.firstGap : L.pillsGap,
            width: photoW,
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: L.pillGap,
            flexShrink: 0,
          }}
        >
          {hasRating ? (
            <span
              style={{
                background: 'rgba(255,255,255,0.12)',
                borderRadius: 999,
                padding: `${L.pillPadY}px ${L.pillPadX}px`,
                fontSize: L.pillSize,
                fontWeight: 700,
                lineHeight: 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              ★ {data.rating.toFixed(1)} ({formatReviewCount(data.reviewCount || 0)})
              <img
                src="/googlelogo.svg"
                alt="Google"
                style={{ width: gSize, height: gSize, objectFit: 'contain', display: 'block' }}
              />
            </span>
          ) : null}
          {data?.cityName ? (
            <span
              style={{
                background: 'rgba(255,255,255,0.12)',
                borderRadius: 999,
                padding: `${L.pillPadY}px ${L.pillPadX}px`,
                fontSize: L.pillSize,
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              {data.cityName}
            </span>
          ) : null}
        </div>
      ) : null}

      <div
        style={{
          marginTop: firstBlock === 'foot' ? layout.firstGap : L.footGap,
          fontSize: L.footSize,
          lineHeight: 1,
          letterSpacing: 2,
          color: '#A3A3A3',
          flexShrink: 0,
        }}
      >
        Descúbrelo en <span style={{ color: '#FFFFFF', fontWeight: 800 }}>CityMap</span>
      </div>
    </div>
  );
}
