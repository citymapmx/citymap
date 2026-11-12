// WhatsApp de lealtad: validación, normalización y mensajes personalizados.
//
// - El número se guarda normalizado: solo dígitos con código de país 52
//   (móvil mexicano de 10 dígitos). Ej: "311 200 8507" -> "523112008507".
// - Los mensajes son los de Jonathan (12 Nov 2026): a 1 sello del premio,
//   tarjeta completada, y recordatorio con el progreso en los demás casos.
//   Cada mensaje lleva su icono (12 Nov 2026, Jonathan: ⭐️😄🥳 según el
//   mensaje): 😄 el recordatorio, ⭐️ a 1 sello, 🥳 junto al 🎉 al completar.

export function normalizeWhatsApp(input) {
  const digits = String(input || "").replace(/\D/g, "");
  if (digits.length === 10) return `52${digits}`;
  if (digits.length === 12 && digits.startsWith("52")) return digits;
  if (digits.length === 11 && digits.startsWith("1")) return `52${digits.slice(1)}`;
  return null;
}

export function isValidWhatsApp(input) {
  return normalizeWhatsApp(input) !== null;
}

export function loyaltyWhatsAppMessage({ stamps = 0, stampsRequired = 5, bizName = "" } = {}) {
  const current = Number(stamps) || 0;
  const required = Number(stampsRequired) || 5;
  if (current >= required) {
    return "🎉 ¡Felicidades, ya completaste tu tarjeta de lealtad, puedes reclamar tu premio! 🥳";
  }
  if (required - current === 1) {
    return "⭐️ Hola, solo te falta un sello en tu tarjeta de lealtad para recibir un premio.";
  }
  const where = bizName ? ` en ${bizName}` : "";
  return `Hola 😄, te esperamos${where} para seguir sumando sellos en tu tarjeta de lealtad. Llevas ${current} de ${required} sellos.`;
}

export function loyaltyWhatsAppLink({ whatsapp, stamps = 0, stampsRequired = 5, bizName = "" } = {}) {
  const number = normalizeWhatsApp(whatsapp);
  if (!number) return null;
  const text = encodeURIComponent(loyaltyWhatsAppMessage({ stamps, stampsRequired, bizName }));
  return `https://wa.me/${number}?text=${text}`;
}
