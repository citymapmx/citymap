// Plantilla de la tarjeta para compartir (PR #142 v1, PR #143): UN estilo
// oscuro tipo «Glass» — logotipo oficial arriba, foto, nombre grande,
// píldoras con la calificación de Google (con su conteo de reseñas) y
// la ciudad, y «Descúbrelo en www.citymap.mx» al pie.
// PR #144: el logo circular del negocio (mismo que la ficha, solo para
// planes de pago con logo_url) va centrado a caballo sobre el borde
// inferior de la foto, con anillo blanco; si no hay logo o no carga, la
// tarjeta queda igual que en el #143. PR #145: el círculo es más grande
// (Ø 240 Historia / 190 Post) con anillo y sombra proporcionales.
// PR #154: dos estilos (Oscura y Clara): la plantilla pinta el
// estilo elegido con su paleta y su geometría (SHARE_CARD_STYLE_COLORS
// + shareCardLayoutTable en lib/shareCard.js). La versión clara es tipo
// revista. PR #155: la Ficha completa se quita,
// la categoría sale de ambas versiones, la foto es más corta y el
// nombre y las píldoras más grandes; el logo de la versión clara va en
// oscuro (el PNG es blanco y con 'none' no se veía sobre blanco).
// PR #160: Clara TAMBIÉN lleva el círculo del logo del negocio
// (misma regla que Oscura: logo_url + plan de pago), con anillo solo
// blanco (antes gris visible; Jonathan, 10 nov 2026: el trazo gris
// se veía mal); antes no lo llevaba por diseño y Vulcanos Chapalita
// salía sin logo en Clara.
// PR #156: el estilo claro se llama «Clara» (el id interno sigue
// siendo 'editorial'); el logo de Post crece para que se vea en la
// vista previa de 200 px.
// La vista previa y el PNG exportado comparten la misma geometría:
// SHARE_CARD_LAYOUT + computeShareCardLayout en lib/shareCard.js, así que
// lo que se ve es lo que se descarga. La foto crece (flex: 1, con altura
// mínima) y se come el espacio libre: nunca queda franja vacía entre las
// píldoras y el pie. El logotipo es /logo-brand.png, el mismo del
// encabezado y del splash: en blanco sobre el fondo oscuro, en negro
// (brightness(0), como Brand.jsx en modo claro) sobre fondo claro. Sin
// foto no hay imagen rota: sale un bloque oscuro con la inicial del
// nombre. Sin dato de Google no hay píldora de calificación: nunca se
// inventa. El precio ya no se muestra.
import { getThumbUrl } from '../lib/utils.js';
import { formatReviewCount } from '../lib/googleRatings.js';
import {
  SHARE_CARD_FORMATS,
  SHARE_CARD_SERIF_STACK,
  SHARE_CARD_STYLE_COLORS,
  computeShareCardLayout,
  resolveShareCardStyle,
  shareCardLayoutTable,
} from '../lib/shareCard.js';

