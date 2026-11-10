// Hoja para compartir el artículo / experiencia como imagen: la misma
// hoja centrada de la tarjeta de eventos (PR #152) y de negocios
// (PR #147) — tarjeta con las 4 esquinas redondeadas, entrada con
// scale-in-center, vista previa chica y botones en flujo normal al
// final — pero con la tarjeta del artículo (2 estilos: «Foto completa»
// y «Dividida», que se cambian con chevrones ‹ › y puntos, como en
// negocios) en vez de la del evento. Al presionar Compartir se genera
// un PNG con la foto y los datos del artículo, listo para
// Instagram/Facebook. El «Compartir enlace» de abajo conserva el
// comportamiento anterior (compartir la liga del artículo).
// En web NO se puede publicar directo a Instagram: la hoja comparte la
// imagen con el menú del sistema o la descarga, nunca promete publicarla.
// Sin foto la tarjeta sale con el bloque de la inicial, nunca rota.
import React, { useEffect, useRef, useState } from 'react';
import { useDataStore } from '../store/useDataStore.js';
import { useUIStore } from '../store/useUIStore.js';
import ExperienceShareCardTemplate from './ExperienceShareCardTemplate.jsx';
import {
  SHARE_CARD_FORMAT_LIST,
  canShareImageFiles,
  isPhotoFetchable,
  shareOrDownloadPng,
} from '../lib/shareCard.js';
import {
  EXPERIENCE_SHARE_CARD_DEFAULT_STYLE,
  EXPERIENCE_SHARE_CARD_STYLE_LIST,
  buildExperienceShareCardData,
  experienceShareCardFileName,
  exportExperienceShareCardPng,
} from '../lib/experienceShareCard.js';

const PREVIEW_W = 200;
// Deslizamiento mínimo del dedo para cambiar de estilo: mismo umbral
// que las tiras del inicio (StoryStrip, PR #149) y que la hoja de
// negocios (PR #160).
const SWIPE_MIN_PX = 60;

// La tarjeta es compacta a propósito (igual que la de negocios, PR
// #144): vista previa chica y espacios apretados para que en cualquier
// teléfono se vean la vista previa y los dos botones sin tener que
// bajar. Si aparece un aviso (foto sin cargar o error) o la pantalla es
// muy chica, TODO el panel hace scroll como una unidad (sin pie sticky:
// los botones nunca quedan en medio de la vista previa).

