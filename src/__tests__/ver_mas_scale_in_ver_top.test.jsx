import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// Contenido nuevo de "Ver más" con scale-in-ver-top de Animista (ejemplo 5
// de la demo de 10 animaciones, elegido por Jonathan, nov 2026): al
// presionar "Ver más" el lote nuevo se desenrolla desde arriba (scaleY
// 0 → 1 con origen arriba, 0.5 s, easeOutQuad, sin fade) en vez de
// aparecer de golpe y que la pantalla salte. Lo mismo para la lista de
// estados al expandir un país en el selector de ciudad.
describe('ver mas: scale-in-ver-top entrance on the new batch', () => {
  const css = read('../index.css');
  const home = read('../views/HomeView.jsx');
  const events = read('../views/EventsView.jsx');
  const grids = read('../components/home/HomeTopGrids.jsx');
  const trips = read('../components/TripsView.jsx');
  const picker = read('../components/CountryPickerDropdown.jsx');

  it('defines the exact Animista scale-in-ver-top keyframes in index.css', () => {
    expect(css).toContain('@keyframes scale-in-ver-top');
    expect(css).toContain('.scale-in-ver-top');
    const keyframes = css.slice(css.indexOf('@keyframes scale-in-ver-top'));
    expect(keyframes).toContain('transform: scaleY(0)');
    expect(keyframes).toContain('transform: scaleY(1)');
    expect(keyframes).toContain('transform-origin: 100% 0%');
    expect(keyframes).toContain('opacity: 1');
    expect(css).toContain('animation: scale-in-ver-top 0.5s cubic-bezier(0.250, 0.460, 0.450, 0.940) both');
  });

  it('disables scale-in-ver-top with prefers-reduced-motion', () => {
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reduced).toContain('.scale-in-ver-top');
    expect(reduced).toContain('animation: none');
  });

  it('HomeView: only the newly loaded category batch gets the class (Virtuoso)', () => {
    expect(home).toContain('const [newBatchFrom, setNewBatchFrom] = React.useState(null)');
    expect(home).toContain("setNewBatchFrom(finalDisplayList.length)");
    expect(home).toContain("index >= newBatchFrom ? 'scale-in-ver-top' : undefined");
    // La marca se limpia 600 ms después de que el lote llega.
    expect(home).toContain('window.setTimeout(() => setNewBatchFrom(null), 600)');
  });

  it('HomeView: the search results "Ver más" uses the same batch marker', () => {
    expect(home).toContain('setNewBatchFrom(displayList.length)');
  });

  it('EventsView: the new batch gets the class on an inner wrapper, never on the FLIP article', () => {
    expect(events).toContain('const [newBatchFrom, setNewBatchFrom] = useState(null)');
    expect(events).toContain('setNewBatchFrom(visibleCount)');
    expect(events).toContain("newBatchIds?.has(ev.id) ? 'scale-in-ver-top' : undefined");
    // El <article> con registerFlip no lleva la clase: FLIP escribe
    // transform inline ahí y la animación con fill both lo taparía.
    const articleTag = events.slice(events.indexOf('<article key={ev.id}'));
    expect(articleTag.slice(0, articleTag.indexOf('>'))).not.toContain('scale-in-ver-top');
    // El scroll suave del PR #132 sigue intacto.
    expect(events).toContain("pendingEventScrollRef.current = filteredEvents[visibleCount]?.id");
    expect(events).toContain("smoothScrollIntoView(el, 'nearest')");
  });

  it('EventsView: newBatchIds is declared AFTER filteredEvents (no TDZ crash)', () => {
    // Regresión del PR #137: en el PR #136 el useMemo de newBatchIds vivía
    // antes que el const de filteredEvents y lo leía en su arreglo de
    // dependencias → ReferenceError al montar → "Algo salió mal" en /eventos.
    const filteredAt = events.indexOf('const filteredEvents = useMemo');
    const batchAt = events.indexOf('const newBatchIds = useMemo');
    expect(filteredAt).toBeGreaterThan(-1);
    expect(batchAt).toBeGreaterThan(-1);
    expect(batchAt).toBeGreaterThan(filteredAt);
  });

  it('HomeTopGrids: only the 5 new cards of each "Ver 5 más" get the class, on an inner wrapper', () => {
    expect(grids).toContain("freshFavs && index >= 5 ? 'scale-in-ver-top' : undefined");
    expect(grids).toContain("freshRated && index >= 5 ? 'scale-in-ver-top' : undefined");
    // El div de FLIP (registerRated) no lleva la clase.
    const flipDiv = grids.slice(grids.indexOf('registerRated(b.id)(el)'));
    expect(flipDiv.slice(0, flipDiv.indexOf('>'))).not.toContain('scale-in-ver-top');
    // El scroll suave a la 6ª tarjeta sigue intacto.
    expect(grids).toContain("smoothScrollIntoView(firstNewFavRef.current, 'nearest')");
    expect(grids).toContain("smoothScrollIntoView(firstNewRatedRef.current, 'nearest')");
  });

  it('TripsView: only the newly loaded articles get the class', () => {
    expect(trips).toContain('const [newBatchFrom, setNewBatchFrom] = useState(null)');
    expect(trips).toContain('setNewBatchFrom(visibleCount)');
    expect(trips).toContain("idx >= newBatchFrom ? 'scale-in-ver-top' : undefined");
  });

  it('CountryPickerDropdown: the expanded country states list gets the class', () => {
    expect(picker).toContain('<div className="scale-in-ver-top" style={{ padding: "0 0 4px 12px"');
    expect(picker).toContain('<div className="scale-in-ver-top" style={{ display: "flex", flexDirection: "column" }}>');
    // La animación propia del panel lateral (spring x:'100%'→0) sigue intacta.
    expect(picker).toContain("initial={isWelcome ? { opacity: 0, scale: 0.95 } : { x: '100%' }}");
  });
});
