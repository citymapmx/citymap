import { useState, useEffect, Suspense, lazy } from "react";
import { sb } from "./lib/supabase.js";

const AdminPanel = lazy(() => import("./components/AdminPanel.jsx"));
const StoreAdminPanel = lazy(() => import("./components/store/StoreAdminPanel.jsx"));

const T = {
  bg: "#F8FAFC",
  white: "#FFFFFF",
  text: "#0F172A",
  sub: "#64748B",
  border: "#E2E8F0",
  green: "#10B981",
  greenL: "#D1FAE5",
  red: "#EF4444",
  shadow: "0 2px 12px rgba(0,0,0,0.06)",
};

const LoaderFallback = () => (
  <div style={{ position: "fixed", inset: 0, background: "#0F172A", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <div style={{ width: 32, height: 32, border: "3px solid rgba(255,255,255,0.1)", borderTop: "3px solid #10B981", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
  </div>
);

function toast$(msg) {
  const el = document.createElement("div");
  el.textContent = msg;
  Object.assign(el.style, {
    position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)",
    background: "#0F172A", color: "#fff", padding: "10px 20px", borderRadius: "12px",
    fontSize: "14px", fontWeight: "700", zIndex: "999999", whiteSpace: "nowrap",
    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
  });
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

export default function AdminApp() {
  const [step, setStep] = useState("login"); // "login" | "loading" | "panel" | "denied"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPw, setShowPw] = useState(false);

  // Check if already logged in via stored token
  useEffect(() => {
    const token = localStorage.getItem("cg_t");
    if (!token) return;
    sb._token = token;
    setStep("loading");
    sb.getUser()
      .then(async (user) => {
        if (!user?.id) { sb._token = null; localStorage.removeItem("cg_t"); setStep("login"); return; }
        const rows = await sb.get("profiles", `?select=role&id=eq.${user.id}&limit=1`);
        const role = rows?.[0]?.role;
        if (role === "admin") setStep("panel");
        else { sb._token = null; localStorage.removeItem("cg_t"); setStep("login"); }
      })
      .catch(() => { sb._token = null; localStorage.removeItem("cg_t"); setStep("login"); });
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErr("");
    if (!email.trim() || !password) { setErr("Ingresa email y contraseña"); return; }
    setSubmitting(true);
    try {
      await sb.signIn(email.trim(), password);
      setStep("loading");
      const user = await sb.getUser();
      if (!user?.id) throw new Error("No se pudo obtener el usuario");
      const rows = await sb.get("profiles", `?select=role&id=eq.${user.id}&limit=1`);
      const role = rows?.[0]?.role;
      if (role === "admin") {
        setStep("panel");
      } else {
        await sb.signOut();
        setStep("denied");
      }
    } catch (ex) {
      setErr(ex.message || "Error al iniciar sesión");
      setStep("login");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await sb.signOut();
    setStep("login");
    setEmail("");
    setPassword("");
    setErr("");
  };

  const [storeAdminBiz, setStoreAdminBiz] = useState(null);

  if (step === "loading") return <LoaderFallback />;

  if (step === "panel") {
    return (
      <>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <Suspense fallback={<LoaderFallback />}>
          <AdminPanel
            onClose={handleSignOut}
            onToast={toast$}
            T={T}
            onOpenStoreAdmin={(biz) => setStoreAdminBiz(biz)}
          />
        </Suspense>
        {storeAdminBiz && (
          <Suspense fallback={<LoaderFallback />}>
            <StoreAdminPanel 
              business={storeAdminBiz} 
              onClose={() => setStoreAdminBiz(null)} 
              T={T} 
            />
          </Suspense>
        )}
      </>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Outfit', sans-serif; background: #0F172A; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .adm-input { width: 100%; padding: 13px 16px; border-radius: 14px; background: rgba(255,255,255,0.06); border: 1.5px solid rgba(255,255,255,0.12); color: #fff; font-size: 15px; font-family: inherit; font-weight: 500; transition: all .2s; }
        .adm-input::placeholder { color: rgba(255,255,255,0.25); }
        .adm-input:focus { outline: none; border-color: #10B981; box-shadow: 0 0 0 3px rgba(16,185,129,0.15); }
        .adm-input:disabled { opacity: 0.5; }
        .adm-btn { transition: transform .15s ease, box-shadow .15s ease; }
        .adm-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(16,185,129,0.4) !important; }
        .adm-btn:active:not(:disabled) { transform: scale(0.98); }
      `}</style>

      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(135deg, #0F172A 0%, #1E293B 60%, #0F172A 100%)",
        padding: "24px",
      }}>
        {/* Glow blobs */}
        <div style={{ position: "fixed", top: -140, right: -140, width: 440, height: 440, borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "fixed", bottom: -100, left: -100, width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{
          width: "100%", maxWidth: 400,
          background: "rgba(255,255,255,0.04)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: 28,
          padding: "40px 36px",
          animation: "fadeInUp .4s ease",
          boxShadow: "0 32px 80px rgba(0,0,0,0.55)",
        }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <div style={{
              width: 68, height: 68, borderRadius: 22,
              background: "linear-gradient(135deg, #10B981, #0ea5e9)",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              marginBottom: 18, boxShadow: "0 10px 30px rgba(16,185,129,0.35)",
            }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <div style={{ color: "#fff", fontSize: 22, fontWeight: 800, letterSpacing: "-0.3px", lineHeight: 1.2 }}>Panel de Administración</div>
            <div style={{ color: "rgba(255,255,255,0.38)", fontSize: 13, marginTop: 8, fontWeight: 500 }}>CityMap · Acceso restringido</div>
          </div>

          {/* Denied banner */}
          {step === "denied" && (
            <div style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.28)", borderRadius: 14, padding: "14px 16px", marginBottom: 24, textAlign: "center" }}>
              <div style={{ color: "#FCA5A5", fontWeight: 700, fontSize: 14 }}>⛔ Sin permisos de administrador</div>
              <button onClick={() => { setStep("login"); setErr(""); }} style={{ marginTop: 8, background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>
                Intentar con otra cuenta
              </button>
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Email */}
            <div>
              <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 8 }}>
                Correo electrónico
              </label>
              <input
                className="adm-input"
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setErr(""); }}
                placeholder="tu@correo.com"
                autoComplete="email"
                disabled={submitting}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 8 }}>
                Contraseña
              </label>
              <div style={{ position: "relative" }}>
                <input
                  className="adm-input"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setErr(""); }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={submitting}
                  style={{ paddingRight: 48 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.35)", padding: 4, display: "flex" }}
                >
                  {showPw
                    ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>

            {/* Error message */}
            {err && (
              <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.22)", borderRadius: 12, padding: "11px 14px", color: "#FCA5A5", fontSize: 13, fontWeight: 600 }}>
                {err}
              </div>
            )}

            {/* Submit */}
            <button
              className="adm-btn"
              type="submit"
              disabled={submitting}
              style={{
                marginTop: 4, width: "100%", padding: "15px 20px", borderRadius: 16,
                background: submitting ? "rgba(255,255,255,0.08)" : "linear-gradient(135deg, #10B981 0%, #0ea5e9 100%)",
                border: "none", color: "#fff", fontSize: 15, fontWeight: 800,
                cursor: submitting ? "not-allowed" : "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                boxShadow: submitting ? "none" : "0 4px 20px rgba(16,185,129,0.3)",
              }}
            >
              {submitting
                ? <><div style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.25)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin .7s linear infinite" }} /> Verificando...</>
                : "Entrar al panel"
              }
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: 32, color: "rgba(255,255,255,0.18)", fontSize: 12 }}>
            🔒 Solo administradores autorizados
          </div>
        </div>
      </div>
    </>
  );
}
