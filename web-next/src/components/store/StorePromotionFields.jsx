import React from 'react';
const dayNames=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
export const defaultPromotion = {enabled:true,sale_price:'',title:'',badge:'Promoción',starts_on:'',ends_on:'',days:[0,1,2,3,4,5,6],start_time:'',end_time:'',intents:['local','delivery'],conditions:''};
export default function StorePromotionFields({value,onChange,T,inpH}) {
  const p={...defaultPromotion,...value,enabled:Boolean(value?.enabled)};
  const change=patch=>onChange({...p,...patch});
  const field=(label,name,type='text',placeholder='')=><label style={{display:'block',fontSize:12,fontWeight:600,color:T.sub}}>{label}<input type={type} value={p[name]??''} onChange={e=>change({[name]:e.target.value})} placeholder={placeholder} min={type==='number'?'0.01':undefined} step={type==='number'?'0.01':undefined} style={{...inpH,marginTop:6}}/></label>;
  return <section style={{padding:16,border:`1px solid ${T.border}`,borderRadius:14,background:T.white}}>
    <label style={{display:'flex',gap:10,alignItems:'center',color:T.text,fontSize:14,fontWeight:750,cursor:'pointer'}}><input type="checkbox" checked={p.enabled} onChange={e=>change({enabled:e.target.checked})}/>Destacar como promoción</label>
    <p style={{fontSize:12,color:T.sub,lineHeight:1.5,margin:'8px 0 0'}}>Usa la foto y las opciones de este producto. Para un combo, crea el paquete como un producto y configura sus opciones.</p>
    {p.enabled&&<div style={{display:'flex',flexDirection:'column',gap:14,marginTop:16}}>
      {field('Precio promocional ($ MXN)','sale_price','number')}{field('Título del banner (opcional)','title','text','Ej. 3 tacos + bebida')}{field('Etiqueta','badge','text','Promo de hoy')}
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10}}>{field('Fecha de inicio','starts_on','date')}{field('Fecha final','ends_on','date')}</div>
      <fieldset style={{margin:0,padding:0,border:0}}><legend style={{fontSize:12,color:T.sub,fontWeight:600,marginBottom:8}}>Días disponibles</legend><div style={{display:'flex',flexWrap:'wrap',gap:6}}>{dayNames.map((name,day)=><button key={day} type="button" aria-pressed={p.days.includes(day)} onClick={()=>change({days:p.days.includes(day)?p.days.filter(d=>d!==day):[...p.days,day].sort()})} style={{padding:'8px 10px',borderRadius:99,border:`1px solid ${T.border}`,background:p.days.includes(day)?T.text:'transparent',color:p.days.includes(day)?T.bg:T.text,fontFamily:'inherit',fontSize:12,cursor:'pointer'}}>{name}</button>)}</div></fieldset>
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10}}>{field('Desde las','start_time','time')}{field('Hasta las','end_time','time')}</div>
      <div style={{display:'flex',flexWrap:'wrap',gap:14}}>{[['local','En el local'],['delivery','Para llevar / domicilio']].map(([id,label])=><label key={id} style={{fontSize:13,color:T.text,display:'flex',alignItems:'center',gap:6}}><input type="checkbox" checked={p.intents.includes(id)} onChange={e=>change({intents:e.target.checked?[...p.intents,id]:p.intents.filter(i=>i!==id)})}/>{label}</label>)}</div>
      <label style={{fontSize:12,color:T.sub,fontWeight:600}}>Condiciones<textarea value={p.conditions} onChange={e=>change({conditions:e.target.value})} placeholder="Ej. Incluye bebida de 355 ml. No acumulable." style={{...inpH,marginTop:6,minHeight:70,resize:'vertical'}}/></label>
      <p style={{margin:0,fontSize:12,color:T.sub,lineHeight:1.5}}>Deja las fechas y horas vacías para no limitar la vigencia. El horario usa la ciudad del negocio. El precio base se conserva cuando la promoción no está activa.</p>
    </div>}
  </section>;
}
