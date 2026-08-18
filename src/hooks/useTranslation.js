import { useUIStore } from "../store/useUIStore.js";
import { TRANSLATIONS } from "../lib/i18n.js";

export function useTranslation() {
  const lang = useUIStore(s => s.lang);
  
  const t = (key, fallback) => {
    if (!key) return "";
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
