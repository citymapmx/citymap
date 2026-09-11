import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { sb } from '../lib/supabase.js';
import Icon from '../components/ui/Icon.jsx';
import BusinessStore from '../components/store/BusinessStore.jsx';
import { isOpenNow, cleanCityPrefix } from '../lib/utils.js';
import { Helmet } from 'react-helmet-async';
import { useUIStore } from '../store/useUIStore.js';
import { useQuery } from '@tanstack/react-query';

export default function MenuView({ T, dark, navigate: propNavigate }) {
  const { city, slug } = useParams();
  const setSelected = useUIStore(s => s.setSelected);
  const selected = useUIStore(s => s.selected);
  const routerNavigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const navigate = propNavigate || routerNavigate;
  const initialIntent = location.state?.intent || searchParams.get('intent') || null;

  const isMatch = selected && (selected.slug === slug || selected.id === slug || selected.slug === `${city}-${slug}`);

  const { data: biz, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['business-menu', slug],
    initialData: isMatch ? selected : undefined,
    queryFn: async () => {
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
      return businessData;
    },
    staleTime: 5 * 60 * 1000,
  });

  const error = queryError ? "Negocio no encontrado" : null;

  if (loading) {
    return (
      <>
        <Helmet><title>Cargando menú... - CityMap</title></Helmet>
        <SkeletonMenu dark={dark} />
      </>
    );
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
        <BusinessStore business={biz} T={T} isElite={isElite} inline={true} initialIntent={initialIntent} onBack={() => {
          setSelected(biz);
          const navCity = biz.city_slug || city;
          const navSlug = cleanCityPrefix(biz.slug || '', navCity) || slug;
          navigate(`/${navCity}/${navSlug}`);
        }} />
      </div>
    </div>
  );
}

function SkeletonMenu({ dark }) {
  const bg = dark ? '#1E293B' : '#E2E8F0';
  const shimmer = `linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)`;
  
  return (
    <div style={{ minHeight: '100vh', background: dark ? '#0F172A' : '#FFFFFF', display: 'flex', flexDirection: 'column' }}>
      {/* Banner */}
      <div style={{ height: 200, width: '100%', background: bg, position: 'relative', overflow: 'hidden' }}>
        <div className="skeleton-shimmer" style={{ width: '100%', height: '100%', background: shimmer }} />
      </div>
      
      <div style={{ padding: '0 16px', position: 'relative', top: -30 }}>
        {/* Logo */}
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: bg, border: `4px solid ${dark ? '#0F172A' : '#FFFFFF'}`, overflow: 'hidden', position: 'relative' }}>
          <div className="skeleton-shimmer" style={{ width: '100%', height: '100%', background: shimmer }} />
        </div>
        
        {/* Name & Subtitle */}
        <div style={{ width: '60%', height: 24, background: bg, borderRadius: 8, marginTop: 12, overflow: 'hidden', position: 'relative' }}>
           <div className="skeleton-shimmer" style={{ width: '100%', height: '100%', background: shimmer }} />
        </div>
        <div style={{ width: '40%', height: 16, background: bg, borderRadius: 8, marginTop: 8, overflow: 'hidden', position: 'relative' }}>
           <div className="skeleton-shimmer" style={{ width: '100%', height: '100%', background: shimmer }} />
        </div>
      </div>
      
      {/* List items */}
      <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{ display: 'flex', gap: 16 }}>
             <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
               <div style={{ width: '80%', height: 18, background: bg, borderRadius: 4, overflow: 'hidden', position: 'relative' }}><div className="skeleton-shimmer" style={{ width: '100%', height: '100%', background: shimmer }} /></div>
               <div style={{ width: '100%', height: 14, background: bg, borderRadius: 4, overflow: 'hidden', position: 'relative' }}><div className="skeleton-shimmer" style={{ width: '100%', height: '100%', background: shimmer }} /></div>
               <div style={{ width: '60%', height: 14, background: bg, borderRadius: 4, overflow: 'hidden', position: 'relative' }}><div className="skeleton-shimmer" style={{ width: '100%', height: '100%', background: shimmer }} /></div>
             </div>
             <div style={{ width: 80, height: 80, background: bg, borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
               <div className="skeleton-shimmer" style={{ width: '100%', height: '100%', background: shimmer }} />
             </div>
          </div>
        ))}
      </div>
      
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .skeleton-shimmer {
          animation: shimmer 1.5s infinite linear;
        }
      `}</style>
    </div>
  );
}
