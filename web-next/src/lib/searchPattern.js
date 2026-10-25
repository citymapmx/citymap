// Bounded candidate pattern: one small typo in the first six letters.
// The existing local matcher checks the complete query before displaying rows.
export function searchCandidatePattern(query) {
  const words = String(query || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/[a-z0-9]+/g) || [];
  const word = words.sort((a, b) => b.length - a.length)[0]?.slice(0, 6);
  if (!word) return '';
  const accents = { a: '[aáàäâãå]', e: '[eéèëê]', i: '[iíìïî]', o: '[oóòöôõ]', u: '[uúùüû]', n: '[nñ]', c: '[cç]' };
  const chars = [...word].map(char => accents[char] || char);
  const patterns = new Set([chars.join('')]);
  if (word.length >= 4) {
    for (let i = 0; i < chars.length; i++) {
      patterns.add([...chars.slice(0, i), '.', ...chars.slice(i)].join(''));
      patterns.add([...chars.slice(0, i), '.', ...chars.slice(i + 1)].join(''));
      patterns.add([...chars.slice(0, i), ...chars.slice(i + 1)].join(''));
      if (i + 1 < chars.length) patterns.add([...chars.slice(0, i), chars[i + 1], chars[i], ...chars.slice(i + 2)].join(''));
    }
  }
  return `(^|[^[:alnum:]_])(${[...patterns].join('|')})`;
}
