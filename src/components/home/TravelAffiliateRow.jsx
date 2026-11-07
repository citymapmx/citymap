// Fila de botones de viaje con enlaces de afiliado: se muestra en el inicio
// global, debajo del buscador, y se oculta mientras se busca.
export default function TravelAffiliateRow({ T, dark }) {
  const links = [
    { label: 'Autos', icon: '🚗', href: 'https://expedia.stay22.com/citymapmx/LeK8DFMnTC' },
    { label: 'Hoteles', icon: '🏨', href: 'https://booking.stay22.com/citymapmx/Uv1zqBOpxi' },
    { label: 'Vuelos', icon: '✈️', href: 'https://kayak.stay22.com/citymapmx/qi99zaJZro' },
    { label: 'Tours', icon: '🗺️', href: 'https://www.civitatis.com/es/?aid=114552' },
  ];
  return (
    <nav aria-label="Reserva tu viaje" style={{ display: 'flex', gap: 8, marginTop: 12 }}>
      {links.map((l) => (
        <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer sponsored"
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, padding: '10px 4px', borderRadius: 999, background: dark ? '#1e1e1e' : '#fff', border: `1px solid ${T.border}`, color: T.text, fontSize: 13, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
          <span aria-hidden="true">{l.icon}</span>{l.label}
        </a>
      ))}
    </nav>
  );
}
