// Página /tours: todos los tours de la Revista agrupados por ciudad, con
// píldoras para filtrar. La tarjeta lleva a su artículo en la Revista, donde
// está el botón de reserva con el enlace de afiliado.
import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { sb } from '../lib/supabase.js';
import { localizedTitle } from '../lib/i18nContent.js';
import { groupToursByCity, tourCardUrl, tourPriceLabel, tourDurationLabel } from '../lib/tours.js';
import OptimizedImage from './ui/OptimizedImage.jsx';
import { SRCSET_CARD } from '../lib/utils.js';
import Footer from './Footer.jsx';
import { useTranslation } from '../hooks/useTranslation.js';

function tourImage(tour) {
  const gallery = tour?.gallery;
  if (Array.isArray(gallery) && gallery[0]) return gallery[0]?.url || gallery[0];
  if (typeof gallery === 'string') {
    try {
      const parsed = JSON.parse(gallery);
      if (Array.isArray(parsed) && parsed[0]) return parsed[0]?.url || parsed[0];
    } catch { return null; }
  }
  return null;
}

function TourCard({ tour, T, onOpen }) {
  const { t, lang } = useTranslation();
  const img = tourImage(tour);
  const price = tourPriceLabel(tour, lang);
  // Duración real del tour cuando existe en la base; si no hay, la
  // tarjeta simplemente no la muestra (nunca se inventa).
  const duration = tourDurationLabel(tour);
  const title = localizedTitle(tour, lang);

  return (
    <article
      onClick={() => onOpen(tour)}
      style={{ flex: '0 0 260px', borderRadius: 16, overflow: 'hidden', border: `1px solid ${T.border}`, background: T.card, cursor: 'pointer', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}
    >
      <div style={{ position: 'relative', height: 180, background: 'linear-gradient(135deg,#111,#333)' }}>
        {typeof img === 'string' && img
          ? <OptimizedImage src={img} alt={title || ''} widthRequest={520} srcSetWidths={SRCSET_CARD} sizes="260px" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <div style={{ width: '100%', height: '100%' }} />}
        <span style={{ position: 'absolute', top: 10, left: 10, background: '#fff', color: '#111', fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 999 }}>TOUR</span>
      </div>
      <div style={{ padding: '12px 14px 16px', background: T.card }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: T.text, lineHeight: 1.3, margin: '0 0 8px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{title}</h3>
        <p style={{ fontSize: 14, fontWeight: 800, color: T.text, margin: '0 0 8px' }}>{price || t("revista_precio_no_publicado", "Precio no publicado")}</p>
        {duration && <p style={{ fontSize: 13, color: T.sub, margin: '0 0 8px' }}>⏱ {duration}</p>}
        <span style={{ fontSize: 13, fontWeight: 700, color: T.text, textDecoration: 'underline', textUnderlineOffset: 3 }}>{t("revista_ver_mas_detalles", "Ver más detalles →")}</span>
      </div>
    </article>
  );
}

export default function ToursView({ T, dark, cities, initialTours }) {
  const { t, lang } = useTranslation();
  const [tours, setTours] = useState(initialTours || []);
  const [loading, setLoading] = useState(!initialTours);
  const [selectedCity, setSelectedCity] = useState('todas');
  const routerNavigate = useNavigate();
  // Abrir el tour con articleOrigin: al cerrarlo, la Revista regresa aquí
  // (routerNavigate(-1)) en vez de ir a la lista de la ciudad.
  const openTour = (tour) => routerNavigate(tourCardUrl(tour), { state: { articleOrigin: true } });

  useEffect(() => {
    if (initialTours) return;
    let cancelled = false;
    sb.get('experiences', '?select=id,title,title_en,description_en,city_slug,price,duration,gallery,booking_config,created_at&activity_type=eq.Tour&status=eq.approved&active=eq.true&order=created_at.desc&limit=200')
      .then((res) => { if (!cancelled) setTours(Array.isArray(res) ? res : []); })
      .catch(() => { if (!cancelled) setTours([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [initialTours]);

  const groups = useMemo(() => groupToursByCity(tours, cities || []), [tours, cities]);
  const visibleGroups = selectedCity === 'todas' ? groups : groups.filter((g) => g.slug === selectedCity);
  const minPrice = useMemo(() => {
    const prices = tours.map((t) => Number(t.price)).filter((p) => Number.isFinite(p) && p > 0);
    return prices.length > 0 ? Math.min(...prices) : null;
  }, [tours]);
  const selectedGroup = selectedCity === 'todas' ? null : groups.find((g) => g.slug === selectedCity);

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text }}>
      <Helmet>
        <title>{t("revista_tours_titulo_seo", "Tours en Guadalajara, Tepic, Puerto Vallarta y más | CityMap")}</title>
        <meta name="description" content={t("revista_tours_desc_seo", "Tours guiados y excursiones en Guadalajara, Tepic, Puerto Vallarta, Ciudad de México y más, con precio desde y reserva en línea. Encuentra tu próximo tour en CityMap.")} />
        <link rel="canonical" href="https://citymap.mx/tours" />
      </Helmet>
      {/* Cabecera como la de Revista: logotipo + etiqueta al lado */}
      <div style={{ position: 'sticky', top: 0, zIndex: 40, background: T.glassBg, backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', borderBottom: `1px solid ${T.glassBorder}` }}>
        <div style={{ padding: 'calc(env(safe-area-inset-top, 0px) + 10px) 20px 10px', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <img
              src="/citymap.mx.png"
              alt="CityMap"
              width={127}
              height={38}
              style={{ height: 38, width: 127, objectFit: 'contain', filter: dark ? 'brightness(0) invert(1)' : 'brightness(0)', display: 'block' }}
            />
            <span style={{
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              padding: '3px 8px',
              borderRadius: 6,
              background: dark ? 'rgba(255,255,255,0.15)' : '#0f172a',
              color: '#FFFFFF',
              lineHeight: 1
            }}>
              {t("revista_viajes", "Viajes")}
            </span>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 16px 40px' }}>
        {/* Subtítulo como el de Revista: bajo el logo, sin título grande ni "← Inicio" */}
        <p style={{ fontSize: 13, fontWeight: 600, color: T.sub, margin: '0 0 20px', textAlign: 'center', lineHeight: 1.4 }}>
          {loading ? t("revista_cargando_tours", "Cargando tours…") : selectedGroup
            ? <>{t("revista_mejores_tours_de", "Los mejores tours y experiencias de ")}<span className="exp-city-anim">{selectedGroup.name}</span></>
            : t("revista_tours_resumen", `${tours.length} tours en ${groups.length} ciudades${minPrice ? ` · desde $${Math.round(minPrice).toLocaleString('es-MX')} MXN` : ''}`, {tours: tours.length, cities: groups.length, minPriceText: minPrice ? ` · ${lang === 'en' ? 'from' : 'desde'} $${Math.round(minPrice).toLocaleString(lang === 'en' ? 'en-US' : 'es-MX')} MXN` : ''})}
        </p>

        {!loading && groups.length > 0 && (
          <div className="scroll-fade-x" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, marginBottom: 8, scrollbarWidth: 'none' }}>
            <button
              key="todas"
              onClick={() => setSelectedCity('todas')}
              style={{ flex: '0 0 auto', padding: '8px 14px', borderRadius: 999, border: `1px solid ${T.border}`, background: selectedCity === 'todas' ? T.text : 'transparent', color: selectedCity === 'todas' ? T.bg : T.text, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              {t("todas", "Todas")} ({tours.length})
            </button>
            {groups.map((g) => (
              <button
                key={g.slug}
                onClick={() => setSelectedCity(g.slug)}
                style={{ flex: '0 0 auto', padding: '8px 14px', borderRadius: 999, border: `1px solid ${T.border}`, background: selectedCity === g.slug ? T.text : 'transparent', color: selectedCity === g.slug ? T.bg : T.text, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                {g.name} ({g.count})
              </button>
            ))}
          </div>
        )}

        {!loading && tours.length === 0 && (
          <p style={{ fontSize: 15, color: T.sub }}>{t("revista_sin_tours", "Aún no hay tours publicados. Vuelve pronto.")}</p>
        )}

        {visibleGroups.map((g) => (
          <section key={g.slug} style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 14px' }}>{g.name} · {g.count} {g.count === 1 ? 'tour' : 'tours'}</h2>
            <div className="scroll-fade-x" style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'none' }}>
              {g.tours.map((tour) => (
                <TourCard key={tour.id || tour.slug} tour={tour} T={T} onOpen={openTour} />
              ))}
            </div>
          </section>
        ))}
      </div>
      <Footer />
    </div>
  );
}
