import { create } from 'zustand';
import { sb } from '../lib/supabase.js';

export const METRO_ZONES = {};

const updateMetroZones = (citiesList) => {
  if (!citiesList || !Array.isArray(citiesList)) return;
  Object.keys(METRO_ZONES).forEach(k => delete METRO_ZONES[k]);
  citiesList.forEach(c => {
    let metro = c.metro_zone;
    if (c.state && c.state.includes(";")) {
      metro = c.state.split(";")[1];
    }
    
    if (metro) {
      if (!METRO_ZONES[c.slug]) METRO_ZONES[c.slug] = [c.slug, metro];
      else if (!METRO_ZONES[c.slug].includes(metro)) METRO_ZONES[c.slug].push(metro);
      
      if (!METRO_ZONES[metro]) METRO_ZONES[metro] = [metro];
      if (!METRO_ZONES[metro].includes(c.slug)) METRO_ZONES[metro].push(c.slug);
    }
  });
};

const getCityFilterEq = (city) => {
  const zone = METRO_ZONES[city];
  return zone ? `city_slug=in.(${zone.join(',')})` : `city_slug=eq.${city}`;
};

const getCityFilterOr = (city) => {
  const zone = METRO_ZONES[city];
  return zone ? zone.map(z => `city_slug.ilike.*${z}*`).join(',') : `city_slug.ilike.*${city}*`;
};

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
  wallet: (() => { try { return JSON.parse(localStorage.getItem("citymap_wallet") || "[]"); } catch { return []; } })(),
  setWallet: (val) => set(s => ({ wallet: typeof val === 'function' ? val(s.wallet) : val })),
  claimedCoupons: (() => { try { return JSON.parse(localStorage.getItem("citymap_claims") || "{}"); } catch { return {}; } })(),
  setClaimedCoupons: (val) => set(s => ({ claimedCoupons: typeof val === 'function' ? val(s.claimedCoupons) : val })),
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

  loadMapPins: async (targetCity) => {
    try {
      if (!targetCity) return;
      const cacheKey = `cg_mapPins_${targetCity}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsedCache = JSON.parse(cached);
          set({ mapPins: parsedCache });
        } catch (e) { }
      }

      const selectCols = "id,name,lat,lng,category,emoji,logo_url,photos,rating,review_count,schedule,plan,city_slug,status,address,created_at,slug,is_place,type,tagline,whatsapp,phone,facebook,instagram,social_links,hide_location,tags,badge";
      
      const processBatch = (batch) => Array.isArray(batch) ? batch.map(b => ({
        ...b,
        schedule: get().parseJSON(b.schedule),
        social_links: get().parseJSON(b.social_links),
        photos: get().parseJSON(b.photos)
      })) : [];

      // Fast-first loading: Carga inicial de 30 lugares para TTI ultra rápido
      let firstBatch = await sb.get("businesses", `?select=${selectCols}&status=eq.approved&${getCityFilterEq(targetCity)}&order=plan.desc,rating.desc.nullslast,id.desc&limit=30`);
      const initialPins = processBatch(firstBatch);
      set({ mapPins: initialPins });
      
      // Background loading: Trae el resto para no romper la búsqueda y el mapa local
      sb.get("businesses", `?select=${selectCols}&status=eq.approved&${getCityFilterEq(targetCity)}&order=plan.desc,rating.desc.nullslast,id.desc&limit=1000&offset=30`)
        .then(restBatch => {
          if (restBatch && restBatch.length > 0) {
            const restPins = processBatch(restBatch);
            // Deduplicate to avoid any pagination overlap artifacts
            const allPinsMap = new Map();
            initialPins.forEach(p => allPinsMap.set(p.id, p));
            restPins.forEach(p => allPinsMap.set(p.id, p));
            const uniquePins = Array.from(allPinsMap.values());
            
            set({ mapPins: uniquePins });
            localStorage.setItem(cacheKey, JSON.stringify(uniquePins));
          } else {
            localStorage.setItem(cacheKey, JSON.stringify(initialPins));
          }
        })
        .catch(e => console.warn("Error background fetch pins", e));

    } catch (e) {
      console.warn("Error fetching map pins", e);
    }
  },

  loadMapPinsByBounds: async (targetCity, bounds) => {
    try {
      if (!bounds || !bounds.minLat || !bounds.maxLat || !bounds.minLng || !bounds.maxLng) return;
      const selectCols = "id,name,lat,lng,category,emoji,logo_url,photos,rating,review_count,schedule,plan,city_slug,status,address,created_at,slug,is_place,type,tagline,whatsapp,phone,facebook,instagram,social_links,hide_location,tags,badge";
      
      const processBatch = (batch) => Array.isArray(batch) ? batch.map(b => ({
        ...b,
        schedule: get().parseJSON(b.schedule),
        social_links: get().parseJSON(b.social_links),
        photos: get().parseJSON(b.photos)
      })) : [];

      // Fetch businesses within bounds using Supabase filters
      const page = await sb.get("businesses", `?select=${selectCols}&status=eq.approved&${getCityFilterEq(targetCity)}&lat=gte.${bounds.minLat}&lat=lte.${bounds.maxLat}&lng=gte.${bounds.minLng}&lng=lte.${bounds.maxLng}&limit=200`);
      if (!Array.isArray(page) || page.length === 0) return;
      
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

  loadData: async (cityOverride) => {
    try {
      let currentCities = get().cities;
      if (!currentCities || currentCities.length === 0) {
        const pCities = await sb.get("cities", "?order=name.asc").catch(() => []);
        if (pCities && Array.isArray(pCities)) {
          set({ cities: pCities });
          updateMetroZones(pCities);
          currentCities = pCities;
        }
      }

      const targetCity = cityOverride || localStorage.getItem("cg_city_slug") || (currentCities?.[0]?.slug) || "";
      if (!targetCity) {
         set({ dbReady: true });
         return; // Avoid crashing if no cities are loaded yet
      }
      
      const cacheKey = `cg_data_${targetCity}_v4`;

      // Reset city-specific arrays immediately so we never render stale data from another city
      if (cityOverride) {
        set({ events: [], experiences: [], banners: [], promos: [], coupons: [], mapPins: [] });
      }
      
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const c = JSON.parse(cached);
          const now = new Date();
          const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
          
          if (c.e) {
            const validCachedEvents = c.e.filter(ev => ev && new Date(ev.date) >= new Date(todayStr));
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
              return cityLinks.some(l => l.category_slug === cat.slug && l.city_slug === targetCity);
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
          set({ dbReady: true });
        } catch (e) { }
      }

      get().loadMapPins(targetCity);
      
      const pEvents = sb.get("events", `?status=eq.approved&or=(city_slug.eq.all,${getCityFilterOr(targetCity)})`).catch(() => []);
      const pExperiences = sb.get("experiences", `?status=eq.approved&or=(city_slug.eq.all,${getCityFilterOr(targetCity)})`).catch(() => []);
      const pPromos = sb.get("promos").catch(() => []);
      const pRaffles = sb.get("raffles").catch(() => []);
      const pCoupons = sb.get("coupons").catch(() => []);
      
      const bannerCities = ["all", ...(METRO_ZONES[targetCity] || [targetCity])];
      const pBanners = sb.get("banners", `?active=eq.true&city_slug=in.(${bannerCities.join(',')})`).catch(() => []);
      const pCats = sb.get("categories", "?active=eq.true&order=sort_order.asc").catch(() => []);
      const pCityCats = sb.get("city_categories").catch(() => []);
      const pCities = currentCities && currentCities.length > 0 ? Promise.resolve(currentCities) : sb.get("cities", "?order=name.asc").catch(() => []);
      const pFavs = sb.rpc("get_global_favs").catch(() => sb.get("favorites")).catch(() => []);

      const [e, ex, r, p, c, bn, ca, cc, ci, globalFavs] = await Promise.all([pEvents, pExperiences, pRaffles, pPromos, pCoupons, pBanners, pCats, pCityCats, pCities, pFavs]);
      
      if (ci && Array.isArray(ci)) {
        updateMetroZones(ci);
      }

      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      
      const validEvents = Array.isArray(e) ? e.filter(ev => {
        if (!ev.date) return true;
        if (ev.end_date) return ev.end_date >= todayStr;
        return ev.date >= todayStr;
      }).map(ev => {
        let booking_config = null;
        let website = ev.website;
        if (website && website.startsWith('{')) {
          try {
            booking_config = JSON.parse(website);
            website = null;
          } catch(err) {}
        } else if (website) {
          booking_config = { enabled: true, type: "external", externalLinks: [{ platform: "otro", url: website, label: "Sitio Web / Boletos" }] };
        }
        return { ...ev, booking_config, website };
      }) : [];

      const stateUpdates = {};
      stateUpdates.events = validEvents;
      stateUpdates.experiences = Array.isArray(ex) ? ex : [];
      stateUpdates.raffles = Array.isArray(r) ? r : [];
      stateUpdates.promos = Array.isArray(p) ? p : [];
      stateUpdates.coupons = Array.isArray(c) ? c : [];
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
        localStorage.setItem(cacheKey, JSON.stringify({ 
          e: Array.isArray(e) ? validEvents : [],
          ex: Array.isArray(ex) ? ex : [],
          p: Array.isArray(p) ? p : [], 
          c: Array.isArray(c) ? c : [], 
          bn: Array.isArray(bn) ? bn : [], 
          ca: Array.isArray(ca) ? ca : [],
          cc: Array.isArray(cc) ? cc : [],
          ci: Array.isArray(ci) ? ci : [],
          globalFavs: Array.isArray(globalFavs) ? globalFavs : []
        }));
      } catch (e) { }

      set({ dbReady: true, dbError: false });
    } catch (err) {
      console.warn("loadData error", err);
      set({ dbError: true, dbReady: true });
    }
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

