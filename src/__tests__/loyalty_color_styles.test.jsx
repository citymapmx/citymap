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
  it('hay 4 categorías, en orden: Premium, Sobrios, Cafetería, Coloridos', () => {
    expect(LOYALTY_COLOR_CATEGORIES.map((c) => c.label)).toEqual([
      "Premium",
      "Sobrios",
      "Cafetería",
      "Coloridos",
    ]);
  });

  it('cada categoría trae sus estilos: 7 Premium, 7 Sobrios, 6 Cafetería, 10 Coloridos', () => {
    expect(LOYALTY_COLOR_CATEGORIES.map((c) => c.styles.length)).toEqual([7, 7, 6, 10]);
    expect(LOYALTY_COLOR_STYLES.length).toBe(30);
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

  it('no hay categoría Clásicos ni estilos viejos (Café, Neón, Rosado, Azul, Eco, Gold)', () => {
    expect(LOYALTY_COLOR_CATEGORIES.find((c) => c.id === "clasicos")).toBeUndefined();
    const ids = LOYALTY_COLOR_STYLES.map((s) => s.id);
    for (const oldId of ["cafe", "neon", "rosado", "azul", "eco", "gold"]) {
      expect(ids).not.toContain(oldId);
    }
    // Y los 30 estilos que quedan son todos degradados (2-3 paradas).
    for (const s of LOYALTY_COLOR_STYLES) {
      expect(s.bg.length).toBeGreaterThanOrEqual(2);
    }
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
    // Un color plano viejo (Clásicos, ya quitados) no coincide con ningún
    // estilo: el wizard cae a Premium, sin romper nada.
    expect(findLoyaltyStyleByBackground("#1B1107")).toBe(null);
    expect(findLoyaltyCategoryByBackground("#1B1107")).toBe(null);
    expect(findLoyaltyStyleByBackground("#123456")).toBe(null);
    expect(findLoyaltyCategoryByBackground("#123456")).toBe(null);
  });
});

describe('LoyaltyWizard Paso 1: píldoras por categoría (PR #239)', () => {
  it('dice «Selecciona tu estilo» y muestra las 4 píldoras de categoría, sin «Estilos Rápidos» ni «Clásicos»', () => {
    const html = renderWizard();
    expect(html).toContain("Selecciona tu estilo");
    for (const label of ["Premium", "Sobrios", "Cafetería", "Coloridos"]) {
      expect(html).toContain(label);
    }
    expect(html).not.toContain("Clásicos");
    expect(html).not.toContain("Estilos Rápidos");
  });

  it('con una tarjeta vieja de color clásico plano (#1B1107) se cae a Premium y la vista previa sigue con su color', () => {
    const html = renderWizard({ bg_color: "#1B1107" });
    // Premium expandido: se ven sus 7 estilos.
    for (const label of ["Oro negro", "Esmeralda", "Medianoche", "Vino", "Atardecer", "Océano", "Galaxia"]) {
      expect(html).toContain(label);
    }
    // Ningún estilo viejo aparece.
    for (const label of ["Neón", "Rosado", "Gold"]) {
      expect(html).not.toContain(label);
    }
    // La vista previa y el selector manual conservan el color guardado.
    expect(html).toContain("#1B1107");
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

  it('la vista previa del Paso 1 lleva la leyenda «Ejemplo» (el premio que se ve es solo un ejemplo; el real se define en el Paso 2)', () => {
    const html = renderWizard();
    expect(html).toContain("Ejemplo");
    // El texto del premio y el Paso 2 no se tocan: el premio configurado sigue igual.
    expect(html).toContain("2 Tostadas gratis");
    const src = read('../components/loyalty/LoyaltyWizard.jsx');
    expect(src).toContain("el premio real se define en el Paso 2");
  });

  it('las píldoras van en 2 columnas (todas visibles, sin scroll horizontal) y el estilo se aplica al tocarlo', () => {
    const src = read('../components/loyalty/LoyaltyWizard.jsx');
    expect(src).toContain('gridTemplateColumns: "1fr 1fr"');
    expect(src).not.toContain('scrollSnapType: "x mandatory"');
    expect(src).not.toContain('overflowX: "auto"');
    expect(src).toContain("setConfig(prev => ({ ...prev, bg_color: bg, text_color: style.text, primary_color: style.primary }))");
    expect(src).toContain("onClick={() => setActiveCategory(cat.id)}");
    // Las 4 píldoras se renderizan y la categoría activa despliega sus estilos.
    const html = renderWizard();
    for (const label of ["Premium", "Sobrios", "Cafetería", "Coloridos"]) {
      expect(html).toContain(label);
    }
    for (const label of ["Oro negro", "Esmeralda", "Medianoche", "Vino", "Atardecer", "Océano", "Galaxia"]) {
      expect(html).toContain(label);
    }
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

    // La tarjeta (ahora componente compartido, usado por «Recompensas» y
    // por el carrusel del perfil) usa la primera parada para el icono
    // del sello, no el degradado entero.
    const loyaltyCard = read('../components/loyalty/LoyaltyCard.jsx');
    expect(loyaltyCard).toContain("color={loyaltyBgFirstColor(card.bg_color");
    // Y «Recompensas» sigue renderizando esa tarjeta compartida.
    const walletView = read('../views/WalletView.jsx');
    expect(walletView).toContain("import LoyaltyCard from '../components/loyalty/LoyaltyCard.jsx'");
    expect(walletView).toContain('<LoyaltyCard member={member} card={card} biz={biz}');

    // El pase de Google Wallet recibe un hex (primera parada), nunca el degradado.
    const walletApi = read('../../api/loyalty-wallet.js');
    expect(walletApi).toContain("loyaltyBgFirstColor(bg_color)");
    expect(walletApi).toContain("hexBackgroundColor: walletBgColor");
  });
});
