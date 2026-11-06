import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useDataStore } from '../store/useDataStore.js';
import { sb } from '../lib/supabase.js';
import { createSlug } from '../lib/utils.js';
import BusinessCard from '../components/cards/BusinessCard.jsx';
import OptimizedImage from '../components/ui/OptimizedImage.jsx';
import Footer from '../components/Footer.jsx';

const BIZ_PAGE = 60;
const BIZ_STEP = 20;

// Mezcla round-robin por ciudad: toma un negocio de cada ciudad por vuelta,
// para que ninguna ciudad acapare el muro. Sin duplicados (por id).
function interleaveByCity(list) {
  const byCity = new Map();
  const order = [];
  list.forEach((b) => {
    const key = b.city_slug || 'sin-ciudad';
    if (!byCity.has(key)) { byCity.set(key, []); order.push(key); }
    byCity.get(key).push(b);
  });
  const out = [];
  const seen = new Set();
  let idx = 0;
  let added = true;
  while (added) {
    added = false;
    for (const key of order) {
      const row = byCity.get(key)[idx];
      if (row && !seen.has(row.id)) { seen.add(row.id); out.push(row); added = true; }
    }
    idx += 1;
  }
  return out;
}

function parseGallery(exp) {
  if (Array.isArray(exp.gallery)) return exp.gallery;
  if (typeof exp.gallery === 'string') {
    try { const g = JSON.parse(exp.gallery); return Array.isArray(g) ? g : []; } catch { return []; }
  }
  return [];
}

