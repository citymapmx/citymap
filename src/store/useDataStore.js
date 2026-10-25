import { searchCandidatePattern } from '../lib/searchPattern.js';
import { create } from 'zustand';
import { sb } from '../lib/supabase.js';

import { METRO_ZONES, updateMetroZones } from '../lib/utils.js';

const getCityFilterEq = (city) => {
  const zone = METRO_ZONES[city];
  return zone ? `city_slug=in.(${zone.join(',')})` : `city_slug=eq.${city}`;
};

const getCityFilterOr = (city) => {
  const zone = METRO_ZONES[city];
  return zone ? zone.map(z => `city_slug.ilike.*${z}*`).join(',') : `city_slug.ilike.*${city}*`;
};

let inFlightLoadPromise = null;
let inFlightCity = null;
let citiesRefreshPromise = null;

const updateCityCache = (key, updates) => {
  try {
    const existing = JSON.parse(localStorage.getItem(key) || "{}");
    localStorage.setItem(key, JSON.stringify({ ...existing, ...updates }));
  } catch (err) {
    console.warn("City cache write error", err);
  }
};

let businessLoadId = 0;
const highlightRequests = new Map();

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
  refreshCities: async () => {
    if(citiesRefreshPromise) return citiesRefreshPromise;
    citiesRefreshPromise=(async()=>{
      try {
        const rows=await sb.get('cities','?order=name.asc');
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
  dbReady: false, setDbReady: (val) => set(s => ({ dbReady: typeof val === 'function' ? val(s.dbReady) : val })),
  dbError: false, setDbError: (val) => set(s => ({ dbError: typeof val === 'function' ? val(s.dbError) : val })),
  mapPins: [], setMapPins: (val) => set(s => ({ mapPins: typeof val === 'function' ? val(s.mapPins) : val })),
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

  loadMapPins: async (targetCity) => {
    if (!targetCity) return;
    const requestId = ++businessLoadId;
    const cacheKey = `cg_mapPins_${targetCity}`;
    set({ mapPinsCity: targetCity, initialBizCount: null, mapPins: [], homeHighlights: [], highlightsCity: null });
    try {
      // Old caches may contain the entire city. Restore only the first page.
      const cached = typeof localStorage !== 'undefined' ? localStorage.getItem(cacheKey) : null;
      if (cached) {
        try {
          const rows = JSON.parse(cached);
          if (Array.isArray(rows)) set({ mapPins: rows.slice(0, 20) });
        } catch { /* Invalid caches are replaced by the network response. */ }
      }
      let selectCols = "id,name,lat,lng,category,emoji,logo_url,photos,rating,review_count,schedule,plan,city_slug,status,address,created_at,slug,is_place,type,tagline,whatsapp,phone,facebook,instagram,social_links,hide_location,tags,badge,mercado_libre_url,mercado_libre_nickname,banner_url,is_catalog";
      
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
      try {
        if (typeof localStorage !== 'undefined') localStorage.setItem(cacheKey, JSON.stringify(initialPins));
      } catch { /* Storage may be full or disabled. */ }
      // Further rows are requested only by pagination or the map viewport.
    } catch (e) {
      console.warn("Error fetching map pins", e);
    }
  },

  fetchMoreBiz: async ({ targetCity, query, category, offset = 0, limit = 20, onBatch }) => {
    try {
      if (!targetCity) return null;
      const selectCols = "id,name,lat,lng,category,emoji,logo_url,photos,rating,review_count,schedule,plan,city_slug,status,address,created_at,slug,is_place,type,tagline,whatsapp,phone,facebook,instagram,social_links,hide_location,tags,badge,mercado_libre_url,mercado_libre_nickname,banner_url,description,is_catalog";
      
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
        const columns = "id,name,lat,lng,category,emoji,logo_url,photos,rating,review_count,plan,city_slug,status,slug,badge,is_catalog";
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

  loadMapPinsByBounds: async (targetCity, bounds) => {
    try {
      if (!bounds || !bounds.minLat || !bounds.maxLat || !bounds.minLng || !bounds.maxLng) return;
      const selectCols = "id,name,lat,lng,category,emoji,logo_url,photos,rating,review_count,schedule,plan,city_slug,status,address,created_at,slug,is_place,type,tagline,whatsapp,phone,facebook,instagram,social_links,hide_location,tags,badge,banner_url,is_catalog";
      
      const processBatch = (batch) => Array.isArray(batch) ? batch.map(b => ({
        ...b,
        schedule: get().parseJSON(b.schedule),
        social_links: get().parseJSON(b.social_links),
        photos: get().parseJSON(b.photos)
      })) : [];

      // Fetch businesses within bounds using Supabase filters
      const page = await sb.get("businesses", `?select=${selectCols}&status=eq.approved&plan=neq.menu&${getCityFilterEq(targetCity)}&lat=gte.${bounds.minLat}&lat=lte.${bounds.maxLat}&lng=gte.${bounds.minLng}&lng=lte.${bounds.maxLng}&limit=200`);
      if (get().mapPinsCity !== targetCity || !Array.isArray(page) || page.length === 0) return;
      
      const processedPage = processBatch(page);
      
      // Merge with existing pins avoiding duplicates
      const currentPins = get().mapPins;
      const existingIds = new Set(currentPins.map(p => p.id));
      const newPins = processedPage.filter(p => !existingIds.has(p.id));
      
      if (newPins.length > 0) {
        set({ mapPins: [...currentPins, ...newPins] });
      }
    } catch (e) {
      console.warn("Error fetching map pins by bounds", e);
    }
  },

  loadData: (cityOverride) => {
    const rawTarget = cityOverride || localStorage.getItem("cg_city_slug") || (get().cities?.[0]?.slug) || "";
    if (inFlightLoadPromise && inFlightCity === rawTarget && rawTarget !== "") {
      return inFlightLoadPromise;
    }
    inFlightCity = rawTarget;
    set({homeCoreCity:null,homeCoreError:false,homeSecondaryCity:null,homeSecondaryError:false});

    // Instant synchronous cache restoration before any network call
    if (rawTarget) {
      const cacheKey = `cg_data_${rawTarget}_v4`;
      const currentActiveCity = localStorage.getItem("cg_city_slug");

      if (cityOverride && currentActiveCity && cityOverride !== currentActiveCity) {
        set({ dbReady: false, events: [], experiences: [], banners: [], promos: [], coupons: [], mapPins: [] });
      }

      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const c = JSON.parse(cached);
          const now = new Date();
          const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
          
          if (Array.isArray(c.e)) {
            const validCachedEvents = c.e.filter(ev => {
              if (!ev || !ev.date) return false;
              if (ev.end_date) return ev.end_date >= todayStr;
              return ev.date >= todayStr;
            });
            set({ events: validCachedEvents });
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
            set({ dbReady: true });
          }
        } catch (e) { console.error(e); }
      }
    }

    inFlightLoadPromise = (async () => {
      try {
        const currentCities = await get().refreshCities();

        const targetCity = cityOverride || localStorage.getItem("cg_city_slug") || (currentCities?.[0]?.slug) || "";
        if (!targetCity) {
           set({ dbReady: true });
           return; // Avoid crashing if no cities are loaded yet
        }
        
        const cacheKey = `cg_data_${targetCity}_v4`;
        const pPins = get().loadMapPins(targetCity);
      
      
      // Secondary fetches (Non-blocking)
      const fetchSecondary = async () => {
        try {
          const [e, ex, r, p, c] = await Promise.all([
            sb.get("events", `?status=eq.approved&or=(city_slug.eq.all,${getCityFilterOr(targetCity)})`).catch(() => null),
            sb.get("experiences", `?status=eq.approved&or=(city_slug.eq.all,${getCityFilterOr(targetCity)})`).catch(() => null),
            sb.get("raffles", `?select=*,businesses!inner(city_slug)&businesses.city_slug=eq.${targetCity}`).catch(() => null),
            sb.get("promos", `?select=*,businesses!inner(city_slug)&businesses.city_slug=eq.${targetCity}`).catch(() => null),
            sb.get("coupons", `?select=*,businesses!inner(city_slug)&businesses.city_slug=eq.${targetCity}`).catch(() => null)
          ]);
          
          const now = new Date();
          const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
          
          const updates = {};
          const cacheUpdates = {};

          if (Array.isArray(e)) {
            const validEvents = e.filter(ev => {
              if (!ev || !ev.date) return false;
              if (ev.end_date) return ev.end_date >= todayStr;
              return ev.date >= todayStr;
            }).map(ev => {
              let booking_config = null;
              let website = ev.website;
              if (website && website.startsWith('{')) {
                try {
                  booking_config = JSON.parse(website);
                  website = null;
                } catch (err) { console.error(err); }
              } else if (website) {
                booking_config = { enabled: true, type: "external", externalLinks: [{ platform: "otro", url: website, label: "Sitio Web / Boletos" }] };
              }
              return { ...ev, booking_config, website };
            });
            updates.events = validEvents;
            cacheUpdates.e = validEvents;
          }

          if (Array.isArray(ex)) {
            updates.experiences = ex;
            cacheUpdates.ex = ex;
          }
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
      const pBanners = sb.get("banners", `?active=eq.true&city_slug=in.(${bannerCities.join(',')})`).catch(() => {coreError=true;return [];});
      const pCats = sb.get("categories", "?active=eq.true&order=sort_order.asc").catch(() => {coreError=true;return [];});
      const pCityCats = sb.get("city_categories").catch(() => {coreError=true;return [];});
      const pCities = currentCities && currentCities.length > 0 ? Promise.resolve(currentCities) : sb.get("cities", "?order=name.asc").catch(() => []);
      const pFavs = sb.rpc("get_global_favs").catch(() => sb.get("favorites")).catch(() => []);

      const [bn, ca, cc, ci, globalFavs] = await Promise.all([pBanners, pCats, pCityCats, pCities, pFavs, pPins]);
      
      if (ci && Array.isArray(ci)) {
        updateMetroZones(ci);
      }

      const stateUpdates = {};

      stateUpdates.banners = Array.isArray(bn) ? bn.filter(Boolean) : [];
      if (cc) {
        stateUpdates.cityCats = cc;
      }
      if (ca) {
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

      set(stateUpdates);

      try {
        updateCityCache(cacheKey, {
          bn: Array.isArray(bn) ? bn : [],
          ca: Array.isArray(ca) ? ca : [],
          cc: Array.isArray(cc) ? cc : [],
          ci: Array.isArray(ci) ? ci : [],
          globalFavs: Array.isArray(globalFavs) ? globalFavs : []
        });
      } catch (cacheErr) { console.error(cacheErr); }

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

