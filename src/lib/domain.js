export const IS_WORLD = typeof window !== "undefined" && window.location.hostname.endsWith("citymap.world");

export const COUNTRY_NAMES = {
  mx: "México", us: "Estados Unidos", es: "España",
  ca: "Canadá", ar: "Argentina", co: "Colombia",
  fr: "Francia", gb: "Inglaterra",
};

export const COUNTRY_FLAGS = {
  mx: "🇲🇽", us: "🇺🇸", es: "🇪🇸",
  ca: "🇨🇦", ar: "🇦🇷", co: "🇨🇴",
  fr: "🇫🇷", gb: "🇬🇧",
};

export function getCountryCode(citySlug, cities = []) {
  const city = cities.find((c) => c.slug === citySlug);
  return city?.country_code || "mx";
}

// ¿Esta ciudad pertenece al dominio actual? En citymap.world solo las
// ciudades fuera de México; en citymap.mx solo México. Las ciudades que
// no están en la lista (o sin country_code) se tratan como mexicanas,
// igual que en el resto del código.
export function isWorldCity(citySlug, cities = []) {
  return (getCountryCode(citySlug, cities) || "mx").toLowerCase() !== "mx";
}

export function hostIncludesCity(citySlug, cities = []) {
  return IS_WORLD ? isWorldCity(citySlug, cities) : !isWorldCity(citySlug, cities);
}

// city_slug puede ser una lista separada por comas (eventos multi-ciudad):
// el contenido pertenece al dominio si ALGUNA de sus ciudades es de aquí.
export function hostIncludesCityList(citySlugValue, cities = []) {
  const slugs = String(citySlugValue || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (slugs.length === 0) return !IS_WORLD;
  return slugs.some((slug) => hostIncludesCity(slug, cities));
}

export function buildCityPath(citySlug, cities = []) {
  if (!citySlug) return "/";
  if (!IS_WORLD) return "/" + citySlug;
  return "/" + getCountryCode(citySlug, cities) + "/" + citySlug;
}

// URL absoluta de la página de una ciudad EN SU dominio (no en el
// actual): México → https://citymap.mx/<slug>; internacional →
// https://www.citymap.world/<cc>/<slug>. Para el salto de dominio del
// selector de ciudad: elegir París en .mx lleva a .world/fr/paris y
// elegir Tepic en .world lleva a citymap.mx/tepic.
export function buildCityUrl(citySlug, cities = []) {
  const slug = String(citySlug || "").toLowerCase();
  if (!slug) return "https://citymap.mx/";
  if (!isWorldCity(slug, cities)) return `https://citymap.mx/${slug}`;
  return `https://www.citymap.world/${getCountryCode(slug, cities)}/${slug}`;
}

// Adónde lleva elegir una ciudad en el selector: si es del dominio
// actual, navegación interna (la app ya la hace con handleCitySelect);
// si es del otro dominio, salto completo a su URL canónica en ese
// dominio. La sesión se pierde al cambiar de dominio (igual que con
// los 308 del middleware); no se intenta sincronizar aquí.
export function citySelectionTarget(citySlug, cities = []) {
  if (!citySlug) return { crossDomain: false, url: null };
  if (hostIncludesCity(citySlug, cities)) return { crossDomain: false, url: null };
  return { crossDomain: true, url: buildCityUrl(citySlug, cities) };
}

export function buildBizUrl(citySlug, bizSlug, cities = []) {
  const domain = IS_WORLD ? "citymap.world" : "citymap.mx";
  return "https://" + domain + buildCityPath(citySlug, cities) + "/" + bizSlug;
}

export function parseSegments(rawSegments) {
  if (!IS_WORLD) return { countryCode: "mx", segments: rawSegments };
  const known = Object.keys(COUNTRY_NAMES);
  if (rawSegments.length > 0 && known.includes(rawSegments[0])) {
    return { countryCode: rawSegments[0], segments: rawSegments.slice(1) };
  }
  return { countryCode: "mx", segments: rawSegments };
}
