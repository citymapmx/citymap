'use client';

export default function ActionButtons({ phone, whatsapp, lat, lng, name, url }) {
  function handleCall() {
    if (phone) window.location.href = `tel:${phone}`;
  }

  function handleWhatsApp() {
    const num = whatsapp.replace(/\D/g, '');
    const msg = encodeURIComponent(`Hola, vi tu negocio "${name}" en CityMap y quiero más información.`);
    window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
  }

  function handleDir() {
    if (lat && lng) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    }
  }

  async function handleShare() {
    const shareUrl = url || window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: name, url: shareUrl }); } catch (_) {}
    } else {
      await navigator.clipboard.writeText(shareUrl);
      alert('Enlace copiado al portapapeles');
    }
  }

  const btnBase = {
    flex: '1 1 0', display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 5, padding: '10px 4px', background: 'transparent',
    border: 'none', borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit',
    color: '#334155', fontSize: 12, fontWeight: 600, transition: 'background 0.15s',
  };
  const iconWrap = {
    width: 44, height: 44, borderRadius: '50%', background: '#F1F5F9',
    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 2,
  };

  return (
    <div style={{
      display: 'flex', gap: 4, background: '#fff', borderRadius: 20,
      padding: '10px 8px', margin: '16px 0', boxShadow: '0 1px 12px rgba(0,0,0,0.07)',
    }}>
      {phone && (
        <button style={btnBase} onClick={handleCall} aria-label="Llamar">
          <div style={iconWrap}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.79 12a19.79 19.79 0 01-3.07-8.67A2 2 0 012.68 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.69A16 16 0 0015.1 16.9l1.06-1.06a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
            </svg>
          </div>
          Llamar
        </button>
      )}
      {whatsapp && (
        <button style={btnBase} onClick={handleWhatsApp} aria-label="WhatsApp">
          <div style={{ ...iconWrap, background: '#DCFCE7' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#25D366">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </div>
          WhatsApp
        </button>
      )}
      {lat && lng && (
        <button style={btnBase} onClick={handleDir} aria-label="Cómo llegar">
          <div style={{ ...iconWrap, background: '#E0F2FE' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0284C7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="3 11 22 2 13 21 11 13 3 11"/>
            </svg>
          </div>
          Ubicación
        </button>
      )}
      <button style={btnBase} onClick={handleShare} aria-label="Compartir">
        <div style={{ ...iconWrap, background: '#F3E8FF' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
        </div>
        Compartir
      </button>
    </div>
  );
}
