import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { sb } from '../../lib/supabase.js';
import Icon from '../ui/Icon.jsx';
import OptimizedImage from '../ui/OptimizedImage.jsx';
import { getThumbUrl, cleanCityPrefix } from '../../lib/utils.js';
import { CITY_TZ } from '../../lib/constants.js';
import { useDataStore } from '../../store/useDataStore.js';
import { isCatalogBusiness } from '../../lib/storePresentation.js';
import { eventCalendarDay, eventCoversDay, isListedEvent, formatEventCardDate } from '../../lib/eventListing.js';

// Lo que ve quien llega a /:ciudad/:negocio/menu cuando ese negocio aún no
// tiene menú digital visible: en vez de un callejón sin salida, la página
// convierte la visita (que llega de Google) en puerta de entrada al sitio:
// aviso + WhatsApp del negocio, los eventos de hoy en esa ciudad y los
// restaurantes cercanos que sí tienen menú. Las dos secciones se ocultan
// si no hay nada que mostrar; si no hay ni eventos ni menús, queda el
// botón para explorar la ciudad.
export default function NoMenuLanding({ business, T, dark, onBack }) {
  const navigate = useNavigate();
  const cities = useDataStore(s => s.cities);
  const city = business?.city_slug || 'tepic';
  const cityName = cities.find(c => c.slug === city)?.name
    || (city.charAt(0).toUpperCase() + city.slice(1).replace(/-/g, ' '));
  const isCatalog = isCatalogBusiness(business);
  const storeLabel = isCatalog ? 'catálogo' : 'menú';
  const [todayEvents, setTodayEvents] = useState(null);
  const [upcomingEvents, setUpcomingEvents] = useState(null);
  const [nearbyMenus, setNearbyMenus] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!business?.id) return;
      const timeZone = CITY_TZ[city] || 'America/Mazatlan';
      const today = eventCalendarDay(Date.now(), timeZone);
      try {
        const events = await sb.get('events', `?select=id,title,slug,date,end_date,time,venue_name,img_url,img,city_slug,status,active,visibility&or=(city_slug.ilike.*${city}*,city_slug.eq.all)&date=gte.${today}&status=eq.approved&active=eq.true&visibility=neq.private&order=date.asc,time.asc&limit=20`);
        if (cancelled || !Array.isArray(events)) return;
        const listed = events.filter(ev => isListedEvent(ev, today));
        const todayList = listed.filter(ev => eventCoversDay(ev, today)).slice(0, 4);
        setTodayEvents(todayList);
        setUpcomingEvents(todayList.length === 0 ? listed.slice(0, 4) : []);
      } catch {
        if (!cancelled) { setTodayEvents([]); setUpcomingEvents([]); }
      }
      try {
        const categories = await sb.get('store_categories', '?select=business_id,store_products(id)');
        if (cancelled || !Array.isArray(categories)) return;
        const ids = [...new Set(categories
          .filter(c => (c.store_products || []).length > 0)
          .map(c => c.business_id))];
        if (ids.length === 0) { setNearbyMenus([]); return; }
        const bizs = await sb.get('businesses', `?select=id,name,slug,city_slug,logo_url,plan&city_slug=eq.${city}&plan=in.(destacado,premium,pro)&id=in.(${ids.join(',')})&limit=8`);
        if (cancelled) return;
        setNearbyMenus((Array.isArray(bizs) ? bizs : []).filter(b => b.id !== business.id).slice(0, 6));
      } catch {
        if (!cancelled) setNearbyMenus([]);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [business?.id, city]);

  const timeZone = CITY_TZ[city] || 'America/Mazatlan';
  const today = eventCalendarDay(Date.now(), timeZone);
  const eventsToShow = todayEvents && todayEvents.length > 0 ? todayEvents : upcomingEvents;
  const eventsTitle = todayEvents && todayEvents.length > 0 ? `Hoy en ${cityName}` : `Próximos eventos en ${cityName}`;
  const whatsappDigits = (business?.whatsapp || '').replace(/\D/g, '');
  const showSections = (eventsToShow && eventsToShow.length > 0) || (nearbyMenus && nearbyMenus.length > 0);

  return (
    <div style={{ minHeight: '100vh', background: dark ? '#18181B' : '#FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 20px 40px', boxSizing: 'border-box' }}>
      <Helmet>
        <title>{`Menú de ${business?.name || ''} en ${cityName} | Precios y Pedidos`}</title>
      </Helmet>
      <div style={{ width: 72, height: 72, borderRadius: '50%', background: dark ? '#232326' : '#E4E4E7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <Icon name="store" size={32} color={dark ? '#71717A' : '#A1A1AA'} />
      </div>
      <h2 style={{ fontWeight: 800, fontSize: 20, margin: '0 0 10px', color: dark ? '#F4F4F5' : '#18181B', textAlign: 'center' }}>{storeLabel === 'catálogo' ? 'Catálogo no disponible' : 'Menú no disponible'}</h2>
      <p style={{ fontSize: 14, color: dark ? '#A1A1AA' : '#71717A', lineHeight: 1.6, margin: '0 0 24px', textAlign: 'center', maxWidth: 340 }}>
        Parece que <strong style={{ color: dark ? '#F4F4F5' : '#18181B' }}>{business?.name}</strong> aún no ha publicado su {storeLabel} digital o lo ha desactivado temporalmente.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 340 }}>
        {whatsappDigits && (
          <a href={`https://wa.me/${whatsappDigits}?text=${encodeURIComponent(`Hola ${business?.name || ''}, ¿me pueden compartir su menú?`)}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 20px', background: '#25D366', color: '#FFFFFF', border: 'none', borderRadius: 24, fontWeight: 800, fontSize: 14, cursor: 'pointer', textDecoration: 'none', fontFamily: 'inherit' }}>
            Preguntar por el menú en WhatsApp
          </a>
        )}
        <button onClick={() => onBack && onBack()} style={{ padding: '12px 28px', background: dark ? '#F4F4F5' : '#18181B', color: dark ? '#18181B' : '#fff', border: 'none', borderRadius: 24, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Ver perfil del negocio</button>
      </div>

      {eventsToShow && eventsToShow.length > 0 && (
        <div style={{ width: '100%', maxWidth: 560, marginTop: 36, textAlign: 'left' }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: dark ? '#FAFAFA' : '#18181B', margin: '0 0 4px' }}>{eventsTitle}</h3>
          <p style={{ fontSize: 13, color: dark ? '#A1A1AA' : '#71717A', margin: '0 0 14px' }}>Mientras tanto, esto hay en {cityName}.</p>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
            {eventsToShow.map(ev => {
              const img = ev.img_url || ev.img;
              return (
                <div key={ev.id} onClick={() => navigate(`/evento/${ev.slug || ev.id}`)} className="press" style={{ flexShrink: 0, width: 248, background: dark ? '#232326' : '#FFFFFF', border: `1px solid ${dark ? '#3F3F46' : '#E5E7EB'}`, borderRadius: 16, overflow: 'hidden', cursor: 'pointer', boxShadow: dark ? '0 2px 10px rgba(0,0,0,0.2)' : '0 2px 12px rgba(0,0,0,0.04)' }}>
                  {img ? (
                    <OptimizedImage src={getThumbUrl(img, 400)} style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} alt="" />
                  ) : (
                    <div style={{ width: '100%', height: 120, background: dark ? '#3F3F46' : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="image" size={28} color={dark ? '#71717A' : '#D4D4D8'} />
                    </div>
                  )}
                  <div style={{ padding: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: dark ? '#FAFAFA' : '#111111', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 4 }}>{ev.title}</div>
                    <div style={{ fontSize: 12, color: dark ? '#A1A1AA' : '#6B7280', fontWeight: 600 }}>{formatEventCardDate(ev, { today })}{ev.venue_name ? ` · ${ev.venue_name}` : ''}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <button onClick={() => navigate(`/eventos/${city}`)} style={{ marginTop: 6, padding: 0, background: 'none', border: 'none', color: dark ? '#FAFAFA' : '#18181B', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline', textUnderlineOffset: 3 }}>Ver todos los eventos en {cityName}</button>
        </div>
      )}

      {nearbyMenus && nearbyMenus.length > 0 && (
        <div style={{ width: '100%', maxWidth: 560, marginTop: 32, textAlign: 'left' }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: dark ? '#FAFAFA' : '#18181B', margin: '0 0 4px' }}>{isCatalog ? 'Catálogos cerca de ti' : 'Restaurantes con menú cerca'}</h3>
          <p style={{ fontSize: 13, color: dark ? '#A1A1AA' : '#71717A', margin: '0 0 14px' }}>Estos lugares en {cityName} sí tienen su {storeLabel} publicado.</p>
          <div style={{ display: 'flex', flexDirection: 'column', background: dark ? '#232326' : '#FFFFFF', borderRadius: 20, border: `1px solid ${dark ? '#3F3F46' : '#F3F4F6'}`, overflow: 'hidden', boxShadow: dark ? '0 2px 10px rgba(0,0,0,0.2)' : '0 2px 12px rgba(0,0,0,0.04)' }}>
            {nearbyMenus.map((b, index) => {
              const cleanSlug = cleanCityPrefix(b.slug || b.id, city);
              return (
                <div key={b.id} onClick={() => navigate(`/${city}/${cleanSlug}/menu`)} className="press" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer', borderBottom: index < nearbyMenus.length - 1 ? `1px solid ${dark ? '#3F3F46' : '#E5E7EB'}` : 'none' }}>
                  {b.logo_url ? (
                    <OptimizedImage src={getThumbUrl(b.logo_url, 100, 100)} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} alt="" />
                  ) : (
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: dark ? '#3F3F46' : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon name="store" size={22} color={dark ? '#71717A' : '#A1A1AA'} />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: dark ? '#FAFAFA' : '#111111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.name}</div>
                    <div style={{ fontSize: 12, color: dark ? '#A1A1AA' : '#6B7280', fontWeight: 600 }}>Ver menú</div>
                  </div>
                  <Icon name="chevron_right" size={20} color={dark ? '#71717A' : '#9CA3AF'} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {todayEvents !== null && nearbyMenus !== null && !showSections && (
        <button onClick={() => navigate(`/${city}`)} style={{ marginTop: 32, padding: '12px 28px', background: 'transparent', color: dark ? '#FAFAFA' : '#18181B', border: `1px solid ${dark ? '#3F3F46' : '#E5E7EB'}`, borderRadius: 24, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Explorar {cityName}</button>
      )}
    </div>
  );
}
