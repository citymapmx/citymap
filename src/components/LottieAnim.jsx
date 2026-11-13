import { useCallback, useEffect, useRef, useState } from 'react';
import { DotLottieReact, setWasmUrl } from '@lottiefiles/dotlottie-react';
import dotlottieWasmUrl from '@lottiefiles/dotlottie-web/dotlottie-player.wasm?url';

// El reproductor dotLottie carga su motor WebAssembly: por defecto lo
// baja de un CDN (jsdelivr/unpkg). Aquí va empaquetado con la app
// (Vite lo emite a dist/assets con hash), sin depender de terceros.
// Se configura al importar el módulo, antes de que se cree la
// primera instancia del reproductor.
let wasmConfigurado = false;
function configurarWasm() {
  if (wasmConfigurado) return;
  try {
    if (typeof dotlottieWasmUrl === 'string' && dotlottieWasmUrl) {
      setWasmUrl(dotlottieWasmUrl);
      wasmConfigurado = true;
    }
  } catch {
    // Sin motor no hay animación: el componente se oculta solo.
  }
}
configurarWasm();

// Reproductor reutilizable de archivos .lottie: locales (public/lottie/)
// o remotos por URL https (p. ej. las animaciones del detalle del tour,
// que cargan de LottieFiles). Si el archivo no carga (o falta), no pinta
// nada roto: se oculta.
// Con `prefers-reduced-motion` no se reproduce solo.
export default function LottieAnim({
  src,
  loop = true,
  autoplay = true,
  speed = 1,
  width = 120,
  height = 120,
  className,
  style,
  ariaLabel,
  onComplete,
  testId,
}) {
  const [fallo, setFallo] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const instanciaRef = useRef(null);

  const alCompletar = useCallback(() => {
    onCompleteRef.current?.();
  }, []);
  const alErrorCarga = useCallback(() => {
    setFallo(true);
  }, []);

  const alRecibirInstancia = useCallback((instancia) => {
    if (instanciaRef.current) {
      instanciaRef.current.removeEventListener('complete', alCompletar);
      instanciaRef.current.removeEventListener('loadError', alErrorCarga);
    }
    instanciaRef.current = instancia;
    if (instancia) {
      instancia.addEventListener('complete', alCompletar);
      instancia.addEventListener('loadError', alErrorCarga);
    }
  }, [alCompletar, alErrorCarga]);

  useEffect(() => () => {
    if (instanciaRef.current) {
      instanciaRef.current.removeEventListener('complete', alCompletar);
      instanciaRef.current.removeEventListener('loadError', alErrorCarga);
      instanciaRef.current = null;
    }
  }, [alCompletar, alErrorCarga]);

  const [movimientoReducido] = useState(() => (
    typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ));

  if (fallo || !src) return null;

  return (
    <div
      className={className}
      style={{ width, height, lineHeight: 0, ...style }}
      data-testid={testId}
      aria-hidden={ariaLabel ? undefined : true}
    >
      <DotLottieReact
        src={src}
        loop={loop}
        autoplay={autoplay && !movimientoReducido}
        speed={speed}
        dotLottieRefCallback={alRecibirInstancia}
        style={{ width: '100%', height: '100%' }}
        aria-label={ariaLabel}
      />
    </div>
  );
}
