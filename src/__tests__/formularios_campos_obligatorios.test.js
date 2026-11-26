// WhatsApp obligatorio al crear negocio y evento (25 nov 2026, Jonathan):
// validación de 10 dígitos, campos extra obligatorios en ambos formularios
// y WhatsApp visible con enlace directo en las tarjetas de pendientes.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  normalizeWhatsapp,
  isValidWhatsapp,
  whatsappLink,
} from "../lib/utils.js";

const read = (p) => readFileSync(join(process.cwd(), p), "utf8");

describe("validación de WhatsApp (10 dígitos, México)", () => {
  it("normalizeWhatsapp deja solo los 10 dígitos", () => {
    expect(normalizeWhatsapp("311 123 4567")).toBe("3111234567");
    expect(normalizeWhatsapp("311-123-4567")).toBe("3111234567");
    expect(normalizeWhatsapp("+52 311 123 4567")).toBe("3111234567");
    expect(normalizeWhatsapp("5213111234567")).toBe("3111234567");
    expect(normalizeWhatsapp("3111234567")).toBe("3111234567");
    expect(normalizeWhatsapp("")).toBe("");
  });

  it("isValidWhatsapp acepta 10 dígitos y rechaza lo demás", () => {
    expect(isValidWhatsapp("3111234567")).toBe(true);
    expect(isValidWhatsapp("311 123 4567")).toBe(true);
    expect(isValidWhatsapp("+52 311 123 4567")).toBe(true);
    expect(isValidWhatsapp("")).toBe(false);
    expect(isValidWhatsapp("311133")).toBe(false);
    expect(isValidWhatsapp("311123456")).toBe(false);
    expect(isValidWhatsapp("31112345678")).toBe(false);
    expect(isValidWhatsapp("1111111111")).toBe(false);
    expect(isValidWhatsapp("311abc4567")).toBe(false);
  });

  it("whatsappLink abre el chat con lada de México", () => {
    expect(whatsappLink("3111234567")).toBe("https://wa.me/523111234567");
    expect(whatsappLink("311 123 4567")).toBe("https://wa.me/523111234567");
    expect(whatsappLink("")).toBe("");
  });
});

describe("AddBizModal: WhatsApp y datos obligatorios solo en creación", () => {
  const src = read("src/components/AddBizModal.jsx");

  it("el paso 1 exige descripción, dirección y al menos 1 foto al crear", () => {
    expect(src).toContain('if ((addBizForm.description || "").trim().length < 10) falta.push("descripción")');
    expect(src).toContain('if (!(addBizForm.address || "").trim()) falta.push("dirección")');
    expect(src).toContain('if ((addBizForm.photos || []).length < 1) falta.push("al menos 1 foto")');
  });

  it("el paso 2 valida el WhatsApp antes de pasar al plan", () => {
    expect(src).toContain("const goStep3 = () => {");
    expect(src).toContain('if (!isValidWhatsapp(addBizForm.whatsapp)) { toast$("El WhatsApp es obligatorio: 10 dígitos"); return; }');
    expect(src).toContain("onClick={goStep3}");
  });

  it("el envío revalida todo en creación y guarda el WhatsApp normalizado", () => {
    expect(src).toContain("if (!isEdit) {");
    expect(src).toContain("whatsapp: normalizeWhatsapp(addBizForm.whatsapp),");
  });

  it("la etiqueta marca el WhatsApp como obligatorio al crear", () => {
    expect(src).toContain("{t('crear_negocio_whatsapp', 'WhatsApp')}{!isEdit && ' *'}");
    expect(src).toContain("Obligatorio · 10 dígitos. Es el número donde te contactamos para aprobar tu negocio.");
  });
});

describe("CreateEventModal: WhatsApp y datos obligatorios", () => {
  const src = read("src/components/modals/CreateEventModal.jsx");

  it("el paso 1 exige descripción y categoría; el paso 2, el lugar", () => {
    expect(src).toContain("if (step === 1 && (createEvForm.description || \"\").trim().length < 10)");
    expect(src).toContain('if (step === 1 && !createEvForm.event_category)');
    expect(src).toContain('if (step === 2 && !(createEvForm.venue_name || "").trim())');
  });

  it("el envío exige WhatsApp válido y precio si es de pago", () => {
    expect(src).toContain('if (!isValidWhatsapp(createEvForm.whatsapp)) { toast$(\'El WhatsApp es obligatorio: 10 dígitos\'); return; }');
    expect(src).toContain('if (createEvForm.price_type === "paid" && !(createEvForm.price || "").trim())');
    expect(src).toContain("whatsapp: normalizeWhatsapp(createEvForm.whatsapp),");
  });

  it("la etiqueta marca el WhatsApp como obligatorio", () => {
    expect(src).toContain("{t('modal_whatsapp_contacto', 'WhatsApp de contacto')} *");
    expect(src).toContain("Obligatorio · 10 dígitos. Es el número donde te contactamos para aprobar tu evento.");
  });
});

describe("AdminPanel: el WhatsApp se ve en pendientes aunque no haya teléfono", () => {
  const src = read("src/components/AdminPanel.jsx");

  it("la tarjeta de negocio muestra el WhatsApp con enlace directo", () => {
    expect(src).toContain("whatsappLink(b.whatsapp)");
    expect(src).toContain('WhatsApp: <a href={whatsappLink(b.whatsapp)}');
    expect(src).not.toContain('{b.whatsapp && " · WA: " + b.whatsapp}');
  });

  it("la tarjeta de evento muestra WhatsApp y precio", () => {
    expect(src).toContain("whatsappLink(ev.whatsapp)");
    expect(src).toContain('WhatsApp: <a href={whatsappLink(ev.whatsapp)}');
    expect(src).toContain('{ev.price_type === "paid" && ev.price && <div className="text-xs"');
  });
});
