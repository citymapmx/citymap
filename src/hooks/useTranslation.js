import { useCallback, useEffect, useState } from "react";
import { useUIStore } from "../store/useUIStore.js";
import { TRANSLATIONS, ensureEnglishTranslations, translateDynamicStatus } from "../lib/i18n.js";

export function useTranslation() {
  const lang = useUIStore(s => s.lang);
  // El diccionario en inglés se carga en diferido (ver i18n.js): cuando
  // llega, este contador fuerza un re-render para que t() ya lo use. Hasta
  // entonces t() usa el español (el fallback de siempre).
  const [, setI18nTick] = useState(0);
  useEffect(() => {
    if (lang !== 'en' || TRANSLATIONS.en) return undefined;
    let live = true;
    ensureEnglishTranslations()
      .then(() => { if (live) setI18nTick((v) => v + 1); })
      .catch(() => {});
    return () => { live = false; };
  }, [lang]);
  
  const t = useCallback((key, fallback, vars) => {
    if (!key) return "";
    
    // Handle array case (like [statusText, suffixElement] from schedule utils):
    // every string item goes through t() (status + " · Previa Cita" suffix);
    // React elements pass through untouched.
    if (Array.isArray(key)) {
      return key.map((item) => {
        if (typeof item === 'string') {
          return t(item, undefined, vars);
        }
        return item;
      });
    }
    
    // Non-string fallback
    if (typeof key !== 'string') {
      return key;
    }
    
    const cleanKey = key.toLowerCase().trim();
    const dict = TRANSLATIONS[lang] || TRANSLATIONS["es"];
    
    // Look up translation. The dict historically mixes "comida rapida"
    // (spaces) and "antros-y-bares" (hyphens), so after the direct lookup
    // we also try both normalizations (dynamic category labels use t(label)).
    let value;
    if (dict[cleanKey] !== undefined) {
      value = dict[cleanKey];
    } else if (dict[cleanKey.replace(/\s+/g, '-')] !== undefined) {
      value = dict[cleanKey.replace(/\s+/g, '-')];
    } else if (dict[cleanKey.replace(/-/g, ' ')] !== undefined) {
      value = dict[cleanKey.replace(/-/g, ' ')];
    } else if (fallback === undefined) {
      // No dict entry and no fallback (e.g. schedule status strings):
      // try the dynamic patterns ("Cierra pronto (45m)", "Cerrado, abre...").
      value = translateDynamicStatus(key, lang) ?? key;
    } else {
      value = fallback;
    }

    // Interpolation: t('key', 'fallback ${name}', { name: value }).
    // Only ${word} placeholders are replaced; unknown ones stay as-is.
    if (vars && typeof value === 'string') {
      value = value.replace(/\$\{(\w+)\}/g, (m, name) =>
        vars[name] !== undefined && vars[name] !== null ? String(vars[name]) : m
      );
    }
    
    return value;
  }, [lang]);
  
  return {
    t,
    lang,
    setLang: (l) => useUIStore.getState().setLang(l)
  };
}
