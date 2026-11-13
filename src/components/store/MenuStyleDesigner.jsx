// Diseñador del estilo del menú del negocio (PR #291).
//
// El negocio elige uno de los 36 estilos de las tarjetas de lealtad para
// su menú público; se guarda solo el id en businesses.menu_style (null =
// sin estilo, el menú se ve como hoy). La vista previa usa el menú real
// del negocio (primeras 2 secciones, 1 producto por sección: compacta,
// aprox. la mitad de alto que la lista completa, para que los estilos
// queden visibles sin bajar tanto) con el mismo mapeo de colores que
// BusinessStore: fondo degradado, píldora activa y botón + en primary,
// títulos y precios en primary, texto del estilo para nombres y descripciones.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Icon from '../ui/Icon.jsx';
import { sb } from '../../lib/supabase.js';
import {
  LOYALTY_COLOR_CATEGORIES,
  findMenuStyleById,
  menuThemeForStyle,
  menuHexAlpha,
  loyaltyStyleBackground,
} from '../../lib/menuColorStyles.js';

export default function MenuStyleDesigner({ business, onClose, onSaved, T }) {
  const [selectedId, setSelectedId] = useState(() => business?.menu_style || null);
  const [saving, setSaving] = useState(false);
  const [previewCats, setPreviewCats] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(true);

  const selectedStyle = findMenuStyleById(selectedId);
  const theme = menuThemeForStyle(selectedStyle);

  // Carrusel de categorías: una página por categoría (9 estilos en 3×3),
  // con loop infinito: [clon Coloridos, Premium, Sobrios, Cafetería,
  // Coloridos, clon Premium]. Al asentarse sobre un clon, el carrusel
  // salta sin animación a la página real equivalente (mismo contenido,
  // sin salto visible). Al abrir, la página es la categoría del estilo
  // guardado (o Premium).
  const PAGE_COUNT = LOYALTY_COLOR_CATEGORIES.length;
  const carouselPages = [
    { cat: LOYALTY_COLOR_CATEGORIES[PAGE_COUNT - 1], key: 'clone-last' },
    ...LOYALTY_COLOR_CATEGORIES.map((cat) => ({ cat, key: cat.id })),
    { cat: LOYALTY_COLOR_CATEGORIES[0], key: 'clone-first' },
  ];
  const initialPage = Math.max(0, LOYALTY_COLOR_CATEGORIES.findIndex(
    (cat) => cat.id === (selectedStyle?.category || 'premium')
  ));
  const initialPageRef = useRef(initialPage);
  const [page, setPage] = useState(initialPage);
  const carouselRef = useRef(null);
  const settleTimerRef = useRef(null);
  // Posición del clon -> página real: la posición 0 es la última
  // categoría y PAGE_COUNT + 1 es la primera.
  const repositionLoop = useCallback((el) => {
    if (!el.clientWidth) return;
    const pos = Math.round(el.scrollLeft / el.clientWidth);
    if (pos === 0) el.scrollTo({ left: PAGE_COUNT * el.clientWidth, behavior: 'auto' });
    else if (pos === PAGE_COUNT + 1) el.scrollTo({ left: el.clientWidth, behavior: 'auto' });
  }, [PAGE_COUNT]);
  // Ref estable: pone el carrusel en la página inicial antes del primer
  // pintado (sin flash de Premium) y no se re-ejecuta al re-renderizar
  // (p. ej. al elegir un estilo, que no debe mover el carrusel). La
  // posición inicial es initialPage + 1 por el clon de la izquierda.
  const setCarouselRef = useCallback((el) => {
    carouselRef.current = el;
    if (el) el.scrollLeft = (initialPageRef.current + 1) * el.clientWidth;
  }, []);
  const handleCarouselScroll = (e) => {
    const el = e.currentTarget;
    if (!el.clientWidth) return;
    const pos = Math.max(0, Math.min(PAGE_COUNT + 1, Math.round(el.scrollLeft / el.clientWidth)));
    // Posición -> categoría real: el clon envuelve (0 = última, PAGE_COUNT + 1 = primera).
    const real = (pos - 1 + PAGE_COUNT) % PAGE_COUNT;
    if (real !== page) setPage(real);
    // Cuando el deslizamiento se asienta sobre un clon, saltar a la
    // página real equivalente (el contenido es idéntico, no se nota).
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    settleTimerRef.current = setTimeout(() => repositionLoop(el), 100);
  };
  const goToCategory = (idx) => {
    setPage(idx);
    const el = carouselRef.current;
    if (el) el.scrollTo({ left: (idx + 1) * el.clientWidth, behavior: 'smooth' });
  };
  // Limpieza del temporizador al desmontar.
  useEffect(() => () => {
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
  }, []);

  // Vista previa con el menú real del negocio.
  useEffect(() => {
    async function load() {
      if (!business?.id) { setPreviewLoading(false); return; }
      try {
        const data = await sb.get('store_categories', `?business_id=eq.${business.id}&select=id,name,sort_order,store_products(id,name,description,price,is_available,sort_order)&order=sort_order.asc&limit=2`);
        if (Array.isArray(data)) {
          setPreviewCats(data
            .map((cat) => ({ ...cat, store_products: (cat.store_products || []).filter((p) => p.is_available).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).slice(0, 1) }))
            .filter((cat) => cat.store_products.length > 0));
        }
      } catch {
        // Sin vista previa: se muestra el aviso, el selector sigue funcionando.
      }
      setPreviewLoading(false);
    }
    load();
  }, [business?.id]);

  const handleSave = async () => {
    if (!business?.id) return;
    setSaving(true);
    try {
      await sb.patch('businesses', business.id, { menu_style: selectedId });
      if (onSaved) onSaved(selectedId);
      alert(selectedId ? '¡Estilo de menú guardado!' : 'Estilo quitado: tu menú se ve como siempre.');
      onClose();
    } catch (e) {
      alert('Error al guardar: ' + e.message);
    }
    setSaving(false);
  };

  const t = T || { bg: '#FFFFFF', border: '#E4E4E7', text: '#18181B', sub: '#71717A', surface: '#F4F4F5' };

  // Estructura anti-bloqueo de scroll (bug 13 nov): el diseñador se monta
  // con createPortal en document.body (AccountView), así position: fixed
  // es el viewport de verdad y no la página de Mi Perfil (su raíz lleva
  // transform: translateY(0) de viewStyle, que atrapaba el fixed y dejaba
  // la barra inferior por encima y el Guardar fuera de alcance). El scroll
  // vertical vive en el contenedor central (flex: 1, minHeight: 0,
  // overflowY auto): header y Guardar quedan siempre visibles y toda la
  // pantalla baja con el dedo. El carrusel horizontal usa scroll-snap
  // nativo con touch-action pan-x pan-y: el deslizamiento horizontal
  // cambia de categoría y el vertical sigue bajando la pantalla, también
  // cuando el gesto empieza sobre los círculos (con solo pan-x el
  // navegador no maneja el vertical sobre ese elemento).
  return (
    <div style={{ position: 'fixed', inset: 0, background: t.bg, zIndex: 10000, display: 'flex', flexDirection: 'column', animation: 'fadeUp .3s ease' }}>

      {/* HEADER */}
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${t.border}`, background: t.bg, gap: 10, flexShrink: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: t.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Diseño de mi menú</h2>
          <p style={{ margin: 0, fontSize: 13, color: t.sub }}>Elige cómo se ve tu menú público</p>
        </div>
        <button onClick={onClose} aria-label="Cerrar" style={{ width: 34, height: 34, borderRadius: '50%', background: t.border, color: t.text, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <Icon name="x" size={15} />
        </button>
      </div>

      {/* CONTENIDO CON SCROLL VERTICAL */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', touchAction: 'pan-y' }}>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 560, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>

        {/* VISTA PREVIA EN VIVO */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: t.sub, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Vista previa de tu menú</div>
          <div style={{ width: '100%', borderRadius: 20, overflow: 'hidden', background: theme ? theme.background : '#FAFAFA', border: `1px solid ${t.border}`, boxShadow: '0 12px 32px rgba(0,0,0,0.08)' }}>
            <div style={{ padding: '12px 14px 2px' }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: theme ? theme.text : '#111111' }}>{business?.name || 'Tu negocio'}</div>
              <div style={{ fontSize: 11, color: theme ? menuHexAlpha(theme.text, 'B3') : '#71717A', marginTop: 1 }}>
                {selectedStyle ? `Estilo: ${selectedStyle.label}` : 'Sin estilo · como se ve hoy'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, padding: '8px 14px 2px' }}>
              <span style={{ background: theme ? theme.primary : '#111111', color: theme ? theme.onPrimary : '#FFFFFF', padding: '5px 11px', borderRadius: 16, fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Todos</span>
              <span style={{ background: theme ? menuHexAlpha(theme.text, '1A') : '#F3F4F6', color: theme ? theme.text : '#111111', padding: '5px 11px', borderRadius: 16, fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>
                {previewCats[0]?.name || 'Tostadas'}
              </span>
            </div>
            {previewLoading ? (
              <div style={{ padding: '14px 16px', textAlign: 'center', fontSize: 12, color: theme ? menuHexAlpha(theme.text, 'B3') : '#71717A' }}>Cargando tu menú…</div>
            ) : previewCats.length === 0 ? (
              <div style={{ padding: '14px 16px', textAlign: 'center', fontSize: 12, color: theme ? menuHexAlpha(theme.text, 'B3') : '#71717A', lineHeight: 1.5 }}>
                Aún no tienes productos en tu menú.<br />Agrega productos para ver la vista previa con tu menú.
              </div>
            ) : previewCats.map((cat) => (
              <div key={cat.id} style={{ padding: '6px 14px 10px' }}>
                <div style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', color: theme ? theme.primary : '#EF4444', marginBottom: 3 }}>{cat.name}</div>
                {cat.store_products.map((p) => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: `1px solid ${theme ? menuHexAlpha(theme.text, '26') : '#E5E7EB'}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', color: theme ? theme.text : '#111111' }}>{p.name}</div>
                      {p.description && (
                        <div style={{ fontSize: 11, color: theme ? menuHexAlpha(theme.text, 'B3') : '#6B7280', lineHeight: 1.35, marginTop: 1 }}>{p.description}</div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      {p.price != null && (
                        <span style={{ fontSize: 13, fontWeight: 800, color: theme ? theme.primary : '#111827' }}>${Number(p.price).toFixed(0)}</span>
                      )}
                      <span style={{ width: 26, height: 26, borderRadius: '50%', background: theme ? theme.primary : '#3F3F46', color: theme ? theme.onPrimary : '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, lineHeight: 1 }}>+</span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* SELECTOR DE ESTILOS */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: t.sub, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Selecciona tu estilo</div>

          <button
            onClick={() => setSelectedId(null)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 14, border: selectedId === null ? `2px solid ${t.text}` : `1px solid ${t.border}`, background: selectedId === null ? (t.surface || t.bg) : 'transparent', cursor: 'pointer', marginBottom: 12, textAlign: 'left' }}
          >
            <span style={{ width: 26, height: 26, borderRadius: '50%', background: '#FFFFFF', border: `2px solid ${t.border}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: t.text }}>✕</span>
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: t.text }}>Sin estilo</span>
              <span style={{ display: 'block', fontSize: 11, color: t.sub }}>Tu menú se ve como hoy</span>
            </span>
            {selectedId === null && <span style={{ fontSize: 14, color: t.text }}>✓</span>}
          </button>

          {/* CARRUSEL: una categoría por página, se desliza de lado */}
          <div
            ref={setCarouselRef}
            onScroll={handleCarouselScroll}
            style={{ display: 'flex', overflowX: 'auto', overflowY: 'hidden', scrollSnapType: 'x mandatory', scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y', overscrollBehaviorX: 'contain' }}
          >
          {carouselPages.map(({ cat, key }) => (
            <div key={key} style={{ flex: '0 0 100%', scrollSnapAlign: 'start', boxSizing: 'border-box', padding: '0 2px' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: t.sub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' }}>{cat.label}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {cat.styles.map((style) => {
                  const isSelected = selectedId === style.id;
                  const styleTheme = menuThemeForStyle(style);
                  return (
                    <button
                      key={style.id}
                      onClick={() => setSelectedId(style.id)}
                      aria-pressed={isSelected}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '6px 2px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                    >
                      <span style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
                        <span style={{ width: 44, height: 44, borderRadius: '50%', background: loyaltyStyleBackground(style), border: `1px solid ${t.border}`, display: 'block', boxShadow: isSelected ? `0 0 0 2px ${t.bg}, 0 0 0 4px ${styleTheme ? styleTheme.primary : t.text}` : 'none' }} />
                        {isSelected && (
                          <span style={{ position: 'absolute', right: -2, top: -2, width: 18, height: 18, borderRadius: '50%', background: styleTheme ? styleTheme.primary : t.text, color: styleTheme ? styleTheme.onPrimary : '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, border: `2px solid ${t.bg}` }}>✓</span>
                        )}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: isSelected ? 800 : 600, color: isSelected ? (styleTheme ? styleTheme.primary : t.text) : t.text, textAlign: 'center', lineHeight: 1.3 }}>{style.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          </div>

          {/* PUNTOS: una por categoría, tocables para saltar */}
          <div role="tablist" aria-label="Categorías de estilos" style={{ display: 'flex', gap: 8, justifyContent: 'center', paddingTop: 14 }}>
            {LOYALTY_COLOR_CATEGORIES.map((cat, idx) => (
              <button
                key={cat.id}
                onClick={() => goToCategory(idx)}
                aria-label={`Ir a ${cat.label}`}
                aria-current={idx === page ? 'true' : undefined}
                style={{ width: idx === page ? 22 : 8, height: 8, borderRadius: 999, border: 'none', padding: 0, background: idx === page ? t.text : t.border, cursor: 'pointer', transition: 'width .2s ease, background .2s ease' }}
              />
            ))}
          </div>
        </div>
      </div>
      </div>

      {/* GUARDAR */}
      <div style={{ padding: 16, borderTop: `1px solid ${t.border}`, background: t.bg, flexShrink: 0 }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ width: '100%', padding: '11px 16px', background: '#000', color: '#fff', border: 'none', borderRadius: 14, fontWeight: 800, fontSize: 15, cursor: 'pointer', boxShadow: '0 8px 16px rgba(0,0,0,0.15)', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'Guardando…' : 'Guardar estilo de menú'}
          </button>
        </div>
      </div>
    </div>
  );
}
