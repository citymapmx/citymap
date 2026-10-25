import React,{useEffect,useState} from 'react';
import {getProductPriceLabel,getProductDisplayPrice} from '../../lib/menuPricing.js';
import {isPromotionActive,getPromotionProduct,promotionScheduleLabel} from '../../lib/menuPromotions.js';
import {getThumbUrl} from '../../lib/utils.js';

export default function StorePromotions({products = [],intent,timeZone,T,onSelect}) {
  const [now,setNow]=useState(()=>new Date());
  useEffect(()=>{const update=()=>setNow(new Date());const timer=setInterval(update,15000);window.addEventListener('focus',update);document.addEventListener('visibilitychange',update);return()=>{clearInterval(timer);window.removeEventListener('focus',update);document.removeEventListener('visibilitychange',update);};},[]);
  const active=products.filter(product=>isPromotionActive(product,{now,timeZone,intent}));
  if(!active.length) return null;
  return <section aria-label="Promociones del menú" style={{margin:'4px 0 18px'}}>
    <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',gap:12,margin:'0 16px 10px'}}><h2 style={{fontSize:18,letterSpacing:-.3,fontWeight:800,margin:0,color:T.text}}>Promociones</h2>{active.length>1&&<span style={{fontSize:12,color:T.sub}}>Desliza para ver más</span>}</div>
    <div style={{display:'flex',gap:12,overflowX:'auto',scrollSnapType:'x mandatory',scrollbarWidth:'none',padding:'0 16px 4px'}}>
      {active.map(product=>{const p=product.promotion,promoted=getPromotionProduct(product,timeZone),current=getProductDisplayPrice(promoted),original=getProductDisplayPrice(product);return <article key={product.id} style={{flex:`0 0 ${active.length>1?'88%':'100%'}`,minWidth:0,scrollSnapAlign:'center',background:'#30120E',color:'#fff',borderRadius:20,overflow:'hidden',position:'relative',boxSizing:'border-box'}}>
        {product.image_url&&<img src={getThumbUrl(product.image_url,800)} alt="" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',opacity:.58}}/>}
        <div style={{position:'absolute',inset:0,background:'linear-gradient(90deg,rgba(29,12,8,.96) 0%,rgba(29,12,8,.78) 52%,rgba(29,12,8,.12) 100%)'}}/>
        <div style={{position:'relative',padding:20,display:'flex',flexDirection:'column',alignItems:'flex-start',gap:9,minHeight:235,boxSizing:'border-box'}}>
          <span style={{fontSize:10,fontWeight:800,letterSpacing:.9,textTransform:'uppercase',background:'#FCD34D',color:'#35170A',padding:'5px 9px',borderRadius:999}}>{p.badge || 'Promoción'}</span>
          <h3 style={{fontSize:24,fontWeight:900,letterSpacing:-.6,lineHeight:1.12,margin:0,maxWidth:'85%',textWrap:'balance'}}>{p.title || product.name}</h3>
          <div style={{display:'flex',alignItems:'baseline',gap:8,flexWrap:'wrap'}}><strong style={{fontSize:25,fontWeight:900,color:'#FDE68A'}}>{getProductPriceLabel(promoted)}</strong>{original.hasPrice && original.amount>current.amount && <del style={{fontSize:13,color:'#E7D6D0'}}>{getProductPriceLabel(product)}</del>}</div>
          {promotionScheduleLabel(p)&&<p style={{fontSize:11,lineHeight:1.4,margin:0,maxWidth:'90%',color:'#F5E8E2'}}>{promotionScheduleLabel(p)}</p>}
          {p.conditions&&<p style={{fontSize:11,lineHeight:1.4,margin:0,color:'#E7D6D0',maxWidth:'90%',overflowWrap:'anywhere'}}>{p.conditions}</p>}
          <button type="button" onClick={()=>{if(isPromotionActive(product,{timeZone,intent}))onSelect(getPromotionProduct(product,timeZone));else setNow(new Date());}} style={{marginTop:'auto',padding:'11px 15px',minHeight:44,borderRadius:11,border:0,background:'#FCD34D',color:'#35170A',fontSize:13,fontWeight:800,fontFamily:'inherit',cursor:'pointer'}}>{intent==='local'?'Ver promoción':'Agregar promoción'} →</button>
        </div>
      </article>;})}
    </div>
  </section>;
}