export default function ShareCardTemplate({ data, format, styleId, onPhotoError, onBizLogoError }) {
  const f = format || SHARE_CARD_FORMATS.story;
  const style = resolveShareCardStyle(styleId);
  const palette = SHARE_CARD_STYLE_COLORS[style.id] || SHARE_CARD_STYLE_COLORS.glass;
  const L = shareCardLayoutTable(style.id, f.id);
  const width = f.width;
  const photoW = width - L.pad * 2;
  // Las líneas del nombre se calculan con la misma función que usa el
  // exportador de canvas: el corte a 2 líneas es idéntico en ambos.
  const layout = computeShareCardLayout(data, format, true, style.id);
  // La foto se pide ancha (1600w por el bucket de getThumbUrl) para que
  // salga nítida en la exportación a 1080 px.
  const photoSrc = data?.photoUrl ? getThumbUrl(data.photoUrl, 1080) : null;
  const gSize = Math.round(L.pillSize * 0.85);
  const initial = (data?.name || 'C').trim().charAt(0).toUpperCase() || 'C';
  const hasRating = typeof data?.rating === 'number' && data.rating > 0;
  // El primer bloque tras la foto usa el hueco del círculo
  // (layout.firstGap) cuando hay logo; los demás conservan sus
  // márgenes normales, igual que en el canvas.
  const firstBlock = layout.name && layout.name.lines.length
    ? 'name'
    : hasRating || data?.cityName
      ? 'pills'
      : layout.category
        ? 'category'
        : 'foot';
  // El logo circular se pide en 300×300, igual que la ficha.
  const logoSrc = data?.bizLogoUrl ? getThumbUrl(data.bizLogoUrl, 300, 300) : null;
  // PR #159: «Para pedir» y el QR no llevan píldoras (nada de
  // etiqueta de ciudad en la carta); el QR tampoco lleva foto.
  // Los estilos con grid SÍ llevan píldoras (calificación Google +
  // ciudad, como la demo); el Collage editorial no (su calificación va
  // como texto plano en la banda).
  const showPills =
    style.id === 'glass' ||
    style.id === 'editorial' ||
    style.id === 'grid' ||
    style.id === 'tira';
  const isPedido = style.id === 'pedido';
  const isQr = style.id === 'qr';
  const isGrid = style.id === 'grid' || style.id === 'tira';
  const isCollage = style.id === 'collage';

  // Círculo del logo del negocio (PR #144): absoluto, con la misma
  // geometría que el canvas (layout.bizLogo), así no ocupa espacio
  // en el flujo y la foto conserva su alto exacto. Si el logo no
  // carga, onBizLogoError lo quita y la tarjeta queda como en el
  // #143. En Grid 2×2 y tira va centrado a caballo sobre el borde
  // inferior del grid; en el collage, alineado a la izquierda sobre
  // el borde inferior del hero (layout.bizLogo.x ya lo dice).
  const circleEl =
    layout.bizLogo && logoSrc ? (
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
          // Anillo del círculo: en Clara es solo blanco
          // (palette.bizLogoRing; Jonathan, 10 nov 2026: el trazo
          // gris se veía mal); en Oscura, fino y casi invisible,
          // donde el círculo blanco ya se distingue.
          border: `2px solid ${palette.bizLogoRing}`,
          boxShadow: `0 ${L.bizLogoShadowY}px ${L.bizLogoShadowBlur}px rgba(0,0,0,0.12)`,
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
    ) : null;

  // Collage editorial: rama propia (hero a sangre + banda blanca con
  // kicker, nombre en serif, calificación como texto plano y dúo de
  // fotos). Todo en posiciones absolutas de la geometría, igual que el
  // canvas, así vista previa y PNG coinciden.
  if (isCollage) {
    const heroSrc = data?.photoUrls?.[0]
      ? getThumbUrl(data.photoUrls[0], 1080)
      : photoSrc;
    return (
      <div
        style={{
          width,
          height: f.height,
          boxSizing: 'border-box',
          background: palette.bg[0],
          color: palette.text,
          fontFamily: "var(--heading), system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          textAlign: 'left',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Hero a sangre arriba (o bloque con la inicial sin foto) */}
        {layout.hero ? (
          <div
            style={{
              position: 'absolute',
              left: layout.hero.x,
              top: layout.hero.y,
              width: layout.hero.w,
              height: layout.hero.h,
              overflow: 'hidden',
              background: palette.photoBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {heroSrc ? (
              <img
                src={heroSrc}
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
                  color: palette.initial,
                  fontSize: Math.round(Math.min(layout.hero.w, layout.hero.h) * 0.3),
                  fontWeight: 800,
                  lineHeight: 1,
                }}
              >
                {initial}
              </span>
            )}
          </div>
        ) : null}

        {/* Logotipo oficial superpuesto sobre el hero (blanco) */}
        {layout.logoOverlay ? (
          <img
            src="/logo-brand.png"
            alt="CityMap"
            style={{
              position: 'absolute',
              left: layout.logoOverlay.x,
              top: layout.logoOverlay.y,
              width: layout.logoOverlay.w,
              height: layout.logoOverlay.h,
              display: 'block',
              zIndex: 1,
            }}
          />
        ) : null}

        {circleEl}

        {/* Kicker: «RESTAURANTES · ZAPOPAN» */}
        {layout.kicker ? (
          <div
            style={{
              position: 'absolute',
              left: layout.kicker.x,
              top: layout.kicker.y - (layout.kicker.size * 1.2) / 2,
              fontSize: layout.kicker.size,
              fontWeight: 700,
              letterSpacing: Math.round(layout.kicker.size * 0.32),
              color: palette.sub,
              whiteSpace: 'nowrap',
            }}
          >
            {layout.kicker.text}
          </div>
        ) : null}

        {/* Nombre en serif, alineado a la izquierda */}
        {layout.name && layout.name.lines.length ? (
          <div
            style={{
              position: 'absolute',
              left: layout.name.x,
              top: layout.name.y - layout.name.lineH / 2,
              width: photoW,
            }}
          >
            {layout.name.lines.map((line, i) => (
              <div
                key={i}
                style={{
                  fontSize: layout.name.size,
                  fontWeight: 900,
                  lineHeight: L.nameLineH,
                  fontFamily: SHARE_CARD_SERIF_STACK,
                  whiteSpace: 'nowrap',
                }}
              >
                {line}
              </div>
            ))}
          </div>
        ) : null}

        {/* Calificación como texto plano: «★ 4.3 (1,853 reseñas en Google)» */}
        {layout.ratingLine ? (
          <div
            style={{
              position: 'absolute',
              left: layout.ratingLine.x,
              top: layout.ratingLine.y - (layout.ratingLine.size * 1.2) / 2,
              display: 'flex',
              alignItems: 'center',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ fontSize: layout.ratingLine.size, fontWeight: 700, lineHeight: 1, color: '#F59E0B', marginRight: 8 }}>
              ★
            </span>
            <span style={{ fontSize: layout.ratingLine.size, fontWeight: 700, lineHeight: 1, color: palette.text, marginRight: 6 }}>
              {layout.ratingLine.rating.toFixed(1)}
            </span>
            <span style={{ fontSize: layout.ratingLine.size, fontWeight: 600, lineHeight: 1, color: palette.sub }}>
              ({formatReviewCount(layout.ratingLine.reviewCount)} reseñas en Google)
            </span>
          </div>
        ) : null}

        {/* Dúo de 2 fotos chicas */}
        {(layout.duo || []).map((cell, i) => {
          const src = cell.photoUrl ? getThumbUrl(cell.photoUrl, 1080) : null;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: cell.x,
                top: cell.y,
                width: cell.w,
                height: cell.h,
                borderRadius: cell.radius,
                overflow: 'hidden',
                background: palette.photoBg,
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
                    color: palette.initial,
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
        })}

        {/* Pie: «Descúbrelo en www.citymap.mx» */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            width,
            top: layout.footer.y - L.footSize / 2,
            fontSize: L.footSize,
            lineHeight: 1,
            letterSpacing: 2,
            color: palette.sub,
            textAlign: 'center',
          }}
        >
          Descúbrelo en <span style={{ color: palette.text, fontWeight: 800 }}>www.citymap.mx</span>
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
        padding: L.pad,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: `linear-gradient(180deg, ${palette.bg[0]} 0%, ${palette.bg[1]} 100%)`,
        color: palette.text,
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
          // El PNG es BLANCO sobre transparente: en oscuro va en blanco
          // (brightness(0) invert(1)) y en claro en negro (brightness(0),
          // como Brand.jsx en modo claro). Con 'none' el blanco no se
          // veía sobre fondo blanco (PR #155).
          filter: palette.logoWhite ? 'brightness(0) invert(1)' : 'brightness(0)',
          marginBottom: L.logoGap,
          flexShrink: 0,
        }}
      />

      {/* Foto (PR #159: el QR no lleva foto; su área flexible es el
          cuadrado blanco con el QR, centrado en la franja). */}
      {isQr ? (
        <div
          style={{
            width: photoW,
            flex: 1,
            minHeight: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              height: '100%',
              aspectRatio: '1',
              maxWidth: '100%',
              background: '#FFFFFF',
              borderRadius: L.qrRadius,
              padding: L.qrPad,
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {data?.qrDataUrl ? (
              <img
                src={data.qrDataUrl}
                alt="Código QR"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            ) : null}
          </div>
        </div>
      ) : isGrid ? (
        // Grid 2×2 o tira: el área de la foto es el grid, con sus
        // celdas en posiciones absolutas de la geometría (relativas al
        // área: cell.x - layout.photo.x). Cada celda lleva su foto en
        // cover; sin foto, bloque con la inicial, nunca rota.
        <div
          style={{
            width: photoW,
            flex: 1,
            minHeight: L.photoMinH,
            position: 'relative',
          }}
        >
          {(layout.gridCells || []).map((cell, i) => {
            const src = cell.photoUrl ? getThumbUrl(cell.photoUrl, 1080) : null;
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: cell.x - (layout.photo?.x ?? L.pad),
                  top: cell.y - (layout.photo?.y ?? 0),
                  width: cell.w,
                  height: cell.h,
                  borderRadius: cell.radius,
                  overflow: 'hidden',
                  background: palette.photoBg,
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
                      color: palette.initial,
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
          })}
        </div>
      ) : (
        <div
          style={{
            width: photoW,
            flex: 1,
            minHeight: L.photoMinH,
            borderRadius: L.photoRadius,
            overflow: 'hidden',
            background: palette.photoBg,
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
                color: palette.initial,
                fontSize: L.photoMinH * 0.45,
                fontWeight: 800,
                lineHeight: 1,
              }}
            >
              {initial}
            </span>
          )}
        </div>
      )}

      {/* Círculo del logo del negocio (PR #144): absoluto, con la misma
          geometría que el canvas (layout.bizLogo), así no ocupa espacio
          en el flujo y la foto conserva su alto exacto. Si el logo no
          carga, onBizLogoError lo quita y la tarjeta queda como en el
          #143. */}
      {circleEl}

      {layout.name && layout.name.lines.length ? (
        <div style={{ marginTop: firstBlock === 'name' ? layout.firstGap : L.nameGap, width: photoW, flexShrink: 0 }}>
          {/* Cada línea calculada va en UNA línea visual (whiteSpace:
              nowrap, PR #158): si el DOM repartiera una línea en dos
              (su fuente mide más ancha que la del canvas, como en el
              Android de Jonathan con «Tangente Restaurante»), el bloque
              del nombre crecería, la foto (flex: 1) se acortaría, su
              borde real subiría y el círculo —absoluto, sobre el borde
              calculado— taparía la primera línea. Con nowrap el alto
              del bloque es siempre el calculado y la foto conserva su
              borde. Vale también para «Para pedir» y el QR (nombres de
              3 líneas sin truncar). */}
          {layout.name.lines.map((line, i) => (
            <div
              key={i}
              style={{
                fontSize: L.nameSize,
                fontWeight: 800,
                lineHeight: L.nameLineH,
                letterSpacing: -1,
                whiteSpace: 'nowrap',
              }}
            >
              {line}
            </div>
          ))}
        </div>
      ) : null}

      {showPills && (hasRating || data?.cityName) ? (
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
                background: palette.pillBg,
                border: palette.pillBorder ? `1.5px solid ${palette.pillBorder}` : 'none',
                borderRadius: 999,
                padding: `${L.pillPadY}px ${L.pillPadX}px`,
                fontSize: L.pillSize,
                fontWeight: 700,
                lineHeight: 1,
                color: palette.pillText,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {/* En los estilos con grid la estrella es ámbar (como la
                  demo), no del color del texto. */}
              <span style={{ color: palette.starAmber ? '#F59E0B' : palette.pillText }}>★</span>
              {' '}
              {data.rating.toFixed(1)} ({formatReviewCount(data.reviewCount || 0)})
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
                background: palette.pillBg,
                border: palette.pillBorder ? `1.5px solid ${palette.pillBorder}` : 'none',
                borderRadius: 999,
                padding: `${L.pillPadY}px ${L.pillPadX}px`,
                fontSize: L.pillSize,
                fontWeight: 700,
                lineHeight: 1,
                color: palette.pillText,
              }}
            >
              {data.cityName}
            </span>
          ) : null}
        </div>
      ) : null}

      {/* Categoría (solo Grid 2×2 y tira): línea centrada bajo las
          píldoras, en el color secundario de la paleta. */}
      {layout.category ? (
        <div
          style={{
            marginTop: firstBlock === 'category' ? layout.firstGap : L.catGap,
            width: photoW,
            fontSize: L.catSize,
            fontWeight: 600,
            lineHeight: 1.2,
            color: palette.sub,
            flexShrink: 0,
          }}
        >
          {layout.category.text}
        </div>
      ) : null}

      {/* Platillos, horario y botón de «Para pedir» (PR #159): los
          renglones van tras el nombre, con el precio a la derecha y
          un renglón punteado entre ellos; el botón es verde WhatsApp.
          Sin píldoras: nada de etiqueta de ciudad en esta tarjeta. */}
      {isPedido && layout.dishes?.length ? (
        <div style={{ marginTop: L.dishGap, width: photoW, flexShrink: 0 }}>
          {layout.dishes.map((d, i) => (
            <div
              key={i}
              style={{
                height: L.dishRowH,
                display: 'flex',
                alignItems: 'center',
                gap: 24,
                borderTop:
                  i > 0 ? '2px dotted rgba(255,255,255,0.25)' : 'none',
                boxSizing: 'border-box',
              }}
            >
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  textAlign: 'left',
                  fontSize: L.dishSize,
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                {d.name}
              </span>
              <span
                style={{
                  fontSize: L.dishSize,
                  fontWeight: 800,
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {d.price}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {isPedido && layout.hours ? (
        <div
          style={{
            marginTop: L.hoursGap,
            width: photoW,
            fontSize: L.hoursSize,
            fontWeight: 600,
            lineHeight: 1.2,
            color: palette.sub,
            flexShrink: 0,
          }}
        >
          {layout.hours.text}
        </div>
      ) : null}

      {isPedido && layout.orderButton ? (
        <div
          style={{
            marginTop: L.buttonGap,
            width: photoW,
            height: L.buttonH,
            borderRadius: L.buttonRadius,
            background: '#25D366',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: L.buttonSize,
            fontWeight: 800,
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          Hacer pedido
        </div>
      ) : null}

      {/* Línea bajo el QR (PR #159). La tarjeta QR del perfil (PR
          #240) dice «Escanea para ver el perfil»: el texto viene en
          data.qrCta y el del menú sigue siendo el de siempre. */}
      {isQr && layout.qr ? (
        <div
          style={{
            marginTop: L.ctaGap,
            width: photoW,
            fontSize: L.ctaSize,
            fontWeight: 600,
            lineHeight: 1.2,
            color: palette.text,
            flexShrink: 0,
          }}
        >
          {data?.qrCta || 'Escanea para ver el menú'}
        </div>
      ) : null}

      <div
        style={{
          marginTop: firstBlock === 'foot' ? layout.firstGap : L.footGap,
          fontSize: L.footSize,
          lineHeight: 1,
          letterSpacing: 2,
          color: palette.sub,
          flexShrink: 0,
        }}
      >
        Descúbrelo en <span style={{ color: palette.text, fontWeight: 800 }}>www.citymap.mx</span>
      </div>
    </div>
  );
}
