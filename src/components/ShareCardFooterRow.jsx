// Fila del pie de las tarjetas para compartir (22 nov 2026, Jonathan):
// el enlace a la web + el badge de App Store + el badge de Google Play,
// en botones compactos. La geometría (row) es la misma que usa el
// canvas (computeShareCardFooterRow en lib/shareCard.js), así la vista
// previa y el PNG coinciden. Quien la usa la coloca: en las plantillas
// de flujo (negocios glass/editorial, eventos) va como hija flex con
// el mismo marginTop del pie viejo; en las absolutas (grid, tour Grid,
// tour Foto completa) va dentro de un div absoluto en row.x/row.y.
// Propuesta A (22 nov 2026): en NEGOCIOS la fila lleva solo los 2
// badges (row.web es null y la píldora web no se pinta); eventos y
// tours siguen con las 3 opciones.
// Badges en español (diseño de referencia, 22 nov 2026): solo las
// tarjetas de NEGOCIOS usan badges="es"; eventos y tours siguen con
// los badges en inglés de siempre (badges por defecto 'en').
export default function ShareCardFooterRow({ row, badges = 'en' }) {
  if (!row) return null;
  const pill = row.pill || {};
  const es = badges === 'es';
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: row.gap,
        height: row.h,
        flexShrink: 0,
      }}
    >
      {row.web ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: row.web.h,
            padding: `0 ${row.web.padX}px`,
            borderRadius: row.web.h / 2,
            background: pill.bg || 'rgba(255,255,255,0.12)',
            border: pill.border ? `2px solid ${pill.border}` : 'none',
            boxSizing: 'border-box',
            color: pill.text || '#FFFFFF',
            fontSize: row.web.size,
            fontWeight: 800,
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}
        >
          {row.web.text}
        </div>
      ) : null}
      <img
        src={es ? '/badges/app-store-es.svg' : '/badges/app-store.svg'}
        alt="Descargar en App Store"
        width={row.appStore.w}
        height={row.appStore.h}
        style={{ display: 'block', width: row.appStore.w, height: row.appStore.h }}
      />
      <img
        src={es ? '/badges/google-play-es.svg' : '/badges/google-play.svg'}
        alt="Disponible en Google Play"
        width={row.googlePlay.w}
        height={row.googlePlay.h}
        style={{ display: 'block', width: row.googlePlay.w, height: row.googlePlay.h }}
      />
    </div>
  );
}
