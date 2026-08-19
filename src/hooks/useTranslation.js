import { useUIStore } from "../store/useUIStore.js";
import { TRANSLATIONS } from "../lib/i18n.js";

export function useTranslation() {
  const lang = useUIStore(s => s.lang);
  
  const t = (key, fallback) => {
    if (!key) return "";
    
    // Handle array case (like [statusText, suffixElement] from schedule utils)
    if (Array.isArray(key)) {
      return key.map((item, idx) => {
        if (idx === 0 && typeof item === 'string') {
          return t(item);
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
    
    // Look up translation
    if (dict[cleanKey] !== undefined) {
      return dict[cleanKey];
    }
    
    // Fallback if not found in dictionary
    return fallback !== undefined ? fallback : key;
  };
  
  return {
    t,
    lang,
    setLang: (l) => useUIStore.getState().setLang(l)
  };
}
