import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore.js';
import { sb } from '../lib/supabase.js';
import { ensureGoogleIdentityServices, promptGoogleOneTap } from '../lib/googleIdentity.js';
import { checkPassword } from '../lib/passwordRules.js';
import { useTranslation } from '../hooks/useTranslation.js';

// Mismo cliente de Google que el botón de la web (AuthModal.jsx).
// El botón oficial de Google (GIS) solo funciona sobre un origen https
// autorizado (citymap.mx): por eso existe esta página. La app nativa la abre
// en un Custom Tab y Google muestra "Ir a citymap.mx" en vez de la
// dirección larga de Supabase; al terminar, la sesión vuelve a la app por
// deep link (mx.citymap.app://login#access_token=...), que la app ya sabe
// recibir (setSessionFromUrl + listener appUrlOpen).
const GOOGLE_CLIENT_ID = "128467245162-fjpgeqiqhr4f0p5f430ti0v41jlmuovm.apps.googleusercontent.com";
const APP_DEEP_LINK = 'mx.citymap.app://login';

export default function AppLoginView({ T, dark, navigate }) {
  const googleBtnRef = useRef(null);
  const oneTapPromptedRef = useRef(false); // One Tap se lanza una sola vez por carga
  const [gisReady, setGisReady] = useState(false);
  const [gisTimedOut, setGisTimedOut] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | signing | done | error
  const [error, setError] = useState('');
  const [deepLink, setDeepLink] = useState('');
  const handleGoogleIdToken = useAuthStore((s) => s.handleGoogleIdToken);
  const { t } = useTranslation();

  const fromApp = new URLSearchParams(window.location.search).get('from') === 'app';

  // Enlace de recuperación: /login?recovery=1 viene del correo de Supabase.
  // El arranque ya guardó el token de la sesión de recuperación con
  // parseOAuthHash, así que aquí solo falta la contraseña nueva (el query
  // queda intacto aunque el hash ya se haya limpiado).
  const isRecovery = new URLSearchParams(window.location.search).get('recovery') === '1';
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [recoveryDone, setRecoveryDone] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');
  const recoveryCheck = useMemo(() => checkPassword(newPw), [newPw]);

  const handleRecoverySubmit = async () => {
    setRecoveryError('');
    if (!recoveryCheck.allValid) {
      setRecoveryError(t("modal_pw_requisitos", "Tu contraseña debe cumplir todos los requisitos"));
      return;
    }
    if (newPw !== confirmPw) {
      setRecoveryError(t("modal_contrasenas_no_coinciden", "Las contraseñas no coinciden"));
      return;
    }
    if (!sb._token) {
      setRecoveryError(t("modal_enlace_expirado", "El enlace expiró o ya se usó. Pide otro correo desde el inicio de sesión."));
      return;
    }
    setRecoveryBusy(true);
    try {
      await sb.updateUser({ password: newPw });
      setRecoveryDone(true);
    } catch (e) {
      setRecoveryError(e.message || t("modal_error_actualizar_contrasena", "No se pudo actualizar la contraseña. Inténtalo de nuevo."));
    } finally {
      setRecoveryBusy(false);
    }
  };

  useEffect(() => {
    // El cliente de Google (GIS) ya no vive en index.html: se carga aquí,
    // solo cuando se abre el login. El sondeo de abajo lo espera (máx. 8 s).
    ensureGoogleIdentityServices();
    const initGsi = () => {
      if (!window.google?.accounts?.id || !googleBtnRef.current) return false;
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response) => {
            if (!response?.credential) return;
            setStatus('signing');
            setError('');
            const uid = await handleGoogleIdToken(response.credential);
            if (!uid) {
              setStatus('error');
              setError(t("modal_no_sesion_google", "No se pudo iniciar sesión con Google. Inténtalo de nuevo."));
              return;
            }
            if (fromApp) {
              const at = localStorage.getItem('cg_t');
              const rt = localStorage.getItem('cg_r');
              if (!at) {
                setStatus('error');
                setError(t("modal_no_pasar_app", "Se inició sesión pero no se pudo pasar a la app. Inténtalo de nuevo."));
                return;
              }
              const link = `${APP_DEEP_LINK}#access_token=${encodeURIComponent(at)}${rt ? `&refresh_token=${encodeURIComponent(rt)}` : ''}`;
              setDeepLink(link);
              setStatus('done');
              window.location.href = link;
            } else {
              setStatus('done');
              navigate('/');
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        googleBtnRef.current.innerHTML = '';
        const btnWidth = Math.min(Math.max((googleBtnRef.current.parentElement?.offsetWidth || 340) - 4, 280), 380);
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: dark ? 'filled_black' : 'outline',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          locale: 'es',
          width: btnWidth,
          logo_alignment: 'left',
        });
        setGisReady(true);
        // Desde la app nativa (Custom Tab con ?from=app): lanzar SOLO el
        // selector de cuentas de Google en cuanto GIS está listo, sin
        // esperar a que el usuario toque el botón. One Tap usa el mismo
        // client_id de citymap.mx, así el selector dice "Ir a citymap.mx".
        // Si Google no lo muestra, el botón manual sigue ahí como respaldo.
        // En web normal (sin from=app) no se auto-lanza nada.
        if (fromApp && !oneTapPromptedRef.current) {
          oneTapPromptedRef.current = true;
          promptGoogleOneTap();
        }
        return true;
      } catch (e) {
        console.warn('GIS render error:', e);
        return false;
      }
    };

    if (window.google?.accounts?.id) {
      initGsi();
      return;
    }
    const interval = setInterval(() => {
      if (window.google?.accounts?.id) {
        clearInterval(interval);
        initGsi();
      }
    }, 100);
    const timeout = setTimeout(() => {
      clearInterval(interval);
      setGisTimedOut(true);
    }, 8000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [dark, handleGoogleIdToken, navigate, fromApp]);

  const handleFallbackGoogle = () => {
    // Solo en la app nativa (Custom Tab con ?from=app): recargar la página
    // para reintentar el botón oficial de Google. En web ya no hay respaldo
    // por Supabase (opción A): si GIS no carga, no hay entrada de Google.
    window.location.reload();
  };

  const handleCancel = () => {
    if (fromApp) {
      // Vuelve a la app (el listener appUrlOpen cierra esta pestaña).
      window.location.href = 'mx.citymap.app://';
    } else {
      navigate('/');
    }
  };

  // Sin splash de carga (12 nov 2026, Jonathan: si dura tan poquito,
  // mejor quitarlo): la tarjeta se ve de inmediato sobre fondo negro
  // (como el splash, pero sin parpadeo). El contenedor del botón GIS
  // sigue montado (oculto hasta que gisReady) para que initGsi pueda
  // dibujarlo; «Cancelar» siempre está visible dentro de la tarjeta.
  return (
    <div style={{ minHeight: '100dvh', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400, background: dark ? '#1e1e1e' : '#fff', border: `1px solid ${T.border}`, borderRadius: 20, padding: '28px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', textAlign: 'center' }}>
        <img
          src="/logo-brand.png"
          alt="CityMap"
          width={160}
          style={{ width: 160, maxWidth: '60%', height: 'auto', objectFit: 'contain', display: 'block', margin: '0 auto 14px', filter: dark ? undefined : 'brightness(0)' }}
        />
        <p style={{ color: T.sub, margin: '0 0 24px', fontWeight: 500, fontSize: 14 }}>
          {isRecovery ? t("modal_nueva_contrasena", "Crea tu contraseña nueva") : t("modal_inicia_para_continuar", "Inicia sesión para continuar")}
        </p>

        {status === 'signing' && (
          <p style={{ color: T.sub, fontSize: 14, margin: '0 0 16px' }}>{t("modal_conectando_google", "Conectando con Google…")}</p>
        )}

        {status === 'done' && fromApp && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ color: T.text, fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>{t("modal_sesion_volviendo_app", "Sesión iniciada. Volviendo a la app…")}</p>
            {deepLink && (
              <a href={deepLink} style={{ display: 'inline-block', padding: '12px 28px', borderRadius: 999, background: '#111', color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                {t("modal_volver_app", "Volver a la app")}
              </a>
            )}
          </div>
        )}

        {status === 'done' && !fromApp && (
          <p style={{ color: T.text, fontSize: 15, fontWeight: 700, margin: '0 0 16px' }}>{t("modal_sesion_redirigiendo", "Sesión iniciada. Redirigiendo…")}</p>
        )}

        {isRecovery ? (
          recoveryDone ? (
            <div role="status" style={{ padding: '16px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12, color: '#166534', fontWeight: 600, fontSize: 14, lineHeight: 1.5, textAlign: 'left' }}>
              <div style={{ fontWeight: 800, marginBottom: 4 }}>{t("modal_contrasena_actualizada", "Contraseña actualizada")}</div>
              {t("modal_contrasena_actualizada_texto", "Ya puedes entrar con tu contraseña nueva.")}
              <button onClick={() => navigate('/')} style={{ display: 'block', width: '100%', marginTop: 16, padding: '13px 16px', borderRadius: 999, background: '#111', color: '#fff', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                {t("modal_entrar_citymap", "Entrar a CityMap")}
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
                <input className="inp" aria-label={t("modal_nueva_contrasena", "Crea tu contraseña nueva")} autoComplete="new-password" placeholder={t("modal_nueva_contrasena", "Crea tu contraseña nueva")} type="password" value={newPw} onChange={e => setNewPw(e.target.value)} style={{ padding: '14px 16px', borderRadius: 12, border: `1.5px solid ${T.border}`, fontSize: 16, background: dark ? '#1e1e1e' : '#fff', color: T.text, outline: 'none', width: '100%' }} />
                <input className="inp" aria-label={t("modal_repite_contrasena", "Repite la contraseña")} autoComplete="new-password" placeholder={t("modal_repite_contrasena", "Repite la contraseña")} type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} style={{ padding: '14px 16px', borderRadius: 12, border: `1.5px solid ${T.border}`, fontSize: 16, background: dark ? '#1e1e1e' : '#fff', color: T.text, outline: 'none', width: '100%' }} />
              </div>
              {newPw.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', marginTop: 12, padding: '0 4px', textAlign: 'left' }}>
                  {recoveryCheck.results.map(r => (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: r.ok ? '#22c55e' : T.sub }}>
                      <span style={{ fontSize: 11 }}>{r.ok ? '✓' : '○'}</span>
                      {t(r.key, r.fallback)}
                    </div>
                  ))}
                </div>
              )}
              {recoveryError && (
                <p style={{ color: '#dc2626', fontSize: 14, fontWeight: 600, margin: '16px 0 0', textAlign: 'left' }}>{recoveryError}</p>
              )}
              <button onClick={handleRecoverySubmit} disabled={recoveryBusy} style={{ width: '100%', marginTop: 16, padding: '13px 16px', borderRadius: 14, background: dark ? '#f1f5f9' : '#0f172a', color: dark ? '#0f172a' : '#fff', fontWeight: 800, fontSize: 15, border: 'none', cursor: 'pointer', opacity: recoveryBusy ? 0.7 : 1, fontFamily: 'inherit' }}>
                {recoveryBusy ? t("modal_actualizando", "Actualizando…") : t("modal_actualizar_contrasena", "Actualizar contraseña")}
              </button>
            </>
          )
        ) : (
          status !== 'done' && (
          <>
            <div style={{ width: '100%', display: gisReady ? 'flex' : 'none', justifyContent: 'center', minHeight: 44, marginBottom: 8 }}>
              <div ref={googleBtnRef} style={{ width: '100%', display: 'flex', justifyContent: 'center' }} />
            </div>
            {gisTimedOut && !gisReady && fromApp && (
              <button
                onClick={handleFallbackGoogle}
                style={{ width: '100%', padding: '13px 16px', marginBottom: 8, background: dark ? 'rgba(255,255,255,0.06)' : '#fff', border: `1.5px solid ${dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}`, borderRadius: 999, fontWeight: 700, fontSize: 15, color: T.text, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                <svg width="22" height="22" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
                  <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.9 2.5 30.3 0 24 0 14.7 0 6.7 5.5 2.9 13.6l7.8 6C12.5 13.1 17.8 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17z" />
                  <path fill="#FBBC05" d="M10.7 28.4A14.5 14.5 0 0 1 9.5 24c0-1.5.3-3 .7-4.4l-7.8-6A24 24 0 0 0 0 24c0 3.9.9 7.5 2.5 10.8l8.2-6.4z" />
                  <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.2 1.5-5 2.4-8.4 2.4-6.2 0-11.5-4.2-13.4-9.8l-8.2 6.4C6.7 42.5 14.7 48 24 48z" />
                </svg>
                <span>{t("modal_continuar_google", "Continuar con Google")}</span>
              </button>
            )}
          </>
          )
        )}

        {status === 'error' && error && (
          <p style={{ color: '#dc2626', fontSize: 14, fontWeight: 600, margin: '0 0 16px' }}>{error}</p>
        )}

        <button
          onClick={handleCancel}
          style={{ background: 'none', border: 'none', color: T.sub, fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 8 }}
        >
          {t("modal_cancelar", "Cancelar")}
        </button>
      </div>
    </div>
  );
}
