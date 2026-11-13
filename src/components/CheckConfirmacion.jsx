import { useEffect, useRef, useState } from 'react';
import LottieAnim from './LottieAnim.jsx';
import { CHECK_CONFIRMACION_SRC } from '../lib/lottieAnimaciones.js';

// Check de confirmación («Processing animation with a checkmark», de
// Aswathy): gira como «procesando» y termina en la palomita. Una sola
// reproducción, en línea donde estaba el botón o el formulario (no es
// un overlay), y se desmonta solo al terminar: si el evento 'complete'
// no llega, el temporizador de seguridad lo quita a los 5 s. Va al
// confirmar asistencia a un evento (RSVP «Asistiré») y al guardar
// cambios en formularios (perfil y negocio).
export default function CheckConfirmacion({ show, size = 72, onDone }) {
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
    <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }} data-testid="check-confirmacion">
      <LottieAnim
        src={CHECK_CONFIRMACION_SRC}
        loop={false}
        autoplay
        speed={1.5}
        width={size}
        height={size}
        ariaLabel="Confirmado"
        onComplete={() => {
          setVisible(false);
          onDoneRef.current?.();
        }}
      />
    </div>
  );
}
