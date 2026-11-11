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

// «Ya están en CityMap»: tira de prueba social de /negocios con 8 negocios
// REALES de la base (verificados por PostgREST el 11 nov 2026): status
// approved, con foto (photo0 con HTTP 200 verificado) y calificación real
// en google_ratings_cache. A diferencia de EJEMPLO_POR_PLAN, aquí SÍ se
// guarda rating/review_count: NO son los valores por defecto de la base
// (5.0 / 1), son el caché de Google tal como estaba el 11 nov 2026, y
// sirven de reserva si el caché no cargó todavía: en vivo displayRating
// prefiere el caché vigente y solo usa estos valores si no hay dato.
// `googleRating: true` marca que el valor viene del caché de Google (por
// eso la tarjeta muestra la «G»). `cityName` es el nombre de la tabla
// cities (verificado). `slug` lleva el prefijo de ciudad; la URL de la
// ficha es /<city_slug>/<slug sin el prefijo>. Si un negocio cambia su
// foto o su calificación en la base, hay que actualizar su copia aquí.
// Elegidos por calificación y reseñas, variando ciudades y categorías, y
// sin repetir los 3 ejemplos por plan (Dalila, Akami Sushi, Four Seasons)
// ni Mochomos.
export const YA_ESTAN_EN_CITYMAP = [
  {
    id: "268f2923-4a5b-47a3-bf6e-cd39fce8c3b6",
    name: "SSAM Comida Coreana",
    slug: "guadalajara-ssam-comida-coreana",
    city_slug: "guadalajara",
    cityName: "Guadalajara",
    category: "restaurantes",
    photos: [{ url: "https://dpkjxhjkzdlkvyotoeai.supabase.co/storage/v1/object/public/media/cityguide/1791991014199_weowej.jpg" }],
    rating: 4.8, review_count: 8825, googleRating: true,
  },
  {
    id: "16917235-d117-4218-8336-171c58565946",
    name: "La Chata de Guadalajara",
    slug: "guadalajara-la-chata-de-guadalajara",
    city_slug: "guadalajara",
    cityName: "Guadalajara",
    category: "restaurantes",
    photos: [{ url: "https://dpkjxhjkzdlkvyotoeai.supabase.co/storage/v1/object/public/media/cityguide/1792964914898_mz0ybd.webp" }],
    rating: 4.6, review_count: 23774, googleRating: true,
  },
  {
    id: "83bee4c0-af4e-4f1f-8bc4-917b4d294c9d",
    name: "La Moresca Andares",
    slug: "zapopan-la-moresca-andares",
    city_slug: "zapopan",
    cityName: "Zapopan",
    category: "restaurantes",
    photos: [{ url: "https://dpkjxhjkzdlkvyotoeai.supabase.co/storage/v1/object/public/media/cityguide/1790960701800_uppt95.jpeg" }],
    rating: 4.8, review_count: 6761, googleRating: true,
  },
  {
    id: "726c2c1a-cca0-4cff-994f-8725bc0d1b35",
    name: "The Landmark",
    slug: "zapopan-the-landmark",
    city_slug: "zapopan",
    cityName: "Zapopan",
    category: "compras",
    photos: [{ url: "https://dpkjxhjkzdlkvyotoeai.supabase.co/storage/v1/object/public/media/cityguide/1785468187660_0j99hh.jpg" }],
    rating: 4.7, review_count: 7126, googleRating: true,
  },
  {
    id: "5d368352-5988-42c3-b79c-38eb5a388842",
    name: "Emiliano Comida y Vino",
    slug: "tepic-emiliano-comida-y-vino",
    city_slug: "tepic",
    cityName: "Tepic",
    category: "restaurantes",
    photos: [{ url: "https://dpkjxhjkzdlkvyotoeai.supabase.co/storage/v1/object/public/media/cityguide/1785484593338_qjpzu.webp" }],
    rating: 4.7, review_count: 963, googleRating: true,
  },
  {
    id: "7f903fdd-71e7-4828-be12-0172e80bd110",
    name: "Velas Vallarta Suites Resort All Inclusive",
    slug: "puerto-vallarta-velas-vallarta-suites-resort-all-inclusive",
    city_slug: "puerto-vallarta",
    cityName: "Puerto Vallarta",
    category: "hospedaje",
    photos: [{ url: "https://dpkjxhjkzdlkvyotoeai.supabase.co/storage/v1/object/public/media/cityguide/1785786662230_mruaob.avif" }],
    rating: 4.6, review_count: 5503, googleRating: true,
  },
  {
    id: "8f0303be-2b0b-465d-a90a-0910432300b1",
    name: "Hilton Mexico City Reforma",
    slug: "ciudad-de-mexico-hilton-mexico-city-reforma",
    city_slug: "ciudad-de-mexico",
    cityName: "Ciudad de México",
    category: "hospedaje",
    photos: [{ url: "https://dpkjxhjkzdlkvyotoeai.supabase.co/storage/v1/object/public/media/cityguide/1786258865528_n6yadu.jpg" }],
    rating: 4.7, review_count: 20141, googleRating: true,
  },
  {
    id: "21fe96dc-640a-438c-a167-4eb4d9eee7dd",
    name: "Parque Xcaret",
    slug: "playa-del-carmen-parque-xcaret",
    city_slug: "playa-del-carmen",
    cityName: "Playa del Carmen",
    category: "ocio",
    photos: [{ url: "https://dpkjxhjkzdlkvyotoeai.supabase.co/storage/v1/object/public/media/cityguide/1785137020147_whdtc.jpg" }],
    rating: 4.8, review_count: 118896, googleRating: true,
  },
];
