import { useState, useEffect } from 'react';
import Uploader from './Uploader.jsx';
import { sb, cloudDelete } from '../lib/supabase.js';
import { useTranslation } from '../hooks/useTranslation.js';
import { useUIStore } from '../store/useUIStore.js';
import { useDataStore } from '../store/useDataStore.js';
import { getBusinessPricing, buildBusinessPlans } from '../lib/businessPlans.js';
import { getCountryCode } from '../lib/domain.js';
import {
  WIZARD_DAYS, WIZARD_DEFAULT_OPEN, WIZARD_DEFAULT_CLOSE,
  to12h, parseDayRange, isDayOpen, openDaysOf, buildSchedule,
  firstDayRange, isAdvancedSchedule,
  effectivePlanFeatures, comparePlanFeatures, planPrice,
  isPaidPlanKey, hasTrial, parsePriceNumber,
} from '../lib/crearNegocio.js';

export default function AddBizModal({
  showAddBiz,
  setShowAddBiz,
  editBizId,
  setEditBizId,
  addBizForm,
  setAddBizForm,
  user,
  activeCity,
  cats,
  biz,
  setBiz,
  loadPaginatedBiz,
  loadMapPins,
  loadMyBiz,
  setShowPlans,
  toast$,
  T,
  pendingPlan,
  setPendingPlan,
}) {
  const [addBizLoading, setAddBizLoading] = useState(false);
  const { t } = useTranslation();
  const dark = useUIStore(s => s.dark);
  const cities = useDataStore(s => s.cities);
  // Asistente de 3 pasos (solo creación): paso, plan elegido y periodo.
  // Si se llegó desde /negocios con un plan de pago, queda preseleccionado.
  const [step, setStep] = useState(1);
  const [planKey, setPlanKey] = useState(pendingPlan?.key || 'free');
  const [billing, setBilling] = useState(pendingPlan?.billing === 'annual' ? 'annual' : 'monthly');
  const [expandedPlan, setExpandedPlan] = useState(null);
  const [showCompare, setShowCompare] = useState(false);
  const initialRange = (() => {
    const s = addBizForm.schedule || {};
    for (const [key] of WIZARD_DAYS) {
      const r = parseDayRange(s[key]);
      if (r) return r;
    }
    return null;
  })();
  const [openTime, setOpenTime] = useState(initialRange?.open || WIZARD_DEFAULT_OPEN);
  const [closeTime, setCloseTime] = useState(initialRange?.close || WIZARD_DEFAULT_CLOSE);
  // Al abrir la edición: empezar en el paso 1 y prellenar Abre/Cierra con
  // el primer día abierto del horario guardado (los estados solo se
  // inicializan al montar el componente, no al abrir el modal).
  // Va ANTES del return de showAddBiz: los hooks no pueden ir después de
  // un return condicional.
  useEffect(() => {
    if (!showAddBiz || !editBizId) return;
    const r = firstDayRange(addBizForm.schedule);
    if (r) { setOpenTime(r.open); setCloseTime(r.close); }
    setStep(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAddBiz, editBizId]);
  if (!showAddBiz) return null;

  // EDICIÓN = el mismo asistente, prellenado, en 2 pasos (sin plan ni
  // pago: el plan no se cambia aquí, sigue por «Ver planes»).
  const isEdit = Boolean(editBizId);
  // Dueño = owner_id o user_id coinciden. El formulario viejo solo miraba
  // owner_id: un negocio creado con el asistente (user_id, owner_id null)
  // lo trataba como si no fuera del dueño (checkbox, «¿Por qué lo
  // recomiendas?», ciudad en minúscula...).
  const isBizOwner = isEdit && (addBizForm.owner_id === user?.id || addBizForm.user_id === user?.id);
  const isPremium = addBizForm.plan === "destacado" || addBizForm.plan === "premium" || addBizForm.plan === "pro";
  const isFreeOwner = isEdit && isBizOwner && !isPremium;
  // Edición limitada (dueño gratuito o no dueño): nombre, fotos y
  // logotipo estáticos; sin WhatsApp ni horario; solo teléfono y
  // dirección editables. El dueño con plan de pago edita los pasos 1–2
  // completos. La descripción y la dirección se editan en ambos casos.
  const isLimitedEdit = isEdit && (!isBizOwner || !isPremium);
  const totalSteps = isEdit ? 2 : 3;
  // Horario avanzado (tipo distinto de regular o varios turnos por día):
  // el asistente de píldoras no lo representa; en edición no se toca y
  // se gestiona en el administrador. El horario guardado se reenvía tal
  // cual (submitForm lo manda de vuelta sin cambios).
  const advancedSchedule = isEdit && isAdvancedSchedule(addBizForm.schedule);
  const citySlug = addBizForm.city || activeCity;
  const cityName = cities.find(c => c.slug === citySlug)?.name || (citySlug ? citySlug.charAt(0).toUpperCase() + citySlug.slice(1) : '');
  const close = () => { setShowAddBiz(false); setEditBizId(null); setStep(1); };

  // Estilo Apple del asistente: claro #F5F5F7, oscuro premium.
  const blue = dark ? '#2997FF' : '#0071E3';
  const pageBg = dark ? '#000000' : '#F5F5F7';
  const cardBg = dark ? '#1C1C1E' : '#FFFFFF';
  const inputBg = dark ? '#2C2C2E' : '#F2F2F7';
  const hairline = dark ? '#3A3A3C' : '#E5E5EA';
  const primaryBg = dark ? '#FFFFFF' : blue;
  const primaryColor = dark ? '#000000' : '#FFFFFF';
  const backBg = dark ? '#2C2C2E' : '#E9E9EE';
  const inputStyle = { width: '100%', padding: '11px 12px', borderRadius: 12, background: inputBg, color: T.text, fontSize: 15, outline: 'none', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 6 };
  const captionStyle = { fontSize: 12, color: T.sub, marginTop: 6, lineHeight: 1.45 };
  const primaryBtn = { flex: 1, padding: '13px 16px', border: 'none', borderRadius: 999, background: primaryBg, color: primaryColor, fontSize: 15, fontWeight: 700, cursor: 'pointer' };
  const backBtn = { padding: '13px 20px', border: 'none', borderRadius: 999, background: backBg, color: T.text, fontSize: 15, fontWeight: 600, cursor: 'pointer' };

  // Planes (precios por ciudad, como /negocios).
  const countryCode = getCountryCode(activeCity, cities);
  const pricing = getBusinessPricing(countryCode);
  const plans = buildBusinessPlans(t, pricing, dark);
  const selectedPlan = plans.find(p => p.key === planKey) || plans[0];
  const isPaid = isPaidPlanKey(planKey);
  const compareRows = comparePlanFeatures(plans);
  const planPriceText = (plan) => {
    if (plan.key === 'free') return plan.priceMonthly;
    return `${planPrice(plan, billing)}${billing === 'annual' ? `/${t('cuenta_ano', 'año')}` : `/${t('cuenta_mes', 'mes')}`}`;
  };
  const annualLine = (plan) => {
    const total = parsePriceNumber(plan.priceAnnual);
    if (Number.isNaN(total)) return '';
    const monthly = Math.round(total / 12);
    return t('crear_negocio_pagas_ano', 'Pagas ${total} al año (${mensual} al mes). Se cobra el importe completo del año.', { total: `${pricing.symbol}${total.toLocaleString('es-MX')}`, mensual: `${pricing.symbol}${monthly}` });
  };

  // Horario del asistente (paso 2): días abiertos + horario compartido.
  const schedule = addBizForm.schedule || {};
  const setSchedule = (next) => setAddBizForm(f => ({ ...f, schedule: next }));
  const toggleDay = (key) => {
    const next = { ...schedule };
    if (isDayOpen(schedule, key)) next[key] = 'Cerrado';
    else next[key] = `${to12h(openTime)} - ${to12h(closeTime)}`;
    setSchedule(next);
  };
  const changeTime = (which, value24) => {
    const nextOpen = which === 'open' ? value24 : openTime;
    const nextClose = which === 'close' ? value24 : closeTime;
    if (which === 'open') setOpenTime(value24); else setCloseTime(value24);
    const next = { ...schedule };
    for (const [key] of WIZARD_DAYS) {
      if (isDayOpen(next, key)) next[key] = `${to12h(nextOpen)} - ${to12h(nextClose)}`;
    }
    setSchedule(next);
  };
  const goStep2 = () => {
    if (!addBizForm.name || !addBizForm.category || !citySlug) { toast$('Nombre, categoría y ciudad son obligatorios'); return; }
    // Solo en creación se abren todos los días por defecto. En edición el
    // horario guardado se respeta tal cual (si no tiene días, el dueño los
    // elige en el paso 2).
    if (!isEdit && openDaysOf(schedule).length === 0) {
      setSchedule(buildSchedule(WIZARD_DAYS.map(([k]) => k), openTime, closeTime));
    }
    setStep(2);
  };

  // Envío (creación y edición): la lógica es la de siempre; solo cambia
  // que al crear con plan de pago se fija el plan pendiente para que App
  // abra el pago de Stripe en cuanto el negocio exista.
  const submitForm = async () => {
    if (!addBizForm.name || !addBizForm.category || !(addBizForm.city || activeCity)) { toast$("Nombre, categoría y ciudad son obligatorios"); return; }
    setAddBizLoading(true);
    try {
      const existingBiz = biz.find(b => b.id === editBizId);
      const isOwner = user && (existingBiz?.owner_id === user.id || existingBiz?.user_id === user.id || addBizForm.owner_id === user.id || addBizForm.user_id === user.id || addBizForm.is_owner);

      let newStatus = "pending";
      if (editBizId) {
        // Es una edición de un negocio existente
        if (addBizForm.status === "approved" || existingBiz?.status === "approved") {
          newStatus = "approved"; // Si ya estaba aprobado, se queda aprobado (ej. dueños editando su perfil)
        }
      }
      let finalCitySlug = addBizForm.city || activeCity;
      finalCitySlug = finalCitySlug ? finalCitySlug.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') : "zapopan";

      const parseCoord = (val) => {
        if (val === "" || val === null || val === undefined) return null;
        const num = Number(val);
        return isNaN(num) ? null : num;
      };

      const payload = {
        name: addBizForm.name,
        type: addBizForm.category,
        category: addBizForm.category,
        emoji: null,
        description: addBizForm.description,
        address: addBizForm.address,
        city_slug: finalCitySlug,
        phone: addBizForm.phone,
        whatsapp: addBizForm.whatsapp,
        website: addBizForm.website,
        video_url: addBizForm.video_url || null,
        logo_url: addBizForm.logo_url || null,
        mercado_libre_nickname: addBizForm.mercado_libre_nickname || null,
        lat: parseCoord(addBizForm.lat),
        lng: parseCoord(addBizForm.lng),
        tags: typeof addBizForm.tags === "string" ? addBizForm.tags.split(",").map(t => t.trim()).filter(Boolean) : addBizForm.tags,
        schedule: addBizForm.schedule || {},
        social_links: {
          facebook: addBizForm.facebook || null,
          instagram: addBizForm.instagram || null,
          tiktok: addBizForm.tiktok || null
        },
        menu_pdf_url: addBizForm.menu_pdf_url || null,
        booking_config: addBizForm.booking_config || null,
        photos: (addBizForm.photos || []).map(url => ({ url })),
        status: newStatus
      };
      if (editBizId) {
        await sb.patch("businesses", editBizId, payload);
        setBiz(prev => prev.map(x => x.id === editBizId ? { ...x, ...payload } : x));
      } else {
        await sb.post("businesses", { ...payload, plan: "free", user_id: user.id });
        // Plan elegido en el asistente: con plan de pago se abre el pago
        // de Stripe en cuanto el negocio exista (el efecto de App abre
        // PlanPaymentModal al ver pendingPlan + myBizList); con gratis
        // se cancela cualquier plan pendiente anterior.
        if (isPaidPlanKey(planKey)) setPendingPlan?.({ key: planKey, billing });
        else setPendingPlan?.(null);
      }
      toast$(editBizId ? (isOwner ? "Perfil actualizado" : "Solicitud actualizada") : t('crear_negocio_creado', '¡Tu negocio fue creado!'));
      if (isOwner && newStatus === "approved") {
        loadPaginatedBiz(true);
        loadMapPins(activeCity);
      }
      setShowAddBiz(false); setEditBizId(null);
      setAddBizForm({ name: "", category: "", city: "", description: "", address: "", phone: "", whatsapp: "", website: "", mercado_libre_nickname: "", video_url: "", logo_url: "", lat: "", lng: "", tags: [], photos: [], facebook: "", instagram: "", tiktok: "", schedule: {} });
      setStep(1); setPlanKey('free'); setBilling('monthly'); setExpandedPlan(null); setShowCompare(false);
      await loadMyBiz(user?.id);
    } catch(e) { toast$("Error: " + e.message); } finally { setAddBizLoading(false); }
  };

  // ── Asistente estilo Apple: 3 pasos en creación, 2 en edición ───────
  // (en edición no hay paso 3: ni selección de plan ni pago).
  {
    const stepTitle = step === 1 ? t('crear_negocio_paso1', 'Tu negocio') : step === 2 ? t('crear_negocio_paso2', 'Contacto y horario') : t('crear_negocio_paso3', 'Elige tu plan');
    const stepSub = step === 1
      ? (isEdit ? t('crear_negocio_editar_sub', 'Corrige la información y reenvía para revisión') : t('crear_negocio_paso1_sub', 'Lo básico para que tu negocio aparezca en CityMap.'))
      : step === 2 ? t('crear_negocio_paso2_sub', 'Cómo te contactan tus clientes.') : t('crear_negocio_paso3_sub', 'Puedes empezar gratis y cambiar cuando quieras.');
    // Botón final de la edición: reenviar si estaba en cambios o en
    // revisión; guardar si ya estaba aprobado (se queda aprobado).
    const editSubmitLabel = addBizForm.status === 'approved'
      ? t('crear_negocio_guardar', 'Guardar cambios')
      : t('crear_negocio_actualizar', 'Actualizar y reenviar');
    return (
      <div className="ov" onClick={close}>
        <div className="sh crear-negocio" style={{ maxHeight: '94vh', overflowY: 'auto', background: pageBg, '--cn-input-bg': inputBg, '--cn-text': T.text, '--cn-hairline': dark ? '#3F3F46' : '#E5E7EB', '--cn-blue': blue }} onClick={e => e.stopPropagation()}>
          <style>{`
            .crear-negocio .cn-input { border: 1px solid var(--cn-hairline); }
            .crear-negocio .cn-input:focus { border-color: var(--cn-blue); outline: none; }
            .crear-negocio .cn-input:-webkit-autofill,
            .crear-negocio .cn-input:-webkit-autofill:hover,
            .crear-negocio .cn-input:-webkit-autofill:focus {
              -webkit-box-shadow: 0 0 0 1000px var(--cn-input-bg) inset;
              -webkit-text-fill-color: var(--cn-text);
              caret-color: var(--cn-text);
              transition: background-color 9999s ease-in-out 0s;
            }
          `}</style>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 17, fontWeight: 800, color: T.text }}>{isEdit ? t('crear_negocio_editar_titulo', 'Actualizar negocio') : t('crear_negocio_titulo', 'Crea tu negocio')}</span>
            <button onClick={close} style={{ background: backBg, border: 'none', borderRadius: '50%', width: 28, height: 28, color: T.text, fontSize: 14, cursor: 'pointer' }}>✕</button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: blue }}>{isEdit ? t('crear_negocio_paso_de_2', 'Paso ${n} de 2', { n: step }) : t('crear_negocio_paso_de', 'Paso ${n} de 3', { n: step })}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: T.sub }}>{stepTitle}</span>
          </div>
          <div style={{ display: 'flex', gap: 6, margin: '10px 0 20px' }}>
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map(i => <div key={i} style={{ flex: 1, height: 4, borderRadius: 999, background: i <= step ? blue : hairline }} />)}
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', color: T.text, margin: '0 0 6px' }}>{stepTitle}</h2>
          <p style={{ fontSize: 14, color: T.sub, margin: '0 0 20px' }}>{stepSub}</p>

          {step === 1 && (
            <div>
              <div style={{ marginBottom: 18 }}>
                <span style={labelStyle}>{t('crear_negocio_logotipo', 'Logotipo')}</span>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  {isLimitedEdit ? (
                    addBizForm.logo_url ? (
                      <img src={addBizForm.logo_url} alt={t('crear_negocio_logotipo', 'Logotipo')} style={{ width: 68, height: 68, objectFit: 'cover', borderRadius: '50%', display: 'block', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 68, height: 68, borderRadius: '50%', background: inputBg, flexShrink: 0 }} />
                    )
                  ) : addBizForm.logo_url ? (
                    <div style={{ position: 'relative', width: 68, height: 68, flexShrink: 0 }}>
                      <img src={addBizForm.logo_url} alt={t('crear_negocio_logotipo', 'Logotipo')} style={{ width: 68, height: 68, objectFit: 'cover', borderRadius: '50%', display: 'block' }} />
                      <button type="button" aria-label="Quitar logotipo" onClick={() => { const u = addBizForm.logo_url; setAddBizForm(f => ({ ...f, logo_url: '' })); if (u) cloudDelete(u).catch(() => {}); }} style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#FF3B30', color: '#fff', border: 'none', fontSize: 12, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                    </div>
                  ) : (
                    <Uploader aspect={1} compact circle label={t('crear_negocio_logotipo', 'Logotipo')} onDone={(url) => setAddBizForm(f => ({ ...f, logo_url: url }))} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={captionStyle}>{t('crear_negocio_logotipo_texto', 'Se muestra en tu ficha. En el mapa, el logotipo es función del plan Premium.')}</div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <span style={labelStyle}>{t('crear_negocio_fotos', 'Fotos')}</span>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  {(addBizForm.photos || []).map((url, i) => (
                    <div key={url} style={{ position: 'relative', width: 68, height: 68 }}>
                      <img src={url} alt="" style={{ width: 68, height: 68, objectFit: 'cover', borderRadius: 16, display: 'block' }} />
                      {!isLimitedEdit && (
                        <button type="button" aria-label="Quitar foto" onClick={() => { setAddBizForm(f => ({ ...f, photos: f.photos.filter((_, j) => j !== i) })); cloudDelete(url).catch(() => {}); }} style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#FF3B30', color: '#fff', border: 'none', fontSize: 12, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                      )}
                    </div>
                  ))}
                  {!isLimitedEdit && (addBizForm.photos || []).length < 3 && (
                    <Uploader multiple compact label="Agregar foto" onDone={(url) => setAddBizForm(f => ({ ...f, photos: [...(f.photos || []), url] }))} />
                  )}
                </div>
                {!isLimitedEdit && <div style={captionStyle}>{t('crear_negocio_fotos_hasta', 'Hasta 3 fotos.')}</div>}
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={labelStyle}>{t('crear_negocio_nombre', 'Nombre del negocio')}</label>
                {isLimitedEdit ? (
                  <div className="cn-input" style={{ ...inputStyle, color: T.sub }}>{addBizForm.name}</div>
                ) : (
                  <input className="cn-input" style={inputStyle} value={addBizForm.name} onChange={e => setAddBizForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej. Nokai Sushi" autoComplete="off" />
                )}
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={labelStyle}>{t('crear_negocio_categoria', 'Categoría')}</label>
                {isEdit ? (
                  <div className="cn-input" style={{ ...inputStyle, color: T.sub }}>{addBizForm.category}</div>
                ) : (
                  <select className="cn-input" style={{ ...inputStyle, appearance: 'auto' }} value={addBizForm.category} onChange={e => setAddBizForm(f => ({ ...f, category: e.target.value }))}>
                    <option value="">Seleccionar...</option>
                    {(cats || []).map(c => <option key={c.id} value={c.label}>{c.label}</option>)}
                  </select>
                )}
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={labelStyle}>{t('crear_negocio_descripcion', 'Descripción corta')}</label>
                <textarea className="cn-input" style={{ ...inputStyle, minHeight: 80, resize: 'none' }} value={addBizForm.description} onChange={e => setAddBizForm(f => ({ ...f, description: e.target.value }))} placeholder={t('crear_negocio_descripcion_ph', 'Cuéntanos de tu negocio...')} rows={3} />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={labelStyle}>{t('crear_negocio_ciudad', 'Ciudad')}</label>
                <div className="cn-input" style={{ ...inputStyle, color: T.text }}>{cityName}</div>
              </div>

              <div style={{ marginBottom: 22 }}>
                <label style={labelStyle}>{t('crear_negocio_direccion', 'Dirección')}</label>
                <input className="cn-input" style={inputStyle} value={addBizForm.address} onChange={e => setAddBizForm(f => ({ ...f, address: e.target.value }))} placeholder={`Av. México 123, Col. Centro, ${cityName}`} autoComplete="off" />
              </div>

              <button type="button" onClick={goStep2} style={{ ...primaryBtn, flex: 'none', width: '100%' }}>{t('crear_negocio_siguiente', 'Siguiente')}</button>
            </div>
          )}

          {step === 2 && (
            <div>
              {isFreeOwner ? (
                <>
                  <div style={{ marginBottom: 18 }}>
                    <label style={labelStyle}>{t('crear_negocio_telefono', 'Teléfono')}</label>
                    <input className="cn-input" style={inputStyle} type="tel" value={addBizForm.phone} onChange={e => setAddBizForm(f => ({ ...f, phone: e.target.value }))} placeholder="311 000 0000" autoComplete="off" />
                  </div>
                  <div style={{ marginTop: 6, marginBottom: 22, padding: 16, background: 'linear-gradient(135deg, #C9A84C22, #F59E0B11)', border: '1.5px solid #C9A84C55', borderRadius: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#92400E', marginBottom: 6 }}>★ {t('crear_negocio_gratis_titulo', 'Plan gratuito activo')}</div>
                    <p style={{ fontSize: 12, color: '#92400E', opacity: 0.85, lineHeight: 1.5, margin: 0 }}>{t('crear_negocio_gratis_texto', 'Con el plan gratuito solo puedes actualizar tu teléfono y dirección. Sube de nivel para editar fotos, horarios, WhatsApp, redes sociales y más.')}</p>
                  </div>
                </>
              ) : (
                <>
                  {!isLimitedEdit && (
                    <div style={{ marginBottom: 12 }}>
                      <label style={labelStyle}>{t('crear_negocio_whatsapp', 'WhatsApp')}</label>
                      <input className="cn-input" style={inputStyle} type="tel" value={addBizForm.whatsapp} onChange={e => setAddBizForm(f => ({ ...f, whatsapp: e.target.value }))} placeholder="311 000 0000" autoComplete="off" />
                    </div>
                  )}

                  <div style={{ marginBottom: 18 }}>
                    <label style={labelStyle}>{t('crear_negocio_telefono', 'Teléfono')}</label>
                    <input className="cn-input" style={inputStyle} type="tel" value={addBizForm.phone} onChange={e => setAddBizForm(f => ({ ...f, phone: e.target.value }))} placeholder="311 000 0000" autoComplete="off" />
                  </div>

                  {!isLimitedEdit && (
                    advancedSchedule ? (
                      <div style={{ marginBottom: 22 }}>
                        <span style={labelStyle}>{t('crear_negocio_horario', 'Horario')}</span>
                        <div style={captionStyle}>{t('crear_negocio_horario_avanzado', 'Tu horario avanzado se gestiona en tu administrador.')}</div>
                      </div>
                    ) : (
                      <div style={{ marginBottom: 22 }}>
                        <span style={labelStyle}>{t('crear_negocio_horario', 'Horario')}</span>
                        <div style={{ fontSize: 13, color: T.sub, marginBottom: 8 }}>{t('crear_negocio_que_dias', '¿Qué días abres?')}</div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {WIZARD_DAYS.map(([key, label]) => {
                            const open = isDayOpen(schedule, key);
                            return (
                              <button key={key} type="button" aria-pressed={open} onClick={() => toggleDay(key)} style={{ flex: '1 1 0', minWidth: 0, padding: '9px 0', border: 'none', borderRadius: 999, background: open ? blue : backBg, color: open ? '#FFFFFF' : T.sub, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                                {label}
                              </button>
                            );
                          })}
                        </div>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginTop: 12 }}>
                          <label style={{ flex: 1, minWidth: 0 }}>
                            <span style={labelStyle}>{t('crear_negocio_abre', 'Abre')}</span>
                            <input type="time" value={openTime} onChange={e => changeTime('open', e.target.value)} className="cn-input" style={inputStyle} />
                          </label>
                          <label style={{ flex: 1, minWidth: 0 }}>
                            <span style={labelStyle}>{t('crear_negocio_cierra', 'Cierra')}</span>
                            <input type="time" value={closeTime} onChange={e => changeTime('close', e.target.value)} className="cn-input" style={inputStyle} />
                          </label>
                        </div>
                        <div style={captionStyle}>{t('crear_negocio_horario_nota', 'Puedes configurar tu horario completo en tu administrador')}</div>
                      </div>
                    )
                  )}
                </>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setStep(1)} style={backBtn}>{t('crear_negocio_atras', 'Atrás')}</button>
                {isEdit ? (
                  <button type="button" onClick={submitForm} disabled={addBizLoading} style={{ ...primaryBtn, opacity: addBizLoading ? 0.6 : 1 }}>
                    {addBizLoading ? 'Guardando...' : editSubmitLabel}
                  </button>
                ) : (
                  <button type="button" onClick={() => setStep(3)} style={primaryBtn}>{t('crear_negocio_siguiente', 'Siguiente')}</button>
                )}
              </div>
            </div>
          )}

          {!isEdit && step === 3 && (
            <div>
              <div role="radiogroup" aria-label={t('crear_negocio_paso3', 'Elige tu plan')}>
                {plans.map(p => {
                  const selected = planKey === p.key;
                  return (
                    <div key={p.key} role="radio" aria-checked={selected} tabIndex={0}
                      onClick={() => setPlanKey(p.key)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPlanKey(p.key); } }}
                      style={{ background: cardBg, border: selected ? `2px solid ${blue}` : `1.5px solid ${hairline}`, borderRadius: 20, padding: 16, marginBottom: 12, cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${selected ? blue : '#C7C7CC'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {selected && <span style={{ width: 10, height: 10, borderRadius: '50%', background: blue }} />}
                        </span>
                        <span style={{ fontSize: 17, fontWeight: 800, color: T.text }}>{p.name}</span>
                        <span style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                          {hasTrial(p.key, billing) && <span style={{ fontSize: 11, fontWeight: 700, color: blue }}>{t('crear_negocio_prueba', '7 días gratis')}</span>}
                          <span style={{ fontSize: 16, fontWeight: 800, color: T.text, whiteSpace: 'nowrap' }}>{planPriceText(p)}</span>
                        </span>
                      </div>
                      <p style={{ fontSize: 13, color: T.sub, margin: '8px 0 0', lineHeight: 1.45 }}>{p.desc}</p>
                      <button type="button" onClick={e => { e.stopPropagation(); setExpandedPlan(expandedPlan === p.key ? null : p.key); }} style={{ background: 'none', border: 'none', color: blue, fontSize: 13, fontWeight: 700, padding: '8px 0 0', cursor: 'pointer' }}>
                        {expandedPlan === p.key ? t('crear_negocio_ocultar_beneficios', 'Ocultar beneficios') : t('crear_negocio_ver_beneficios', 'Ver beneficios')}
                      </button>
                      {expandedPlan === p.key && (
                        <ul style={{ margin: '10px 0 0', paddingLeft: 18, display: 'grid', gap: 6 }}>
                          {p.features.map(f => <li key={f} style={{ fontSize: 13, color: T.text, lineHeight: 1.45 }}>{f}</li>)}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>

              <button type="button" onClick={() => setShowCompare(!showCompare)} style={{ background: 'none', border: 'none', color: blue, fontSize: 14, fontWeight: 700, padding: '4px 0 12px', cursor: 'pointer', display: 'block', margin: '0 auto' }}>
                {showCompare ? t('crear_negocio_cerrar_comparacion', 'Cerrar comparación') : t('crear_negocio_comparar', 'Comparar todos los planes')}
              </button>
              {showCompare && (
                <div style={{ background: cardBg, borderRadius: 20, padding: 16, marginBottom: 12 }}>
                  <div style={{ display: 'flex', gap: 4, paddingBottom: 8, borderBottom: `1px solid ${hairline}` }}>
                    <span style={{ flex: 1 }} />
                    {plans.map(p => <span key={p.key} style={{ width: 60, flexShrink: 0, textAlign: 'center', fontSize: 10, fontWeight: 700, color: T.sub }}>{p.name}</span>)}
                  </div>
                  {compareRows.map(f => (
                    <div key={f} style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${hairline}` }}>
                      <span style={{ flex: 1, fontSize: 13, color: T.text, lineHeight: 1.3 }}>{f}</span>
                      {plans.map(p => {
                        const has = effectivePlanFeatures(plans, p.key).includes(f);
                        return <span key={p.key} style={{ width: 60, flexShrink: 0, textAlign: 'center', color: has ? blue : T.sub, fontWeight: 700, fontSize: 14 }}>{has ? '✓' : '—'}</span>;
                      })}
                    </div>
                  ))}
                </div>
              )}

              {planKey !== 'elite' && (
                <p style={{ fontSize: 12, color: T.sub, textAlign: 'center', margin: '4px 0 12px' }}>{t('crear_negocio_logo_caption', 'El logotipo en el mapa es función del plan Premium.')}</p>
              )}

              {isPaid && (
                <div style={{ marginBottom: 12 }}>
                  <span style={labelStyle}>{t('crear_negocio_periodo', 'Periodo de pago')}</span>
                  <div style={{ display: 'flex', gap: 4, background: backBg, borderRadius: 999, padding: 4 }}>
                    <button type="button" onClick={() => setBilling('monthly')} style={{ flex: 1, padding: '9px 0', border: 'none', borderRadius: 999, background: billing === 'monthly' ? cardBg : 'transparent', color: billing === 'monthly' ? T.text : T.sub, fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: billing === 'monthly' ? '0 1px 4px rgba(0,0,0,0.15)' : 'none' }}>{t('cuenta_mensual', 'Mensual')}</button>
                    <button type="button" onClick={() => setBilling('annual')} style={{ flex: 1, padding: '9px 0', border: 'none', borderRadius: 999, background: billing === 'annual' ? cardBg : 'transparent', color: billing === 'annual' ? T.text : T.sub, fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: billing === 'annual' ? '0 1px 4px rgba(0,0,0,0.15)' : 'none' }}>{t('cuenta_anual', 'Anual')} <span style={{ color: blue }}>−17%</span></button>
                  </div>
                  <p style={{ ...captionStyle, textAlign: 'center' }}>
                    {billing === 'monthly'
                      ? t('cuenta_hoy_no_pagas', 'Hoy no pagas nada. Después de 7 días se cobra ${price} al mes. Cancela cuando quieras.', { price: selectedPlan.priceMonthly })
                      : annualLine(selectedPlan)}
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setStep(2)} style={backBtn}>{t('crear_negocio_atras', 'Atrás')}</button>
                <button type="button" onClick={submitForm} disabled={addBizLoading} style={{ ...primaryBtn, opacity: addBizLoading ? 0.6 : 1 }}>
                  {addBizLoading ? 'Guardando...' : isPaid ? t('crear_negocio_crear_pagar', 'Crear mi negocio y continuar al pago') : t('crear_negocio_crear', 'Crear mi negocio')}
                </button>
              </div>
              <p style={{ ...captionStyle, textAlign: 'center', marginTop: 12 }}>{t('crear_negocio_admin_nota', 'Todas las demás funciones se agregan en tu administrador')}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

}
