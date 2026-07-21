import React, { useEffect } from 'react';
import Icon from './ui/Icon.jsx';

export default function Terms({ T, onBack }) {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="sh" style={{ background: T.bg, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, background: T.white, borderBottom: `1px solid ${T.border}`, position: "sticky", top: 0, zIndex: 10 }}>
        <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: "50%", background: T.bg, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <Icon name="chevron" size={20} color={T.text} style={{ transform: "rotate(180deg)" }} />
        </button>
        <h2 style={{ fontFamily: "'Coolvetica', sans-serif", fontSize: 22, color: T.text, margin: 0, letterSpacing: 0.5 }}>Términos de Uso</h2>
      </div>

      <div style={{ padding: "24px 20px", flex: 1, color: T.text, fontSize: 14, lineHeight: 1.6 }}>
        <div style={{ background: T.white, padding: 20, borderRadius: 16, boxShadow: T.shadow, border: `1px solid ${T.border}` }}>
          
          <p style={{ color: T.sub, marginBottom: 20 }}>Última actualización: 22 de junio de 2026</p>

          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 10, color: T.text }}>1. Aceptación de los Términos</h3>
          <p style={{ marginBottom: 20, color: T.sub }}>
            Al acceder y utilizar la aplicación y sitio web de CityMap ("la Plataforma"), aceptas estar sujeto a estos Términos y Condiciones de Uso. Si no estás de acuerdo con alguna parte de estos términos, no podrás utilizar nuestros servicios.
          </p>

          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 10, color: T.text }}>2. Descripción del Servicio</h3>
          <p style={{ marginBottom: 20, color: T.sub }}>
            CityMap es una guía digital que permite a los usuarios descubrir negocios, eventos y lugares de interés locales. Actuamos únicamente como un directorio informativo y no somos parte de las transacciones comerciales entre usuarios y los negocios listados.
          </p>

          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 10, color: T.text }}>3. Responsabilidades del Usuario</h3>
          <p style={{ marginBottom: 20, color: T.sub }}>
            Te comprometes a utilizar CityMap de manera responsable y legal. Queda estrictamente prohibido:<br/><br/>
            • Proporcionar información falsa al crear una cuenta o registrar un negocio.<br/>
            • Utilizar la plataforma para fines ilícitos, difamatorios o fraudulentos.<br/>
            • Intentar vulnerar la seguridad de la aplicación o extraer datos de forma automatizada (scraping).
          </p>

          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 10, color: T.text }}>4. Registro de Negocios</h3>
          <p style={{ marginBottom: 20, color: T.sub }}>
            Los propietarios que registren su negocio en CityMap garantizan que tienen la autoridad legal para hacerlo y que la información proporcionada (horarios, fotos, ubicación) es precisa y veraz. CityMap se reserva el derecho de rechazar, modificar o eliminar listados que incumplan nuestras políticas de calidad o sean reportados como fraudulentos.
          </p>

          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 10, color: T.text }}>5. Propiedad Intelectual</h3>
          <p style={{ marginBottom: 20, color: T.sub }}>
            El diseño, código, logotipos y marca de CityMap son propiedad exclusiva de sus creadores. El contenido subido por los negocios (logotipos, fotos, promociones) sigue siendo propiedad de sus respectivos dueños, otorgando a CityMap una licencia no exclusiva para mostrarlos en la plataforma.
          </p>

          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 10, color: T.text }}>6. Limitación de Responsabilidad</h3>
          <p style={{ marginBottom: 20, color: T.sub }}>
            CityMap se esfuerza por mantener la información actualizada, pero <strong>no garantizamos</strong> la exactitud de los horarios, precios o disponibilidad de los negocios listados. No nos hacemos responsables por malas experiencias, cancelaciones, cambios de ubicación o cualquier daño derivado de la interacción con los comercios o eventos promocionados en nuestra plataforma.
          </p>

          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 10, color: T.text }}>7. Cambios a los Términos</h3>
          <p style={{ marginBottom: 20, color: T.sub }}>
            Nos reservamos el derecho de modificar estos Términos de Uso en cualquier momento. Los cambios sustanciales serán notificados a través de la aplicación. Tu uso continuo de CityMap después de dichas modificaciones constituye tu aceptación de los nuevos términos.
          </p>

          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 10, color: T.text }}>8. Contacto</h3>
          <p style={{ color: T.sub }}>
            Si tienes dudas sobre estos Términos y Condiciones, por favor contáctanos a través del correo electrónico: <a href="mailto:soporte@citymap.mx" style={{ color: "#1877F2", textDecoration: "none", fontWeight: 600 }}>soporte@citymap.mx</a>.
          </p>

        </div>
      </div>
    </div>
  );
}
