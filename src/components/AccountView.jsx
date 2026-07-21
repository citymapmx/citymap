import { lazy, Suspense, useState } from 'react';
import Icon from './ui/Icon.jsx';
import Uploader from './Uploader.jsx';
import { sb } from '../lib/supabase.js';
import { FONT_BIZ } from '../lib/constants.js';
import { isOpenNow, createSlug } from '../lib/utils.js';
import { useUIStore } from '../store/useUIStore.js';

export default function AccountView({
  user, profile, isAdmin, T, dark, favIds, reviews,
  wallet, coupons, claimedCoupons, biz, myBizList,
  setShowAuth, setAuthMode, setEditBizId, setAddBizForm,
  setShowAddBiz, setOwnerView, setSelected, navigate,
  doSignOut, toast$, viewStyle, setUser, authChecked,
  setShowAdmin, setShowPlans, setDark, setStoreAdminBiz
}) {
  const isOpen = isOpenNow;
  const { installPromptEvent, setInstallPromptEvent } = useUIStore();
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhoto, setEditPhoto] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const startEditProfile = () => {
    setEditName(user?.user_metadata?.name || profile?.name || user.email?.split("@")[0] || "");
    setEditPhoto(user?.user_metadata?.avatar_url || profile?.avatar_url || "");
    setIsEditingProfile(true);
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const d = await sb.updateUser({ data: { name: editName, avatar_url: editPhoto } });
      if (d?.id) setUser(d); else if (d?.user) setUser(d.user);
      setIsEditingProfile(false);
      toast$("Perfil actualizado ✓");
    } catch (e) {
      toast$(e.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const menuGroups = [
    {
      title: "Cuenta",
      items: [
        { label: "Editar perfil", icon: "user", act: "edit_profile" },
        { label: "Notificaciones", icon: "bell", act: "notif" },
      ]
    },
    {
      title: myBizList.filter(b => b.status === "approved").length === 1 
        ? `Mi Negocio (${myBizList.filter(b => b.status === "approved")[0].name})` 
        : "Mi Negocio",
      items: [
        ...myBizList.filter(b => b.status === "approved").flatMap(b => [
          { label: "Editar menú o catálogo", icon: "list", act: `owner_menu_${b.id}` },
          { label: "Editar negocio", icon: "edit", act: `owner_edit_${b.id}` },
          { label: "Reservaciones", icon: "calendar", act: `owner_res_${b.id}` }
        ]),
        ...(!isAdmin ? [{ label: "Agregar mi negocio", icon: "plus", act: "add_biz" }] : []),
        { label: "Planes y precios", icon: "award", act: "plans" },
      ]
    },
    {
      title: "Preferencias",
      items: [
        { label: "Modo Oscuro", icon: dark ? "moon" : "sun", act: "toggle_dark" },
      ]
    },
    {
      title: "App",
      items: [
        { label: "Sobre CityMap", icon: "info", act: "about" },
        ...(!isStandalone && (installPromptEvent || isIOS) ? [{ label: "Instalar App", icon: "download", act: "install_pwa" }] : []),
        { label: "Actualizar App", icon: "refresh", act: "clear_cache" },
      ]
    }
  ];

  const handleMenuAction = (act) => {
    if (act === "no_op") return;
    if (act === "privacy") navigate("privacy");
    if (act === "toggle_dark") setDark(!dark);
    if (act === "install_pwa") {
      if (installPromptEvent) { installPromptEvent.prompt(); installPromptEvent.userChoice.then(r => { if (r.outcome === 'accepted') setInstallPromptEvent(null); }); }
      else if (isIOS) toast$("Toca 'Compartir' ⬆ y luego 'Agregar a Inicio' 📱");
    } else if (act === "edit_profile") startEditProfile();
    else if (act === "plans") setShowPlans(true);
    else if (act === "add_biz") { if (!user) { setShowAuth(true); return; } setShowAddBiz(true); }
    else if (act === "about") navigate("about");
    else if (act === "notif") { if (isAdmin) navigate("admin_notifs"); else navigate("user_notifs"); }
    else if (act === "clear_cache") { if ('serviceWorker' in navigator) { caches.keys().then(n => Promise.all(n.map(c => caches.delete(c)))); } window.location.reload(true); }
    else if (act.startsWith("owner_menu_")) {
      const b = myBizList.find(x => x.id === act.replace("owner_menu_", ""));
      if (b) { setStoreAdminBiz(b); }
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
      if (b) setOwnerView(b);
    }
  };

  return (
    <div style={{ paddingBottom: 84, background: T.white, minHeight: "100vh", ...viewStyle }}>
      {user ? (<>

        {/* ── EDIT PROFILE MODAL ── */}
        {isEditingProfile && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px 20px" }} onClick={() => setIsEditingProfile(false)}>
            <div style={{ width: "100%", maxWidth: 420, background: T.white, borderRadius: 24, padding: "28px 24px 28px", animation: "fadeUp .35s cubic-bezier(.34,1.1,.64,1) both", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
              <div style={{ fontWeight: 800, fontSize: 17, color: T.text, marginBottom: 20, textAlign: "center" }}>Editar Perfil</div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 20 }}>
                {editPhoto ? (
                  <div style={{ position: "relative" }}>
                    <img src={editPhoto} alt="" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover" }} />
                    <button onClick={() => setEditPhoto("")} style={{ position: "absolute", top: -4, right: -4, background: T.red, color: "#fff", border: "none", width: 22, height: 22, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="x" size={11} color="#fff" /></button>
                  </div>
                ) : (
                  <div style={{ width: 80, height: 80, borderRadius: "50%", background: T.bg, border: `1.5px dashed ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    <Uploader avatarMode={true} onDone={url => setEditPhoto(url)} label="Foto" aspect={1} />
                  </div>
                )}
              </div>
              <label style={{ fontSize: 11, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: .6, marginBottom: 6, display: "block" }}>Nombre</label>
              <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Tu nombre" style={{ width: "100%", padding: "12px 14px", border: `1.5px solid ${T.border}`, background: "transparent", borderRadius: 12, fontSize: 15, color: T.text, fontFamily: "inherit", marginBottom: 20 }} />
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setIsEditingProfile(false)} style={{ flex: 1, padding: "12px 0", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12, fontWeight: 700, fontSize: 14, color: T.text, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
                <button onClick={saveProfile} disabled={savingProfile} style={{ flex: 1, padding: "12px 0", background: T.green, border: "none", borderRadius: 12, fontWeight: 700, fontSize: 14, color: "#fff", cursor: "pointer", fontFamily: "inherit", opacity: savingProfile ? 0.7 : 1 }}>{savingProfile ? "Guardando..." : "Guardar"}</button>
              </div>
            </div>
          </div>
        )}

        {/* ── PROFILE HEADER ── */}
        <div style={{ padding: "calc(env(safe-area-inset-top, 0px) + 24px) 16px 16px", background: "transparent", borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {(() => {
              const avatarUrl = user?.user_metadata?.avatar_url || profile?.avatar_url;
              const initials = (user?.user_metadata?.name || profile?.name || user.email || "U").slice(0, 2).toUpperCase();
              return avatarUrl ? (
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <img src={avatarUrl} alt="" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: `2px solid ${T.border}` }} />
                </div>
              ) : (
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div style={{ width: 64, height: 64, borderRadius: "50%", background: T.greenL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: T.green, border: `2px solid ${T.border}` }}>{initials}</div>
                </div>
              );
            })()}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 18, color: T.text, marginBottom: 2 }}>{user?.user_metadata?.name || profile?.name || user.email?.split("@")[0]}</div>
              <div style={{ fontSize: 13, color: T.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</div>
            </div>
            {isAdmin && (
              <button onClick={() => setShowAdmin(true)} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: "8px 12px", fontSize: 12, fontWeight: 700, color: T.text, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                <Icon name="db" size={13} color={T.text} /> Admin
              </button>
            )}
          </div>
        </div>


        {/* ── WALLET ── */}
        {wallet.length > 0 && (
          <div style={{ padding: "16px 16px 0", marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.sub, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>Mi Billetera</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {wallet.map(wId => {
                const c = coupons.find(x => x.id === wId);
                if (!c) return null;
                const b = biz.find(x => x.id === c.biz_id);
                const claimedAt = claimedCoupons ? claimedCoupons[wId] : null;
                let timeLeftStr = ""; let isExpired = false; let uniqueCode = c.code;
                if (claimedAt) {
                  const diff = 86400000 - (Date.now() - claimedAt);
                  if (diff <= 0) { isExpired = true; timeLeftStr = "Expirado"; }
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
                    {claimedAt && <div style={{ fontSize: 10, fontWeight: 800, color: isExpired ? "#DC2626" : "#16A34A", flexShrink: 0 }}>{isExpired ? "Expirado" : timeLeftStr}</div>}
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
              <div style={{ background: dark ? "rgba(255,255,255,0.06)" : "#F3F4F6", borderRadius: 16, overflow: "hidden" }}>
                {group.items.map(({ label, icon, act }, i, arr) => (
                  <div key={label} onClick={() => handleMenuAction(act)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 16px", borderBottom: i < arr.length - 1 ? `1px solid ${dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"}` : "none", cursor: "pointer", background: "transparent", transition: "background .15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <Icon name={icon} size={20} color={T.sub} sw={1.5} />
                    <span style={{ fontSize: 15, fontWeight: 500, color: T.text, flex: 1 }}>{label}</span>
                    {act === "toggle_dark" ? (
                      <div style={{ width: 44, height: 26, borderRadius: 13, background: dark ? T.green : "#D1D5DB", transition: "background 0.25s", position: "relative", flexShrink: 0 }}>
                        <div style={{ position: "absolute", top: 3, left: dark ? 21 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.25)", transition: "left 0.25s cubic-bezier(0.34,1.56,0.64,1)" }} />
                      </div>
                    ) : (
                      <Icon name="chevron" size={16} color={T.border} sw={2} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ── NEGOCIOS PENDIENTES ── */}
        {myBizList.filter(b => b.status !== "approved").length > 0 && (
          <div style={{ padding: "16px 16px 0" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.sub, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>Mis solicitudes</div>
            {myBizList.filter(b => b.status !== "approved").map(b => {
              const stMap = { pending: { lbl: "En revisión", c: "#D97706", bg: "#FEF3C7" }, approved: { lbl: "Aprobado", c: "#16A34A", bg: "#DCFCE7" }, rejected: { lbl: "Rechazado", c: "#D94F3D", bg: "#FEE2E2" }, needs_changes: { lbl: "Requiere cambios", c: "#7C3AED", bg: "#F5F3FF" } };
              const st = stMap[b.status] || stMap.pending;
              return (
                <div key={b.id} style={{ background: T.white, borderRadius: 12, padding: "12px 14px", marginBottom: 8, border: `1px solid ${T.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: T.text }}>{b.name}</div>
                      <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>{b.type || b.category}</div>
                    </div>
                    <span style={{ background: st.bg, color: st.c, borderRadius: 20, padding: "3px 10px", fontSize: 10, fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>{st.lbl}</span>
                  </div>
                  {b.admin_notes && <div style={{ background: T.bg, borderRadius: 8, padding: "8px 10px", fontSize: 12, color: T.sub, borderLeft: `3px solid ${st.c}`, marginBottom: 8 }}>{b.admin_notes}</div>}
                  {b.status === "needs_changes" && <button onClick={() => { setEditBizId(b.id); setAddBizForm({ name: b.name || "", category: b.category || b.type || "", emoji: b.emoji || "", description: b.description || "", address: b.address || "", city: b.city_slug || "", phone: b.phone || "", whatsapp: b.whatsapp || "", website: b.website || "", lat: b.lat || "", lng: b.lng || "", photos: b.photos?.map(p => p.url) || [], facebook: b.facebook || "", instagram: b.instagram || "", tiktok: b.tiktok || "", schedule: b.schedule || {}, owner_id: b.owner_id, user_id: b.user_id, plan: b.plan, status: b.status, video_url: b.video_url || "", logo_url: b.logo_url || "", menu_pdf_url: b.menu_pdf_url || "", booking_config: b.booking_config || null }); setShowAddBiz(true); }} style={{ width: "100%", padding: "9px 0", background: "#F5F3FF", border: "1.5px solid #7C3AED", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#7C3AED", cursor: "pointer", fontFamily: "inherit" }}>Editar y reenviar</button>}
                </div>
              );
            })}
          </div>
        )}

        {/* ── CERRAR SESIÓN ── */}
        <button onClick={doSignOut} style={{ width: "calc(100% - 32px)", margin: "16px 16px 0", padding: "13px 0", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 14, fontSize: 15, fontWeight: 700, color: T.red, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Icon name="log-out" size={17} color={T.red} /> Cerrar sesión
        </button>

      </>) : !authChecked ? (
        <div style={{ padding: "88px 26px 0", textAlign: "center", opacity: 0.6 }}>
          <div style={{ width: 68, height: 68, borderRadius: 18, background: T.border, margin: "0 auto 18px", animation: "pulse 1.5s infinite" }} />
          <div style={{ width: 140, height: 28, borderRadius: 8, background: T.border, margin: "0 auto 16px", animation: "pulse 1.5s infinite" }} />
        </div>
      ) : (
        <div style={{ padding: "88px 26px 0", textAlign: "center" }}>
          <div style={{ width: 68, height: 68, borderRadius: 18, background: T.greenL, margin: "0 auto 18px", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="user" size={30} color={T.green} /></div>
          <h2 style={{ fontFamily: "'Coolvetica', sans-serif", fontSize: 24, color: T.text, marginBottom: 9 }}>Tu cuenta</h2>
          <p style={{ color: T.sub, fontSize: 15, lineHeight: 1.65, marginBottom: 28 }}>Inicia sesión para guardar favoritos, escribir reseñas y acceder desde cualquier dispositivo.</p>
          <button className="btn-g press" onClick={() => setShowAuth(true)}>Iniciar sesión</button>
          <button className="btn-s press" style={{ marginTop: 11 }} onClick={() => { setAuthMode("register"); setShowAuth(true); }}>Crear cuenta gratis</button>
          <div onClick={() => toast$("¡Crea una cuenta gratis y registra tu negocio para ver los planes! 🏢")} style={{ marginTop: 18, padding: "12px 16px", background: T.greenL, borderRadius: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
            <Icon name="award" size={20} color={T.green} />
            <div style={{ flex: 1, textAlign: "left" }}><div style={{ fontWeight: 700, fontSize: 14, color: T.text }}>Ver planes para tu negocio</div><div style={{ fontSize: 12, color: T.sub, marginTop: 1 }}>Gratuito, Destacado y Premium</div></div>
            <Icon name="chevron" size={16} color={T.sub} />
          </div>
        </div>
      )}

      {/* ── FOOTER ── */}
      <div style={{ textAlign: "center", marginTop: 28, paddingBottom: 24, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
          <span onClick={() => navigate("privacy")} style={{ fontSize: 12, color: T.sub, textDecoration: "underline", cursor: "pointer" }}>Aviso de Privacidad</span>
          <span style={{ fontSize: 12, color: T.border }}>•</span>
          <span onClick={() => navigate("terms")} style={{ fontSize: 12, color: T.sub, textDecoration: "underline", cursor: "pointer" }}>Términos de Uso</span>
          <span style={{ fontSize: 12, color: T.border }}>•</span>
          <span onClick={() => window.location.href = "mailto:soporte@citymap.mx"} style={{ fontSize: 12, color: T.sub, textDecoration: "underline", cursor: "pointer" }}>Contacto</span>
        </div>
        <div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 600, letterSpacing: 0.5 }}>CityMap v1.0.0</div>
      </div>
    </div>
  );
}
