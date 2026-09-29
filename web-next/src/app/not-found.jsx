import Link from 'next/link';

export const metadata = {
  title: 'Página no encontrada | CityMap',
  description: 'La página que buscas no existe. Vuelve al inicio para descubrir los mejores negocios locales.',
};

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
      background: '#fafafa',
      padding: '24px',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: 72, marginBottom: 8 }}>🗺️</div>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111', margin: '0 0 8px' }}>
        Esta página no existe
      </h1>
      <p style={{ fontSize: 16, color: '#6b7280', maxWidth: 360, lineHeight: 1.5, margin: '0 0 32px' }}>
        El negocio o la sección que buscas no se encontró o ya no está disponible.
      </p>
      <Link
        href="/"
        style={{
          background: '#000',
          color: '#fff',
          padding: '12px 28px',
          borderRadius: 999,
          textDecoration: 'none',
          fontWeight: 700,
          fontSize: 15
        }}
      >
        Volver al inicio
      </Link>
    </div>
  );
}
