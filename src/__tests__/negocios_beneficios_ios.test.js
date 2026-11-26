// Beneficios de /negocios estilo iOS premium (25 nov 2026, Jonathan,
// opción A — lista agrupada): sin cuadros azules, icono de línea en
// tinta, filas separadas por líneas finas, título a la izquierda.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const src = readFileSync(
  join(process.cwd(), "src/components/BusinessLanding.jsx"),
  "utf8"
);

describe("beneficios /negocios estilo iOS (opción A)", () => {
  it("la sección usa una lista agrupada, no tarjetas con cuadro azul", () => {
    expect(src).toContain('className="benefits-list"');
    expect(src).not.toContain("benefit-card");
    expect(src).not.toContain(
      "width: 48, height: 48, borderRadius: 16, background: dark ? '#18304A' : '#EDF5FF'"
    );
  });

  it("el icono va en tinta, sin cuadro de color ni azul", () => {
    expect(src).toContain("<Icon name={b.icon} size={30} color={ink} />");
  });

  it("las filas se separan con una línea fina", () => {
    expect(src).toContain("height: 1, background: line, margin: '0 20px'");
  });

  it("el título y el subtítulo van alineados a la izquierda", () => {
    expect(src).toContain(
      "textAlign: 'left', margin: '0 0 8px' }}>{t(\"negocios_beneficios_titulo\""
    );
    expect(src).toContain(
      "textAlign: 'left', margin: '0 0 28px', maxWidth: 480 }}>{t(\"negocios_beneficios_sub\""
    );
  });

  it("las 6 tarjetas de beneficio siguen existiendo con sus textos", () => {
    for (const title of [
      "Te encuentran en el mapa",
      "Te encuentran en Google",
      "Pedidos por WhatsApp, sin comisiones",
      "Un menú digital que vende solo",
      "Tus eventos y promociones llegan a la gente",
      "Sabes qué está funcionando",
    ]) {
      expect(src).toContain(title);
    }
  });
});
