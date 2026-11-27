import { searchCandidatePattern } from '../lib/searchPattern.js';
import { deriveEventBooking } from '../lib/eventDetails.js';
import { eventsDateFilterOr, localTodayStr } from '../lib/eventListing.js';
import { create } from 'zustand';
import { sb } from '../lib/supabase.js';
import { preloadWheelFirstImage } from '../lib/wheelPreload.js';

import { METRO_ZONES, updateMetroZones } from '../lib/utils.js';
import { safeSetItem } from '../lib/safeStorage.js';

const getCityFilterEq = (city) => {
  const zone = METRO_ZONES[city];
  return zone ? `city_slug=in.(${zone.join(',')})` : `city_slug=eq.${city}`;
};

const getCityFilterOr = (city) => {
  const zone = METRO_ZONES[city];
  return zone ? zone.map(z => `city_slug.ilike.*${z}*`).join(',') : `city_slug.ilike.*${city}*`;
};

// Unión por id/slug, sin duplicados: el refetch de zona es un
// superconjunto del early fetch, pero fusionar es más seguro que
// reemplazar si algún filtro se comporta distinto.
const mergeById = (first, second) => {
  if (!Array.isArray(second)) return first;
  if (!Array.isArray(first)) return second;
  const seen = new Set(first.map(row => row?.id ?? row?.slug));
  return [...first, ...second.filter(row => row && !seen.has(row?.id ?? row?.slug))];
};

// Selects recortados del arranque (nov 2026, optimización 1): las
// consultas de eventos/experiencias/ciudades iban con select=* y
// bajaban columnas que nadie usa en el arranque. La lista es el mínimo
// que lee TODA la cadena de consumo — no solo la rueda:
// - Eventos: la ficha lee el objeto de la lista (no hay full fetch:
//   getEventBySlugOrId está sin usar) — description, website (de ahí
//   sale booking_config), lat/lng, is_recurring (píldora «Cada semana»),
//   status (homeEventSelection), visibility, user_id, biz_id, active.
//   La lista es la misma que ya usaba EventDetailModal para «Más
//   eventos». Fuera: updated_at, created_at, tag, currency, whatsapp
//   (medido: nadie los lee; −22,8 kB por arranque).
// - Experiencias: la ficha (ExperienceViewer) y la búsqueda de TripsView
//   leen description/description_en/title_en. Fuera: updated_at, status,
//   active, rating, review_count (nadie los lee).
// - Ciudades: civitatis_widget_code (38,8 kB, el 79 % de la tabla) solo
//   lo usa TripsView para el widget — se pide bajo demanda allí (ver
//   TripsView). Fuera también created_at. La zona metropolitana sale de
//   `state` (updateMetroZones), que SÍ va.
// - loadCityPins NO se recorta: schedule/rating/review_count los usa
//   «Lo más cerca de ti», booking_config es obligatoria en todas las
//   listas (botón «Reservar», test reservar_boton_siempre) y photos la
//   usan el popup del mapa y las tarjetas cercanas.
const EVENTS_SELECT = "id,title,title_en,description_en,slug,date,end_date,time,end_time,venue_name,venue_address,lat,lng,city_slug,img_url,img,status,description,event_category,is_recurring,biz_id,price,price_type,currency,website,visibility,active";
// Select LIGERO para el listado del arranque (auditoría Supabase 24 nov 2026,
// PR #464): solo lo que leen las tarjetas y la hoja de compartir — título,
// galería, precio, duración, tema, personas, idiomas y booking_config (el
// fallback de duración lee booking_config.quick_facts). Medido en
// Guadalajara (58 filas): 141 KB gzip con el select completo → 10 KB con
// este. Fuera: description, description_en, meeting_point, meeting_url,
// route_url, includes, not_includes, faq, author_name, affiliate_products
// y biz_id — solo los usa la ficha, que pide la fila completa bajo demanda
// (experienceLookup.js) cuando se abre el detalle. Sin limit de filas: la
// ciudad mayor (Guadalajara) tiene 58 y la Revista las muestra todas con
// «Cargar más»; un limit rompería el listado.
const EXPERIENCES_SELECT = "id,slug,title,title_en,city_slug,price,duration,gallery,activity_type,theme,people,created_at,languages,booking_config";
const CITIES_SELECT = "id,slug,name,state,country,country_code,lat,lng,bg_image,timezone,active";

let inFlightLoadPromise = null;
let inFlightCity = null;
let citiesRefreshPromise = null;
let googleRatingsInFlight = null;

const updateCityCache = (key, updates) => {
  try {
    const existing = JSON.parse(localStorage.getItem(key) || "{}");
    // safeSetItem nunca lanza: ante falta de cuota desaloja cachés de
    // otras ciudades y reintenta; si ni así cabe, el caché queda viejo
    // pero la app sigue funcionando (se re-descarga de la red).
    safeSetItem(key, JSON.stringify({ ...existing, ...updates }));
  } catch (err) {
    console.warn("City cache write error", err);
  }
};

let businessLoadId = 0;
let cityPinsLoadId = 0;
let cityPinsPromise = null;
let cityPinsPromiseCity = null;
const highlightRequests = new Map();
const topLugaresRequests = new Map();

