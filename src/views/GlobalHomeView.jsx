import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useDataStore } from '../store/useDataStore.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { sb } from '../lib/supabase.js';
import { createSlug, getThumbUrl } from '../lib/utils.js';
import OptimizedImage from '../components/ui/OptimizedImage.jsx';
import Icon from '../components/ui/Icon.jsx';
import DebouncedSearchBar from '../components/home/DebouncedSearchBar.jsx';
import TravelAffiliateRow from '../components/home/TravelAffiliateRow.jsx';
import Footer from '../components/Footer.jsx';

const BIZ_PAGE = 60;
// Cada sección del muro muestra 5 tarjetas y al deslizar hasta el final
// agrega 5 más, para no cargar/renderizar todo de golpe.
const SECTION_STEP = 5;

// Categorías de la tabla businesses que son lugares (no negocios): así se
// clasifican en el filtro "Lugares" del muro, además de is_place.
const PLACE_CATEGORIES = ['lugares', 'unidad deportiva', 'playa'];
const PLACE_LABELS = { lugares: 'Puntos de interés', 'unidad deportiva': 'Unidad Deportiva', playa: 'Playa' };
const normCat = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const isPlaceBiz = (b) => !!b.is_place || PLACE_CATEGORIES.includes(normCat(b.category));

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

// Buscador del muro en su propio componente: el placeholder con máquina de
// escribir cambia cada ~75 ms y así solo se vuelve a dibujar esta zona,
// no todo el muro.
function HeroSearchBar({ dark, query, setQuery }) {
  const { detectCity, locating, navigate } = useAppContext();
  const handleLocate = () => {
    if (locating) return;
    // Igual que "Encontrar lugares cerca de mí" del seleccionador de ciudad:
    // detecta por GPS, actualiza la ciudad activa y abre esa ciudad.
    detectCity({
      showToast: true,
      onDone: (slug) => { if (slug) navigate(`/${slug}`); },
    });
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', marginTop: query ? 76 : 10, zIndex: 10 }}>
      <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
        <style>{`
          .hero-search-magic-container {
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            border-radius: 100px;
            overflow: hidden;
            z-index: 1;
            pointer-events: none;
          }
          .hero-search-magic-inner {
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            border-radius: 100px;
            background: ${dark ? '#2D2D31' : '#F8FAFC'};
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
            box-shadow: ${dark ? 'inset 0 1px 1px rgba(255,255,255,0.15), 0 4px 12px rgba(0,0,0,0.1)' : 'inset 0 1px 2px rgba(0,0,0,0.03), 0 2px 6px rgba(0,0,0,0.02)'};
            z-index: 2;
            border: ${dark ? '1px solid #3F3F46' : '1px solid #ECEFF2'};
          }
          .hero-search-input {
            position: relative;
            z-index: 3;
            -webkit-appearance: none !important;
            appearance: none !important;
            background: transparent !important;
            color: ${dark ? '#F4F4F5' : '#111'} !important;
          }
          .hero-search-input::placeholder {
            color: ${dark ? '#A1A1AA' : '#6B7280'} !important;
            -webkit-text-fill-color: ${dark ? '#A1A1AA' : '#6B7280'} !important;
            opacity: 1;
            letter-spacing: 0.2px;
          }
          .hero-search-input:focus {
            outline: 2px solid ${dark ? '#A1A1AA' : '#71717A'} !important;
            outline-offset: 2px;
            box-shadow: none !important;
          }
        `}</style>
        <div className="hero-search-magic-container">
          <div className="hero-search-magic-inner"></div>
        </div>
        <DebouncedSearchBar initialValue={query} onSearch={(v) => setQuery(v)} dark={dark} />
      </div>

      {!query && (
        <button type="button" aria-label="Encontrar lugares cerca de mí" title="Cerca de mí" disabled={locating} onClick={handleLocate}
          style={{ width: 40, height: 40, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, background: 'transparent', border: 0, borderRadius: 12, cursor: locating ? 'default' : 'pointer', fontSize: 23, opacity: locating ? 0.5 : 1 }}>📍</button>
      )}
    </div>
  );
}

