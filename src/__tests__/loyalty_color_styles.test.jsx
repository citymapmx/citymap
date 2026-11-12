import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import LoyaltyWizard from '../components/loyalty/LoyaltyWizard.jsx';
import {
  LOYALTY_COLOR_CATEGORIES,
  LOYALTY_COLOR_STYLES,
  loyaltyStyleBackground,
  loyaltyBgFirstColor,
  findLoyaltyStyleByBackground,
  findLoyaltyCategoryByBackground,
} from '../lib/loyaltyColorStyles.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

const HEX = /^#[0-9A-F]{6}$/;

function renderWizard(configOverrides = {}) {
  const config = {
    type: "stamps|star",
    primary_color: "#C4841D",
    bg_color: "#1B1107",
    text_color: "#F5E6D3",
    reward_text: "2 Tostadas gratis",
    stamps_required: 5,
    logo_url: null,
    ...configOverrides,
  };
  return renderToStaticMarkup(
    <LoyaltyWizard
      wizardStep={0}
      setWizardStep={() => {}}
      config={config}
      setConfig={() => {}}
      business={{ name: "Carrito La Paz Tostadas de Atún" }}
      isMobile
      handleSave={() => {}}
      saving={false}
    />
  );
}

describe('Estilos de color de lealtad: datos (PR #239)', () => {
  it('hay 5 categorías, en orden: Premium, Sobrios, Cafetería, Coloridos, Clásicos', () => {
    expect(LOYALTY_COLOR_CATEGORIES.map((c) => c.label)).toEqual([
      "Premium",
      "Sobrios",
      "Cafetería",
      "Coloridos",
      "Clásicos",
    ]);
  });

  it('cada categoría trae sus estilos: 7 Premium, 7 Sobrios, 6 Cafetería, 10 Coloridos, 6 Clásicos', () => {
    expect(LOYALTY_COLOR_CATEGORIES.map((c) => c.styles.length)).toEqual([7, 7, 6, 10, 6]);
    expect(LOYALTY_COLOR_STYLES.length).toBe(36);
  });

  it('todos los estilos tienen id y nombre únicos, 1-3 paradas hex y texto/botón hex', () => {
    const ids = LOYALTY_COLOR_STYLES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    const labels = LOYALTY_COLOR_STYLES.map((s) => s.label);
    expect(new Set(labels).size).toBe(labels.length);
    for (const s of LOYALTY_COLOR_STYLES) {
      expect(Array.isArray(s.bg)).toBe(true);
      expect(s.bg.length).toBeGreaterThanOrEqual(1);
      expect(s.bg.length).toBeLessThanOrEqual(3);
      for (const stop of s.bg) expect(stop).toMatch(HEX);
      expect(s.text).toMatch(HEX);
      expect(s.primary).toMatch(HEX);
    }
  });

  it('los 30 estilos numerados tienen sus 3 colores exactos (muestra por categoría)', () => {
    const byId = Object.fromEntries(LOYALTY_COLOR_STYLES.map((s) => [s.id, s]));
    // Premium
    expect(byId["oro-negro"]).toEqual({ id: "oro-negro", label: "Oro negro", bg: ["#262626", "#000000"], text: "#FAFAFA", primary: "#F5B301", category: "premium" });
    expect(byId["atardecer"].bg).toEqual(["#F97316", "#DB2777", "#7C3AED"]);
    expect(byId["galaxia"]).toEqual({ id: "galaxia", label: "Galaxia", bg: ["#0F172A", "#6D28D9"], text: "#EDE9FE", primary: "#FBBF24", category: "premium" });
    // Sobrios
    expect(byId["perla"]).toEqual({ id: "perla", label: "Perla", bg: ["#F8FAFC", "#E2E8F0"], text: "#334155", primary: "#64748B", category: "sobrios" });
    expect(byId["bosque"].bg).toEqual(["#166534", "#14532D"]);
    // Cafetería
    expect(byId["espresso"]).toEqual({ id: "espresso", label: "Espresso", bg: ["#292524", "#0C0A09"], text: "#FAFAF9", primary: "#D97706", category: "cafeteria" });
    expect(byId["crema"].bg).toEqual(["#FFFBEB", "#FDE9C8"]);
    // Coloridos
    expect(byId["coral"]).toEqual({ id: "coral", label: "Coral", bg: ["#FB7185", "#BE123C"], text: "#FFFFFF", primary: "#FFFFFF", category: "coloridos" });
    expect(byId["menta"]).toEqual({ id: "menta", label: "Menta", bg: ["#A7F3D0", "#6EE7B7"], text: "#064E3B", primary: "#059669", category: "coloridos" });
    expect(byId["ambar"].bg).toEqual(["#FBBF24", "#F59E0B"]);
  });

  it('los 6 Clásicos son los planos de antes, sin cambio', () => {
    const clasicos = LOYALTY_COLOR_CATEGORIES.find((c) => c.id === "clasicos").styles;
    expect(clasicos.map((s) => [s.label, s.bg, s.text, s.primary])).toEqual([
      ["Café", ["#1B1107"], "#F5E6D3", "#C4841D"],
      ["Neón", ["#1A1A2E"], "#EAEAEA", "#E94560"],
      ["Rosado", ["#FDF2F8"], "#831843", "#EC4899"],
      ["Azul", ["#0F172A"], "#F8FAFC", "#3B82F6"],
      ["Eco", ["#FFFFFF"], "#1E293B", "#10B981"],
      ["Gold", ["#18181B"], "#FAFAFA", "#F59E0B"],
    ]);
  });
});

