// Plantilla de la tarjeta para compartir el evento (PR #152): los 5
// estilos de la imagen de Jonathan — festival (título enorme en
// mayúsculas), editorial (chip, título, subtítulo, precio), boleto
// (título, rango de fechas, lugar y código de barras decorativo),
// experiencias (chip, título, subtítulo, «Cupo limitado») y agenda
// (información clara y directa, sin píldora). La foto es el póster del
// evento y crece (flex: 1, con altura mínima) para comerse el espacio
// libre: nunca queda franja vacía entre la información y el pie. El
// logotipo es /logo-brand.png: en blanco en Oscura y en negro
// (brightness(0)) en Clara. Sin foto no hay imagen rota: sale un bloque
// con la inicial del título. Solo formato Historia.
// La vista previa y el PNG exportado comparten la misma geometría:
// EVENT_SHARE_CARD_LAYOUT + computeEventShareCardLayout en
// lib/eventShareCard.js, así que lo que se ve es lo que se descarga.
// Los colores vienen de layout.palette (el tema Oscura/Clara de
// data.theme), igual que el canvas.
import { getThumbUrl } from '../lib/utils.js';
import {
  SHARE_CARD_FORMATS,
  EVENT_SHARE_CARD_LAYOUT,
  computeEventShareCardLayout,
} from '../lib/eventShareCard.js';

export default function EventShareCardTemplate({ data, format, onPhotoError }) {
  const f = format || SHARE_CARD_FORMATS.story;
  const L = EVENT_SHARE_CARD_LAYOUT[f.id] || EVENT_SHARE_CARD_LAYOUT.story;
  const width = f.width;
  const photoW = width - L.pad * 2;
  // Las líneas (título, subtítulo, información, píldora, barras) se
  // calculan con la misma función que usa el exportador de canvas:
  // el corte y los anchos son idénticos en ambos.
  const layout = computeEventShareCardLayout(data, format);
  const palette = layout.palette;
  // La foto se pide ancha (1600w por el bucket de getThumbUrl) para que
  // salga nítida en la exportación a 1080 px.
  const photoSrc = data?.photoUrl ? getThumbUrl(data.photoUrl, 1080) : null;
  const initial = (data?.title || 'C').trim().charAt(0).toUpperCase() || 'C';
  const firstBlock = layout.chip
    ? 'chip'
    : layout.title && layout.title.lines.length
      ? 'title'
      : layout.subtitle && layout.subtitle.lines.length
        ? 'subtitle'
        : layout.info.length
          ? 'info'
          : layout.pill
            ? 'pill'
            : layout.barcode
              ? 'barcode'
              : 'foot';

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
          filter: palette.logoWhite ? 'brightness(0) invert(1)' : 'brightness(0)',
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

      {layout.chip ? (
        <div
          style={{
            marginTop: firstBlock === 'chip' ? layout.firstGap : L.catGap,
            fontSize: L.catSize,
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: 6,
            textTransform: 'uppercase',
            color: palette.muted,
            flexShrink: 0,
          }}
        >
          {layout.chip.text}
        </div>
      ) : null}

      {layout.title && layout.title.lines.length ? (
        <div
          style={{
            marginTop: firstBlock === 'title' ? layout.firstGap : L.titleGap,
            width: photoW,
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
              }}
            >
              {line}
            </div>
          ))}
        </div>
      ) : null}

      {layout.subtitle && layout.subtitle.lines.length ? (
        <div
          style={{
            marginTop: firstBlock === 'subtitle' ? layout.firstGap : L.subGap,
            width: photoW,
            flexShrink: 0,
          }}
        >
          {layout.subtitle.lines.map((line, i) => (
            <div
              key={i}
              style={{
                fontSize: layout.subtitle.size,
                fontWeight: 600,
                lineHeight: L.subLineH,
                color: palette.sub,
              }}
            >
              {line}
            </div>
          ))}
        </div>
      ) : null}

      {layout.info.length ? (
        <div
          style={{
            marginTop: firstBlock === 'info' ? layout.firstGap : L.infoGap,
            width: photoW,
            flexShrink: 0,
          }}
        >
          {layout.info.map((row, i) => (
            <div
              key={i}
              style={{
                fontSize: row.size,
                fontWeight: 600,
                lineHeight: L.infoLineH,
                color: palette.info,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {row.text}
            </div>
          ))}
        </div>
      ) : null}

      {layout.pill ? (
        <div
          style={{
            marginTop: firstBlock === 'pill' ? layout.firstGap : L.pillGap,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              background: palette.pillBg,
              borderRadius: 999,
              padding: `${L.pillPadY}px ${L.pillPadX}px`,
              fontSize: L.pillSize,
              fontWeight: 700,
              lineHeight: 1,
              display: 'inline-block',
              color: palette.pillText,
            }}
          >
            {layout.pill.text}
          </span>
        </div>
      ) : null}

      {/* Código de barras decorativo (estilo boleto): tira con las
          barras en las posiciones del layout, igual que el canvas. En
          Oscura es tira blanca con barras negras; en Clara, tira negra
          con barras blancas. No es un código real, no se escanea. */}
      {layout.barcode ? (
        <div
          style={{
            marginTop: firstBlock === 'barcode' ? layout.firstGap : L.barcodeGap,
            width: photoW,
            height: L.barcodeH,
            background: palette.barcodeBg,
            borderRadius: 20,
            position: 'relative',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {layout.barcode.bars.map((bar, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: L.barcodePadX + bar.x,
                top: L.barcodePadY,
                width: bar.w,
                height: L.barcodeH - L.barcodePadY * 2,
                background: palette.barcodeBar,
              }}
            />
          ))}
        </div>
      ) : null}

      <div
        style={{
          marginTop: firstBlock === 'foot' ? layout.firstGap : L.footGap,
          fontSize: L.footSize,
          lineHeight: 1,
          letterSpacing: 2,
          color: palette.footMuted,
          flexShrink: 0,
        }}
      >
        Descubre más eventos en{' '}
        <span style={{ color: palette.footBold, fontWeight: 800 }}>www.citymap.mx</span>
      </div>
    </div>
  );
}
