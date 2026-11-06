import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useDataStore } from '../store/useDataStore.js';
import { sb } from '../lib/supabase.js';
import { createSlug } from '../lib/utils.js';
import OptimizedImage from '../components/ui/OptimizedImage.jsx';
import Footer from '../components/Footer.jsx';

const BIZ_PAGE = 60;
const FEED_STEP = 12;

// Categorías del inicio, como en las páginas de ciudad.
const HOME_CATS = [
  { id: 'restaurantes', label: 'Restaurantes', icon: '🍽️' },
  { id: 'cafeterias', label: 'Cafeterías', icon: '☕' },
  { id: 'bares', label: 'Bares', icon: '🍸' },
  { id: 'hoteles', label: 'Hoteles', icon: '🏨' },
  { id: 'lugares', label: 'Lugares', icon: '📍' },
  { id: 'eventos', label: 'Eventos', icon: '🎟️' },
  { id: 'articulos', label: 'Artículos', icon: '📝' },
  { id: 'mas', label: 'Más', icon: '⊞' },
];

const FEED_FILTERS = [
  { id: 'todo', label: 'Todo' },
  { id: 'negocios', label: 'Negocios' },
  { id: 'lugares', label: 'Lugares' },
  { id: 'articulos', label: 'Artículos' },
  { id: 'eventos', label: 'Eventos' },
];

function parseGallery(exp) {
  if (Array.isArray(exp.gallery)) return exp.gallery;
  if (typeof exp.gallery === 'string') {
    try { const g = JSON.parse(exp.gallery); return Array.isArray(g) ? g : []; } catch { return []; }
  }
  return [];
}

function bizImage(b) {
  const photo = b.photos?.[0];
  if (photo?.url) return photo.url;
  if (typeof photo === 'string') return photo;
  return b.banner_url || b.logo_url || null;
}

