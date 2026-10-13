// ─── PRECIO DE PRODUCTO EN EL MENÚ ────────────────────────────────────────────
// Única fuente de verdad para el precio que se muestra en las tarjetas del menú
// (vista de lista y de cuadrícula) y en el encabezado del detalle de producto.
//
// Estructura de datos (Supabase):
//   store_products.price                  → precio base (puede ser 0 si el precio depende del tamaño)
//   store_product_options.is_required     → true = el cliente DEBE elegir (ej. tamaño)
//   store_option_values.extra_price       → se suma al precio base
//
// Reglas:
//  • Solo las opciones de variante/tamaño (obligatorias o de selección única) definen
//    el precio mostrado. Los toppings y extras opcionales NUNCA participan, tengan
//    costo adicional o sean gratuitos ($0).
//  • Si el precio varía según la variante elegida → "Desde: $X" con el mínimo.
//  • Si todas las variantes cuestan lo mismo → precio normal (sin "Desde:").
//  • Variantes sin precio válido (null/undefined/NaN, o <= 0 cuando el precio base es 0)
//    se descartan sin asumir que cuestan cero.
//  • Nunca se devuelve $0 como precio principal (hasPrice: false → no se muestra).

const toNum = (v) => {
  if (v === null || v === undefined || v === "") return NaN;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

export function isVariantGroup(opt) {
  if (!opt) return false;
  const values = Array.isArray(opt.store_option_values) ? opt.store_option_values : [];
  if (values.length === 0) return false;
  // Un toggle de 1 solo valor "Sí" es siempre un modificador (extra u omitir ingrediente)
  if (values.length === 1 && String(values[0]?.label || "").trim().toLowerCase() === "sí") {
    return false;
  }
  const isSizeName = /tamañ|taman|size|presentaci|porci/i.test(String(opt.name || ""));
  return Boolean(opt.is_required) || opt.type === "single" || isSizeName;
}

/**
 * @param {object} product  producto con `price` y `store_product_options`
 * @returns {{ amount: number, isFrom: boolean, hasPrice: boolean, hasInvalidVariants: boolean }}
 */
export function getProductDisplayPrice(product) {
  const baseRaw = toNum(product?.price);
  const base = Number.isFinite(baseRaw) && baseRaw > 0 ? baseRaw : 0;
  const options = Array.isArray(product?.store_product_options) ? product.store_product_options : [];

  let minAdd = 0;
  let maxAdd = 0;
  let hasInvalidVariants = false;

  options.forEach((opt) => {
    if (!isVariantGroup(opt)) return; // toppings / extras opcionales: se ignoran
    const values = Array.isArray(opt.store_option_values) ? opt.store_option_values : [];

    const prices = values.map((v) => toNum(v?.extra_price));
    // Con base 0 el valor de la variante ES el precio: 0, vacío o negativo no es válido.
    const valid = prices.filter((p) => Number.isFinite(p) && (base > 0 ? p >= 0 : p > 0));
    if (valid.length !== prices.length) hasInvalidVariants = true;
    if (valid.length === 0) return;

    minAdd += Math.min(...valid);
    maxAdd += Math.max(...valid);
  });

  const amount = base + minAdd;
  return {
    amount,
    isFrom: maxAdd > minAdd, // solo "Desde:" si las variantes tienen precios distintos
    hasPrice: amount > 0,
    hasInvalidVariants,
  };
}

/** "$85" · "$85.50" */
export function formatMenuAmount(amount) {
  const n = Number(amount) || 0;
  return `$${n.toFixed(n % 1 === 0 ? 0 : 2)}`;
}

/** Texto final: "$85" o "Desde: $85". Devuelve null si no hay precio válido. */
export function getProductPriceLabel(product) {
  const p = getProductDisplayPrice(product);
  if (!p.hasPrice) return null;
  return `${p.isFrom ? "Desde: " : ""}${formatMenuAmount(p.amount)}`;
}
