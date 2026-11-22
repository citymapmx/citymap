import React from "react";

// Máquina de escribir compartida (buscador del inicio +
// buscador de ciudad): escribe una frase, espera unos segundos,
// la borra y sigue con la siguiente. Los "..." del final son solo
// visuales: la frase animada nunca se convierte en la búsqueda,
// así que no afectan a los resultados.
// Tiempos por defecto = los del inicio. El selector de ciudad
// pasa los suyos (más rápido, 22 nov 2026).
export function useTypewriter(phrases, options = {}) {
  const {
    typeMs = 75,
    pauseMs = 3500,
    deleteMs = 30,
    gapMs = 400,
    startMs = 600,
  } = options;
  const [text, setText] = React.useState('');
  React.useEffect(() => {
    let phraseIdx = 0;
    let charIdx = 0;
    let deleting = false;
    let timer = null;
    let alive = true;
    const step = () => {
      if (!alive) return;
      const phrase = phrases[phraseIdx % phrases.length];
      if (!deleting) {
        charIdx += 1;
        setText(phrase.slice(0, charIdx));
        if (charIdx >= phrase.length) { deleting = true; timer = setTimeout(step, pauseMs); }
        else timer = setTimeout(step, typeMs);
      } else {
        charIdx -= 1;
        setText(charIdx > 0 ? phrase.slice(0, charIdx) : '');
        if (charIdx <= 0) { deleting = false; phraseIdx = (phraseIdx + 1) % phrases.length; timer = setTimeout(step, gapMs); }
        else timer = setTimeout(step, deleteMs);
      }
    };
    timer = setTimeout(step, startMs);
    return () => { alive = false; clearTimeout(timer); };
  }, [phrases, typeMs, pauseMs, deleteMs, gapMs, startMs]);
  return text;
}

// Estilo del cursor parpadeante de la máquina de escribir
// (mismo en el inicio y en el selector de ciudad).
export const TYPEWRITER_CARET_STYLE = `
  @keyframes typewriterCaretBlink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
  .typewriter-caret { color: #38BDF8; animation: typewriterCaretBlink 1s step-end infinite; }
`;
