// FLIP (idea 2 de motion.dev: filtros con reorden animado). Dadas las
// posiciones anteriores y las nuevas de cada tarjeta, calcula cuánto se
// movió cada una para invertir el salto con un transform y que el cambio
// de filtro se vea como un deslizamiento, no como un brinco. Las tarjetas
// nuevas se marcan para entrar con fundido.

// prevRects/nextRects: Map<key, {left, top}>. Devuelve Map<key, {dx, dy}>
// para las que se movieron y Map<key, {enter: true}> para las nuevas.
export function computeFlipMoves(prevRects, nextRects) {
  const moves = new Map();
  nextRects.forEach((rect, key) => {
    const old = prevRects.get(key);
    if (!old) {
      moves.set(key, { enter: true });
      return;
    }
    const dx = old.left - rect.left;
    const dy = old.top - rect.top;
    if (dx !== 0 || dy !== 0) moves.set(key, { dx, dy });
  });
  return moves;
}
