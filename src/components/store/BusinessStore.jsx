import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { m, AnimatePresence } from 'framer-motion';
import { sb } from '../../lib/supabase.js';
import Icon from '../ui/Icon.jsx';
import OptimizedImage from '../ui/OptimizedImage.jsx';
import ProductModal from './ProductModal.jsx';
import CartDrawer from './CartDrawer.jsx';
import { useCart } from '../../hooks/useCart.js';
import { useUIStore } from '../../store/useUIStore.js';
import { useDataStore } from '../../store/useDataStore.js';
 
import { getThumbUrl, isOpenNow, getSmartScheduleInfo, cleanCityPrefix } from '../../lib/utils.js';
import { FONT_BIZ } from '../../lib/constants.js';
import { Helmet } from 'react-helmet-async';

export default function BusinessStore({ business, T, isElite, inline = false, onBack }) {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [menuSearch, setMenuSearch] = useState('');
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('cg_menu_view') || 'list');
  
  useEffect(() => {
     
    localStorage.setItem('cg_menu_view', viewMode);
  }, [viewMode]);
  const [showToast, setShowToast] = useState(false);
  const [toastName, setToastName] = useState('');
  const [expandedCategories, setExpandedCategories] = useState({});
  const [activeTabId, setActiveTabId] = useState(null);
  const activeTabIdRef = useRef(activeTabId);
  useEffect(() => { activeTabIdRef.current = activeTabId; }, [activeTabId]);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [menuIntent, setMenuIntent] = useState(null);
  const { dark } = useUIStore();
  const { globalFavCounts } = useDataStore();
  const { items, setIsOpen, addItem, removeItem, updateQuantity, clearCart } = useCart();
  const cartTotal = items.reduce((acc, item) => acc + (item.quantity * item.unitTotal), 0);
  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const categoryRefs = useRef({});
  const tabsRef = useRef(null);

  const scrollToCategory = useCallback((catId) => {
    const el = categoryRefs.current[catId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handleAddWithToast = useCallback((product, opts, instructions, qty, bizId) => {
    const success = addItem(product, opts, instructions, qty, bizId);
    if (success) {
      setToastName(product.name);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 1800);
    }
    return success;
  }, [addItem]);

  useEffect(() => {
    async function loadStore() {
      if (!business?.id) return;
      
      // Load categories with products and options
      try {
        let data = null;
        try {
          // Try with image_url first (for category image fallback feature)
          data = await sb.get('store_categories', `?business_id=eq.${business.id}&select=id,name,sort_order,image_url,store_products(id,name,description,price,image_url,is_available,sort_order,category_id,store_product_options(id,name,type,is_required,store_option_values(id,label,extra_price)))&order=sort_order.asc`);
        } catch {
          // Fallback: query without image_url (in case column doesn't have permissions yet)
          data = await sb.get('store_categories', `?business_id=eq.${business.id}&select=id,name,sort_order,store_products(id,name,description,price,image_url,is_available,sort_order,category_id,store_product_options(id,name,type,is_required,store_option_values(id,label,extra_price)))&order=sort_order.asc`);
        }
        
        // PostgREST doesn't support ordering nested resources directly in the main order clause easily without specific syntax, 
        // but we can sort the nested arrays in JS to be safe.
        if (data) {
          data.forEach(cat => {
            if (cat.store_products) {
              cat.store_products = [...cat.store_products].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
            }
          });
           
          setCategories(data);
        }
      } catch (error) {
        console.error("Error loading store:", error);
         
        setCategories([]);
      }
       
      setLoading(false);
    }
    loadStore();
  }, [business?.id]);

  // Filter out empty categories
  const activeCategories = categories.filter(c => c.store_products && c.store_products.length > 0);

  useEffect(() => {
    if (!activeTabId && activeCategories.length > 0) {
       
      setActiveTabId('all');
    }
  }, [activeCategories, activeTabId]);

  // Scroll Spy for categories
  const isClickScrolling = useRef(false);
  const spyTimeout = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (isClickScrolling.current) return; // Don't spy while auto-scrolling
        
        let visibleCatId = null;
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            visibleCatId = entry.target.getAttribute('data-catid');
          }
        });

        if (visibleCatId && visibleCatId !== activeTabIdRef.current) {
          if (spyTimeout.current) clearTimeout(spyTimeout.current);
           
          spyTimeout.current = setTimeout(() => {
             
            setActiveTabId(visibleCatId);
            const tabEl = document.getElementById(`tab-${visibleCatId}`);
            if (tabEl && tabsRef.current) {
              const tabsContainer = tabsRef.current;
              const scrollLeft = tabEl.offsetLeft - (tabsContainer.offsetWidth / 2) + (tabEl.offsetWidth / 2);
              tabsContainer.scrollTo({ left: scrollLeft, behavior: 'smooth' });
            }
          }, 100);
        }
      },
      { rootMargin: '-140px 0px -70% 0px', threshold: 0 }
    );

    Object.values(categoryRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [activeCategories, menuSearch]);

  if (loading) {
    return null;
  }

  if (activeCategories.length === 0) {
    if (inline) {
      return (
        <div style={{ flex: 1, height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center', background: dark ? '#0F172A' : '#F8FAFC' }}>
          <Helmet>
            <meta name="robots" content="noindex, follow" />
          </Helmet>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: dark ? '#1E293B' : '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            <Icon name="store" size={40} color={dark ? '#475569' : '#94A3B8'} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: dark ? '#F8FAFC' : '#0F172A', margin: '0 0 12px 0', fontFamily: FONT_BIZ }}>Menú no disponible</h2>
          <p style={{ fontSize: 15, color: dark ? '#94A3B8' : '#64748B', maxWidth: 300, margin: '0 auto 32px', lineHeight: 1.5 }}>
            Parece que <strong>{business?.name}</strong> aún no ha publicado su menú digital o lo ha desactivado temporalmente.
          </p>
          <button 
            onClick={() => onBack && onBack()} 
            style={{ background: T.green, color: '#fff', border: 'none', padding: '14px 28px', borderRadius: 30, fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
          >
            Ver perfil del negocio
          </button>
        </div>
      );
    }
    return null; // Don't show anything if there is no menu and it's embedded in the profile
  }

  // Filter products by search
  const searchLower = menuSearch.toLowerCase().trim();
  const filteredCategories = searchLower
    ? activeCategories.map(cat => ({
        ...cat,
        store_products: cat.store_products.filter(p =>
          p.is_available && p.name.toLowerCase().includes(searchLower)
        )
      })).filter(cat => cat.store_products.length > 0)
    : activeCategories;

  const previewProducts = [];
  let totalProducts = 0;

  const handleShare = (e) => {
    if (e) e.stopPropagation();
    const city = business.city_slug || 'tepic';
    const cleanSlug = cleanCityPrefix(business.slug, city);
    const url = `${window.location.origin}/${city}/${cleanSlug}/menu`;
    
    if (navigator.share) {
      navigator.share({
        title: `Menú de ${business.name}`,
        text: `Consulta el menú digital y realiza tu pedido en ${business.name}`,
        url: url
      }).catch(err => console.log(err));
    } else {
      navigator.clipboard?.writeText(url);
      alert("¡Enlace del menú copiado al portapapeles!");
    }
  };

  const coverPhoto = business.banner_url || business.logo_url || (business.photos && business.photos[0] ? business.photos[0].url : null);
  const isOpen = isOpenNow(business, business.timezone);
  const scheduleInfo = getSmartScheduleInfo(business, business.timezone);

  return (
    <div style={{ marginTop: inline ? 0 : 24, paddingBottom: (cartCount > 0 && (showMenuModal || inline)) ? 80 : 0 }}>
      {inline && menuIntent === null && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <m.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            style={{ background: dark ? '#1E293B' : '#FFFFFF', width: '100%', maxWidth: 320, borderRadius: 24, padding: '32px 24px', textAlign: 'center', boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}
          >
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: dark ? '#0F172A' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', overflow: 'hidden', border: `3px solid ${dark ? '#1E293B' : '#FFFFFF'}` }}>
              {(business.logo_url || business.logo) ? (
                <OptimizedImage 
                  src={getThumbUrl(business.logo_url || business.logo, 200, 200)} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  alt={business.name} 
                />
              ) : (
                <img src="/pedido.png" alt="Pedido" style={{ width: 40, height: 40, objectFit: 'contain' }} />
              )}
            </div>
            <h2 style={{ margin: '0 0 12px 0', fontSize: 22, fontWeight: 800, color: dark ? '#FFF' : '#111', fontFamily: FONT_BIZ, letterSpacing: '-0.5px' }}>
              ¿Cómo nos visitas hoy?
            </h2>
            <p style={{ margin: '0 0 28px 0', fontSize: 14, color: dark ? '#94A3B8' : '#64748B', lineHeight: 1.5 }}>
              Elige una opción para mostrarte el menú adecuado.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button 
                onClick={() => setMenuIntent('local')}
                className="press"
                style={{ width: '100%', padding: '16px', background: dark ? '#0F172A' : '#F8FAFC', border: `1px solid ${dark ? '#334155' : '#E2E8F0'}`, borderRadius: 16, color: dark ? '#F8FAFC' : '#0F172A', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
              >
                <span style={{ fontSize: 24 }}>🍽️</span>
                Estoy en el local
              </button>
              
              <button 
                onClick={() => setMenuIntent('delivery')}
                className="press"
                style={{ width: '100%', padding: '16px', background: dark ? '#0F172A' : '#F8FAFC', border: `1px solid ${dark ? '#334155' : '#E2E8F0'}`, borderRadius: 16, color: dark ? '#F8FAFC' : '#0F172A', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
              >
                <img src="/pedido.png" alt="Para llevar" style={{ width: 24, height: 24, objectFit: 'contain' }} />
                Para llevar / Domicilio
              </button>
            </div>
          </m.div>
        </div>
      )}
      {!showMenuModal && !inline ? (
        <div style={{ margin: '0 16px', marginBottom: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 16, gap: 12 }}>
            {cartCount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: 400, marginTop: 4, padding: '0 4px' }}>
                <div 
                  onClick={() => setIsOpen(true)} 
                  className="press"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: T.green || '#16A34A' }}
                >
                  <Icon name="shopping-cart" size={18} color="currentColor" />
                  <span style={{ fontSize: 13, fontWeight: 700 }}>Tienes productos en tu carrito</span>
                </div>
                <div 
                  onClick={clearCart} 
                  className="press"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: '#EF4444' }}
                >
                  <Icon name="trash" size={16} color="currentColor" />
                  <span style={{ fontSize: 13, fontWeight: 700 }}>Vaciar</span>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <AnimatePresence>
          <m.div 
             initial={inline ? false : { y: '100%' }}
             animate={inline ? false : { y: 0 }}
             exit={inline ? false : { y: '100%' }}
             transition={inline ? {} : { type: 'spring', damping: 25, stiffness: 200 }}
             style={{ 
               position: inline ? 'relative' : 'fixed', 
               inset: inline ? 'auto' : 0, 
               zIndex: inline ? 'auto' : 80000, 
               background: dark ? '#0F172A' : '#F8FAFC', 
               overflowY: inline ? 'visible' : 'auto',
               minHeight: inline ? '100%' : 'auto'
             }}
          >
            {/* Banner Area (Baryo Style) */}
            <div style={{ position: 'relative', width: '100%', background: dark ? '#0F172A' : '#FFFFFF' }}>
              <div style={{ position: 'relative', width: '100%', height: business.banner_url ? "auto" : 170, aspectRatio: business.banner_url ? "800/340" : "auto", background: '#1E293B' }}>
                {(business.banner_url || (business.photos && business.photos[0] ? business.photos[0].url : null) || business.logo_url) && (
                  <OptimizedImage 
                    src={business.banner_url || (business.photos && business.photos[0] ? business.photos[0].url : null) || business.logo_url} 
                    widthRequest={800}
                    heightRequest={340}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    alt={business.name} 
                  />
                )}
                
                {/* Gradient Overlay fading to background color */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 55%)' }} />
                
                {/* Close/Back Button */}
                <button 
                  className="press"
                  onClick={() => inline ? (onBack && onBack()) : setShowMenuModal(false)}
                  style={{ position: 'absolute', top: 16, left: 16, zIndex: 10, padding: 12, background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#FFF' }}
                >
                  <Icon name={inline ? "arrow_left" : "x"} size={26} style={{ filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.6))" }} />
                </button>

                {/* Share Button */}
                <button 
                  className="press"
                  onClick={handleShare}
                  style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, padding: 12, background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#FFF' }}
                >
                  <Icon name="share" size={26} style={{ filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.6))" }} />
                </button>
              </div>

              {/* Profile Logo Circular Superpuesto */}
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: -45, position: 'relative', zIndex: 3 }}>
                <div style={{ 
                  width: 90, 
                  height: 90, 
                  borderRadius: '50%', 
                  background: '#FFFFFF', 
                  border: `4px solid ${dark ? '#0F172A' : '#FFFFFF'}`,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {(business.logo_url || business.logo) ? (
                    <OptimizedImage 
                      src={getThumbUrl(business.logo_url || business.logo, 200, 200)} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      alt="Logo" 
                    />
                  ) : (
                    <Icon name="store" size={40} color="#6B7280" />
                  )}
                </div>
              </div>

              {/* Business Info under the image */}
              <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginTop: 12, padding: '0 20px 8px' }}>
                <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: dark ? '#FFFFFF' : '#111111', fontFamily: FONT_BIZ, letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {business.name}
                  {(business.plan === "destacado" || business.plan === "premium" || business.plan === "pro") && (
                    <img src="/verificado.png" alt="Verificado" width="22" height="22" style={{ flexShrink: 0, marginTop: 2 }} />
                  )}
                </h1>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 6, marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <img src="/estrella.svg" alt="star" style={{ width: 14, height: 14, marginTop: -2, filter: dark ? 'invert(1)' : 'none' }} />
                    <span style={{ fontSize: 13, fontWeight: 800, color: dark ? '#FFFFFF' : '#111111' }}>
                      {business.rating && !isNaN(parseFloat(String(business.rating).replace(',', '.'))) ? parseFloat(String(business.rating).replace(',', '.')).toFixed(1) : "N/A"}
                    </span>
                    <span style={{ fontSize: 11, color: dark ? '#94A3B8' : '#64748B', fontWeight: 600 }}>({business.review_count || 0})</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Icon name="heart_f" size={14} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: dark ? '#FFFFFF' : '#111111' }}>
                      {globalFavCounts[business.id] || 0}
                    </span>
                  </div>
                </div>

                {menuIntent === 'local' ? (
                  <div style={{ marginTop: 8, fontSize: 16, fontWeight: 700, color: dark ? '#F8FAFC' : '#1E293B', letterSpacing: -0.2 }}>
                    ¡Qué bueno tenerte aquí!
                  </div>
                ) : (
                  <>
                    {!business.hide_location && business.address && (
                      <div style={{ fontSize: 13, color: dark ? '#94A3B8' : '#6B7280', marginTop: 4, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {business.address}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, justifyContent: 'center' }}>
                       <Icon name="clock" size={14} color={isOpen ? "#10B981" : "#EF4444"} />
                       <span style={{ fontSize: 13, fontWeight: 700, color: isOpen ? "#10B981" : "#EF4444" }}>
                         {scheduleInfo?.text?.[0] || (isOpen ? "Abierto" : "Cerrado")}
                       </span>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <div style={{ paddingBottom: cartCount > 0 ? 100 : 80 }}>
      {/* Sticky Header: Search + Tabs */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: dark ? '#0F172A' : '#FFFFFF', paddingBottom: 12, paddingTop: 4, borderBottom: `1px solid ${dark ? '#1E293B' : '#F1F5F9'}` }}>
        {/* Search & Toggle */}
        <div style={{ padding: '0 16px', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}><Icon name="search" size={16} color={dark ? '#94A3B8' : '#6B7280'} /></span>
            <input
              type="text"
              value={menuSearch}
              onChange={e => setMenuSearch(e.target.value)}
              placeholder="Buscar en el menú"
              style={{ width: '100%', padding: '12px 16px 12px 40px', borderRadius: 12, border: 'none', background: dark ? '#1E293B' : '#F3F4F6', color: dark ? '#FFFFFF' : '#111111', fontSize: 15, fontWeight: 500, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }}
            />
            {menuSearch && <button onClick={() => setMenuSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}><Icon name="x" size={16} color={dark ? '#94A3B8' : '#6B7280'} /></button>}
          </div>
          <div style={{ display: 'flex', background: dark ? '#1E293B' : '#F3F4F6', borderRadius: 12, padding: 4 }}>
            <button 
              onClick={() => setViewMode('grid')}
              style={{ background: viewMode === 'grid' ? (dark ? '#334155' : '#FFFFFF') : 'transparent', border: 'none', width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: viewMode === 'grid' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s', color: viewMode === 'grid' ? (dark ? '#FFFFFF' : '#111111') : '#94A3B8' }}
            >
              <Icon name="grid" size={18} color="currentColor" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              style={{ background: viewMode === 'list' ? (dark ? '#334155' : '#FFFFFF') : 'transparent', border: 'none', width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: viewMode === 'list' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s', color: viewMode === 'list' ? (dark ? '#FFFFFF' : '#111111') : '#94A3B8' }}
            >
              <Icon name="list" size={18} color="currentColor" />
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        {activeCategories.length > 1 && (
          <div ref={tabsRef} style={{ padding: '0 16px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <div style={{ display: 'inline-flex', gap: 8 }}>
              {[{id: 'all', name: 'Todos'}, ...activeCategories].map(cat => {
                const isActive = activeTabId === cat.id;
                return (
                  <button
                    key={cat.id}
                    id={`tab-${cat.id}`}
                    onClick={() => { 
                      setMenuSearch(''); 
                      setActiveTabId(cat.id);
                      isClickScrolling.current = true;
                      
                      if (cat.id === 'all') {
                        window.scrollTo({ top: tabsRef.current?.offsetTop - 140 || 0, behavior: 'smooth' });
                      } else {
                        const el = categoryRefs.current[cat.id];
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                      
                      setTimeout(() => { isClickScrolling.current = false; }, 800);
                    }}
                    style={{
                      background: isActive ? (dark ? '#FFFFFF' : '#111111') : (dark ? '#1E293B' : '#F3F4F6'),
                      color: isActive ? (dark ? '#111111' : '#FFFFFF') : (dark ? '#E2E8F0' : '#111111'),
                      border: 'none',
                      padding: '6px 14px',
                      borderRadius: 16,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      transition: 'all 0.2s',
                      textTransform: 'uppercase',
                    }}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {filteredCategories.length === 0 && searchLower && (
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <Icon name="search" size={32} color={T.border} />
          <p style={{ marginTop: 12, fontSize: 15, color: T.sub, fontWeight: 600 }}>No se encontraron productos para "{menuSearch}"</p>
        </div>
      )}

      <div style={{ paddingTop: 16 }}>
      {(searchLower ? filteredCategories : activeCategories).map(cat => {
        const availableProducts = cat.store_products.filter(p => p.is_available);
        const isExpanded = expandedCategories[cat.id];
        const visibleProducts = isExpanded ? availableProducts : availableProducts.slice(0, 6);
        const hasMore = availableProducts.length > 6;

        return (
          <m.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10px" }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            key={cat.id} data-catid={cat.id} ref={el => categoryRefs.current[cat.id] = el} style={{ marginBottom: 24, scrollMarginTop: '130px' }}>
            <div style={{ margin: '0 16px 12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: 19, fontWeight: 800, color: dark ? '#F87171' : '#EF4444', margin: 0, letterSpacing: '-0.5px', textTransform: 'uppercase' }}>{cat.name}</h3>
            </div>
            
            <div style={
              viewMode === 'list' ? { 
                display: 'flex', 
                flexDirection: 'column', 
                background: dark ? '#1E293B' : '#FFFFFF',
                borderRadius: 20,
                margin: '0 16px',
                boxShadow: dark ? '0 2px 10px rgba(0,0,0,0.2)' : '0 2px 12px rgba(0,0,0,0.04)',
                border: `1px solid ${dark ? '#334155' : '#F3F4F6'}`,
                overflow: 'hidden'
              } : {
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 12,
                margin: '0 16px',
              }
            }>
              {visibleProducts.map((product, index) => {
                const hasOptions = product.store_product_options && product.store_product_options.length > 0;
                const cartItems = items.filter(i => i.product.id === product.id);
                const totalInCart = cartItems.reduce((acc, i) => acc + i.quantity, 0);
                const productWithCategory = { ...product, cat_name: cat.name };

                let calculatedPrice = Number(product.price) || 0;
                let isFromPrice = false;
                if (hasOptions) {
                  let requiredMinAdd = 0;
                  let hasVariableOptions = false;
                  product.store_product_options.forEach(opt => {
                    if (opt.is_required && opt.store_option_values && opt.store_option_values.length > 0) {
                      const minOptPrice = Math.min(...opt.store_option_values.map(v => Number(v.extra_price) || 0));
                      requiredMinAdd += minOptPrice;
                    }
                    if (opt.store_option_values && opt.store_option_values.some(v => Number(v.extra_price) > 0)) {
                      hasVariableOptions = true;
                    }
                  });
                  if (requiredMinAdd > 0) {
                    calculatedPrice += requiredMinAdd;
                    isFromPrice = true;
                  } else if (calculatedPrice === 0 && hasVariableOptions) {
                    isFromPrice = true;
                  }
                }

                return (
                <div 
                  key={product.id} 
                  onClick={() => menuIntent !== 'local' ? setSelectedProduct(productWithCategory) : null}
                  style={{ 
                    display: 'flex', 
                    cursor: menuIntent !== 'local' ? 'pointer' : 'default',
                    flexDirection: viewMode === 'grid' ? 'column' : 'row',
                    alignItems: 'stretch',
                    position: 'relative',
                    background: viewMode === 'grid' ? (dark ? '#1E293B' : '#FFFFFF') : 'transparent',
                    borderRadius: viewMode === 'grid' ? 16 : 0,
                    overflow: viewMode === 'grid' ? 'hidden' : 'visible',
                    border: viewMode === 'grid' ? `1px solid ${dark ? '#334155' : '#F3F4F6'}` : 'none',
                    borderBottom: (viewMode === 'list' && index < visibleProducts.length - 1) ? `1px solid ${dark ? '#334155' : '#E5E7EB'}` : (viewMode === 'grid' ? `1px solid ${dark ? '#334155' : '#F3F4F6'}` : 'none'),
                    boxShadow: viewMode === 'grid' ? (dark ? '0 2px 10px rgba(0,0,0,0.2)' : '0 2px 12px rgba(0,0,0,0.04)') : 'none',
                  }}
                >
                  {/* Image */}
                  {(product.image_url || viewMode === 'grid') && (
                    <div style={viewMode === 'list' ? { width: 120, height: 120, margin: 12, flexShrink: 0, position: 'relative' } : { width: '100%', aspectRatio: '1', position: 'relative', flexShrink: 0 }}>
                      <div style={{ width: '100%', height: '100%', borderRadius: viewMode === 'list' ? 16 : 0, overflow: 'hidden', background: dark ? '#334155' : '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {product.image_url ? (
                          <OptimizedImage src={product.image_url} widthRequest={400} heightRequest={400} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                        ) : (
                          <Icon name="image" size={32} color={dark ? '#475569' : '#CBD5E1'} />
                        )}
                      </div>
                      {/* Promo Badge */}
                      {product.badge === 'PROMO' && (
                        <div style={{ position: 'absolute', top: viewMode === 'grid' ? 8 : 0, left: viewMode === 'grid' ? 8 : 0, background: '#E11D48', color: '#FFF', fontSize: 10, fontWeight: 900, padding: '4px 8px', borderRadius: viewMode === 'grid' ? 8 : '16px 0 16px 0', textTransform: 'uppercase', zIndex: 2 }}>
                          PROMO
                        </div>
                      )}
                    </div>
                  )}

                  <div style={viewMode === 'list' ? { flex: 1, display: "flex", flexDirection: "column", padding: "16px 56px 16px 16px", position: 'relative' } : { flex: 1, display: "flex", flexDirection: "column", padding: "12px", position: 'relative' }}>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", textAlign: 'left' }}>
                      <div style={{ fontSize: viewMode === 'grid' ? 14 : 16, fontWeight: 800, color: dark ? '#F8FAFC' : '#111111', marginBottom: 4, lineHeight: 1.3, wordBreak: 'break-word', textTransform: 'uppercase' }}>
                        {product.name}
                      </div>
                      
                      {product.description && viewMode === 'list' && (
                        <div style={{ fontSize: 13, color: dark ? '#94A3B8' : '#6B7280', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4, marginBottom: 8, paddingRight: 8 }}>
                          {product.description}
                        </div>
                      )}

                      {hasOptions && viewMode === 'list' && (
                        <div style={{ fontSize: 13, color: dark ? '#94A3B8' : '#6B7280', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 3, lineHeight: 1.3, paddingTop: 4 }}>
                          {product.store_product_options.map(opt => {
                            if (!opt.store_option_values || opt.store_option_values.length === 0) return null;
                            const isCleanToggle = opt.store_option_values.length === 1 && opt.store_option_values[0].label.toLowerCase() === 'sí';
                            const isSize = opt.name.toLowerCase().includes('tamaño') || opt.name.toLowerCase().includes('size');
                            const base = Number(product.price) || 0;
                            const showAbsolute = isSize || base === 0;

                            if (menuIntent !== 'local' && !showAbsolute) return null;

                            if (isCleanToggle) {
                               const extra = Number(opt.store_option_values[0].extra_price || 0);
                               if (showAbsolute) {
                                 return (
                                   <div key={opt.id} style={{ fontSize: 16, fontWeight: 900, color: dark ? '#F8FAFC' : '#111111', marginTop: 4 }}>
                                     {opt.name} ${base + extra}
                                   </div>
                                 );
                               }
                               return <div key={opt.id}>• {opt.name}{extra > 0 ? ` (+$${extra})` : ''}</div>;
                            }
                            const vals = opt.store_option_values.map(v => {
                               const ext = Number(v.extra_price || 0);
                               if (showAbsolute) {
                                 return `${v.label} $${base + ext}`;
                               }
                               return `${v.label}${ext > 0 ? ` (+$${ext})` : ''}`;
                            }).join(' • ');
                            
                            if (showAbsolute) {
                               return (
                                 <div key={opt.id} style={{ fontSize: 16, fontWeight: 900, color: dark ? '#F8FAFC' : '#111111', marginTop: 4 }}>
                                   {vals}
                                 </div>
                               );
                            }
                            
                            return (
                              <div key={opt.id}>
                                <span style={{ fontWeight: 700 }}>{opt.name}:</span> {vals}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      
                      {(() => {
                        const addToCartControls = menuIntent !== 'local' ? (
                          <div style={
                            viewMode === 'list' 
                              ? { position: 'absolute', bottom: 12, right: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }
                              : { display: 'flex', alignItems: 'center', justifyContent: 'center' }
                          }>
                            {totalInCart === 0 ? (
                              <m.button 
                                whileTap={{ scale: 0.75 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (hasOptions) {
                                    setSelectedProduct(productWithCategory);
                                  } else {
                                    handleAddWithToast(productWithCategory, [], "", 1, business.id);
                                  }
                                }}
                                style={{ width: 32, height: 32, borderRadius: '50%', background: '#374151', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, outline: 'none' }}
                              >
                                <Icon name="plus" size={16} color="#FFF" />
                              </m.button>
                            ) : (
                              <div 
                                onClick={(e) => { 
                                  if (hasOptions) {
                                     // allow bubble to open modal
                                  } else {
                                     e.stopPropagation(); 
                                  }
                                }} 
                                style={{ display: 'flex', alignItems: 'center', background: dark ? '#1E293B' : '#FFFFFF', border: `1px solid ${dark ? '#334155' : '#E2E8F0'}`, borderRadius: 24, padding: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
                              >
                                <m.button 
                                  whileTap={{ scale: 0.8 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (hasOptions) {
                                       const lastCartItem = cartItems[cartItems.length - 1];
                                       if (lastCartItem.quantity === 1) removeItem(lastCartItem.id);
                                       else updateQuantity(lastCartItem.id, lastCartItem.quantity - 1);
                                    } else {
                                       const cartItem = cartItems[0];
                                       if (cartItem.quantity === 1) removeItem(cartItem.id);
                                       else updateQuantity(cartItem.id, cartItem.quantity - 1);
                                    }
                                  }}
                                  style={{ width: 28, height: 28, borderRadius: '50%', background: dark ? '#334155' : '#F1F5F9', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', outline: 'none' }}
                                ><Icon name="minus" size={16} color="#374151" /></m.button>
                                
                                <div style={{ fontSize: 14, fontWeight: 800, color: dark ? '#F8FAFC' : '#0F172A', minWidth: 24, textAlign: 'center' }}>{totalInCart}</div>
                                
                                <m.button 
                                  whileTap={{ scale: 0.8 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (hasOptions) {
                                       setSelectedProduct(productWithCategory);
                                    } else {
                                       handleAddWithToast(productWithCategory, [], "", 1, business.id);
                                    }
                                  }}
                                  style={{ width: 28, height: 28, borderRadius: '50%', background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', outline: 'none' }}
                                ><Icon name="plus" size={16} color="#374151" /></m.button>
                              </div>
                            )}
                          </div>
                        ) : null;

                        const base = Number(product.price) || 0;
                        const hasSizeOption = hasOptions && product.store_product_options.some(o => o.name.toLowerCase().includes('tamaño') || o.name.toLowerCase().includes('size'));
                        const hideMainPrice = hasOptions && (base === 0 || hasSizeOption);
                        
                        if (hideMainPrice && viewMode === 'list') {
                          return addToCartControls;
                        }
                        
                        const priceContent = (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {product.old_price && (
                               <span style={{ fontSize: viewMode === 'grid' ? 12 : 14, color: '#9CA3AF', textDecoration: 'line-through', fontWeight: 600 }}>
                                 ${Number(product.old_price).toFixed(0)}
                               </span>
                            )}
                            <span style={{ fontSize: viewMode === 'grid' ? 14 : 16, fontWeight: 900, color: dark ? '#F8FAFC' : '#111111' }}>
                              {isFromPrice && <span style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', marginRight: 4 }}>Desde</span>}
                              ${Number(calculatedPrice).toFixed(calculatedPrice % 1 === 0 ? 0 : 2)}
                            </span>
                          </div>
                        );

                        return (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: (hasOptions && viewMode === 'list') ? 8 : 'auto', minHeight: 32 }}>
                            {!hideMainPrice ? priceContent : <div />}
                            {addToCartControls}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              );
              })}
            </div>
            
            {hasMore && (
              <button 
                onClick={() => setExpandedCategories(prev => ({ ...prev, [cat.id]: !prev[cat.id] }))} 
                style={{ width: '100%', padding: '12px 0', background: 'transparent', border: 'none', color: dark ? '#94A3B8' : '#64748B', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, transition: 'color 0.2s' }}
              >
                {isExpanded ? 'Mostrar menos' : `Ver todo (${availableProducts.length})`}
                <Icon name="chevron" size={16} color={dark ? '#94A3B8' : '#64748B'} style={{ transform: isExpanded ? 'rotate(-90deg)' : 'rotate(90deg)', transition: 'transform 0.3s ease' }} />
              </button>
            )}
          </m.div>
        );
      })}
        {filteredCategories.length > 0 && (
          <div style={{ padding: '24px 20px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: dark ? '#64748B' : '#94A3B8', lineHeight: 1.5, opacity: 0.8, margin: 0, fontWeight: 500 }}>
              Aviso legal: Los precios, imágenes y descripciones son administrados por cada negocio y pueden cambiar. CityMap no se responsabiliza por diferencias al momento de la compra.
            </p>
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', opacity: 1 }}>
              <img src="/citymap.mx.png" alt="CityMap" style={{ height: 60, filter: "brightness(0)" }} />
            </div>
          </div>
        )}
      </div>
            </div>
          </m.div>
        </AnimatePresence>
      )}

      {/* Toast Notification */}
      {showToast && (
        <div style={{
          position: 'fixed',
          top: 40,
          left: '50%',
          transform: 'translateX(-50%)',
          background: dark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          color: '#ffffff',
          padding: '8px 16px 8px 12px',
          borderRadius: 30,
          fontSize: 13,
          fontWeight: 600,
          boxShadow: '0 12px 32px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.1)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          animation: 'toastIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          whiteSpace: 'nowrap',
          maxWidth: '90%'
        }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="check" size={12} color="#fff" sw={2.5} />
          </div>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>Agregado: {toastName}</span>
        </div>
      )}

      {/* Floating Cart Button */}
      {cartCount > 0 && menuIntent !== 'local' && (showMenuModal || inline) && (
        <div style={{ position: 'fixed', bottom: 20, left: 16, right: 16, zIndex: 90000 }}>
          <button onClick={() => setIsOpen(true)} style={{ width: '100%', background: '#0F172A', color: '#FFFFFF', border: 'none', borderRadius: 16, padding: '14px 20px', fontSize: 16, fontWeight: 800, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 8px 32px rgba(15, 23, 42, 0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#FFFFFF' }}>{cartCount}</div>
              <span style={{ fontSize: 16, fontWeight: 600 }}>•</span>
              <span style={{ fontSize: 16 }}>Ver carrito</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>${cartTotal.toFixed(2)}</span>
              <Icon name="chevron" size={16} color="#fff" />
            </div>
          </button>
        </div>
      )}

      {selectedProduct && (
        <ProductModal 
          product={selectedProduct} 
          businessId={business.id}
          onClose={() => setSelectedProduct(null)} 
          T={T} 
          menuIntent={menuIntent}
        />
      )}

      <CartDrawer business={business} T={T} />

      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
