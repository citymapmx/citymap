// Plantilla de la tarjeta para compartir el evento (PR #152): los 5
// estilos de la imagen de Jonathan — festival (título enorme en
// mayúsculas), editorial (chip, título, subtítulo, precio), boleto
// (título, rango de fechas, lugar y código de barras decorativo),
// experiencias (chip, título, subtítulo, «Cupo limitado») y agenda
// (información clara y directa, sin píldora). La foto es el póster del
// evento y crece (flex: 1, con altura mínima) para comerse el espacio
// libre: nunca queda franja vacía entre la información y el pie. El
// logotipo es /logo-brand.png en blanco, igual que la tarjeta de
// negocios. Sin foto no hay imagen rota: sale un bloque oscuro con la
// inicial del título.
// La vista previa y el PNG exportado comparten la misma geometría:
// EVENT_SHARE_CARD_LAYOUT + computeEventShareCardLayout en
// lib/eventShareCard.js, así que lo que se ve es lo que se descarga.
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

      {layout.chip ? (
        <div
          style={{
            marginTop: firstBlock === 'chip' ? layout.firstGap : L.catGap,
            fontSize: L.catSize,
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: 6,
            textTransform: 'uppercase',
            color: '#A3A3A3',
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
                color: 'rgba(255,255,255,0.75)',
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
                color: 'rgba(255,255,255,0.85)',
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
              background: 'rgba(255,255,255,0.12)',
              borderRadius: 999,
              padding: `${L.pillPadY}px ${L.pillPadX}px`,
              fontSize: L.pillSize,
              fontWeight: 700,
              lineHeight: 1,
              display: 'inline-block',
            }}
          >
            {layout.pill.text}
          </span>
        </div>
      ) : null}

      {/* Código de barras decorativo (estilo boleto): tira blanca con
          las barras en las posiciones del layout, igual que el canvas.
          No es un código real, no se escanea. */}
      {layout.barcode ? (
        <div
          style={{
            marginTop: firstBlock === 'barcode' ? layout.firstGap : L.barcodeGap,
            width: photoW,
            height: L.barcodeH,
            background: '#FFFFFF',
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
                background: '#111111',
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
          color: '#A3A3A3',
          flexShrink: 0,
        }}
      >
        Descúbrelo en <span style={{ color: '#FFFFFF', fontWeight: 800 }}>CityMap</span>
      </div>
    </div>
  );
}
