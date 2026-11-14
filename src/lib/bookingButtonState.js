// Estado del botón «Reservar» de la ficha (nov 2026, botón intermitente).
//
// La causa raíz: el objeto del negocio que llega de la lista NO traía
// `booking_config` (la columna no estaba en el select de la lista de
// negocios) y la ficha dependía de la consulta `fullBusiness` para saber
// si el negocio tiene reservación. Mientras esa consulta no resolvía —o
// fallaba con red floja, con solo 1 reintento y sin reintento al volver
// a la ventana— `selected.booking_config?.enabled` era falso y el botón
// simplemente no existía, aunque el resto de la ficha ya se veía cargada
// (el banner, el horario y la calificación vienen del objeto de la lista).
// Por eso en la ficha de Eduardo Barber el botón estaba a las 22:08 y ya
// no a las 22:09, sin cambio de código entre una y otra.
//
// Regla: que la reserva esté «desconocida» nunca se lee como «no hay
// reserva». Mientras no se sabe, el botón se muestra cargando; si la
// consulta falló, se muestra con reintento. Solo se esconde cuando se
// SABE que no hay reserva (booking_config null o enabled false).

export function bookingButtonState({ bookingConfig, fullPending, fullError }) {
  const cfg = bookingConfig;
  // Con enlaces externos el botón amarillo no se usa: en su lugar sale la
  // lista de plataformas (DetailView, EXTERNAL LINKS LIST).
  const hasExternalLinks =
    cfg?.type === 'external' &&
    Array.isArray(cfg.externalLinks) &&
    cfg.externalLinks.length > 0;
  if (cfg?.enabled && !hasExternalLinks) return { mode: 'ready' };
  // booking_config undefined = aún no se sabe (objeto de lista viejo o de
  // caché sin la columna, o la consulta fullBusiness sin resolver).
  if (cfg === undefined && fullPending) return { mode: 'loading' };
  if (cfg === undefined && fullError) return { mode: 'retry' };
  return { mode: 'hidden' };
}
