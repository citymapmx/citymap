import { useState, useEffect } from "react";
import { AnimatePresence, m } from "framer-motion";
import Icon from "./ui/Icon.jsx";
import { useUIStore } from "../store/useUIStore.js";
import { useDataStore } from "../store/useDataStore.js";
import { getCountryCode } from "../lib/domain.js";
import { isTrialSelection } from "../lib/plans.js";
import { getBusinessPricing, buildBusinessPlans } from "../lib/businessPlans.js";
import { useTranslation } from "../hooks/useTranslation.js";

// Modal de pago de un plan (Stripe): era el modal de PlansPage («ver
// planes»). Al eliminar PlansPage (10 nov 2026: /negocios pasa a ser LA
// página de planes), el modal vive aquí y lo abre App.jsx cuando hay un
// plan pendiente — al elegir un plan de pago en /negocios, tras el login
// o tras crear el negocio —. Sin plan pendiente no renderiza nada.
// El cierre (fondo, × o Escape) llama a onClose: App cierra el overlay.
export default function PlanPaymentModal({ myBizList, onStartPaidPlan, pendingPlan, onConsumePendingPlan, user, T, dark, onClose }) {
  const { t } = useTranslation();
  const activeCity = useUIStore(s => s.activeCity);
  const cities = useDataStore(s => s.cities);
  const countryCode = getCountryCode(activeCity, cities);

  const pricing = getBusinessPricing(countryCode);
  const plans = buildBusinessPlans(t, pricing, dark);
  const accent = dark ? '#70ADFF' : '#0066CC';
  const surface = dark ? '#202023' : '#FFFFFF';
  const ink = dark ? '#F5F5F7' : '#1D1D1F';

  const [selectedPlan, setSelectedPlan] = useState(null);
  useEffect(() => {
    if (!selectedPlan) return;
    const onKey = event => { if (event.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selectedPlan, onClose]);

  // Al volver del registro del negocio (o del login) con un plan pendiente,
  // abrir el modal de pago con ese plan. Sin negocio todavía, no hace nada:
  // el plan pendiente espera al siguiente intento.
  useEffect(() => {
    if (!pendingPlan || !myBizList?.length) return;
    const plan = plans.find(x => x.key === pendingPlan.key);
    if (!plan) return;
    setSelectedPlan({ plan, billing: pendingPlan.billing === 'annual' ? 'annual' : 'monthly' });
    onConsumePendingPlan?.();
    // El plan pendiente se consume cuando cambia pendingPlan o myBizList; la
    // lista `plans` se reconstruye en cada render y no es una dependencia.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPlan, myBizList, onConsumePendingPlan]);

  const bizId = myBizList?.[0]?.id;
  const isTrialPlan = isTrialSelection(selectedPlan?.plan?.key, selectedPlan?.billing);

  if (!selectedPlan) return null;

  return (
    <AnimatePresence>
      {selectedPlan && (
        <m.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
          style={{ position: "fixed", inset: 0, zIndex: 100000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", padding: 20 }}
          onClick={() => onClose?.()}
        >
          <m.div
            initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }} transition={{ duration: 0.3, ease: "easeOut" }}
            onClick={e => e.stopPropagation()}
            role="dialog" aria-modal="true" aria-label={t("cuenta_elegir_plan_modal", `Elegir plan ${selectedPlan.plan.name}`, { name: selectedPlan.plan.name })}
            style={{ background: surface, width: "100%", maxWidth: 340, borderRadius: 24, padding: "24px", position: "relative", boxShadow: "0 24px 48px rgba(0,0,0,0.2)" }}
          >
            <button aria-label={t("cuenta_cerrar_seleccion", "Cerrar selección de plan")} onClick={() => onClose?.()} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", fontSize: 24, cursor: "pointer", color: T.sub, padding: 4 }}>×</button>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, marginTop: 4 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: selectedPlan.plan.iconBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name={selectedPlan.plan.icon} size={20} color={selectedPlan.plan.color} />
              </div>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 600, color: T.text, margin: 0 }}>{t("cuenta_plan_nombre", `Plan ${selectedPlan.plan.name}`, { name: selectedPlan.plan.name })}</h2>
                <span style={{ fontSize: 11, color: T.sub, fontWeight: 600 }}>{selectedPlan.billing === "monthly" ? t("cuenta_suscripcion_mensual", "Suscripción mensual") : t("cuenta_suscripcion_anual", "Suscripción anual")}</span>
              </div>
            </div>

            <div style={{ background: dark ? "rgba(255,255,255,0.04)" : "#F8FAFC", borderRadius: 14, padding: "16px", marginBottom: 20, marginTop: 16 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                <span style={{ fontSize: 36, fontWeight: 600, color: ink, letterSpacing: -0.5 }}>{selectedPlan.billing === "monthly" ? selectedPlan.plan.priceMonthly : selectedPlan.plan.priceAnnual}</span>
                <span style={{ fontSize: 16, color: T.sub, fontWeight: 500 }}>{pricing.currency}/{selectedPlan.billing === "monthly" ? t("cuenta_mes", "mes") : t("cuenta_ano", "año")}</span>
              </div>
              <p style={{ fontSize: 12, color: T.sub, margin: 0 }}>{isTrialPlan ? t("cuenta_prueba_nota", "Prueba gratis por 7 días. Luego se cobra cada mes.") : selectedPlan.billing === "monthly" ? t("cuenta_cobra_mes", "Se cobra cada mes.") : t("cuenta_cobra_ano", "Se cobra el importe completo del año.")}</p>
            </div>

            {bizId ? (
              <button
                onClick={async () => {
                  try {
                    const apiUrl = window.location.origin.includes('localhost') || window.location.origin.includes('capacitor')
                      ? 'https://citymap.mx/api/stripe-checkout'
                      : '/api/stripe-checkout';

                    const res = await fetch(apiUrl, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        biz_id: bizId,
                        plan_id: selectedPlan.plan.key, // 'pro' o 'elite'
                        interval: selectedPlan.billing === "monthly" ? "month" : "year",
                        host_url: 'https://citymap.mx',
                        currency: pricing.currency
                      })
                    });

                    const data = await res.json();
                    if (data.url) {
                      if (window.location.origin.includes('capacitor') || window.location.origin.includes('localhost')) {
                        const { Browser } = await import('@capacitor/browser');
                        await Browser.open({ url: data.url });
                      } else {
                        window.location.href = data.url;
                      }
                    } else {
                      alert("Error iniciando Stripe: " + (data.error || "Desconocido"));
                    }
                  } catch (e) {
                    console.error(e);
                    alert("Error: " + e.message);
                  }
                }}
                style={{ width: "100%", padding: 16, background: accent, color: dark ? "#101827" : "#fff", borderRadius: 999, fontWeight: 800, fontSize: 16, border: "none", cursor: "pointer", boxShadow: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 10 }}
              >
                {isTrialPlan ? t("cuenta_empezar_prueba", "Empezar 7 días gratis") : t("cuenta_pagar_tarjeta", "Pagar con Tarjeta (Stripe)")}
              </button>
            ) : (
              <>
                <p style={{ fontSize: 13, lineHeight: 1.5, color: T.sub, textAlign: "center", margin: "0 0 12px" }}>{t("cuenta_crea_negocio_primero", "Para activar un plan primero crea tu negocio. Al terminar, regresas aquí mismo a pagar.")}</p>
                <button
                  onClick={() => onStartPaidPlan?.(selectedPlan.plan, selectedPlan.billing)}
                  style={{ width: "100%", padding: 16, background: accent, color: dark ? "#101827" : "#fff", borderRadius: 999, fontWeight: 800, fontSize: 16, border: "none", cursor: "pointer", boxShadow: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 10 }}
                >
                  {user ? t("cuenta_crear_negocio_continuar", "Crear mi negocio y continuar") : t("cuenta_entrar_crear_negocio", "Entrar y crear mi negocio")}
                </button>
                <button onClick={() => window.open(`https://wa.me/523223792428?text=Hola, me interesa el Plan ${selectedPlan?.plan?.name || ""} para mi negocio y necesito ayuda para registrarlo.`, "_blank")} style={{ width: "100%", padding: 10, background: "transparent", border: "none", color: accent, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{t("cuenta_necesitas_ayuda", "¿Necesitas ayuda? Habla con un asesor")}</button>
              </>
            )}
            <p style={{ fontSize: 11, color: T.sub, textAlign: "center", margin: 0 }}>{isTrialPlan ? t("cuenta_hoy_no_pagas", `Hoy no pagas nada. Después de 7 días se cobra ${selectedPlan.plan.priceMonthly} al mes. Cancela cuando quieras.`, { price: selectedPlan.plan.priceMonthly }) : t("cuenta_pago_seguro", "🔒 Pago 100% seguro y encriptado")}</p>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
