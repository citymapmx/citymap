import { create } from 'zustand';

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
  setInstallPromptEvent: (event) => set({ installPromptEvent: event })
}));

