import './CityArrivalSplash.css';
import {getHomeVisualState} from '../lib/homeReadiness.js';
import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';

const MINIMUM_MS=600;

export default function CityArrivalSplash({enabled,waitingForCity=false,citySlug,cityName,ready,error=false,dark,cities=[],onRetry=()=>window.location.reload()}) {
  const [phase,setPhase]=useState(()=>enabled&&citySlug?'enter':'idle');
  const [name,setName]=useState(cityName || '');
  const [issue,setIssue]=useState(false);
  const [slow,setSlow]=useState(false);
  const previousCity=useRef(null);
  const startedAt=useRef(Date.now());
  const [reducedMotion]=useState(()=>typeof window!=='undefined'&&Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches));

  // Rueda 3D de ciudades: un tambor con una cara por ciudad. La cara i está
  // al frente cuando la rotación del tambor es -i*step. El radio sale del
  // ancho de cara para que las vecinas asomen curvadas en los bordes.
  const wheelCount=Array.isArray(cities)?cities.length:0;
  const wheelStep=wheelCount>=3?360/wheelCount:0;
  const wheelRadius=wheelCount>=3?Math.round(66/Math.tan(Math.PI/wheelCount)):0;
  const targetIndex=citySlug?cities.findIndex(c=>c.slug===citySlug):-1;
  const [rotation,setRotation]=useState(()=>targetIndex>=0&&wheelCount>=3?-targetIndex*wheelStep:0);
  const [spinning,setSpinning]=useState(false);
  const handledSlug=useRef(null);
  const spinTimer=useRef(null);

  useLayoutEffect(()=>{
    if(!enabled){
      if(!waitingForCity)previousCity.current=citySlug;
      setPhase('idle');
      handledSlug.current=null;
      return;
    }
    if(citySlug&&previousCity.current!==citySlug){
      const prevSlug=previousCity.current;
      const prevIndex=prevSlug?cities.findIndex(c=>c.slug===prevSlug):-1;
      previousCity.current=citySlug;
      startedAt.current=Date.now();
      setIssue(false);setSlow(false);
      setName(cityName || '');
      setPhase('enter');
      // Gira el tambor desde la ciudad anterior hasta la nueva por el camino
      // más corto. Sin animación no hay giro: la ciudad queda al frente.
      if(targetIndex>=0&&wheelCount>=3&&handledSlug.current!==citySlug){
        handledSlug.current=citySlug;
        if(reducedMotion||prevIndex<0||prevIndex===targetIndex){
          setSpinning(false);
          setRotation(-targetIndex*wheelStep);
        } else {
          let delta=(targetIndex-prevIndex)%wheelCount;
          if(delta>wheelCount/2)delta-=wheelCount;
          if(delta<-wheelCount/2)delta+=wheelCount;
          const from=-prevIndex*wheelStep;
          const to=from-delta*wheelStep;
          setSpinning(false);
          setRotation(from);
          if(spinTimer.current)clearTimeout(spinTimer.current);
          spinTimer.current=setTimeout(()=>{setSpinning(true);setRotation(to);},40);
        }
      }
    } else if(cityName) {
      setName(cityName);
    }
  },[enabled,waitingForCity,citySlug,cityName,cities,targetIndex,wheelCount,wheelStep,reducedMotion]);

  useEffect(()=>()=>{if(spinTimer.current)clearTimeout(spinTimer.current);},[]);

  useEffect(()=>{
    if(phase!=='enter'||!enabled)return;
    let exitTimer,closing=false;
    const inspect=()=>{
      const elapsed=Date.now()-startedAt.current;
      setSlow(elapsed>12000);
      const visual=ready?getHomeVisualState(document,citySlug,{width:window.innerWidth,height:window.innerHeight}):'loading';
      setIssue(Boolean(error)||visual==='error');
      if(!closing&&!error&&ready&&visual==='ready'&&elapsed>=MINIMUM_MS){
        closing=true;
        exitTimer=setTimeout(()=>setPhase('exit'),100);
      }
    };
    inspect();
    const interval=setInterval(inspect,150);
    return ()=>{clearInterval(interval);clearTimeout(exitTimer);};
  },[phase,ready,error,enabled,citySlug]);

  useEffect(()=>{
    if(phase!=='exit')return;
    const timer=setTimeout(()=>setPhase('idle'),reducedMotion?100:620);
    return ()=>clearTimeout(timer);
  },[phase,reducedMotion]);

  if(!enabled||phase==='idle'||!citySlug)return null;
  const ink=dark?'#F5F5F7':'#17202D';
  const showWheel=wheelCount>=3&&targetIndex>=0;
  return <div className={`city-arrival ${phase==='exit'?'city-arrival-exit':''} ${dark?'city-arrival--dark':''}`} role="status" aria-live="polite" aria-label={`Preparando ${name || 'tu ciudad'}`} style={{position:'fixed',inset:0,zIndex:1000001,display:'flex',alignItems:'center',justifyContent:'center',background:dark?'#161719':'#F7F9FC',color:ink,overflow:'hidden',touchAction:'none',fontFamily:'Geist, -apple-system, BlinkMacSystemFont, sans-serif'}}>
    <style>{`
      .city-arrival{opacity:1;transition:opacity 620ms cubic-bezier(.22,1,.36,1);isolation:isolate}
      .city-arrival-exit{opacity:0;pointer-events:none}
      .city-arrival-glow{position:absolute;width:min(90vw,480px);height:min(90vw,480px);border-radius:50%;background:radial-gradient(circle,rgba(68,160,241,.13),rgba(31,190,177,.04) 42%,transparent 70%);pointer-events:none}
      .city-arrival-caption{animation:city-arrival-reveal 550ms 100ms both;letter-spacing:0}
      @keyframes city-arrival-reveal{from{transform:translateY(6px)}to{transform:translateY(0)}}
      @media(prefers-reduced-motion:reduce){.city-arrival{transition-duration:100ms}.city-arrival-caption{animation:none}}
    `}</style>
    <div className="city-arrival-glow" aria-hidden="true"/>
    <div className="city-arrival-content" style={{position:'relative',textAlign:'center',padding:24,maxWidth:400}}>
      {/* Globo: gira (vuelo) hasta la ciudad nueva y ahí cae el pin. */}
      <div className="city-arrival-globe-wrap" aria-hidden="true" key={`globe-${citySlug}`}>
        <div className="city-arrival-globe">
          <div className="city-arrival-globe-spin">
            <span className="city-arrival-globe-meridian"/>
            <span className="city-arrival-globe-meridian"/>
            <span className="city-arrival-globe-meridian"/>
          </div>
          <span className="city-arrival-globe-latitude city-arrival-globe-latitude--mid"/>
          <span className="city-arrival-globe-latitude city-arrival-globe-latitude--top"/>
        </div>
        <span className="city-arrival-ring"/>
        <span className="city-arrival-ring" style={{animationDelay:'500ms'}}/>
        <svg className="city-arrival-pin" viewBox="0 0 52 64" fill="none"><path d="M26 2C12.75 2 2 12.75 2 26c0 16.2 24 36 24 36s24-19.8 24-36C50 12.75 39.25 2 26 2Z" fill="currentColor"/><circle cx="26" cy="25" r="10" fill={dark?'#161719':'#F7F9FC'}/></svg>
      </div>
      {/* Rueda 3D de ciudades: gira de la anterior a la nueva. */}
      {showWheel&&<div className="city-arrival-wheel" aria-hidden="true" style={{perspective:'2400px'}}>
        <div className="city-arrival-drum" style={{transform:`rotateY(${rotation}deg)`,transition:spinning?'transform 1000ms cubic-bezier(.22,1,.36,1)':'none'}}>
          {cities.map((c,i)=><span key={c.slug} className="city-arrival-wheel-face" style={{transform:`rotateY(${i*wheelStep}deg) translateZ(${wheelRadius}px)`}}>{c.name}</span>)}
        </div>
      </div>}
      <div className="city-arrival-caption"><img className="city-arrival-logo" src="/citymap.mx.png" alt="CityMap" width={100} height={30} style={{display:'block',height:30,width:100,maxWidth:'100%',objectFit:'contain',margin:'0 auto 18px',filter:dark?'brightness(0) invert(1)':'brightness(0)'}}/><p style={{fontSize:12,fontWeight:400,lineHeight:1.5,letterSpacing:'.05em',color:dark?'#A9B1BD':'#647084',margin:0}}>TU CIUDAD. A TU RITMO.</p><p key={`name-${citySlug}`} className="city-arrival-name" style={{fontSize:34,fontWeight:500,lineHeight:1.15,letterSpacing:'-.045em',margin:'10px 0 0',overflowWrap:'anywhere'}}>{name || 'CityMap'}</p>
        <div className="city-arrival-progress" aria-hidden="true"/>
        <p style={{fontSize:12,fontWeight:400,lineHeight:1.6,color:dark?'#A9B1BD':'#647084',margin:'14px 0 0'}}>{issue?'No pudimos completar la carga del inicio.':slow?'La conexión está tardando un poco más.':'Lo mejor de tu ciudad, cerca de ti.'}</p>
        {(issue||slow)&&<button onClick={onRetry} style={{marginTop:18,padding:'11px 22px',borderRadius:999,border:0,background:dark?'#F5F5F7':'#17202D',color:dark?'#17202D':'#fff',fontSize:13,fontWeight:500,cursor:'pointer'}}>Reintentar</button>}
      </div>
    </div>
  </div>;
}
