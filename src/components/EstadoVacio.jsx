import LottieAnim from './LottieAnim.jsx';
import { CUBOS_VACIOS_SRC } from '../lib/lottieAnimaciones.js';

// Estado vacío reutilizable con los cubos de LottieFiles
// («Isometric Cubes Empty State Loader», Ision Industries): bucle
// lento y discreto sobre el mensaje. El texto y el botón los pone
// quien lo usa; aquí no se inventa copy.
export default function EstadoVacio({ titulo, descripcion, accionLabel, onAccion, T, size = 120 }) {
  const text = T?.text || '#111';
  const sub = T?.sub || '#64748B';
  const border = T?.border || '#E2E8F0';
  const white = T?.white || '#fff';

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
        <LottieAnim
          src={CUBOS_VACIOS_SRC}
          loop
          speed={0.7}
          width={size}
          height={size}
          ariaLabel="Sin contenido"
        />
      </div>
      {titulo ? (
        <div style={{ fontWeight: 800, fontSize: 16, color: text }}>{titulo}</div>
      ) : null}
      {descripcion ? (
        <div style={{ fontSize: 13, color: sub, marginTop: 4 }}>{descripcion}</div>
      ) : null}
      {accionLabel && onAccion ? (
        <button
          type="button"
          onClick={onAccion}
          className="press"
          style={{
            marginTop: 16, padding: '10px 18px', borderRadius: 9999,
            border: `1px solid ${border}`, background: white, color: text,
            fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {accionLabel}
        </button>
      ) : null}
    </div>
  );
}
