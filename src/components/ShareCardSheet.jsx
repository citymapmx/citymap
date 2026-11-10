// Hoja para compartir el negocio como imagen (PR #142, v1).
// Al presionar Compartir se genera un PNG con la foto y los datos del
// negocio, listo para Instagram/Facebook. v1: UN estilo oscuro, dos
// formatos (Historia IG 1080×1920, Post IG 1080×1080). El botón de
// compartir de la ficha abre esta hoja; el «Compartir enlace» de abajo
// conserva el comportamiento anterior (compartir la liga del negocio).
// En web NO se puede publicar directo a Instagram: la hoja comparte la
// imagen con el menú del sistema o la descarga, nunca promete publicarla.
import React, { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { m } from 'framer-motion';
import { useDataStore } from '../store/useDataStore.js';
import { useUIStore } from '../store/useUIStore.js';
import { displayRating } from '../lib/googleRatings.js';
import ShareCardTemplate from './ShareCardTemplate.jsx';
import {
  SHARE_CARD_FORMAT_LIST,
  buildShareCardData,
  canShareImageFiles,
  exportShareCardPng,
  isPhotoFetchable,
  shareCardFileName,
  shareOrDownloadPng,
} from '../lib/shareCard.js';

const PREVIEW_W = 300;

export default function ShareCardSheet({ biz, onClose, onShareLink }) {
  const dark = useUIStore((s) => s.dark);
  const toast$ = useUIStore((s) => s.toast$);
  const googleRatings = useDataStore((s) => s.googleRatings);
  const cities = useDataStore((s) => s.cities);
  const [formatId, setFormatId] = useState('story');
  const [status, setStatus] = useState('idle'); // idle | generating | error
  const [error, setError] = useState('');
  const [photoFailed, setPhotoFailed] = useState(false);
  const exportRef = useRef(null);

  const format =
    SHARE_CARD_FORMAT_LIST.find((f) => f.id === formatId) || SHARE_CARD_FORMAT_LIST[0];
  const cityName = cities.find((c) => c.slug === biz?.city_slug)?.name || '';
  const rating = displayRating(biz, googleRatings).rating;
  const data = buildShareCardData(biz, { rating, cityName });
  const exportData = photoFailed ? { ...data, photoUrl: null } : data;

  const onExport = async () => {
    if (status === 'generating') return;
    setError('');
    setStatus('generating');
    try {
      const node = exportRef.current;
      if (!node) throw new Error('no-node');
      // Si la foto no se puede leer con CORS, la tarjeta sale sin foto
      // (nunca rota): se quita y se exporta el resto.
      if (exportData.photoUrl) {
        const ok = await isPhotoFetchable(exportData.photoUrl);
        if (!ok) flushSync(() => setPhotoFailed(true));
      }
      const blob = await exportShareCardPng(exportRef.current);
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
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <m.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          background: dark ? '#232326' : '#FFFFFF',
          width: '100%',
          maxWidth: 600,
          borderRadius: '24px 24px 0 0',
          padding: '16px 20px calc(20px + env(safe-area-inset-bottom, 0px))',
          boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
          maxHeight: '92dvh',
          overflowY: 'auto',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            background: dark ? '#3F3F46' : '#E4E4E7',
            margin: '0 auto 16px',
          }}
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 4,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 20,
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
              padding: 8,
            }}
          >
            ×
          </button>
        </div>
        <p
          style={{
            margin: '0 0 16px 0',
            fontSize: 13,
            color: dark ? '#A1A1AA' : '#71717A',
            lineHeight: 1.5,
          }}
        >
          Una imagen con la foto y los datos del negocio, lista para Instagram.
        </p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {SHARE_CARD_FORMAT_LIST.map((f) => (
            <button
              key={f.id}
              onClick={() => setFormatId(f.id)}
              className="press"
              style={{
                flex: 1,
                padding: '12px 8px',
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

        <div
          style={{
            width: PREVIEW_W,
            height: previewH,
            margin: '0 auto 16px',
            borderRadius: 20,
            overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
            background: '#0B0B0B',
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
              onPhotoError={() => setPhotoFailed(true)}
            />
          </div>
        </div>

        {photoFailed ? (
          <p style={{ margin: '0 0 12px 0', fontSize: 12, color: '#B45309', textAlign: 'center' }}>
            La foto no se pudo cargar: la tarjeta se genera sin foto.
          </p>
        ) : null}
        {status === 'error' && error ? (
          <p style={{ margin: '0 0 12px 0', fontSize: 13, color: '#DC2626', textAlign: 'center' }}>
            {error}
          </p>
        ) : null}

        <button
          onClick={onExport}
          disabled={status === 'generating'}
          className="press"
          style={{
            width: '100%',
            padding: 16,
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
            padding: 14,
            marginTop: 8,
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
      </m.div>

      {/* Nodo de exportación: la plantilla a tamaño exacto, fuera de
          pantalla pero renderizada (display:none no sirve para
          html-to-image). No toca el layout ni se ve. */}
      <div
        ref={exportRef}
        aria-hidden="true"
        style={{ position: 'fixed', left: -10000, top: 0, pointerEvents: 'none' }}
      >
        <ShareCardTemplate
          data={exportData}
          format={format}
          onPhotoError={() => setPhotoFailed(true)}
        />
      </div>
    </div>
  );
}