export default function ExperienceShareCardSheet({ experience, onClose, onShareLink }) {
  const dark = useUIStore((s) => s.dark);
  const toast$ = useUIStore((s) => s.toast$);
  const cities = useDataStore((s) => s.cities);
  const [formatId, setFormatId] = useState('story');
  const [styleId, setStyleId] = useState(EXPERIENCE_SHARE_CARD_DEFAULT_STYLE);
  const [status, setStatus] = useState('idle'); // idle | generating | error
  const [error, setError] = useState('');
  const [photoFailed, setPhotoFailed] = useState(false);
  // Con «reducir movimiento» la pista no desliza: cambia de estilo al
  // instante, como las tiras (StoryStrip).
  const [reduceMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches),
  );

  const format =
    SHARE_CARD_FORMAT_LIST.find((f) => f.id === formatId) || SHARE_CARD_FORMAT_LIST[0];
  const expCitySlug = String(experience?.city_slug || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)[0] || '';
  const cityName =
    cities.find((c) => c.slug === expCitySlug)?.name ||
    expCitySlug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const data = buildExperienceShareCardData(experience, { cityName });
  // Sin foto, la tarjeta sale sin esa parte (nunca rota): el fallo de
  // carga quita el dato y la geometría se recalcula sin él.
  let exportData = data;
  if (photoFailed) exportData = { ...exportData, photoUrl: null };

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
      const blob = await exportExperienceShareCardPng(dataToExport, format, styleId);
      const how = await shareOrDownloadPng(blob, experienceShareCardFileName(experience));
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

  const previewScale = PREVIEW_W / format.width;
  const previewH = Math.round(format.height * previewScale);
  const shareLabel = canShareImageFiles() ? 'Compartir imagen' : 'Descargar imagen';

  // Estilos de la tarjeta (mismo patrón que negocios, PRs #155–#160):
  // dos estilos («Foto completa» y «Dividida») que se cambian con
  // chevrones ‹ › a los lados de la vista previa y puntos debajo. La
  // vista previa es una PISTA deslizante con los dos estilos en fila:
  // al cambiar de estilo la pista se mueve con translateX y una
  // transición suave de 0,5 s. Es un CARRUSEL INFINITO con clones (un
  // clon del último antes del primero y un clon del primero después del
  // último); al avanzar desde el último la pista desliza hasta el clon
  // y luego se resetea a la posición real SIN transición (noAnim), sin
  // que se note el salto. Los puntos marcan el índice real, no el clon.
  // La exportación a PNG no cambia: sigue el estilo elegido.
  const availableStyles = EXPERIENCE_SHARE_CARD_STYLE_LIST;
  const styleIndex = Math.max(
    0,
    availableStyles.findIndex((s) => s.id === styleId),
  );
  const styleCount = availableStyles.length;
  // Posición en la pista con clones: 0 = clon del último, 1..n =
  // estilos reales, n+1 = clon del primero. Empieza en el estilo por
  // defecto (el primero).
  const [trackPos, setTrackPos] = useState(() => {
    const i = Math.max(
      0,
      availableStyles.findIndex((s) => s.id === EXPERIENCE_SHARE_CARD_DEFAULT_STYLE),
    );
    return i + 1;
  });
  const [noAnim, setNoAnim] = useState(false);
  // Arrastre táctil en curso (null = sin arrastre): la pista sigue al
  // dedo (mismo patrón que StoryStrip, PR #149).
  const [dragX, setDragX] = useState(null);
  const touchStart = useRef(null);
  const goStyle = (delta) => {
    // Si la pista está en un clon (reseteo pendiente, dura 0,5 s), se
    // ignora el toque: así nunca se sale del rango de la pista y el
    // reseteo silencioso no se pisa.
    if (trackPos === 0 || trackPos === styleCount + 1) return;
    const next = (styleIndex + delta + styleCount) % styleCount;
    setStyleId(availableStyles[next].id);
    if (reduceMotion) {
      setNoAnim(true);
      setTrackPos(next + 1);
      return;
    }
    setNoAnim(false);
    setTrackPos((p) => p + delta);
  };
  // Tocar un punto salta a ese estilo real: la pista desliza hasta su
  // posición real, nunca a un clon.
  const goToStyle = (index) => {
    if (index === styleIndex) return;
    if (trackPos === 0 || trackPos === styleCount + 1) return;
    setStyleId(availableStyles[index].id);
    setNoAnim(reduceMotion);
    setTrackPos(index + 1);
  };
  // Swipe táctil (PR #160 en negocios): deslizar con el dedo cambia de
  // estilo. La pista sigue al dedo (sin transición durante el arrastre)
  // y al soltar completa el cambio si el gesto supera SWIPE_MIN_PX; si
  // no, vuelve a su sitio. touchAction pan-y: el navegador conserva el
  // scroll vertical del panel; si el gesto es claramente vertical, se
  // cancela el arrastre y el panel hace scroll.
  const onTouchStart = (e) => {
    if (trackPos === 0 || trackPos === styleCount + 1) return;
    const touch = e.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
    setDragX(0);
  };
  const onTouchMove = (e) => {
    if (!touchStart.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStart.current.x;
    const dy = touch.clientY - touchStart.current.y;
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
      touchStart.current = null;
      setDragX(null);
      return;
    }
    touchStart.current.dx = dx;
    if (!reduceMotion) setDragX(dx);
  };
  const onTouchEnd = () => {
    const dx = touchStart.current?.dx ?? 0;
    if (Math.abs(dx) > SWIPE_MIN_PX) {
      goStyle(dx < 0 ? 1 : -1);
    }
    setDragX(null);
    touchStart.current = null;
  };
  const onTouchCancel = () => {
    setDragX(null);
    touchStart.current = null;
  };
  // Reseteo silencioso del bucle: tras deslizar hasta un clon, la
  // pista salta a la posición real equivalente sin transición. El
  // tiempo (0,5 s) es lo que dura la transición, así el salto cae
  // justo al terminar el deslizamiento y no se nota.
  useEffect(() => {
    if (reduceMotion) return undefined;
    if (trackPos !== 0 && trackPos !== styleCount + 1) return undefined;
    const t = setTimeout(() => {
      setNoAnim(true);
      setTrackPos(trackPos === 0 ? styleCount : 1);
    }, 500);
    return () => clearTimeout(t);
  }, [trackPos, styleCount, reduceMotion]);
  const dotColor = dark ? '#FAFAFA' : '#18181B';
  // Sin transición mientras se arrastra con el dedo: la pista sigue al
  // dedo en vez de animar (PR #160, como StoryStrip).
  const trackTransition =
    reduceMotion || noAnim || dragX !== null
      ? 'none'
      : 'transform 0.5s cubic-bezier(0.32, 0.72, 0, 1)';
  // La pista lleva los clones en los extremos: [último, ...estilos,
  // primero]. Las claves llevan la posición, porque el id se repite
  // entre el clon y el estilo real.
  const trackStyles = [
    availableStyles[styleCount - 1],
    ...availableStyles,
    availableStyles[0],
  ];

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

        <div style={{ display: 'flex', gap: 8, marginBottom: 8, marginTop: 10 }}>
          {SHARE_CARD_FORMAT_LIST.map((f) => (
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

        {/* Chevrones para cambiar de estilo: ‹ › a los lados de la vista
            previa, con envoltura; abajo, los puntos que indican cuántas
            hay (2 estilos). Mismo lenguaje de puntos que StoryStrip /
            Gallery: 6 px, inactivo opacidad 0.25, activo píldora de
            16 px, SIN transición. Tocar un punto salta a ese estilo. */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            marginBottom: 0,
          }}
        >
          <button
            aria-label="Estilo anterior"
            onClick={() => goStyle(-1)}
            className="press"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: 26,
              lineHeight: 1,
              color: dark ? '#A1A1AA' : '#71717A',
              padding: '8px 8px',
              fontFamily: 'inherit',
              flexShrink: 0,
            }}
          >
            ‹
          </button>
          <div
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onTouchCancel={onTouchCancel}
            style={{
              width: PREVIEW_W,
              height: previewH,
              borderRadius: 20,
              overflow: 'hidden',
              boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
              background: '#0B0B0B',
              flexShrink: 0,
              touchAction: 'pan-y',
            }}
          >
            <div
              style={{
                display: 'flex',
                height: previewH,
                transform: `translateX(${-trackPos * PREVIEW_W + (dragX ?? 0)}px)`,
                transition: trackTransition,
              }}
            >
              {trackStyles.map((s, i) => (
                <div
                  key={`${s.id}-${i}`}
                  style={{
                    width: PREVIEW_W,
                    height: previewH,
                    flexShrink: 0,
                    overflow: 'hidden',
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
                    <ExperienceShareCardTemplate
                      data={exportData}
                      format={format}
                      styleId={s.id}
                      onPhotoError={() => setPhotoFailed(true)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button
            aria-label="Estilo siguiente"
            onClick={() => goStyle(1)}
            className="press"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: 26,
              lineHeight: 1,
              color: dark ? '#A1A1AA' : '#71717A',
              padding: '8px 8px',
              fontFamily: 'inherit',
              flexShrink: 0,
            }}
          >
            ›
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 6,
            marginTop: 10,
            marginBottom: 8,
          }}
        >
          {availableStyles.map((s, n) => (
            <button
              key={s.id}
              aria-label={`Estilo ${s.label}`}
              onClick={() => goToStyle(n)}
              style={{
                width: n === styleIndex ? 16 : 6,
                height: 6,
                borderRadius: 3,
                border: 'none',
                padding: 0,
                background: dotColor,
                opacity: n === styleIndex ? 1 : 0.25,
                cursor: 'pointer',
              }}
            />
          ))}
        </div>

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
              if (onShareLink) onShareLink(experience);
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
