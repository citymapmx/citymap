// Hoja para compartir el evento como imagen (PR #152): la misma hoja
// centrada de la tarjeta de negocios (PR #147) — tarjeta con las 4
// esquinas redondeadas, entrada con scale-in-center, vista previa
// chica y botones en flujo normal al final — pero con la tarjeta del
// evento (5 estilos según el tipo) en vez de la del negocio. Al
// presionar Compartir se genera un PNG con el póster y los datos del
// evento, listo para Instagram/Facebook. El «Compartir enlace» de abajo
// conserva el comportamiento anterior (compartir la liga del evento).
// En web NO se puede publicar directo a Instagram: la hoja comparte la
// imagen con el menú del sistema o la descarga, nunca promete publicarla.
// Sin foto la tarjeta sale con el bloque de la inicial, nunca rota.
// Dos formatos: Historia IG 1080×1920 y Post IG 1080×1080 (el Post
// volvió el 11 nov 2026, sin descripción y sin categoría) y dos temas:
// Oscura (la de siempre) y Clara (fondo blanco, texto oscuro). La foto
// se puede reposicionar arrastrándola en la vista previa (11 nov 2026,
// Jonathan): el desplazamiento solo vive en la sesión de la hoja y el
// PNG refleja exactamente lo que se ve.
import React, { useRef, useState } from 'react';
import { useDataStore } from '../store/useDataStore.js';
import { useUIStore } from '../store/useUIStore.js';
import EventShareCardTemplate from './EventShareCardTemplate.jsx';
import {
  canShareImageFiles,
  clampPhotoOffset,
  isPhotoFetchable,
  shareOrDownloadPng,
} from '../lib/shareCard.js';
import {
  buildEventShareCardData,
  computeEventShareCardLayout,
  eventShareCardFileName,
  exportEventShareCardPng,
  EVENT_SHARE_CARD_FORMAT_LIST,
  EVENT_SHARE_CARD_THEME_LIST,
} from '../lib/eventShareCard.js';

const PREVIEW_W = 200;

// La tarjeta es compacta a propósito (igual que la de negocios, PR
// #144): vista previa chica y espacios apretados para que en cualquier
// teléfono se vean la vista previa y los dos botones sin tener que
// bajar. Si aparece un aviso (foto sin cargar o error) o la pantalla es
// muy chica, TODO el panel hace scroll como una unidad (sin pie sticky:
// los botones nunca quedan en medio de la vista previa).

