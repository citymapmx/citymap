import { create } from 'zustand';
import { Geolocation } from '@capacitor/geolocation';

export const useUIStore = create((set) => ({
  dark: false,
  setDark: (val) => set(s => ({ dark: typeof val === 'function' ? val(s.dark) : val })),
  
  activeCity: (() => { try { return localStorage.getItem("cg_city_slug") || ""; } catch { return ""; } })(),
  setActiveCity: (activeCity) => {
    if (activeCity) {
      localStorage.setItem("cg_city_slug", activeCity);
    }
    set({ activeCity });
  },
  
  showCityPicker: false,
  setShowCityPicker: (val) => set(s => ({ showCityPicker: typeof val === 'function' ? val(s.showCityPicker) : val })),
  
  toast: null,
  toast$: (msg) => {
    set({ toast: msg });
    setTimeout(() => set({ toast: null }), 3000);
  },
  
  view: 'inicio',
  setView: (val) => set(s => ({ view: typeof val === 'function' ? val(s.view) : val })),

  lastView: 'inicio',
  setLastView: (val) => set(s => ({ lastView: typeof val === 'function' ? val(s.lastView) : val })),

  activeCat: 'explorar',
  setActiveCat: (val) => set(s => ({ activeCat: typeof val === 'function' ? val(s.activeCat) : val })),

  selected: null,
  setSelected: (val) => set(s => ({ selected: typeof val === 'function' ? val(s.selected) : val })),

  mapPin: null,
  setMapPin: (val) => set(s => ({ mapPin: typeof val === 'function' ? val(s.mapPin) : val })),

  showAdmin: false,
  setShowAdmin: (val) => set(s => ({ showAdmin: typeof val === 'function' ? val(s.showAdmin) : val })),

  showPlans: false,
  setShowPlans: (val) => set(s => ({ showPlans: typeof val === 'function' ? val(s.showPlans) : val })),

  claimBiz: null,
  setClaimBiz: (val) => set(s => ({ claimBiz: typeof val === 'function' ? val(s.claimBiz) : val })),

  showAddBiz: false,
  setShowAddBiz: (val) => set(s => ({ showAddBiz: typeof val === 'function' ? val(s.showAddBiz) : val })),

  showGallery: false,
  setShowGallery: (val) => set(s => ({ showGallery: typeof val === 'function' ? val(s.showGallery) : val })),

  showMenuGallery: false,
  setShowMenuGallery: (val) => set(s => ({ showMenuGallery: typeof val === 'function' ? val(s.showMenuGallery) : val })),

  showSchedule: false,
  setShowSchedule: (val) => set(s => ({ showSchedule: typeof val === 'function' ? val(s.showSchedule) : val })),

  showLocPicker: false,
  setShowLocPicker: (val) => set(s => ({ showLocPicker: typeof val === 'function' ? val(s.showLocPicker) : val })),

  selectedEvent: null,
  setSelectedEvent: (val) => set(s => ({ selectedEvent: typeof val === 'function' ? val(s.selectedEvent) : val })),

  installPromptEvent: null,
  setInstallPromptEvent: (event) => set({ installPromptEvent: event }),

  search: "",
  setSearch: (val) => set(s => ({ search: typeof val === 'function' ? val(s.search) : val })),

  nearbyRadius: 1,
  setNearbyRadius: (val) => set(s => ({ nearbyRadius: typeof val === 'function' ? val(s.nearbyRadius) : val })),

  nearbyFilter: "all",
  setNearbyFilter: (val) => set(s => ({ nearbyFilter: typeof val === 'function' ? val(s.nearbyFilter) : val })),

  fade: true,
  setFade: (val) => set(s => ({ fade: typeof val === 'function' ? val(s.fade) : val })),

  navbarVisible: true,
  setNavbarVisible: (val) => set(s => ({ navbarVisible: typeof val === 'function' ? val(s.navbarVisible) : val })),

  showMoreTopRated: false,
  setShowMoreTopRated: (val) => set(s => ({ showMoreTopRated: typeof val === 'function' ? val(s.showMoreTopRated) : val })),

  showMoreTopFavs: false,
  setShowMoreTopFavs: (val) => set(s => ({ showMoreTopFavs: typeof val === 'function' ? val(s.showMoreTopFavs) : val })),

  showLocModal: false,
  setShowLocModal: (val) => set(s => ({ showLocModal: typeof val === 'function' ? val(s.showLocModal) : val })),

  userCoords: (() => {
    try {
      const saved = localStorage.getItem("cg_coords");
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return null;
  })(),
  setUserCoords: (coords) => set({ userCoords: coords }),
  
  requestLocation: async () => {
    try {
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      set({ userCoords: coords });
      localStorage.setItem("cg_coords", JSON.stringify(coords));
    } catch (e) {
      // Ignored on fail
    }
  },

  locating: false,
  setLocating: (val) => set(s => ({ locating: typeof val === 'function' ? val(s.locating) : val })),

  city: (() => localStorage.getItem("cg_city_name") || "Tepic, Nayarit")(),
  setCity: (val) => set(s => ({ city: typeof val === 'function' ? val(s.city) : val })),

  detectedTown: null,
  setDetectedTown: (val) => set(s => ({ detectedTown: typeof val === 'function' ? val(s.detectedTown) : val })),

  detectedState: null,
  setDetectedState: (val) => set(s => ({ detectedState: typeof val === 'function' ? val(s.detectedState) : val })),

  showCreateEvent: false,
  setShowCreateEvent: (val) => set(s => ({ showCreateEvent: typeof val === 'function' ? val(s.showCreateEvent) : val })),

  createEvForm: { title: "", description: "", date: "", time: "", end_date: "", end_time: "", price_type: "gratis", price: "", event_category: "", venue_name: "", venue_address: "", whatsapp: "", img_url: "" },
  setCreateEvForm: (val) => set(s => ({ createEvForm: typeof val === 'function' ? val(s.createEvForm) : val })),

  savedEventIds: (() => { try { return JSON.parse(localStorage.getItem("cg_saved_ev") || "[]"); } catch { return []; } })(),
  setSavedEventIds: (val) => {
    set(s => {
      const next = typeof val === 'function' ? val(s.savedEventIds) : val;
      localStorage.setItem("cg_saved_ev", JSON.stringify(next));
      return { savedEventIds: next };
    });
  },

  selectedEvent: null,
  setSelectedEvent: (val) => set(s => ({ selectedEvent: typeof val === 'function' ? val(s.selectedEvent) : val })),

  movingBiz: null,
  setMovingBiz: (val) => set(s => ({ movingBiz: typeof val === 'function' ? val(s.movingBiz) : val })),

  activeCollection: null,
  setActiveCollection: (val) => set(s => ({ activeCollection: typeof val === 'function' ? val(s.activeCollection) : val })),

  newColModal: false,
  setNewColModal: (val) => set(s => ({ newColModal: typeof val === 'function' ? val(s.newColModal) : val })),

  newColForm: { name: "", emoji: "🌟" },
  setNewColForm: (val) => set(s => ({ newColForm: typeof val === 'function' ? val(s.newColForm) : val }))
}));
