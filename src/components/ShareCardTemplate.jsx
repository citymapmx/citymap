// Plantilla de la tarjeta para compartir (PR #142 v1, PR #143): UN estilo
// oscuro tipo «Glass» — logotipo oficial arriba, foto, nombre grande,
// píldoras con la calificación de Google (con su conteo de reseñas) y
// la ciudad, y «Descúbrelo en CityMap» al pie.
// PR #144: el logo circular del negocio (mismo que la ficha, solo para
// planes de pago con logo_url) va centrado a caballo sobre el borde
// inferior de la foto, con anillo blanco; si no hay logo o no carga, la
// tarjeta queda igual que en el #143. PR #145: el círculo es más grande
// (Ø 240 Historia / 190 Post) con anillo y sombra proporcionales.
// PR #154: dos estilos (Oscura y Clara): la plantilla pinta el
// estilo elegido con su paleta y su geometría (SHARE_CARD_STYLE_COLORS
// + shareCardLayoutTable en lib/shareCard.js). La versión clara es tipo
// revista, sin círculo de logo. PR #155: la Ficha completa se quita,
// la categoría sale de ambas versiones, la foto es más corta y el
// nombre y las píldoras más grandes; el logo de la versión clara va en
// oscuro (el PNG es blanco y con 'none' no se veía sobre blanco).
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
      : 'foot';
  // El logo circular se pide en 300×300, igual que la ficha.
  const logoSrc = data?.bizLogoUrl ? getThumbUrl(data.bizLogoUrl, 300, 300) : null;
  // PR #159: «Para pedir» y el QR no llevan píldoras (nada de
  // etiqueta de ciudad en la carta); el QR tampoco lleva foto.
  const showPills = style.id === 'glass' || style.id === 'editorial';
  const isPedido = style.id === 'pedido';
  const isQr = style.id === 'qr';

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
                alt="QR del menú"
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
      ) : null}

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

      {/* Línea bajo el QR (PR #159). */}
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
          Escanea para ver el menú
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
        Descúbrelo en <span style={{ color: palette.text, fontWeight: 800 }}>CityMap</span>
      </div>
    </div>
  );
}
