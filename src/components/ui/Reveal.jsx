import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "../../hooks/useCountUp.js";

// Aparición al bajar (textos de /negocios, nov 2026): fundido + subida
// suave cuando el elemento entra en pantalla, una sola vez.
//
// Solo transform/opacity: el texto ocupa su espacio final desde el
// primer render, así que no mueve el diseño ni cambia el CLS. El
// easing y la duración son los de la cascada del #138 (Animista
// fade-in-bottom), con una subida más corta (14 px) para texto.
//
// El estado oculto lo pone SOLO el JS (la clase `reveal` que añade este
// componente), nunca el CSS base: sin JS el texto se sigue viendo. En el
// primer render el elemento ya sale oculto, así que no hay flash del
// texto visible antes de animar. Con prefers-reduced-motion —o sin
// IntersectionObserver— empieza visible, sin animar.
export function Reveal({ children, delay = 0 }) {
  const ref = useRef(null);
  const [revealed, setRevealed] = useState(() => prefersReducedMotion());
  useEffect(() => {
    if (revealed) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setRevealed(true);
      return;
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setRevealed(true);
        io.disconnect();
      }
    }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, [revealed]);
  const className = revealed ? "reveal is-visible" : "reveal";
  const style = delay ? { transitionDelay: `${delay}ms` } : undefined;
  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}
