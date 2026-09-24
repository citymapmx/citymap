import { useEffect } from 'react';

export default function useThirdPartyScripts() {
  useEffect(() => {
    let injected = false;
    
    const injectScripts = () => {
      if (injected) return;
      injected = true;
      
      // Google Analytics
      const gtagScript = document.createElement('script');
      gtagScript.src = "https://www.googletagmanager.com/gtag/js?id=G-TGZ7JVM90W";
      gtagScript.async = true;
      document.head.appendChild(gtagScript);
      
      const gtagInit = document.createElement('script');
      gtagInit.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-TGZ7JVM90W');
      `;
      document.head.appendChild(gtagInit);
      
      // Google Adsense
      const adsScript = document.createElement('script');
      adsScript.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6883476912475263";
      adsScript.async = true;
      adsScript.crossOrigin = "anonymous";
      document.head.appendChild(adsScript);
      
      window.removeEventListener('scroll', injectScripts);
      window.removeEventListener('mousemove', injectScripts);
      window.removeEventListener('touchstart', injectScripts);
      window.removeEventListener('click', injectScripts);
    };

    const timer = setTimeout(injectScripts, 3500);
    
    window.addEventListener('scroll', injectScripts, { passive: true, once: true });
    window.addEventListener('mousemove', injectScripts, { passive: true, once: true });
    window.addEventListener('touchstart', injectScripts, { passive: true, once: true });
    window.addEventListener('click', injectScripts, { passive: true, once: true });

    return () => clearTimeout(timer);
  }, []);
}