export default function GlobalHomeView() {
  const { T, dark, handleCardTap, handleEventTap, navigate, favIds, toggleFav, globalFavCounts } = useAppContext();
  const cities = useDataStore((s) => s.cities);
  const [biz, setBiz] = useState([]);
  const [bizOffset, setBizOffset] = useState(0);
  const [hasMoreBiz, setHasMoreBiz] = useState(true);
  const [visibleBiz, setVisibleBiz] = useState(BIZ_STEP);
  const [events, setEvents] = useState([]);
  const [experiences, setExperiences] = useState([]);
  const [allCities, setAllCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState('todas');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const [bizRes, evRes, exRes, citiesRes] = await Promise.all([
          sb.get('businesses', `?select=id,name,slug,category,emoji,logo_url,banner_url,photos,rating,review_count,city_slug,status,address,is_place,type,tagline,plan,created_at&status=eq.approved&plan=neq.menu&order=plan.desc,rating.desc.nullslast,id.desc&limit=${BIZ_PAGE}&offset=0`).catch(() => []),
          sb.get('events', `?select=id,title,slug,date,end_date,venue_name,city_slug,img_url,img,status&status=eq.approved&order=date.asc&limit=60`).catch(() => []),
          sb.get('experiences', `?select=id,title,city_slug,price,duration,people,gallery,created_at&status=eq.approved&order=created_at.desc&limit=12`).catch(() => []),
          (cities && cities.length > 0)
            ? Promise.resolve(cities)
            : sb.get('cities', '?active=eq.true&select=id,name,slug,state,country,country_code,bg_image&order=name.asc').catch(() => []),
        ]);
        if (cancelled) return;
        const bizRows = Array.isArray(bizRes) ? bizRes : [];
        setBiz(bizRows);
        setBizOffset(bizRows.length);
        setHasMoreBiz(bizRows.length === BIZ_PAGE);
        const evRows = (Array.isArray(evRes) ? evRes : []).filter((ev) => {
          if (!ev || !ev.date) return false;
          if (ev.end_date) return ev.end_date >= todayStr;
          return ev.date >= todayStr;
        });
        setEvents(evRows.slice(0, 12));
        setExperiences(Array.isArray(exRes) ? exRes : []);
        setAllCities(Array.isArray(citiesRes) ? citiesRes : []);
      } catch (e) {
        console.warn('Error cargando muro global', e);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const cityBySlug = useMemo(() => {
    const map = new Map();
    (allCities || []).forEach((c) => map.set(c.slug, c));
    return map;
  }, [allCities]);

  const mixedBiz = useMemo(() => interleaveByCity(biz), [biz]);

  const categories = useMemo(() => {
    const counts = new Map();
    mixedBiz.forEach((b) => {
      const c = (b.category || 'otros').toLowerCase();
      counts.set(c, (counts.get(c) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count }));
  }, [mixedBiz]);

  const filteredBiz = useMemo(() => {
    const q = query.trim().toLowerCase();
    return mixedBiz.filter((b) => {
      if (activeCat !== 'todas' && (b.category || 'otros').toLowerCase() !== activeCat) return false;
      if (!q) return true;
      const cityName = cityBySlug.get(b.city_slug)?.name || '';
      return [b.name, b.category, b.tagline, b.type, cityName].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [mixedBiz, query, activeCat, cityBySlug]);

  const shownBiz = filteredBiz.slice(0, visibleBiz);
  const filtering = query.trim() !== '' || activeCat !== 'todas';

  const loadMoreBiz = async () => {
    if (filtering) { setVisibleBiz((v) => v + BIZ_STEP); return; }
    if (visibleBiz < mixedBiz.length) { setVisibleBiz((v) => v + BIZ_STEP); return; }
    if (!hasMoreBiz || loadingMore) return;
    setLoadingMore(true);
    try {
      const rows = await sb.get('businesses', `?select=id,name,slug,category,emoji,logo_url,banner_url,photos,rating,review_count,city_slug,status,address,is_place,type,tagline,plan,created_at&status=eq.approved&plan=neq.menu&order=plan.desc,rating.desc.nullslast,id.desc&limit=${BIZ_PAGE}&offset=${bizOffset}`);
      const list = Array.isArray(rows) ? rows : [];
      setBiz((prev) => {
        const ids = new Set(prev.map((b) => b.id));
        return [...prev, ...list.filter((b) => !ids.has(b.id))];
      });
      setBizOffset((o) => o + list.length);
      setHasMoreBiz(list.length === BIZ_PAGE);
      setVisibleBiz((v) => v + BIZ_STEP);
    } catch (e) {
      console.warn('Error cargando más negocios', e);
    } finally {
      setLoadingMore(false);
    }
  };

  const fmtDate = (d) => {
    try {
      return new Date(`${d}T12:00:00`).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
    } catch { return d; }
  };

  return (
    <div style={{ background: dark ? 'transparent' : T.bg, minHeight: '100vh', paddingBottom: 90 }} data-city-home="global">
      {/* Hero global */}
      <div style={{ background: 'linear-gradient(135deg, #0f4c35 0%, #1A7A5E 60%, #22a876 100%)', padding: '44px 20px 36px', textAlign: 'center', color: '#fff' }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🗺️</div>
        <h1 style={{ fontSize: 30, fontWeight: 900, margin: '0 0 10px', letterSpacing: '-0.5px', lineHeight: 1.15 }}>
          Descubre todo CityMap
        </h1>
        <p style={{ fontSize: 15, opacity: 0.9, margin: '0 auto 22px', maxWidth: 460, lineHeight: 1.5 }}>
          Negocios, lugares y eventos de todas las ciudades, en un solo lugar.
        </p>
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setVisibleBiz(BIZ_STEP); }}
          placeholder="Buscar restaurantes, eventos, lugares..."
          aria-label="Buscar en CityMap"
          style={{ width: '100%', maxWidth: 560, padding: '14px 20px', border: 'none', borderRadius: 100, color: '#111', fontSize: 15, fontWeight: 600, outline: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
        />
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 16px 0' }}>
        {loading && (
          <p style={{ color: T.sub, textAlign: 'center', padding: '32px 0' }}>Cargando lo mejor de todas las ciudades...</p>
        )}
        {error && !loading && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <p style={{ color: T.sub }}>No pudimos cargar el contenido global.</p>
            <button onClick={() => window.location.reload()} style={{ marginTop: 12, padding: '11px 22px', borderRadius: 999, border: 0, background: '#1A7A5E', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Reintentar</button>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Explora por ciudad */}
            {allCities.length > 0 && (
              <section style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: T.text, margin: '8px 0 14px' }}>Explora por ciudad</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
                  {allCities.map((city) => (
                    <button
                      key={city.id || city.slug}
                      onClick={() => navigate(`/${city.slug}`)}
                      style={{ display: 'block', textAlign: 'left', borderRadius: 16, overflow: 'hidden', border: `1px solid ${T.border}`, padding: 0, background: dark ? '#1e1e1e' : '#fff', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
                    >
                      <div style={{ position: 'relative', width: '100%', height: 84, background: '#1A7A5E' }}>
                        {city.bg_image && <img src={city.bg_image} alt={city.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent)' }} />
                      </div>
                      <div style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 800, fontSize: 14, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{city.name}</div>
                        <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>{city.state || ''}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Próximos eventos */}
            {events.length > 0 && (
              <section style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: T.text, margin: '0 0 14px' }}>Próximos eventos</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
                  {events.map((ev) => {
                    const img = ev.img_url || ev.img;
                    const cityName = cityBySlug.get(ev.city_slug)?.name || '';
                    return (
                      <button
                        key={ev.id}
                        onClick={() => handleEventTap(ev)}
                        style={{ display: 'block', textAlign: 'left', borderRadius: 16, overflow: 'hidden', border: `1px solid ${T.border}`, padding: 0, background: dark ? '#1e1e1e' : '#fff', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
                      >
                        {img
                          ? <OptimizedImage src={img} alt={ev.title || 'Evento'} widthRequest={600} style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block' }} />
                          : <div style={{ width: '100%', height: 130, background: 'linear-gradient(135deg,#1A7A5E,#22a876)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34 }}>🎟️</div>}
                        <div style={{ padding: '12px 14px' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#1A7A5E' }}>{fmtDate(ev.date)}{cityName ? ` · ${cityName}` : ''}</div>
                          <div style={{ fontWeight: 700, fontSize: 15, color: T.text, lineHeight: 1.35, marginTop: 4 }}>{ev.title || 'Evento'}</div>
                          {ev.venue_name && <div style={{ fontSize: 12, color: T.sub, marginTop: 4 }}>{ev.venue_name}</div>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Negocios de todas las ciudades */}
            <section style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: T.text, margin: '0 0 4px' }}>Negocios y lugares</h2>
              <p style={{ fontSize: 13, color: T.sub, margin: '0 0 14px' }}>De todas las ciudades, mezclados para que descubras algo nuevo.</p>
              {categories.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                  <button onClick={() => { setActiveCat('todas'); setVisibleBiz(BIZ_STEP); }} style={{ padding: '8px 16px', borderRadius: 999, border: `1px solid ${T.border}`, background: activeCat === 'todas' ? '#1A7A5E' : 'transparent', color: activeCat === 'todas' ? '#fff' : T.text, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Todas</button>
                  {categories.map(({ name, count }) => (
                    <button key={name} onClick={() => { setActiveCat(name); setVisibleBiz(BIZ_STEP); }} style={{ padding: '8px 16px', borderRadius: 999, border: `1px solid ${T.border}`, background: activeCat === name ? '#1A7A5E' : 'transparent', color: activeCat === name ? '#fff' : T.text, fontSize: 13, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize' }}>{name} ({count})</button>
                  ))}
                </div>
              )}
              {shownBiz.length === 0 ? (
                <p style={{ color: T.sub }}>No encontramos nada con ese filtro.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
                  {shownBiz.map((b) => (
                    <div key={b.id} style={{ position: 'relative' }}>
                      <BusinessCard
                        variant="compact"
                        b={b}
                        T={T}
                        dark={dark}
                        isFav={favIds?.includes(b.id)}
                        toggleFav={toggleFav}
                        onTap={handleCardTap}
                        realFavs={globalFavCounts?.[b.id] || 0}
                      />
                      {cityBySlug.get(b.city_slug)?.name && (
                        <span style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999, pointerEvents: 'none' }}>
                          {cityBySlug.get(b.city_slug).name}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {!filtering && (visibleBiz < mixedBiz.length || hasMoreBiz) && (
                <div style={{ textAlign: 'center', marginTop: 20 }}>
                  <button onClick={loadMoreBiz} disabled={loadingMore} style={{ padding: '12px 28px', borderRadius: 999, border: 0, background: '#1A7A5E', color: '#fff', fontSize: 14, fontWeight: 700, cursor: loadingMore ? 'wait' : 'pointer', opacity: loadingMore ? 0.7 : 1 }}>
                    {loadingMore ? 'Cargando...' : 'Cargar más'}
                  </button>
                </div>
              )}
            </section>

            {/* Guías y experiencias */}
            {experiences.length > 0 && (
              <section style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: T.text, margin: '0 0 14px' }}>Guías y experiencias</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
                  {experiences.map((exp) => {
                    const gallery = parseGallery(exp);
                    const img = gallery[0]?.url || gallery[0];
                    const cityName = cityBySlug.get(exp.city_slug)?.name || '';
                    return (
                      <button
                        key={exp.id}
                        onClick={() => navigate(`/revista/${exp.city_slug || ''}/${createSlug(exp.title || '')}`)}
                        style={{ display: 'block', textAlign: 'left', borderRadius: 16, overflow: 'hidden', border: `1px solid ${T.border}`, padding: 0, background: dark ? '#1e1e1e' : '#fff', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
                      >
                        {img
                          ? <img src={img} alt={exp.title || 'Experiencia'} loading="lazy" style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block' }} />
                          : <div style={{ width: '100%', height: 130, background: 'linear-gradient(135deg,#1A7A5E,#22a876)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34 }}>✨</div>}
                        <div style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 700, fontSize: 15, color: T.text, lineHeight: 1.35 }}>{exp.title || 'Experiencia'}</div>
                          <div style={{ fontSize: 12, color: T.sub, marginTop: 4 }}>
                            {[cityName, exp.duration, exp.price > 0 ? `$${exp.price} MXN` : 'Gratis'].filter(Boolean).join(' · ')}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}