export default function EventShareCardSheet({ event, onClose, onShareLink }) {
  const dark = useUIStore((s) => s.dark);
  const toast$ = useUIStore((s) => s.toast$);
  const cities = useDataStore((s) => s.cities);
  const [themeId, setThemeId] = useState('oscura');
  const [formatId, setFormatId] = useState('story');
  const [status, setStatus] = useState('idle'); // idle | generating | error
  const [error, setError] = useState('');
  const [photoFailed, setPhotoFailed] = useState(false);
  // Desplazamiento de la foto dentro del marco (11 nov 2026, Jonathan:
  // se arrastra en la vista previa antes de guardar). { x, y } en
  // [-1, 1], 0 = centrada (comportamiento actual); solo vive en la
  // sesión de la hoja, no se guarda en la base. Viaja en exportData
  // para que la vista previa y el PNG usen el mismo valor.
  const [photoOffset, setPhotoOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef(null);

  // Dos formatos (el Post volvió el 11 nov 2026): Historia IG
  // 1080×1920 y Post IG 1080×1080, sin descripción en Post.
  const format =
    EVENT_SHARE_CARD_FORMAT_LIST.find((f) => f.id === formatId) ||
    EVENT_SHARE_CARD_FORMAT_LIST[0];
  const evCitySlug = String(event?.city_slug || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)[0] || '';
  const cityName = cities.find((c) => c.slug === evCitySlug)?.name || '';
  const data = buildEventShareCardData(event, { cityName });
  // Sin foto, la tarjeta sale sin esa parte (nunca rota): el fallo de
  // carga quita el dato y la geometría se recalcula sin él. El tema
  // (Oscura/Clara) viaja en el dato para que la vista previa y el PNG
  // usen los mismos colores; el desplazamiento de la foto también
  // viaja en el dato para que ambos usen la misma posición.
  let exportData = data;
  if (photoFailed) exportData = { ...exportData, photoUrl: null };
  exportData = { ...exportData, theme: themeId, photoOffset };

  // Arrastre de la foto (11 nov 2026, Jonathan): arrastrar la vista
  // previa mueve la foto dentro del marco. Eventos de puntero (ratón
  // y táctil en uno solo, con captura para no perder el gesto) y
  // touchAction 'none' en el marco para que el dedo mueva la foto y
  // no haga scroll del panel. El desplazamiento sigue al dedo: al
  // arrastrar a la derecha se ve más de la izquierda de la foto (el
  // offset baja), igual que al mover una foto dentro de un marco. El
  // gesto se mide en píxeles de tarjeta (dividido por previewScale) y
  // se convierte a offset: arrastrar medio marco en un eje equivale a
  // un offset de 1 en ese eje (de un borde al otro). Se fija al
  // [-1, 1] con clampPhotoOffset: la ventana de origen nunca se sale
  // de la foto, así que el arrastre se detiene en el borde.
  const previewScale = PREVIEW_W / format.width;
  const previewH = Math.round(format.height * previewScale);
  const previewLayout = computeEventShareCardLayout(exportData, format);
  const photoFrameW = previewLayout.photo.w;
  const photoFrameH = previewLayout.photo.h;
  const canDragPhoto = Boolean(exportData.photoUrl) && !photoFailed;
  const photoMoved = photoOffset.x !== 0 || photoOffset.y !== 0;

  const onPhotoPointerDown = (e) => {
    if (!canDragPhoto || status === 'generating') return;
    e.preventDefault();
    dragRef.current = {
      x: e.clientX,
      y: e.clientY,
      offsetX: photoOffset.x,
      offsetY: photoOffset.y,
    };
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPhotoPointerMove = (e) => {
    const start = dragRef.current;
    if (!start) return;
    const dx = (e.clientX - start.x) / previewScale;
    const dy = (e.clientY - start.y) / previewScale;
    setPhotoOffset({
      x: clampPhotoOffset(start.offsetX - (2 * dx) / photoFrameW),
      y: clampPhotoOffset(start.offsetY - (2 * dy) / photoFrameH),
    });
  };
  const onPhotoPointerEnd = () => {
    dragRef.current = null;
    setIsDragging(false);
  };
  const onResetPhotoOffset = () => setPhotoOffset({ x: 0, y: 0 });

  const onExport = async () => {
    if (status === 'generating') return;
    setError('');
    setStatus('generating');
    try {
      // Si la foto no se puede leer con CORS, la tarjeta sale sin foto
      // (nunca rota): se quita y se exporta el resto.
      let dataToExport = exportData;
      if (exportData.photoUrl) {
        const ok = await isPhotoFetchable(exportData.photoUrl);
        if (!ok) {
          setPhotoFailed(true);
          dataToExport = { ...exportData, photoUrl: null };
        }
      }
      // La imagen se dibuja directo en canvas (PR #143): lo que se
      // descarga es lo mismo que la vista previa, nunca en blanco.
      const blob = await exportEventShareCardPng(dataToExport, format);
      const how = await shareOrDownloadPng(blob, eventShareCardFileName(event, format));
      toast$(how === 'shared' ? 'Imagen lista para compartir' : 'Imagen descargada');
      setStatus('idle');
      onClose();
    } catch (e) {
      // El usuario cerró el menú de compartir: no es un error.
      if (e?.name === 'AbortError') {
        setStatus('idle');
        return;
      }
      setStatus('error');
      setError('No se pudo crear la imagen. Revisa tu conexión e inténtalo de nuevo.');
    }
  };

  const shareLabel = canShareImageFiles() ? 'Compartir imagen' : 'Descargar imagen';

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 16px',
        boxSizing: 'border-box',
      }}
    >
      <div
        className="scale-in-center"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: dark ? '#232326' : '#FFFFFF',
          width: 'calc(100vw - 32px)',
          maxWidth: 460,
          borderRadius: 24,
          padding: '12px 16px calc(10px + env(safe-area-inset-bottom, 0px))',
          boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
          maxHeight: '92dvh',
          overflowY: 'auto',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 0,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 800,
              color: dark ? '#FAFAFA' : '#18181B',
            }}
          >
            Compartir
          </h2>
          <button
            aria-label="Cerrar"
            onClick={onClose}
            className="press"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: 22,
              lineHeight: 1,
              color: dark ? '#A1A1AA' : '#71717A',
              padding: 4,
            }}
          >
            ×
          </button>
        </div>

        {/* Selector de formato (Historia/Post), igual que la hoja de
            artículos: el cambio es instantáneo, la vista previa y el
            PNG usan el formato elegido. En Post no va la descripción. */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, marginTop: 10 }}>
          {EVENT_SHARE_CARD_FORMAT_LIST.map((f) => (
            <button
              key={f.id}
              onClick={() => setFormatId(f.id)}
              className="press"
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: 14,
                border: `1.5px solid ${formatId === f.id ? '#000000' : dark ? '#3F3F46' : '#E4E4E7'}`,
                background: formatId === f.id ? '#000000' : 'transparent',
                color: formatId === f.id ? '#FFFFFF' : dark ? '#FAFAFA' : '#18181B',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 800 }}>{f.label}</div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: formatId === f.id ? 'rgba(255,255,255,0.7)' : dark ? '#A1A1AA' : '#71717A',
                  marginTop: 2,
                }}
              >
                {f.width} × {f.height}
              </div>
            </button>
          ))}
        </div>

        {/* Selector de tema (Oscura/Clara): el estilo por categoría
            sigue siendo automático; aquí solo cambia el fondo. */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, marginTop: 10 }}>
          {EVENT_SHARE_CARD_THEME_LIST.map((t) => (
            <button
              key={t.id}
              onClick={() => setThemeId(t.id)}
              className="press"
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: 14,
                border: `1.5px solid ${themeId === t.id ? '#000000' : dark ? '#3F3F46' : '#E4E4E7'}`,
                background: themeId === t.id ? '#000000' : 'transparent',
                color: themeId === t.id ? '#FFFFFF' : dark ? '#FAFAFA' : '#18181B',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 800 }}>{t.label}</div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: themeId === t.id ? 'rgba(255,255,255,0.7)' : dark ? '#A1A1AA' : '#71717A',
                  marginTop: 2,
                }}
              >
                {t.id === 'oscura' ? 'Fondo oscuro' : 'Fondo claro'}
              </div>
            </button>
          ))}
        </div>

        {/* Vista previa: se puede arrastrar la foto dentro del marco
            (11 nov 2026, Jonathan) para ajustar su posición antes de
            guardar. touchAction 'none': el dedo mueve la foto, no hace
            scroll del panel. Sin foto no hay nada que arrastrar. */}
        <div
          onPointerDown={onPhotoPointerDown}
          onPointerMove={onPhotoPointerMove}
          onPointerUp={onPhotoPointerEnd}
          onPointerCancel={onPhotoPointerEnd}
          style={{
            width: PREVIEW_W,
            height: previewH,
            margin: '0 auto 8px',
            borderRadius: 20,
            overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
            background: '#0B0B0B',
            touchAction: canDragPhoto ? 'none' : 'auto',
            cursor: canDragPhoto ? (isDragging ? 'grabbing' : 'grab') : 'default',
          }}
        >
          <div
            style={{
              width: format.width,
              height: format.height,
              transform: `scale(${previewScale})`,
              transformOrigin: 'top left',
            }}
          >
            <EventShareCardTemplate
              data={exportData}
              format={format}
              onPhotoError={() => setPhotoFailed(true)}
            />
          </div>
        </div>

        {canDragPhoto ? (
          <p
            style={{
              margin: '0 0 8px 0',
              fontSize: 12,
              color: dark ? '#A1A1AA' : '#71717A',
              textAlign: 'center',
            }}
          >
            Arrastra la foto para ajustar su posición
            {photoMoved ? (
              <>
                {' · '}
                <button
                  onClick={onResetPhotoOffset}
                  className="press"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    fontSize: 12,
                    fontWeight: 800,
                    color: dark ? '#FAFAFA' : '#18181B',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Centrar foto
                </button>
              </>
            ) : null}
          </p>
        ) : null}
        {photoFailed ? (
          <p style={{ margin: '0 0 8px 0', fontSize: 12, color: '#B45309', textAlign: 'center' }}>
            La foto no se pudo cargar: la tarjeta se genera sin foto.
          </p>
        ) : null}
        {status === 'error' && error ? (
          <p style={{ margin: '0 0 8px 0', fontSize: 13, color: '#DC2626', textAlign: 'center' }}>
            {error}
          </p>
        ) : null}

        {/* Botones en flujo normal (PR #147): nada de position sticky
            dentro del panel animado — el pie fijo partía la animación
            en dos y los botones salían a la mitad de la vista previa.
            Si la tarjeta desborda, todo el panel hace scroll junto. */}
        <div
          style={{
            marginTop: 6,
            paddingTop: 10,
            borderTop: `1px solid ${dark ? '#3F3F46' : '#E4E4E7'}`,
          }}
        >
          <button
            onClick={onExport}
            disabled={status === 'generating'}
            className="press"
            style={{
              width: '100%',
              padding: 13,
              background: '#000000',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 16,
              fontSize: 15,
              fontWeight: 800,
              cursor: status === 'generating' ? 'wait' : 'pointer',
              opacity: status === 'generating' ? 0.7 : 1,
              fontFamily: 'inherit',
            }}
          >
            {status === 'generating' ? 'Creando imagen…' : shareLabel}
          </button>
          <button
            onClick={() => {
              if (onShareLink) onShareLink(event);
              onClose();
            }}
            className="press"
            style={{
              width: '100%',
              padding: 11,
              marginTop: 4,
              background: 'transparent',
              color: dark ? '#FAFAFA' : '#18181B',
              border: 'none',
              borderRadius: 16,
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Compartir enlace
          </button>
        </div>
      </div>
    </div>
  );
}
