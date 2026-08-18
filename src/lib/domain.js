export const IS_WORLD = typeof window !== "undefined" && window.location.hostname.endsWith("citymap.world");

export const COUNTRY_NAMES = {
  mx: "México", us: "Estados Unidos", es: "España",
  ca: "Canadá", ar: "Argentina", co: "Colombia",
};

export const COUNTRY_FLAGS = {
  mx: "🇲🇽", us: "🇺🇸", es: "🇪🇸",
  ca: "🇨🇦", ar: "🇦🇷", co: "🇨🇴",
};

export function getCountryCode(citySlug, cities = []) {
  const city = cities.find((c) => c.slug === citySlug);
  return city?.country_code || "mx";
}

export function buildCityPath(citySlug, cities = []) {
  if (!citySlug) return "/";
  if (!IS_WORLD) return "/" + citySlug;
  return "/" + getCountryCode(citySlug, cities) + "/" + citySlug;
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