describe('Estilos de color de lealtad: fondo y primera parada', () => {
  it('2 paradas dan linear-gradient(135deg, A, B) y 3 paradas las 3', () => {
    expect(loyaltyStyleBackground({ bg: ["#262626", "#000000"] })).toBe(
      "linear-gradient(135deg, #262626, #000000)"
    );
    expect(loyaltyStyleBackground({ bg: ["#F97316", "#DB2777", "#7C3AED"] })).toBe(
      "linear-gradient(135deg, #F97316, #DB2777, #7C3AED)"
    );
  });

  it('1 parada es el color plano tal cual (las viejas se ven igual)', () => {
    expect(loyaltyStyleBackground({ bg: ["#1B1107"] })).toBe("#1B1107");
    expect(loyaltyStyleBackground(null)).toBe("#ffffff");
  });

  it('la primera parada de un plano es el color y de un degradado su primer stop', () => {
    expect(loyaltyBgFirstColor("#1B1107")).toBe("#1B1107");
    expect(loyaltyBgFirstColor("linear-gradient(135deg, #262626, #000000)")).toBe("#262626");
    expect(loyaltyBgFirstColor("linear-gradient(135deg, #F97316, #DB2777, #7C3AED)")).toBe("#F97316");
    expect(loyaltyBgFirstColor("")).toBe("#ffffff");
    expect(loyaltyBgFirstColor(null)).toBe("#ffffff");
  });

  it('un bg_color guardado encuentra su estilo y su categoría', () => {
    expect(findLoyaltyStyleByBackground("linear-gradient(135deg, #262626, #000000)")?.id).toBe("oro-negro");
    expect(findLoyaltyCategoryByBackground("linear-gradient(135deg, #262626, #000000)")).toBe("premium");
    expect(findLoyaltyStyleByBackground("#1B1107")?.id).toBe("cafe");
    expect(findLoyaltyCategoryByBackground("#1B1107")).toBe("clasicos");
    expect(findLoyaltyStyleByBackground("#123456")).toBe(null);
    expect(findLoyaltyCategoryByBackground("#123456")).toBe(null);
  });
});

