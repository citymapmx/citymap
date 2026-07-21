import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sb } from '../../lib/supabase.js';
import Icon from '../ui/Icon.jsx';
import ProductModal from './ProductModal.jsx';
import CartDrawer from './CartDrawer.jsx';
import { useCart } from '../../hooks/useCart.js';
import { useUIStore } from '../../store/useUIStore.js';
import { getThumbUrl } from '../../lib/utils.js';

export default function BusinessStore({ business, T, isElite }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [menuSearch, setMenuSearch] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastName, setToastName] = useState('');
  const [expandedCategories, setExpandedCategories] = useState({});
  const [activeTabId, setActiveTabId] = useState(null);
  const [showMenuModal, setShowMenuModal] = useState(false);
  
  const { dark } = useUIStore();
  const { items, setIsOpen, addItem, removeItem, updateQuantity } = useCart();
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
              cat.store_products.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
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

  if (loading) {
    return <div style={{ padding: 20, textAlign: 'center', color: T.sub }}>Cargando menú...</div>;
  }

  if (activeCategories.length === 0) {
    return null; // Don't show anything if there is no menu
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
  // Build a map of categoryId → category image_url for fallback
  const catImgMap = {};
  for (const cat of activeCategories) {
    if (cat.image_url) catImgMap[cat.id] = cat.image_url;
  }
  for (const cat of activeCategories) {
    for (const p of cat.store_products) {
      if (p.is_available) {
        totalProducts++;
        if (previewProducts.length < 4) {
          previewProducts.push({ ...p, _catImg: catImgMap[p.category_id] });
        }
      }
    }
  }

  return (
    <div style={{ marginTop: 24, paddingBottom: cartCount > 0 ? 80 : 0 }}>
      {!showMenuModal ? (
        <div style={{ margin: '0 16px' }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: dark ? '#fff' : '#0F172A', letterSpacing: "-0.5px" }}>Menú</div>
            {totalProducts > 4 && (
              <div onClick={() => setShowMenuModal(true)} style={{ fontSize: 13, fontWeight: 700, color: '#16A34A', cursor: "pointer" }}>Ver todo</div>
            )}
          </div>

          <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 10, paddingLeft: 2, scrollSnapType: "x mandatory" }} className="no-scrollbar">
            {previewProducts.map((p, i) => (
              <div key={p.id} onClick={() => setShowMenuModal(true)} style={{ flexShrink: 0, cursor: "pointer", scrollSnapAlign: "start", position: "relative" }}>
                <div style={{ width: 84, height: 84, borderRadius: "50%", overflow: "hidden", background: dark ? '#334155' : '#f1f5f9', border: `2.5px solid ${dark ? '#475569' : '#E2E8F0'}`, boxShadow: "0 4px 12px rgba(0,0,0,0.08)", position: "relative" }}>
                  {(() => {
                    const imgSrc = p.image_url || p._catImg;
                    if (imgSrc) return <img src={getThumbUrl(imgSrc, 200, 200)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />;
                    const colors = ['#6366F1','#F97316','#10B981','#EC4899','#3B82F6','#F59E0B','#8B5CF6','#14B8A6'];
                    const bg = colors[p.name.charCodeAt(0) % colors.length];
                    const bg2 = colors[(p.name.charCodeAt(0) + 3) % colors.length];
                    return <div style={{ width: "100%", height: "100%", background: `linear-gradient(135deg, ${bg}, ${bg2})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 900, color: "rgba(255,255,255,0.9)", fontFamily: "'Outfit', sans-serif" }}>{p.name.charAt(0).toUpperCase()}</div>;
                  })()}
                  {i === 3 && totalProducts > 4 && (
                    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 16 }}>
                      +{totalProducts - 4}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
            <button 
               className="press"
               onClick={() => setShowMenuModal(true)} 
               style={{ width: '100%', maxWidth: 300, padding: '14px 20px', borderRadius: 30, background: '#F97316', border: 'none', color: '#FFFFFF', fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer' }}
            >
              <img src="/food.svg" style={{ width: 20, height: 20, filter: 'brightness(0) invert(1)' }} alt="" />
              Ver menú completo
            </button>
          </div>
        </div>
      ) : (
        <AnimatePresence>
          <motion.div 
             initial={{ y: '100%' }}
             animate={{ y: 0 }}
             exit={{ y: '100%' }}
             transition={{ type: 'spring', damping: 25, stiffness: 200 }}
             style={{ position: 'fixed', inset: 0, zIndex: 80000, background: dark ? '#0F172A' : '#F8FAFC', overflowY: 'auto' }}
          >
            {/* Header with Close Button */}
            <div style={{ position: 'sticky', top: 0, zIndex: 101, background: dark ? '#0F172A' : '#F8FAFC', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${dark ? '#1E293B' : '#E2E8F0'}` }}>
               <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: dark ? '#F8FAFC' : '#0F172A' }}>Menú</h2>
               <button onClick={() => setShowMenuModal(false)} style={{ background: dark ? '#1E293B' : '#E2E8F0', border: 'none', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                 <Icon name="x" size={20} color={dark ? '#F8FAFC' : '#0F172A'} />
               </button>
            </div>
            
            <div style={{ paddingBottom: 100 }}>
      
      {/* Sticky Header: Tabs + Search */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: dark ? '#0F172A' : '#FFFFFF', paddingBottom: 16, paddingTop: 8, borderBottom: `1px solid ${dark ? '#1E293B' : '#F1F5F9'}` }}>
        {/* Category Tabs */}
        {activeCategories.length > 1 && (
          <div ref={tabsRef} style={{ padding: '0 16px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <div style={{ display: 'inline-flex', gap: 4, background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', padding: 4, borderRadius: 24, position: 'relative' }}>
              {[{id: 'all', name: 'Todos'}, ...activeCategories].map(cat => {
                const isActive = activeTabId === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => { 
                      setMenuSearch(''); 
                      setActiveTabId(cat.id); 
                      window.scrollTo({ top: tabsRef.current?.offsetTop - 80 || 0, behavior: 'smooth' });
                    }}
                    style={{
                      position: 'relative',
                      zIndex: 1,
                      background: 'transparent',
                      color: isActive ? '#FFFFFF' : (dark ? '#E2E8F0' : '#1E293B'),
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: 20,
                      fontSize: 14,
                      fontWeight: 800,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      transition: 'color 0.2s',
                    }}
                  >
                    {isActive && (
                      <motion.div layoutId="storeTabIndicator" style={{ position: "absolute", inset: 0, background: "#F97316", borderRadius: 20, zIndex: -1, boxShadow: "0 2px 8px rgba(249, 115, 22, 0.3)" }} transition={{ type: "spring", bounce: 0.25, duration: 0.5 }} />
                    )}
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Search */}
        <div style={{ padding: '16px 16px 0', position: 'relative' }}>
          <span style={{ position: 'absolute', left: 32, top: '50%', transform: 'translateY(-50%)', marginTop: 8 }}><Icon name="search" size={16} color={dark ? '#94A3B8' : '#94A3B8'} /></span>
          <input
            type="text"
            value={menuSearch}
            onChange={e => setMenuSearch(e.target.value)}
            placeholder="Buscar en el menú..."
            style={{ width: '100%', padding: '12px 16px 12px 42px', borderRadius: 14, border: `1px solid ${dark ? '#334155' : '#E2E8F0'}`, background: dark ? '#1E293B' : '#FFFFFF', color: T.text, fontSize: 15, fontWeight: 500, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }}
          />
          {menuSearch && <button onClick={() => setMenuSearch('')} style={{ position: 'absolute', right: 28, top: '50%', transform: 'translateY(-50%)', marginTop: 6, background: 'none', border: 'none', cursor: 'pointer' }}><Icon name="x" size={14} color={T.sub} /></button>}
        </div>
      </div>

      {filteredCategories.length === 0 && searchLower && (
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <Icon name="search" size={32} color={T.border} />
          <p style={{ marginTop: 12, fontSize: 15, color: T.sub, fontWeight: 600 }}>No se encontraron productos para "{menuSearch}"</p>
        </div>
      )}

      {(activeTabId === 'all' || searchLower ? filteredCategories : filteredCategories.filter(c => c.id === activeTabId)).map(cat => {
        const availableProducts = cat.store_products.filter(p => p.is_available);
        const isExpanded = expandedCategories[cat.id];
        const visibleProducts = isExpanded ? availableProducts : availableProducts.slice(0, 6);
        const hasMore = availableProducts.length > 6;

        return (
          <div key={cat.id} ref={el => categoryRefs.current[cat.id] = el} style={{ marginBottom: 24, scrollMarginTop: '130px' }}>
            <div style={{ background: '#1A1A1A', margin: '0 16px 12px 16px', padding: '12px 16px', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#FFFFFF', margin: 0, letterSpacing: '-0.3px' }}>{cat.name}</h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {visibleProducts.map(product => {
                const hasOptions = product.store_product_options && product.store_product_options.length > 0;
                const cartItems = items.filter(i => i.product.id === product.id);
                const totalInCart = cartItems.reduce((acc, i) => acc + i.quantity, 0);
                const productWithCategory = { ...product, name: `${product.name} (${cat.name})` };

                return (
                <div 
                  key={product.id} 
                  onClick={() => setSelectedProduct(productWithCategory)}
                  style={{ 
                    display: 'flex', 
                    background: dark ? '#1E293B' : '#FFFFFF',
                    border: `1px solid ${dark ? '#334155' : '#E2E8F0'}`,
                    borderRadius: 12,
                    marginBottom: 10,
                    cursor: 'pointer',
                    alignItems: 'stretch',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {/* Image on Left */}
                  {product.image_url && (
                    <div style={{ width: 140, background: dark ? '#334155' : '#F8FAFC', flexShrink: 0, overflow: 'hidden', borderRadius: 12 }}>
                      <img src={getThumbUrl(product.image_url, 400, 300)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" loading="lazy" />
                    </div>
                  )}

                  <div style={{ flex: 1, display: "flex", alignItems: 'center', minHeight: product.image_url ? 100 : 'auto', padding: "12px 16px" }}>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", textAlign: 'left' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: dark ? '#F8FAFC' : '#0F172A', marginBottom: 4, lineHeight: 1.2 }}>
                        {product.badge ? product.badge + ' ' : ''}{product.name}
                      </div>
                      
                      {product.description && (
                        <div style={{ fontSize: 13, color: dark ? '#94A3B8' : '#64748B', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4, marginBottom: 8, paddingRight: 8 }}>
                          {product.description}
                        </div>
                      )}
                      
                      <div style={{ fontSize: 15, fontWeight: 800, color: dark ? '#F8FAFC' : '#0F172A' }}>
                        ${Number(product.price).toFixed(2)}
                      </div>
                    </div>

                    <div style={{ marginLeft: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {totalInCart === 0 ? (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (hasOptions) {
                              setSelectedProduct(productWithCategory);
                            } else {
                              handleAddWithToast(productWithCategory, [], "", 1, business.id);
                            }
                          }}
                          style={{ width: 36, height: 36, borderRadius: '50%', background: dark ? '#1E293B' : '#FFFFFF', border: `1px solid ${dark ? '#334155' : '#E2E8F0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', flexShrink: 0, transition: 'transform 0.1s' }}
                        >
                          <Icon name="plus" size={16} color="#F97316" />
                        </button>
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
                          <button 
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
                            style={{ width: 28, height: 28, borderRadius: '50%', background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                          ><Icon name="minus" size={14} color="#F97316" /></button>
                          
                          <div style={{ fontSize: 14, fontWeight: 800, color: dark ? '#F8FAFC' : '#0F172A', minWidth: 24, textAlign: 'center' }}>{totalInCart}</div>
                          
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (hasOptions) {
                                 setSelectedProduct(productWithCategory);
                              } else {
                                 handleAddWithToast(productWithCategory, [], "", 1, business.id);
                              }
                            }}
                            style={{ width: 28, height: 28, borderRadius: '50%', background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                          ><Icon name="plus" size={14} color="#F97316" /></button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
              })}
            </div>
            
            {hasMore && (
              <button 
                onClick={() => setExpandedCategories(prev => ({ ...prev, [cat.id]: !prev[cat.id] }))} 
                style={{ width: 'calc(100% - 32px)', margin: '12px 16px 0', padding: '14px', background: dark ? '#1E293B' : '#F8FAFC', border: `1px solid ${dark ? '#334155' : '#E2E8F0'}`, borderRadius: 12, color: dark ? '#F8FAFC' : '#0F172A', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, transition: 'background 0.2s' }}
              >
                {isExpanded ? 'Mostrar menos' : `Ver todo (${availableProducts.length})`}
                <Icon name="chevron" size={16} color={dark ? '#94A3B8' : '#64748B'} style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(-90deg)' }} />
              </button>
            )}
          </div>
        );
      })}
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Toast Notification */}
      {showToast && (
        <div style={{
          position: 'fixed',
          top: 80,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#059669',
          color: '#fff',
          padding: '12px 24px',
          borderRadius: 30,
          fontSize: 14,
          fontWeight: 700,
          boxShadow: '0 8px 24px rgba(5, 150, 105, 0.4)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          animation: 'toastIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          whiteSpace: 'nowrap'
        }}>
          <Icon name="check" size={16} color="#fff" /> ¡{toastName} agregado!
        </div>
      )}

      {/* Floating Cart Button */}
      {cartCount > 0 && (
        <div style={{ position: 'fixed', bottom: 20, left: 16, right: 16, zIndex: 90000 }}>
          <button onClick={() => setIsOpen(true)} style={{ width: '100%', background: '#0F172A', color: '#FFFFFF', border: 'none', borderRadius: 16, padding: '14px 20px', fontSize: 16, fontWeight: 800, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 8px 32px rgba(15, 23, 42, 0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#F97316', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff', boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.2)' }}>{cartCount}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="shopping-cart" size={20} color="#fff" />
                <span style={{ fontSize: 16 }}>Ver carrito</span>
              </div>
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
