import { useEffect, useRef, useState } from 'react';
import LottieAnim from './LottieAnim.jsx';
import { CONFETTI_LOGRO_SRC } from '../lib/lottieAnimaciones.js';

// Confeti de logro («Confetti on transparent background», Sportbank
// Design): una sola reproducción como capa de pantalla completa con
// fondo transparente. No bloquea la interacción (pointerEvents none)
// y se desmonta solo al terminar: si el evento 'complete' no llega,
// el temporizador de seguridad lo quita a los 5 s. Solo se usa al
// completar la tarjeta de lealtad y al canjear un premio (ScanView).
export default function ConfettiLogro({ show, onDone }) {
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
      style={{ position: 'fixed', inset: 0, zIndex: 200000, pointerEvents: 'none' }}
    >
      <LottieAnim
        src={CONFETTI_LOGRO_SRC}
        loop={false}
        autoplay
        speed={1}
        width="100%"
        height="100%"
        ariaLabel="Celebración"
        onComplete={() => {
          setVisible(false);
          onDoneRef.current?.();
        }}
      />
    </div>
  );
}
