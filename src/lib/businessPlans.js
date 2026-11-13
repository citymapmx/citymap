// Planes de negocio de CityMap: una sola fuente de verdad para
// BusinessLanding (/negocios, LA página de planes) y el modal de pago
// (PlanPaymentModal). Los precios dependen del país de la ciudad activa.

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
      features: [t("cuenta_feat_pagina_publica", "Página pública del negocio en CityMap"), t("cuenta_feat_portada_info", "Portada e Información del negocio"), t("cuenta_feat_telefono_direccion", "Teléfono y Dirección"), t("cuenta_feat_horarios", "Horarios"), t("cuenta_feat_banner_estandar", "Banner estándar")],
    },
    {
      key: "pro",
      name: "Destacado",
      priceMonthly: pricing.proMonthly,
      oldPriceMonthly: pricing.oldProMonthly,
      priceAnnual: pricing.proAnnual,
      oldPriceAnnual: pricing.oldProAnnual,
      desc: t("negocios_plan_pro_desc", "Ideal para negocios que buscan captar clientes y mayor visibilidad."),
      color: dark ? "#E2E8F0" : "#0F172A",
      icon: "star",
      badge: t("negocios_badge_popular", "Más popular"),
      features: [t("cuenta_feat_todo_gratuito", "Todo lo del plan gratuito, más:"), t("cuenta_feat_resenas_google", "Reseñas de Google"), t("cuenta_feat_seo", "Posicionamiento SEO en Google"), t("cuenta_feat_banner_destacado", "Banner destacado"), t("cuenta_feat_galeria", "Galería de fotos"), t("cuenta_feat_whatsapp_redes", "Enlace a WhatsApp y redes sociales"), t("cuenta_feat_menu_qr", "Menú digital"), t("cuenta_feat_panel_admin", "Panel de administrador")],
    },
    {
      key: "elite",
      name: "Premium",
      priceMonthly: pricing.eliteMonthly,
      oldPriceMonthly: pricing.oldEliteMonthly,
      priceAnnual: pricing.eliteAnnual,
      oldPriceAnnual: pricing.oldEliteAnnual,
      desc: t("negocios_plan_elite_desc", "Todas las herramientas para dominar tu presencia digital y vender más."),
      color: dark ? "#E2E8F0" : "#0F172A",
      icon: "award",
      badge: t("negocios_badge_mejor", "Lo mejor"),
      features: [
        t("cuenta_feat_todo_destacado", "Todo lo del plan Destacado, más:"),
        t("cuenta_feat_resenas_google", "Reseñas de Google"),
        t("cuenta_feat_menu_interactivo_google", "Menú interactivo indexado en Google"),
        t("cuenta_feat_banner_premium", "Banner premium y Logotipo en mapa"),
        t("cuenta_feat_carrito_whatsapp", "Carrito enlazado a WhatsApp"),
        t("cuenta_feat_galeria_amplia", "Amplia galería de fotos"),
        t("cuenta_feat_eventos_reservas", "Gestión de Eventos y Reservas"),
        t("cuenta_feat_estadisticas_soporte", "Estadísticas y Soporte prioritario"),
        t("cuenta_feat_tarjetas_lealtad", "Tarjetas de lealtad"),
        t("cuenta_feat_cupones", "Integración de cupones"),
        t("cuenta_feat_proximamente", "Próximamente más herramientas...")
      ],
      screenshots: [
        { url: "/plans/menu-interactivo.png", label: t("cuenta_shot_menu", "Menú Interactivo y Carrito") },
        { url: "/plans/estadisticas.png", label: t("cuenta_shot_stats", "Panel de Estadísticas") },
        { url: "/plans/reservas.png", label: t("cuenta_shot_reservas", "Gestión de Reservas") }
      ]
    },
  ];
}
