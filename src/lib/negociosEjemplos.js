// Ejemplo por plan: los mismos 3 negocios REALES de la base que ya se
// mostraban en la sección de ejemplos (aprobados, con foto; verificados
// por PostgREST el 10 nov 2026; Akami Sushi verificado el 11 nov 2026),
// ahora debajo de su plan, con la tarjeta que le toca en «ver planes» (la antigua página de planes): Gratuito → CompactCard,
// Destacado → DestacadoCard, Premium → FeaturedCard. La calificación NO
// se guarda aquí: BusinessCard la lee en vivo con displayRating y solo la
// muestra si el caché de Google trae el dato; por eso no se pasan rating
// ni review_count (los de la base son 5.0 / 1, valores por defecto, no
// reales). `plan` es el plan REAL del negocio en la base (Akami Sushi y
// Four Seasons son premium); la variante de la tarjeta es la que muestra
// cómo se vería con el plan de esta columna. `distStr` y `realFavs` son
// los valores de muestra de la antigua página de planes (no hay distancia ni guardados
// reales para un ejemplo).
//
// El horario es el REAL de cada negocio en la base (verificado por
// PostgREST el 10 nov 2026; Akami Sushi el 11 nov 2026): sin `schedule` la tarjeta caía en «Cerrado»
// por defecto (isOpenNow sin horario devuelve `!!b.open`, y aquí no había
// `open`), así los 3 ejemplos vendían un negocio cerrado aunque estuviera
// abierto. Si un negocio cambia su horario en la base, hay que actualizar
// su copia aquí.
export const EJEMPLO_POR_PLAN = {
  free: {
    id: "6b146d7a-2bd9-41c6-9947-799cc68e1267",
    name: "Dalila Casa Repostera",
    category: "cafe",
    plan: "free",
    open: true,
    schedule: {
      lun: "09:30 a.m. - 08:00 p.m.", mar: "09:30 a.m. - 08:00 p.m.",
      mie: "09:30 a.m. - 08:00 p.m.", jue: "09:30 a.m. - 08:00 p.m.",
      vie: "09:30 a.m. - 08:00 p.m.", sab: "09:30 a.m. - 08:00 p.m.",
      dom: "12:30 p.m. - 07:00 p.m.",
    },
    photos: [{ url: "https://dpkjxhjkzdlkvyotoeai.supabase.co/storage/v1/object/public/media/cityguide/1791991285949_z4ojc.webp" }],
  },
  pro: {
    id: "b5bed88e-8d6d-4c4a-88fe-5a89e5190a61",
    name: "Akami Sushi",
    category: "restaurantes",
    plan: "premium",
    open: true,
    schedule: {
      lun: "01:30 p.m. - 09:00 p.m.", mar: "01:30 p.m. - 09:00 p.m.",
      mie: "01:30 p.m. - 09:00 p.m.", jue: "01:30 p.m. - 09:00 p.m.",
      vie: "01:30 p.m. - 09:00 p.m.", sab: "01:30 p.m. - 09:00 p.m.",
      dom: "01:30 p.m. - 09:00 p.m.",
    },
    photos: [
      { url: "https://dpkjxhjkzdlkvyotoeai.supabase.co/storage/v1/object/public/media/cityguide/1792683841443_qbw057.webp" },
      { url: "https://dpkjxhjkzdlkvyotoeai.supabase.co/storage/v1/object/public/media/cityguide/1792683841460_o3klkf.webp" },
      { url: "https://dpkjxhjkzdlkvyotoeai.supabase.co/storage/v1/object/public/media/cityguide/1792683841427_v7nhu6.jpg" },
    ],
  },
  elite: {
    id: "6a49d84a-6feb-4b74-89a8-8f68bab27849",
    name: "Four Seasons Resort Punta Mita",
    category: "hospedaje",
    plan: "premium",
    open: true,
    schedule: {
      lun: "09:00 a.m. - 10:00 p.m.", mar: "09:00 a.m. - 10:00 p.m.",
      mie: "09:00 a.m. - 10:00 p.m.", jue: "09:00 a.m. - 10:00 p.m.",
      vie: "09:00 a.m. - 10:00 p.m.", sab: "09:00 a.m. - 10:00 p.m.",
      dom: "09:00 a.m. - 10:00 p.m.",
    },
    photos: [{ url: "https://dpkjxhjkzdlkvyotoeai.supabase.co/storage/v1/object/public/media/cityguide/1785787099442_qkable.avif" }],
  },
};
