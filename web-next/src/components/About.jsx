import {useEffect} from 'react';
import Icon from './ui/Icon.jsx';

const purpose = [
  {title:'Misión',icon:'star',description:'Conectar a las personas con los mejores negocios y experiencias locales, impulsando la economía de nuestra ciudad a través de una plataforma accesible, moderna y fácil de usar para todos.'},
  {title:'Visión',icon:'eye',description:'Ser la aplicación líder y el referente número uno para descubrir lugares increíbles, creando una comunidad fuerte donde los usuarios y negocios locales prosperen juntos.'},
];
const values = [
  {num:'01',title:'Comunidad Primero',desc:'Existimos para servir a nuestra gente y fortalecer los lazos locales.'},
  {num:'02',title:'Innovación Continua',desc:'Buscamos siempre la mejor tecnología para brindar experiencias únicas.'},
  {num:'03',title:'Transparencia',desc:'Reseñas reales y tratos justos para todos nuestros comercios aliados.'},
  {num:'04',title:'Calidad',desc:'Nos aseguramos de que cada interacción en CityMap sea excepcional.'},
];

export default function About({T,onBack}) {
  useEffect(()=>{window.scrollTo(0,0);},[]);
  return <div style={{paddingBottom:84,background:T.bg,color:T.text,minHeight:'100vh',textAlign:'left'}}>
    <header style={{position:'sticky',top:0,background:T.bg,zIndex:10,borderBottom:`1px solid ${T.border}`,padding:'12px 16px',display:'flex',alignItems:'center',gap:10}}>
      <button type="button" aria-label="Volver" onClick={onBack} style={{width:36,height:36,padding:0,background:'transparent',border:0,color:T.text,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}><Icon name="chevron" size={22} color="currentColor" style={{transform:'rotate(180deg)'}}/></button>
      <h1 style={{fontSize:16,fontWeight:700,margin:0,color:T.text}}>Acerca de CityMap</h1>
    </header>
    <main style={{maxWidth:680,margin:'0 auto',padding:'28px 24px 20px'}}>
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',textAlign:'center',padding:'12px 0 32px'}}>
        <img src="/logo-brand.png" alt="CityMap" style={{height:48,maxWidth:'80%',objectFit:'contain',filter:T.dark?'brightness(0) invert(1)':'brightness(0)',marginBottom:18}}/>
        <p style={{fontSize:15,color:T.sub,lineHeight:1.65,fontWeight:500,maxWidth:380,margin:0}}>Tu guía local inteligente para descubrir lo mejor de la ciudad, en un solo lugar.</p>
      </div>
      {purpose.map(section=><section key={section.title} aria-label={section.title} style={{padding:'24px 0',borderTop:`1px solid ${T.border}`}}>
        <h2 style={{display:'flex',alignItems:'center',gap:10,fontSize:21,fontWeight:800,color:T.text,margin:'0 0 12px',letterSpacing:-0.3}}><Icon name={section.icon} size={21} color={T.text}/>{section.title}</h2>
        <p style={{fontSize:15,color:T.sub,lineHeight:1.75,margin:0}}>{section.description}</p>
      </section>)}
      <section aria-label="Nuestros valores" style={{borderTop:`1px solid ${T.border}`,paddingTop:26}}>
        <h2 style={{fontSize:22,fontWeight:800,color:T.text,margin:'0 0 6px',letterSpacing:-0.3}}>Nuestros valores</h2>
        {values.map(value=><div key={value.num} style={{display:'flex',alignItems:'flex-start',gap:16,padding:'20px 0',borderBottom:`1px solid ${T.border}`}}>
          <span aria-hidden="true" style={{minWidth:24,color:T.sub,fontSize:12,fontWeight:700,paddingTop:4,fontVariantNumeric:'tabular-nums'}}>{value.num}</span>
          <div><h3 style={{margin:'0 0 6px',fontSize:17,fontWeight:700,color:T.text}}>{value.title}</h3><p style={{margin:0,fontSize:14,lineHeight:1.7,color:T.sub}}>{value.desc}</p></div>
        </div>)}
      </section>
    </main>
  </div>;
}
