export default function StarRow({ n, size = 13 }) {
  return <span style={{ display: "inline-flex", gap: 2 }}>{[1, 2, 3, 4, 5].map(i => <img key={i} src="/estrella.svg" alt="star" width={size} height={size} loading="lazy" style={{ width: size, height: size, filter: i <= Math.round(n) ? "none" : "grayscale(1) opacity(0.3)" }} />)}</span>;
}