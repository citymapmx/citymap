import { useEffect, useRef, useState } from "react";

// El estallido del corazón al guardar solo sale al GUARDAR: esta clave
// cambia únicamente en la transición de no-guardado a guardado. Si la
// tarjeta ya monta guardada, o al quitar, la clave no cambia y no hay
// estallido. Si no hay sesión, el guardado no se aplica (el corazón pide
// iniciar sesión) y el isFav no cambia, así que tampoco hay estallido.
export function useSaveBurst(isFav) {
  const [burstKey, setBurstKey] = useState(0);
  const prevRef = useRef(isFav);
  useEffect(() => {
    if (!prevRef.current && isFav) setBurstKey((k) => k + 1);
    prevRef.current = isFav;
  }, [isFav]);
  return burstKey;
}