export default function GlobalHomeView() {
  const { T, dark, user, toast$, handleCardTap, handleEventTap, navigate, favIds, toggleFav, globalFavCounts, savedEventIds, setSavedEventIds, savedExpIds, setSavedExpIds, toggleSaveEvent } = useAppContext();
  const setShowAuth = useAuthStore((s) => s.setShowAuth);
  const cities = useDataStore((s) => s.cities);
  const [biz, setBiz] = useState([]);
  const [events, setEvents] = useState([]);
  const [experiences, setExperiences] = useState([]);
  const [allCities, setAllCities] = useState([]);
  const [popCounts, setPopCounts] = useState({});
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [showAllCities, setShowAllCities] = useState(false);
  // Tarjetas visibles por sección (5 al inicio, 5 más al llegar al final
  // del deslizamiento).
  const [eventsShown, setEventsShown] = useState(SECTION_STEP);
  const [placesShown, setPlacesShown] = useState(SECTION_STEP);
  const [restShown, setRestShown] = useState(SECTION_STEP);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const [bizRes, evRes, exRes, citiesRes, placesRes] = await Promise.all([
          sb.get('businesses', `?select=id,name,slug,category,emoji,logo_url,banner_url,photos,rating,review_count,city_slug,status,address,is_place,type,tagline,plan,created_at&status=eq.approved&plan=neq.menu&order=plan.desc,rating.desc.nullslast,id.desc&limit=${BIZ_PAGE}&offset=0`).catch(() => []),
          sb.get('events', `?select=id,title,slug,date,end_date,time,end_time,venue_name,venue_address,lat,lng,city_slug,img_url,img,status,description,event_category,biz_id,price,price_type,website&status=eq.approved&order=date.asc&limit=60`).catch(() => []),
          sb.get('experiences', `?select=id,title,city_slug,price,duration,people,gallery,created_at&status=eq.approved&order=created_at.desc&limit=12`).catch(() => []),
          (cities && cities.length > 0)
            ? Promise.resolve(cities)
            : sb.get('cities', '?active=eq.true&select=id,name,slug,state,country,country_code,bg_image&order=name.asc').catch(() => []),
          // Lugares (puntos de interés, unidad deportiva, playas): consulta propia
          // para que el filtro "Lugares" tenga contenido desde el inicio y no
          // dependa de que aparezcan en la paginación de negocios.
          sb.get('businesses', `?select=id,name,slug,category,emoji,logo_url,banner_url,photos,rating,review_count,city_slug,status,address,is_place,type,tagline,plan,created_at&status=eq.approved&plan=neq.menu&or=(category.eq.lugares,category.eq.unidad%20deportiva,category.eq.playa,is_place.eq.true)&order=plan.desc,rating.desc.nullslast,id.desc&limit=60`).catch(() => []),
        ]);
        if (cancelled) return;
        const bizRows = Array.isArray(bizRes) ? bizRes : [];
        const placeRows = Array.isArray(placesRes) ? placesRes : [];
        const bizIds = new Set(bizRows.map((b) => b.id));
        setBiz([...bizRows, ...placeRows.filter((b) => !bizIds.has(b.id))]);
        const evRows = (Array.isArray(evRes) ? evRes : []).filter((ev) => {
          if (!ev || !ev.date) return false;
          if (ev.end_date) return ev.end_date >= todayStr;
          return ev.date >= todayStr;
        });
        // Sin recorte: la hilera "Próximos eventos" carga de 5 en 5, así que
        // guarda todos los próximos (hasta 60) en vez de solo los primeros 12.
        setEvents(evRows);
        setExperiences(Array.isArray(exRes) ? exRes : []);
        const cityList = Array.isArray(citiesRes) ? citiesRes : [];
        setAllCities(cityList);
        // Popularidad por ciudad: negocios + eventos registrados (conteos exactos).
        if (cityList.length > 0) {
          Promise.all(cityList.map(async (c) => {
            const [b, e] = await Promise.all([
              sb.count('businesses', `?status=eq.approved&plan=neq.menu&city_slug=eq.${c.slug}`).catch(() => 0),
              sb.count('events', `?status=eq.approved&city_slug=like.*${c.slug}*`).catch(() => 0),
            ]);
            return [c.slug, { biz: b, ev: e, total: b + e }];
          })).then((entries) => {
            if (!cancelled) setPopCounts(Object.fromEntries(entries));
          });
        }
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

  // Ciudades ordenadas de la más popular a la menos: negocios + eventos registrados.
  const sortedCities = useMemo(() => {
    const list = [...(allCities || [])];
    list.sort((a, b) => {
      const pa = popCounts[a.slug]?.total ?? 0;
      const pb = popCounts[b.slug]?.total ?? 0;
      if (pb !== pa) return pb - pa;
      return (a.name || '').localeCompare(b.name || '');
    });
    return list;
  }, [allCities, popCounts]);

  // Etapa 2: buscador global en vivo (Supabase, todas las ciudades).
  // DebouncedSearchBar ya espera 300 ms antes de avisar, así que aquí se busca directo.
  useEffect(() => {
    // Si el usuario escribe lo que sugiere el buscador ("Buscar tacos"),
    // se quita el verbo para buscar solo el término: "tacos".
    const q = query.trim().replace(/^(buscar|busca)\s+/i, '').trim();
    if (q.length < 2) { setSearchResults(null); setSearching(false); return; }
    setSearching(true);
    let cancelled = false;
    (async () => {
      const enc = encodeURIComponent(q);
      try {
        const [b, e, x] = await Promise.all([
          sb.get('businesses', `?select=id,name,slug,category,city_slug,photos,logo_url,banner_url,is_place,created_at&status=eq.approved&plan=neq.menu&or=(name.ilike.*${enc}*,category.ilike.*${enc}*,tagline.ilike.*${enc}*)&order=plan.desc,rating.desc.nullslast&limit=15`).catch(() => []),
          sb.get('events', `?select=id,title,slug,date,end_date,time,end_time,venue_name,venue_address,lat,lng,city_slug,img_url,img,status,description,event_category,biz_id,price,price_type,website&status=eq.approved&title=ilike.*${enc}*&order=date.asc&limit=10`).catch(() => []),
          sb.get('experiences', `?select=id,title,city_slug,gallery,created_at&status=eq.approved&title=ilike.*${enc}*&order=created_at.desc&limit=10`).catch(() => []),
        ]);
        if (cancelled) return;
        const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const qn = norm(q);
        setSearchResults({
          cities: (allCities || []).filter((c) => norm(c.name).includes(qn)),
          biz: Array.isArray(b) ? b : [],
          events: Array.isArray(e) ? e : [],
          exps: Array.isArray(x) ? x : [],
        });
      } catch (err) {
        console.warn('Error en búsqueda global', err);
        if (!cancelled) setSearchResults({ cities: [], biz: [], events: [], exps: [] });
      } finally {
        if (!cancelled) setSearching(false);
      }
    })();
    return () => { cancelled = true; };
  }, [query, allCities]);

  // Saludo y mensaje del día, igual que en los inicios de ciudad.
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const day = days[new Date().getDay()];
    if (h >= 5 && h < 12) return `¡Buen ${day}!`;
    if (h >= 12 && h < 19) return `¡Excelente ${day}!`;
    return '¡Linda noche!';
  }, []);

  const contextMessage = useMemo(() => {
    const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
    return rand([
      'Descubre qué hay hoy en todas las ciudades',
      'Negocios, lugares, artículos y eventos de todas nuestras ciudades',
      'Lo mejor de Guadalajara, Tepic, Vallarta y más',
      '¿Qué plan hay hoy? Explora todas las ciudades',
      'Encuentra dónde comer, qué visitar y qué hacer',
    ]);
  }, []);

  // Feed unificado: negocios, lugares, artículos y eventos, lo más reciente primero.
  const feed = useMemo(() => {
    const items = [];
    const seen = new Set();
    biz.forEach((b) => {
      if (seen.has(`b-${b.id}`)) return;
      seen.add(`b-${b.id}`);
      const isPlace = isPlaceBiz(b);
      const catLabel = PLACE_LABELS[normCat(b.category)] || b.category || 'Negocio';
      items.push({
        key: `b-${b.id}`,
        kind: isPlace ? 'lugares' : 'negocios',
        badge: isPlace ? 'Lugar' : 'Negocio',
        title: b.name,
        subtitle: `${catLabel} · ${cityBySlug.get(b.city_slug)?.name || ''}`.replace(/ · $/, ''),
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

  // Secciones del muro (opción A): cada una con sus propios items, sin mezclar.
  // Eventos por fecha (los más cercanos primero); lugares y restaurantes por
  // calificación (los mejores primero).
  const upcomingEvents = useMemo(() => feed.filter((it) => it.kind === 'eventos').slice().sort((a, b) => String(a.date || '').localeCompare(String(b.date || ''))), [feed]);
  const byRating = (a, b) => (b.raw.rating ?? -1) - (a.raw.rating ?? -1) || String(b.date || '').localeCompare(String(a.date || ''));
  const placesList = useMemo(() => feed.filter((it) => it.kind === 'lugares').slice().sort(byRating), [feed]);
  const restaurantsList = useMemo(() => feed.filter((it) => it.kind === 'negocios' && normCat(it.raw.category) === 'restaurantes').slice().sort(byRating), [feed]);

  // Al llegar al final del deslizamiento de una hilera, se agregan 5 tarjetas
  // más (los datos ya están cargados; esto limita lo que se renderiza).
  const onRowScroll = (list, shown, setShown) => (e) => {
    const el = e.currentTarget;
    if (shown >= list.length) return;
    if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 80) {
      setShown((v) => Math.min(v + SECTION_STEP, list.length));
    }
  };

  // Las tarjetas de las hileras se ven a 170-240 px (340-480 px en retina):
  // 400 px alcanza y pesa ~la mitad que 800 px (PageSpeed: 515 KiB de ahorro).
  // Solo las 2 primeras de "Próximos eventos" llevan prioridad: son las que
  // se ven al abrir el muro y el LCP era una foto sin prioridad.
  const renderCard = (item, idx, isPriority = false) => {
    const isPoster = item.kind === 'eventos';
    return (
      <article
        key={item.key}
        onClick={() => openItem(item)}
        style={{ flex: isPoster ? '0 0 170px' : '0 0 240px', borderRadius: 16, overflow: 'hidden', border: `1px solid ${T.border}`, background: '#111', cursor: 'pointer', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}
      >
        <div style={{ position: 'relative', ...(isPoster ? { aspectRatio: '3 / 4' } : { height: 168 }), background: 'linear-gradient(135deg,#111,#333)' }}>
          {item.img
            ? <OptimizedImage src={item.img} alt={item.title || ''} widthRequest={400} priority={isPriority} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>{isPoster ? '🎟️' : '📍'}</div>}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent 55%)' }} />
          <button
            aria-label="Guardar"
            onClick={(e) => toggleSave(e, item)}
            style={{ position: 'absolute', top: 12, right: 12, width: 44, height: 44, borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))' }}
          >
            <Icon name={isSaved(item) ? 'heart_overlay_f' : 'heart_overlay'} size={26} color="none" />
          </button>
          {isPoster ? (
            item.img ? (
              <span style={{ position: 'absolute', left: 12, right: 12, bottom: 10, color: '#fff', fontSize: 14, fontWeight: 800, textAlign: 'center' }}>{cityBySlug.get(item.citySlug)?.name || ''}</span>
            ) : (
              <div style={{ position: 'absolute', left: 12, right: 12, bottom: 10, textAlign: 'center' }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: '#fff', lineHeight: 1.25, margin: '0 0 2px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.title}</h3>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', margin: 0, lineHeight: 1.4 }}>{cityBySlug.get(item.citySlug)?.name || ''}</p>
              </div>
            )
          ) : (
            <div style={{ position: 'absolute', left: 12, right: 12, bottom: 10 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1.25, margin: '0 0 2px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.title}</h3>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', margin: 0, lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cityBySlug.get(item.citySlug)?.name || ''}</p>
            </div>
          )}
        </div>
      </article>
    );
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
    // Sin sesión el corazón pide iniciar sesión para que se guarde de verdad (como en el resto de la app).
    if (!user) { setShowAuth(true); return; }
    if (item.kind === 'negocios' || item.kind === 'lugares') {
      // Con sesión: favoritos de la cuenta (como en el resto de la app).
      toggleFav?.(item.raw.id, e);
      return;
    }
    if (item.kind === 'eventos') {
      toggleSaveEvent?.(item.raw.id, e);
      return;
    }
    if (!setSavedExpIds) return;
    const ids = savedExpIds || [];
    const nw = ids.includes(item.raw.id) ? ids.filter((x) => x !== item.raw.id) : [...ids, item.raw.id];
    setSavedExpIds(nw);
    try { localStorage.setItem('cg_saved_exp', JSON.stringify(nw)); } catch { /* localStorage no disponible, se ignora */ }
  };

  const fmtDate = (d) => {
    try {
      return new Date(`${d}T12:00:00`).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
    } catch { return d; }
  };

  const shownCities = showAllCities ? sortedCities : sortedCities.slice(0, 5);
  const isSearching = query.trim().length >= 2;

  return (
    <div style={{ background: dark ? 'transparent' : '#fff', minHeight: '100vh', paddingBottom: 90 }}>
      {/* Hero igual que en los inicios de ciudad: logo, saludo con gradiente, buscador y categorías en texto */}
      <div style={{ position: 'relative', padding: 'calc(env(safe-area-inset-top, 0px) + 10px) 20px 20px', display: 'flex', flexDirection: 'column', background: 'transparent' }}>
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>
          {!query && (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', marginBottom: 0, paddingTop: 0, paddingLeft: 10, paddingRight: 10, textAlign: 'center', position: 'relative', zIndex: 10 }}>
              <div style={{ marginBottom: 4 }}>
                <img
                  src="/citymap.mx.png"
                  alt="CityMap"
                  width={127}
                  height={38}
                  style={{ height: 38, width: 127, objectFit: 'contain', filter: dark ? 'brightness(0) invert(1)' : 'brightness(0)', display: 'block', margin: '0 auto' }}
                />
              </div>
              <style>{`
                @keyframes heroGradientFlow {
                  0% { background-position: 0% center; }
                  50% { background-position: 100% center; }
                  100% { background-position: 0% center; }
                }
                .animated-city {
                  display: inline-block;
                  font-family: 'Montserrat', sans-serif;
                  font-size: 1.1em;
                  font-weight: 800;
                  line-height: 1;
                  letter-spacing: normal;
                  padding-right: 8px;
                  background: linear-gradient(90deg, #34D399 0%, #38BDF8 25%, #818CF8 50%, #38BDF8 75%, #34D399 100%);
                  background-size: 200% auto;
                  -webkit-background-clip: text;
                  -webkit-text-fill-color: transparent;
                  animation: heroGradientFlow 8s ease-in-out infinite;
                }
              `}</style>
              <h1 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 'clamp(22px, 5.5vw, 28px)', fontWeight: 800, lineHeight: 1.1, margin: 0, letterSpacing: '-0.5px', color: dark ? '#fff' : T.text }}>
                {greeting} <span className="animated-city">CityMap</span>
              </h1>
              <p style={{ margin: '6px 0 0 0', fontSize: 14, fontWeight: 600, color: dark ? 'rgba(255,255,255,0.7)' : '#6B7280' }}>
                {contextMessage}
              </p>
            </div>
          )}

          <HeroSearchBar dark={dark} query={query} setQuery={setQuery} />
          {!query && <TravelAffiliateRow T={T} dark={dark} />}

        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px' }}>
        {loading && (
          <>
            {/* Esqueleto con las mismas medidas de la sección "Explora por ciudad":
               reserva el espacio mientras cargan las ciudades para que nada
               brinque cuando aparecen (CLS 0.707 en PageSpeed) */}
            <section style={{ marginTop: 22, marginBottom: 30 }} aria-hidden="true">
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: T.text, margin: 0 }}>Explora por ciudad</h2>
                <span style={{ fontSize: 13, fontWeight: 700, color: T.sub, whiteSpace: 'nowrap' }}>Ver todas las ciudades →</span>
              </div>
              <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'none' }}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} style={{ flex: '0 0 168px', height: 132, borderRadius: 16, background: dark ? '#1e1e1e' : '#f1f1f1' }} />
                ))}
              </div>
            </section>
            {/* Esqueletos de las secciones del muro con sus mismas medidas:
               sin ellos el pie de página se movía cuando el contenido aparecía
               (casi todo el CLS 0.44 del reporte nuevo) */}
            <section style={{ marginBottom: 32 }} aria-hidden="true">
              <div style={{ width: 220, height: 22, borderRadius: 8, background: dark ? '#1e1e1e' : '#f1f1f1', marginBottom: 14 }} />
              <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'none' }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{ flex: '0 0 170px', aspectRatio: '3 / 4', borderRadius: 16, background: dark ? '#1e1e1e' : '#f1f1f1' }} />
                ))}
              </div>
            </section>
            {[0, 1].map((s) => (
              <section key={s} style={{ marginBottom: 32 }} aria-hidden="true">
                <div style={{ width: 220, height: 22, borderRadius: 8, background: dark ? '#1e1e1e' : '#f1f1f1', marginBottom: 14 }} />
                <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'none' }}>
                  {[0, 1, 2].map((i) => (
                    <div key={i} style={{ flex: '0 0 240px', height: 168, borderRadius: 16, background: dark ? '#1e1e1e' : '#f1f1f1' }} />
                  ))}
                </div>
              </section>
            ))}
            <section style={{ marginBottom: 32 }} aria-hidden="true">
              <div style={{ width: 220, height: 22, borderRadius: 8, background: dark ? '#1e1e1e' : '#f1f1f1', marginBottom: 14 }} />
              <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'none' }}>
                {[0, 1].map((i) => (
                  <div key={i} style={{ flex: '0 0 260px', height: 150, borderRadius: 16, background: dark ? '#1e1e1e' : '#f1f1f1' }} />
                ))}
              </div>
            </section>
          </>
        )}
        {error && !loading && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <p style={{ color: T.sub }}>No pudimos cargar el contenido global.</p>
            <button onClick={() => window.location.reload()} style={{ marginTop: 12, padding: '11px 22px', borderRadius: 999, border: 0, background: '#1A7A5E', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Reintentar</button>
          </div>
        )}

        {!loading && !error && isSearching && (
          <section style={{ marginTop: 22, marginBottom: 32 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: T.text, margin: '0 0 4px' }}>Resultados para “{query.trim()}”</h2>
            <p style={{ fontSize: 13, color: T.sub, margin: '0 0 16px' }}>{searching ? 'Buscando en todas las ciudades...' : 'Buscamos en negocios, eventos y artículos de todas las ciudades.'}</p>
            {searchResults && searchResults.cities.length === 0 && searchResults.biz.length === 0 && searchResults.events.length === 0 && searchResults.exps.length === 0 && !searching && (
              <p style={{ color: T.sub }}>No encontramos nada con esa búsqueda. Prueba con otra palabra.</p>
            )}
            {searchResults && searchResults.cities.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: T.text, margin: '0 0 10px' }}>Ciudades</h3>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {searchResults.cities.map((c) => (
                    <button key={c.slug} onClick={() => navigate(`/${c.slug}`)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px 8px 8px', borderRadius: 999, border: `1px solid ${T.border}`, background: dark ? '#1e1e1e' : '#fff', cursor: 'pointer' }}>
                      {c.bg_image && <img src={getThumbUrl(c.bg_image, 100)} alt="" width={30} height={30} style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' }} />}
                      <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {searchResults && searchResults.biz.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: T.text, margin: '0 0 10px' }}>Negocios y lugares</h3>
                {searchResults.biz.map((b) => (
                  <button key={`sb-${b.id}`} onClick={() => handleCardTap(b)} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '10px 0', background: 'none', border: 'none', borderBottom: `1px solid ${T.border}`, cursor: 'pointer' }}>
                    <span style={{ width: 52, height: 52, borderRadius: 12, overflow: 'hidden', background: '#e8f5ef', flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                      {bizImage(b) ? <img src={getThumbUrl(bizImage(b), 200)} alt="" width={52} height={52} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📍'}
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.name}</span>
                      <span style={{ display: 'block', fontSize: 13, color: T.sub }}>{b.category || 'Negocio'} · {cityBySlug.get(b.city_slug)?.name || ''}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
            {searchResults && searchResults.events.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: T.text, margin: '0 0 10px' }}>Eventos</h3>
                {searchResults.events.map((ev) => (
                  <button key={`se-${ev.id}`} onClick={() => handleEventTap(ev)} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '10px 0', background: 'none', border: 'none', borderBottom: `1px solid ${T.border}`, cursor: 'pointer' }}>
                    <span style={{ width: 52, height: 52, borderRadius: 12, overflow: 'hidden', background: '#e8f5ef', flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                      {ev.img_url || ev.img ? <img src={getThumbUrl(ev.img_url || ev.img, 200)} alt="" width={52} height={52} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🎟️'}
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.title}</span>
                      <span style={{ display: 'block', fontSize: 13, color: T.sub }}>📅 {fmtDate(ev.date)}{ev.venue_name ? ` · ${ev.venue_name}` : ''}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
            {searchResults && searchResults.exps.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: T.text, margin: '0 0 10px' }}>Artículos y guías</h3>
                {searchResults.exps.map((exp) => {
                  const g = parseGallery(exp);
                  const img = g[0]?.url || g[0] || null;
                  return (
                    <button key={`sx-${exp.id}`} onClick={() => navigate(`/revista/${exp.city_slug || ''}/${createSlug(exp.title || '')}`)} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '10px 0', background: 'none', border: 'none', borderBottom: `1px solid ${T.border}`, cursor: 'pointer' }}>
                      <span style={{ width: 52, height: 52, borderRadius: 12, overflow: 'hidden', background: '#e8f5ef', flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                        {typeof img === 'string' && img ? <img src={getThumbUrl(img, 200)} alt="" width={52} height={52} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📝'}
                      </span>
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{exp.title}</span>
                        <span style={{ display: 'block', fontSize: 13, color: T.sub }}>Guía de viaje{cityBySlug.get(exp.city_slug)?.name ? ` · ${cityBySlug.get(exp.city_slug).name}` : ''}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {!loading && !error && !isSearching && (
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
                      style={{ flex: '0 0 168px', position: 'relative', height: 132, borderRadius: 16, overflow: 'hidden', border: 'none', padding: 0, cursor: 'pointer', background: '#111', textAlign: 'left' }}
                    >
                      {city.bg_image && <OptimizedImage src={city.bg_image} alt={city.name} widthRequest={400} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent 60%)' }} />
                      {/* bottom fijo en 26 y línea de conteos siempre reservada:
                          antes el nombre saltaba de bottom 10 a 26 cuando llegaban
                          los conteos (parte del CLS 0.707) */}
                      <span style={{ position: 'absolute', left: 12, bottom: 26, color: '#fff', fontSize: 16, fontWeight: 800 }}>{city.name}</span>
                      <span style={{ position: 'absolute', left: 12, bottom: 8, color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: 600 }}>{popCounts[city.slug] ? `${popCounts[city.slug].biz} negocios · ${popCounts[city.slug].ev} eventos` : ' '}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Próximos eventos: hilera deslizable, los más cercanos primero */}
            {upcomingEvents.length > 0 && (
              <section style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: T.text, margin: '0 0 14px' }}>Próximos eventos</h2>
                <div onScroll={onRowScroll(upcomingEvents, eventsShown, setEventsShown)} style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'none' }}>
                  {upcomingEvents.slice(0, eventsShown).map((item, idx) => renderCard(item, idx, idx < 2))}
                </div>
              </section>
            )}

            {/* Lugares increíbles: puntos de interés, unidades deportivas y playas */}
            {placesList.length > 0 && (
              <section style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: T.text, margin: '0 0 14px' }}>Lugares increíbles</h2>
                <div onScroll={onRowScroll(placesList, placesShown, setPlacesShown)} style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'none' }}>
                  {placesList.slice(0, placesShown).map((item, idx) => renderCard(item, idx))}
                </div>
              </section>
            )}

            {/* Restaurantes que debes conocer: los mejor calificados */}
            {restaurantsList.length > 0 && (
              <section style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: T.text, margin: '0 0 14px' }}>Restaurantes que debes conocer</h2>
                <div onScroll={onRowScroll(restaurantsList, restShown, setRestShown)} style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'none' }}>
                  {restaurantsList.slice(0, restShown).map((item, idx) => renderCard(item, idx))}
                </div>
              </section>
            )}

            {/* Guías y artículos */}
            {experiences.length > 0 && (
              <section style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: T.text, margin: 0 }}>Guías y artículos</h2>
                  <button onClick={() => navigate('/revista')} style={{ background: 'none', border: 'none', color: T.text, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    Ver todas las guías →
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'none' }}>
                  {experiences.map((exp) => {
                    const gallery = parseGallery(exp);
                    const img = gallery[0]?.url || gallery[0] || null;
                    const saved = savedExpIds?.includes(exp.id);
                    return (
                      <article
                        key={`g-${exp.id}`}
                        onClick={() => navigate(`/revista/${exp.city_slug || ''}/${createSlug(exp.title || '')}`)}
                        style={{ flex: '0 0 260px', borderRadius: 16, overflow: 'hidden', border: `1px solid ${T.border}`, background: dark ? '#1e1e1e' : '#fff', cursor: 'pointer', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}
                      >
                        <div style={{ position: 'relative', height: 150, background: 'linear-gradient(135deg,#111,#333)' }}>
                          {typeof img === 'string' && img
                            ? <OptimizedImage src={img} alt={exp.title || ''} widthRequest={520} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>📝</div>}
                          <span style={{ position: 'absolute', top: 10, left: 10, background: '#fff', color: '#111', fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 999 }}>Guía</span>
                          <button
                            aria-label="Guardar"
                            onClick={(e) => { e.stopPropagation(); if (!user) { setShowAuth(true); return; } const ids = savedExpIds || []; const nw = ids.includes(exp.id) ? ids.filter((x) => x !== exp.id) : [...ids, exp.id]; setSavedExpIds?.(nw); try { localStorage.setItem('cg_saved_exp', JSON.stringify(nw)); } catch { /* localStorage no disponible, se ignora */ } }}
                            style={{ position: 'absolute', top: 12, right: 12, width: 44, height: 44, borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))' }}
                          >
                            <Icon name={saved ? 'heart_overlay_f' : 'heart_overlay'} size={26} color="none" />
                          </button>
                        </div>
                        <div style={{ padding: '12px 14px 16px' }}>
                          <h3 style={{ fontSize: 15, fontWeight: 800, color: T.text, lineHeight: 1.3, margin: '0 0 6px' }}>{exp.title}</h3>
                          <p style={{ fontSize: 13, color: T.sub, margin: 0 }}>
                            {cityBySlug.get(exp.city_slug)?.name || ''}{exp.duration ? ` · ⏱ ${exp.duration}` : ''}{exp.price > 0 ? ` · $${exp.price} MXN` : ' · Gratis'}
                          </p>
                        </div>
                      </article>
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
