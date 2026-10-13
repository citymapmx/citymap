// ─── REGLAS Y LÍMITES DE MODIFICADORES DE PRODUCTOS ──────────────────────────
// Gestiona los 4 tipos de modificadores (Omitir, Extra Rápido, Variantes y Complementos),
// sus límites mínimo/máximo por grupo, validaciones, resúmenes y auto-colapsado.

const CFG_REGEX = /^(.*?)(?:::__cfg__\((\d*),(\d*)\))?$/s;

export function parseOptionNameAndRules(rawName) {
  const str = String(rawName || "");
  const match = str.match(CFG_REGEX);
  if (!match) {
    return { cleanName: str.trim(), encodedMin: null, encodedMax: null };
  }
  const cleanName = (match[1] || "").trim();
  const encodedMin = match[2] !== undefined && match[2] !== "" ? parseInt(match[2], 10) : null;
  const encodedMax = match[3] !== undefined && match[3] !== "" ? parseInt(match[3], 10) : null;
  return {
    cleanName,
    encodedMin: Number.isFinite(encodedMin) ? encodedMin : null,
    encodedMax: Number.isFinite(encodedMax) && encodedMax > 0 ? encodedMax : null,
  };
}

export function getCleanOptionName(optOrName) {
  const raw = typeof optOrName === "string" ? optOrName : optOrName?.name;
  return parseOptionNameAndRules(raw).cleanName;
}

export function serializeOptionName(name, { min = 0, max = null, encode = true } = {}) {
  const { cleanName } = parseOptionNameAndRules(name);
  if (!encode) return cleanName;
  const minNum = Math.max(0, parseInt(min, 10) || 0);
  const maxParsed = max !== null && max !== undefined && max !== "" ? parseInt(max, 10) : null;
  const maxNum = Number.isFinite(maxParsed) && maxParsed > 0 ? maxParsed : null;

  if (minNum > 0 || maxNum !== null) {
    return `${cleanName}::__cfg__(${minNum},${maxNum ?? ""})`;
  }
  return cleanName;
}

export function getModifierKind(opt) {
  if (!opt) return "multiple";
  const vals = Array.isArray(opt.store_option_values) ? opt.store_option_values : [];
  if (vals.length === 0) return "toggle_omit";
  if (vals.length === 1 && String(vals[0]?.label || "").trim().toLowerCase() === "sí") {
    return Number(vals[0]?.extra_price || 0) > 0 ? "toggle_add" : "toggle_omit";
  }
  return opt.type === "single" ? "single" : "multiple";
}

export function getOptionRules(opt) {
  if (!opt) {
    return { kind: "multiple", cleanName: "", min: 0, max: null, isRequired: false, totalValues: 0 };
  }
  const vals = Array.isArray(opt.store_option_values) ? opt.store_option_values : [];
  const totalValues = vals.length;
  const kind = getModifierKind(opt);
  const { cleanName, encodedMin, encodedMax } = parseOptionNameAndRules(opt.name);

  if (kind === "toggle_omit" || kind === "toggle_add") {
    return {
      kind,
      cleanName,
      min: 0,
      max: 1,
      isRequired: false,
      totalValues,
    };
  }

  if (kind === "single") {
    const req = encodedMin !== null ? encodedMin >= 1 : Boolean(opt.is_required);
    return {
      kind,
      cleanName,
      min: req ? 1 : 0,
      max: 1,
      isRequired: req,
      totalValues,
    };
  }

  // kind === 'multiple' (Complementos)
  let min = 0;
  if (opt.min_selections !== undefined && opt.min_selections !== null && opt.min_selections !== "") {
    min = Math.max(0, parseInt(opt.min_selections, 10) || 0);
  } else if (encodedMin !== null) {
    min = Math.max(0, encodedMin);
  } else if (opt.is_required) {
    min = 1;
  }

  let max = null;
  if (opt.max_selections !== undefined && opt.max_selections !== null && opt.max_selections !== "") {
    const parsedMax = parseInt(opt.max_selections, 10);
    if (Number.isFinite(parsedMax) && parsedMax > 0) max = parsedMax;
  } else if (encodedMax !== null && encodedMax > 0) {
    max = encodedMax;
  }

  if (totalValues > 0 && min > totalValues) {
    min = totalValues;
  }
  if (max !== null && min > max) {
    max = min;
  }

  return {
    kind,
    cleanName,
    min,
    max,
    isRequired: min >= 1,
    totalValues,
  };
}

