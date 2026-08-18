import React, { useState, useEffect } from 'react';
import { sb } from '../../lib/supabase.js';
import Icon from '../ui/Icon.jsx';
import OptimizedImage from '../ui/OptimizedImage.jsx';
import { getThumbUrl, cleanCityPrefix, createSlug } from '../../lib/utils.js';
import { lazy, Suspense } from "react";
import { useAuthStore } from "../../store/useAuthStore.js";
import AiMenuImporter from '../AiMenuImporter.jsx';

const Uploader = lazy(() => import('../Uploader.jsx'));
import StoreMonetizationTab from './StoreMonetizationTab.jsx';
import StoreCategoriesTab from './StoreCategoriesTab.jsx';
import StoreProductsTab from './StoreProductsTab.jsx';
import StoreOptionsTab from './StoreOptionsTab.jsx';

export default function StoreAdminPanel({ business, onClose, T }) {
  const profile = useAuthStore(state => state.profile);
  const user = useAuthStore(state => state.user);

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Views: 'cats' | 'prods' | 'prodForm' | 'opts' | 'optForm'
  const [view, setView] = useState('cats');
  
  const [isCatalog, setIsCatalog] = useState(() => localStorage.getItem(`biz_iscatalog_${business.id}`) === 'true');
  const handleToggleType = (catalog) => {
    setIsCatalog(catalog);
    localStorage.setItem(`biz_iscatalog_${business.id}`, catalog);
  };

  const [activeCat, setActiveCat] = useState(null);
  const [activeProd, setActiveProd] = useState(null);
  const [activeOpt, setActiveOpt] = useState(null);


  const loadData = async () => {
    setLoading(true);
    try {
      let data = null;
      try {
        data = await sb.get('store_categories', `?business_id=eq.${business.id}&select=id,name,sort_order,image_url,store_products(id,name,description,price,image_url,is_available,sort_order,category_id,store_product_options(id,name,type,is_required,store_option_values(id,label,extra_price)))&order=sort_order.asc`);
      } catch {
        // Fallback in case image_url column isn't ready or has permission issues
        data = await sb.get('store_categories', `?business_id=eq.${business.id}&select=id,name,sort_order,store_products(id,name,description,price,image_url,is_available,sort_order,category_id,store_product_options(id,name,type,is_required,store_option_values(id,label,extra_price)))&order=sort_order.asc`);
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

  useEffect(() => { loadData(); }, [business.id]);

  



  // Shared Styles
  const inpH = { padding: "12px 14px", border: `1.5px solid ${T.border}`, borderRadius: 10, fontSize: 14, fontFamily: "inherit", background: T.white, color: T.text, width: "100%", boxSizing: "border-box" };

  // Re-find active items to keep them fresh after loadData
  const currentCat = activeCat ? categories.find(c => c.id === activeCat.id) : null;
  const currentProd = (currentCat && activeProd) ? currentCat.store_products.find(p => p.id === activeProd.id) : null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', flexDirection: 'column', background: T.bg, animation: 'slideUp .3s cubic-bezier(0.16, 1, 0.3, 1)', overflowY: 'auto' }}>
        
        {/* HEADER */}
        <div style={{ padding: "16px", background: T.bg, borderBottom: `1px solid ${T.border}`, position: "sticky", top: 0, zIndex: 10, display: "flex", alignItems: "center", gap: 12 }}>
          {view !== 'cats' && (
            <button onClick={() => {
              if (view === 'optForm') setView('opts');
              else if (view === 'opts' || view === 'prodForm') setView('prods');
              else if (view === 'prods') setView('cats');
            }} style={{ background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}><Icon name="chevron" size={20} color={T.text} style={{ transform: "rotate(180deg)" }} /></button>
          )}
          <div style={{ flex: 1, fontSize: 18, fontWeight: 800, color: T.text }}>
            {view === 'cats' && (isCatalog ? "Gestor de Catálogo" : "Gestor de Menú")}
            {view === 'prods' && currentCat?.name}
            {view === 'prodForm' && "Producto"}
            {view === 'opts' && "Opciones: " + currentProd?.name}
            {view === 'optForm' && "Opción del Producto"}
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: "50%", background: T.border, color: T.text, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icon name="x" size={16} /></button>
        </div>

        {/* LOADING */}
        {loading && <div style={{ padding: 40, textAlign: 'center', color: T.sub }}>Cargando...</div>}

        {/* 1. CATEGORIES VIEW */}
        {!loading && view === 'cats' && (
          <div style={{ paddingBottom: 32 }}>
            <StoreCategoriesTab
              business={business}
              categories={categories}
              loadData={loadData}
              isCatalog={isCatalog}
              handleToggleType={handleToggleType}
              setActiveCat={setActiveCat}
              setView={setView}
              inpH={inpH}
              T={T}
              setLoading={setLoading}
            />
            
            <div style={{ padding: "0 16px" }}>
              {/* QR CODES SECTION */}
            <div style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid ${T.border}` }}>
              <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 16, overflow: 'hidden', marginBottom: 24 }}>
                <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}`, background: T.bg, display: "flex", alignItems: "center", gap: 8, fontWeight: 800, fontSize: 13, color: T.text, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  <Icon name="maximize" size={16} /> Códigos QR del Negocio
                </div>
                
                <div style={{ padding: 20 }}>
                  <p style={{ fontSize: 13, color: T.sub, margin: "0 0 16px 0", lineHeight: 1.5 }}>Descarga los códigos QR listos para imprimir y colocar en las mesas o publicidad. ¡Nunca caducan!</p>
                  
                  <div style={{ display: "flex", gap: 12 }}>
                    <button 
                      onClick={async () => {
                        const city = business.city_slug || 'merida';
                        const slug = cleanCityPrefix(business.slug || createSlug(business.name || ''), city);
                        const url = `https://citymap.mx/${city}/${slug}`;
                        try {
                          const res = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=1024x1024&data=${encodeURIComponent(url)}`);
                          const blob = await res.blob();
                          const a = document.createElement("a");
                          a.href = URL.createObjectURL(blob);
                          a.download = `QR_Perfil_${business.name.replace(/\s+/g, '_')}.png`;
                          a.click();
                        } catch(e) { alert("Error al generar QR"); }
                      }} 
                      style={{ flex: 1, padding: "20px 14px", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12, color: T.text, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, transition: "all 0.2s" }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = T.green}
                      onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
                    >
                      <div style={{ background: T.white, padding: 12, borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
                        <Icon name="user" size={28} color={T.text} />
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontWeight: 800, fontSize: 14 }}>Descargar QR de Perfil</div>
                        <div style={{ fontSize: 12, color: T.sub, marginTop: 4 }}>Lleva al perfil completo</div>
                      </div>
                    </button>
                    
                    <button 
                      onClick={async () => {
                        const city = business.city_slug || 'merida';
                        const slug = cleanCityPrefix(business.slug || createSlug(business.name || ''), city);
                        const url = `https://citymap.mx/${city}/${slug}/menu`;
                        try {
                          const res = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=1024x1024&data=${encodeURIComponent(url)}`);
                          const blob = await res.blob();
                          const a = document.createElement("a");
                          a.href = URL.createObjectURL(blob);
                          a.download = `QR_Menu_${business.name.replace(/\s+/g, '_')}.png`;
                          a.click();
                        } catch(e) { alert("Error al generar QR"); }
                      }} 
                      style={{ flex: 1, padding: "20px 14px", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12, color: T.text, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, transition: "all 0.2s" }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = T.green}
                      onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
                    >
                      <div style={{ background: T.white, padding: 12, borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
                        <Icon name="list" size={28} color={T.text} />
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontWeight: 800, fontSize: 14 }}>Descargar QR del Menú</div>
                        <div style={{ fontSize: 12, color: T.sub, marginTop: 4 }}>Abre directo el menú</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <StoreMonetizationTab business={business} T={T} inpH={inpH} profile={profile} />
            </div>
          </div>
        )}

        {/* 2. PRODUCTS VIEW */}
        {/* PRODUCTS & PRODUCT FORM VIEW */}
        {!loading && currentCat && (view === 'prods' || view === 'prodForm') && (
          <StoreProductsTab 
            business={business}
            currentCat={currentCat}
            loadData={loadData}
            isCatalog={isCatalog}
            activeProd={activeProd}
            setActiveProd={setActiveProd}
            view={view}
            setView={setView}
            inpH={inpH}
            T={T}
          />
        )}

        
        {/* ML VIEW */}


        {/* 4. OPTIONS VIEW */}
        {!loading && currentProd && (view === 'opts' || view === 'optForm') && (
          <StoreOptionsTab
            currentProd={currentProd}
            loadData={loadData}
            view={view}
            setView={setView}
            inpH={inpH}
            T={T}
          />
        )}

    </div>
  );
}
