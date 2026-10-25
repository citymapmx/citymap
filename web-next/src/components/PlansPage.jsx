import { useState, useEffect } from "react";
import { AnimatePresence, m } from "framer-motion";
import Icon from "./ui/Icon.jsx";
import CompactCard from "./cards/CompactCard.jsx";
import DestacadoCard from "./cards/DestacadoCard.jsx";
import FeaturedCard from "./cards/FeaturedCard.jsx";
import { useUIStore } from "../store/useUIStore.js";
import { useDataStore } from "../store/useDataStore.js";
import { getCountryCode } from "../lib/domain.js";

export default function PlansPage({ myBizList, onAddBiz, T, dark, onClose }) {
  const activeCity = useUIStore(s => s.activeCity);
  const cities = useDataStore(s => s.cities);
  const countryCode = getCountryCode(activeCity, cities);

  // Map the 'plan' DB field to the plan key used in this component
  // DB values: free, pro, elite, premium (premium = elite)
  const rawPlan = myBizList?.[0]?.plan || "free";
  const currentPlanKey = rawPlan === "premium" ? "elite" : ["pro", "destacado"].includes(rawPlan) ? "pro" : rawPlan === "elite" ? "elite" : "free";

  const getPricing = () => {
    if (countryCode === "es") {
      return {
        currency: "EUR",
        symbol: "€",
        proMonthly: "9.99€",
        oldProMonthly: "19.99€",
        proAnnual: "99€",
        oldProAnnual: "199€",
        eliteMonthly: "19.99€",
        oldEliteMonthly: "39.99€",
        eliteAnnual: "199€",
        oldEliteAnnual: "399€",
      };
    } else if (countryCode === "us") {
      return {
        currency: "USD",
        symbol: "$",
        proMonthly: "$9.99",
        oldProMonthly: "$19.99",
        proAnnual: "$99",
        oldProAnnual: "$199",
        eliteMonthly: "$19.99",
        oldEliteMonthly: "$39.99",
        eliteAnnual: "$199",
        oldEliteAnnual: "$399",
      };
    } else {
      // Default: Mexico (MXN)
      return {
        currency: "MXN",
        symbol: "$",
        proMonthly: "$99",
        oldProMonthly: "$199",
        proAnnual: "$990",
        oldProAnnual: "$1,990",
        eliteMonthly: "$249",
        oldEliteMonthly: "$499",
        eliteAnnual: "$2,490",
        oldEliteAnnual: "$4,990",
      };
    }
  };

  const pricing = getPricing();
  useEffect(() => { window.scrollTo(0, 0); }, []);
  const [billing, setBilling] = useState("monthly"); // "monthly" | "annual"
  const [selectedPlan, setSelectedPlan] = useState(null);
  useEffect(()=>{
    if(!selectedPlan)return;
    const onKey=event=>{if(event.key==='Escape')setSelectedPlan(null);};
    document.addEventListener('keydown',onKey);
    return ()=>document.removeEventListener('keydown',onKey);
  },[selectedPlan]);
  const [lightbox, setLightbox] = useState(null);
  const [touchStartX, setTouchStartX] = useState(null);

  const mockFree = {
    id: "mock_free",
    name: "Donatella",
    category: "Restaurantes",
    plan: "gratis",
    rating: 4.9,
    review_count: 12,
    photos: [{ url: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80" }],
  };

  const mockPro = {
    id: "mock_pro",
    name: "Donatella",
    category: "Restaurantes",
    plan: "destacado",
    rating: 4.9,
    review_count: 12,
    photos: [{ url: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80" }],
  };

  const mockElite = {
    id: "mock_elite",
    name: "Donatella",
    category: "Restaurantes",
    plan: "premium",
    logo_url: "https://images.unsplash.com/photo-1590947132387-155cc02f3212?auto=format&fit=crop&w=200&q=80",
    rating: 4.9,
    review_count: 12,
    photos: [{ url: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80" }],
    whatsapp: "1234567890",
    instagram: "donatella.mx",
    facebook: "donatella"
  };

  const plans = [
    { 
      key: "free", 
      name: "Gratuito", 
      priceMonthly: `${pricing.symbol}0`, 
      priceAnnual: `${pricing.symbol}0`, 
      desc: "Ideal para que cualquier negocio tenga presencia básica.",
      color: dark ? "#9CA3AF" : "#6B7280", 
      icon: "user", 
      features: ["Página pública del negocio en CityMap", "Portada e Información del negocio", "Teléfono y Dirección", "Horarios", "Banner estándar"], 
    },
    { 
      key: "pro", 
      name: "Destacado", 
      priceMonthly: pricing.proMonthly, 
      oldPriceMonthly: pricing.oldProMonthly,
      priceAnnual: pricing.proAnnual, 
      oldPriceAnnual: pricing.oldProAnnual,
      desc: "Ideal para negocios que buscan captar clientes y mayor visibilidad.",
      color: dark ? "#E2E8F0" : "#0F172A", 
      icon: "star", 
      badge: "Más popular",
      features: ["Todo lo del plan gratuito, más:", "Posicionamiento SEO en Google", "Banner destacado", "Galería de fotos", "Enlace a WhatsApp y redes sociales", "Menú QR (Para Local)", "Panel de administrador"], 
    },
    { 
      key: "elite", 
      name: "Premium", 
      priceMonthly: pricing.eliteMonthly, 
      oldPriceMonthly: pricing.oldEliteMonthly,
      priceAnnual: pricing.eliteAnnual, 
      oldPriceAnnual: pricing.oldEliteAnnual,
      desc: "Todas las herramientas para dominar tu presencia digital y vender más.",
      color: dark ? "#E2E8F0" : "#0F172A", 
      icon: "award", 
      badge: "Lo mejor",
      features: [
        "Todo lo del plan Destacado, más:", 
        "Menú interactivo indexado en Google",
        "Banner premium y Logotipo en mapa", 
        "Vídeos", 
        "Carrito enlazado a WhatsApp", 
        "Amplia galería de fotos", 
        "Gestión de Eventos y Reservas", 
        "Reseñas de Google Maps", 
        "Estadísticas y Soporte prioritario",
        "Tarjetas de lealtad",
        "Integración de cupones",
        "Próximamente más herramientas..."
      ], 
      screenshots: [
        { url: "/plans/menu-interactivo.png", label: "Menú Interactivo y Carrito" },
        { url: "/plans/estadisticas.png", label: "Panel de Estadísticas" },
        { url: "/plans/reservas.png", label: "Gestión de Reservas" }
      ]
    },
  ];

  const [showComparison,setShowComparison]=useState(false);
  const accent=dark?'#70ADFF':'#0066CC';
  const surface=dark?'#202023':'#FFFFFF';
  const pageBg=dark?'#161617':'#F5F5F7';
  const ink=dark?'#F5F5F7':'#1D1D1F';
  const muted=dark?'#ABABB1':'#6E6E73';
  const line=dark?'#353538':'#E5E5E8';
  const money=value=>Number(String(value).replace(/[^0-9.]/g,''));
  const monthlyEquivalent=p=>new Intl.NumberFormat(countryCode==='es'?'es-ES':'es-MX',{style:'currency',currency:pricing.currency,minimumFractionDigits:2,maximumFractionDigits:2}).format(money(p.priceAnnual)/12);
  const summaries={free:'Lo esencial para estar presente.',pro:'Más visibilidad y contacto directo.',elite:'Tu menú, pedidos y clientes en un lugar.'};
  const comparison=[
    ['Perfil, teléfono, dirección y horarios',true,true,true],
    ['Galería de fotos y banner destacado',false,true,true],
    ['WhatsApp y redes sociales',false,true,true],
    ['Menú QR para el local',false,true,true],
    ['Panel de administración',false,true,true],
    ['Menú interactivo',false,false,true],
    ['Carrito por WhatsApp',false,false,true],
    ['Eventos y reservas',false,false,true],
    ['Reseñas de Google Maps',false,false,true],
    ['Tarjetas de lealtad y cupones',false,false,true],
    ['Estadísticas y soporte prioritario',false,false,true]
  ];
  const isCurrent=p=>Boolean(myBizList?.length)&&p.key===currentPlanKey;
  const choosePlan=p=>{if(isCurrent(p))return;if(p.key==='free'){if(!myBizList?.length)onAddBiz?.();}else setSelectedPlan({plan:p,billing});};
  return (
    <div className="business-plans" style={{position:'fixed',inset:0,zIndex:9999,overflowY:'auto',background:pageBg,color:ink,fontFamily:'inherit',letterSpacing:0,'--plans-accent':accent,'--plans-line':line,'--plans-surface':surface}}>
      <style>{`
        .business-plans * {box-sizing:border-box}
        .business-plans button {font-family:inherit}
        .business-plans button:focus-visible,.business-plans summary:focus-visible {outline:3px solid var(--plans-accent);outline-offset:4px}
        .plans-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:16px}
        .plans-card{display:flex;flex-direction:column;padding:26px 24px;border:1px solid var(--plans-line);border-radius:26px;background:var(--plans-surface);min-width:0}
        .plans-card[data-plan="pro"]{order:1;border-color:var(--plans-accent)}
        .plans-card[data-plan="free"]{order:0}
        .plans-card[data-plan="elite"]{order:2}
        .plans-action{width:100%;min-height:46px;border-radius:999px;font-size:15px;font-weight:600;cursor:pointer}
        .plans-action:disabled{cursor:default;opacity:.65}
        .plans-feature{display:flex;gap:10px;align-items:flex-start;font-size:14px;line-height:1.5}
        .plans-compare{width:100%;border-collapse:collapse;min-width:590px;font-size:13px;text-align:left}
        .plans-compare th,.plans-compare td{padding:16px 12px;border-bottom:1px solid var(--plans-line)}
        .plans-compare :is(th,td):not(:first-child){text-align:center}
        .plans-details summary{cursor:pointer;font-size:13px;font-weight:500;line-height:1.5}
        .plans-details[open] summary{margin-bottom:16px}
        .plans-faq summary{cursor:pointer;list-style:none;display:flex;justify-content:space-between;gap:16px;font-size:15px;font-weight:600;line-height:1.5}
        .plans-faq summary::after{content:'+';font-size:20px;font-weight:400}
        .plans-faq[open] summary::after{content:'−'}
        @media(min-width:900px){.plans-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}.plans-card[data-plan="free"]{order:0}.plans-card[data-plan="pro"]{order:1}.plans-card[data-plan="elite"]{order:2}}
        @media(prefers-reduced-motion:reduce){.business-plans *{scroll-behavior:auto!important;transition:none!important}}
      `}</style>
      <header style={{position:'sticky',top:0,zIndex:10,background:dark?'rgba(22,22,23,.92)':'rgba(245,245,247,.92)',backdropFilter:'blur(20px)',borderBottom:`1px solid ${line}`}}>
        <div style={{maxWidth:1140,margin:'auto',padding:'12px 20px',display:'flex',alignItems:'center',gap:10,minHeight:62}}>
          <button aria-label="Volver" onClick={onClose} style={{width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',border:0,background:'transparent',color:ink,cursor:'pointer'}}><Icon name="chevron" size={22} color={ink} style={{transform:'rotate(180deg)'}}/></button>
          <span style={{fontSize:16,fontWeight:600,letterSpacing:'-.025em'}}>Planes para tu negocio</span>
        </div>
      </header>
      <main style={{maxWidth:1140,margin:'0 auto',padding:'0 20px 64px'}}>
        <section style={{textAlign:'center',padding:'36px 0 24px',maxWidth:620,margin:'auto'}}>
          <p style={{fontSize:12,fontWeight:600,letterSpacing:'.06em',color:muted,margin:'0 0 12px',textTransform:'uppercase'}}>CityMap para negocios</p>
          <h1 style={{fontFamily:'var(--heading)',fontSize:'clamp(30px,5vw,40px)',fontWeight:700,lineHeight:1.08,letterSpacing:'-.045em',margin:'0 auto 16px',maxWidth:560}}>Haz que más personas<br/>encuentren tu negocio.</h1>
          <p style={{fontSize:16,lineHeight:1.55,color:muted,margin:'0 auto',maxWidth:440}}>Desde tu primer perfil hasta un menú interactivo. Elige las herramientas que necesita tu negocio.</p>
        </section>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:10,marginBottom:26}}>
          <div role="group" aria-label="Periodo de facturación" style={{display:'inline-flex',padding:4,borderRadius:999,background:dark?'#2B2B2E':'#E8E8ED',gap:3}}>
            {[['monthly','Mensual'],['annual','Anual']].map(([value,label])=><button key={value} aria-pressed={billing===value} onClick={()=>setBilling(value)} style={{display:'flex',alignItems:'center',gap:8,minHeight:38,padding:'8px 17px',border:0,borderRadius:999,background:billing===value?surface:'transparent',boxShadow:billing===value?'0 1px 5px rgba(0,0,0,.09)':'none',color:billing===value?ink:muted,fontSize:13,fontWeight:600,cursor:'pointer'}}>{label}{value==='annual'&&<span style={{color:accent,fontSize:11}}>−17%</span>}</button>)}
          </div>
          <p role="status" style={{fontSize:12,lineHeight:1.4,color:muted,margin:0}}>{billing==='annual'?'Un solo pago al año. Ahorra frente al pago mensual.':'Precios por negocio. Elige pago mensual o anual.'}</p>
        </div>
        <section className="plans-grid" aria-label="Planes disponibles">
          {plans.map(p=><article className="plans-card" data-plan={p.key} key={p.key}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,minHeight:24,marginBottom:12}}>
              <span style={{fontSize:12,color:muted,fontWeight:500}}>{p.key==='free'?'Para empezar':p.key==='pro'?'Para ganar visibilidad':'Para conectar y vender'}</span>
              {p.key==='pro'&&<span style={{fontSize:11,fontWeight:600,color:accent,background:dark?'#18304A':'#EDF5FF',padding:'5px 10px',borderRadius:999}}>Recomendado</span>}
            </div>
            <h2 style={{fontFamily:'inherit',fontSize:22,fontWeight:700,letterSpacing:'-.015em',lineHeight:1.2,margin:'0 0 7px'}}>{p.name}</h2>
            <p style={{fontSize:14,lineHeight:1.5,color:muted,margin:'0 0 20px'}}>{summaries[p.key]}</p>
            <div style={{display:'flex',alignItems:'baseline',flexWrap:'wrap',gap:6}}><strong style={{fontSize:36,fontWeight:800,lineHeight:1.1,letterSpacing:'-.05em',fontVariantNumeric:'tabular-nums'}}>{billing==='annual'?p.priceAnnual:p.priceMonthly}</strong><span style={{fontSize:12,color:muted}}>{pricing.currency} / {billing==='annual'?'año':'mes'}</span></div>
            <p style={{minHeight:34,margin:'7px 0 18px',fontSize:12,lineHeight:1.5,color:muted}}>{p.key==='free'?'Sin costo de suscripción.':billing==='annual'?`Equivale a ${monthlyEquivalent(p)} al mes. Se cobra el total anual.`:'Facturación mensual.'}</p>
            <button className="plans-action" disabled={isCurrent(p)||(p.key==='free'&&Boolean(myBizList?.length))} onClick={()=>choosePlan(p)} style={{background:p.key==='pro'?accent:'transparent',border:`1px solid ${p.key==='pro'?accent:line}`,color:p.key==='pro'?(dark?'#101827':'#FFFFFF'):ink}}>{isCurrent(p)?'Tu plan actual':p.key==='free'?(myBizList?.length?'Incluido sin costo':'Crear perfil gratis'):`Elegir ${p.name}`}</button>
            <div style={{display:'flex',flexDirection:'column',gap:12,paddingTop:22,marginTop:22,borderTop:`1px solid ${line}`}}>{p.features.map(f=><div className="plans-feature" key={f}><span aria-hidden="true" style={{color:p.key==='pro'?accent:muted,fontSize:15}}>✓</span><span>{f}</span></div>)}</div>
            <section aria-label={`Vista previa del plan ${p.name}`} style={{marginTop:24,paddingTop:20,borderTop:`1px solid ${line}`,color:muted}}><h3 style={{fontSize:13,fontWeight:600,textAlign:"center",margin:"0 0 12px"}}>Así se verá tu negocio</h3><div style={{pointerEvents:'none',borderRadius:14,overflow:'hidden',marginTop:12}}>{p.key==='free'?<CompactCard b={mockFree} T={T} favIds={[]} toggleFav={()=>{}} distStr="1.6 km" realFavs={4}/>:p.key==='pro'?<DestacadoCard b={mockPro} T={T} favIds={[]} toggleFav={()=>{}} distStr="1.6 km" realFavs={12}/>:<FeaturedCard b={mockElite} T={T} favIds={[]} toggleFav={()=>{}} distStr="1.6 km" realFavs={45} showStars={false}/>}</div>{p.screenshots&&<div style={{display:'flex',gap:8,overflowX:'auto',marginTop:14}}>{p.screenshots.map((shot,index)=><button key={shot.url} aria-label={`Ampliar ${shot.label}`} onClick={()=>setLightbox({items:p.screenshots,index})} style={{flex:'0 0 100px',background:'transparent',border:0,padding:0,cursor:'pointer',color:muted}}><img src={shot.url} alt={shot.label} style={{width:'100%',borderRadius:10}}/><span style={{fontSize:11}}>{shot.label}</span></button>)}</div>}</section>
          </article>)}
        </section>
        <section style={{marginTop:28,textAlign:'center'}}>
          <button aria-expanded={showComparison} aria-controls="plan-comparison" onClick={()=>setShowComparison(value=>!value)} style={{background:'transparent',border:0,color:accent,fontSize:15,fontWeight:500,padding:'12px 16px',cursor:'pointer'}}>{showComparison?'Ocultar comparación':'Comparar todas las funciones'} <span aria-hidden="true">{showComparison?'−':'+'}</span></button>
          {showComparison&&<div id="plan-comparison" role="region" aria-label="Comparación de planes" tabIndex={0} style={{overflowX:'auto',textAlign:'left',marginTop:14,background:surface,border:`1px solid ${line}`,borderRadius:22,padding:'4px 12px'}}><table className="plans-compare"><caption style={{textAlign:'left',padding:'18px 12px',fontWeight:600,fontSize:16}}>Encuentra lo que necesita tu negocio</caption><thead><tr><th scope="col">Funciones</th>{plans.map(p=><th scope="col" key={p.key} style={{color:p.key==='pro'?accent:ink}}>{p.name}</th>)}</tr></thead><tbody>{comparison.map(([label,...values])=><tr key={label}><th scope="row" style={{fontWeight:400}}>{label}</th>{values.map((yes,index)=><td key={index} aria-label={yes?'Incluido':'No incluido'} style={{color:yes?ink:muted}}>{yes?'✓':'—'}</td>)}</tr>)}</tbody></table></div>}
        </section>
        <section style={{maxWidth:720,margin:'48px auto 0'}}>
          <h2 style={{fontFamily:'inherit',fontSize:26,fontWeight:600,letterSpacing:'-.035em',textAlign:'center',margin:'0 0 22px'}}>Antes de elegir.</h2>
          {[
            ['¿Cuál es la diferencia entre los planes?','Gratuito incluye tu información básica. Destacado añade visibilidad, fotos y contacto directo. Premium incorpora el menú interactivo, el carrito por WhatsApp y herramientas para gestionar clientes.'],
            ['¿Cómo se realiza el pago?','Al elegir un plan de pago se muestra el importe y el periodo de facturación. El pago con tarjeta se realiza a través de Stripe.'],
            ['¿Cómo funciona el pago anual?','Se cobra el importe completo de un año en un solo pago. El equivalente mensual se muestra como referencia para que puedas comparar.'],
            ['¿Todavía no tengo un negocio registrado?','Puedes crear tu perfil con el plan Gratuito. Si necesitas ayuda para registrarlo o elegir un plan, contacta a un asesor.']
          ].map(([q,a])=><details className="plans-faq" key={q} style={{padding:'20px 0',borderBottom:`1px solid ${line}`}}><summary>{q}</summary><p style={{fontSize:14,lineHeight:1.65,color:muted,margin:'12px 26px 0 0'}}>{a}</p></details>)}
        </section>
        <section style={{textAlign:'center',margin:'42px auto 0',padding:'28px 20px',maxWidth:720,background:surface,borderRadius:24,border:`1px solid ${line}`}}><h2 style={{fontFamily:'inherit',fontSize:21,fontWeight:600,letterSpacing:'-.025em',margin:'0 0 8px'}}>Te ayudamos a elegir.</h2><p style={{fontSize:14,lineHeight:1.5,color:muted,margin:'0 auto 18px',maxWidth:380}}>Cuéntanos sobre tu negocio y encuentra el plan que mejor se adapte a lo que necesitas.</p><button onClick={()=>window.open('https://wa.me/523223792428?text=Hola, me interesa conocer más sobre los planes de CityMap para mi negocio.','_blank')} style={{border:0,background:'transparent',color:accent,fontSize:14,fontWeight:500,padding:10,cursor:'pointer'}}>Hablar con un asesor ↗</button></section>
      </main>

      {/* Payment Modal */}
      <AnimatePresence>
        {selectedPlan && (
          <m.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            style={{ position: "fixed", inset: 0, zIndex: 100000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", padding: 20 }} 
            onClick={() => setSelectedPlan(null)}
          >
            <m.div 
              initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }} transition={{ duration: 0.3, ease: "easeOut" }}
              onClick={e => e.stopPropagation()} 
              role="dialog" aria-modal="true" aria-label={`Elegir plan ${selectedPlan.plan.name}`}
              style={{ background: surface, width: "100%", maxWidth: 340, borderRadius: 24, padding: "24px", position: "relative", boxShadow: "0 24px 48px rgba(0,0,0,0.2)" }}
            >
              <button aria-label="Cerrar selección de plan" onClick={() => setSelectedPlan(null)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", fontSize: 24, cursor: "pointer", color: T.sub, padding: 4 }}>×</button>
              
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, marginTop: 4 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: selectedPlan.plan.iconBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name={selectedPlan.plan.icon} size={20} color={selectedPlan.plan.color} />
                </div>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 600, color: T.text, margin: 0 }}>Plan {selectedPlan.plan.name}</h2>
                  <span style={{ fontSize: 11, color: T.sub, fontWeight: 600 }}>Suscripción {selectedPlan.billing === "monthly" ? "mensual" : "anual"}</span>
                </div>
              </div>
              
              <div style={{ background: dark ? "rgba(255,255,255,0.04)" : "#F8FAFC", borderRadius: 14, padding: "16px", marginBottom: 20, marginTop: 16 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                  <span style={{ fontSize: 36, fontWeight: 600, color: ink, letterSpacing: -0.5 }}>{selectedPlan.billing === "monthly" ? selectedPlan.plan.priceMonthly : selectedPlan.plan.priceAnnual}</span>
                  <span style={{ fontSize: 16, color: T.sub, fontWeight: 500 }}>{pricing.currency}/{selectedPlan.billing === "monthly" ? "mes" : "año"}</span>
                </div>
                <p style={{ fontSize: 12, color: T.sub, margin: 0 }}>{selectedPlan.billing === "monthly" ? "Se cobra cada mes." : "Se cobra el importe completo del año."}</p>
              </div>

              <button 
                onClick={async () => {
                  try {
                    const biz_id = myBizList?.[0]?.id;
                    if (!biz_id) {
                      if (window.confirm("Para activar un plan, primero debes crear tu negocio en la plataforma. ¿Te gustaría chatear con un asesor por WhatsApp para ayudarte a registrar tu negocio y activar tu plan de inmediato?")) {
                        const planName = selectedPlan?.plan?.name || "";
                        window.open(`https://wa.me/523223792428?text=Hola, me interesa adquirir el Plan ${planName} para mi negocio y necesito ayuda para registrarlo.`, "_blank");
                      }
                      return;
                    }
                    
                    const apiUrl = window.location.origin.includes('localhost') || window.location.origin.includes('capacitor') 
                      ? 'https://citymap.mx/api/stripe-checkout' 
                      : '/api/stripe-checkout';

                    const res = await fetch(apiUrl, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        biz_id: biz_id,
                        plan_id: selectedPlan.plan.key, // 'pro' o 'elite'
                        interval: selectedPlan.billing === "monthly" ? "month" : "year",
                        host_url: 'https://citymap.mx',
                        currency: pricing.currency
                      })
                    });
                    
                    const data = await res.json();
                    if (data.url) {
                      if (window.location.origin.includes('capacitor') || window.location.origin.includes('localhost')) {
                        const { Browser } = await import('@capacitor/browser');
                        await Browser.open({ url: data.url });
                      } else {
                        window.location.href = data.url;
                      }
                    } else {
                      alert("Error iniciando Stripe: " + (data.error || "Desconocido"));
                    }
                  } catch (e) {
                    console.error(e);
                    alert("Error: " + e.message);
                  }
                }} 
                style={{ width: "100%", padding: 16, background: accent, color: dark?"#101827":"#fff", borderRadius: 999, fontWeight: 800, fontSize: 16, border: "none", cursor: "pointer", boxShadow: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 10 }}
              >
                Pagar con Tarjeta (Stripe)
              </button>
              <p style={{ fontSize: 11, color: T.sub, textAlign: "center", margin: 0 }}>🔒 Pago 100% seguro y encriptado</p>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
      
      {/* Lightbox for Enlarged Image */}
      {lightbox && (
        <div 
          style={{ position: "fixed", inset: 0, zIndex: 999999, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" }}
        >
          {/* Close Button */}
          <button onClick={() => setLightbox(null)} style={{ position: "absolute", top: 20, right: 20, background: "rgba(0,0,0,0.5)", color: "#fff", width: 44, height: 44, borderRadius: 22, display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer", zIndex: 10 }}>
            <Icon name="x" size={24} color="#fff" />
          </button>
          
          {/* Prev Button */}
          {lightbox.index > 0 && (
            <button onClick={(e) => { e.stopPropagation(); setLightbox({ ...lightbox, index: lightbox.index - 1 }); }} style={{ position: "absolute", left: 16, background: "rgba(0,0,0,0.5)", color: "#fff", width: 44, height: 44, borderRadius: 22, display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer", zIndex: 10 }}>
              <Icon name="arrow_left" size={24} color="#fff" />
            </button>
          )}

          <div 
            style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }} 
            onClick={() => setLightbox(null)}
            onTouchStart={(e) => setTouchStartX(e.targetTouches[0].clientX)}
            onTouchEnd={(e) => {
              if (touchStartX === null) return;
              const touchEndX = e.changedTouches[0].clientX;
              const diff = touchStartX - touchEndX;
              if (diff > 50 && lightbox.index < lightbox.items.length - 1) {
                setLightbox({ ...lightbox, index: lightbox.index + 1 });
              } else if (diff < -50 && lightbox.index > 0) {
                setLightbox({ ...lightbox, index: lightbox.index - 1 });
              }
              setTouchStartX(null);
            }}
          >
            <img src={lightbox.items[lightbox.index].url} alt={lightbox.items[lightbox.index].label} onClick={e => e.stopPropagation()} style={{ maxWidth: "100%", maxHeight: "90vh", objectFit: "contain", filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.4))" }} />
          </div>

          {/* Next Button */}
          {lightbox.index < lightbox.items.length - 1 && (
            <button onClick={(e) => { e.stopPropagation(); setLightbox({ ...lightbox, index: lightbox.index + 1 }); }} style={{ position: "absolute", right: 16, background: "rgba(0,0,0,0.5)", color: "#fff", width: 44, height: 44, borderRadius: 22, display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer", zIndex: 10 }}>
              <Icon name="arrow_right" size={24} color="#fff" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
