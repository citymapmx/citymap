'use client';

import { useState, useCallback, useEffect } from 'react';
import GMap, { CAT_EMOJI, getThumbUrl } from './GMap';
import Link from 'next/link';

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dpkjxhjkzdlkvyotoeai.supabase.co";
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwa2p4aGpremRsa3Z5b3RvZWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MzYzNTAsImV4cCI6MjA5NjAxMjM1MH0.R6ZoNQHKP-DDA4F8phgolf82AEOTII-mLUlWc3DWHyE";

export default function MapWrapper({ citySlug }) {
  const [businesses, setBusinesses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Categorías de filtro rápido (simplificado para Next.js)
  const [activeCat, setActiveCat] = useState('');
  
  const fetchPins = useCallback(async (bounds) => {
    if (!bounds || !citySlug) return;
    setLoading(true);
    try {
      // Pedimos pines por Bounding Box al API REST de Supabase
      const url = `${SB_URL}/rest/v1/businesses?city_slug=eq.${citySlug}&active=eq.true&hide_location=eq.false` +
                  `&lat=gte.${bounds.minLat}&lat=lte.${bounds.maxLat}` +
                  `&lng=gte.${bounds.minLng}&lng=lte.${bounds.maxLng}` +
                  `&select=id,name,lat,lng,category,emoji,logo_url,slug,is_place` +
                  `&limit=200`;
                  
      const res = await fetch(url, {
        headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, Prefer: 'return=minimal' }
      });
      const data = await res.json();
      
      // Mezclamos pines nuevos sin duplicar los existentes
      setBusinesses(prev => {
        const map = new Map(prev.map(b => [b.id, b]));
        (Array.isArray(data) ? data : []).forEach(b => map.set(b.id, b));
        return Array.from(map.values());
      });
    } catch (e) {
      console.error("Error cargando pines:", e);
    } finally {
      setLoading(false);
    }
  }, [citySlug]);

  const handleMarkerClick = useCallback((biz) => {
    setSelected(biz);
  }, []);

  // Quick categories
  const filters = [
    { id: '', label: 'Todos' },
    { id: 'restaurantes', label: 'Restaurantes', emoji: '🍽️' },
    { id: 'cafe', label: 'Cafés', emoji: '☕' },
    { id: 'bares', label: 'Bares', emoji: '🍻' },
    { id: 'compras', label: 'Compras', emoji: '🛍️' }
  ];

  const visibleBusinesses = activeCat ? businesses.filter(b => b.category === activeCat) : businesses;

  return (
    <div style={{ position: 'relative', width: '100%', height: 'calc(100vh - 60px)', background: '#F2F4F2', overflow: 'hidden' }}>
      
      {/* Top Filter Bar */}
      <div style={{
        position: 'absolute', top: 16, left: 16, right: 16, zIndex: 10,
        display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 10,
        scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch'
      }}>
        {filters.map(f => (
          <button 
            key={f.id} 
            onClick={() => { setActiveCat(f.id); setSelected(null); }}
            style={{
              padding: '10px 16px', background: activeCat === f.id ? '#1A7A5E' : '#fff',
              color: activeCat === f.id ? '#fff' : '#111', border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: 99, fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)', cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            {f.emoji && <span style={{ marginRight: 6 }}>{f.emoji}</span>}
            {f.label}
          </button>
        ))}
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div style={{ position: 'absolute', top: 70, left: '50%', transform: 'translateX(-50%)', zIndex: 10, background: '#111', color: '#fff', padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, opacity: 0.8 }}>
          Buscando...
        </div>
      )}

      {/* Map Component */}
      <GMap 
        businesses={visibleBusinesses} 
        onBoundsChanged={fetchPins}
        onMarkerClick={handleMarkerClick}
        selected={selected}
      />

      {/* Bottom Sheet Card for Selected Business */}
      <div style={{
        position: 'absolute', bottom: selected ? 90 : -200, left: 16, right: 16, zIndex: 20,
        transition: 'bottom 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        background: '#fff', borderRadius: 20, padding: 16, boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
      }}>
        {selected && (
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: 14, background: '#f1f5f9', flexShrink: 0, overflow: 'hidden' }}>
              {selected.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={getThumbUrl(selected.logo_url, 150, 150)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                  {selected.emoji || CAT_EMOJI[selected.category] || "📍"}
                </div>
              )}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#1A7A5E', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                {selected.category || 'Negocio'}
              </div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#111' }}>
                {selected.name}
              </h3>
            </div>
            <Link 
              href={`/${citySlug}/${selected.slug}`}
              prefetch={true}
              style={{
                background: '#f1f5f9', color: '#111', width: 44, height: 44, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none',
                flexShrink: 0
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </Link>
          </div>
        )}
      </div>

    </div>
  );
}
