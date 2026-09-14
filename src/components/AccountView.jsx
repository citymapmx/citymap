import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Icon from './ui/Icon.jsx';
import Uploader from './Uploader.jsx';
import { sb } from '../lib/supabase.js';
import { isOpenNow, createSlug, cleanCityPrefix } from '../lib/utils.js';
import { useUIStore } from '../store/useUIStore.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { useDataStore } from '../store/useDataStore.js';
import { useAppContext } from '../context/AppContext';
import Footer from './Footer.jsx';
import LoyaltyDesigner from './loyalty/LoyaltyDesigner.jsx';
import { useTranslation } from '../hooks/useTranslation.js';
export default function AccountView({
  user, profile, isAdmin, T, dark, favIds, reviews,
  wallet, coupons, claimedCoupons, biz, myBizList,
  setShowAuth, setAuthMode, setEditBizId, setAddBizForm,
  setShowAddBiz, setOwnerView, setSelected, navigate,
  doSignOut, toast$, viewStyle, setUser, authChecked,
  setShowAdmin, setShowPlans, setDark, setStoreAdminBiz
}) {
  const { t, lang } = useTranslation();
  const isOpen = isOpenNow;
  const { installPromptEvent, setInstallPromptEvent } = useUIStore();
  const { events } = useDataStore();
  const ctx = useAppContext();
  const { savedEventIds, setSelectedEvent } = ctx;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhoto, setEditPhoto] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [qrModalBiz, setQrModalBiz] = useState(null);
  const [loyaltyDesignerBiz, setLoyaltyDesignerBiz] = useState(null);

  const [myClaims, setMyClaims] = useState([]);
  useEffect(() => {
    if (!user) return;
    sb.get("business_claims", `?user_id=eq.${user.id}`).then(res => {
       
      if (Array.isArray(res)) setMyClaims(res);
    });
  }, [user]);

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
      setIsEditingProfile(false);
      toast$(t("perfil_actualizado", "Perfil actualizado ✓"));
    } catch (e) {
      toast$(e.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const menuGroups = [
    {
      title: t("cuenta", "Cuenta"),
      items: [
        { label: t("mis_favoritos", "Mis Favoritos"), icon: "heart", act: "favs" },
        { label: t("mis_planes_itin", "Mis Planes (Itinerarios)"), icon: "map", act: "itineraries" },
        { label: t("editar_perfil", "Editar perfil"), icon: "user", act: "edit_profile" },
        { label: t("notificaciones", "Notificaciones"), icon: "bell", act: "user_notifs" },
        ...(isAdmin ? [{ label: "Notificaciones de Admin", icon: "shield", act: "admin_notifs" }] : [])
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
              { label: "Estadísticas", icon: "trending", act: `owner_stats_${b.id}` },
              { label: "Tarjetas de Lealtad (Wallet)", icon: "award", act: `owner_loyalty_${b.id}` },
              { label: t("descargar_qr", "Descargar Códigos QR"), icon: "grid", act: `owner_qr_${b.id}` }
            );
          }
          if (b.plan === "premium" || b.plan === "elite" || b.plan === "pro") {
            items.push({ label: t("editar_menu_cat", "Editar menú o catálogo"), icon: "list", act: `owner_menu_${b.id}` });
          }
          items.push(
            { label: t("editar_negocio", "Editar negocio"), icon: "edit", act: `owner_edit_${b.id}` }
          );
          return items;
        }),
        ...(!isAdmin ? [{ label: t("agregar_negocio", "Agregar mi negocio"), icon: "plus", act: "add_biz" }] : []),
        { label: t("planes_precios", "Planes y precios"), icon: "award", act: "plans" },
      ]
    },
    {
      title: t("app", "App"),
      items: [
        { label: t("sobre_citymap", "Sobre CityMap"), icon: "info", act: "about" },
        ...(!isStandalone && (installPromptEvent || isIOS) ? [{ label: t("instalar_app", "Instalar App"), icon: "download", act: "install_pwa" }] : []),
      ]
    }
  ];

  const handleMenuAction = (act) => {
    if (act === "no_op") return;
    if (act === "privacy") navigate("privacy");
    if (act === "toggle_dark") setDark(!dark);
    if (act === "install_pwa") {
      if (installPromptEvent) { installPromptEvent.prompt(); installPromptEvent.userChoice.then(r => { if (r.outcome === 'accepted') setInstallPromptEvent(null); }); }
      else if (isIOS) toast$(t("instruccion_ios", "Toca 'Compartir' ⬆ y luego 'Agregar a Inicio' 📱"));
    } else if (act === "edit_profile") startEditProfile();
    else if (act === "favs") navigate("favs");
    else if (act === "itineraries") navigate("itineraries");
    else if (act === "plans") setShowPlans(true);
    else if (act === "add_biz") { if (!user) { setShowAuth(true); return; } setShowAddBiz(true); }
    else if (act === "about") navigate("about");
    else if (act === "user_notifs") navigate("user_notifs");
    else if (act === "admin_notifs") navigate("admin_notifs");
    else if (act === "clear_cache") { if ('serviceWorker' in navigator) { caches.keys().then(n => Promise.all(n.map(c => caches.delete(c)))); } window.location.reload(true); }
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
      if (b) {
        setEditBizId(b.id);
        setAddBizForm({ name: b.name || "", category: b.category || b.type || "", emoji: b.emoji || "", description: b.description || "", address: b.address || "", city: b.city_slug || "", phone: b.phone || "", whatsapp: b.whatsapp || "", website: b.website || "", lat: b.lat || "", lng: b.lng || "", photos: b.photos?.map(p => p.url) || [], facebook: b.facebook || "", instagram: b.instagram || "", tiktok: b.tiktok || "", schedule: b.schedule || {}, owner_id: b.owner_id, user_id: b.user_id, plan: b.plan, status: b.status, video_url: b.video_url || "", logo_url: b.logo_url || "", menu_pdf_url: b.menu_pdf_url || "", booking_config: b.booking_config || null });
        setShowAddBiz(true);
      }
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
    else if (act.startsWith("owner_qr_")) {
      const b = myBizList.find(x => x.id === act.replace("owner_qr_", ""));
      if (b) setQrModalBiz(b);
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
                    <img src={editPhoto} alt="" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover" }} />
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
                <button onClick={() => setIsEditingProfile(false)} style={{ flex: 1, padding: "12px 0", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12, fontWeight: 700, fontSize: 14, color: T.text, cursor: "pointer", fontFamily: "inherit" }}>{t("cancelar", "Cancelar")}</button>
                <button onClick={saveProfile} disabled={savingProfile} style={{ flex: 1, padding: "12px 0", background: T.green, border: "none", borderRadius: 12, fontWeight: 700, fontSize: 14, color: "#fff", cursor: "pointer", fontFamily: "inherit", opacity: savingProfile ? 0.7 : 1 }}>{savingProfile ? t("guardando", "Guardando...") : t("guardar", "Guardar")}</button>
              </div>
            </div>
          </div>
        , document.body)}