describe('LoyaltyWizard Paso 1: píldoras por categoría (PR #239)', () => {
  it('dice «Selecciona tu estilo» y muestra las 5 píldoras de categoría, sin «Estilos Rápidos»', () => {
    const html = renderWizard();
    expect(html).toContain("Selecciona tu estilo");
    for (const label of ["Premium", "Sobrios", "Cafetería", "Coloridos", "Clásicos"]) {
      expect(html).toContain(label);
    }
    expect(html).not.toContain("Estilos Rápidos");
  });

  it('con una tarjeta Clásica (Café) se despliegan los 6 Clásicos con su nombre', () => {
    const html = renderWizard({ bg_color: "#1B1107" });
    for (const label of ["Café", "Neón", "Rosado", "Azul", "Eco", "Gold"]) {
      expect(html).toContain(label);
    }
    // Y la categoría activa es Clásicos: los Premium no se despliegan.
    expect(html).not.toContain("Oro negro");
  });

  it('con un degradado Premium (Oro negro) se despliegan los 7 Premium', () => {
    const html = renderWizard({
      bg_color: "linear-gradient(135deg, #262626, #000000)",
      text_color: "#FAFAFA",
      primary_color: "#F5B301",
    });
    for (const label of ["Oro negro", "Esmeralda", "Medianoche", "Vino", "Atardecer", "Océano", "Galaxia"]) {
      expect(html).toContain(label);
    }
    expect(html).not.toContain("Espresso");
  });

  it('la fila de píldoras es deslizable (scroll-snap) y el estilo se aplica al tocarlo', () => {
    const src = read('../components/loyalty/LoyaltyWizard.jsx');
    expect(src).toContain('scrollSnapType: "x mandatory"');
    expect(src).toContain('overflowX: "auto"');
    expect(src).toContain("setConfig(prev => ({ ...prev, bg_color: bg, text_color: style.text, primary_color: style.primary }))");
    expect(src).toContain("onClick={() => setActiveCategory(cat.id)}");
  });

  it('la vista previa y el selector manual usan la primera parada, no el degradado entero', () => {
    const src = read('../components/loyalty/LoyaltyWizard.jsx');
    expect(src).toContain("color={loyaltyBgFirstColor(config.bg_color)}");
    expect(src).toContain("value={loyaltyBgFirstColor(config.bg_color)}");
    // «O personalizar colores exactos» sigue abajo.
    const html = renderWizard();
    expect(html).toContain("O personalizar colores exactos");
  });
});

describe('Tarjetas viejas con fondo plano siguen funcionando', () => {
  it('el diseñador, la vista de la tarjeta, el modal y el wallet usan la primera parada donde hace falta un color sólido', () => {
    const designer = read('../components/loyalty/LoyaltyDesigner.jsx');
    expect(designer).toContain("color={loyaltyBgFirstColor(config.bg_color)}");
    expect(designer).toContain("value={loyaltyBgFirstColor(config.bg_color)}");
    // La vista previa del diseñador sigue usando background con el bg_color entero (degradado o plano).
    expect(designer).toContain("background: config.bg_color");

    const cardView = read('../views/LoyaltyCardView.jsx');
    expect(cardView).toContain("color={loyaltyBgFirstColor(card.bg_color)}");
    expect(cardView).toContain("background: card.bg_color");

    const modal = read('../views/LoyaltyCardModal.jsx');
    expect(modal).toContain("color={loyaltyBgFirstColor(card.bg_color)}");

    const walletView = read('../views/WalletView.jsx');
    expect(walletView).toContain("color={loyaltyBgFirstColor(card.bg_color");

    // El pase de Google Wallet recibe un hex (primera parada), nunca el degradado.
    const walletApi = read('../../api/loyalty-wallet.js');
    expect(walletApi).toContain("loyaltyBgFirstColor(bg_color)");
    expect(walletApi).toContain("hexBackgroundColor: walletBgColor");
  });
});
