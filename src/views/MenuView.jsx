import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { sb } from '../lib/supabase.js';
import Icon from '../components/ui/Icon.jsx';
import BusinessStore from '../components/store/BusinessStore.jsx';
import MenuLoadingScreen from '../components/store/MenuLoadingScreen.jsx';
import { fetchStoreCategories } from '../lib/storeCategories.js';
import NoMenuLanding from '../components/store/NoMenuLanding.jsx';
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

  // Carga única del menú (hallazgo #2, nov 2026): las categorías se
  // piden en cuanto se conoce el negocio, en paralelo al resto, y la
  // MISMA pantalla de carga cubre negocio + categorías (antes eran
  // dos esqueletos en secuencia: el del negocio y «Cargando menú…»).
  // Sin menú (no elite) no se piden categorías: va directo al landing.
  const isElite = !!biz && (biz.plan === 'destacado' || biz.plan === 'premium' || biz.plan === 'pro');
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['store-categories', biz?.id],
    queryFn: () => fetchStoreCategories(biz.id),
    enabled: !!biz?.id && isElite,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (biz && (!selected || selected.id !== biz.id)) {
      setSelected(biz);
    }
  }, [biz, selected, setSelected]);

  if (loading || (biz && categoriesLoading)) {
    // Una sola pantalla de carga: con el negocio ya conocido muestra
    // su tema, su logo y su nombre; sin él, la misma pantalla en
    // neutro. El contenido se rellena en la misma pantalla, no hay
    // un segundo esqueleto distinto después.
    return (
      <>
        <Helmet><title>Cargando productos… - CityMap</title></Helmet>
        <MenuLoadingScreen business={biz || null} storeLabel="menú" dark={dark} />
      </>
    );
  }

  if (error || !biz) {
    return <div style={{ minHeight: '100vh', background: dark ? '#18181B' : '#F4F4F5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: dark ? '#F4F4F5' : '#18181B' }}>
      <Helmet>
        <title>Menú no encontrado - CityMap</title>
      </Helmet>
      <Icon name="store" size={48} color={dark ? '#3F3F46' : '#D4D4D8'} />
      <h3 style={{ marginTop: 16 }}>{error || "No encontrado"}</h3>
      <button onClick={() => navigate('/')} style={{ marginTop: 16, padding: '10px 20px', background: T.green, color: '#fff', border: 'none', borderRadius: 20, fontWeight: 700, cursor: 'pointer' }}>Volver al inicio</button>
    </div>;
  }

  if (!isElite) {
    return (
      <NoMenuLanding business={biz} T={T} dark={dark} onBack={() => {
        const navCity = biz.city_slug || city;
        const navSlug = cleanCityPrefix(biz.slug || '', navCity) || slug;
        navigate(`/${navCity}/${navSlug}`);
      }} />
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: dark ? '#18181B' : '#FFFFFF', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <BusinessStore business={biz} T={T} isElite={isElite} inline={true} initialIntent={initialIntent} initialCategories={categoriesData || []} onBack={() => {
          setSelected(biz);
          const navCity = biz.city_slug || city;
          const navSlug = cleanCityPrefix(biz.slug || '', navCity) || slug;
          navigate(`/${navCity}/${navSlug}`);
        }} />
      </div>
    </div>
  );
}