export default function GlobalHomeView() {
  const { T, dark, handleCardTap, handleEventTap, navigate, favIds, toggleFav, globalFavCounts, savedEventIds, toggleSaveEvent, savedExpIds, setSavedExpIds } = useAppContext();
  const cities = useDataStore((s) => s.cities);
  const [biz, setBiz] = useState([]);
  const [bizOffset, setBizOffset] = useState(0);
  const [hasMoreBiz, setHasMoreBiz] = useState(true);
  const [events, setEvents] = useState([]);
  const [experiences, setExperiences] = useState([]);
  const [allCities, setAllCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [query, setQuery] = useState('');
  const [feedFilter, setFeedFilter] = useState('todo');
  const [homeCat, setHomeCat] = useState(null);
  const [showAllCats, setShowAllCats] = useState(false);
  const [showAllCities, setShowAllCities] = useState(false);
  const [visibleFeed, setVisibleFeed] = useState(FEED_STEP);

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

  const heroImg = useMemo(() => {
    const gdl = (allCities || []).find((c) => c.slug === 'guadalajara' && c.bg_image);
    if (gdl) return gdl.bg_image;
    return (allCities || []).find((c) => c.bg_image)?.bg_image || null;
  }, [allCities]);

  // Feed unificado: negocios, lugares, artículos y eventos, lo más reciente primero.
  const feed = useMemo(() => {
    const items = [];
    const seen = new Set();
    biz.forEach((b) => {
      if (seen.has(`b-${b.id}`)) return;
      seen.add(`b-${b.id}`);
      const isPlace = !!b.is_place;
      items.push({
        key: `b-${b.id}`,
        kind: isPlace ? 'lugares' : 'negocios',
        badge: isPlace ? 'Lugar' : 'Negocio',
        title: b.name,
        subtitle: `${(b.category || 'Negocio')} · ${cityBySlug.get(b.city_slug)?.name || ''}`.replace(/ · $/, ''),
        img: bizImage(b),
        date: b.created_at || '',
        citySlug: b.city_slug,
        raw: b,
      });
    });
    experiences.forEach((exp) => {
      if (seen.has(`x-${exp.id}`)) return;
      seen.add(`x-${exp.id}`);
      const gallery = parseGallery(exp);
      const img = gallery[0]?.url || gallery[0] || null;
      items.push({
        key: `x-${exp.id}`,
        kind: 'articulos',
        badge: 'Artículo',
        title: exp.title,
        subtitle: 'Guía de viaje',
        img: typeof img === 'string' ? img : null,
        date: exp.created_at || '',
        citySlug: exp.city_slug,
        raw: exp,
      });
    });
    events.forEach((ev) => {
      if (seen.has(`e-${ev.id}`)) return;
      seen.add(`e-${ev.id}`);
      items.push({
        key: `e-${ev.id}`,
        kind: 'eventos',
        badge: 'Evento',
        title: ev.title,
        subtitle: `${ev.date || ''}${ev.venue_name ? ` · ${ev.venue_name}` : ''}${cityBySlug.get(ev.city_slug)?.name ? ` · ${cityBySlug.get(ev.city_slug).name}` : ''}`,
        img: ev.img_url || ev.img || null,
        date: ev.date || '',
        citySlug: ev.city_slug,
        raw: ev,
      });
    });
    items.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    return items;
  }, [biz, experiences, events, cityBySlug]);

  const allBizCats = useMemo(() => {
    const counts = new Map();
    biz.forEach((b) => {
      const c = (b.category || 'otros').toLowerCase();
      counts.set(c, (counts.get(c) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
  }, [biz]);

  const filteredFeed = useMemo(() => {
    const q = query.trim().toLowerCase();
    return feed.filter((item) => {
      if (feedFilter !== 'todo' && item.kind !== feedFilter) return false;
      if (homeCat === 'restaurantes' && !(item.kind === 'negocios' && (item.raw.category || '').toLowerCase().includes('restaurante'))) return false;
      if (homeCat === 'cafeterias' && !(item.kind === 'negocios' && /caf|coffee/i.test(item.raw.category || ''))) return false;
      if (homeCat === 'bares' && !(item.kind === 'negocios' && /bar|antro/i.test(item.raw.category || item.raw.type || ''))) return false;
      if (homeCat === 'hoteles' && !(item.kind === 'negocios' && /hotel|hospedaje/i.test(item.raw.category || ''))) return false;
      if (homeCat === 'lugares' && item.kind !== 'lugares') return false;
      if (homeCat === 'eventos' && item.kind !== 'eventos') return false;
      if (homeCat === 'articulos' && item.kind !== 'articulos') return false;
      if (!q) return true;
      return `${item.title} ${item.subtitle} ${cityBySlug.get(item.citySlug)?.name || ''}`.toLowerCase().includes(q);
    });
  }, [feed, feedFilter, homeCat, query, cityBySlug]);

  const shownFeed = filteredFeed.slice(0, visibleFeed);

  const loadMoreFeed = async () => {
    if (visibleFeed < filteredFeed.length) { setVisibleFeed((v) => v + FEED_STEP); return; }
    if (!hasMoreBiz || loadingMore || feedFilter === 'eventos' || feedFilter === 'articulos') return;
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
      setVisibleFeed((v) => v + FEED_STEP);
    } catch (e) {
      console.warn('Error cargando más negocios', e);
    } finally {
      setLoadingMore(false);
    }
  };

  const onHomeCat = (id) => {
    if (id === 'mas') { setShowAllCats((v) => !v); return; }
    if (homeCat === id) { setHomeCat(null); setFeedFilter('todo'); }
    else {
      setHomeCat(id);
      setFeedFilter(id === 'lugares' ? 'lugares' : id === 'eventos' ? 'eventos' : id === 'articulos' ? 'articulos' : 'negocios');
    }
    setVisibleFeed(FEED_STEP);
  };

  const openItem = (item) => {
    if (item.kind === 'eventos') { handleEventTap(item.raw); return; }
    if (item.kind === 'articulos') { navigate(`/revista/${item.citySlug || ''}/${createSlug(item.raw.title || '')}`); return; }
    handleCardTap(item.raw);
  };

  const isSaved = (item) => {
    if (item.kind === 'negocios' || item.kind === 'lugares') return favIds?.includes(item.raw.id);
    if (item.kind === 'eventos') return savedEventIds?.includes(item.raw.id);
    return savedExpIds?.includes(item.raw.id);
  };

  const toggleSave = (e, item) => {
    e.stopPropagation();
    if (item.kind === 'negocios' || item.kind === 'lugares') { toggleFav?.(item.raw.id); return; }
    if (item.kind === 'eventos') { toggleSaveEvent?.(item.raw); return; }
    if (!setSavedExpIds) return;
    const ids = savedExpIds || [];
    setSavedExpIds(ids.includes(item.raw.id) ? ids.filter((x) => x !== item.raw.id) : [...ids, item.raw.id]);
  };

  const fmtDate = (d) => {
    try {
      return new Date(`${d}T12:00:00`).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
    } catch { return d; }
  };

  const shownCities = showAllCities ? allCities : allCities.slice(0, 5);

  return (
    <div style={{ background: dark ? 'transparent' : '#fff', minHeight: '100vh', paddingBottom: 90 }}>
      {/* Hero con foto, como en los inicios de ciudad */}
      <div style={{ position: 'relative', minHeight: 340, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '48px 20px 36px', color: '#fff', overflow: 'hidden', background: '#1A7A5E' }}>
        {heroImg && <img src={heroImg} alt="" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.25), rgba(0,0,0,0.55))' }} />
        <div style={{ position: 'relative', maxWidth: 680, margin: '0 auto', width: '100%' }}>
          <h1 style={{ fontSize: 34, fontWeight: 900, margin: '0 0 10px', letterSpacing: '-0.5px', lineHeight: 1.1 }}>
            Descubre el mundo<br />con CityMap
          </h1>
          <p style={{ fontSize: 15, opacity: 0.95, margin: '0 0 20px', lineHeight: 1.5, maxWidth: 460 }}>
            Negocios, lugares, artículos y eventos de todas nuestras ciudades.
          </p>
          <div style={{ position: 'relative', maxWidth: 560 }}>
            <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 17 }}>🔍</span>
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setVisibleFeed(FEED_STEP); }}
              placeholder="Buscar negocios, lugares, artículos y eventos"
              aria-label="Buscar en CityMap"
              style={{ width: '100%', padding: '14px 16px 14px 46px', border: 'none', borderRadius: 100, color: '#111', fontSize: 15, fontWeight: 500, outline: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}
            />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px' }}>
        {/* Categorías con iconos */}
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '18px 2px 6px', scrollbarWidth: 'none' }}>
          {HOME_CATS.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onHomeCat(cat.id)}
              style={{ flex: '0 0 auto', width: 82, padding: '12px 4px 10px', borderRadius: 16, border: `1px solid ${homeCat === cat.id ? '#1A7A5E' : T.border}`, background: homeCat === cat.id ? '#e8f5ef' : (dark ? '#1e1e1e' : '#fff'), cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
            >
              <div style={{ fontSize: 26, lineHeight: 1 }}>{cat.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginTop: 8, whiteSpace: 'nowrap' }}>{cat.label}</div>
            </button>
          ))}
        </div>
        {showAllCats && allBizCats.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '10px 0 4px' }}>
            {allBizCats.map(({ name, count }) => (
              <button
                key={name}
                onClick={() => { setHomeCat(null); setFeedFilter('negocios'); setQuery(name); setVisibleFeed(FEED_STEP); }}
                style={{ padding: '8px 14px', borderRadius: 999, border: `1px solid ${T.border}`, background: 'transparent', color: T.text, fontSize: 13, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}
              >
                {name} ({count})
              </button>
            ))}
          </div>
        )}

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
              <section style={{ marginTop: 22, marginBottom: 30 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: T.text, margin: 0 }}>Explora por ciudad</h2>
                  <button onClick={() => setShowAllCities((v) => !v)} style={{ background: 'none', border: 'none', color: T.text, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    {showAllCities ? 'Ver menos ←' : 'Ver todas las ciudades →'}
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'none' }}>
                  {shownCities.map((city) => (
                    <button
                      key={city.id || city.slug}
                      onClick={() => navigate(`/${city.slug}`)}
                      style={{ flex: '0 0 168px', position: 'relative', height: 132, borderRadius: 16, overflow: 'hidden', border: 'none', padding: 0, cursor: 'pointer', background: '#1A7A5E', textAlign: 'left' }}
                    >
                      {city.bg_image && <img src={city.bg_image} alt={city.name} loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent 60%)' }} />
                      <span style={{ position: 'absolute', left: 12, bottom: 10, color: '#fff', fontSize: 16, fontWeight: 800 }}>{city.name}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Lo más reciente */}
            <section style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: T.text, margin: '0 0 14px' }}>Lo más reciente en CityMap</h2>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 14, scrollbarWidth: 'none' }}>
                {FEED_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => { setFeedFilter(f.id); setVisibleFeed(FEED_STEP); }}
                    style={{ flex: '0 0 auto', padding: '9px 20px', borderRadius: 999, border: 'none', background: feedFilter === f.id ? '#111' : (dark ? '#1e1e1e' : '#f1f1f1'), color: feedFilter === f.id ? '#fff' : T.text, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              {shownFeed.length === 0 ? (
                <p style={{ color: T.sub }}>No encontramos nada con ese filtro.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                  {shownFeed.map((item) => (
                    <article
                      key={item.key}
                      onClick={() => openItem(item)}
                      style={{ borderRadius: 16, overflow: 'hidden', border: `1px solid ${T.border}`, background: dark ? '#1e1e1e' : '#fff', cursor: 'pointer', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}
                    >
                      <div style={{ position: 'relative', height: 168, background: 'linear-gradient(135deg,#1A7A5E,#22a876)' }}>
                        {item.img
                          ? <OptimizedImage src={item.img} alt={item.title || ''} widthRequest={600} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>{item.kind === 'eventos' ? '🎟️' : item.kind === 'articulos' ? '📝' : '📍'}</div>}
                        <span style={{ position: 'absolute', top: 10, left: 10, background: '#fff', color: '#111', fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 999 }}>{item.badge}</span>
                        <button
                          aria-label="Guardar"
                          onClick={(e) => toggleSave(e, item)}
                          style={{ position: 'absolute', top: 8, right: 8, width: 34, height: 34, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.45)', color: isSaved(item) ? '#ff4d6d' : '#fff', fontSize: 17, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          {isSaved(item) ? '♥' : '♡'}
                        </button>
                      </div>
                      <div style={{ padding: '12px 14px 16px' }}>
                        <h3 style={{ fontSize: 16, fontWeight: 800, color: T.text, lineHeight: 1.3, margin: '0 0 6px' }}>{item.title}</h3>
                        <p style={{ fontSize: 13, color: T.sub, margin: 0, lineHeight: 1.45 }}>
                          {item.kind === 'eventos' ? `📅 ${fmtDate(item.raw.date)}${item.subtitle.includes('·') ? ` · ${item.subtitle.split('·').slice(1).join('·').trim()}` : ''}` : item.subtitle}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              {(visibleFeed < filteredFeed.length || (!query && !homeCat && hasMoreBiz && feedFilter !== 'eventos' && feedFilter !== 'articulos')) && (
                <div style={{ textAlign: 'center', marginTop: 22 }}>
                  <button onClick={loadMoreFeed} disabled={loadingMore} style={{ padding: '12px 28px', borderRadius: 999, border: 0, background: '#1A7A5E', color: '#fff', fontSize: 14, fontWeight: 700, cursor: loadingMore ? 'wait' : 'pointer', opacity: loadingMore ? 0.7 : 1 }}>
                    {loadingMore ? 'Cargando...' : 'Cargar más'}
                  </button>
                </div>
              )}
            </section>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}
