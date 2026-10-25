import {useEffect} from 'react';

// Optional integrations start after city content, never during city selection.
export default function useThirdPartyScripts(enabled=true) {
  useEffect(()=>{
    if(!enabled)return;
    let idle;
    const inject=()=>{
      if(!document.getElementById('citymap-analytics-script')){
        window.dataLayer=window.dataLayer||[];
        window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};
        window.gtag('js',new Date());
        window.gtag('config','G-TGZ7JVM90W');
        const analytics=document.createElement('script');
        analytics.id='citymap-analytics-script';
        analytics.src='https://www.googletagmanager.com/gtag/js?id=G-TGZ7JVM90W';
        analytics.async=true;
        document.head.appendChild(analytics);
      }
      if(!document.getElementById('google-adsense-script')){
        const ads=document.createElement('script');
        ads.id='google-adsense-script';
        ads.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6883476912475263';
        ads.async=true;ads.crossOrigin='anonymous';
        document.head.appendChild(ads);
      }
    };
    const timer=setTimeout(()=>{
      if(window.requestIdleCallback)idle=window.requestIdleCallback(inject,{timeout:2000});
      else inject();
    },3500);
    return ()=>{clearTimeout(timer);if(idle!==undefined)window.cancelIdleCallback?.(idle);};
  },[enabled]);
}
