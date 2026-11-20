import { useAppContext } from '../context/AppContext';
import { useTranslation } from '../hooks/useTranslation.js';

// Insignias oficiales de las tiendas (SVG, en public/badges/):
// App Store: arte oficial de Apple (developer.apple.com, "Download on the
// App Store"); Google Play: arte oficial de Google ("Get it on Google
// Play"). Son archivos de texto (SVG), sin binarios.
const STORE_BADGES = [
  {
    name: 'App Store',
    url: 'https://apps.apple.com/app/citymap/id6834972842',
    img: '/badges/app-store.svg',
    alt: 'Descargar en App Store',
    width: 120,
  },
  {
    name: 'Google Play',
    url: 'https://play.google.com/store/apps/details?id=mx.citymap.app',
    img: '/badges/google-play.svg',
    alt: 'Disponible en Google Play',
    width: 135,
  },
];

export default function Footer() {
  const { T, dark, navigate, setShowPlans, setShowAddBiz, setShowAuth, user } = useAppContext();
  const { t } = useTranslation();

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
      padding: '28px 20px 24px',
      // El pie es el último elemento de la página y la navegación inferior
      // es fija (57 px + safe-area): sin este hueco, al bajar del todo la
      // barra tapaba la línea del copyright y el pie se veía cortado.
      paddingBottom: 'calc(24px + 57px + env(safe-area-inset-bottom, 8px) + 16px)',
      borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
      marginTop: 32,
      background: dark ? T.white : '#F9FAFB',
      textAlign: 'center'
    }}>
      <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 28, alignItems: 'center' }}>

        {/* Brand Info */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img src="/citymap.mx.png" alt="CityMap" width={94} height={28} style={{ height: 28, width: 94, objectFit: "contain", filter: dark ? "brightness(0) invert(1)" : "brightness(0)", marginBottom: 12 }} />
          <p style={{ fontSize: 12, color: T.sub, margin: "0 0 14px 0", lineHeight: 1.5, maxWidth: 340 }}>
            {t("menu_tagline", "Tu guía local para descubrir lo mejor de la ciudad. Encuentra lugares increíbles, eventos y experiencias cerca de ti.")}
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 16 }}>
            {socials.map(s => (
              <a
                key={s.name}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.name}
                style={{
                  width: 32, height: 32, borderRadius: '50%',
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
          {/* Descargar la app */}
          <div style={{ fontSize: 11, fontWeight: 800, color: T.sub, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
            {t("menu_descarga_app", "Descarga la app")}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {STORE_BADGES.map(b => (
              <a
                key={b.name}
                href={b.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={b.alt}
                style={{ display: 'block', lineHeight: 0, textDecoration: 'none' }}
              >
                <img src={b.img} alt={b.alt} width={b.width} height={40} style={{ height: 40, width: b.width, display: 'block' }} />
              </a>
            ))}
          </div>
        </div>

        {/* Links en 2 columnas: rejilla fija (1fr 1fr) para que en móvil
            las secciones queden lado a lado y no se apilen en una sola
            columna larga. Textos a 13 px: el más largo ("Términos y
            condiciones") cabe en la mitad de una pantalla de 360 px. */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px', width: '100%' }}>

          {/* Links Column 1: Negocios */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h4 style={{ fontSize: 12, fontWeight: 800, color: T.text, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t("menu_para_negocios", "Para Negocios")}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
              <span onClick={() => { if(!user) { setShowAuth?.(true); return; } setShowAddBiz?.(true); }} style={{ fontSize: 13, color: T.sub, cursor: 'pointer', transition: 'color .2s' }}>{t("menu_agrega_tu_negocio", "Agrega tu negocio")}</span>
              <span onClick={() => { if(!user) { setShowAuth?.(true); return; } navigate('cuenta'); }} style={{ fontSize: 13, color: T.sub, cursor: 'pointer', transition: 'color .2s' }}>{t("menu_acceso_duenos", "Acceso a dueños")}</span>
              <span onClick={() => navigate('/negocios')} style={{ fontSize: 13, color: T.sub, cursor: 'pointer', transition: 'color .2s' }}>{t("cuenta_planes_titulo", "Planes para tu negocio")}</span>
            </div>
          </div>

          {/* Links Column 2: Legal & Ayuda */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h4 style={{ fontSize: 12, fontWeight: 800, color: T.text, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t("menu_soporte_legal", "Soporte y Legal")}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
              <span onClick={() => navigate('about')} style={{ fontSize: 13, color: T.sub, cursor: 'pointer', transition: 'color .2s' }}>{t("menu_sobre_nosotros", "Sobre nosotros")}</span>
              <span onClick={() => navigate('privacy')} style={{ fontSize: 13, color: T.sub, cursor: 'pointer', transition: 'color .2s' }}>{t("menu_aviso_privacidad", "Aviso de privacidad")}</span>
              <span onClick={() => navigate('terms')} style={{ fontSize: 13, color: T.sub, cursor: 'pointer', transition: 'color .2s' }}>{t("menu_terminos_condiciones", "Términos y condiciones")}</span>
              <a href="https://wa.me/523223792428?text=Hola, tengo una duda sobre CityMap." target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: T.sub, textDecoration: 'none', transition: 'color .2s' }}>{t("menu_contactanos", "Contáctanos")}</a>
            </div>
          </div>

        </div>
      </div>

      {/* Copyright */}
      <div style={{
        maxWidth: 1000, margin: '0 auto',
        paddingTop: 16,
        borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8
      }}>
        <div style={{ fontSize: 12, color: dark ? 'rgba(255,255,255,0.4)' : '#6B7280', fontWeight: 500 }}>
          © {new Date().getFullYear()} CityMap. {t("derechos_reservados", "Todos los derechos reservados.")}
        </div>
      </div>
    </footer>
  );
}
