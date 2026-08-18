import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sb } from '../lib/supabase.js';
import Icon from '../components/ui/Icon.jsx';
import OptimizedImage from '../components/ui/OptimizedImage.jsx';
import BusinessStore from '../components/store/BusinessStore.jsx';
import { FONT_BIZ } from '../lib/constants.js';
import { isOpenNow, getThumbUrl, cleanCityPrefix } from '../lib/utils.js';
import { Helmet } from 'react-helmet-async';
import { useUIStore } from '../store/useUIStore.js';

export default function MenuView({ T, dark, navigate: propNavigate }) {
  const { city, slug } = useParams();
  const setSelected = useUIStore(s => s.setSelected);
  const routerNavigate = useNavigate();
  const navigate = propNavigate || routerNavigate;
  const [biz, setBiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadBiz() {
      try {
        setLoading(true);
        const dataList = await sb.get('businesses', `?select=*&or=(slug.eq.${slug},slug.eq.${city}-${slug})&limit=1`);
        if (!dataList || dataList.length === 0) throw new Error("Not found");
        
        let businessData = dataList[0];
        if (typeof businessData.schedule === 'string') {
          try {
            businessData.schedule = JSON.parse(businessData.schedule);
          } catch(e) {
            businessData.schedule = {};
          }
        }
        
        setBiz(businessData);
      } catch (err) {
        console.error("Error loading biz for menu:", err);
        setError("Negocio no encontrado");
      } finally {
        setLoading(false);
      }
    }
    loadBiz();
  }, [city, slug]);

  if (loading) {
    return <div style={{ minHeight: '100vh', background: dark ? '#0F172A' : '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Helmet>
        <title>Menú - CityMap</title>
      </Helmet>
      <div style={{ width: 30, height: 30, border: `3px solid ${dark ? '#1E293B' : '#E2E8F0'}`, borderTop: `3px solid ${dark ? '#3B82F6' : '#2563EB'}`, borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
    </div>;
  }

  if (error || !biz) {
    return <div style={{ minHeight: '100vh', background: dark ? '#0F172A' : '#F8FAFC', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: dark ? '#F8FAFC' : '#0F172A' }}>
      <Helmet>
        <title>Menú no encontrado - CityMap</title>
      </Helmet>
      <Icon name="store" size={48} color={dark ? '#334155' : '#CBD5E1'} />
      <h3 style={{ marginTop: 16 }}>{error || "No encontrado"}</h3>
      <button onClick={() => navigate('/')} style={{ marginTop: 16, padding: '10px 20px', background: T.green, color: '#fff', border: 'none', borderRadius: 20, fontWeight: 700, cursor: 'pointer' }}>Volver al inicio</button>
    </div>;
  }

  const isOpen = isOpenNow(biz, biz.timezone);
  const isElite = biz.plan === 'destacado' || biz.plan === 'premium';
  
  // Try to use a cover photo or first photo
  const coverPhoto = biz.banner_url || biz.logo_url || (biz.photos && biz.photos[0] ? biz.photos[0].url : null);

  return (
    <div style={{ minHeight: '100vh', background: dark ? '#0F172A' : '#FFFFFF', display: 'flex', flexDirection: 'column' }}>
      <Helmet>
        <title>Menú de {biz.name} — {biz.type || (biz.category ? biz.category.charAt(0).toUpperCase() + biz.category.slice(1) : "Negocio")} en {city.charAt(0).toUpperCase() + city.slice(1)} | CityMap</title>
        <meta name="description" content={`Descubre el menú completo de ${biz.name} en ${city.charAt(0).toUpperCase() + city.slice(1)}. Conoce sus platillos, precios y haz tu pedido fácilmente.`} />
        <meta property="og:title" content={`Menú de ${biz.name} — ${biz.type || (biz.category ? biz.category.charAt(0).toUpperCase() + biz.category.slice(1) : "Negocio")} en ${city.charAt(0).toUpperCase() + city.slice(1)} | CityMap`} />
        <meta property="og:description" content={`Descubre el menú completo de ${biz.name} en ${city.charAt(0).toUpperCase() + city.slice(1)}. Conoce sus platillos, precios y haz tu pedido fácilmente.`} />
        {coverPhoto && <meta property="og:image" content={coverPhoto} />}
        <meta name="theme-color" content={dark ? '#0F172A' : '#FFFFFF'} />
      </Helmet>

      <div style={{ flex: 1, position: 'relative' }}>
        <BusinessStore business={biz} T={T} isElite={isElite} inline={true} onBack={() => {
          setSelected(biz);
          const navCity = biz.city_slug || city;
          const navSlug = cleanCityPrefix(biz.slug || '', navCity) || slug;
          navigate(`/${navCity}/${navSlug}`);
        }} />
      </div>
    </div>
  );
}
