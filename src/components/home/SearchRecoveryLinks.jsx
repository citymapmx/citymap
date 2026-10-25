import React from 'react';
import {Link} from 'react-router-dom';
import {buildCityPath} from '../../lib/domain.js';

export default function SearchRecoveryLinks({activeCity,cities=[],T,dark,onSelect}) {
  const home = buildCityPath(activeCity,cities);
  const city = activeCity ? `/${activeCity}` : '';
  const links = [
    {label:'Restaurantes',emoji:'🍽️',to:`${home === '/' ? '' : home}/c/restaurantes`,category:'restaurantes'},
    {label:'Próximos Eventos',emoji:'🎉',to:`/eventos${city}`,category:'explorar'},
    {label:'Mapa de la ciudad',emoji:'🗺️',to:`/mapa${city}`,category:'explorar'},
    {label:'Mejor Calificados',emoji:'⭐',to:`${home}#mejor-calificados`,category:'explorar'}
  ];
  return <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:24}}>{links.map(link => <Link key={link.label} to={link.to} className="press" onClick={()=>onSelect(link.category)} style={{display:'flex',alignItems:'center',gap:10,padding:'14px 12px',borderRadius:16,background:dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',border:`1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,cursor:'pointer',textAlign:'left',color:T.text,fontFamily:'inherit',textDecoration:'none',minWidth:0}}><span aria-hidden="true" style={{fontSize:22}}>{link.emoji}</span><span style={{fontSize:13,fontWeight:700,lineHeight:1.2}}>{link.label}</span></Link>)}</div>;
}
