import React from "react";

// Máquina de escribir compartida (buscador del inicio +
// buscador de ciudad): escribe una frase, espera unos segundos,
// la borra y sigue con la siguiente. Los "..." del final son solo
// visuales: la frase animada nunca se convierte en la búsqueda,
// así que no afectan a los resultados.
export function useTypewriter(phrases) {
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
        if (charIdx >= phrase.length) { deleting = true; timer = setTimeout(step, 3500); }
        else timer = setTimeout(step, 75);
      } else {
        charIdx -= 1;
        setText(charIdx > 0 ? phrase.slice(0, charIdx) : '');
        if (charIdx <= 0) { deleting = false; phraseIdx = (phraseIdx + 1) % phrases.length; timer = setTimeout(step, 400); }
        else timer = setTimeout(step, 30);
      }
    };
    timer = setTimeout(step, 600);
    return () => { alive = false; clearTimeout(timer); };
  }, [phrases]);
  return text;
}

// Estilo del cursor parpadeante de la máquina de escribir
// (mismo en el inicio y en el selector de ciudad).
export const TYPEWRITER_CARET_STYLE = `
  @keyframes typewriterCaretBlink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
  .typewriter-caret { color: #38BDF8; animation: typewriterCaretBlink 1s step-end infinite; }
`;
