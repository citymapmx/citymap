import { create } from 'zustand';
import { sb } from '../lib/supabase.js';

export const useDataStore = create((set, get) => ({
  events: [], setEvents: (val) => set(s => ({ events: typeof val === 'function' ? val(s.events) : val })),
  raffles: [], setRaffles: (val) => set(s => ({ raffles: typeof val === 'function' ? val(s.raffles) : val })),
  promos: [], setPromos: (val) => set(s => ({ promos: typeof val === 'function' ? val(s.promos) : val })),
  coupons: [], setCoupons: (val) => set(s => ({ coupons: typeof val === 'function' ? val(s.coupons) : val })),
  banners: [], setBanners: (val) => set(s => ({ banners: typeof val === 'function' ? val(s.banners) : val })),
  reviews: [], setReviews: (val) => set(s => ({ reviews: typeof val === 'function' ? val(s.reviews) : val })),
  cats: [], setCats: (val) => set(s => ({ cats: typeof val === 'function' ? val(s.cats) : val })),
  cities: [], setCities: (val) => set(s => ({ cities: typeof val === 'function' ? val(s.cities) : val })),
  wallet: (() => { try { return JSON.parse(localStorage.getItem("citymap_wallet") || "[]"); } catch { return []; } })(),
  setWallet: (val) => set(s => ({ wallet: typeof val === 'function' ? val(s.wallet) : val })),
  favIds: [], setFavIds: (val) => set(s => ({ favIds: typeof val === 'function' ? val(s.favIds) : val })),
  collections: (() => {
    try {
      const saved = localStorage.getItem("citymap_collections");
      return saved ? JSON.parse(saved) : [
        { id: "col_visitar", name: "Por visitar", emoji: "📌", items: [] },
        { id: "col_cita", name: "Para cita", emoji: "👩‍❤️‍👨", items: [] },
        { id: "col_cafe", name: "Cafés Top", emoji: "☕", items: [] }
      ];
    } catch {
      return [
        { id: "col_visitar", name: "Por visitar", emoji: "📌", items: [] },
        { id: "col_cita", name: "Para cita", emoji: "👩‍❤️‍👨", items: [] },
        { id: "col_cafe", name: "Cafés Top", emoji: "☕", items: [] }
      ];
    }
  })(),
  setCollections: (val) => set(s => ({ collections: typeof val === 'function' ? val(s.collections) : val })),

  claimedCoupons: (() => { try { return JSON.parse(localStorage.getItem("citymap_claims") || "{}"); } catch { return {}; } })(),
  setClaimedCoupons: (val) => set(s => ({ claimedCoupons: typeof val === 'function' ? val(s.claimedCoupons) : val })),
  dbReady: false, setDbReady: (val) => set(s => ({ dbReady: typeof val === 'function' ? val(s.dbReady) : val })),
  dbError: false, setDbError: (val) => set(s => ({ dbError: typeof val === 'function' ? val(s.dbError) : val })),
  mapPins: [], setMapPins: (val) => set(s => ({ mapPins: typeof val === 'function' ? val(s.mapPins) : val })),
  myBizList: [], setMyBizList: (val) => set(s => ({ myBizList: typeof val === 'function' ? val(s.myBizList) : val })),
  globalFavCounts: {}, setGlobalFavCounts: (val) => set(s => ({ globalFavCounts: typeof val === 'function' ? val(s.globalFavCounts) : val })),
  ownerRes: [], setOwnerRes: (val) => set(s => ({ ownerRes: typeof val === 'function' ? val(s.ownerRes) : val })),
  ownerView: null, setOwnerView: (val) => set(s => ({ ownerView: typeof val === 'function' ? val(s.ownerView) : val })),
  storeAdminBiz: null, setStoreAdminBiz: (val) => set(s => ({ storeAdminBiz: typeof val === 'function' ? val(s.storeAdminBiz) : val })),
  adminStoreBiz: null, setAdminStoreBiz: (val) => set(s => ({ adminStoreBiz: typeof val === 'function' ? val(s.adminStoreBiz) : val })),
  ownerStats: { views: 0, whatsapp: 0, phone: 0 }, setOwnerStats: (val) => set(s => ({ ownerStats: typeof val === 'function' ? val(s.ownerStats) : val })),

  parseJSON: (val) => {
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch(e) { return {}; }
    }
    return val || {};
  },

  loadMapPins: async (targetCity = "tepic") => {
    try {
      const cacheKey = `cg_mapPins_${targetCity}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsedCache = JSON.parse(cached);
          set({ mapPins: parsedCache });
        } catch (e) { }
      }

      const selectCols = "id,name,lat,lng,category,emoji,logo_url,photos,rating,review_count,schedule,plan,city_slug,status,address,created_at,slug,is_place,type,tagline,whatsapp,phone,facebook,instagram,social_links,hide_location";
      
      const processBatch = (batch) => Array.isArray(batch) ? batch.map(b => ({
        ...b,
        schedule: get().parseJSON(b.schedule),
        social_links: get().parseJSON(b.social_links),
        photos: get().parseJSON(b.photos)
      })) : [];

      // Carga rápida inicial de 50 lugares más relevantes
      let firstBatch = await sb.get("businesses", `?select=${selectCols}&status=eq.approved&city_slug=eq.${targetCity}&limit=50&order=plan.desc,rating.desc.nullslast`);
      const initialPins = processBatch(firstBatch);
      set({ mapPins: initialPins });

      // Carga diferida en segundo plano
      setTimeout(async () => {
        try {
          let allPins = [...initialPins];
          let offset = 50;
          const limit = 400; // Pedimos de 400 en 400 para no ahogar la red
          while(true) {
            let page = await sb.get("businesses", `?select=${selectCols}&status=eq.approved&city_slug=eq.${targetCity}&limit=${limit}&offset=${offset}&order=plan.desc,rating.desc.nullslast`);
            if (!Array.isArray(page) || page.length === 0) break;
            
            const processedPage = processBatch(page);
            allPins = [...allPins, ...processedPage];
            set({ mapPins: allPins });
            
            if (page.length < limit) break;
            offset += limit;
          }
          localStorage.setItem(cacheKey, JSON.stringify(allPins));
        } catch(e) {
          console.warn("Error en background load", e);
        }
      }, 1000);

    } catch (e) {
      console.warn("Error fetching map pins", e);
    }
  },

  loadData: async (cityOverride) => {
    try {
      const targetCity = cityOverride || localStorage.getItem("cg_city_slug") || "tepic";
      const cacheKey = `cg_data_${targetCity}_v3`;
      
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const c = JSON.parse(cached);
          if (c.e) set({ events: c.e });
          if (c.p) set({ promos: c.p });
          if (c.c) set({ coupons: c.c });
          if (c.bn) set({ banners: c.bn });
          if (c.ca) set({ cats: c.ca.map(cat => ({ id: cat.slug, label: cat.name?.trim(), icon: cat.icon || "pin", slug: cat.slug, emoji: cat.emoji, img_url: cat.img_url || null, subtitle: cat.subtitle || null })) });
          if (c.ci) set({ cities: c.ci });
          if (c.globalFavs) {
            const counts = {};
            c.globalFavs.forEach(f => { counts[f.biz_id] = parseInt(f.fav_count, 10); });
            set({ globalFavCounts: counts });
          }
          set({ dbReady: true });
        } catch (e) { }
      }

      get().loadMapPins(targetCity);
      
      const pEvents = sb.get("events", `?status=eq.approved&city_slug=in.(${targetCity},all)`).catch(() => []);
      const pPromos = sb.get("promos").catch(() => []);
      const pRaffles = sb.get("raffles").catch(() => []);
      const pCoupons = sb.get("coupons").catch(() => []);
      const pBanners = sb.get("banners", `?active=eq.true&city_slug=in.(${targetCity},all)`).catch(() => []);
      const pCats = sb.get("categories", "?active=eq.true&order=sort_order.asc").catch(() => []);
      const pCities = sb.get("cities", "?order=name.asc").catch(() => []);
      const pFavs = sb.rpc("get_global_favs").catch(() => sb.get("favorites")).catch(() => []);

      const [e, r, p, c, bn, ca, ci, globalFavs] = await Promise.all([pEvents, pRaffles, pPromos, pCoupons, pBanners, pCats, pCities, pFavs]);

      const stateUpdates = {};
      stateUpdates.events = Array.isArray(e) ? e : [];
      stateUpdates.raffles = Array.isArray(r) ? r : [];
      stateUpdates.promos = Array.isArray(p) ? p : [];
      stateUpdates.coupons = Array.isArray(c) ? c : [];
      stateUpdates.banners = Array.isArray(bn) ? bn : [];
      if (ca) {
        stateUpdates.cats = ca.map(c => ({ id: c.slug, label: c.name.trim(), icon: c.icon || "pin", slug: c.slug, emoji: c.emoji, img_url: c.img_url || null, subtitle: c.subtitle || null }));
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

      set(stateUpdates);

      localStorage.setItem(cacheKey, JSON.stringify({ 
        e: Array.isArray(e) ? e : null, 
        p: Array.isArray(p) ? p : null, 
        c: Array.isArray(c) ? c : null, 
        bn: Array.isArray(bn) ? bn : null, 
        ca: Array.isArray(ca) ? ca : null, 
        ci: Array.isArray(ci) ? ci : null, 
        globalFavs: Array.isArray(globalFavs) ? globalFavs : null 
      }));

      set({ dbReady: true, dbError: false });
    } catch (err) {
      console.warn("loadData error", err);
      set({ dbError: true, dbReady: true });
    }
  },

  loadMyBiz: async (userId) => {
    if (!userId) return [];
    try {
      const res = await sb.get("businesses", `?owner_id=eq.${userId}`);
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
