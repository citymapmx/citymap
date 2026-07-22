import React, { useState, useRef } from 'react';
import Icon from '../ui/Icon.jsx';
import OptimizedImage from '../ui/OptimizedImage.jsx';
import { useCart } from '../../hooks/useCart.js';
import { useUIStore } from '../../store/useUIStore.js';
import { buildWhatsAppMessage } from '../../lib/storeUtils.js';
import { getThumbUrl } from '../../lib/utils.js';
import { sb } from '../../lib/supabase.js';

export default function CartDrawer({ business, T }) {
  const { items, isOpen, setIsOpen, removeItem, updateQuantity, updateNotes, getCartTotal, clearCart } = useCart();
  const { dark } = useUIStore();
  const [customerName, setCustomerName] = useState('');
  const [orderType, setOrderType] = useState('pickup'); // 'pickup' | 'delivery'
  const [address, setAddress] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [errors, setErrors] = useState({});
  const nameRef = useRef(null);

  if (!isOpen) return null;

  const total = getCartTotal();
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  const handleCheckout = () => {
    const newErrors = {};
    if (!customerName.trim()) {
      newErrors.name = "Por favor ingresa tu nombre para continuar";
    }
    if (orderType === 'delivery' && !address.trim()) {
      newErrors.address = "Por favor ingresa la dirección de envío";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (newErrors.name && nameRef.current) {
        nameRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => nameRef.current?.focus(), 400);
      }
      return;
    }
    setErrors({});
    
    if (!business?.whatsapp) {
      alert("Este negocio no tiene número de WhatsApp configurado.");
      return;
    }

    const message = buildWhatsAppMessage(items, business, customerName, orderType, address, generalNotes);
    const encoded = encodeURIComponent(message);
    let waNumber = business.whatsapp.replace(/\D/g, '');
    if (!waNumber.startsWith('52')) waNumber = '52' + waNumber; // Default to Mexico if missing country code

    const url = `https://wa.me/${waNumber}?text=${encoded}`;
    window.open(url, '_blank');
    
    // Track analytics event
    try {
      sb.post("analytics", { 
        biz_id: business.id, 
        event_type: "menu_order", 
        city_slug: business.city_slug || 'all' 
      });
    } catch (e) {
      console.error(e);
    }
    
    // Vaciar el carrito y cerrar el modal tras enviar el pedido
    clearCart();
    if (onClose) onClose();
  };

  // Shared input style
  const inputStyle = {
    width: '100%', padding: '14px 16px', borderRadius: 14,
    border: `1px solid ${dark ? '#334155' : '#E2E8F0'}`,
    background: dark ? '#1E293B' : '#F8FAFC',
    color: dark ? '#F1F5F9' : '#0F172A',
    fontSize: 16, fontWeight: 500, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s'
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', flexDirection: 'column', background: dark ? '#0F172A' : '#FFFFFF', animation: 'slideUp .3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
      {/* Header */}
      <div style={{ height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', background: dark ? '#0F172A' : '#FFFFFF', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 900, color: dark ? '#F8FAFC' : '#0F172A', letterSpacing: '-0.5px' }}>Tu pedido</div>
          {business?.name && <div style={{ fontSize: 15, color: dark ? '#64748B' : '#64748B', fontWeight: 500 }}>{business.name}</div>}
        </div>
        <button onClick={() => setIsOpen(false)} style={{ width: 36, height: 36, borderRadius: '50%', background: dark ? '#1E293B' : '#F1F5F9', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Icon name="x" size={18} color={dark ? '#94A3B8' : '#334155'} /></button>
      </div>

      {items.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Icon name="shopping-bag" size={48} color={T.border} />
          <p style={{ marginTop: 16, fontSize: 16, color: T.sub, textAlign: 'center', fontWeight: 600 }}>Tu carrito está vacío</p>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 120 }}>
          {/* Item Count Badge */}
          <div style={{ padding: '4px 20px 16px', display: 'flex', alignItems: 'center' }}>
            <div style={{ background: dark ? '#334155' : '#F1F5F9', borderRadius: 20, padding: '8px 16px', fontSize: 14, fontWeight: 800, color: dark ? '#F8FAFC' : '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="shopping-bag" size={16} color="#F97316" />
              {itemCount} {itemCount === 1 ? 'artículo' : 'artículos'}
            </div>
          </div>

          {/* Item List */}
          <div style={{ padding: '0 20px' }}>
            {items.map(item => (
              <div key={item.id} style={{ padding: '20px 0', borderBottom: `1px solid ${dark ? '#1E293B' : '#F1F5F9'}`, display: 'flex', gap: 16 }}>
                
                {/* Product Thumbnail */}
                {item.product.image_url && (
                  <div style={{ width: 72, height: 72, borderRadius: 16, overflow: 'hidden', flexShrink: 0, background: dark ? '#334155' : '#E2E8F0' }}>
                    <OptimizedImage src={item.product.image_url} widthRequest={200} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                  </div>
                )}

                {/* Item Details & Controls */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: dark ? '#F8FAFC' : '#0F172A', paddingRight: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product.name}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: dark ? '#F8FAFC' : '#0F172A', flexShrink: 0 }}>${(Number(item.product.price) * item.quantity).toFixed(2)}</div>
                  </div>
                  
                  {/* Options */}
                  {item.selectedOptions && item.selectedOptions.length > 0 && (
                    <div style={{ marginBottom: 6 }}>
                      {item.selectedOptions.map((opt, i) => {
                        const values = Array.isArray(opt.value) ? opt.value : [opt.value];
                        const labels = values.map(v => v.label).join(', ');
                        
                        let displayText = labels;
                        let extraPriceSum = 0;
                        if (labels.toLowerCase() === 'sí') {
                          const v = values[0];
                          const extraPriceNum = Number(v.extra_price || 0);
                          const isOmit = !v.extra_price || extraPriceNum === 0;
                          displayText = isOmit ? `Sin ${opt.name.toLowerCase()}` : opt.name;
                          extraPriceSum = extraPriceNum;
                        } else if (opt.name) {
                          displayText = `${opt.name}: ${labels}`;
                          extraPriceSum = values.reduce((sum, v) => sum + Number(v.extra_price || 0), 0);
                        } else {
                          extraPriceSum = values.reduce((sum, v) => sum + Number(v.extra_price || 0), 0);
                        }

                        return (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: 13, color: dark ? '#94A3B8' : '#475569', lineHeight: 1.4, textAlign: 'left', fontWeight: 500 }}>
                            <span>• {displayText}</span>
                            {extraPriceSum > 0 && (
                              <span style={{ flexShrink: 0, paddingLeft: 8 }}>+${(extraPriceSum * item.quantity).toFixed(2)}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Editable Notes */}
                  <input
                    type="text"
                    value={item.specialInstructions || ''}
                    onChange={e => updateNotes(item.id, e.target.value)}
                    placeholder="Agregar indicaciones..."
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: `1px solid ${dark ? '#334155' : '#E2E8F0'}`, background: dark ? '#1E293B' : '#F8FAFC', color: dark ? '#E2E8F0' : '#334155', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none', marginTop: 4 }}
                  />
                  
                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: 12 }}>
                    <button onClick={() => removeItem(item.id)} style={{ width: 32, height: 32, borderRadius: '50%', background: 'transparent', border: `1px solid ${dark ? '#334155' : '#E2E8F0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginRight: 10 }}>
                      <Icon name="trash-2" size={16} color={dark ? '#94A3B8' : '#64748B'} />
                    </button>
                    {/* Inline Quantity Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', background: 'transparent', border: `1px solid ${dark ? '#334155' : '#E2E8F0'}`, borderRadius: 24, padding: 2 }}>
                      <button onClick={() => { if (item.quantity > 1) updateQuantity(item.id, item.quantity - 1); }} style={{ width: 28, height: 28, borderRadius: '50%', background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Icon name="minus" size={16} color={dark ? '#94A3B8' : '#64748B'} /></button>
                      <div style={{ fontSize: 14, fontWeight: 800, color: dark ? '#F8FAFC' : '#0F172A', minWidth: 28, textAlign: 'center' }}>{item.quantity}</div>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} style={{ width: 28, height: 28, borderRadius: '50%', background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Icon name="plus" size={16} color="#F97316" /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div style={{ margin: '16px 20px', padding: 16, background: dark ? '#1E293B' : '#FFFFFF', borderRadius: 16, border: `1px solid ${dark ? '#334155' : '#E2E8F0'}`, boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                 <Icon name="tag" size={16} color="#F97316" />
                 <span style={{ fontSize: 14, color: dark ? '#E2E8F0' : '#334155', fontWeight: 500 }}>Subtotal</span>
              </div>
              <span style={{ fontSize: 14, color: dark ? '#F8FAFC' : '#0F172A', fontWeight: 600 }}>${total.toFixed(2)}</span>
            </div>
            {orderType === 'delivery' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="truck" size={16} color={dark ? '#94A3B8' : '#64748B'} />
                  <span style={{ fontSize: 14, color: dark ? '#E2E8F0' : '#334155', fontWeight: 500 }}>Envío</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: dark ? '#94A3B8' : '#64748B', fontWeight: 500 }}>Consultar con el negocio</span>
                </div>
              </div>
            )}
            <div style={{ borderTop: `1px solid ${dark ? '#334155' : '#E2E8F0'}`, paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 18, color: dark ? '#F8FAFC' : '#0F172A', fontWeight: 800 }}>Total</span>
              <span style={{ fontSize: 18, color: dark ? '#F8FAFC' : '#0F172A', fontWeight: 800 }}>${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 8, background: dark ? '#1E293B' : '#F1F5F9' }} />

          {/* Order Details */}
          <div style={{ padding: '24px 20px', background: dark ? '#0F172A' : '#FFFFFF' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: dark ? '#F8FAFC' : '#0F172A', marginBottom: 20, letterSpacing: '-0.3px' }}>Detalles de entrega</div>
            
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: dark ? '#94A3B8' : '#64748B', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Tu nombre *</div>
              <input 
                ref={nameRef}
                type="text"
                value={customerName}
                onChange={e => { setCustomerName(e.target.value); if (errors.name) setErrors({...errors, name: null}); }}
                placeholder="Ej. Juan Pérez"
                style={{ ...inputStyle, border: errors.name ? '1.5px solid #EF4444' : inputStyle.border }}
              />
              {errors.name && <div style={{ color: '#EF4444', fontSize: 12, marginTop: 6, fontWeight: 700 }}>{errors.name}</div>}
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: dark ? '#94A3B8' : '#64748B', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Método de entrega *</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button onClick={() => setOrderType('pickup')} style={{ background: orderType === 'pickup' ? '#0F172A' : (dark ? '#1E293B' : '#FFFFFF'), border: `1.5px solid ${orderType === 'pickup' ? '#0F172A' : (dark ? '#334155' : '#E2E8F0')}`, padding: '14px', borderRadius: 14, color: orderType === 'pickup' ? '#FFFFFF' : (dark ? '#94A3B8' : '#475569'), fontWeight: 800, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, transition: 'all 0.2s', fontSize: 15, boxShadow: orderType === 'pickup' ? '0 4px 12px rgba(15, 23, 42, 0.2)' : 'none' }}>
                  <Icon name="shopping-bag" size={18} color={orderType === 'pickup' ? '#F97316' : (dark ? '#64748B' : '#94A3B8')} />
                  Recoger
                </button>
                <button onClick={() => setOrderType('delivery')} style={{ background: orderType === 'delivery' ? '#0F172A' : (dark ? '#1E293B' : '#FFFFFF'), border: `1.5px solid ${orderType === 'delivery' ? '#0F172A' : (dark ? '#334155' : '#E2E8F0')}`, padding: '14px', borderRadius: 14, color: orderType === 'delivery' ? '#FFFFFF' : (dark ? '#94A3B8' : '#475569'), fontWeight: 800, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, transition: 'all 0.2s', fontSize: 15, boxShadow: orderType === 'delivery' ? '0 4px 12px rgba(15, 23, 42, 0.2)' : 'none' }}>
                  <Icon name="map-pin" size={18} color={orderType === 'delivery' ? '#F97316' : (dark ? '#64748B' : '#94A3B8')} />
                  Domicilio
                </button>
              </div>
            </div>

            {orderType === 'delivery' && (
              <div style={{ marginBottom: 20, animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: dark ? '#94A3B8' : '#64748B', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Dirección de envío *</div>
                <textarea 
                  value={address}
                  onChange={e => { setAddress(e.target.value); if (errors.address) setErrors({...errors, address: null}); }}
                  placeholder="Calle, número exterior/interior, colonia, referencias..."
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 80, border: errors.address ? '1.5px solid #EF4444' : inputStyle.border }}
                />
                {errors.address && <div style={{ color: '#EF4444', fontSize: 12, marginTop: 6, fontWeight: 700 }}>{errors.address}</div>}
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 10, padding: '10px 12px', background: dark ? '#422006' : '#FFFBEB', borderRadius: 10, border: `1px solid ${dark ? '#854D0E' : '#FDE68A'}` }}>
                  <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>🛵</span>
                  <div style={{ fontSize: 12, color: dark ? '#FBBF24' : '#92400E', lineHeight: 1.5 }}>
                    El costo de envío puede variar según el negocio y la distancia. Consulta directamente al hacer tu pedido.
                  </div>
                </div>
              </div>
            )}

            {/* General Notes */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: dark ? '#94A3B8' : '#64748B', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Notas para el negocio</div>
              <textarea 
                value={generalNotes}
                onChange={e => setGeneralNotes(e.target.value)}
                placeholder="Ej. Tocar el timbre, llegar por la puerta trasera..."
                style={{ ...inputStyle, resize: 'vertical', minHeight: 60, fontSize: 14 }}
              />
            </div>
          </div>

          <div style={{ padding: '16px 16px' }}>
            <button onClick={clearCart} style={{ margin: '0 auto', display: 'block', background: 'none', border: 'none', color: dark ? '#475569' : '#CBD5E1', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Vaciar carrito</button>
          </div>
        </div>
      )}

      {/* Footer Checkout */}
      {items.length > 0 && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 20px', background: dark ? '#0F172A' : '#FFFFFF', paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          <button onClick={handleCheckout} style={{ width: '100%', background: '#0F172A', color: '#FFFFFF', border: 'none', borderRadius: 16, padding: '14px 20px', fontSize: 16, fontWeight: 800, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 8px 32px rgba(15, 23, 42, 0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#F97316', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="whatsapp" size={24} color="#FFFFFF" />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 2 }}>Hacer pedido</div>
                <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>Enviar por WhatsApp</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 16 }}>${total.toFixed(2)}</span>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#F97316', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="chevron" size={16} color="#FFFFFF" />
              </div>
            </div>
          </button>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        input::placeholder, textarea::placeholder {
          color: ${dark ? '#64748B' : '#94A3B8'} !important;
          opacity: 1;
        }
      `}</style>
    </div>
  );
}
