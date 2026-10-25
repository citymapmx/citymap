import React, { useEffect, useMemo, useRef, useState } from 'react';
import Icon from './ui/Icon.jsx';
import { useAuthStore } from '../store/useAuthStore.js';
import { useUIStore } from '../store/useUIStore.js';
import { useShallow } from 'zustand/react/shallow';
import { sb } from '../lib/supabase.js';
import { Capacitor } from '@capacitor/core';

const GOOGLE_CLIENT_ID = "128467245162-fjpgeqiqhr4f0p5f430ti0v41jlmuovm.apps.googleusercontent.com";
const RECAPTCHA_SITE_KEY = "6LdK_PItAAAAAAKJNfLuCzIVHInRQ8HJVi9LK5_-";

/* ── Password strength rules ── */
const PW_RULES = [
  { id: 'len', label: 'Mínimo 8 caracteres', test: (p) => p.length >= 8 },
  { id: 'upper', label: 'Una letra mayúscula', test: (p) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'Una letra minúscula', test: (p) => /[a-z]/.test(p) },
  { id: 'num', label: 'Un número', test: (p) => /\d/.test(p) },
];

export default function AuthModal({ T, dark, cities, doAuth }) {
  const { showAuth, setShowAuth, authMode, setAuthMode, authForm, setAuthForm, authLoading, authErr, setAuthErr, handleGoogleIdToken } = useAuthStore(useShallow(s => ({ showAuth: s.showAuth, setShowAuth: s.setShowAuth, authMode: s.authMode, setAuthMode: s.setAuthMode, authForm: s.authForm, setAuthForm: s.setAuthForm, authLoading: s.authLoading, authErr: s.authErr, setAuthErr: s.setAuthErr, handleGoogleIdToken: s.handleGoogleIdToken })));
  const toast$ = useUIStore(s => s.toast$);

  const dialogRef = useRef(null);
  const googleBtnRef = useRef(null);
  const [gisRendered, setGisRendered] = useState(false);

  const isNativeApp = Capacitor.isNativePlatform();

  /* ── reCAPTCHA v3 invisible ── */
  const pw = authForm.password;
  const pwResults = useMemo(() => PW_RULES.map(r => ({ ...r, ok: r.test(pw) })), [pw]);
  const pwAllValid = pwResults.every(r => r.ok);
  const showPwHints = authMode === "register" && pw.length > 0;

  /* ── reCAPTCHA v3 invisible ── */
  const getRecaptchaToken = async (action = 'auth') => {
    try {
      if (window.grecaptcha?.execute) {
        return await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action });
      }
    } catch (e) {
      console.warn("reCAPTCHA error:", e);
    }
    return null; // fail-open: no bloquear al usuario si reCAPTCHA falla
  };

  /* ── Wrapper que valida contraseña + reCAPTCHA antes de doAuth ── */
  const handleSubmit = async () => {
    if (authMode === "register" && !pwAllValid) {
      setAuthErr("Tu contraseña debe cumplir todos los requisitos");
      return;
    }
    // Obtener token de reCAPTCHA en segundo plano (no bloquea si falla)
    await getRecaptchaToken(authMode === "login" ? "login" : "register");
    doAuth();
  };

  useEffect(() => {
    // En app nativa (APK Capacitor), no se usa GIS web
    if (isNativeApp) return;

    if (!showAuth) {
      setGisRendered(false);
      return;
    }

    const initGsi = () => {
      if (window.google?.accounts?.id && googleBtnRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: async (response) => {
              if (response?.credential) {
                setAuthErr("");
                const uid = await handleGoogleIdToken(response.credential);
                if (uid) {
                  setShowAuth(false);
                  toast$("Bienvenido a CityMap");
                }
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          googleBtnRef.current.innerHTML = "";
          const btnWidth = Math.min(Math.max((googleBtnRef.current.parentElement?.offsetWidth || 340) - 4, 280), 380);

          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: dark ? "filled_black" : "outline",
            size: "large",
            shape: "pill",
            text: "continue_with",
            locale: "es",
            width: btnWidth,
            logo_alignment: "left"
          });

          setGisRendered(true);
        } catch (e) {
          console.warn("GIS render error:", e);
        }
      }
    };

    if (window.google?.accounts?.id) {
      initGsi();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          initGsi();
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isNativeApp, showAuth, dark, handleGoogleIdToken, setShowAuth, setAuthErr, toast$]);

  useEffect(() => {
    if (!showAuth) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = requestAnimationFrame(() => dialogRef.current?.focus());
    const onKey = e => {
      if (e.key === 'Escape') { e.preventDefault(); setShowAuth(false); }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const items = Array.from(dialogRef.current.querySelectorAll('button, input, select, a[href], iframe, [tabindex="0"]')).filter(el => !el.disabled && el.getClientRects().length);
      const first = items[0], last = items[items.length - 1];
      if (!first) return;
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { cancelAnimationFrame(frame); document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', onKey); previousFocus?.focus?.({ preventScroll:true }); };
  }, [showAuth, setShowAuth]);

  if (!showAuth) return null;

  return (
    <div className="ov" onClick={() => setShowAuth(false)} style={{ alignItems:"center", paddingTop:"max(16px, env(safe-area-inset-top))", paddingBottom:"max(16px, env(safe-area-inset-bottom))" }}>
      <div className="sh" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="auth-dialog-title" onClick={e => e.stopPropagation()} style={{ position:'relative', maxHeight:'calc(100dvh - 32px)', animationTimingFunction:'ease-out', paddingTop:52 }}>
      <button type="button" aria-label="Cerrar acceso" onClick={() => setShowAuth(false)} style={{ position:'absolute', top:8, right:8, width:44, height:44, display:'grid', placeItems:'center', border:0, borderRadius:'50%', background:'transparent', cursor:'pointer', color:T.text }}><Icon name="x" size={20} color={T.text} /></button>

      {/* ── Header ── */}
      <div style={{ marginBottom: 28, textAlign: "center" }}>
        <h2 id="auth-dialog-title" style={{ fontFamily: "var(--heading)", color: T.text, margin: "0 0 6px 0", lineHeight: 1.1, fontSize: 24, fontWeight: 900 }}>
          {authMode === "login" ? "¡Hola de nuevo!" : "Únete a CityMap"}
        </h2>
        <p style={{ color: T.sub, margin: 0, fontWeight: 500, fontSize: 14 }}>
          {authMode === "login" ? "Accede a tu cuenta de CityMap" : "Descubre los mejores lugares locales"}
        </p>
      </div>

      {/* ── Botón Google ── */}
      {isNativeApp ? (
        /* En app nativa Capacitor: OAuth con Custom Tab */
        <button
          className="press"
          style={{
            width: "100%", padding: "13px 16px", marginBottom: 20,
            background: dark ? "rgba(255,255,255,0.06)" : "#FFFFFF",
            border: `1.5px solid ${dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}`,
            borderRadius: 999, fontWeight: 700, fontSize: 15, color: T.text,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
            boxShadow: dark ? "0 2px 10px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.04)",
            cursor: "pointer", fontFamily: "inherit"
          }}
          onClick={async () => {
            setAuthErr("");
            try { await sb.signInWithOAuth('google'); }
            catch (err) { setAuthErr("Error con Google: " + err.message); }
          }}
        >
          <svg width="22" height="22" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.9 2.5 30.3 0 24 0 14.7 0 6.7 5.5 2.9 13.6l7.8 6C12.5 13.1 17.8 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17z"/>
            <path fill="#FBBC05" d="M10.7 28.4A14.5 14.5 0 0 1 9.5 24c0-1.5.3-3 .7-4.4l-7.8-6A24 24 0 0 0 0 24c0 3.9.9 7.5 2.5 10.8l8.2-6.4z"/>
            <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.2 1.5-5 2.4-8.4 2.4-6.2 0-11.5-4.2-13.4-9.8l-8.2 6.4C6.7 42.5 14.7 48 24 48z"/>
          </svg>
          <span style={{ letterSpacing: "-0.2px" }}>Continuar con Google</span>
        </button>
      ) : (
        /* En Web (Mac, Windows, Android Chrome, iPhone Safari): Botón oficial visible de Google GIS */
        <div style={{ width: "100%", marginBottom: 20, display: "flex", justifyContent: "center" }}>
          <div 
            ref={googleBtnRef} 
            style={{ 
              width: "100%", 
              display: gisRendered ? "flex" : "none", 
              justifyContent: "center",
              minHeight: 44
            }} 
          />
          {!gisRendered && (
            <button
              className="press"
              style={{
                width: "100%", padding: "13px 16px",
                background: dark ? "rgba(255,255,255,0.06)" : "#FFFFFF",
                border: `1.5px solid ${dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}`,
                borderRadius: 999, fontWeight: 700, fontSize: 15, color: T.text,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
                boxShadow: dark ? "0 2px 10px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.04)",
                cursor: "pointer", fontFamily: "inherit"
              }}
              onClick={async () => {
                setAuthErr("");
                try { await sb.signInWithOAuth('google'); }
                catch (err) { setAuthErr("Error con Google: " + err.message); }
              }}
            >
              <svg width="22" height="22" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
                <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.9 2.5 30.3 0 24 0 14.7 0 6.7 5.5 2.9 13.6l7.8 6C12.5 13.1 17.8 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17z"/>
                <path fill="#FBBC05" d="M10.7 28.4A14.5 14.5 0 0 1 9.5 24c0-1.5.3-3 .7-4.4l-7.8-6A24 24 0 0 0 0 24c0 3.9.9 7.5 2.5 10.8l8.2-6.4z"/>
                <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.2 1.5-5 2.4-8.4 2.4-6.2 0-11.5-4.2-13.4-9.8l-8.2 6.4C6.7 42.5 14.7 48 24 48z"/>
              </svg>
              <span style={{ letterSpacing: "-0.2px" }}>Continuar con Google</span>
            </button>
          )}
        </div>
      )}

      {/* ── Divisor ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
        <div style={{ flex: 1, height: 1, background: T.border }} />
        <span style={{ fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 1, fontSize: 11 }}>O ingresa con email</span>
        <div style={{ flex: 1, height: 1, background: T.border }} />
      </div>

      {/* ── Error ── */}
      {authErr && <div role="alert" style={{ padding: "12px 16px", background: "#FEF2F2", border: "1px solid #FEE2E2", borderRadius: 12, color: "#DC2626", marginBottom: 16, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}><Icon name="info" size={16} color="#DC2626" />{authErr}</div>}

      {/* ── Inputs ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {authMode === "register" && (
          <>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", pointerEvents: "none" }}>
                <Icon name="user" size={16} color={T.sub} />
              </span>
              <input className="inp" aria-label="Nombre y apellido" autoComplete="name" placeholder="Tu nombre y apellido" value={authForm.name} onChange={e => setAuthForm(f => ({ ...f, name: e.target.value }))} style={{ padding: "14px 16px 14px 42px", borderRadius: 12, border: `1.5px solid ${T.border}`, fontSize: 16, background: T.white, color: T.text, outline: "none", width: "100%" }} />
            </div>
            <select className="inp" style={{ padding: "14px 16px", borderRadius: 12, border: `1.5px solid ${T.border}`, fontSize: 16, background: T.white, color: T.text, outline: "none", appearance: "none" }} value={authForm.city} onChange={e => setAuthForm(f => ({ ...f, city: e.target.value }))}>
              <option value="" disabled>Selecciona tu ciudad principal...</option>
              {cities.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          </>
        )}
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", pointerEvents: "none" }}>
            <Icon name="mail" size={16} color={T.sub} />
          </span>
          <input className="inp" aria-label="Correo electrónico" autoComplete="email" placeholder="Correo electrónico" type="email" value={authForm.email} onChange={e => setAuthForm(f => ({ ...f, email: e.target.value }))} style={{ padding: "14px 16px 14px 42px", borderRadius: 12, border: `1.5px solid ${T.border}`, fontSize: 16, background: T.white, color: T.text, outline: "none", width: "100%" }} />
        </div>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", pointerEvents: "none" }}>
            <Icon name="lock" size={16} color={T.sub} />
          </span>
          <input className="inp" aria-label="Contraseña" autoComplete={authMode === "register" ? "new-password" : "current-password"} placeholder="Contraseña" type="password" value={authForm.password} onChange={e => setAuthForm(f => ({ ...f, password: e.target.value }))} style={{ padding: "14px 16px 14px 42px", borderRadius: 12, border: `1.5px solid ${showPwHints && !pwAllValid ? '#f59e0b' : T.border}`, fontSize: 16, background: T.white, color: T.text, outline: "none", width: "100%", transition: "border-color 0.2s" }} />
        </div>

        {/* ── Password strength hints ── */}
        {showPwHints && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px", marginTop: 4, padding: "0 4px" }}>
            {pwResults.map(r => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: r.ok ? "#22c55e" : T.sub, transition: "color 0.2s" }}>
                <span style={{ fontSize: 11 }}>{r.ok ? "✓" : "○"}</span>
                {r.label}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── CTA ── */}
      <button className="press" style={{ marginTop: 20, padding: "16px", borderRadius: 14, background: dark ? "#f1f5f9" : "#0f172a", color: dark ? "#0f172a" : "#fff", fontWeight: 800, fontSize: 15, width: "100%", border: "none", cursor: "pointer", boxShadow: "0 8px 24px rgba(0,0,0,0.18)", opacity: authLoading ? 0.7 : 1 }} onClick={handleSubmit} disabled={authLoading}>
        {authLoading ? "Conectando…" : authMode === "login" ? "Ingresar a mi cuenta" : "Crear mi cuenta gratis"}
      </button>

      <p style={{ textAlign: "center", marginTop: 20, color: T.sub, fontSize: 14 }}>
        {authMode === "login" ? "¿Eres nuevo por aquí? " : "¿Ya eres parte de CityMap? "}
        <button type="button" style={{ color: T.green, fontWeight: 800, cursor: "pointer", border:0, background:"transparent", fontSize:"inherit" }} onClick={() => { setAuthMode(m => m === "login" ? "register" : "login"); setAuthErr(""); }}>
          {authMode === "login" ? "Regístrate ahora" : "Inicia sesión"}
        </button>
      </p>
    </div></div>
  );
}
