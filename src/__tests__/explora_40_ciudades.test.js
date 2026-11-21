import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { crossDomainCityUrl } from '../lib/seoRoutes.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// «Explora por ciudad» con las 40 ciudades en los dos dominios (21 nov
// 2026, Jonathan): en el inicio global de citymap.world solo salían las
// internacionales y en citymap.mx solo las mexicanas, porque allCities
// se filtraba con hostIncludesCity. Ahora la sección lista TODAS las
// ciudades activas; el resto del muro sigue siendo por dominio.

describe('Explora por ciudad: las 40 ciudades en los dos dominios', () => {
  const src = read('../views/GlobalHomeView.jsx');

  it('la sección usa su propia lista (exploreCities) con TODAS las ciudades', () => {
    expect(src).toContain('const [exploreCities, setExploreCities] = useState([])');
    expect(src).toContain('setExploreCities(cityList)');
    expect(src).toContain('const list = [...(exploreCities || [])]');
    expect(src).toContain('{exploreCities.length > 0 && (');
  });

  it('el muro sigue siendo solo del dominio (allCities = hostCities)', () => {
    expect(src).toContain('setAllCities(hostCities)');
    expect(src).toContain('const hostCities = cityList.filter((c) => hostIncludesCity(c.slug, cityList))');
  });

  it('los conteos de cada tarjeta se calculan para todas las ciudades', () => {
    // El bloque de popularidad itera cityList (no hostCities) y pide
    // negocios + eventos por ciudad.
    const block = src.slice(src.indexOf('Popularidad por ciudad'), src.indexOf('} catch (e) {'));
    expect(block).toContain('Promise.all(cityList.map(async (c) => {');
    expect(block).toContain("sb.count('businesses'");
    expect(block).toContain("sb.count('events'");
    expect(block).toContain('total: b + e');
  });

  it('el orden no cambia: total desc, desempate por nombre', () => {
    const block = src.slice(src.indexOf('const sortedCities'), src.indexOf('}, [exploreCities, popCounts])'));
    expect(block).toContain('popCounts[a.slug]?.total ?? 0');
    expect(block).toContain('if (pb !== pa) return pb - pa;');
    expect(block).toContain("return (a.name || '').localeCompare(b.name || '');");
  });

  it('el muro no cambia: negocios, eventos, experiencias y tours siguen filtrados por dominio', () => {
    expect(src).toContain('const bizFilter = hostSlugs.length > 0');
    expect(src).toContain('hostIncludesCity(b.city_slug, cityList)');
    expect(src).toContain('hostIncludesCityList(ev.city_slug, cityList)');
    expect(src).toContain('hostIncludesCityList(x.city_slug, cityList)');
  });

  it('la tarjeta sigue navegando con navigate(`/${slug}`) y «Ver más/menos» sigue igual', () => {
    expect(src).toContain('onClick={() => navigate(`/${city.slug}`)}');
    expect(src).toContain('const shownCities = showAllCities ? sortedCities : sortedCities.slice(0, 5);');
  });
});

describe('toque en la tarjeta: salto de dominio (PR #423)', () => {
  it('una mexicana tocada en .world salta a citymap.mx', () => {
    expect(crossDomainCityUrl('/guadalajara', true)).toBe('https://citymap.mx/guadalajara');
    expect(crossDomainCityUrl('/tepic', true)).toBe('https://citymap.mx/tepic');
  });

  it('una internacional tocada en .mx salta a .world con su prefijo de país', () => {
    expect(crossDomainCityUrl('/madrid', false)).toBe('https://www.citymap.world/es/madrid');
    expect(crossDomainCityUrl('/tokio', false)).toBe('https://www.citymap.world/jp/tokio');
    expect(crossDomainCityUrl('/paris', false)).toBe('https://www.citymap.world/fr/paris');
  });

  it('en su propio dominio no hay salto', () => {
    expect(crossDomainCityUrl('/guadalajara', false)).toBeNull();
    expect(crossDomainCityUrl('/madrid', true)).toBeNull();
    expect(crossDomainCityUrl('/jp/tokio', true)).toBeNull();
  });

  it('Nueva York es ciudad world: en .mx salta a .world y en .world se queda', () => {
    expect(crossDomainCityUrl('/new-york', false)).toBe('https://www.citymap.world/us/new-york');
    expect(crossDomainCityUrl('/new-york', true)).toBeNull();
  });
});
