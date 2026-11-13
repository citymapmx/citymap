import { useEffect, useRef, useState } from 'react';
import LottieAnim from './LottieAnim.jsx';
import { TROFEO_LOGRO_SRC } from '../lib/lottieAnimaciones.js';

// Trofeo de logro («trophy», Gift chuks): una sola reproducción,
// centrado en pantalla, por encima del confeti (zIndex mayor) y sin
// bloquear la interacción (pointerEvents none). Se desmonta solo al
// terminar: si el evento 'complete' no llega, el temporizador de
// seguridad lo quita a los 5 s. Va junto al confeti en ScanView
// (completar la tarjeta / canjear el premio) y cuando se completa una
// colección en Mis Favoritos (ahí lleva el mensaje).
export default function TrofeoLogro({ show, mensaje, onDone }) {
  const [visible, setVisible] = useState(show);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!show) {
      setVisible(false);
      return undefined;
    }
    setVisible(true);
    const t = setTimeout(() => {
      setVisible(false);
      onDoneRef.current?.();
    }, 5000);
    return () => clearTimeout(t);
  }, [show]);

  if (!show || !visible) return null;

  return (
    <div
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, zIndex: 200001, pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
    >
      <LottieAnim
        src={TROFEO_LOGRO_SRC}
        loop={false}
        autoplay
        speed={1}
        width={160}
        height={160}
        ariaLabel="Logro"
        onComplete={() => {
          setVisible(false);
          onDoneRef.current?.();
        }}
      />
      {mensaje ? (
        <div style={{ marginTop: 8, fontSize: 18, fontWeight: 900, color: '#111', background: '#fff', borderRadius: 999, padding: '8px 18px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
          {mensaje}
        </div>
      ) : null}
    </div>
  );
}
