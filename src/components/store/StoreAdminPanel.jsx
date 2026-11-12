import {isAdminUser} from '../../lib/adminAccess.js';
import { useState, useEffect, useRef } from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {isCatalogBusiness,readLegacyCatalog,saveStoreKind} from '../../lib/storePresentation.js';
import {useUIStore} from '../../store/useUIStore.js';
import {useDataStore} from '../../store/useDataStore.js';
import { sb } from '../../lib/supabase.js';
import Icon from '../ui/Icon.jsx';
import BizShareHub from '../BizShareHub.jsx';
import { lazy } from "react";
import { useAuthStore } from "../../store/useAuthStore.js";

const Uploader = lazy(() => import('../Uploader.jsx'));
import StoreMonetizationTab from './StoreMonetizationTab.jsx';
import StoreCategoriesTab from './StoreCategoriesTab.jsx';
import StoreProductsTab from './StoreProductsTab.jsx';
import {defaultPromotion} from './StorePromotionFields.jsx';
import StoreOptionsTab from './StoreOptionsTab.jsx';

export default function StoreAdminPanel({ business, onClose, T, dataClient = sb }) {
  const profile = useAuthStore(state => state.profile);
  const user = useAuthStore(state => state.user);

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Views: 'cats' | 'prods' | 'prodForm' | 'opts' | 'optForm'
  const [view, setView] = useState('cats');
  
  const queryClient = useQueryClient();
  const [isCatalog, setIsCatalog] = useState(() => isCatalogBusiness(business));
  const [typeSaving,setTypeSaving]=useState(false);
  const [typeMessage,setTypeMessage]=useState('');
  const legacyChecked=useRef(new Set());
  const handleToggleType = async (catalog) => {
    if(typeSaving) return;
    setTypeSaving(true);setTypeMessage('Guardando…');
    try {
      const updated = await saveStoreKind(business,catalog,dataClient);
      setIsCatalog(updated.is_catalog);
      useUIStore.setState(state=>state.selected?.id===business.id?{selected:{...state.selected,is_catalog:updated.is_catalog}}:{});
      useDataStore.setState(state=>({mapPins:state.mapPins.map(row=>row.id===business.id?{...row,is_catalog:updated.is_catalog}:row)}));
      queryClient.setQueriesData({queryKey:['business-menu']},cached=>cached?.id===business.id?{...cached,is_catalog:updated.is_catalog}:cached);
      setTypeMessage(updated.is_catalog?'Catálogo guardado':'Menú guardado');
    } catch(error) {setTypeMessage(error.message || 'No se pudo guardar el tipo. Intenta de nuevo.');}
    finally {setTypeSaving(false);}
  };
  useEffect(()=>{
    if(legacyChecked.current.has(business.id)) return;
    legacyChecked.current.add(business.id);
    const legacy=readLegacyCatalog(business.id);
    if(typeof business.is_catalog !== 'boolean' && legacy !== null) handleToggleType(legacy);
    // Carry an existing browser-only choice into the saved business once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[business.id]);

  const [activeCat, setActiveCat] = useState(null);
  const [promotionForm,setPromotionForm]=useState(null);
  const openPromotion=(category,product=null)=>{
    setActiveCat(category);
    setPromotionForm(product?{...product,promotion:{...defaultPromotion,...product.promotion,enabled:true}}:{name:'',price:'',description:'',image_url:'',is_available:true,promotion:{...defaultPromotion}});
    setView('prodForm');
  };
  const [activeProd, setActiveProd] = useState(null);
  const [activeOpt, setActiveOpt] = useState(null);


  const loadData = async () => {
    setLoading(true);
    try {
      let data = null;
      try {
        data = await dataClient.get('store_categories', `?business_id=eq.${business.id}&select=id,name,sort_order,image_url,store_products(id,name,description,price,image_url,is_available,sort_order,category_id,promotion,store_product_options(id,name,type,is_required,store_option_values(id,label,extra_price)))&order=sort_order.asc`);
      } catch {
        // Fallback in case image_url column isn't ready or has permission issues
        data = await dataClient.get('store_categories', `?business_id=eq.${business.id}&select=id,name,sort_order,store_products(id,name,description,price,image_url,is_available,sort_order,category_id,promotion,store_product_options(id,name,type,is_required,store_option_values(id,label,extra_price)))&order=sort_order.asc`);
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
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
              else if (view === 'prodForm' && promotionForm) setView('promos');
              else if (view === 'opts' || view === 'prodForm') setView('prods');
              else if (view === 'prods' || view === 'promos') setView('cats');
            }} style={{ background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}><Icon name="chevron" size={20} color={T.text} style={{ transform: "rotate(180deg)" }} /></button>
          )}
          <div style={{ flex: 1, fontSize: 18, fontWeight: 800, color: T.text }}>
            {view === 'cats' && (isCatalog ? "Gestor de Catálogo" : "Gestor de Menú")}
            {view === 'prods' && currentCat?.name}
            {view === 'prodForm' && (promotionForm?(promotionForm.id?'Editar promoción':'Crear promoción'):'Producto')}
            {view === 'promos' && 'Promociones'}
            {view === 'opts' && "Opciones: " + currentProd?.name}
            {view === 'optForm' && "Opción del Producto"}
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: "50%", background: T.border, color: T.text, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icon name="x" size={16} /></button>
        </div>

        {typeMessage&&<p role="status" style={{margin:'10px 16px 0',fontSize:12,color:T.sub}}>{typeMessage}</p>}
        {/* LOADING */}
        {loading && <div style={{ padding: 40, textAlign: 'center', color: T.sub }}>Cargando...</div>}

        {/* 1. CATEGORIES VIEW */}
        {!loading && view === 'cats' && (
          <div style={{ paddingBottom: 32 }}>
            <button onClick={()=>setView('promos')} style={{display:'flex',alignItems:'center',gap:12,width:'calc(100% - 32px)',margin:'16px 16px 0',padding:16,border:'1px solid #FCD34D',borderRadius:14,background:'#FFFBEB',color:'#78350F',textAlign:'left',fontFamily:'inherit',cursor:'pointer'}}>
              <span style={{fontSize:28}} aria-hidden="true">🏷️</span><span style={{flex:1}}><strong style={{display:'block',fontSize:15}}>Crear promoción</strong><span style={{display:'block',fontSize:12,marginTop:4,lineHeight:1.5}}>Ofertas y combos con un banner al inicio de tu {isCatalog?'catálogo':'menú'}</span></span><span aria-hidden="true" style={{fontSize:24}}>›</span>
            </button>
            <StoreCategoriesTab
              business={business}
              categories={categories}
              loadData={loadData}
              isCatalog={isCatalog}
              typeSaving={typeSaving}
              handleToggleType={handleToggleType}
              isAdmin={isAdminUser(user,profile)}
              setActiveCat={category=>{setPromotionForm(null);setActiveCat(category);}}
              setView={setView}
              inpH={inpH}
              T={T}
              setLoading={setLoading}
            />
            
            <div style={{ padding: "0 16px" }}>
              {/* COMPARTIR MI NEGOCIO (PR #240): el mismo centro que el
                  modal de Mi Perfil (Redes / Para imprimir / QR suelto).
                  Antes esta sección solo descargaba los 2 QR pelados. */}
            <div style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid ${T.border}` }}>
              <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 16, overflow: 'hidden', marginBottom: 24 }}>
                <div style={{ padding: 20 }}>
                  <BizShareHub biz={business} T={T} isCatalog={isCatalog} />
                </div>
              </div>
            </div>
            
            <StoreMonetizationTab business={business} T={T} inpH={inpH} profile={profile} />
            </div>
          </div>
        )}

        {!loading && view === 'promos' && <section style={{padding:16,color:T.text}}>
          <h2 style={{fontSize:18,margin:'0 0 8px'}}>¿Qué quieres promocionar?</h2>
          <p style={{fontSize:13,color:T.sub,lineHeight:1.5,margin:'0 0 20px'}}>Elige un producto de tu {isCatalog?'catálogo':'menú'} o crea un combo nuevo. Después podrás definir el precio y la vigencia.</p>
          {!categories.length && <div style={{padding:20,border:`1px solid ${T.border}`,borderRadius:14}}><p style={{fontSize:14}}>Agrega tu primera categoría para organizar la promoción.</p><button onClick={()=>setView('cats')} style={{...inpH,cursor:'pointer',fontWeight:700}}>Agregar categoría</button></div>}
          {categories.map(category=><div key={category.id} style={{marginBottom:16,padding:16,border:`1px solid ${T.border}`,borderRadius:14,background:T.white}}>
            <h3 style={{margin:'0 0 12px',fontSize:15}}>{category.name}</h3>
            <button onClick={()=>openPromotion(category)} style={{...inpH,cursor:'pointer',fontWeight:800,marginBottom:8}}>+ Crear promoción o combo</button>
            {(category.store_products||[]).map(product=><button key={product.id} onClick={()=>openPromotion(category,product)} style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,width:'100%',padding:'14px 0',background:'transparent',border:0,borderBottom:`1px solid ${T.border}`,color:T.text,textAlign:'left',fontFamily:'inherit',cursor:'pointer'}}><span><strong style={{display:'block',fontSize:14}}>{product.name}</strong><span style={{fontSize:12,color:T.sub}}>{product.promotion?.enabled?'Editar promoción':'Agregar promoción'}</span></span><span aria-hidden="true">›</span></button>)}
          </div>)}
        </section>}

        {/* 2. PRODUCTS VIEW */}
        {/* PRODUCTS & PRODUCT FORM VIEW */}
        {!loading && currentCat && (view === 'prods' || view === 'prodForm') && (
          <StoreProductsTab 
            dataClient={dataClient}
            initialForm={promotionForm}
            returnView={promotionForm?'promos':'prods'}
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
