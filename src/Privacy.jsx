import { safeAreaTop } from "./lib/safeArea.js";

export default function Privacy({ T, onBack }) {
  return (
    <div style={{ paddingBottom: 84, minHeight: "100dvh", background: T.bg, padding: `${safeAreaTop(20)} 20px 100px`, fontFamily: "inherit" }}>
      <button 
        onClick={onBack} 
        style={{ marginBottom: 20, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: T.sub, fontSize: 14, fontWeight: 600, fontFamily: "inherit", padding: 0 }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        Regresar
      </button>

      <h1 style={{ fontSize: 24, fontWeight: 800, color: T.text, marginBottom: 20, fontFamily: "var(--heading)", letterSpacing: 0.5 }}>Aviso de Privacidad</h1>
      
      <div style={{ color: T.sub, fontSize: 15, lineHeight: 1.6, display: "flex", flexDirection: "column", gap: 16 }}>
        <p><strong>Última actualización:</strong> 15 de noviembre de 2026</p>

        <p><strong>Responsable:</strong> Jonathan Arana (CityMap). Contacto: <strong>citymap.mx@gmail.com</strong>.</p>
        
        <p>En CityMap respetamos y protegemos tu privacidad. El presente Aviso de Privacidad describe qué información personal recopilamos cuando usas la app y el sitio web de CityMap, para qué la utilizamos y qué derechos tienes sobre ella.</p>

        <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text, marginTop: 10 }}>1. Información que recopilamos</h2>
        <p>Al registrarte y utilizar CityMap, podemos recopilar la siguiente información:</p>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li>Nombre y dirección de correo electrónico, al crear tu cuenta o iniciar sesión con correo electrónico, Google o Apple. También la fotografía de perfil que proporcione tu proveedor de inicio de sesión, si la tiene.</li>
          <li>Número de teléfono (WhatsApp), solo si te registras a la tarjeta de lealtad de un negocio.</li>
          <li>Ubicación precisa, solo cuando usas el mapa o la función de lugares cercanos y autorizas el acceso a tu ubicación en tu dispositivo.</li>
          <li>Fotos o videos y otro contenido que publiques dentro de la plataforma, como las reseñas y comentarios que escribas o las fotos que subas.</li>
          <li>Identificadores: el identificador de tu cuenta de usuario y el identificador de tu dispositivo (por ejemplo, el token que permite enviarte notificaciones push).</li>
          <li>Datos de interacción con la app: tus favoritos, reservaciones y sellos de lealtad. Además, registramos estadísticas de uso agregadas (por ejemplo, cuántas veces se consulta un negocio), sin identificarte personalmente.</li>
        </ul>

        <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text, marginTop: 10 }}>2. Para qué usamos tu información</h2>
        <p>La información recopilada se utiliza únicamente para el funcionamiento de la app:</p>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li>Crear y administrar tu cuenta de usuario.</li>
          <li>Mostrarte los lugares, negocios y eventos cercanos a ti.</li>
          <li>Permitirte usar favoritos, reservaciones y tarjetas de lealtad.</li>
          <li>Enviarte notificaciones y comunicaciones relacionadas con tu cuenta.</li>
          <li>Garantizar la seguridad y el correcto funcionamiento de la plataforma, y mejorar nuestros servicios.</li>
        </ul>

        <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text, marginTop: 10 }}>3. Rastreo y publicidad</h2>
        <p>CityMap <strong>no utiliza tus datos para rastrearte</strong> entre aplicaciones o sitios web de otras empresas.</p>
        <p>CityMap <strong>no vende, alquila ni comercializa tu información personal</strong> con terceros, ni la comparte con fines publicitarios.</p>

        <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text, marginTop: 10 }}>4. Con quién compartimos tus datos</h2>
        <p>Tu información solo se comparte con los proveedores tecnológicos necesarios para que CityMap funcione:</p>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li><strong>Supabase:</strong> base de datos, autenticación y almacenamiento de la app. Es donde se guardan tus datos.</li>
          <li><strong>Google y Apple:</strong> inicio de sesión, solo si eliges entrar con tu cuenta de Google o de Apple.</li>
          <li><strong>Firebase (Google):</strong> envío de notificaciones push a tu dispositivo.</li>
          <li><strong>Stripe:</strong> procesamiento de los pagos de los planes de negocios, solo para los dueños de negocios que compran un plan. CityMap no guarda los datos de tu tarjeta.</li>
        </ul>
        <p>Estos proveedores actúan bajo medidas de seguridad y únicamente para permitir el funcionamiento de CityMap. No compartimos tus datos con ningún otro tercero.</p>

        <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text, marginTop: 10 }}>5. Cookies y almacenamiento local</h2>
        <p>CityMap guarda en tu dispositivo la información necesaria para mantener tu sesión iniciada y recordar tus preferencias.</p>
        <p>CityMap no utiliza servicios de analítica de terceros que te identifiquen. Las estadísticas de uso se registran de forma agregada y sin vincularse a tu identidad.</p>

        <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text, marginTop: 10 }}>6. Protección de la información</h2>
        <p>Implementamos medidas técnicas y organizativas razonables para proteger la información personal contra pérdida, acceso no autorizado, alteración o divulgación indebida.</p>
        <p>Tu dirección de correo electrónico nunca será visible públicamente.</p>

        <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text, marginTop: 10 }}>7. Derechos del usuario</h2>
        <p>En cualquier momento podrás:</p>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li>Acceder a la información personal asociada a tu cuenta.</li>
          <li>Solicitar la corrección o actualización de tus datos.</li>
          <li>Solicitar la eliminación de tu cuenta y la información relacionada.</li>
          <li>Revocar el consentimiento otorgado para el tratamiento de tus datos, cuando resulte aplicable.</li>
        </ul>
        <p>Para ejercer cualquiera de estos derechos, escríbenos a <strong>citymap.mx@gmail.com</strong>.</p>

        <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text, marginTop: 10 }}>8. Conservación de los datos</h2>
        <p>La información será conservada mientras exista una cuenta activa o durante el tiempo necesario para cumplir obligaciones legales y de seguridad. Si solicitas la eliminación de tu cuenta, eliminaremos la información personal asociada a ella.</p>

        <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text, marginTop: 10 }}>9. Menores de edad</h2>
        <p>CityMap está dirigida a personas de 13 años o más (clasificación 13+). No recopilamos intencionalmente datos personales de menores de 13 años. Si eres padre, madre o tutor y crees que un menor de 13 años nos proporcionó sus datos, escríbenos a <strong>citymap.mx@gmail.com</strong> para que los eliminemos.</p>

        <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text, marginTop: 10 }}>10. Cambios al presente Aviso de Privacidad</h2>
        <p>CityMap podrá actualizar este Aviso de Privacidad en cualquier momento. Las modificaciones serán publicadas dentro de la plataforma y entrarán en vigor desde su fecha de publicación.</p>

        <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text, marginTop: 10 }}>11. Contacto</h2>
        <p>Si tienes dudas, comentarios o deseas ejercer cualquiera de tus derechos relacionados con tus datos personales, puedes comunicarte con nosotros en:</p>
        <p>Correo electrónico: <strong>citymap.mx@gmail.com</strong></p>

        <p>Al utilizar CityMap, aceptas los términos establecidos en el presente Aviso de Privacidad.</p>
      </div>
    </div>
  );
}
