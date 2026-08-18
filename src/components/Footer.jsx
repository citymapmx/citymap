import Icon from './ui/Icon.jsx';
import { useAppContext } from '../context/AppContext';

export default function Footer() {
  const { T, dark, navigate, setShowPlans, setShowAddBiz, setShowAuth, user } = useAppContext();

  const socials = [
    { name: 'Instagram', url: 'https://www.instagram.com/citymap.mx', icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
      </svg>
    )},
    { name: 'Facebook', url: 'https://www.facebook.com/citymap.mx', icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
      </svg>
    )},
  ];

  return (
    <footer style={{
      padding: '48px 24px 24px',
      borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
      marginTop: 40,
      background: dark ? '#000' : '#F9FAFB',
      textAlign: 'center'
    }}>
      <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 40, marginBottom: 48, alignItems: 'center' }}>
        
        {/* Brand Info */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img src="/citymap.mx.png" alt="CityMap" style={{ height: 32, objectFit: "contain", filter: dark ? "none" : "brightness(0)", marginBottom: 16 }} />
          <p style={{ fontSize: 13, color: T.sub, margin: "0 0 20px 0", lineHeight: 1.6, maxWidth: 350 }}>
            Tu guía local para descubrir lo mejor de la ciudad. Encuentra lugares increíbles, eventos y experiencias cerca de ti.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            {socials.map(s => (
              <a
                key={s.name}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.name}
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: dark ? 'rgba(255,255,255,0.1)' : '#E5E7EB',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: T.text,
                  transition: 'all .2s',
                  textDecoration: 'none',
                }}
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>

        {/* Links Columns Container */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 48, width: '100%' }}>
          
          {/* Links Column 1: Negocios */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h4 style={{ fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 20, textTransform: 'uppercase', letterSpacing: 0.5 }}>Para Negocios</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
              <span onClick={() => setShowPlans?.(true)} style={{ fontSize: 14, color: T.sub, cursor: 'pointer', transition: 'color .2s' }}>Planes y precios</span>
              <span onClick={() => { if(!user) { setShowAuth?.(true); return; } setShowAddBiz?.(true); }} style={{ fontSize: 14, color: T.sub, cursor: 'pointer', transition: 'color .2s' }}>Agrega tu negocio</span>
              <span onClick={() => navigate('cuenta')} style={{ fontSize: 14, color: T.sub, cursor: 'pointer', transition: 'color .2s' }}>Acceso a dueños</span>
            </div>
          </div>

          {/* Links Column 2: Legal & Ayuda */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h4 style={{ fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 20, textTransform: 'uppercase', letterSpacing: 0.5 }}>Soporte y Legal</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
              <span onClick={() => navigate('about')} style={{ fontSize: 14, color: T.sub, cursor: 'pointer', transition: 'color .2s' }}>Sobre nosotros</span>
              <span onClick={() => navigate('privacy')} style={{ fontSize: 14, color: T.sub, cursor: 'pointer', transition: 'color .2s' }}>Aviso de privacidad</span>
              <span onClick={() => navigate('terms')} style={{ fontSize: 14, color: T.sub, cursor: 'pointer', transition: 'color .2s' }}>Términos y condiciones</span>
              <a href="https://wa.me/523223792428?text=Hola, tengo una duda sobre CityMap." target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, color: T.sub, textDecoration: 'none', transition: 'color .2s' }}>Contáctanos</a>
            </div>
          </div>

        </div>
      </div>

      {/* Copyright */}
      <div style={{ 
        maxWidth: 1000, margin: '0 auto', 
        paddingTop: 24, 
        borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 
      }}>
        <div style={{ fontSize: 12, color: dark ? 'rgba(255,255,255,0.4)' : '#6B7280', fontWeight: 500 }}>
          © {new Date().getFullYear()} CityMap. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}
