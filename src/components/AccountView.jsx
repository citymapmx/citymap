import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import Icon from './ui/Icon.jsx';
import ThemeToggle from './ui/ThemeToggle.jsx';
import Uploader from './Uploader.jsx';
import BizRequestCard from './BizRequestCard.jsx';
import { parseEditBizDeepLink, badgeText } from '../lib/notifications.js';
import { bizToForm } from '../lib/bizForm.js';
import { sb, cloudDelete } from '../lib/supabase.js';
import { isOpenNow } from '../lib/utils.js';
import { useUIStore } from '../store/useUIStore.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { useDataStore } from '../store/useDataStore.js';
import { useAppContext } from '../context/AppContext';
import Footer from './Footer.jsx';
import LoyaltyDesigner from './loyalty/LoyaltyDesigner.jsx';
import MenuStyleDesigner from './store/MenuStyleDesigner.jsx';
import BizShareHub from './BizShareHub.jsx';
import ProfileLoyaltyCarousel from './loyalty/ProfileLoyaltyCarousel.jsx';
import { useTranslation } from '../hooks/useTranslation.js';
import { privateEventUrl, isPrivateEventHost, deletePrivateEvent, PRIVATE_EVENT_DELETED_EVENT } from '../lib/privateEvents.js';
import CheckConfirmacion from './CheckConfirmacion.jsx';
export default function AccountView({
  user, profile, isAdmin, T, dark, favIds, reviews,
  wallet, coupons, claimedCoupons, biz, myBizList,
  setShowAuth, setAuthMode, setEditBizId, setAddBizForm,
  setShowAddBiz, setOwnerView, setSelected, navigate,
  doSignOut, toast$, viewStyle, setUser, authChecked,
  setShowAdmin, setStoreAdminBiz
}) {
  const { t, lang } = useTranslation();
  const isOpen = isOpenNow;
  const { installPromptEvent, setInstallPromptEvent, unreadNotifCount, themeMode, setThemeMode } = useUIStore();
  const { events, loadMyBiz } = useDataStore();
  const ctx = useAppContext();
  const { savedEventIds, setSelectedEvent } = ctx;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const location = useLocation();
  const deepLinkHandled = useRef(false);

  // Abre el formulario de edición de un negocio (AddBizModal en modo
  // edición del dueño). Lo usan el menú, la tarjeta de Mis solicitudes y
  // el enlace profundo de la notificación «Se requieren cambios».
  const openBizEdit = (b) => {
    if (!b) return;
    setEditBizId(b.id);
    setAddBizForm(bizToForm(b));
    setShowAddBiz(true);
  };

  // Al entrar a /cuenta se recargan mis negocios: si el admin pidió
  // cambios mientras la app estaba abierta, la tarjeta ya no muestra
  // un «En revisión» viejo.
  useEffect(() => {
    if (!user) return;
    loadMyBiz(user.id)?.catch?.(() => {});
  }, [user, loadMyBiz]);

  // Enlace profundo ?editarNegocio=<id> (notificación «Se requieren
  // cambios»): abre la edición de ese negocio y limpia la URL.
  useEffect(() => {
    if (deepLinkHandled.current) return;
    const bizId = parseEditBizDeepLink(`${location.pathname}${location.search}`);
    if (!bizId) return;
    const b = myBizList.find(x => x.id === bizId);
    if (!b) return;
    deepLinkHandled.current = true;
    openBizEdit(b);
    window.history.replaceState(null, '', '/cuenta');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myBizList, location]);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhoto, setEditPhoto] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  // Check de confirmación: al guardar el perfil se reproduce una sola
  // vez en el modal y luego se cierra.
  const [showCheck, setShowCheck] = useState(false);
  const [showUserQR, setShowUserQR] = useState(false);
  const [shareHubBiz, setShareHubBiz] = useState(null);
  const [loyaltyDesignerBiz, setLoyaltyDesignerBiz] = useState(null);
  const [menuDesignerBiz, setMenuDesignerBiz] = useState(null);

  const [myClaims, setMyClaims] = useState([]);
  useEffect(() => {
    if (authChecked && !user) {
      navigate("home");
    }
  }, [authChecked, user, navigate]);

  useEffect(() => {
    if (!user) return;
    sb.get("business_claims", `?user_id=eq.${user.id}`).then(res => {
       
      if (Array.isArray(res)) setMyClaims(res);
    });
  }, [user]);

  // Mis eventos privados (no salen en el store: se leen directo por dueño).
  const [myPrivateEvents, setMyPrivateEvents] = useState([]);
  useEffect(() => {
    if (!user) return;
    sb.get("events", `?user_id=eq.${user.id}&visibility=eq.private&order=date.desc&limit=20`).then(res => {
      if (Array.isArray(res)) setMyPrivateEvents(res);
    }).catch(() => {});
  }, [user]);

  const formatPrivateDate = (ev) => {
    if (!ev?.date) return "";
    try { return new Date(ev.date + "T00:00:00").toLocaleDateString(lang === 'en' ? 'en-US' : 'es-MX', { day: "numeric", month: "short", year: "numeric" }); } catch { return ev.date; }
  };

  // Borrar un evento privado para todos (solo el anfitrión lo ve: la lista
  // ya es solo de eventos propios, pero el criterio se exige explícito).
  const [deletingPrivateId, setDeletingPrivateId] = useState(null);
  // Si el evento se borra desde su detalle (modal), la tarjeta se quita
  // de esta lista sin recargar.
  useEffect(() => {
    const onDeleted = (e) => {
      const id = e?.detail?.id;
      if (id) setMyPrivateEvents(list => list.filter(item => item.id !== id));
    };
    window.addEventListener(PRIVATE_EVENT_DELETED_EVENT, onDeleted);
    return () => window.removeEventListener(PRIVATE_EVENT_DELETED_EVENT, onDeleted);
  }, []);
  const confirmDeletePrivateEvent = async (ev) => {
    if (!ev?.id || deletingPrivateId) return;
    const ok = window.confirm(t("cuenta_eliminar_evento_confirmar", "¿Eliminar «${title}» para todos? Esta acción no se puede deshacer. Se borra el evento, las confirmaciones de asistencia y el chat.", { title: ev.title || '' }));
    if (!ok) return;
    setDeletingPrivateId(ev.id);
    try {
      await deletePrivateEvent({ db: sb, deleteImage: cloudDelete, event: ev });
      setMyPrivateEvents(list => list.filter(item => item.id !== ev.id));
      toast$(t("cuenta_evento_eliminado", "Evento eliminado"));
    } catch (err) {
      toast$(t("cuenta_evento_no_eliminado", "No se pudo eliminar el evento, inténtalo de nuevo"));
    } finally {
      setDeletingPrivateId(null);
    }
  };

  const startEditProfile = () => {
    setEditName(user?.user_metadata?.name || profile?.name || user.email?.split("@")[0] || "");
    setEditPhoto(user?.user_metadata?.avatar_url || profile?.avatar_url || "");
    setIsEditingProfile(true);
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await sb.updateUser({ data: { name: editName, avatar_url: editPhoto } });
      const refreshed = await sb.refresh();
      const updatedUser = refreshed?.user;
      if (updatedUser) {
        setUser(updatedUser);
        await sb.patch("profiles", updatedUser.id, { name: editName, avatar_url: editPhoto }).catch(() => {});
        const authSt = useAuthStore.getState();
        if (authSt.profile) authSt.setProfile({ ...authSt.profile, name: editName, avatar_url: editPhoto });
      }
      // El modal no se cierra de inmediato: primero se reproduce el
      // check de confirmación y al terminar se cierra (onDone).
      setShowCheck(true);
      toast$(t("perfil_actualizado", "Perfil actualizado ✓"));
    } catch (e) {
      toast$(e.message);
    } finally {
      setSavingProfile(false);
    }
  };

  // Orden (12 Nov 2026, propuesta C elegida por Jonathan): «Mi actividad»
  // vuelve arriba, pero recortada a solo Notificaciones y Mis Favoritos
  // (el modo oscuro y la edición de perfil se mudaron al encabezado,
  // con botones grandes). «Mi Negocio» queda después, tal cual.
  const menuGroups = [
    {
      title: t("cuenta_mi_actividad", "Mi actividad"),
      items: [
        { label: t("mis_favoritos", "Mis Favoritos"), icon: "heart", act: "favs" },
        { label: t("notificaciones", "Notificaciones"), icon: "bell", act: "user_notifs" },
        ...(isAdmin ? [{ label: t("cuenta_notif_admin", "Notificaciones de Admin"), icon: "shield", act: "admin_notifs" }] : [])
      ]
    },
    {
      title: myBizList.filter(b => b.status === "approved").length === 1 
        ? `${t("mi_negocio", "Mi Negocio")} (${myBizList.filter(b => b.status === "approved")[0].name})` 
        : t("mi_negocio", "Mi Negocio"),
      items: [
        ...myBizList.filter(b => b.status === "approved").flatMap(b => {
          const items = [];
          if (b.plan && b.plan !== "free" && b.plan !== "gratis") {
            items.push(
              { label: t("reservaciones", "Reservaciones"), icon: "calendar", act: `owner_res_${b.id}` },
              { label: t("cuenta_estadisticas", "Estadísticas"), icon: "trending", act: `owner_stats_${b.id}` },
              { label: t("cuenta_tarjetas_lealtad", "Tarjetas de Lealtad (Wallet)"), icon: "award", act: `owner_loyalty_${b.id}` },
              { label: t("compartir_mi_negocio", "Compartir mi negocio"), icon: "share", act: `owner_share_${b.id}` }
            );
          }
          if (b.plan === "premium" || b.plan === "elite" || b.plan === "pro") {
            items.push({ label: t("editar_menu_cat", "Editar menú o catálogo"), icon: "list", act: `owner_menu_${b.id}` });
          }
          items.push(
            { label: t("diseno_menu", "Diseño de mi menú"), icon: "sliders", act: `owner_menu_style_${b.id}` },
            { label: t("editar_negocio", "Editar negocio"), icon: "edit", act: `owner_edit_${b.id}` }
          );
          return items;
        }),
        { label: t("ver_planes", "Ver planes"), icon: "award", act: "business_plans" },
        // Solo 1 negocio por cuenta: si ya tiene uno (en cualquier estado),
        // no se muestra «Agregar mi negocio».
        ...((myBizList?.length || 0) > 0 ? [] : [{ label: t("agregar_negocio", "Agregar mi negocio"), icon: "plus", act: "add_biz" }]),
      ]
    }
  ];

  const handleMenuAction = (act) => {
    if (act === "no_op") return;
    if (act === "privacy") navigate("privacy");
    if (act === "install_pwa") {
      if (installPromptEvent) { installPromptEvent.prompt(); installPromptEvent.userChoice.then(r => { if (r.outcome === 'accepted') setInstallPromptEvent(null); }); }
      else if (isIOS) toast$(t("instruccion_ios", "Toca 'Compartir' ⬆ y luego 'Agregar a Inicio' 📱"));
    } else if (act === "edit_profile") startEditProfile();
    else if (act === "favs") navigate("favs");
    else if (act === "itineraries") navigate("itineraries");
    else if (act === "business_plans") navigate("/negocios"); // «Ver planes» lleva a /negocios, la página de planes
    else if (act === "add_biz") { if (!user) { setShowAuth(true); return; } const first = myBizList?.[0]; if (first) { openBizEdit(first); return; } setShowAddBiz(true); }
    else if (act === "about") navigate("about");
    else if (act === "user_notifs") navigate("user_notifs");
    else if (act === "admin_notifs") navigate("admin_notifs");
    else if (act === "clear_cache") { if ('serviceWorker' in navigator) { caches.keys().then(n => Promise.all(n.map(c => caches.delete(c)))); } window.location.reload(true); }
    // OJO: el prefijo largo «owner_menu_style_» va ANTES que «owner_menu_»:
    // «owner_menu_style_<id>» también empieza por «owner_menu_», así que si
    // la rama corta va primero se traga el tap y el diseñador nunca abre.
    else if (act.startsWith("owner_menu_style_")) {
      const b = myBizList.find(x => x.id === act.replace("owner_menu_style_", ""));
      if (b) { setMenuDesignerBiz(b); }
    }
    else if (act.startsWith("owner_menu_")) {
      const b = myBizList.find(x => x.id === act.replace("owner_menu_", ""));
      if (b) { setStoreAdminBiz(b); }
    }
    else if (act.startsWith("owner_loyalty_")) {
      const b = myBizList.find(x => x.id === act.replace("owner_loyalty_", ""));
      if (b) { setLoyaltyDesignerBiz(b); }
    }
    else if (act.startsWith("owner_edit_")) {
      const b = myBizList.find(x => x.id === act.replace("owner_edit_", ""));
      if (b) openBizEdit(b);
    }
    else if (act.startsWith("owner_res_")) {
      const b = myBizList.find(x => x.id === act.replace("owner_res_", ""));
      if (b) {
        setOwnerView(b);
        navigate("/manage/" + (b.slug || b.id));
      }
    }
    else if (act.startsWith("owner_stats_")) {
      const b = myBizList.find(x => x.id === act.replace("owner_stats_", ""));
      if (b) {
        setOwnerView(b);
        navigate("/stats/" + (b.slug || b.id));
      }
    }
    else if (act.startsWith("owner_share_")) {
      const b = myBizList.find(x => x.id === act.replace("owner_share_", ""));
      if (b) setShareHubBiz(b);
    }
  };

  return (
    <div style={{ paddingBottom: 84, background: T.white, minHeight: "100vh", ...viewStyle }}>
      {user ? (<>

        {/* ── EDIT PROFILE MODAL ── */}
        {isEditingProfile && createPortal(
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px 20px" }} onClick={() => setIsEditingProfile(false)}>
            <div style={{ width: "100%", maxWidth: 420, background: T.white, borderRadius: 24, padding: "28px 24px 28px", animation: "fadeUp .35s cubic-bezier(.34,1.1,.64,1) both", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
              <div style={{ fontWeight: 800, fontSize: 17, color: T.text, marginBottom: 20, textAlign: "center" }}>{t("editar_perfil_title", "Editar Perfil")}</div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 20 }}>
                {editPhoto ? (
                  <div style={{ position: "relative" }}>
                    <img src={editPhoto} alt={t("cuenta_alt_foto_seleccionada", "Foto de perfil seleccionada")} style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover" }} />
                    <button onClick={() => setEditPhoto("")} style={{ position: "absolute", top: -4, right: -4, background: T.red, color: "#fff", border: "none", width: 22, height: 22, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="x" size={11} color="#fff" /></button>
                  </div>
                ) : (
                  <div style={{ width: 80, height: 80, borderRadius: "50%", background: T.bg, border: `1.5px dashed ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    <Uploader avatarMode={true} onDone={url => setEditPhoto(url)} label={t("foto", "Foto")} aspect={1} />
                  </div>
                )}
              </div>
              <label style={{ fontSize: 11, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: .6, marginBottom: 6, display: "block" }}>{t("nombre", "Nombre")}</label>
              <input value={editName} onChange={e => setEditName(e.target.value)} placeholder={t("tu_nombre", "Tu nombre")} style={{ width: "100%", padding: "12px 14px", border: `1.5px solid ${T.border}`, background: "transparent", borderRadius: 12, fontSize: 15, color: T.text, fontFamily: "inherit", marginBottom: 20 }} />
              <div style={{ display: "flex", gap: 10 }}>
                {showCheck ? (
                  <div style={{ flex: 1 }}>
                    <CheckConfirmacion show size={72} onDone={() => { setShowCheck(false); setIsEditingProfile(false); }} />
                  </div>
                ) : (<>
                  <button onClick={() => setIsEditingProfile(false)} style={{ flex: 1, padding: "12px 0", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12, fontWeight: 700, fontSize: 14, color: T.text, cursor: "pointer", fontFamily: "inherit" }}>{t("cancelar", "Cancelar")}</button>
                  <button onClick={saveProfile} disabled={savingProfile} style={{ flex: 1, padding: "12px 0", background: T.green, border: "none", borderRadius: 12, fontWeight: 700, fontSize: 14, color: T.dark ? "#18181B" : "#FFFFFF", cursor: "pointer", fontFamily: "inherit", opacity: savingProfile ? 0.7 : 1 }}>{savingProfile ? t("guardando", "Guardando...") : t("guardar", "Guardar")}</button>
                </>)}
              </div>
            </div>
          </div>
        , document.body)}

        {/* ── USER QR MODAL ── */}
        {showUserQR && createPortal(
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={() => setShowUserQR(false)}>
            <div style={{ width: "100%", maxWidth: 320, background: T.white, borderRadius: 32, padding: "32px 24px", animation: "scaleFadeIn .25s cubic-bezier(.34,1.1,.64,1) both", boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }} onClick={e => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: T.greenL, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="grid" size={32} color={T.green} />
                </div>
              </div>
              <h2 style={{ textAlign: "center", fontSize: 20, fontWeight: 900, color: T.text, margin: "0 0 8px 0" }}>{t("cuenta_mi_identificador", "Mi Identificador")}</h2>
              <p style={{ textAlign: "center", fontSize: 14, color: T.sub, margin: "0 0 24px 0", lineHeight: 1.4 }}>
                {t("cuenta_qr_desc", "Muestra este código al establecimiento para acumular sellos, puntos y canjear tus recompensas.")}
              </p>
              
              <div style={{ background: "#fff", padding: 16, borderRadius: 24, border: "2px solid #E2E8F0", display: "flex", justifyContent: "center", marginBottom: 24 }}>
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`https://citymap.mx/scan/${user.id}`)}`} alt="User QR" style={{ width: 180, height: 180 }} />
              </div>

              <button onClick={() => setShowUserQR(false)} style={{ width: "100%", padding: "14px", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 16, fontSize: 15, fontWeight: 800, color: T.text, cursor: "pointer", fontFamily: "inherit" }}>
                {t("cuenta_cerrar", "Cerrar")}
              </button>
            </div>
          </div>
        , document.body)}
        {/* ── COMPARTIR MI NEGOCIO ── */}
        {/* Antes (PR #240): el modal solo descargaba los 2 QR pelados.
            Ahora es el centro BizShareHub (Redes / Para imprimir /
            QR suelto), el mismo que usa el panel del negocio. */}
        {shareHubBiz && createPortal(
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={() => setShareHubBiz(null)}>
            <div style={{ width: "100%", maxWidth: 420, maxHeight: "92dvh", overflowY: "auto", background: T.white, borderRadius: 24, padding: "32px 24px", animation: "scaleFadeIn .25s cubic-bezier(.34,1.1,.64,1) both", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
              <BizShareHub biz={shareHubBiz} T={T} toast$={toast$} onClose={() => setShareHubBiz(null)} />
            </div>
          </div>
        , document.body)}

        {/* ── HEADER USER INFO ── */}
        {/* Propuesta C (12 Nov 2026, elegida por Jonathan): avatar centrado
            con nombre y correo centrados y alineados a él; en la misma
            fila del avatar, dos botones redondos (44 px): editar
            a la izquierda (abre el mismo modal de edición de siempre) y
            tema a la derecha (el mismo ThemeToggle: setDark). La opción
            de horario automático no se pierde: queda como texto/botón
            pequeño bajo el botón de tema (igual que en ThemeToggle). */}
        <div style={{ padding: "24px 20px 24px", background: T.white, borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Editar perfil — botón redondo */}
            <button type="button" aria-label={t("editar_perfil", "Editar perfil")} title={t("editar_perfil", "Editar perfil")} onClick={startEditProfile}
              style={{ width: 44, height: 44, minWidth: 44, borderRadius: "50%", background: T.bg, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, fontFamily: "inherit" }}>
              <Icon name="edit" size={20} color={T.text} />
            </button>
            {/* Avatar centrado */}
            <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
              {(() => {
                const avatarUrl = user?.user_metadata?.avatar_url || profile?.avatar_url;
                const initials = (user?.user_metadata?.name || profile?.name || user.email || "U").slice(0, 2).toUpperCase();
                return avatarUrl ? (
                  <img src={avatarUrl} alt={t("cuenta_alt_foto_usuario", "Foto de perfil del usuario")} style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: `2px solid ${T.border}` }} />
                ) : (
                  <div style={{ width: 72, height: 72, borderRadius: "50%", background: T.greenL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 800, color: T.green, border: `2px solid ${T.border}` }}>{initials}</div>
                );
              })()}
            </div>
            {/* Tema — botón redondo (mismo ThemeToggle) + horario automático */}
            <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: T.bg, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                <ThemeToggle size={44} round />
              </div>
              {(!themeMode || themeMode === 'auto') ? (
                <span style={{ fontSize: 11, color: T.sub, textAlign: "center", whiteSpace: "nowrap" }}>{lang === 'en' ? 'Automatic' : 'Automático'}</span>
              ) : (
                <button type="button" onClick={() => setThemeMode('auto')} aria-label={lang === 'en' ? 'Use automatic schedule' : 'Usar horario automático'}
                  style={{ padding: 0, border: 0, background: "transparent", color: T.sub, fontFamily: "inherit", fontSize: 11, textDecoration: "underline", textUnderlineOffset: 2, cursor: "pointer", whiteSpace: "nowrap" }}>
                  {lang === 'en' ? 'Automatic' : 'Automático'}
                </button>
              )}
            </div>
          </div>
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <div style={{ fontWeight: 900, fontSize: 20, color: T.text, marginBottom: 2, textAlign: "center" }}>{user?.user_metadata?.name || profile?.name || user.email?.split("@")[0]}</div>
            <div style={{ fontSize: 13, color: T.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "center" }}>{user.email}</div>
            {isAdmin && (
              <button onClick={() => setShowAdmin(true)} style={{ marginTop: 12, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: "6px 10px", fontSize: 11, fontWeight: 800, color: T.text, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 5 }}>
                <Icon name="db" size={12} color={T.text} /> Admin
              </button>
            )}
          </div>
        </div>
        {/* ── MIS TARJETAS DE LEALTAD ── */}
        {/* Carrusel arriba del perfil (PR #242): las tarjetas activas del
            cliente aparecen aquí para tenerlas a la mano, sin ir al menú
            hamburguesa → «Recompensas». Si no tiene ninguna, el
            componente no renderiza nada y la página queda como antes. */}
        <ProfileLoyaltyCarousel user={user} T={T} dark={dark} />

        {/* ── WALLET ── */}
        {wallet.length > 0 && (
          <div style={{ padding: "16px 16px 0", marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.sub, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>{t("mi_billetera", "Mi Billetera")}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {wallet.map(wId => {
                const c = coupons.find(x => x.id === wId);
                if (!c) return null;
                const b = biz.find(x => x.id === c.biz_id);
                const claimedAt = claimedCoupons ? claimedCoupons[wId] : null;
                let timeLeftStr = ""; let isExpired = false; let uniqueCode = c.code;
                if (claimedAt) {
                  const diff = 86400000 - (Date.now() - claimedAt);
                  if (diff <= 0) { isExpired = true; timeLeftStr = t("expirado", "Expirado"); }
                  else { const h = Math.floor(diff / 3600000); const m = Math.floor((diff % 3600000) / 60000); timeLeftStr = `${h}h ${m}m`; }
                  uniqueCode = c.code + "-" + claimedAt.toString().slice(-4);
                }
                return (
                  <div key={c.id} style={{ background: isExpired ? T.bg : "#F5F3FF", opacity: isExpired ? 0.7 : 1, borderRadius: 14, padding: "14px", border: `1.5px dashed ${isExpired ? T.border : "#7C3AED"}`, display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: isExpired ? T.border : "#7C3AED", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 14, flexShrink: 0 }}>{c.discount_pct}%</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 14, color: T.text, textDecoration: isExpired ? "line-through" : "none" }}>{c.title}</div>
                      <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>{b?.name}</div>
                      <div style={{ fontSize: 13, fontWeight: 900, color: isExpired ? T.sub : "#7C3AED", letterSpacing: 2, marginTop: 4 }}>{claimedAt ? uniqueCode : c.code}</div>
                    </div>
                    {claimedAt && <div style={{ fontSize: 10, fontWeight: 800, color: isExpired ? "#DC2626" : "#16A34A", flexShrink: 0 }}>{isExpired ? t("expirado", "Expirado") : timeLeftStr}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── MENU GROUPS ── */}
        <div style={{ padding: "8px 16px 0", textAlign: "left" }}>
          {menuGroups.map((group, gIdx) => (
            <div key={group.title} style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: T.text, marginBottom: 16, marginLeft: 8, letterSpacing: "-0.5px", textAlign: "left" }}>{group.title}</div>
              <div style={{ background: "transparent", borderRadius: 16, overflow: "hidden" }}>
                {group.items.map(({ label, icon, act }, i, arr) => {
                  return (
                    <div key={label} onClick={() => handleMenuAction(act)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 16px", borderBottom: i < arr.length - 1 ? `1px solid ${dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"}` : "none", cursor: "pointer", background: "transparent", transition: "background .15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <Icon name={icon} size={20} color={T.sub} sw={1.5} />
                      <span style={{ fontSize: 15, fontWeight: 500, color: T.text, flex: 1 }}>{label}</span>
                      {act === "user_notifs" && unreadNotifCount > 0 && (
                        <span style={{ minWidth: 20, height: 20, padding: "0 6px", borderRadius: 999, background: "#FF3B30", color: "#fff", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{badgeText(unreadNotifCount)}</span>
                      )}
                      <Icon name="chevron" size={16} color={T.border} sw={2} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* ── NEGOCIOS PENDIENTES ── */}
        {(myBizList.filter(b => b.status === "pending" || b.status === "needs_changes").length > 0 || myClaims.filter(c => c.status === "pending").length > 0) && (
          <div style={{ padding: "16px 16px 0" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.sub, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>{t("mis_solicitudes", "Mis solicitudes")}</div>
            {myBizList.filter(b => b.status === "pending" || b.status === "needs_changes").map(b => (
              <BizRequestCard key={b.id} b={b} T={T} dark={dark} t={t} onEdit={openBizEdit} />
            ))}
            
            {myClaims.filter(c => c.status === "pending").map(claim => {
              const b = biz?.find(x => x.id === claim.business_id);
              if (!b) return null;
              return (
                <div key={claim.id} style={{ background: T.white, borderRadius: 12, padding: "12px 14px", marginBottom: 8, border: `1px solid ${T.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: T.text }}>{b.name}</div>
                      <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>{b.type || b.category}</div>
                    </div>
                    <span style={{ background: T.bg, color: T.text, border: `1px solid ${T.border}`, borderRadius: 20, padding: "3px 10px", fontSize: 10, fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>{t("reclamo_revision", "Reclamo en revisión")}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}


        {/* ── MIS EVENTOS PRIVADOS ── */}
        {myPrivateEvents.length > 0 && (
          <div style={{ padding: "16px 16px 0" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.sub, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>{t("cuenta_mis_eventos_privados", "Mis eventos privados")}</div>
            {myPrivateEvents.map(ev => (
              <div key={ev.id} style={{ background: T.white, borderRadius: 12, padding: "12px 14px", marginBottom: 8, border: `1px solid ${T.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: T.text }}>🔒 {ev.title}</div>
                    <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>{formatPrivateDate(ev)}{ev.time ? ` · ${ev.time}` : ""}{ev.venue_name ? ` · ${ev.venue_name}` : ""}</div>
                  </div>
                  <span style={{ background: T.bg, color: T.text, border: `1px solid ${T.border}`, borderRadius: 20, padding: "3px 10px", fontSize: 10, fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>{t("cuenta_privado", "Privado")}</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => { navigator.clipboard?.writeText(privateEventUrl(ev)); toast$(t("cuenta_enlace_copiado", "Enlace secreto copiado")); }} style={{ flex: 1, padding: "9px 0", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 13, fontWeight: 700, color: T.text, cursor: "pointer", fontFamily: "inherit" }}>{t("cuenta_copiar_enlace", "Copiar enlace")}</button>
                  <button onClick={() => setSelectedEvent(ev)} style={{ flex: 1, padding: "9px 0", background: T.text, border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, color: T.bg, cursor: "pointer", fontFamily: "inherit" }}>{t("cuenta_abrir_evento", "Abrir evento")}</button>
                </div>
                {isPrivateEventHost(ev, user?.id) && (
                  <button onClick={() => confirmDeletePrivateEvent(ev)} disabled={deletingPrivateId === ev.id} style={{ width: "100%", marginTop: 8, padding: "9px 0", background: "transparent", border: "none", fontSize: 13, fontWeight: 700, color: "#D94F3D", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: deletingPrivateId === ev.id ? 0.6 : 1 }}>
                    <Icon name="trash" size={14} color="#D94F3D" /> {deletingPrivateId === ev.id ? t("cuenta_eliminando_evento", "Eliminando…") : t("cuenta_eliminar_evento", "Eliminar evento")}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}


        {/* ── CERRAR SESIÓN ── */}
        <button onClick={doSignOut} style={{ width: "calc(100% - 32px)", margin: "16px 16px 0", padding: "13px 0", background: "transparent", border: "none", fontSize: 14, fontWeight: 600, color: T.sub, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Icon name="log-out" size={16} color={T.sub} /> {t("cerrar_sesion", "Cerrar sesión")}
        </button>

      </>) : !authChecked ? (
        <div style={{ padding: "88px 26px 0", textAlign: "center", opacity: 0.6 }}>
          <div style={{ width: 68, height: 68, borderRadius: 18, background: T.border, margin: "0 auto 18px", animation: "pulse 1.5s infinite" }} />
          <div style={{ width: 140, height: 28, borderRadius: 8, background: T.border, margin: "0 auto" }} />
        </div>
      ) : null}

      {/* ── FOOTER ── */}
      <Footer />

      {/* ── LOYALTY DESIGNER MODAL ── */}
      {loyaltyDesignerBiz && (
        <LoyaltyDesigner 
          business={loyaltyDesignerBiz} 
          onClose={() => setLoyaltyDesignerBiz(null)} 
          T={T} 
        />
      )}

      {/* ── MENU STYLE DESIGNER MODAL ── */}
      {menuDesignerBiz && (
        <MenuStyleDesigner
          business={menuDesignerBiz}
          onClose={() => setMenuDesignerBiz(null)}
          onSaved={() => loadMyBiz(user?.id)?.catch?.(() => {})}
          T={T}
        />
      )}
    </div>
  );
}
