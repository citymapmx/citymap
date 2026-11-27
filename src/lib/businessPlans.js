// Planes de negocio de CityMap: una sola fuente de verdad para
// BusinessLanding (/negocios, LA página de planes) y el modal de pago
// (PlanPaymentModal). Los precios dependen del país de la ciudad activa.
//
// Estructura comercial (15 nov 2026): Gratuito, Presencia (pro),
// Ventas (elite) y Fideliza (fideliza). Las claves internas 'pro' y
// 'elite' se conservan a propósito: el webhook de Stripe escribe el
// plan_tier tal cual ('pro'/'elite'/'fideliza') y todo el código de
// permisos las acepta. Solo cambian los nombres que ve el usuario.
// La migración de los clientes actuales (109 Premium → Fideliza con
// $199 bloqueado, 14 Destacado → Presencia) es un cambio de valor en
// la base, no de claves.

export function getBusinessPricing(countryCode) {
  if (countryCode === "es") {
    return {
      currency: "EUR",
      symbol: "€",
      proMonthly: "9.99€",
      oldProMonthly: "19.99€",
      proAnnual: "99€",
      oldProAnnual: "199€",
      eliteMonthly: "19.99€",
      oldEliteMonthly: "39.99€",
      eliteAnnual: "199€",
      oldEliteAnnual: "399€",
      fidelizaMonthly: "29.99€",
      oldFidelizaMonthly: "59.99€",
      fidelizaAnnual: "299€",
      oldFidelizaAnnual: "599€",
    };
  } else if (countryCode === "us") {
    return {
      currency: "USD",
      symbol: "$",
      proMonthly: "$9.99",
      oldProMonthly: "$19.99",
      proAnnual: "$99",
      oldProAnnual: "$199",
      eliteMonthly: "$19.99",
      oldEliteMonthly: "$39.99",
      eliteAnnual: "$199",
      oldEliteAnnual: "$399",
      fidelizaMonthly: "$29.99",
      oldFidelizaMonthly: "$59.99",
      fidelizaAnnual: "$299",
      oldFidelizaAnnual: "$599",
    };
  } else {
    // Default: Mexico (MXN)
    return {
      currency: "MXN",
      symbol: "$",
      proMonthly: "$99",
      oldProMonthly: "$199",
      proAnnual: "$990",
      oldProAnnual: "$1,990",
      eliteMonthly: "$199",
      oldEliteMonthly: "$499",
      eliteAnnual: "$1,990",
      oldEliteAnnual: "$4,990",
      fidelizaMonthly: "$299",
      oldFidelizaMonthly: "$599",
      fidelizaAnnual: "$2,990",
      oldFidelizaAnnual: "$5,990",
    };
  }
}