export const useDataStore = create((set, get) => ({
  events: [], setEvents: (val) => set(s => ({ events: typeof val === 'function' ? val(s.events) : val })),
  experiences: [], setExperiences: (val) => set(s => ({ experiences: typeof val === 'function' ? val(s.experiences) : val })),
  raffles: [], setRaffles: (val) => set(s => ({ raffles: typeof val === 'function' ? val(s.raffles) : val })),
  promos: [], setPromos: (val) => set(s => ({ promos: typeof val === 'function' ? val(s.promos) : val })),
  coupons: [], setCoupons: (val) => set(s => ({ coupons: typeof val === 'function' ? val(s.coupons) : val })),
  banners: [], setBanners: (val) => set(s => ({ banners: typeof val === 'function' ? val(s.banners) : val })),
  reviews: [], setReviews: (val) => set(s => ({ reviews: typeof val === 'function' ? val(s.reviews) : val })),
  cats: [], setCats: (val) => set(s => ({ cats: typeof val === 'function' ? val(s.cats) : val })),
  cityCats: [],
  cities: [], setCities: (val) => set(s => ({ cities: typeof val === 'function' ? val(s.cities) : val })),
  // Caché de calificaciones de Google (rating + conteo, refresco mensual en
  // servidor). Solo filas vigentes; sin dato, la tarjeta usa el conteo de CityMap.
  googleRatings: {},
  googleRatingsLoaded: false,
  loadGoogleRatings: async () => {
    if (get().googleRatingsLoaded || googleRatingsInFlight) return googleRatingsInFlight;
    googleRatingsInFlight = (async () => {
      try {
        const now = new Date().toISOString();
        const rows = await sb.get("google_ratings_cache", `?select=business_id,rating,review_count&expires_at=gt.${encodeURIComponent(now)}`);
        const map = {};
        (Array.isArray(rows) ? rows : []).forEach(r => {
          if (!r?.business_id) return;
          map[r.business_id] = { rating: r.rating != null ? Number(r.rating) : null, count: Number(r.review_count) || 0 };
        });
        set({ googleRatings: map, googleRatingsLoaded: true });
      } catch (err) {
        console.warn("Could not load Google ratings cache", err);
      } finally {
        googleRatingsInFlight = null;
      }
    })();
    return googleRatingsInFlight;
  },
  refreshCities: async () => {
    if(citiesRefreshPromise) return citiesRefreshPromise;
    citiesRefreshPromise=(async()=>{
      try {
        const rows=await sb.get('cities',`?select=${CITIES_SELECT}&order=name.asc`);
        if(!Array.isArray(rows)) throw new Error('Invalid cities response');
        const cities=rows.filter(Boolean);
        set({cities});
        updateMetroZones(cities);
        return cities;
      } catch(error) {
        console.warn('Could not refresh cities',error);
        return get().cities;
      } finally { citiesRefreshPromise=null; }
    })();
    return citiesRefreshPromise;
  },
  wallet: (() => { try { return JSON.parse(localStorage.getItem("citymap_wallet") || "[]"); } catch { return []; } })(),
  setWallet: (val) => set(s => ({ wallet: typeof val === 'function' ? val(s.wallet) : val })),
  claimedCoupons: (() => { try { return JSON.parse(localStorage.getItem("citymap_claims") || "{}"); } catch { return {}; } })(),
  setClaimedCoupons: (val) => set(s => ({ claimedCoupons: typeof val === 'function' ? val(s.claimedCoupons) : val })),
  homeCoreCity: null,
  homeCoreError: false,
  homeSecondaryCity: null,
  homeSecondaryError: false,
  // true cuando la restauración síncrona de loadData encontró alguna
  // caché guardada para la ciudad (muro o pines): sin internet pero con
  // caché, el splash sale y se ve lo último cargado.
  homeCacheAvailable: false,
  dbReady: false, setDbReady: (val) => set(s => ({ dbReady: typeof val === 'function' ? val(s.dbReady) : val })),
  dbError: false, setDbError: (val) => set(s => ({ dbError: typeof val === 'function' ? val(s.dbError) : val })),
  mapPins: [], setMapPins: (val) => set(s => ({ mapPins: typeof val === 'function' ? val(s.mapPins) : val })),
  // Pines ligeros de TODA la ciudad para el mapa (nov 2026, mapa lento):
  // la consulta completa con solo las columnas del pin. mapPins sigue
  // siendo la lista pesada y paginada de la home (primeros 20 + «Ver más»).
  cityPins: [], setCityPins: (val) => set(s => ({ cityPins: typeof val === 'function' ? val(s.cityPins) : val })),
  cityPinsCity: null,
  myBizList: [], setMyBizList: (val) => set(s => ({ myBizList: typeof val === 'function' ? val(s.myBizList) : val })),
  globalFavCounts: {}, setGlobalFavCounts: (val) => set(s => ({ globalFavCounts: typeof val === 'function' ? val(s.globalFavCounts) : val })),
  myItineraries: [], setMyItineraries: (val) => set(s => ({ myItineraries: typeof val === 'function' ? val(s.myItineraries) : val })),

  parseJSON: (val) => {
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch(e) { return {}; }
    }
    return val || {};
  },

  mapPinsCity: null,
  initialBizCount: null,
  homeHighlights: [],
  highlightsCity: null,
  // «Lugares increíbles»: top por rating con fuente propia (ver
  // loadTopLugares). No sale de mapPins: los primeros 20 de la lista
  // paginada traían 1-2 lugares en la zona de Guadalajara y la sección
  // no se montaba.
  topLugares: [],
  topLugaresCity: null,

  loadMapPins: async (targetCity) => {
    if (!targetCity) return;
    const requestId = ++businessLoadId;
    const cacheKey = `cg_mapPins_${targetCity}`;
    set({ mapPinsCity: targetCity, initialBizCount: null, mapPins: [], homeHighlights: [], highlightsCity: null, topLugares: [], topLugaresCity: null });
    try {
      // Old caches may contain the entire city. Restore only the first page.
      const cached = typeof localStorage !== 'undefined' ? localStorage.getItem(cacheKey) : null;
      if (cached) {
        try {
          const rows = JSON.parse(cached);
          if (Array.isArray(rows)) {
            const restored = rows.slice(0, 20);
            // Sin internet el fetch falla y el conteo quedaba en null:
            // el splash no salía aunque los pines sí estaban en caché.
            set({ mapPins: restored, initialBizCount: restored.length });
          }
        } catch { /* Invalid caches are replaced by the network response. */ }
      }
      // booking_config VA en el select (nov 2026, botón Reservar
      // intermitente): la ficha decide si muestra «Reservar» con
      // selected.booking_config?.enabled, y si la lista no trae la
      // columna el botón no existe hasta que resuelve fullBusiness — o
      // nunca, si esa consulta falla con red floja. No quitarla de
      // ninguna lista de columnas de negocios (esta, la de abajo, la de
      // búsqueda, la de destacados ni la de pines del mapa).
      let selectCols = "id,name,lat,lng,category,emoji,logo_url,photos,rating,review_count,schedule,plan,city_slug,status,address,created_at,slug,is_place,type,tagline,whatsapp,phone,facebook,instagram,social_links,hide_location,tags,badge,mercado_libre_url,mercado_libre_nickname,banner_url,is_catalog,booking_config";
      
      const processBatch = (batch) => Array.isArray(batch) ? batch.map(b => ({
        ...b,
        schedule: get().parseJSON(b.schedule),
        social_links: get().parseJSON(b.social_links),
        photos: get().parseJSON(b.photos)
      })) : [];

      let firstBatch;
      try {
        firstBatch = await sb.get("businesses", `?select=${selectCols},subcategory&status=eq.approved&plan=neq.menu&${getCityFilterEq(targetCity)}&order=plan.desc,rating.desc.nullslast,id.desc&limit=20`);
        selectCols = selectCols + ",subcategory";
      } catch (err) {
        if (err?.message?.includes("subcategory") || err?.message?.includes("column")) {
          firstBatch = await sb.get("businesses", `?select=${selectCols}&status=eq.approved&plan=neq.menu&${getCityFilterEq(targetCity)}&order=plan.desc,rating.desc.nullslast,id.desc&limit=20`);
        } else {
          throw err;
        }
      }
      if (requestId !== businessLoadId) return;
      const initialPins = processBatch(firstBatch);
      set({ mapPins: initialPins, initialBizCount: initialPins.length });
      if (typeof localStorage !== 'undefined') safeSetItem(cacheKey, JSON.stringify(initialPins));
      // Further rows are requested only by pagination or the map viewport.
    } catch (e) {
      console.warn("Error fetching map pins", e);
    }
  },

  // Precarga ligera de TODA la ciudad para el mapa (nov 2026, mapa lento).
  // Antes el mapa solo traía los primeros 20 (loadMapPins) y el resto
  // llegaba por viewport con loadMapPinsByBounds (limit=200 sin order):
  // al mover el mapa «Lo más cerca de ti» pasaba de 80 a 64 lugares y
  // Guadalajara (330+) nunca se cargaba entera. Ahora se trae la ciudad
  // completa en una consulta ligera y se pagina con rangos hasta agotar
  // las filas (PostgREST limita a 1000 por petición). Solo columnas del
  // pin — id, name, lat, lng, category, emoji, logo_url, plan, slug,
  // city_slug y status — más schedule, rating y review_count, que son
  // escalares pequeños y los necesita «Lo más cerca de ti» (el filtro
  // «Abiertos ahora», el punto de estado y la calificación de la tarjeta),
  // más booking_config: es un JSONB pequeño y la ficha lo necesita desde
  // el primer render para el botón «Reservar» (nov 2026, botón
  // intermitente; el test reservar_boton_siempre lo exige en TODAS las
  // listas de columnas, pines del mapa incluidos). photos SÍ va (nov 2026:
  // sin ella el popup del mapa y las tarjetas de «Lo más cerca de ti»
  // mostraban solo el emoji; medido +20% gzip en Tepic y +22% en
  // Guadalajara, una sola petición por ciudad y sesión). subcategory SÍ va
  // (nov 2026, «¿Qué se te antoja?»: el antojo se deriva de subcategory +
  // nombre; sin ella la precarga solo vería el nombre). Sin
  // social_links, description, tags ni banner_url: eso era lo que pesaba.
  // Se cachea por ciudad en memoria: no se re-pide para la misma ciudad
  // en la sesión; al cambiar de ciudad se vuelve a pedir. Llamadas
  // concurrentes para la misma ciudad comparten la misma promesa.
  loadCityPins: async (targetCity) => {
    if (!targetCity) return;
    if (get().cityPinsCity === targetCity && get().cityPins.length > 0) return;
    if (cityPinsPromise && cityPinsPromiseCity === targetCity) return cityPinsPromise;
    const requestId = ++cityPinsLoadId;
    const request = (async () => {
      // No vaciar los pines al cambiar de ciudad: antes el mapa se
      // pintaba una vez con 0 pines (el clusterer se vaciaba) y otra
      // con la ciudad completa. Se ven los pines viejos un instante.
      set({ cityPinsCity: targetCity });
      try {
        const selectCols = "id,name,lat,lng,category,emoji,logo_url,plan,slug,city_slug,status,schedule,rating,review_count,booking_config,photos,subcategory";
        const pageSize = 1000;
        const all = [];
        let offset = 0;
        for (;;) {
          const page = await sb.get("businesses", `?select=${selectCols}&status=eq.approved&plan=neq.menu&${getCityFilterEq(targetCity)}&order=id.asc&limit=${pageSize}&offset=${offset}`);
          if (requestId !== cityPinsLoadId || get().cityPinsCity !== targetCity) return;
          if (!Array.isArray(page)) throw new Error("Invalid city pins response");
          all.push(...page);
          if (page.length < pageSize) break;
          offset += pageSize;
        }
        if (requestId !== cityPinsLoadId || get().cityPinsCity !== targetCity) return;
        const pins = all.map(b => ({ ...b, schedule: get().parseJSON(b.schedule), photos: get().parseJSON(b.photos) }));
        // A12 (21 nov 2026): el pool por horario se deriva de aquí. Son
        // las mismas filas (schedule, rating, review_count, plan, photos)
        // que usaban las secciones; la tercera descarga (200 filas
        // pesadas, que además truncaba Guadalajara) ya no existe.
        set({ cityPins: pins, cityPinsCity: targetCity, timeBasedBiz: pins, timeBasedBizCity: targetCity });
      } catch (e) {
        console.warn("Error fetching city pins", e);
        // Si falló y nadie más pidió otra ciudad, limpiar para no
        // dejar los pines de la ciudad anterior.
        if (requestId === cityPinsLoadId && get().cityPinsCity === targetCity) {
          set({ cityPins: [] });
        }
      }
    })();
    cityPinsPromise = request;
    cityPinsPromiseCity = targetCity;
    request.finally(() => { if (cityPinsPromise === request) { cityPinsPromise = null; cityPinsPromiseCity = null; } });
    return request;
  },

  timeBasedBiz: [], setTimeBasedBiz: (val) => set(s => ({ timeBasedBiz: typeof val === 'function' ? val(s.timeBasedBiz) : val })),
  timeBasedBizCity: null,

  // Pool para las listas por horario de la home ("Para iniciar el día",
  // "Hora de comer", "Para cerrar el día"): TODOS los negocios aprobados
  // de la ciudad, sin ordenar por plan, para que restaurantes y cafeterías
  // free, destacados y premium compitan en igualdad. loadMapPins solo
  // trae los primeros 20 ordenados por plan, por eso antes solo salían
  // premium.
  // A12 (21 nov 2026): el pool ya NO se descarga aparte: se deriva de
  // cityPins (la ciudad completa ligera que ya trae el mapa), que trae
  // schedule, rating, review_count, plan y photos — lo que usan las
  // secciones y el primer render de la ficha. Antes era una tercera
  // descarga de los mismos negocios (200 filas pesadas con limit=200,
  // que además truncaba Guadalajara). Si los pines aún no llegaron, se
  // piden (loadCityPins) y el pool se deriva de ellos al resolver.
  loadTimeBasedBiz: async (targetCity) => {
    if (!targetCity) return;
    await get().loadCityPins(targetCity);
    if (get().cityPinsCity === targetCity) {
      set({ timeBasedBiz: get().cityPins, timeBasedBizCity: targetCity });
    }
  },

  fetchMoreBiz: async ({ targetCity, query, category, offset = 0, limit = 20, onBatch }) => {
    try {
      if (!targetCity) return null;
      // Si el usuario escribe lo que sugiere el buscador ("Buscar tacos"),
      // se quita el verbo para buscar solo el término.
      query = (query || '').replace(/^(buscar|busca)\s+/i, '').trim();
      const selectCols = "id,name,lat,lng,category,emoji,logo_url,photos,rating,review_count,schedule,plan,city_slug,status,address,created_at,slug,is_place,type,tagline,whatsapp,phone,facebook,instagram,social_links,hide_location,tags,badge,mercado_libre_url,mercado_libre_nickname,banner_url,description,is_catalog,booking_config";
      
      let filters = `status=eq.approved&plan=neq.menu&${getCityFilterEq(targetCity)}`;
      
      if (category && category !== "todas" && category !== "explorar") {
        // Simple match on category column for remote fetch
        filters += `&category=ilike.*${category}*`;
      }
      
      const makeSearchFilter = (jsonTags = false) => {
        if (!query) return "";
        // Quote PostgREST patterns before URL encoding, including punctuation.
        const pattern = JSON.stringify(`*${query.trim()}*`);
        const textFilters = ["name", "type", "category", "tagline", "description"].map(field => `${field}.ilike.${pattern}`);
        const candidate = searchCandidatePattern(query);
        if (candidate) {
          for (const field of ['name', 'type', 'category', 'tagline']) textFilters.push(`${field}.imatch.${JSON.stringify(candidate)}`);
        }
        const tags = jsonTags ? JSON.stringify([query.trim()]) : `{${JSON.stringify(query.trim())}}`;
        return `&or=${encodeURIComponent(`(${[...textFilters, `tags.cs.${tags}`].join(',')})`)}`;
      };
      const requestBatch = async (jsonTags = false, includeSubcategory = true) => {
        try {
          return await sb.get("businesses", `?select=${selectCols}${includeSubcategory ? ",subcategory" : ""}&${filters}${makeSearchFilter(jsonTags)}&order=plan.desc,rating.desc.nullslast,id.desc&limit=${limit}&offset=${offset}`);
        } catch (error) {
          const message = error?.message || "";
          if (includeSubcategory && /subcategory/i.test(message) && /column|schema cache/i.test(message)) return requestBatch(jsonTags, false);
          // Support either text[] or jsonb tags without fetching the full city.
          if (query && !jsonTags && /invalid input syntax for type json/i.test(message)) return requestBatch(true, includeSubcategory);
          throw error;
        }
      };
      const batch = await requestBatch();

      if (get().mapPinsCity !== targetCity) return null;
      if (!Array.isArray(batch)) return null;
      if (batch.length === 0) { onBatch?.([]); return 0; }
      
      const processBatch = (bArray) => Array.isArray(bArray) ? bArray.map(b => ({
        ...b,
        schedule: get().parseJSON(b.schedule),
        social_links: get().parseJSON(b.social_links),
        photos: get().parseJSON(b.photos)
      })) : [];
      
      const processed = processBatch(batch);
      onBatch?.(processed);
      
      // Merge with existing mapPins
      const currentPins = get().mapPins;
      const allPinsMap = new Map();
      currentPins.forEach(p => allPinsMap.set(p.id, p));
      processed.forEach(p => allPinsMap.set(p.id, p));
      
      set({ mapPins: Array.from(allPinsMap.values()) });
      
      return processed.length;
    } catch (e) {
      console.error("Error fetching paginated biz:", e);
      return null;
    }
  },

  loadHomeHighlights: (targetCity) => {
    if (!targetCity || get().mapPinsCity !== targetCity || get().highlightsCity === targetCity) return Promise.resolve();
    if (highlightRequests.has(targetCity)) return highlightRequests.get(targetCity);
    const request = (async () => {
      try {
        const filters = `status=eq.approved&plan=neq.menu&${getCityFilterEq(targetCity)}`;
        const columns = "id,name,lat,lng,category,emoji,logo_url,photos,rating,review_count,plan,city_slug,status,slug,badge,is_catalog,booking_config";
        const ratedRequest = sb.get("businesses", `?select=${columns}&${filters}&review_count=gt.0&order=rating.desc.nullslast,review_count.desc,id.desc&limit=10`);
        const favoriteRequest = (async () => {
          const ids = Object.entries(get().globalFavCounts).filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1]).map(([id]) => id);
          const found = [];
          // Look up ranked candidates in bounded batches, only for this city.
          for (let offset = 0; offset < ids.length && found.length < 10; offset += 50) {
            if (get().mapPinsCity !== targetCity) return [];
            const chunk = ids.slice(offset, offset + 50);
            const rows = await sb.get("businesses", `?select=${columns}&${filters}&id=in.(${chunk.join(',')})&limit=50`);
            const byId = new Map((Array.isArray(rows) ? rows : []).map(row => [row.id, row]));
            chunk.forEach(id => { if (byId.has(id)) found.push(byId.get(id)); });
          }
          return found.slice(0, 10);
        })();
        const [rated, favorites] = await Promise.all([ratedRequest, favoriteRequest]);
        if (get().mapPinsCity !== targetCity) return;
        if (!Array.isArray(rated)) throw new Error("Invalid ranked businesses response");
        const unique = new Map([...rated, ...favorites].map(b => [b.id, { ...b, photos: get().parseJSON(b.photos) }]));
        set({ homeHighlights: Array.from(unique.values()), highlightsCity: targetCity });
      } catch (e) {
        console.warn("Error fetching home highlights", e);
      }
    })();
    highlightRequests.set(targetCity, request);
    request.finally(() => highlightRequests.delete(targetCity));
    return request;
  },

  // «Lugares increíbles»: fuente propia, independiente de la lista
  // paginada (bug 27 nov 2026: los primeros 20 de loadMapPins traían
  // 1-2 lugares en la zona de Guadalajara y la sección devolvía null
  // con menos de 3 candidatos, aunque la base tiene 24 lugares con
  // foto+rating en la zona). Mismo patrón que loadHomeHighlights:
  // consulta por rating con límite 10, caché por ciudad en memoria y
  // peticiones concurrentes para la misma ciudad compartiendo la misma
  // promesa. Solo las columnas que usa la tarjeta. El top 5, el mínimo
  // de 3 y el orden (rating DESC, desempate review_count DESC) los
  // aplica topLugaresIncreibles en el componente, sobre estas filas.
  loadTopLugares: async (targetCity) => {
    if (!targetCity) return;
    if (get().topLugaresCity === targetCity) return;
    if (topLugaresRequests.has(targetCity)) return topLugaresRequests.get(targetCity);
    const request = (async () => {
      try {
        const columns = "id,name,photos,rating,review_count,category,city_slug,slug,status";
        const rows = await sb.get("businesses", `?select=${columns}&category=eq.lugares&status=eq.approved&${getCityFilterEq(targetCity)}&order=rating.desc.nullslast,review_count.desc&limit=10`);
        if (get().mapPinsCity !== targetCity) return;
        if (!Array.isArray(rows)) throw new Error("Invalid top lugares response");
        set({ topLugares: rows.map(b => ({ ...b, photos: get().parseJSON(b.photos) })), topLugaresCity: targetCity });
      } catch (e) {
        console.warn("Error fetching top lugares", e);
      }
    })();
    topLugaresRequests.set(targetCity, request);
    request.finally(() => topLugaresRequests.delete(targetCity));
    return request;
  },

  loadData: (cityOverride) => {
    const rawTarget = cityOverride || localStorage.getItem("cg_city_slug") || (get().cities?.[0]?.slug) || "";
    if (inFlightLoadPromise && inFlightCity === rawTarget && rawTarget !== "") {
      return inFlightLoadPromise;
    }
    inFlightCity = rawTarget;
    // Ciudad en memoria: la de los datos que se ven ahora. NO leerla de
    // localStorage: setActiveCity ya persistió la nueva antes de llamar a
    // loadData, así que ahí siempre es igual al destino y la limpieza
    // nunca corría (código muerto; hallazgo 3 de fluidez, nov 2026).
    const prevCity = get().mapPinsCity || get().homeCoreCity || null;
    set({homeCoreCity:null,homeCoreError:false,homeSecondaryCity:null,homeSecondaryError:false,homeCacheAvailable:false});

    // Al cambiar de ciudad, vaciar en memoria los datos de la anterior
    // ANTES de restaurar la caché de la nueva: si no, la rueda y las
    // secciones muestran los eventos de la ciudad anterior hasta que
    // resuelve la red (~15 s). Con los arreglos vacíos y dbReady en
    // false, las secciones muestran su esqueleto (decisión de Jonathan,
    // 21 nov 2026: esqueleto vacío mientras carga). La caché de
    // localStorage NO se toca: si la ciudad nueva tiene caché, la
    // restauración de abajo la hidrata enseguida. También se invalidan
    // los loaders en vuelo de la ciudad anterior (sus completados ven el
    // contador cambiado y no publican nada) y se resetea mapPinsCity
    // para que ni fetchSecondary ni los highlights viejos puedan
    // publicar después de la limpieza.
    if (rawTarget && prevCity && rawTarget !== prevCity) {
      businessLoadId++;
      cityPinsLoadId++;
      set({ dbReady: false, events: [], experiences: [], banners: [], promos: [], coupons: [], mapPins: [], cityPins: [], cityPinsCity: null, mapPinsCity: null, timeBasedBiz: [], timeBasedBizCity: null, homeHighlights: [], highlightsCity: null, topLugares: [], topLugaresCity: null, initialBizCount: null });
    }

    // Instant synchronous cache restoration before any network call
    if (rawTarget) {
      const cacheKey = `cg_data_${rawTarget}_v5`;
      let foundCache = false;

      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const c = JSON.parse(cached);
          foundCache = true;
          const now = new Date();
          const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
          
          if (Array.isArray(c.e)) {
            const validCachedEvents = c.e.filter(ev => {
              if (!ev || !ev.date) return false;
              if (ev.end_date) return ev.end_date >= todayStr;
              return ev.date >= todayStr;
            });
            set({ events: validCachedEvents });
            // La primera imagen de la rueda ya se conoce: precargarla
            // ahora, antes de que React pinte la rueda con el caché.
            preloadWheelFirstImage(validCachedEvents, rawTarget);
          }
          if (c.ex) set({ experiences: c.ex.filter(Boolean) });
          if (c.p) set({ promos: c.p.filter(Boolean) });
          if (c.c) set({ coupons: c.c.filter(Boolean) });
          if (c.bn) set({ banners: c.bn.filter(Boolean) });
          if (c.cc) set({ cityCats: c.cc.filter(Boolean) });
          if (c.ca) {
            const cityLinks = Array.isArray(c.cc) ? c.cc.filter(Boolean) : [];
            const cityLinkedSlugs = cityLinks.map(l => l.category_slug);
            const filteredCa = c.ca.filter(Boolean).filter(cat => {
              if (!cityLinkedSlugs.includes(cat.slug)) return true;
              return cityLinks.some(l => l.category_slug === cat.slug && l.city_slug === rawTarget);
            });
            set({ cats: filteredCa.map(cat => ({ id: cat.slug, label: cat.name?.trim(), icon: cat.icon || "pin", slug: cat.slug, emoji: cat.emoji, img_url: cat.img_url || null, subtitle: cat.subtitle || null })) });
          }
          if (c.ci) {
            const validCities = c.ci.filter(Boolean);
            set({ cities: validCities });
            updateMetroZones(validCities);
          }
          if (c.globalFavs) {
            const counts = {};
            c.globalFavs.filter(Boolean).forEach(f => { counts[f.biz_id] = parseInt(f.fav_count, 10); });
            set({ globalFavCounts: counts });
          }
          
          if (localStorage.getItem(`cg_mapPins_${rawTarget}`)) {
            foundCache = true;
            set({ dbReady: true });
          }
        } catch (e) { console.error(e); }
      }
      if (foundCache) set({ homeCacheAvailable: true });
    }

    inFlightLoadPromise = (async () => {
      try {
        // Las consultas de eventos y experiencias para la rueda no
        // dependen de la lista de ciudades: si la ciudad ya se conoce
        // (URL o guardada), se disparan en paralelo con refreshCities
        // en vez de esperar a que resuelva. Hoy la primera imagen de
        // la rueda no se descubre hasta que terminan las dos consultas
        // en serie, y ese es el grueso del retraso del LCP.
        const earlyCity = cityOverride || (typeof localStorage !== 'undefined' ? localStorage.getItem("cg_city_slug") : null);
        // Si la zona metropolitana ya se conoce (ciudades en caché de
        // una sesión anterior), el early fetch sale con el filtro ancho.
        // Si no, sale estrecho (solo la ciudad) y fetchSecondary lo
        // vuelve a pedir con la zona ya poblada: el PR #166 introdujo
        // esa carrera (los 37 eventos de Zapopan faltaban en Guadalajara).
        const earlyZoneReady = earlyCity ? Boolean(METRO_ZONES[earlyCity]) : false;
        // A10 (21 nov 2026): en arranque en frío las ciudades aún no se
        // conocen y la zona tampoco; disparar el early fetch en paralelo
        // sale estrecho y luego se repite con la zona (2 consultas de
        // más: eventos y experiencias). En frío no se dispara en
        // paralelo: fetchSecondary pide una sola vez, ya con la zona
        // poblada por refreshCities. En caliente las ciudades vienen de
        // la caché y el paralelo se mantiene (LCP de la rueda).
        // `cities` no vacío = la restauración de caché ya corrió
        // updateMetroZones, así que la zona es conocida (una ciudad sin
        // zona simplemente no tiene entrada y el filtro estrecho es
        // igual al ancho: no hay nada que repetir).
        const citiesKnown = (get().cities?.length || 0) > 0;
        const earlySecondary = (earlyCity && citiesKnown) ? Promise.all([
          sb.get("events", `?select=${EVENTS_SELECT}&status=eq.approved&or=(city_slug.eq.all,${getCityFilterOr(earlyCity)})&${eventsDateFilterOr(localTodayStr())}`).catch(() => null),
          sb.get("experiences", `?select=${EXPERIENCES_SELECT}&status=eq.approved&or=(city_slug.eq.all,${getCityFilterOr(earlyCity)})`).catch(() => null),
        ]) : null;

        const currentCities = await get().refreshCities();

        const targetCity = cityOverride || localStorage.getItem("cg_city_slug") || (currentCities?.[0]?.slug) || "";
        if (!targetCity) {
           set({ dbReady: true });
           return; // Avoid crashing if no cities are loaded yet
        }
        
        const cacheKey = `cg_data_${targetCity}_v5`;
        const pPins = get().loadMapPins(targetCity);
        // La precarga ligera de la ciudad corre en fondo con la lista
        // pesada: así el mapa y «Lo más cerca de ti» ya tienen la ciudad
        // completa cuando el usuario los abre.
        get().loadCityPins(targetCity);
        // El pool por horario ya no se pide aparte: se deriva de
        // loadCityPins (arriba), que trae la ciudad completa ligera
        // (A12). La ficha usa el objeto de la lista en su primer render
        // hasta que resuelve fullBusiness, y booking_config es
        // obligatoria en todas las listas (también va en cityPins).
      
      
      // Secondary fetches (Non-blocking)
      const fetchSecondary = async () => {
        try {
          // Si la petición ya se disparó en paralelo con refreshCities,
          // se espera esa misma promesa en vez de pedir de nuevo.
          let [e, ex] = earlySecondary
            ? await earlySecondary
            : await Promise.all([
              sb.get("events", `?select=${EVENTS_SELECT}&status=eq.approved&or=(city_slug.eq.all,${getCityFilterOr(targetCity)})&${eventsDateFilterOr(localTodayStr())}`).catch(() => null),
              sb.get("experiences", `?select=${EXPERIENCES_SELECT}&status=eq.approved&or=(city_slug.eq.all,${getCityFilterOr(targetCity)})`).catch(() => null),
            ]);

          // El early fetch se disparó en paralelo con refreshCities: si
          // la zona aún no se conocía, su filtro fue estrecho (solo la
          // ciudad) y faltan los eventos de la zona metropolitana
          // (Zapopan/Tlaquepaque en Guadalajara). Se vuelve a pedir con
          // la zona ya poblada y se fusiona por id. Solo cuando la
          // ciudad tiene zona (si no, la consulta sería idéntica).
          // Costo: una consulta extra solo en la primera carga en frío;
          // con ciudades en caché la zona ya está y no se repite.
          if (earlySecondary && !earlyZoneReady && METRO_ZONES[targetCity] && METRO_ZONES[targetCity].length > 1) {
            const [e2, ex2] = await Promise.all([
              sb.get("events", `?select=${EVENTS_SELECT}&status=eq.approved&or=(city_slug.eq.all,${getCityFilterOr(targetCity)})&${eventsDateFilterOr(localTodayStr())}`).catch(() => null),
              sb.get("experiences", `?select=${EXPERIENCES_SELECT}&status=eq.approved&or=(city_slug.eq.all,${getCityFilterOr(targetCity)})`).catch(() => null),
            ]);
            e = mergeById(e, e2);
            ex = mergeById(ex, ex2);
          }
          
          const now = new Date();
          const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
          
          const updates = {};
          const cacheUpdates = {};

          if (Array.isArray(e)) {
            const validEvents = e.filter(ev => {
              if (!ev || !ev.date) return false;
              // Los eventos privados no entran al store: solo se abren con su enlace.
              if (ev.visibility === 'private') return false;
              if (ev.end_date) return ev.end_date >= todayStr;
              return ev.date >= todayStr;
            }).map(ev => {
              // booking_config se deriva de `website` (deriveEventBooking,
              // lib/eventDetails.js): una sola fuente de verdad, también
              // usada por getEventLinks para filas crudas (carga directa).
              const { booking_config, website } = deriveEventBooking(ev);
              return { ...ev, booking_config, website };
            });
            updates.events = validEvents;
            cacheUpdates.e = validEvents;
          }

          if (Array.isArray(ex)) {
            updates.experiences = ex;
            cacheUpdates.ex = ex;
          }

          // El muro ya tiene eventos y experiencias: publicarlos ahora,
          // sin esperar a rifas, promos y cupones.
          if (get().mapPinsCity === targetCity) {
            // La rueda va a pintarse con estos eventos: precargar la
            // primera imagen ahora, antes del re-render.
            preloadWheelFirstImage(updates.events || [], targetCity);
            set(updates);
            if (Object.keys(cacheUpdates).length > 0) {
              updateCityCache(cacheKey, cacheUpdates);
            }
          }

          const [r, p, c] = await Promise.all([
            sb.get("raffles", `?select=*,businesses!inner(city_slug)&businesses.city_slug=eq.${targetCity}`).catch(() => null),
            sb.get("promos", `?select=*,businesses!inner(city_slug)&businesses.city_slug=eq.${targetCity}`).catch(() => null),
            sb.get("coupons", `?select=*,businesses!inner(city_slug)&businesses.city_slug=eq.${targetCity}`).catch(() => null)
          ]);

          if (Array.isArray(r)) {
            updates.raffles = r;
          }
          if (Array.isArray(p)) {
            updates.promos = p;
            cacheUpdates.p = p;
          }
          if (Array.isArray(c)) {
            updates.coupons = c;
            cacheUpdates.c = c;
          }

          if(get().mapPinsCity !== targetCity)return;
          updates.homeSecondaryCity=targetCity;
          updates.homeSecondaryError=[e,ex,r,p,c].some(rows=>!Array.isArray(rows));
          set(updates);
          if (Object.keys(cacheUpdates).length > 0) {
            updateCityCache(cacheKey, cacheUpdates);
          }
        } catch(err) {
          if(get().mapPinsCity===targetCity)set({homeSecondaryCity:targetCity,homeSecondaryError:true});
          console.warn("Secondary fetch failed", err);
        }
      };

      // Fire non-blocking fetch
      fetchSecondary();

      let coreError=false;
      const bannerCities = ["all", ...(METRO_ZONES[targetCity] || [targetCity])];
      // Un fetch fallido devuelve null, no []: con [] el estado y la caché
      // guardada se borraban con vacíos (nov 2026, sin internet). Solo se
      // aplican los fetches que tuvieron éxito (Array).
      const pBanners = sb.get("banners", `?active=eq.true&city_slug=in.(${bannerCities.join(',')})`).catch(() => {coreError=true;return null;});
      const pCats = sb.get("categories", "?active=eq.true&order=sort_order.asc").catch(() => {coreError=true;return null;});
      const pCityCats = sb.get("city_categories").catch(() => {coreError=true;return null;});
      const pCities = currentCities && currentCities.length > 0 ? Promise.resolve(currentCities) : sb.get("cities", `?select=${CITIES_SELECT}&order=name.asc`).catch(() => null);
      const pFavs = sb.rpc("get_global_favs").catch(() => sb.get("favorites")).catch(() => null);

      // Solo lo que necesita la primera pantalla: banners, categorías,
      // ciudades, favoritos y los primeros 20 negocios. El resto (la lista
      // de 200 para las secciones por horario, rifas, promos y cupones)
      // llega después, sin frenar el muro.
      const [bn, ca, cc, ci, globalFavs] = await Promise.all([pBanners, pCats, pCityCats, pCities, pFavs, pPins]);
      
      if (ci && Array.isArray(ci)) {
        updateMetroZones(ci);
      }

      const stateUpdates = {};

      if (Array.isArray(bn)) stateUpdates.banners = bn.filter(Boolean);
      if (Array.isArray(cc)) {
        stateUpdates.cityCats = cc;
      }
      if (Array.isArray(ca)) {
        const cityLinks = Array.isArray(cc) ? cc : [];
        const cityLinkedSlugs = cityLinks.map(l => l.category_slug);
        const filteredCa = ca.filter(cat => {
          // No entries in city_categories = global category (show everywhere)
          if (!cityLinkedSlugs.includes(cat.slug)) return true;
          // Has entries = only show in specified cities
          return cityLinks.some(l => l.category_slug === cat.slug && l.city_slug === targetCity);
        });
        stateUpdates.cats = filteredCa.map(c => ({ id: c.slug, label: c.name.trim(), icon: c.icon || "pin", slug: c.slug, emoji: c.emoji, img_url: c.img_url || null, subtitle: c.subtitle || null }));
      }
      if (Array.isArray(globalFavs)) {
        const counts = {};
        if (globalFavs.length > 0 && globalFavs[0].fav_count !== undefined) {
          globalFavs.forEach(f => { counts[f.biz_id] = parseInt(f.fav_count, 10); });
        } else {
          globalFavs.forEach(f => { if (f.biz_id) counts[f.biz_id] = (counts[f.biz_id] || 0) + 1; });
        }
        stateUpdates.globalFavCounts = counts;
      }

      if (Array.isArray(ci)) {
        stateUpdates.cities = ci;
        updateMetroZones(ci);
      }

      // Una carga anterior (otra ciudad) que resuelva tarde no pisa lo
      // de la ciudad actual: sus banners y categorías son de la ciudad
      // vieja. mapPinsCity lo fija loadMapPins al arrancar la carga
      // vigente, así que si ya no coincide, esta carga quedó obsoleta.
      if (get().mapPinsCity !== targetCity) return;
      set(stateUpdates);

      // Solo se guarda lo que llegó bien: un fetch fallido (null) no pisa
      // la caché guardada con vacíos.
      const cacheUpdates = {};
      if (Array.isArray(bn)) cacheUpdates.bn = bn;
      if (Array.isArray(ca)) cacheUpdates.ca = ca;
      if (Array.isArray(cc)) cacheUpdates.cc = cc;
      if (Array.isArray(ci)) cacheUpdates.ci = ci;
      if (Array.isArray(globalFavs)) cacheUpdates.globalFavs = globalFavs;
      if (Object.keys(cacheUpdates).length > 0) {
        try {
          updateCityCache(cacheKey, cacheUpdates);
        } catch (cacheErr) { console.error(cacheErr); }
      }

      if(get().mapPinsCity===targetCity)set({ dbReady: true, dbError: coreError, homeCoreCity:targetCity,homeCoreError:coreError });
    } catch (err) {
      console.warn("loadData error", err);
      set({ dbError: true, dbReady: true,homeCoreError:true });
    } finally {
      inFlightLoadPromise = null;
      inFlightCity = null;
    }
  })();
  return inFlightLoadPromise;
},

  loadMyBiz: async (userId) => {
    if (!userId) return [];
    try {
      const res = await sb.get("businesses", `?or=(owner_id.eq.${userId},user_id.eq.${userId})`);
      if (Array.isArray(res)) {
        const parsed = res.map(b => ({
          ...b,
          schedule: get().parseJSON(b.schedule),
          social_links: get().parseJSON(b.social_links),
          booking_config: get().parseJSON(b.booking_config),
          blocked_slots: get().parseJSON(b.blocked_slots),
          photos: get().parseJSON(b.photos)
        }));
        set({ myBizList: parsed });
        return parsed;
      }
    } catch (e) {
      console.warn(e);
    }
    return [];
  }
}));


