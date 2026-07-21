import React from 'react';

export default function Privacy({ T, onBack }) {
  return (
    <div style={{ paddingBottom: 84, minHeight: "100dvh", background: T.bg, padding: "20px 20px 100px", fontFamily: "inherit" }}>
      <button 
        onClick={onBack} 
        style={{ marginBottom: 20, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: T.sub, fontSize: 14, fontWeight: 600, fontFamily: "inherit", padding: 0 }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        Regresar
      </button>

      <h1 style={{ fontSize: 24, fontWeight: 800, color: T.text, marginBottom: 20, fontFamily: "'Coolvetica', sans-serif", letterSpacing: 0.5 }}>Aviso de Privacidad</h1>
      
      <div style={{ color: T.sub, fontSize: 15, lineHeight: 1.6, display: "flex", flexDirection: "column", gap: 16 }}>
        <p><strong>Última actualización:</strong> junio de 2026</p>
        
        <p>En CityMap respetamos y protegemos tu privacidad. El presente Aviso de Privacidad describe cómo recopilamos, utilizamos y protegemos la información personal que proporcionas al utilizar nuestra plataforma.</p>

        <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text, marginTop: 10 }}>1. Información que recopilamos</h2>
        <p>Al registrarte y utilizar CityMap, podemos recopilar la siguiente información:</p>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li>Nombre y dirección de correo electrónico proporcionados por tu proveedor de autenticación (por ejemplo, Google).</li>
          <li>Información básica de perfil, como tu nombre y fotografía de perfil.</li>
          <li>Los lugares, negocios y contenidos que guardes como favoritos.</li>
          <li>Las reseñas, comentarios o sugerencias que publiques dentro de la plataforma.</li>
          <li>Información técnica de navegación, como dirección IP, tipo de dispositivo y estadísticas de uso, con el fin de mejorar nuestros servicios.</li>
        </ul>

        <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text, marginTop: 10 }}>2. Uso de la información</h2>
        <p>La información recopilada se utiliza únicamente para:</p>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li>Crear y administrar tu cuenta de usuario.</li>
          <li>Permitirte interactuar con la plataforma y acceder a sus funciones.</li>
          <li>Personalizar tu experiencia y mostrar contenido relevante.</li>
          <li>Mejorar continuamente nuestros servicios y funcionalidades.</li>
          <li>Enviarte comunicaciones relacionadas con tu cuenta o cambios importantes en nuestros servicios y políticas.</li>
          <li>Garantizar la seguridad y el correcto funcionamiento de la plataforma.</li>
        </ul>

        <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text, marginTop: 10 }}>3. Cookies y tecnologías similares</h2>
        <p>CityMap puede utilizar cookies y herramientas de análisis para mejorar la experiencia del usuario y conocer el uso de la plataforma. Estas tecnologías permiten recopilar información estadística y técnica sobre la navegación.</p>
        <p>Las cookies utilizadas no tienen como finalidad vender información personal ni mostrar publicidad personalizada sin consentimiento.</p>

        <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text, marginTop: 10 }}>4. Compartición de información</h2>
        <p>CityMap no vende, alquila ni comercializa información personal con terceros.</p>
        <p>Sin embargo, algunos proveedores tecnológicos pueden procesar ciertos datos para prestar servicios relacionados con:</p>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li>Autenticación de usuarios.</li>
          <li>Almacenamiento y alojamiento de la plataforma.</li>
          <li>Analítica y monitoreo del rendimiento.</li>
          <li>Servicios de correo electrónico y notificaciones.</li>
        </ul>
        <p>Estos proveedores actúan bajo medidas de seguridad y únicamente para permitir el funcionamiento de CityMap.</p>

        <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text, marginTop: 10 }}>5. Protección de la información</h2>
        <p>Implementamos medidas técnicas y organizativas razonables para proteger la información personal contra pérdida, acceso no autorizado, alteración o divulgación indebida.</p>
        <p>Tu dirección de correo electrónico nunca será visible públicamente.</p>

        <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text, marginTop: 10 }}>6. Derechos del usuario</h2>
        <p>En cualquier momento podrás:</p>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li>Acceder a la información personal asociada a tu cuenta.</li>
          <li>Solicitar la corrección o actualización de tus datos.</li>
          <li>Solicitar la eliminación de tu cuenta y la información relacionada.</li>
          <li>Revocar el consentimiento otorgado para el tratamiento de tus datos, cuando resulte aplicable.</li>
        </ul>

        <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text, marginTop: 10 }}>7. Conservación de los datos</h2>
        <p>La información será conservada mientras exista una cuenta activa o durante el tiempo necesario para cumplir obligaciones legales y de seguridad.</p>

        <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text, marginTop: 10 }}>8. Cambios al presente Aviso de Privacidad</h2>
        <p>CityMap podrá actualizar este Aviso de Privacidad en cualquier momento. Las modificaciones serán publicadas dentro de la plataforma y entrarán en vigor desde su fecha de publicación.</p>

        <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text, marginTop: 10 }}>9. Contacto</h2>
        <p>Si tienes dudas, comentarios o deseas ejercer cualquiera de tus derechos relacionados con tus datos personales, puedes comunicarte con nosotros en:</p>
        <p>Correo electrónico: <strong>soporte@citymap.mx</strong></p>

        <p>Al utilizar CityMap, aceptas los términos establecidos en el presente Aviso de Privacidad.</p>
      </div>
    </div>
  );
}
