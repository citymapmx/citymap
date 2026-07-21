import { create } from 'zustand';
import { sb } from '../lib/supabase.js';

export const useAuthStore = create((set, get) => ({
  user: null, setUser: (val) => set(s => ({ user: typeof val === 'function' ? val(s.user) : val })),
  authChecked: false, setAuthChecked: (val) => set(s => ({ authChecked: typeof val === 'function' ? val(s.authChecked) : val })),
  profile: null, setProfile: (val) => set(s => ({ profile: typeof val === 'function' ? val(s.profile) : val })),
  showAuth: false, setShowAuth: (val) => set(s => ({ showAuth: typeof val === 'function' ? val(s.showAuth) : val })),
  authMode: "login", setAuthMode: (val) => set(s => ({ authMode: typeof val === 'function' ? val(s.authMode) : val })),
  authForm: { name: "", email: "", password: "", city: "" }, 
  setAuthForm: (updater) => set(state => ({ authForm: typeof updater === 'function' ? updater(state.authForm) : updater })),
  authLoading: false, setAuthLoading: (val) => set(s => ({ authLoading: typeof val === 'function' ? val(s.authLoading) : val })),
  authErr: "", setAuthErr: (val) => set(s => ({ authErr: typeof val === 'function' ? val(s.authErr) : val })),

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
      set({ user: u });
      
      if (authMode === "register") {
        await sb.patch("profiles", u.id, { city: authForm.city, name: authForm.name }).catch(() => {});
      }
      
      const profs = await sb.get("profiles", `?id=eq.${u.id}`).catch(() => []);
      set({ profile: Array.isArray(profs) && profs.length > 0 ? profs[0] : null });
      
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
      const fcm = localStorage.getItem('cg_push_token');
      const u = get().user;
      if (fcm && u?.id) {
        await sb.delWhere2('push_tokens', 'token', fcm, 'user_id', u.id).catch(() => null);
        localStorage.removeItem('cg_push_token');
      }
    } catch (e) { console.error("Error clearing push token:", e); }
    
    await sb.signOut(); 
    set({ user: null, profile: null }); 
  }
}));
