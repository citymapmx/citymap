// Hoja para compartir el negocio como imagen (PR #142, v1; PR #143: la
// imagen se dibuja en canvas, con el logo oficial y la calificación de
// Google con su conteo, sin precio; PR #144: logo circular del negocio y
// hoja compacta con los botones en un pie fijo, para que se vean sin
// bajar en cualquier teléfono).
// PR #154: tres estilos (Oscura, Editorial y Ficha completa) que se
// eligen en la hoja junto al formato (Historia/Post): la vista previa y
// el PNG son del estilo elegido. El oscuro sigue siendo el por defecto.
// PR #155: la Ficha completa se quita y quedan DOS estilos (Oscura y
// Editorial), que se cambian con chevrones ‹ › a los lados de la vista
// previa (con envoltura) y puntos debajo indicando cuántas hay — en
// lugar de los botones de estilo. Los botones de formato se quedan.
// También sale la categoría de ambas versiones, la foto es más corta,
// el nombre y las píldoras más grandes y el logo de Editorial va en
// oscuro (el PNG es blanco y no se veía).
// PR #156: el estilo claro pasa a llamarse «Clara» (el id interno sigue
// siendo 'editorial'); al cambiar de estilo con el chevron o los puntos
// la vista previa DESLIZA con fluidez (pista con translateX y
// transición de 0,5 s, como las tiras del #149) en vez de cambiar de
// golpe; y el logo de Post crece (76 px) para que se vea en la vista
// previa de 200 px (en Post era tan chico que parecía no estar).
// PR #158: Jonathan pidió dos cosas más con una captura de Vincent
// Andares (Clara/Historia): (1) los chevrones ‹ › estaban muy pegados
// a la vista previa, así que se separan más (más hueco a los lados);
// (2) al dar › en el último estilo la pista se REGRESABA deslizándose
// hacia atrás y él quiere que le dé la VUELTA y empiece de nuevo al
// inicio: ahora la pista es un carrusel infinito con clones (un clon
// del último antes del primero y un clon del primero después del
// último) y reseteo silencioso sin transición al llegar al clon.
// PR #160: Jonathan pidió dos cosas más con capturas de Vulcanos
// Chapalita (Clara, Historia y Post): (1) Clara también lleva el
// logotipo DEL NEGOCIO (el de CityMap sí estaba; el círculo del
// negocio no, por diseño del #154) — mismo círculo que en Oscura,
// con anillo gris visible sobre blanco; (2) deslizar con el dedo
// para cambiar de estilo (swipe táctil como las tiras del #149,
// con el bucle del #158).
// PR #146: la hoja entra con scale-in-center (la misma animación de las
// tarjetas del mapa, PR #134/#135): el panel crece desde el centro en
// 0,5 s, en vez del fundido de la librería de animación. La clase va en
// el panel mismo (sin el div animado): la animación CSS solo toca
// transform, y el panel no lo centra la librería con x:"-50%", así que
// no hay conflicto; con "reducir movimiento" el CSS la apaga solo.
// También el círculo del negocio es más grande (Ø 240 Historia /
// 190 Post).
// PR #147: la hoja deja de ser un bottom sheet anclado abajo y pasa a
// ser una TARJETA CENTRADA con las 4 esquinas redondeadas. El pie fijo
// (sticky) partía la animación en dos —el pie y el contenido no se
// movían como una unidad y los botones salían a la mitad de la vista
// previa—, así que los botones van en flujo normal al final de la
// tarjeta y el panel entero (que ya lleva fondo, borde y sombra) anima
// con scale-in-center como una sola pieza. Sin tirador: es un
// affordance de bottom sheet, una tarjeta centrada no lo lleva.
// Al presionar Compartir se genera un PNG con la foto y los datos del
// negocio, listo para Instagram/Facebook. v1: UN estilo oscuro, dos
// formatos (Historia IG 1080×1920, Post IG 1080×1080). El botón de
// compartir de la ficha abre esta hoja; el «Compartir enlace» de abajo
// conserva el comportamiento anterior (compartir la liga del negocio).
// En web NO se puede publicar directo a Instagram: la hoja comparte la
// imagen con el menú del sistema o la descarga, nunca promete publicarla.
import React, { useEffect, useRef, useState } from 'react';
import { useDataStore } from '../store/useDataStore.js';
import { useUIStore } from '../store/useUIStore.js';
import { displayRating } from '../lib/googleRatings.js';
import { getThumbUrl } from '../lib/utils.js';
import ShareCardTemplate from './ShareCardTemplate.jsx';
import {
  SHARE_CARD_DEFAULT_STYLE,
  SHARE_CARD_FORMAT_LIST,
  SHARE_CARD_STYLE_LIST,
  buildShareCardData,
  canShareImageFiles,
  exportShareCardPng,
  isPhotoFetchable,
  shareCardFileName,
  shareOrDownloadPng,
} from '../lib/shareCard.js';

const PREVIEW_W = 200;
// Deslizamiento mínimo del dedo para cambiar de estilo (PR #160):
// mismo umbral que las tiras del inicio (StoryStrip, PR #149).
const SWIPE_MIN_PX = 60;

