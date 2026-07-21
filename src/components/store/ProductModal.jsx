import React, { useState, useEffect } from 'react';
import Icon from '../ui/Icon.jsx';
import { useCart, calculateItemTotal } from '../../hooks/useCart.js';
import { getThumbUrl } from '../../lib/utils.js';

export default function ProductModal({ product, businessId, onClose, T }) {
  const [selectedOptions, setSelectedOptions] = useState({});
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [quantity, setQuantity] = useState(1);
  const addItem = useCart(s => s.addItem);

  // Initialize selectedOptions
  useEffect(() => {
    if (product?.store_product_options) {
      const initial = {};
      product.store_product_options.forEach(opt => {
        if (opt.type === 'multiple') {
          initial[opt.id] = [];
        } else {
          initial[opt.id] = null;
        }
      });
      setSelectedOptions(initial);
    }
  }, [product]);

  if (!product) return null;

  const handleOptionChange = (optionId, valueObj, isMultiple) => {
    setSelectedOptions(prev => {
      if (!isMultiple) {
        return { ...prev, [optionId]: valueObj };
      } else {
        const current = prev[optionId] || [];
        const exists = current.find(v => v.id === valueObj.id);
        if (exists) {
          return { ...prev, [optionId]: current.filter(v => v.id !== valueObj.id) };
        } else {
          return { ...prev, [optionId]: [...current, valueObj] };
        }
      }
    });
  };

  const handleAdd = () => {
    // Validate required options
    let missing = [];
    if (product.store_product_options) {
      product.store_product_options.forEach(opt => {
        if (opt.is_required) {
          const val = selectedOptions[opt.id];
          if (!val || (Array.isArray(val) && val.length === 0)) {
            missing.push(opt.name);
          }
        }
      });
    }

    if (missing.length > 0) {
      alert(`Por favor completa las opciones requeridas: ${missing.join(', ')}`);
      return;
    }

    // Format selected options for the cart
    const formattedOptions = [];
    if (product.store_product_options) {
      product.store_product_options.forEach(opt => {
        const val = selectedOptions[opt.id];
        if (val && (!Array.isArray(val) || val.length > 0)) {
          formattedOptions.push({
            option_id: opt.id,
            name: opt.name,
            value: val
          });
        }
      });
    }

    const success = addItem(product, formattedOptions, specialInstructions, quantity, businessId);
    if (success) onClose();
  };

  const formattedOptionsForTotal = Object.keys(selectedOptions).map(optId => ({ value: selectedOptions[optId] }));
  const unitTotal = calculateItemTotal(product, formattedOptionsForTotal, 1);
  const finalTotal = unitTotal * quantity;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', flexDirection: 'column', background: T.bg, animation: 'slideUp .3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
      {/* Header */}
      <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', background: T.bg, borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: T.text }}>Detalle de producto</div>
        <button onClick={onClose} style={{ width: 40, height: 40, borderRadius: '50%', background: T.border, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Icon name="x" size={18} color={T.text} /></button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 100 }}>
        {/* Product Image */}
        {product.image_url && (
          <div style={{ width: '100%', aspectRatio: '4/3', background: T.border }}>
            <img src={getThumbUrl(product.image_url, 800, 600)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
          </div>
        )}

        <div style={{ padding: '20px 16px' }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: T.text, margin: '0 0 8px 0' }}>{product.name}</h2>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.green }}>${Number(product.price).toFixed(2)}</div>
          {product.description && (
            <p style={{ fontSize: 14, color: T.sub, marginTop: 12, lineHeight: 1.5 }}>{product.description}</p>
          )}
        </div>

        <div style={{ height: 8, background: T.border }} />

        {/* Options */}
        {product.store_product_options && [...product.store_product_options].sort((a, b) => {
          const isCleanA = !a.store_option_values?.length || (a.store_option_values.length === 1 && a.store_option_values[0].label.toLowerCase() === 'sí');
          const isCleanB = !b.store_option_values?.length || (b.store_option_values.length === 1 && b.store_option_values[0].label.toLowerCase() === 'sí');
          if (isCleanA && !isCleanB) return 1;
          if (!isCleanA && isCleanB) return -1;
          if (isCleanA && isCleanB) {
            const pA = Number(a.store_option_values?.[0]?.extra_price || 0);
            const pB = Number(b.store_option_values?.[0]?.extra_price || 0);
            return pB - pA; // Extras before Omits
          }
          return 0;
        }).map((opt, index, arr) => {
          const hasValues = opt.store_option_values && opt.store_option_values.length > 0;
          const isMultiple = opt.type === 'multiple';
          
          // Treat as a clean toggle if it has NO values, OR if it has exactly 1 value named 'Sí'
          const isCleanToggle = !hasValues || (opt.store_option_values.length === 1 && opt.store_option_values[0].label.toLowerCase() === 'sí');

          if (isCleanToggle) {
            const val = hasValues ? opt.store_option_values[0] : null;
            const extraPrice = Number(val?.extra_price || 0);
            
            // Check if we should render a grouping header
            let showHeader = true;
            if (index > 0) {
              const prevOpt = arr[index - 1];
              const prevHasValues = prevOpt.store_option_values && prevOpt.store_option_values.length > 0;
              const prevIsCleanToggle = !prevHasValues || (prevOpt.store_option_values.length === 1 && prevOpt.store_option_values[0].label.toLowerCase() === 'sí');
              if (prevIsCleanToggle) {
                const prevVal = prevHasValues ? prevOpt.store_option_values[0] : null;
                const prevExtraPrice = Number(prevVal?.extra_price || 0);
                if ((extraPrice > 0 && prevExtraPrice > 0) || (extraPrice === 0 && prevExtraPrice === 0)) {
                  showHeader = false;
                }
              }
            }
            
            // Determine if toggled based on how it's stored
            const isToggled = hasValues 
              ? (isMultiple ? (selectedOptions[opt.id] || []).some(v => v.id === val.id) : selectedOptions[opt.id]?.id === val.id)
              : !!selectedOptions[opt.id];

            const toggleChange = () => {
              if (hasValues) {
                // It has a real value object in the DB
                if (isToggled) {
                   // unselect
                   if (isMultiple) {
                     setSelectedOptions(prev => ({ ...prev, [opt.id]: (prev[opt.id] || []).filter(v => v.id !== val.id) }));
                   } else {
                     setSelectedOptions(prev => ({ ...prev, [opt.id]: null }));
                   }
                } else {
                   // select
                   if (isMultiple) {
                     setSelectedOptions(prev => ({ ...prev, [opt.id]: [...(prev[opt.id] || []), val] }));
                   } else {
                     setSelectedOptions(prev => ({ ...prev, [opt.id]: val }));
                   }
                }
              } else {
                // No values in DB, store a dummy object so price calc doesn't crash (though extra_price is 0)
                setSelectedOptions(prev => ({ ...prev, [opt.id]: prev[opt.id] ? null : { id: opt.id, label: opt.name, extra_price: 0 } }));
              }
            };

            return (
              <div key={opt.id}>
                {showHeader && (
                  <div style={{ padding: '16px 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: T.text }}>
                      {extraPrice > 0 ? 'Extras' : 'Omitir ingredientes'}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: T.sub }}>Opcional</div>
                  </div>
                )}
                <label 
                  onClick={(e) => { e.preventDefault(); toggleChange(); }}
                  style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: `1px solid ${T.border}`, cursor: 'pointer', background: T.white, gap: 12 }}
                >
                  {/* Circle Icon */}
                  {isToggled ? (
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: T.green, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon name="check" size={14} color="#fff" />
                    </div>
                  ) : (
                    <div style={{ width: 24, height: 24, borderRadius: '50%', border: `1.5px solid #CBD5E1`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon name="plus" size={14} color="#94A3B8" />
                    </div>
                  )}

                  <div style={{ flex: 1, fontSize: 15, color: T.text, fontWeight: 400 }}>{opt.name}</div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {extraPrice > 0 && <div style={{ fontSize: 14, color: T.sub }}>+${extraPrice.toFixed(2)}</div>}
                    {opt.is_required && <div style={{ fontSize: 10, fontWeight: 700, color: T.red, textTransform: 'uppercase', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 6px', borderRadius: 4 }}>Obligatorio</div>}
                  </div>
                </label>
              </div>
            );
          }

          // For options WITH values → render radio/checkbox list
          return (
            <div key={opt.id}>
              <div style={{ padding: '16px 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: T.text }}>{opt.name}</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {!opt.is_required && <div style={{ fontSize: 11, fontWeight: 600, color: T.sub }}>Opcional</div>}
                  {opt.is_required && <div style={{ fontSize: 11, fontWeight: 700, color: T.red, textTransform: 'uppercase', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 6px', borderRadius: 4 }}>Obligatorio</div>}
                  <div style={{ fontSize: 11, fontWeight: 600, color: T.sub }}>• {isMultiple ? 'Varios' : 'Elige 1'}</div>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {opt.store_option_values.map(val => {
                  const isSelected = isMultiple 
                    ? (selectedOptions[opt.id] || []).find(v => v.id === val.id) 
                    : selectedOptions[opt.id]?.id === val.id;
                  
                  return (
                    <label 
                      key={val.id} 
                      onClick={() => handleOptionChange(opt.id, val, isMultiple)}
                      style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: `1px solid ${T.border}`, cursor: 'pointer', gap: 12 }}
                    >
                      {/* Custom radio/checkbox */}
                      <div style={{ 
                        width: 24, height: 24, 
                        borderRadius: isMultiple ? 8 : '50%', 
                        border: `2px solid ${isSelected ? '#0F172A' : T.border}`, 
                        background: isSelected ? '#0F172A' : 'transparent', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        transition: 'all 0.2s', flexShrink: 0 
                      }}>
                        {isSelected && <div style={{ width: isMultiple ? 'auto' : 10, height: isMultiple ? 'auto' : 10, borderRadius: isMultiple ? 0 : '50%', background: isMultiple ? 'transparent' : '#fff' }}>{isMultiple && <Icon name="check" size={14} color="#fff" />}</div>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, color: T.text, fontWeight: isSelected ? 700 : 500 }}>{val.label}</div>
                      </div>
                      {Number(val.extra_price) > 0 && <div style={{ fontSize: 13, fontWeight: 700, color: T.green }}>+${Number(val.extra_price).toFixed(2)}</div>}
                    </label>
                  );
                })}
              </div>
              <div style={{ height: 8, background: T.border }} />
            </div>
          );
        })}

        {/* Special Instructions */}
        <div style={{ padding: '16px' }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 8 }}>Indicaciones especiales</div>
          <textarea 
            value={specialInstructions}
            onChange={e => setSpecialInstructions(e.target.value)}
            placeholder="Ej. sin cebolla, aderezo aparte..."
            style={{ width: '100%', padding: 12, borderRadius: 12, border: `1.5px solid ${T.border}`, background: T.bg, color: T.text, fontSize: 15, fontFamily: 'inherit', resize: 'vertical', minHeight: 80, boxSizing: 'border-box' }}
          />
        </div>
        
        {/* Quantity */}
        <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#5A6872', letterSpacing: 0.5 }}>CANTIDAD</div>
          <div style={{ display: 'flex', alignItems: 'center', background: '#F5F6F8', borderRadius: 20, padding: 4 }}>
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} style={{ width: 40, height: 40, borderRadius: 16, background: '#FFFFFF', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}><Icon name="minus" size={18} color="#334155" /></button>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#1E293B', minWidth: 44, textAlign: 'center' }}>{quantity}</div>
            <button onClick={() => setQuantity(quantity + 1)} style={{ width: 40, height: 40, borderRadius: 16, background: '#FFFFFF', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}><Icon name="plus" size={18} color="#334155" /></button>
          </div>
        </div>
      </div>

      {/* Footer Add Button */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 24px', background: T.bg, paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
        <button onClick={handleAdd} style={{ width: '100%', background: '#0F172A', color: '#fff', border: 'none', borderRadius: 20, padding: 18, fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 8px 32px rgba(15, 23, 42, 0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="shopping-cart" size={18} color="#fff" />
            <span>Agregar al carrito</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>${finalTotal.toFixed(2)}</span>
            <Icon name="chevron" size={18} color="#fff" style={{ transform: 'rotate(-90deg)' }} />
          </div>
        </button>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
