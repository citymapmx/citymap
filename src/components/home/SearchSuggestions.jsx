import { useState } from 'react';
import Icon from '../ui/Icon.jsx';
import { getKm, getThumbUrl } from '../../lib/utils.js';

function PlaceThumbnail({ business, T }) {
  const [failed, setFailed] = useState(false);
  const photo = Array.isArray(business.photos) ? business.photos[0] : null;
  const source = (typeof photo === 'string' ? photo : photo?.url) || business.logo_url || business.banner_url;
  return <span aria-hidden="true" style={{ width: 46, height: 46, flexShrink: 0, borderRadius: 10, overflow: 'hidden', background: T.card, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${T.border}`, fontSize: 19, fontWeight: 800 }}>
    {source && !failed ? <img src={getThumbUrl(source, 100, 100, 'cover')} alt="" width={46} height={46} loading="lazy" decoding="async" onError={() => setFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : (business.emoji || business.name?.trim()?.[0] || '★')}
  </span>;
}

export default function SearchSuggestions({ results, cats = [], userCoords, onSelect, onViewAll, T }) {
  return <div aria-label="Sugerencias de lugares" style={{ border: `1px solid ${T.border}`, borderRadius: 16, overflow: 'hidden', background: T.white }}>
    {results.slice(0, 5).map(business => {
      const category = cats.find(cat => cat.id === business.category)?.label || business.category || business.type || 'Lugar';
      const coordinates = [userCoords?.lat, userCoords?.lng, business.lat, business.lng];
      const hasCoordinates = coordinates.every(value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) && Number(value) !== 0);
      const distance = hasCoordinates ? getKm(...coordinates.map(Number)) : null;
      const distanceLabel = distance === null ? '' : distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`;
      return <button key={business.id} type="button" onClick={() => onSelect(business)}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', width: '100%', background: 'transparent', border: 0, borderBottom: `1px solid ${T.border}`, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', color: T.text }}>
        <PlaceThumbnail key={business.id} business={business} T={T} />
        <span style={{ flex: 1, minWidth: 0 }}><strong style={{ display: 'block', fontSize: 15, lineHeight: 1.4, overflowWrap: 'anywhere' }}>{business.name}</strong><span style={{ display: 'block', fontSize: 13, lineHeight: 1.5, color: T.sub }}>{category}{distanceLabel ? ` · ${distanceLabel}` : ''}</span></span>
        <Icon name="chevron" size={16} color={T.sub} />
      </button>;
    })}
    <button type="button" onClick={onViewAll} style={{ width: '100%', minHeight: 46, padding: '12px 16px', border: 0, background: 'transparent', color: T.text, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Ver todos los resultados →</button>
  </div>;
}
