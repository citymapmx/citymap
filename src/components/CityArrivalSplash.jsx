import './CityArrivalSplash.css';
import {getHomeVisualState} from '../lib/homeReadiness.js';
import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';

const MINIMUM_MS=2200;

export default function CityArrivalSplash({enabled,waitingForCity=false,citySlug,cityName,ready,error=false,dark,onRetry=()=>window.location.reload()}) {
  const [phase,setPhase]=useState(()=>enabled&&citySlug?'enter':'idle');
  const [name,setName]=useState(cityName || '');
  const [issue,setIssue]=useState(false);
  const [slow,setSlow]=useState(false);
  const previousCity=useRef(null);
  const startedAt=useRef(Date.now());
  const [reducedMotion]=useState(()=>typeof window!=='undefined'&&Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches));

  useLayoutEffect(()=>{
    if(!enabled){
      if(!waitingForCity)previousCity.current=citySlug;
      setPhase('idle');
      return;
    }
    if(citySlug&&previousCity.current!==citySlug){
      previousCity.current=citySlug;
      startedAt.current=Date.now();
      setIssue(false);setSlow(false);
      setName(cityName || '');
      setPhase('enter');
    } else if(cityName) {
      setName(cityName);
    }
  },[enabled,waitingForCity,citySlug,cityName]);

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
  return <div className={`city-arrival ${phase==='exit'?'city-arrival-exit':''}`} role="status" aria-live="polite" aria-label={`Preparando ${name || 'tu ciudad'}`} style={{position:'fixed',inset:0,zIndex:1000001,display:'flex',alignItems:'center',justifyContent:'center',background:dark?'#161719':'#F7F9FC',color:ink,overflow:'hidden',touchAction:'none',fontFamily:'Geist, -apple-system, BlinkMacSystemFont, sans-serif'}}>
    <style>{`
      .city-arrival{opacity:1;transition:opacity 620ms cubic-bezier(.22,1,.36,1);isolation:isolate}
      .city-arrival-exit{opacity:0;pointer-events:none}
      .city-arrival-glow{position:absolute;width:min(90vw,480px);height:min(90vw,480px);border-radius:50%;background:radial-gradient(circle,rgba(68,160,241,.13),rgba(31,190,177,.04) 42%,transparent 70%);pointer-events:none}
      .city-arrival-mark{position:relative;width:136px;height:136px;display:grid;place-items:center;margin:0 auto 24px}
      .city-arrival-ring{position:absolute;inset:10px;border:1px solid rgba(67,155,228,.24);border-radius:50%;animation:city-arrival-ripple 1700ms cubic-bezier(.2,.6,.3,1) infinite}
      .city-arrival-ring:nth-child(2){animation-delay:500ms}
      .city-arrival-pin{width:52px;height:64px;filter:drop-shadow(0 8px 14px rgba(24,106,170,.18));animation:city-arrival-land 650ms cubic-bezier(.16,1,.3,1) both}
      .city-arrival-caption{animation:city-arrival-reveal 550ms 100ms both;letter-spacing:0}
      @keyframes city-arrival-ripple{0%{transform:scale(.62);opacity:0}25%{opacity:.8}100%{transform:scale(1.3);opacity:0}}
      @keyframes city-arrival-land{from{opacity:0;transform:translateY(-12px) scale(.9)}to{opacity:1;transform:translateY(0) scale(1)}}
      @keyframes city-arrival-reveal{from{transform:translateY(6px)}to{transform:translateY(0)}}
      @media(prefers-reduced-motion:reduce){.city-arrival{transition-duration:100ms}.city-arrival-ring{animation:none;opacity:.35}.city-arrival-pin,.city-arrival-caption{animation:none}}
    `}</style>
    <div className="city-arrival-glow" aria-hidden="true"/>
    <div className="city-arrival-content" style={{position:'relative',textAlign:'center',padding:24,maxWidth:400}}>
      <div className="city-arrival-mark" aria-hidden="true"><span className="city-arrival-ring"/><span className="city-arrival-ring"/><svg className="city-arrival-pin" viewBox="0 0 52 64" fill="none"><path d="M26 2C12.75 2 2 12.75 2 26c0 16.2 24 36 24 36s24-19.8 24-36C50 12.75 39.25 2 26 2Z" fill="currentColor"/><circle cx="26" cy="25" r="10" fill={dark?'#161719':'#F7F9FC'}/></svg></div>
      <div className="city-arrival-caption"><img className="city-arrival-logo" src="/citymap.mx.png" alt="CityMap" style={{display:'block',height:30,maxWidth:'100%',objectFit:'contain',margin:'0 auto 18px',filter:dark?'brightness(0) invert(1)':'brightness(0)'}}/><p style={{fontSize:12,fontWeight:400,lineHeight:1.5,letterSpacing:'.05em',color:dark?'#A9B1BD':'#647084',margin:0}}>TU CIUDAD. A TU RITMO.</p><p style={{fontSize:34,fontWeight:500,lineHeight:1.15,letterSpacing:'-.045em',margin:'10px 0 0',overflowWrap:'anywhere'}}>{name || 'CityMap'}</p>
        <div className="city-arrival-progress" aria-hidden="true"/>
        <p style={{fontSize:12,fontWeight:400,lineHeight:1.6,color:dark?'#A9B1BD':'#647084',margin:'14px 0 0'}}>{issue?'No pudimos completar la carga del inicio.':slow?'La conexión está tardando un poco más.':'Lo mejor de tu ciudad, cerca de ti.'}</p>
        {(issue||slow)&&<button onClick={onRetry} style={{marginTop:18,padding:'11px 22px',borderRadius:999,border:0,background:dark?'#F5F5F7':'#17202D',color:dark?'#17202D':'#fff',fontSize:13,fontWeight:500,cursor:'pointer'}}>Reintentar</button>}
      </div>
    </div>
  </div>;
}