export function normalizeProductOption(opt) {
  if (!opt || typeof opt !== "object") return opt;
  const rules = getOptionRules(opt);
  opt.name = rules.cleanName;
  opt.min_selections = rules.min;
  opt.max_selections = rules.max;
  opt.is_required = rules.isRequired;
  return opt;
}

export function normalizeStoreOptionsInData(data) {
  if (!data) return data;
  if (Array.isArray(data)) {
    data.forEach(normalizeStoreOptionsInData);
    return data;
  }
  if (typeof data === "object") {
    if (Array.isArray(data.store_products)) {
      data.store_products.forEach(normalizeStoreOptionsInData);
    }
    if (Array.isArray(data.store_product_options)) {
      data.store_product_options.forEach(normalizeProductOption);
    }
    if ("store_option_values" in data && "name" in data && "type" in data) {
      normalizeProductOption(data);
    }
  }
  return data;
}

export function formatOptionRuleBadge(opt) {
  const { kind, min, max, isRequired } = getOptionRules(opt);
  const statusText = isRequired ? "Obligatorio" : "Opcional";

  if (kind === "single") {
    return { statusText, ruleText: "Elige 1", isRequired, min, max };
  }
  if (kind === "toggle_omit" || kind === "toggle_add") {
    return { statusText: "Opcional", ruleText: null, isRequired: false, min: 0, max: 1 };
  }

  let ruleText = "Varios";
  if (min > 0 && max !== null && min === max) {
    ruleText = min === 1 ? "Elige 1" : `Elige ${min}`;
  } else if (min > 0 && max !== null) {
    ruleText = `Elige de ${min} a ${max}`;
  } else if (min === 0 && max !== null) {
    ruleText = max === 1 ? "Máximo 1" : `Máximo ${max}`;
  } else if (min > 0 && max === null) {
    ruleText = `Mínimo ${min}`;
  }

  return { statusText, ruleText, isRequired, min, max };
}

export function validateOptionSelection(opt, selection) {
  const { kind, cleanName, min, max, isRequired } = getOptionRules(opt);
  const count = Array.isArray(selection) ? selection.length : selection ? 1 : 0;

  const meetsMin = count >= min;
  const meetsMax = max === null || count <= max;
  const valid = meetsMin && meetsMax;
  const reachedMax = max !== null && count >= max;

  // Se considera "completada" para contraerse automáticamente al seleccionar:
  // - Variantes (single / max=1): al elegir 1 opción.
  // - Complementos (multiple) con límite máximo (max >= 1): únicamente cuando el cliente
  //   alcanza el máximo permitido (ej. 2 de 2, o 3 de 3), nunca en la primera si aún puede elegir más.
  const shouldAutoCollapseOnSelect =
    kind === "single"
      ? count >= 1
      : kind === "multiple" && max !== null && max >= 1 && count >= max;

  let errorMessage = null;
  if (!meetsMin) {
    if (kind === "single" || (min === 1 && max === 1)) {
      errorMessage = `Selecciona una opción en "${cleanName}"`;
    } else if (min === max) {
      errorMessage = `Debes elegir exactamente ${min} opciones en "${cleanName}" (llevas ${count})`;
    } else {
      errorMessage = `Debes elegir al menos ${min} ${min === 1 ? "opción" : "opciones"} en "${cleanName}"`;
    }
  } else if (!meetsMax) {
    errorMessage = `Solo puedes elegir un máximo de ${max} ${max === 1 ? "opción" : "opciones"} en "${cleanName}"`;
  }

  return {
    valid,
    count,
    min,
    max,
    isRequired,
    reachedMax,
    shouldAutoCollapseOnSelect,
    errorMessage,
  };
}

export function getOptionSelectionSummary(opt, selection) {
  if (!selection) return "";
  const list = Array.isArray(selection) ? selection.filter(Boolean) : [selection];
  if (list.length === 0) return "";
  return list.map((v) => v.label || opt?.name || "").filter(Boolean).join(", ");
}
