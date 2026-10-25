import Icon from './Icon.jsx';
import { useUIStore } from '../../store/useUIStore.js';
import { getT } from '../../lib/constants.js';

export default function StarRow({ n, size = 13, color }) {
  const T = getT(useUIStore(state => state.dark));
  const rating = Math.max(0, Math.min(5, Number(n) || 0));
  return <span role="img" aria-label={`${rating} de 5 estrellas`} style={{ display: 'inline-flex', gap: 2 }}>
    {[1, 2, 3, 4, 5].map(i => <Icon key={i} name={i <= Math.round(rating) ? 'star_f' : 'star'} size={size} color={i <= Math.round(rating) ? (color || T.text) : T.sub} />)}
  </span>;
}
