import Icon from './ui/Icon.jsx';
import { useAuthStore } from '../store/useAuthStore.js';
import { useShallow } from 'zustand/react/shallow';
import { sb } from '../lib/supabase.js';

export default function AuthModal({ T, dark, cities, doAuth }) {
  const { showAuth, setShowAuth, authMode, setAuthMode, authForm, setAuthForm, authLoading, authErr, setAuthErr } = useAuthStore(useShallow(s => ({ showAuth: s.showAuth, setShowAuth: s.setShowAuth, authMode: s.authMode, setAuthMode: s.setAuthMode, authForm: s.authForm, setAuthForm: s.setAuthForm, authLoading: s.authLoading, authErr: s.authErr, setAuthErr: s.setAuthErr })));

  if (!showAuth) return null;

  return (
    <div className="ov" onClick={() => setShowAuth(false)}><div className="sh" onClick={e => e.stopPropagation()}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 28, textAlign: "center" }}>
        <h2 style={{ fontFamily: "var(--heading)", color: T.text, margin: "0 0 6px 0", lineHeight: 1.1, fontSize: 24, fontWeight: 900 }}>
          {authMode === "login" ? "¡Hola de nuevo!" : "Únete a CityMap"}
        </h2>
        <p style={{ color: T.sub, margin: 0, fontWeight: 500, fontSize: 14 }}>
          {authMode === "login" ? "Accede a tu cuenta de CityMap" : "Descubre los mejores lugares locales"}
        </p>
      </div>

      {/* ── Botón Google ── */}
      <button className="press" onClick={async () => {
        setAuthErr("");
        try { await sb.signInWithOAuth('google'); }
        catch (err) { setAuthErr("Error con Google: " + err.message); }
      }} style={{ width: "100%", padding: "14px", background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 14, fontWeight: 700, fontSize: 15, color: T.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
        <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.9 2.5 30.3 0 24 0 14.7 0 6.7 5.5 2.9 13.6l7.8 6C12.5 13.1 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17z"/><path fill="#FBBC05" d="M10.7 28.4A14.5 14.5 0 0 1 9.5 24c0-1.5.3-3 .7-4.4l-7.8-6A24 24 0 0 0 0 24c0 3.9.9 7.5 2.5 10.8l8.2-6.4z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.2 1.5-5 2.4-8.4 2.4-6.2 0-11.5-4.2-13.4-9.8l-8.2 6.4C6.7 42.5 14.7 48 24 48z"/></svg>
        Continuar con Google
      </button>

      {/* ── Divisor ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
        <div style={{ flex: 1, height: 1, background: T.border }} />
        <span style={{ fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 1, fontSize: 11 }}>O ingresa con email</span>
        <div style={{ flex: 1, height: 1, background: T.border }} />
      </div>

      {/* ── Error ── */}
      {authErr && <div style={{ padding: "12px 16px", background: "#FEF2F2", border: "1px solid #FEE2E2", borderRadius: 12, color: "#DC2626", marginBottom: 16, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}><Icon name="info" size={16} color="#DC2626" />{authErr}</div>}

      {/* ── Inputs ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {authMode === "register" && (
          <>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", pointerEvents: "none" }}>
                <Icon name="user" size={16} color={T.sub} />
              </span>
              <input className="inp" placeholder="Tu nombre y apellido" value={authForm.name} onChange={e => setAuthForm(f => ({ ...f, name: e.target.value }))} style={{ padding: "14px 16px 14px 42px", borderRadius: 12, border: `1.5px solid ${T.border}`, fontSize: 15, background: T.white, color: T.text, outline: "none", width: "100%" }} />
            </div>
            <select className="inp" style={{ padding: "14px 16px", borderRadius: 12, border: `1.5px solid ${T.border}`, fontSize: 15, background: T.white, color: T.text, outline: "none", appearance: "none" }} value={authForm.city} onChange={e => setAuthForm(f => ({ ...f, city: e.target.value }))}>
              <option value="" disabled>Selecciona tu ciudad principal...</option>
              {cities.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          </>
        )}
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", pointerEvents: "none" }}>
            <Icon name="mail" size={16} color={T.sub} />
          </span>
          <input className="inp" placeholder="Correo electrónico" type="email" value={authForm.email} onChange={e => setAuthForm(f => ({ ...f, email: e.target.value }))} style={{ padding: "14px 16px 14px 42px", borderRadius: 12, border: `1.5px solid ${T.border}`, fontSize: 15, background: T.white, color: T.text, outline: "none", width: "100%" }} />
        </div>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", pointerEvents: "none" }}>
            <Icon name="lock" size={16} color={T.sub} />
          </span>
          <input className="inp" placeholder="Contraseña" type="password" value={authForm.password} onChange={e => setAuthForm(f => ({ ...f, password: e.target.value }))} style={{ padding: "14px 16px 14px 42px", borderRadius: 12, border: `1.5px solid ${T.border}`, fontSize: 15, background: T.white, color: T.text, outline: "none", width: "100%" }} />
        </div>
      </div>

      {/* ── CTA ── */}
      <button className="press" style={{ marginTop: 20, padding: "16px", borderRadius: 14, background: dark ? "#f1f5f9" : "#0f172a", color: dark ? "#0f172a" : "#fff", fontWeight: 800, fontSize: 15, width: "100%", border: "none", cursor: "pointer", boxShadow: "0 8px 24px rgba(0,0,0,0.18)", opacity: authLoading ? 0.7 : 1 }} onClick={doAuth} disabled={authLoading}>
        {authLoading ? "Conectando…" : authMode === "login" ? "Ingresar a mi cuenta" : "Crear mi cuenta gratis"}
      </button>

      <p style={{ textAlign: "center", marginTop: 20, color: T.sub, fontSize: 14 }}>
        {authMode === "login" ? "¿Eres nuevo por aquí? " : "¿Ya eres parte de CityMap? "}
        <span style={{ color: T.green, fontWeight: 800, cursor: "pointer" }} onClick={() => { setAuthMode(m => m === "login" ? "register" : "login"); setAuthErr(""); }}>
          {authMode === "login" ? "Regístrate ahora" : "Inicia sesión"}
        </span>
      </p>
    </div></div>
  );
}
