import { create } from 'zustand';
import { sb } from '../lib/supabase.js';

export const useAuthStore = create((set, get) => ({
  user: null, setUser: (val) => set(s => {
    const user = typeof val === 'function' ? val(s.user) : val;
    return { user, profile: user?.id && user.id === s.user?.id ? s.profile : null };
  }),
  authChecked: false, setAuthChecked: (val) => set(s => ({ authChecked: typeof val === 'function' ? val(s.authChecked) : val })),
  profile: null, setProfile: (val) => set(s => ({ profile: typeof val === 'function' ? val(s.profile) : val })),
  showAuth: false, setShowAuth: (val) => set(s => ({ showAuth: typeof val === 'function' ? val(s.showAuth) : val })),
  authMode: "login", setAuthMode: (val) => set(s => ({ authMode: typeof val === 'function' ? val(s.authMode) : val })),
  authForm: { name: "", email: "", password: "", city: "" }, 
  setAuthForm: (updater) => set(state => ({ authForm: typeof updater === 'function' ? updater(state.authForm) : updater })),
  authLoading: false, setAuthLoading: (val) => set(s => ({ authLoading: typeof val === 'function' ? val(s.authLoading) : val })),
  authErr: "", setAuthErr: (val) => set(s => ({ authErr: typeof val === 'function' ? val(s.authErr) : val })),

  loadProfile: async (userId) => {
    if (!userId || get().user?.id !== userId) return null;
    try {
      const rows = await sb.get("profiles", `?id=eq.${userId}&limit=1`);
      if (get().user?.id !== userId) return null;
      if (!Array.isArray(rows)) throw new Error("Invalid profile response");
      const profile = rows[0] || null;
      set({ profile });
      return profile;
    } catch (error) {
      console.warn("Failed to load profile", error);
      // A temporary network error must not discard this user's existing profile.
      return get().user?.id === userId ? get().profile : null;
    }
  },

  handleAuth: async () => {
    const { authMode, authForm } = get();
    set({ authLoading: true, authErr: "" });
    try {
      if (authMode === "register" && (!authForm.name.trim() || !authForm.city)) {
        throw new Error("Por favor ingresa tu nombre y elige tu ciudad");
      }
      let s;
      if (authMode === "login") s = await sb.signIn(authForm.email, authForm.password);
      else s = await sb.signUp(authForm.email, authForm.password, authForm.name);
      
      const u = s.user || s?.session?.user || await sb.getUser();
      if (!u?.id) throw new Error("No se pudo obtener el usuario");
      get().setUser(u);
      
      if (authMode === "register") {
        await sb.patch("profiles", u.id, { city: authForm.city, name: authForm.name }).catch(() => {});
      }
      
      await get().loadProfile(u.id);
      
      return u.id;
    } catch (e) {
      set({ authErr: e.message });
      return null;
    } finally {
      set({ authLoading: false });
    }
  },

  handleGoogleIdToken: async (idToken) => {
    set({ authLoading: true, authErr: "" });
    try {
      const s = await sb.signInWithIdToken({ provider: 'google', token: idToken });
      const u = s.user || s?.session?.user || await sb.getUser();
      if (!u?.id) throw new Error("No se pudo obtener el usuario");
      get().setUser(u);

      await get().loadProfile(u.id);

      return u.id;
    } catch (e) {
      set({ authErr: e.message });
      return null;
    } finally {
      set({ authLoading: false });
    }
  },

  handleSignOut: async () => { 
    try {
      const fcm = localStorage.getItem('cg_push_token') || localStorage.getItem('cg_web_push_token');
      const u = get().user;
      if (fcm && u?.id) {
        await fetch('https://citymap.mx/api/unregister-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sb._token || ''}` },
          body: JSON.stringify({ token: fcm })
        }).catch(() => null);
        localStorage.removeItem('cg_push_token');
        localStorage.removeItem('cg_web_push_token');
      }
    } catch (e) { console.error("Error clearing push token:", e); }
    
    await sb.signOut(); 
    set({ user: null, profile: null }); 
  }
}));