export function buildBusinessPlans(t, pricing, dark = false) {
  return [
    {
      key: "free",
      name: "Gratuito",
      priceMonthly: `${pricing.symbol}0`,
      priceAnnual: `${pricing.symbol}0`,
      desc: t("negocios_plan_free_desc", "Tu negocio en el mapa y en el buscador, con foto, dirección, teléfono y horarios."),
      color: dark ? "#9CA3AF" : "#6B7280",
      icon: "user",
      features: [
        t("cuenta_feat_pagina_publica", "Página pública"),
        t("cuenta_feat_portada_info", "Portada e información"),
        t("cuenta_feat_telefono_direccion", "Teléfono y dirección"),
        t("cuenta_feat_horarios", "Horarios"),
        t("cuenta_feat_banner_estandar", "Banner estándar"),
        t("cuenta_feat_presencia_mapa", "Presencia en el mapa"),
        t("cuenta_feat_aparicion_busquedas", "Aparición en búsquedas de CityMap"),
      ],
    },
    {
      key: "pro",
      name: "Presencia",
      priceMonthly: pricing.proMonthly,
      oldPriceMonthly: pricing.oldProMonthly,
      priceAnnual: pricing.proAnnual,
      oldPriceAnnual: pricing.oldProAnnual,
      desc: t("negocios_plan_pro_desc", "Para negocios que quieren destacar en el mapa y en Google, y que los clientes les escriban directo por WhatsApp."),
      color: dark ? "#E2E8F0" : "#0F172A",
      icon: "star",
      badge: t("negocios_badge_popular", "Más popular"),
      features: [
        t("cuenta_feat_todo_gratuito", "Todo lo del plan Gratuito, más:"),
        t("cuenta_feat_resenas_google", "Reseñas de Google"),
        t("cuenta_feat_seo", "SEO en Google"),
        t("cuenta_feat_banner_destacado", "Banner destacado"),
        t("cuenta_feat_galeria", "Galería de fotografías"),
        t("cuenta_feat_whatsapp_redes", "WhatsApp y redes sociales"),
        t("cuenta_feat_menu_qr", "Menú digital"),
        t("cuenta_feat_panel_admin", "Panel de administrador"),
        t("cuenta_feat_mayor_visibilidad", "Mayor visibilidad dentro de CityMap"),
      ],
    },
    {
      key: "elite",
      name: "Ventas",
      priceMonthly: pricing.eliteMonthly,
      oldPriceMonthly: pricing.oldEliteMonthly,
      priceAnnual: pricing.eliteAnnual,
      oldPriceAnnual: pricing.oldEliteAnnual,
      desc: t("negocios_plan_elite_desc", "Tu menú se vuelve una herramienta de ventas: tus clientes eligen productos y piden directo por WhatsApp."),
      color: dark ? "#E2E8F0" : "#0F172A",
      icon: "award",
      badge: t("negocios_badge_vender", "Para vender más"),
      features: [
        t("cuenta_feat_todo_presencia", "Todo lo del plan Presencia, más:"),
        t("cuenta_feat_menu_interactivo", "Menú interactivo"),
        t("cuenta_feat_menu_indexado", "Menú indexado en Google"),
        t("cuenta_feat_productos_fotos", "Productos con fotografías y precios"),
        t("cuenta_feat_carrito_whatsapp", "Carrito de compras"),
        t("cuenta_feat_pedidos_whatsapp", "Pedidos por WhatsApp"),
        t("cuenta_feat_banner_premium", "Banner premium"),
        t("cuenta_feat_logo_mapa", "Logotipo destacado en el mapa"),
        t("cuenta_feat_galeria_amplia", "Galería ampliada de fotografías"),
        t("cuenta_feat_mayor_exposicion", "Mayor exposición del negocio"),
      ],
      screenshots: [
        { url: "/plans/menu-interactivo.png", label: t("cuenta_shot_menu", "Menú Interactivo y Carrito") },
      ]
    },
    {
      key: "fideliza",
      name: "Fideliza",
      priceMonthly: pricing.fidelizaMonthly,
      oldPriceMonthly: pricing.oldFidelizaMonthly,
      priceAnnual: pricing.fidelizaAnnual,
      oldPriceAnnual: pricing.oldFidelizaAnnual,
      desc: t("negocios_plan_fideliza_desc", "Todo para vender y que tus clientes regresen: lealtad, cupones, reservas y estadísticas."),
      color: dark ? "#C4B5FD" : "#6D28D9",
      icon: "heart",
      badge: t("negocios_badge_completo", "Más completo"),
      features: [
        t("cuenta_feat_todo_ventas", "Todo lo del plan Ventas, más:"),
        t("cuenta_feat_tarjetas_lealtad", "Tarjetas de lealtad"),
        t("cuenta_feat_sistema_recompensas", "Sistema de recompensas"),
        t("cuenta_feat_historial_clientes", "Historial de clientes"),
        t("cuenta_feat_cupones", "Cupones y promociones"),
        t("cuenta_feat_gestion_eventos", "Gestión de eventos"),
        t("cuenta_feat_reservaciones", "Reservaciones"),
        t("cuenta_feat_estadisticas_avanzadas", "Estadísticas avanzadas"),
        t("cuenta_feat_soporte_prioritario", "Soporte prioritario"),
        t("cuenta_feat_proximamente", "Acceso a nuevas herramientas conforme estén disponibles"),
      ],
      screenshots: [
        { url: "/plans/estadisticas.png", label: t("cuenta_shot_stats", "Panel de Estadísticas") },
        { url: "/plans/reservas.png", label: t("cuenta_shot_reservas", "Gestión de Reservas") }
      ]
    },
  ];
}
