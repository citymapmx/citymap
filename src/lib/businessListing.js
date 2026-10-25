export function orderBusinessIds(rows, date = new Date()) {
  const seed = date.getFullYear() + date.getMonth() * 31 + date.getDate();
  const weight = plan => plan === 'premium' ? 3 : plan === 'destacado' ? 2 : 1;
  const rank = b => { const number = Math.sin(seed + (b.name || '').charCodeAt(0)) * 10000; return number - Math.floor(number); };
  return [...rows].sort((a, b) => weight(b.plan) - weight(a.plan) || rank(a) - rank(b) || String(a.id).localeCompare(String(b.id))).map(b => b.id);
}

export function appendBusinessIds(previous, incoming) {
  return [...new Set([...previous, ...incoming])];
}

// A cached city subset or a different query must never count as a completed category.
export function getBusinessQueryState(query, key, filtered) {
  if (!filtered) return 'ready';
  return query.key === key ? query.status : 'loading';
}
