import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import Icon from '../ui/Icon.jsx';
import OptimizedImage from '../ui/OptimizedImage.jsx';
import { useCart, calculateItemTotal } from '../../hooks/useCart.js';
import { getProductDisplayPrice, formatMenuAmount, isVariantGroup } from '../../lib/menuPricing.js';
import {
  getCleanOptionName,
  getOptionRules,
  formatOptionRuleBadge,
  validateOptionSelection,
  getOptionSelectionSummary,
} from '../../lib/modifierRules.js';

export default function ProductModal({ product, businessId, onClose, T, menuIntent }) {
  const [selectedOptions, setSelectedOptions] = useState({});
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [limitNotice, setLimitNotice] = useState(null); // { groupId, message }
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [quantity, setQuantity] = useState(1);
  const addItem = useCart(s => s.addItem);

  // Initialize selectedOptions and reset collapse state when product changes
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
      setCollapsedGroups({});
      setActiveGroupId(null);
      setLimitNotice(null);
    }
  }, [product]);

  // Auto-hide transient limit notice after 4 seconds
  useEffect(() => {
    if (!limitNotice) return;
    const timer = setTimeout(() => setLimitNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [limitNotice]);

  if (!product) return null;

  // Collapse previous multi-select group if the user already made valid selections in it and moved to another group
  const collapsePreviousActiveGroupIfReady = (nextGroupId, currentSelections) => {
    if (!activeGroupId || activeGroupId === nextGroupId || !product.store_product_options) return;
    const prevOpt = product.store_product_options.find(o => o.id === activeGroupId);
    if (!prevOpt) return;
    const prevRules = getOptionRules(prevOpt);
    if (prevRules.kind === 'multiple') {
      const prevSel = currentSelections[prevOpt.id] || [];
      const prevCount = Array.isArray(prevSel) ? prevSel.length : 0;
      if (prevCount > 0 && prevCount >= prevRules.min) {
        setCollapsedGroups(prev => ({ ...prev, [prevOpt.id]: true }));
      }
    }
  };

  const handleOptionChange = (opt, valueObj, isMultiple) => {
    if (menuIntent === 'local') return;
    const optionId = opt.id;
    const rules = getOptionRules(opt);

    collapsePreviousActiveGroupIfReady(optionId, selectedOptions);
    setActiveGroupId(optionId);

    if (!isMultiple) {
      setSelectedOptions(prev => ({ ...prev, [optionId]: valueObj }));
      if (limitNotice?.groupId === optionId) setLimitNotice(null);
      // Variantes (elegir 1): al elegir una opción, se contrae automáticamente mostrando el resumen
      setCollapsedGroups(prev => ({ ...prev, [optionId]: true }));
      return;
    }

    const current = Array.isArray(selectedOptions[optionId]) ? selectedOptions[optionId] : [];
    const exists = current.some(v => v.id === valueObj.id);

    if (exists) {
      const nextList = current.filter(v => v.id !== valueObj.id);
      setSelectedOptions(prev => ({ ...prev, [optionId]: nextList }));
      if (limitNotice?.groupId === optionId) setLimitNotice(null);
      return;
    }

    // Validar límite máximo antes de permitir una nueva selección
    if (rules.max !== null && current.length >= rules.max) {
      setLimitNotice({
        groupId: optionId,
        message: `Solo puedes elegir un máximo de ${rules.max} ${rules.max === 1 ? 'opción' : 'opciones'} en "${rules.cleanName}". Desmarca una si deseas cambiarla.`,
      });
      return;
    }

    // Evitar duplicados y agregar la nueva opción
    const nextList = [...current.filter(v => v.id !== valueObj.id), valueObj];
    setSelectedOptions(prev => ({ ...prev, [optionId]: nextList }));
    if (limitNotice?.groupId === optionId) setLimitNotice(null);

    // Contraer automáticamente solo cuando el grupo alcanza su máximo configurado (ej. 2 de 2)
    const validation = validateOptionSelection(opt, nextList);
    if (validation.shouldAutoCollapseOnSelect) {
      setCollapsedGroups(prev => ({ ...prev, [optionId]: true }));
    }
  };

  const toggleGroupCollapse = (groupKey) => {
    setCollapsedGroups(prev => {
      const nextCollapsed = !prev[groupKey];
      if (!nextCollapsed) {
        collapsePreviousActiveGroupIfReady(groupKey, selectedOptions);
        setActiveGroupId(groupKey);
      }
      return { ...prev, [groupKey]: nextCollapsed };
    });
  };

  const handleAdd = () => {
    // Validate all option groups (min and max rules)
    const errors = [];
    const invalidIds = [];

    if (product.store_product_options) {
      product.store_product_options.forEach(opt => {
        const check = validateOptionSelection(opt, selectedOptions[opt.id]);
        if (!check.valid && check.errorMessage) {
          errors.push(check.errorMessage);
          invalidIds.push(opt.id);
        }
      });
    }

    if (errors.length > 0) {
      // Expand any collapsed group that failed validation so the user can complete it
      setCollapsedGroups(prev => {
        const updated = { ...prev };
        invalidIds.forEach(id => { updated[id] = false; });
        return updated;
      });
      setLimitNotice({ groupId: invalidIds[0], message: errors[0] });
      alert(`Por favor revisa tus selecciones:\n• ${errors.join('\n• ')}`);
      return;
    }

    // Format selected options for the cart (preserving order and avoiding duplicates)
    const formattedOptions = [];
    if (product.store_product_options) {
      product.store_product_options.forEach(opt => {
        const val = selectedOptions[opt.id];
        const cleanName = getCleanOptionName(opt);
        if (Array.isArray(val)) {
          const uniqueVals = val.filter((v, idx, self) => v && self.findIndex(x => x.id === v.id) === idx);
          if (uniqueVals.length > 0) {
            formattedOptions.push({
              option_id: opt.id,
              name: cleanName,
              value: uniqueVals,
            });
          }
        } else if (val) {
          formattedOptions.push({
            option_id: opt.id,
            name: cleanName,
            value: val,
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

  const priceInfo = getProductDisplayPrice(product);

  const sortedOptions = product.store_product_options
    ? [...product.store_product_options].sort((a, b) => {
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
      })
    : [];

  return ReactDOM.createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', animation: 'fadeIn .2s ease-out' }}>
      <div style={{ width: '100%', maxWidth: 600, height: '100%', display: 'flex', flexDirection: 'column', background: T.bg, position: 'relative', boxShadow: '0 0 40px rgba(0,0,0,0.2)', animation: 'slideUp .3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        {/* Header */}
        <div style={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', background: T.bg, borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.text }}>Personalizar</div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%', background: T.border, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Icon name="x" size={16} color={T.text} /></button>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: 20 }}>
        {/* Product Compact Card */}
        <div style={{ 
          padding: '14px 16px', 
          display: 'flex', 
          gap: 14, 
          alignItems: 'center', 
          justifyContent: 'space-between',
          background: T.bg 
        }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            {product.cat_name && product.cat_name.trim().toLowerCase() !== product.name.trim().toLowerCase() && (
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: T.sub, letterSpacing: 0.5, marginBottom: 2 }}>
                {product.cat_name}
              </div>
            )}
            <h2 style={{ fontSize: 17, fontWeight: 800, color: T.text, margin: 0, textTransform: 'uppercase', lineHeight: 1.25, wordBreak: 'break-word' }}>
              {product.name}
            </h2>
            {priceInfo.hasPrice && (
              <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                {priceInfo.isFrom && (
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.sub }}>Desde</span>
                )}
                <span style={{ fontSize: 16, fontWeight: 800, color: T.green }}>
                  {formatMenuAmount(priceInfo.amount)}
                </span>
              </div>
            )}
            {product.description && (
              <p style={{ fontSize: 13, color: T.sub, margin: '6px 0 0', lineHeight: 1.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                {product.description}
              </p>
            )}
          </div>

          {product.image_url && (
            <div style={{ 
              width: 84, 
              height: 84, 
              borderRadius: 12, 
              overflow: 'hidden', 
              flexShrink: 0, 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <OptimizedImage 
                src={product.image_url} 
                widthRequest={240} 
                heightRequest={240} 
                style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                alt={product.name} 
              />
            </div>
          )}
        </div>

        {(sortedOptions.length > 0 || menuIntent !== 'local') && (
          <div style={{ height: 8, background: T.dark ? '#232326' : '#FAFAFA', borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }} />
        )}

        {/* Options */}
        {sortedOptions.map((opt, index, arr) => {
          const hasValues = opt.store_option_values && opt.store_option_values.length > 0;
          const isMultiple = opt.type === 'multiple';
          const cleanName = getCleanOptionName(opt);

          // Treat as a clean toggle if it has NO values, OR if it has exactly 1 value named 'Sí'
          const isCleanToggle = !hasValues || (opt.store_option_values.length === 1 && opt.store_option_values[0].label.toLowerCase() === 'sí');

          if (isCleanToggle) {
            const val = hasValues ? opt.store_option_values[0] : null;
            const extraPrice = Number(val?.extra_price || 0);
            const toggleGroupKey = extraPrice > 0 ? '__toggle_extras__' : '__toggle_omits__';
            const isGroupCollapsed = Boolean(collapsedGroups[toggleGroupKey]);

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

            // Compute summary of selected toggles in this group when collapsed
            const selectedTogglesInGroup = showHeader
              ? arr
                  .filter(o => {
                    const hv = o.store_option_values && o.store_option_values.length > 0;
                    const ct = !hv || (o.store_option_values.length === 1 && o.store_option_values[0].label.toLowerCase() === 'sí');
                    if (!ct) return false;
                    const ep = Number((hv ? o.store_option_values[0] : null)?.extra_price || 0);
                    const sameBucket = extraPrice > 0 ? ep > 0 : ep === 0;
                    if (!sameBucket) return false;
                    const sel = selectedOptions[o.id];
                    return Array.isArray(sel) ? sel.length > 0 : Boolean(sel);
                  })
                  .map(o => getCleanOptionName(o))
              : [];

            // Determine if toggled based on how it's stored
            const isToggled = hasValues
              ? (isMultiple ? (selectedOptions[opt.id] || []).some(v => v.id === val.id) : selectedOptions[opt.id]?.id === val.id)
              : !!selectedOptions[opt.id];

            const toggleChange = () => {
              if (menuIntent === 'local') return;
              collapsePreviousActiveGroupIfReady(toggleGroupKey, selectedOptions);
              setActiveGroupId(toggleGroupKey);
              if (hasValues) {
                if (isToggled) {
                  if (isMultiple) {
                    setSelectedOptions(prev => ({ ...prev, [opt.id]: (prev[opt.id] || []).filter(v => v.id !== val.id) }));
                  } else {
                    setSelectedOptions(prev => ({ ...prev, [opt.id]: null }));
                  }
                } else {
                  if (isMultiple) {
                    setSelectedOptions(prev => ({ ...prev, [opt.id]: [...(prev[opt.id] || []), val] }));
                  } else {
                    setSelectedOptions(prev => ({ ...prev, [opt.id]: val }));
                  }
                }
              } else {
                setSelectedOptions(prev => ({ ...prev, [opt.id]: prev[opt.id] ? null : { id: opt.id, label: cleanName, extra_price: 0 } }));
              }
            };

            return (
              <div key={opt.id}>
                {showHeader && (
                  <div
                    onClick={() => toggleGroupCollapse(toggleGroupKey)}
                    style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderBottom: isGroupCollapsed ? `1px solid ${T.border}` : 'none', background: isGroupCollapsed && selectedTogglesInGroup.length > 0 ? (T.white || '#FAFAFA') : 'transparent' }}
                  >
                    <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: T.text }}>
                        {extraPrice > 0 ? 'Extras' : 'Omitir ingredientes'}
                      </div>
                      {isGroupCollapsed && (
                        <div style={{ fontSize: 13, color: selectedTogglesInGroup.length > 0 ? T.green : T.sub, fontWeight: selectedTogglesInGroup.length > 0 ? 700 : 500, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {selectedTogglesInGroup.length > 0 ? selectedTogglesInGroup.join(', ') : 'Sin selección'}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: T.sub }}>Opcional</div>
                      <Icon name="chevron" size={16} color={T.sub} style={{ transform: isGroupCollapsed ? 'rotate(90deg)' : 'rotate(-90deg)', transition: 'transform 0.2s ease' }} />
                    </div>
                  </div>
                )}
                {!isGroupCollapsed && (
                  <label
                    onClick={(e) => { e.preventDefault(); toggleChange(); }}
                    style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: `1px solid ${T.border}`, cursor: 'pointer', background: T.white, gap: 12 }}
                  >
                    {isToggled ? (
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: T.green, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon name="check" size={14} color="#fff" />
                      </div>
                    ) : (
                      <div style={{ width: 24, height: 24, borderRadius: '50%', border: `1.5px solid #D4D4D8`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon name="plus" size={14} color="#A1A1AA" />
                      </div>
                    )}

                    <div style={{ flex: 1, fontSize: 15, color: T.text, fontWeight: isToggled ? 700 : 400 }}>{cleanName}</div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {extraPrice > 0 && <div style={{ fontSize: 14, color: T.sub }}>+{formatMenuAmount(extraPrice)}</div>}
                    </div>
                  </label>
                )}
              </div>
            );
          }

          // For Variantes (single) and Complementos (multiple) WITH values → render collapsible group
          const rules = getOptionRules(opt);
          const badge = formatOptionRuleBadge(opt);
          const currentSelection = selectedOptions[opt.id];
          const validation = validateOptionSelection(opt, currentSelection);
          const summaryText = getOptionSelectionSummary(opt, currentSelection);
          const isCollapsed = Boolean(collapsedGroups[opt.id]);
          const hasGroupNotice = limitNotice?.groupId === opt.id;

          return (
            <div key={opt.id}>
              {/* Collapsible Group Header */}
              <div
                onClick={() => toggleGroupCollapse(opt.id)}
                style={{
                  padding: '14px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  background: isCollapsed && summaryText ? (T.white || '#FAFAFA') : 'transparent',
                  borderBottom: isCollapsed ? `1px solid ${T.border}` : 'none',
                  transition: 'background 0.2s ease',
                }}
              >
                <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: T.text }}>{cleanName}</div>
                  {isCollapsed ? (
                    <div style={{ fontSize: 13, color: summaryText ? T.green : T.sub, fontWeight: summaryText ? 700 : 500, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {summaryText ? `✓ ${summaryText}` : 'Sin selección'}
                    </div>
                  ) : (
                    isMultiple && (rules.max !== null || validation.count > 0) && (
                      <div style={{ fontSize: 12, color: validation.reachedMax ? T.green : T.sub, fontWeight: 600, marginTop: 2 }}>
                        {rules.max !== null
                          ? `Seleccionados: ${validation.count} de ${rules.max}`
                          : `Seleccionados: ${validation.count}`}
                      </div>
                    )
                  )}
                </div>

                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                  {isCollapsed && summaryText ? (
                    <span style={{ fontSize: 12, fontWeight: 700, color: T.sub, background: T.border, padding: '4px 10px', borderRadius: 999 }}>
                      Cambiar
                    </span>
                  ) : (
                    <>
                      {!badge.isRequired && <div style={{ fontSize: 12, fontWeight: 500, color: T.sub }}>Opcional</div>}
                      {badge.isRequired && (!validation.valid || validation.count === 0) && (
                        <div style={{ 
                          fontSize: 11, 
                          fontWeight: 700, 
                          color: '#DC2626', 
                          background: 'rgba(239, 68, 68, 0.1)', 
                          padding: '2px 7px', 
                          borderRadius: 6 
                        }}>
                          Requerido
                        </div>
                      )}
                      {badge.ruleText && <div style={{ fontSize: 12, fontWeight: 500, color: T.sub }}>• {badge.ruleText}</div>}
                    </>
                  )}
                  <Icon
                    name="chevron"
                    size={16}
                    color={T.sub}
                    style={{ transform: isCollapsed ? 'rotate(90deg)' : 'rotate(-90deg)', transition: 'transform 0.2s ease', marginLeft: 2 }}
                  />
                </div>
              </div>

              {/* Limit / Validation Notice Banner */}
              {hasGroupNotice && (
                <div style={{ margin: '0 16px 8px', padding: '10px 12px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span>{limitNotice.message}</span>
                  <button onClick={() => setLimitNotice(null)} style={{ background: 'transparent', border: 'none', color: '#B91C1C', fontWeight: 800, cursor: 'pointer', padding: 2 }}>✕</button>
                </div>
              )}

              {/* Option Values List */}
              {!isCollapsed && (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {opt.store_option_values.map(val => {
                    const isSelected = isMultiple
                      ? Boolean((selectedOptions[opt.id] || []).find(v => v.id === val.id))
                      : selectedOptions[opt.id]?.id === val.id;
                    const isDisabledByMax = isMultiple && !isSelected && validation.reachedMax;

                    return (
                      <label
                        key={val.id}
                        onClick={() => handleOptionChange(opt, val, isMultiple)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '13px 16px',
                          borderBottom: `1px solid ${T.border}`,
                          cursor: isDisabledByMax ? 'not-allowed' : 'pointer',
                          opacity: isDisabledByMax ? 0.45 : 1,
                          gap: 12,
                          background: isSelected ? (T.dark ? 'rgba(63, 63, 70, 0.6)' : 'rgba(241, 245, 249, 0.7)') : 'transparent',
                          transition: 'background 0.15s ease, opacity 0.15s ease',
                        }}
                      >
                        {/* Custom circle selector (all options unified) */}
                        <div style={{
                          width: 22, height: 22,
                          borderRadius: '50%',
                          border: `2px solid ${isSelected ? (T.dark ? '#F4F4F5' : '#18181B') : (T.dark ? '#71717A' : '#D4D4D8')}`,
                          background: isSelected ? (T.dark ? '#F4F4F5' : '#18181B') : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.15s ease', flexShrink: 0
                        }}>
                          {isSelected && (
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.dark ? '#18181B' : '#fff' }} />
                          )}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 15, color: T.text, fontWeight: isSelected ? 700 : 500 }}>{val.label}</div>
                        </div>
                        {(() => {
                          const isSize = /tamañ|taman|size|presentaci|porci/i.test(String(cleanName || ""));
                          const ext = Number(val.extra_price) || 0;
                          const base = Number(product.price) || 0;
                          const hasPositiveInGroup = opt.store_option_values.some(v => Number(v.extra_price) > 0);
                          const showAbsolute = isVariantGroup(opt) && hasPositiveInGroup && (isSize || base === 0) && (base + ext) > 0;

                          if (showAbsolute) {
                            const total = base + ext;
                            return <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{formatMenuAmount(total)}</div>;
                          } else if (ext > 0) {
                            return <div style={{ fontSize: 14, fontWeight: 700, color: T.green }}>+{formatMenuAmount(ext)}</div>;
                          }
                          return null;
                        })()}
                      </label>
                    );
                  })}
                </div>
              )}

              {(menuIntent !== 'local' || index < arr.length - 1) && (
                <div style={{ height: 8, background: T.dark ? '#232326' : '#FAFAFA', borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }} />
              )}
            </div>
          );
        })}

        {/* Special Instructions */}
        {menuIntent !== 'local' && (
          <div style={{ padding: '16px' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 8 }}>Indicaciones especiales</div>
            <textarea
              value={specialInstructions}
              onFocus={() => collapsePreviousActiveGroupIfReady('__special_instructions__', selectedOptions)}
              onChange={e => setSpecialInstructions(e.target.value)}
              placeholder="Ej. sin cebolla, aderezo aparte..."
              style={{ width: '100%', padding: 12, borderRadius: 12, border: `1.5px solid ${T.border}`, background: T.bg, color: T.text, fontSize: 15, fontFamily: 'inherit', resize: 'vertical', minHeight: 80, boxSizing: 'border-box' }}
            />
          </div>
        )}

        {/* Quantity */}
        {menuIntent !== 'local' && (
          <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#5A6872', letterSpacing: 0.5 }}>CANTIDAD</div>
            <div style={{ display: 'flex', alignItems: 'center', background: '#F5F6F8', borderRadius: 20, padding: 4 }}>
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} style={{ width: 40, height: 40, borderRadius: 16, background: '#FFFFFF', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}><Icon name="minus" size={18} color="#3F3F46" /></button>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#232326', minWidth: 44, textAlign: 'center' }}>{quantity}</div>
              <button onClick={() => setQuantity(quantity + 1)} style={{ width: 40, height: 40, borderRadius: 16, background: '#FFFFFF', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}><Icon name="plus" size={18} color="#3F3F46" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Add Button */}
      {menuIntent !== 'local' && (
        <div style={{ 
          flexShrink: 0,
          padding: '14px 20px', 
          background: T.bg, 
          borderTop: `1px solid ${T.border}`,
          boxShadow: '0 -4px 20px rgba(0,0,0,0.06)',
          paddingBottom: 'max(14px, env(safe-area-inset-bottom))',
          zIndex: 10
        }}>
          <button 
            onClick={handleAdd} 
            style={{ 
              width: '100%', 
              background: '#18181B', 
              color: '#fff', 
              border: 'none', 
              borderRadius: 16, 
              padding: '16px 20px', 
              fontSize: 16, 
              fontWeight: 700, 
              cursor: 'pointer', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.25)',
              transition: 'transform 0.1s ease, opacity 0.1s ease',
              outline: 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon name="shopping-cart" size={20} color="#fff" />
              <span>Agregar al carrito</span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>
              {finalTotal > 0 
                ? formatMenuAmount(finalTotal) 
                : (priceInfo.hasPrice ? (priceInfo.isFrom ? `Desde ${formatMenuAmount(priceInfo.amount)}` : formatMenuAmount(priceInfo.amount)) : '')}
            </div>
          </button>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
      </div>
    </div>,
    document.body
  );
}
