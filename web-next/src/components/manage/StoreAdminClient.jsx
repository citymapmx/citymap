'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { sb } from '../../lib/supabase.js';
import { useAuthStore } from "../../store/useAuthStore.js";

import StoreMonetizationTab from '../store/StoreMonetizationTab.jsx';
import StoreCategoriesTab from '../store/StoreCategoriesTab.jsx';
import StoreProductsTab from '../store/StoreProductsTab.jsx';
import StoreOptionsTab from '../store/StoreOptionsTab.jsx';

export default function StoreAdminClient({ biz }) {
  const router = useRouter();
  const profile = useAuthStore(state => state.profile);
  const user = useAuthStore(state => state.user);

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [view, setView] = useState('cats'); // 'cats' | 'prods' | 'prodForm' | 'opts' | 'optForm'
  
  const [isCatalog, setIsCatalog] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsCatalog(localStorage.getItem(`biz_iscatalog_${biz.id}`) === 'true');
    }
  }, [biz.id]);

  const handleToggleType = (catalog) => {
    setIsCatalog(catalog);
    if (typeof window !== "undefined") {
      localStorage.setItem(`biz_iscatalog_${biz.id}`, catalog);
    }
  };

  const [activeCat, setActiveCat] = useState(null);
  const [activeProd, setActiveProd] = useState(null);
  const [activeOpt, setActiveOpt] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      let data = null;
      try {
        data = await sb.get('store_categories', `?business_id=eq.${biz.id}&select=id,name,sort_order,image_url,store_products(id,name,description,price,image_url,is_available,sort_order,category_id,store_product_options(id,name,type,is_required,store_option_values(id,label,extra_price)))&order=sort_order.asc`);
      } catch {
        data = await sb.get('store_categories', `?business_id=eq.${biz.id}&select=id,name,sort_order,store_products(id,name,description,price,image_url,is_available,sort_order,category_id,store_product_options(id,name,type,is_required,store_option_values(id,label,extra_price)))&order=sort_order.asc`);
      }
      
      if (data) {
        data.forEach(cat => {
            if (cat.store_products) {
              cat.store_products = [...cat.store_products].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
            }
          });
        setCategories(data);
      }
    } catch (error) {
      console.error("Error loading categories", error);
      setCategories([]);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [biz.id]);

  // Mock T object for child components to avoid rewriting them
  const T = { bg: "#f8fafc", white: "#ffffff", border: "#e2e8f0", text: "#0f172a", sub: "#64748b", iconBg: "#f1f5f9" };
  const inpH = { padding: "12px 14px", border: `1.5px solid ${T.border}`, borderRadius: 10, fontSize: 14, fontFamily: "inherit", background: T.white, color: T.text, width: "100%", boxSizing: "border-box" };

  const currentCat = activeCat ? categories.find(c => c.id === activeCat.id) : null;
  const currentProd = (currentCat && activeProd) ? currentCat.store_products.find(p => p.id === activeProd.id) : null;

  return (
    <div className="min-h-screen flex flex-col font-sans" style={{ background: T.bg }}>
      
      {/* HEADER */}
      <div className="sticky top-0 z-20 flex items-center gap-3 p-4 border-b" style={{ background: T.white, borderColor: T.border }}>
        {view !== 'cats' ? (
          <button onClick={() => {
            if (view === 'optForm') setView('opts');
            else if (view === 'opts' || view === 'prodForm') setView('prods');
            else if (view === 'prods') setView('cats');
          }} className="text-gray-900 flex items-center">
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
        ) : (
          <div className="w-6" /> // spacer
        )}
        
        <div className="flex-1 font-black text-[18px] truncate" style={{ color: T.text }}>
          {view === 'cats' && (isCatalog ? "Gestor de Catálogo" : "Gestor de Menú")}
          {view === 'prods' && currentCat?.name}
          {view === 'prodForm' && "Producto"}
          {view === 'opts' && "Opciones: " + currentProd?.name}
          {view === 'optForm' && "Opción del Producto"}
        </div>
        
        <button onClick={() => router.push(`/manage/${biz.id}`)} className="w-9 h-9 rounded-full flex items-center justify-center font-bold" style={{ background: T.iconBg, color: T.text }}>
          X
        </button>
      </div>

      {loading && <div className="p-10 text-center font-bold animate-pulse" style={{ color: T.sub }}>Cargando datos...</div>}

      <div className="flex-1 pb-24">
        {view === 'cats' && !loading && (
          <StoreCategoriesTab business={biz} categories={categories} loadData={loadData} isCatalog={isCatalog} handleToggleType={handleToggleType} setActiveCat={setActiveCat} setView={setView} inpH={inpH} T={T} setLoading={setLoading} isAdmin={profile?.is_admin} />
        )}
        {(view === 'prods' || view === 'prodForm') && currentCat && !loading && (
          <StoreProductsTab business={biz} currentCat={currentCat} activeProd={activeProd} setActiveProd={setActiveProd} view={view} setView={setView} loadData={loadData} isCatalog={isCatalog} setActiveOpt={setActiveOpt} inpH={inpH} T={T} setLoading={setLoading} />
        )}
        {(view === 'opts' || view === 'optForm') && currentProd && !loading && (
          <StoreOptionsTab currentProd={currentProd} activeOpt={activeOpt} setActiveOpt={setActiveOpt} view={view} setView={setView} loadData={loadData} inpH={inpH} T={T} />
        )}

        {view === 'cats' && !loading && (
          <div className="mt-8 mx-4">
            <StoreMonetizationTab business={biz} T={T} />
          </div>
        )}
      </div>
      
    </div>
  );
}