// La tarjeta es compacta a propósito (PR #144): vista previa chica y
// espacios apretados para que en cualquier teléfono se vean la vista
// previa y los dos botones sin tener que bajar. Peor caso (Historia,
// 200×356): 12 (padding sup.) + 30 (encabezado) + 56 (selector de
// formato) + 364 (vista previa con chevrones) + 16 (puntos) + 92
// (botones en flujo) + 10 (padding inf.) = 580 px, que cabe en 92dvh
// de una pantalla típica de 844 px (776 px) y en una chica de 700 px
// (644 px); si la pantalla es aún más chica, TODO el panel hace scroll
// como una unidad (PR #147: sin pie sticky, los botones nunca quedan en
// medio de la vista previa).

export default function ShareCardSheet({ biz, onClose, onShareLink }) {
  const dark = useUIStore((s) => s.dark);
  const toast$ = useUIStore((s) => s.toast$);
  const googleRatings = useDataStore((s) => s.googleRatings);
  const cities = useDataStore((s) => s.cities);
  const [formatId, setFormatId] = useState('story');
  const [styleId, setStyleId] = useState(SHARE_CARD_DEFAULT_STYLE);
  const [status, setStatus] = useState('idle'); // idle | generating | error
  const [error, setError] = useState('');
  const [photoFailed, setPhotoFailed] = useState(false);
  const [bizLogoFailed, setBizLogoFailed] = useState(false);
  // Con «reducir movimiento» la pista no desliza: cambia de estilo al
  // instante, como las tiras (StoryStrip).
  const [reduceMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches),
  );

  const format =
    SHARE_CARD_FORMAT_LIST.find((f) => f.id === formatId) || SHARE_CARD_FORMAT_LIST[0];
  const cityName = cities.find((c) => c.slug === biz?.city_slug)?.name || '';
  // La calificación y el conteo son los de Google (google_ratings_cache,
  // la misma fuente que las tarjetas de negocio): buildShareCardData solo
  // los pasa si displayRating trae dato de Google; si no, no hay píldora.
  const disp = displayRating(biz, googleRatings);
  const data = buildShareCardData(biz, { disp, cityName });
  // Sin foto o sin logo, la tarjeta sale sin esa parte (nunca rota):
  // el fallo de carga quita el dato y la geometría se recalcula sin él.
  let exportData = data;
  if (photoFailed) exportData = { ...exportData, photoUrl: null };
  if (bizLogoFailed) exportData = { ...exportData, bizLogoUrl: null };

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
      // El logo circular: si no se puede leer, la tarjeta sale sin
      // círculo (igual que la vista previa tras onError), nunca rota.
      if (dataToExport.bizLogoUrl) {
        const okLogo = await isPhotoFetchable(
          getThumbUrl(dataToExport.bizLogoUrl, 300, 300),
        );
        if (!okLogo) {
          setBizLogoFailed(true);
          dataToExport = { ...dataToExport, bizLogoUrl: null };
        }
      }
      // La imagen se dibuja directo en canvas (PR #143): lo que se
      // descarga es lo mismo que la vista previa, nunca en blanco.
      // El PNG es del estilo elegido en la hoja (PR #154).
      const blob = await exportShareCardPng(dataToExport, format, styleId);
      const how = await shareOrDownloadPng(blob, shareCardFileName(biz));
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

  // Estilo de la tarjeta (PR #155): dos estilos (Oscura y Clara)
  // que se cambian con chevrones ‹ › a los lados de la vista previa
  // (con envoltura 2→1 y 1→2) y puntos debajo indicando cuántas hay.
  // Los botones de formato (Historia/Post) se quedan como están.
  // PR #156: la vista previa es una PISTA deslizante con los dos
  // estilos en fila (como las tiras del #149): al cambiar de estilo la
  // pista se mueve con translateX y una transición suave de 0,5 s, en
  // vez del corte instantáneo de antes. Con 2 estilos no hay problema
  // de envoltura (ir de Clara a Oscura es volver atrás, sin barrer).
  // Los puntos siguen cambiando al instante sin transición (PR #151).
  // PR #158: ese regreso hacia atrás NO le gustó a Jonathan: al dar ›
  // en el último quiere que la pista le dé la VUELTA y empiece de
  // nuevo al inicio. La pista pasa a ser un CARRUSEL INFINITO con
  // clones (la técnica clásica): un clon del último estilo antes del
  // primero y un clon del primero después del último; al avanzar
  // desde el último la pista desliza hacia adelante hasta el clon y
  // luego se resetea a la posición real SIN transición (noAnim), sin
  // que se note el salto; al revés con ‹ desde el primero. Los puntos
  // siguen marcando el índice real, no el clon. La exportación a PNG
  // no cambia: sigue el estilo elegido.
  const styleIndex = Math.max(
    0,
    SHARE_CARD_STYLE_LIST.findIndex((s) => s.id === styleId),
  );
  const styleCount = SHARE_CARD_STYLE_LIST.length;
  // Posición en la pista con clones: 0 = clon del último, 1..n =
  // estilos reales, n+1 = clon del primero. Empieza en el estilo por
  // defecto (el primero).
  const [trackPos, setTrackPos] = useState(() => {
    const i = Math.max(
      0,
      SHARE_CARD_STYLE_LIST.findIndex((s) => s.id === SHARE_CARD_DEFAULT_STYLE),
    );
    return i + 1;
  });
  const [noAnim, setNoAnim] = useState(false);
  // Arrastre táctil en curso (null = sin arrastre): la pista sigue al
  // dedo (PR #160, mismo patrón que StoryStrip, PR #149).
  const [dragX, setDragX] = useState(null);
  const touchStart = useRef(null);
  const goStyle = (delta) => {
    // Si la pista está en un clon (reseteo pendiente, dura 0,5 s), se
    // ignora el toque: así nunca se sale del rango de la pista y el
    // reseteo silencioso no se pisa.
    if (trackPos === 0 || trackPos === styleCount + 1) return;
    const next = (styleIndex + delta + styleCount) % styleCount;
    setStyleId(SHARE_CARD_STYLE_LIST[next].id);
    if (reduceMotion) {
      setNoAnim(true);
      setTrackPos(next + 1);
      return;
    }
    setNoAnim(false);
    setTrackPos((p) => p + delta);
  };
  // Tocar un punto salta a ese estilo real (con 2 estilos siempre es
  // un paso): la pista desliza hasta su posición real, nunca a un clon.
  const goToStyle = (index) => {
    if (index === styleIndex) return;
    if (trackPos === 0 || trackPos === styleCount + 1) return;
    setStyleId(SHARE_CARD_STYLE_LIST[index].id);
    setNoAnim(reduceMotion);
    setTrackPos(index + 1);
  };
  // Swipe táctil (PR #160): deslizar con el dedo cambia de estilo,
  // como en las tiras del inicio (StoryStrip, PR #149). La pista sigue
  // al dedo (sin transición durante el arrastre) y al soltar completa
  // el cambio si el gesto supera SWIPE_MIN_PX; si no, vuelve a su
  // sitio. Funciona CON el bucle del #158: goStyle avanza o retrocede
  // desde el clon igual que el chevron, y los puntos siguen marcando
  // el índice real. touchAction pan-y: el navegador conserva el scroll
  // vertical del panel; si el gesto es claramente vertical, se cancela
  // el arrastre y el panel hace scroll. Con «reducir movimiento» la
  // pista no sigue al dedo (cambia al instante con goStyle, como el
  // chevron), pero el gesto sí se registra y cambia de estilo.
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
    // El desplazamiento del gesto vive en el ref (sirve también con
    // «reducir movimiento», donde la pista no se mueve en pantalla):
    // el estado dragX solo es el desplazamiento visual.
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
    SHARE_CARD_STYLE_LIST[styleCount - 1],
    ...SHARE_CARD_STYLE_LIST,
    SHARE_CARD_STYLE_LIST[0],
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

        {/* Chevrones para cambiar de estilo (PR #155): ‹ › a los lados
            de la vista previa, con envoltura; abajo, los puntos que
            indican cuántas hay (2 estilos). Mismo lenguaje de puntos
            que StoryStrip/Gallery: 6 px, inactivo opacidad 0.25, activo
            píldora de 16 px, SIN transición (PR #151: la transición se
            atascaba a mitad y dejaba una estela). Tocar un punto salta
            a ese estilo.
            PR #156: la vista previa es una pista deslizante con los dos
            estilos en fila: al cambiar de estilo la pista se mueve con
            translateX y una transición suave de 0,5 s (como las tiras
            del #149), en vez del corte instantáneo de antes. Los
            chevrones y los puntos van fuera de la pista, así no se
            mueven con ella.
            PR #158: los chevrones iban muy pegados a la vista previa
            (hueco de 2 px + 4 px de relleno): ahora llevan más aire
            (hueco de 14 px + 8 px de relleno a cada lado). Y la pista
            es un carrusel infinito con clones: al dar › en el último
            desliza hacia adelante hasta el clon del primero y se
            resetea en silencio, en vez de regresarse hacia atrás. */}
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
              // El gesto vertical sigue siendo scroll del panel (PR
              // #160): el swipe horizontal cambia de estilo, el
              // vertical cancela el arrastre y el panel hace scroll.
              touchAction: 'pan-y',
            }}
          >
            <div
              style={{
                display: 'flex',
                height: previewH,
                // Durante el arrastre la pista sigue al dedo (dragX);
                // al soltar, goStyle mueve la pista y la transición
                // vuelve a estar activa.
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
                    <ShareCardTemplate
                      data={exportData}
                      format={format}
                      styleId={s.id}
                      onPhotoError={() => setPhotoFailed(true)}
                      onBizLogoError={() => setBizLogoFailed(true)}
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
          {SHARE_CARD_STYLE_LIST.map((s, n) => (
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
              if (onShareLink) onShareLink(biz);
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
