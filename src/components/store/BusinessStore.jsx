import {isCatalogBusiness} from '../../lib/storePresentation.js';
import StorePromotions from './StorePromotions.jsx';
import SlidingCategoryTrack from '../ui/SlidingCategoryTrack.jsx';
import { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { m, AnimatePresence } from 'framer-motion';
import Icon from '../ui/Icon.jsx';
import OptimizedImage from '../ui/OptimizedImage.jsx';
import ProductModal from './ProductModal.jsx';
import CartDrawer from './CartDrawer.jsx';
import NoMenuLanding from './NoMenuLanding.jsx';
import { useCart } from '../../hooks/useCart.js';
import { useUIStore } from '../../store/useUIStore.js';
import { useDataStore } from '../../store/useDataStore.js';
import { useAuthStore } from '../../store/useAuthStore.js';
import { AppContext } from '../../context/AppContext.jsx';
 
import { getThumbUrl, isOpenNow, getSmartScheduleInfo, cleanCityPrefix, cleanShortAddress, haptic, SRCSET_THUMB } from '../../lib/utils.js';
import { FONT_BIZ, CITY_TZ } from '../../lib/constants.js';
import { getProductDisplayPrice, getProductPriceLabel } from '../../lib/menuPricing.js';
import { isCategoryVisibleNow, categoryHasSchedule, categoryScheduleLabel12h, offHoursMessage } from '../../lib/menuCategoryHours.js';
import { resolveMenuTheme, menuHexAlpha, textOnMenuSurface } from '../../lib/menuColorStyles.js';
import { fetchStoreCategories } from '../../lib/storeCategories.js';
import { resolveMenuIntent, readSavedMenuIntent, saveMenuIntent } from '../../lib/menuIntent.js';
import MenuLoadingScreen from './MenuLoadingScreen.jsx';

export default function BusinessStore({ business, T, isElite, inline = false, onBack, initialIntent = null, initialCategories = null }) {
  const navigate = useNavigate();
  const isCatalog = isCatalogBusiness(business);
  const storeLabel = isCatalog ? 'catálogo' : 'menú';
  // Categorías: MenuView ya las trae (carga única del menú, hallazgo
  // #2) y se pasan por prop; sin prop (ficha del negocio) se piden
  // aquí como siempre. La prop manda y no se vuelve a pedir.
  const [fetchedCategories, setFetchedCategories] = useState([]);
  const [fetching, setFetching] = useState(!initialCategories);
  const categories = initialCategories ?? fetchedCategories;
  const loading = initialCategories ? false : fetching;
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [menuSearch, setMenuSearch] = useState('');
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('cg_menu_view') || 'list');
  
  useEffect(() => {
     
    localStorage.setItem('cg_menu_view', viewMode);
  }, [viewMode]);
  const [showToast, setShowToast] = useState(false);
  const [toastName, setToastName] = useState('');
  // Aviso de categoría fuera de horario (opción A, nov 2026): las secciones
  // con horario ya no se ocultan; al tocarlas se avisa que están fuera de
  // servicio. Se muestra como un toast y se quita solo.
  const [offHoursNotice, setOffHoursNotice] = useState('');
  const offHoursTimer = useRef(null);
  const showOffHoursNotice = useCallback((cat) => {
    const message = offHoursMessage(cat);
    if (!message) return;
    if (offHoursTimer.current) clearTimeout(offHoursTimer.current);
    setOffHoursNotice(message);
    offHoursTimer.current = setTimeout(() => setOffHoursNotice(''), 3000);
  }, []);
  useEffect(() => () => { if (offHoursTimer.current) clearTimeout(offHoursTimer.current); }, []);
  const [activeTabId, setActiveTabId] = useState(null);
  const activeTabIdRef = useRef(activeTabId);
  useEffect(() => { activeTabIdRef.current = activeTabId; }, [activeTabId]);
  const [showMenuModal, setShowMenuModal] = useState(false);
  // Modo del menú (hallazgo #2, nov 2026): ya no hay modal que tape
  // el menú. Sin elección guardada el menú se muestra con el modo por
  // defecto (delivery, el menú completo con pedido) y el visitante
  // cambia cuando quiere desde la píldora del menú; la elección se
  // recuerda por negocio. Catálogo siempre es delivery (no tiene
  // modos). La intención explícita (?intent= o location.state) manda.
  const [menuIntent, setMenuIntent] = useState(() => resolveMenuIntent({
    isCatalog,
    initialIntent,
    saved: readSavedMenuIntent(business?.id),
  }));
  const handleIntentChange = (intent) => {
    setMenuIntent(intent);
    saveMenuIntent(business?.id, intent);
  };
  const { dark: appDark } = useUIStore();
  const { globalFavCounts } = useDataStore();
  const { user, setShowAuth } = useAuthStore();
  const appContext = useContext(AppContext);
  const favIds = appContext?.favIds || [];
  const toggleFav = appContext?.toggleFav;
  const isFav = business?.id ? favIds.includes(business.id) : false;

  // Tema del menú elegido por el negocio (PR #291 + editor universal):
  // tema personalizado (menu_custom) si lo hay, si no el estilo
  // predefinido (menu_style); sin tema, el menú se ve exacto como hoy.
  // Con tema, fondo, píldora activa, títulos, precios y botones + usan
  // sus colores.
  const menuTheme = resolveMenuTheme(business);

  // El menú público NUNCA va en modo oscuro (nov 2026, Jonathan): sin
  // estilo elegido, siempre claro aunque el teléfono/app esté en oscuro.
  // Con estilo, mandan los colores del estilo.
  const dark = menuTheme ? appDark : false;
  // Paleta clara del menú cuando no hay estilo: se ignora el T oscuro que
  // llegue de la app (fondos, textos y bordes claros para el menú, la
  // promo, el modal de producto y el carrito).
  const menuT = menuTheme ? T : { ...(T || {}), bg: '#FFFFFF', border: '#E4E4E7', text: '#18181B', sub: '#71717A', surface: '#F4F4F5', white: '#FFFFFF', green: '#16A34A', dark: false };

  const handleHeartClick = (e) => {
    if (e) e.stopPropagation();
    haptic("light");
    if (!user) {
      setShowAuth(true);
      return;
    }
    if (toggleFav && business?.id) {
      toggleFav(business.id, e);
    }
  };

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

  // Sin prop (ficha del negocio) las categorías se piden aquí; con
  // prop (MenuView, carga única) ya vienen y no se vuelve a pedir.
  useEffect(() => {
    if (!business?.id || initialCategories) return;
    let cancelled = false;
    fetchStoreCategories(business.id).then((data) => {
      if (cancelled) return;
      setFetchedCategories(data);
      setFetching(false);
    });
    return () => { cancelled = true; };
  }, [business?.id, initialCategories]);

  // Hora actual en la zona horaria del negocio: las secciones con horario se
  // re-evalúan cada minuto para que el menú cambie solo al llegar la hora,
  // sin recargar la página.
  const timeZone = CITY_TZ[business.city_slug] || 'America/Mazatlan';
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  // Las secciones con horario ya NO se ocultan fuera de su ventana (opción A,
  // nov 2026): siempre se muestran, atenuadas, y al tocar avisan que están
  // fuera de servicio. Una sección sin horario siempre está en horario.
  const isCatOffHours = (c) => categoryHasSchedule(c) && !isCategoryVisibleNow(c, { now, timeZone });
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
    // Una sola pantalla de carga del menú (hallazgo #2): la misma que
    // muestra MenuView mientras cargan negocio y categorías — fondo
    // con el tema, logo, nombre y barras. Sin inline (ficha del
    // negocio) no hay pantalla de carga: el menú va incrustado.
    // El diseño es el de la #306 (fondo con el tema + logo + nombre +
    // barras con el color del tema), ahora compartido con MenuView.
    if (!inline) return null;
    return <MenuLoadingScreen business={business} storeLabel={storeLabel} dark={dark} />;
  }

  if (activeCategories.length === 0) {
    // El negocio no tiene productos en ninguna sección: landing de "sin menú"
    // (o nada, si va incrustado en la ficha). Las secciones fuera de horario
    // ya no se ocultan, así que este caso ya no es "todo fuera de horario".
    if (inline) {
      return <NoMenuLanding business={business} T={T} dark={dark} onBack={onBack} />;
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
        title: `${isCatalog?'Catálogo':'Menú'} de ${business.name}`,
        text: `Consulta el ${storeLabel} digital y realiza tu pedido en ${business.name}`,
        url: url
      }).catch(err => console.log(err));
    } else {
      navigator.clipboard?.writeText(url);
      alert(`¡Enlace del ${storeLabel} copiado al portapapeles!`);
    }
  };

  const coverPhoto = business.banner_url || business.logo_url || (business.photos && business.photos[0] ? business.photos[0].url : null);
  // La portada del menú mide lo mismo que la de la ficha (DetailView):
  // 220 px con foto, 64 sin foto (isElite está desactivado en la ficha,
  // así que ahí siempre son 220). Sin esto, el paso ficha → menú
  // cambiaba la altura de la portada y se sentía brusco.
  const coverHeight = coverPhoto ? 220 : 64;
  const isOpen = isOpenNow(business, business.timezone);
  const scheduleInfo = getSmartScheduleInfo(business, business.timezone);

  return (
    <div style={{ marginTop: inline ? 0 : 24, paddingBottom: (cartCount > 0 && (showMenuModal || inline)) ? 80 : 0 }}>
      {/* El modal de intención ya no tapa el menú (hallazgo
          #2, nov 2026): el menú se muestra con el modo por defecto y
          se cambia desde la píldora de modo, bajo la información del
          negocio. El logo en círculo con cover + zoom (verificado en
          la #306 con los logos reales) vive ahora en la pantalla de
          carga única (MenuLoadingScreen) y en el modal de la ficha
          (DetailView), que es el que pregunta antes de entrar. */}
      {!showMenuModal && !inline ? (
        <div style={{ margin: '0 16px', marginBottom: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 16, gap: 12 }}>
            {cartCount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: 400, marginTop: 4, padding: '0 4px' }}>
                <div 
                  onClick={() => setIsOpen(true)} 
                  className="press"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: menuT.green || '#16A34A' }}
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
             key="store-modal-backdrop"
             initial={inline ? false : { opacity: 0 }}
             animate={inline ? false : { opacity: 1 }}
             exit={inline ? false : { opacity: 0 }}
             transition={{ duration: 0.2 }}
             style={{ 
               position: inline ? 'relative' : 'fixed', 
               inset: inline ? 'auto' : 0, 
               zIndex: inline ? 'auto' : 80000, 
               background: inline ? 'transparent' : 'rgba(0,0,0,0.5)', 
               display: inline ? 'block' : 'flex',
               justifyContent: inline ? 'normal' : 'center',
               // En la página completa (inline) el overflow debe ser visible: con 'hidden' este contenedor se vuelve el área de scroll del encabezado sticky y las categorías se van con la página al bajar. En el modal se queda 'hidden' para recortar la animación de entrada; ahí el que hace scroll es la tarjeta (overflowY auto) y el sticky sí funciona.
               overflow: inline ? 'visible' : 'hidden'
             }}
          >
            <m.div 
               key="store-modal-card"
               initial={inline ? false : { y: '100%' }}
               animate={inline ? false : { y: 0 }}
               exit={inline ? false : { y: '100%' }}
               transition={inline ? {} : { type: 'spring', damping: 25, stiffness: 200 }}
               style={{ 
                 width: '100%',
                 maxWidth: inline ? 'none' : 600,
                 height: inline ? 'auto' : '100%',
                 position: 'relative',
                 background: menuTheme ? menuTheme.background : (dark ? '#18181B' : '#FAFAFA'), 
                 overflowY: inline ? 'visible' : 'auto',
                 minHeight: inline ? '100%' : '100vh',
                 boxShadow: inline ? 'none' : '0 0 40px rgba(0,0,0,0.2)'
               }}
            >
            {/* Banner Area (Baryo Style): sin fondo propio — el degradado
                único de la página (el de la tarjeta, línea de arriba) fluye
                por aquí; antes este div repetía el degradado y el encabezado
                se veía rosa→morado mientras el resto era naranja→rosa. */}
            <div style={{ position: 'relative', width: '100%', background: 'transparent' }}>
              <div style={{ position: 'relative', width: '100%', height: coverHeight, background: menuTheme ? 'transparent' : '#232326' }}>
                {(business.banner_url || (business.photos && business.photos[0] ? business.photos[0].url : null) || business.logo_url) && (
                  // El mismo encuadre que la ficha (DetailView: getThumbUrl
                  // 1200×900 + cover): antes se pedía 800×340 y el servidor
                  // recortaba la foto a panorámica 2.35:1, así que en el
                  // menú se veía acercada, recortada por los lados (nov
                  // 2026, Jonathan). El menú pide 800×600 (mismo recorte
                  // 4:3, la mitad de peso: 68,8 KB vs 142,4 KB en la foto
                  // de Carrito La Paz, nov 2026) con prioridad alta: es el
                  // LCP de la página y se muestra a 390×220.
                  <OptimizedImage
                    src={business.banner_url || (business.photos && business.photos[0] ? business.photos[0].url : null) || business.logo_url}
                    widthRequest={800}
                    heightRequest={600}
                    priority
                    style={{ width: '100%', height: '100%', objectFit: 'cover', aspectRatio: '4 / 3' }}
                    alt={business.name}
                  />
                )}
                
                {/* Gradient Overlay fading to background color */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 55%)' }} />
                
                {/* Close/Back Button */}
                <button 
                  className="press"
                  aria-label={inline ? "Volver" : "Cerrar menú"}
                  onClick={() => inline ? (onBack && onBack()) : setShowMenuModal(false)}
                  style={{ position: 'absolute', top: 16, left: 16, zIndex: 10, padding: 12, background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#FFF' }}
                >
                  <Icon name={inline ? "chevron" : "x"} size={26} color="#fff" style={{ transform: inline ? "rotate(180deg)" : undefined, filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.6))" }} />
                </button>

                {/* Top Right Actions: Favorite & Share */}
                <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <m.button 
                    whileTap={{ scale: 0.85 }}
                    aria-label={isFav ? "Quitar de favoritos" : "Guardar en favoritos"}
                    className="press"
                    onClick={handleHeartClick}
                    style={{ padding: 10, background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <m.div key={isFav ? 'fav' : 'unfav'} initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 15 }}>
                      <Icon name={isFav ? "heart_overlay_f" : "heart_overlay"} size={26} color="#fff" style={{ filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.6))" }} />
                    </m.div>
                  </m.button>

                  <m.button 
                    whileTap={{ scale: 0.85 }}
                    aria-label="Compartir"
                    className="press"
                    onClick={handleShare}
                    style={{ padding: 10, background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#FFF' }}
                  >
                    <Icon name="share" size={26} style={{ filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.6))" }} />
                  </m.button>
                </div>
              </div>

              {/* Profile Logo Circular Superpuesto: en la misma posición
                  que en la ficha (DetailView): a la izquierda, de 96 px,
                  con la parte superior 68 px por encima del borde
                  inferior de la portada (en la ficha la tarjeta blanca
                  sube 20 px sobre la portada y el logo va 48 px sobre
                  la tarjeta: 20 + 48 = 68). */}
              <div style={{ display: 'flex', justifyContent: 'flex-start', padding: '0 16px', marginTop: -68, position: 'relative', zIndex: 3 }}>
                <div style={{ 
                  width: 96, 
                  height: 96, 
                  borderRadius: '50%', 
                  background: '#FFFFFF', 
                  border: `4px solid ${menuTheme ? menuTheme.firstColor : (dark ? '#18181B' : '#FFFFFF')}`,
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
              <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginTop: 10, padding: '0 20px 4px' }}>
                <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: menuTheme ? menuTheme.text : (dark ? '#FFFFFF' : '#111111'), fontFamily: FONT_BIZ, letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {business.name}
                  {(business.plan === "destacado" || business.plan === "premium" || business.plan === "pro") && (
                    <img src="/verificado.png" alt="Verificado" width="22" height="22" style={{ flexShrink: 0, marginTop: 2 }} />
                  )}
                </h1>

                {menuIntent === 'local' ? (
                  <div style={{ marginTop: 6, fontSize: 15, fontWeight: 700, color: menuTheme ? menuTheme.text : (dark ? '#FAFAFA' : '#232326'), letterSpacing: -0.2 }}>
                    ¡Qué bueno tenerte aquí!
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 6, flexWrap: 'wrap', padding: '0 8px' }}>
                    {/* Estado/horario en píldora oscura translúcida con
                        texto blanco: el verde/rojo de antes (según abierto
                        o cerrado) chocaba con el degradado de algunos
                        estilos. Opacidad 0.55 (no 0.25-0.30): con 0.28 el
                        blanco solo llega a 2.05:1 sobre las paradas más
                        claras (Crema #FFFBEB) y sin estilo; con 0.55 el
                        peor caso de los 36 estilos y sin estilo es
                        >= 4.5:1 (ver el test del bloque de la píldora). */}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0, background: 'rgba(0, 0, 0, 0.55)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', borderRadius: 999, padding: '3px 10px' }}>
                      <Icon name="clock" size={13} color="#FFFFFF" />
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF' }}>
                        {scheduleInfo?.text?.[0] || (isOpen ? "Abierto ahora" : "Cerrado")}
                      </span>
                    </div>

                    {!business.hide_location && business.address && (
                      <>
                        <span style={{ fontSize: 12, color: menuTheme ? menuHexAlpha(menuTheme.text, 'B3') : (dark ? '#71717A' : '#D4D4D8'), userSelect: 'none' }}>•</span>
                        <a
                          href={(business.lat && business.lng) ? `https://www.google.com/maps/search/?api=1&query=${business.lat},${business.lng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.address + ', ' + (business.city || ''))}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 13,
                            fontWeight: 600,
                            color: menuTheme ? menuHexAlpha(menuTheme.text, 'B3') : (dark ? '#A1A1AA' : '#71717A'),
                            textDecoration: 'none',
                            maxWidth: '100%',
                            minWidth: 0,
                            cursor: 'pointer'
                          }}
                          title={business.address}
                        >
                          <Icon name="pin" size={13} color={menuTheme ? menuHexAlpha(menuTheme.text, 'B3') : (dark ? '#A1A1AA' : '#71717A')} style={{ flexShrink: 0 }} />
                          {/* La dirección se ajusta a la pantalla: pasa a
                              varias líneas en vez de cortarse con puntos
                              suspensivos en el borde derecho (móvil). */}
                          <span style={{ overflowWrap: 'break-word', wordBreak: 'break-word', minWidth: 0 }}>
                            {cleanShortAddress(business.address)}
                          </span>
                        </a>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Píldora de modo (hallazgo #2, nov 2026): el modal de
                intención ya no tapa el menú; el menú se muestra con
                el modo por defecto (delivery) y el visitante cambia aquí
                cuando quiera. El cambio es inmediato (botones +, carrito,
                saludo y promos reaccionan a menuIntent) y se recuerda por
                negocio en localStorage. En catálogo no hay modos. */}
            {!isCatalog && (
              <div role="group" aria-label="Modo del menú" style={{ display: 'flex', gap: 8, padding: '12px 16px 0' }}>
                {[
                  { id: 'local', label: 'En el local', icon: '🍽️' },
                  { id: 'delivery', label: 'Para llevar / Domicilio', icon: '🛍️' },
                ].map((opt) => {
                  const isActive = menuIntent === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => handleIntentChange(opt.id)}
                      className="press"
                      style={{
                        flex: 1,
                        padding: '10px 8px',
                        borderRadius: 999,
                        border: 'none',
                        background: isActive ? (menuTheme ? menuTheme.primary : (dark ? '#FFFFFF' : '#111111')) : (menuTheme ? menuHexAlpha(menuTheme.text, '1A') : (dark ? '#232326' : '#F3F4F6')),
                        color: isActive ? (menuTheme ? menuTheme.onPrimary : (dark ? '#111111' : '#FFFFFF')) : (menuTheme ? menuTheme.text : (dark ? '#E4E4E7' : '#111111')),
                        fontSize: 13,
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        cursor: 'pointer',
                      }}
                    >
                      <span aria-hidden="true">{opt.icon}</span>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}

            <div style={{ paddingBottom: cartCount > 0 ? 100 : 80 }}>
      <StorePromotions products={activeCategories.flatMap(cat=>(cat.store_products||[]).map(product=>({...product,cat_name:cat.name})))} intent={menuIntent} timeZone={timeZone} T={menuT} onSelect={(p) => {
        // Una promoción de una sección fuera de horario no abre el modal: avisa.
        const cat = categories.find((c) => c.id === p.category_id);
        if (cat && isCatOffHours(cat)) { showOffHoursNotice(cat); return; }
        setSelectedProduct(p);
      }} />
      {/* Sticky Header: Search + Tabs. Con estilo, fondo sólido con la
          primera parada del degradado (menuTheme.firstColor): sin blur, el
          navegador ya no repinta la zona esmerilada en cada frame al bajar
          (hallazgo #4, nov 2026; en el WebView del moto g54 se notaba como
          tirón). El sólido opaco tapa las tarjetas que pasan por debajo,
          que era el trabajo del blur; el degradado de la página sigue
          intacto detrás, y el texto de las píldoras inactivas ya se calcula
          contra esta parada (textOnMenuSurface), así que se siguen leyendo
          en los 36 estilos. Sin estilo, el sólido de hoy. */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: menuTheme ? menuTheme.firstColor : (dark ? '#18181B' : '#FFFFFF'), paddingBottom: 12, paddingTop: 4, borderBottom: `1px solid ${dark ? '#232326' : '#F4F4F5'}` }}>
        {/* Search & Toggle */}
        <div style={{ padding: '0 16px', marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth:0 }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}><Icon name="search" size={16} color={dark ? '#A1A1AA' : '#6B7280'} /></span>
            <input
              type="search"
              aria-label={`Buscar en el ${storeLabel}`}
              value={menuSearch}
              onChange={e => setMenuSearch(e.target.value)}
              placeholder={`Buscar en el ${storeLabel}`}
              style={{ width: '100%', padding: '12px 16px 12px 40px', borderRadius: 12, border: 'none', background: dark ? '#232326' : '#F3F4F6', color: dark ? '#FFFFFF' : '#111111', fontSize: 16, fontWeight: 500, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }}
            />
            {menuSearch && <button aria-label="Borrar búsqueda de productos" onClick={() => setMenuSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}><Icon name="x" size={16} color={dark ? '#A1A1AA' : '#6B7280'} /></button>}
          </div>
          <div style={{ display: 'flex', background: dark ? '#232326' : '#F3F4F6', borderRadius: 12, padding: 4 }}>
            <button 
              aria-label="Ver productos en cuadrícula" aria-pressed={viewMode === 'grid'}
              onClick={() => setViewMode('grid')}
              style={{ background: viewMode === 'grid' ? (dark ? '#3F3F46' : '#FFFFFF') : 'transparent', border: 'none', width: 44, height: 44, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: viewMode === 'grid' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s', color: viewMode === 'grid' ? (dark ? '#FFFFFF' : '#111111') : '#A1A1AA' }}
            >
              <Icon name="grid" size={18} color="currentColor" />
            </button>
            <button 
              aria-label="Ver productos en lista" aria-pressed={viewMode === 'list'}
              onClick={() => setViewMode('list')}
              style={{ background: viewMode === 'list' ? (dark ? '#3F3F46' : '#FFFFFF') : 'transparent', border: 'none', width: 44, height: 44, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: viewMode === 'list' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s', color: viewMode === 'list' ? (dark ? '#FFFFFF' : '#111111') : '#A1A1AA' }}
            >
              <Icon name="list" size={18} color="currentColor" />
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        {activeCategories.length > 1 && (
          <div ref={tabsRef} className="scroll-fade-x" style={{ padding: '0 16px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <SlidingCategoryTrack dark={dark} selectedKey={activeTabId} indicatorColor={menuTheme?.primary} style={{ display: 'inline-flex', gap: 8 }}>
              {[{id: 'all', name: 'Todos'}, ...activeCategories].map(cat => {
                const isActive = activeTabId === cat.id;
                // La pestaña de una sección fuera de horario se atenúa, pero
                // sigue siendo tocable: lleva a la sección atenuada.
                const tabOffHours = cat.id !== 'all' && isCatOffHours(cat);
                return (
                  <button
                    key={cat.id}
                    id={`tab-${cat.id}`}
                    aria-pressed={isActive}
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
                      background: isActive ? (menuTheme ? menuTheme.primary : (dark ? '#FFFFFF' : '#111111')) : (menuTheme ? 'transparent' : (dark ? '#232326' : '#F3F4F6')),
                      color: isActive ? (menuTheme ? menuTheme.onPrimary : (dark ? '#111111' : '#FFFFFF')) : (menuTheme ? textOnMenuSurface(menuTheme.firstColor) : (dark ? '#E4E4E7' : '#111111')),
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
                      opacity: tabOffHours ? 0.55 : 1,
                    }}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </SlidingCategoryTrack>
          </div>
        )}
      </div>

      {filteredCategories.length === 0 && searchLower && (
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <Icon name="search" size={32} color={menuT.border} />
          <p style={{ marginTop: 12, fontSize: 15, color: menuT.sub, fontWeight: 600 }}>No se encontraron productos para "{menuSearch}"</p>
        </div>
      )}

      <div style={{ paddingTop: 16 }}>
      {(searchLower ? filteredCategories : activeCategories).map(cat => {
        const availableProducts = cat.store_products.filter(p => p.is_available);
        // Sección fuera de horario: se muestra atenuada con su horario y
        // al tocar avisa que está fuera de servicio (opción A, nov 2026).
        const offHours = isCatOffHours(cat);

        return (
          <m.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10px" }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            key={cat.id} data-catid={cat.id} ref={el => categoryRefs.current[cat.id] = el} style={{ marginBottom: 24, scrollMarginTop: '130px' }}>
            <div style={{ margin: '0 16px 12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: 19, fontWeight: 800, color: menuTheme ? menuTheme.primary : (dark ? '#F87171' : '#EF4444'), margin: 0, letterSpacing: '-0.5px', textTransform: 'uppercase' }}>{cat.name}</h3>
              {offHours && (
                <span style={{ fontSize: 11, fontWeight: 700, color: menuTheme ? menuHexAlpha(menuTheme.text, 'B3') : (dark ? '#A1A1AA' : '#71717A'), whiteSpace: 'nowrap' }}>
                  Fuera de servicio · {categoryScheduleLabel12h(cat)}
                </span>
              )}
            </div>
            
            <div style={
              viewMode === 'list' ? { 
                display: 'flex', 
                flexDirection: 'column', 
                background: menuTheme ? 'transparent' : (dark ? '#232326' : '#FFFFFF'),
                borderRadius: 20,
                margin: '0 16px',
                boxShadow: dark ? '0 2px 10px rgba(0,0,0,0.2)' : '0 2px 12px rgba(0,0,0,0.04)',
                border: menuTheme ? `1px solid ${menuHexAlpha(menuTheme.text, '33')}` : `1px solid ${dark ? '#3F3F46' : '#F3F4F6'}`,
                overflow: 'hidden',
                opacity: offHours ? 0.55 : 1
              } : {
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 12,
                margin: '0 16px',
                opacity: offHours ? 0.55 : 1
              }
            }>
              {availableProducts.map((product, index) => {
                const hasOptions = product.store_product_options && product.store_product_options.length > 0;
                const cartItems = items.filter(i => i.product.id === product.id);
                const totalInCart = cartItems.reduce((acc, i) => acc + i.quantity, 0);
                const productWithCategory = { ...product, cat_name: cat.name };

                const priceInfo = getProductDisplayPrice(product);
                const priceLabel = getProductPriceLabel(product);

                // En modo "local" no hay botón "+", pero si el producto tiene tamaños/extras
                // se puede abrir el detalle (solo lectura) para consultarlos.
                const canOpenModal = menuIntent !== 'local' || hasOptions;

                return (
                <div 
                  key={product.id} 
                  onClick={() => {
                    // Fuera de horario el toque no abre el detalle: avisa.
                    if (offHours) { showOffHoursNotice(cat); return; }
                    if (canOpenModal) setSelectedProduct(productWithCategory);
                  }}
                  style={{ 
                    display: 'flex', 
                    cursor: (offHours || canOpenModal) ? 'pointer' : 'default',
                    flexDirection: viewMode === 'grid' ? 'column' : 'row',
                    alignItems: 'stretch',
                    position: 'relative',
                    background: viewMode === 'grid' ? (menuTheme ? 'transparent' : (dark ? '#232326' : '#FFFFFF')) : 'transparent',
                    borderRadius: viewMode === 'grid' ? 16 : 0,
                    overflow: viewMode === 'grid' ? 'hidden' : 'visible',
                    border: viewMode === 'grid' ? (menuTheme ? `1px solid ${menuHexAlpha(menuTheme.text, '33')}` : `1px solid ${dark ? '#3F3F46' : '#F3F4F6'}`) : 'none',
                    borderBottom: (viewMode === 'list' && index < availableProducts.length - 1) ? `1px solid ${menuTheme ? menuHexAlpha(menuTheme.text, '26') : (dark ? '#3F3F46' : '#E5E7EB')}` : (viewMode === 'grid' ? `1px solid ${menuTheme ? menuHexAlpha(menuTheme.text, '33') : (dark ? '#3F3F46' : '#F3F4F6')}` : 'none'),
                    boxShadow: viewMode === 'grid' ? (dark ? '0 2px 10px rgba(0,0,0,0.2)' : '0 2px 12px rgba(0,0,0,0.04)') : 'none',
                  }}
                >
                  {/* Image */}
                  {(product.image_url || viewMode === 'grid') && (
                    <div style={viewMode === 'list' ? { width: 120, height: 120, margin: 12, flexShrink: 0, position: 'relative' } : { width: '100%', aspectRatio: '1', position: 'relative', flexShrink: 0 }}>
                      <div style={{ width: '100%', height: '100%', borderRadius: viewMode === 'list' ? 16 : 0, overflow: 'hidden', background: dark ? '#3F3F46' : '#FAFAFA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {product.image_url ? (
                          <OptimizedImage src={product.image_url} widthRequest={400} heightRequest={400} srcSetWidths={SRCSET_THUMB} sizes="(max-width: 640px) 50vw, 400px" style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                        ) : (
                          <Icon name="image" size={32} color={dark ? '#71717A' : '#D4D4D8'} />
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

                  <div style={
                    viewMode === 'list' 
                      ? { 
                          flex: 1, 
                          display: "flex", 
                          flexDirection: "column", 
                          justifyContent: product.image_url ? "space-between" : "flex-start", 
                          padding: product.image_url ? "14px 16px 14px 4px" : "12px 16px", 
                          position: 'relative', 
                          minHeight: product.image_url ? 120 : 'auto' 
                        } 
                      : { flex: 1, display: "flex", flexDirection: "column", padding: "12px", position: 'relative' }
                  }>
                    <div style={{ display: "flex", flexDirection: "column", textAlign: 'left' }}>
                      <div style={{ fontSize: viewMode === 'grid' ? 14 : 15, fontWeight: 800, color: menuTheme ? menuTheme.text : (dark ? '#FAFAFA' : '#111111'), marginBottom: product.image_url ? 4 : 2, lineHeight: 1.3, wordBreak: 'break-word', textTransform: 'uppercase' }}>
                        {product.name}
                      </div>
                      
                      {product.description && viewMode === 'list' && (
                        <div style={{ fontSize: 13, color: menuTheme ? menuHexAlpha(menuTheme.text, 'B3') : (dark ? '#A1A1AA' : '#6B7280'), display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4, marginBottom: product.image_url ? 8 : 4, paddingRight: 8 }}>
                          {product.description}
                        </div>
                      )}
                    </div>

                    {(() => {
                      const addToCartControls = menuIntent !== 'local' ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {totalInCart === 0 ? (
                            <m.button 
                              whileTap={{ scale: 0.75 }}
                              aria-disabled={offHours || undefined}
                              aria-label={offHours ? `Fuera de servicio: ${product.name}` : undefined}
                              onClick={(e) => {
                                e.stopPropagation();
                                // Fuera de horario el + no agrega: avisa.
                                if (offHours) { showOffHoursNotice(cat); return; }
                                if (hasOptions) {
                                  setSelectedProduct(productWithCategory);
                                } else {
                                  handleAddWithToast(productWithCategory, [], "", 1, business.id);
                                }
                              }}
                              style={{ width: 34, height: 34, borderRadius: '50%', background: offHours ? (dark ? '#52525B' : '#D4D4D8') : (menuTheme ? menuTheme.primary : '#3F3F46'), border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: offHours ? 'not-allowed' : 'pointer', flexShrink: 0, outline: 'none', opacity: offHours ? 0.6 : 1 }}
                            >
                              <Icon name="plus" size={16} color={menuTheme ? menuTheme.onPrimary : '#FFF'} />
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
                              style={{ display: 'flex', alignItems: 'center', background: dark ? '#232326' : '#FFFFFF', border: `1px solid ${dark ? '#3F3F46' : '#E4E4E7'}`, borderRadius: 24, padding: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
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
                                style={{ width: 28, height: 28, borderRadius: '50%', background: dark ? '#3F3F46' : '#F4F4F5', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', outline: 'none' }}
                              ><Icon name="minus" size={16} color={dark ? "#FAFAFA" : "#3F3F46"} /></m.button>
                              
                              <div style={{ fontSize: 14, fontWeight: 800, color: dark ? '#FAFAFA' : '#18181B', minWidth: 24, textAlign: 'center' }}>{totalInCart}</div>
                              
                              <m.button 
                                whileTap={{ scale: 0.8 }}
                                aria-disabled={offHours || undefined}
                                aria-label={offHours ? `Fuera de servicio: ${product.name}` : undefined}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Fuera de horario no se puede agregar más: avisa.
                                  if (offHours) { showOffHoursNotice(cat); return; }
                                  if (hasOptions) {
                                     setSelectedProduct(productWithCategory);
                                  } else {
                                     handleAddWithToast(productWithCategory, [], "", 1, business.id);
                                  }
                                }}
                                style={{ width: 28, height: 28, borderRadius: '50%', background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: offHours ? 'not-allowed' : 'pointer', outline: 'none', opacity: offHours ? 0.5 : 1 }}
                              ><Icon name="plus" size={16} color={dark ? "#FAFAFA" : "#3F3F46"} /></m.button>
                            </div>
                          )}
                        </div>
                      ) : null;

                      const priceContent = priceInfo.hasPrice ? (
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                          {product.old_price && !priceInfo.isFrom && (
                             <span style={{ fontSize: viewMode === 'grid' ? 11 : 13, color: '#9CA3AF', textDecoration: 'line-through', fontWeight: 600 }}>
                               ${Number(product.old_price).toFixed(0)}
                             </span>
                          )}
                          {priceInfo.isFrom ? (
                            <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4 }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: menuTheme ? menuHexAlpha(menuTheme.text, 'B3') : (dark ? '#A1A1AA' : '#6B7280') }}>Desde</span>
                              <span style={{ fontSize: viewMode === 'grid' ? 13 : 16, fontWeight: 800, color: menuTheme ? menuTheme.primary : (dark ? '#FAFAFA' : '#111827') }}>
                                ${Number(priceInfo.amount).toFixed(0)}
                              </span>
                            </span>
                          ) : (
                            <span style={{ fontSize: viewMode === 'grid' ? 13 : 16, fontWeight: 800, color: menuTheme ? menuTheme.primary : (dark ? '#FAFAFA' : '#111827') }}>
                              ${Number(priceInfo.amount).toFixed(0)}
                            </span>
                          )}
                        </div>
                      ) : null;

                      return (
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          marginTop: viewMode === 'list' ? (product.image_url ? 'auto' : 4) : 8, 
                          paddingTop: viewMode === 'list' ? (product.image_url ? 8 : 0) : 2, 
                          gap: 8,
                          width: '100%' 
                        }}>
                          {priceContent || <div />}
                          {addToCartControls}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
              })}
            </div>
            

          </m.div>
        );
      })}
        {filteredCategories.length > 0 && (
          <div style={{ padding: '24px 20px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: menuTheme ? menuHexAlpha(menuTheme.text, 'B3') : (dark ? '#A1A1AA' : '#71717A'), lineHeight: 1.5, margin: 0, fontWeight: 500 }}>
              Aviso legal: Los precios, imágenes y descripciones son administrados por cada negocio y pueden cambiar. CityMap no se responsabiliza por diferencias al momento de la compra.
            </p>
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', opacity: 1 }}>
              <img src="/citymap.mx.png" alt="CityMap" width={200} height={60} style={{ height: 60, width: 200, filter: menuTheme ? (textOnMenuSurface(menuTheme.lastColor) === '#FFFFFF' ? 'brightness(0) invert(1)' : 'brightness(0)') : (dark ? "brightness(0) invert(1)" : "brightness(0)") }} />
            </div>
          </div>
        )}
      </div>
            </div>
          </m.div>
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

      {/* Aviso de sección fuera de horario: mismo toast, con reloj ámbar. */}
      {offHoursNotice && (
        <div role="status" aria-live="polite" style={{
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
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="clock" size={12} color="#fff" sw={2.5} />
          </div>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{offHoursNotice}</span>
        </div>
      )}

      {/* Floating Cart Button */}
      {cartCount > 0 && menuIntent !== 'local' && (showMenuModal || inline) && (
        <div style={{ position: 'fixed', bottom: 20, left: 0, right: 0, zIndex: 90000, display: 'flex', justifyContent: 'center', padding: '0 16px', pointerEvents: 'none' }}>
          <button onClick={() => setIsOpen(true)} style={{ width: '100%', maxWidth: 568, pointerEvents: 'auto', background: '#18181B', color: '#FFFFFF', border: 'none', borderRadius: 16, padding: '14px 20px', fontSize: 16, fontWeight: 800, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 8px 32px rgba(24, 24, 27, 0.4)' }}>
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
          T={menuT} 
          menuIntent={menuIntent}
        />
      )}

      <CartDrawer business={business} T={menuT} />

      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}

