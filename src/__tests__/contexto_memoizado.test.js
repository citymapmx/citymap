import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

// ── Punto 5 de lentitud: memoizar appContextValue ──
// Antes App.jsx armaba appContextValue como objeto literal nuevo en cada
// render, así que cada setState de App (búsqueda, toasts, auth, favoritos)
// re-renderizaba HomeView/MapView completos aunque nada de lo que usan
// hubiera cambiado. Ahora el objeto es useMemo y, para que el memo no se
// invalide en vano, todo lo que antes se recreaba en cada render se
// estabilizó: navigate, toggleSaveEvent, postReview, postExperienceReview,
// toggleLikeReview y requestLocation son useCallback; T y viewStyle son
// useMemo; create/update/deleteCollection son useCallback en useFavorites
// y requestAndRegister es useCallback en useWebPush; setView es un noop
// de módulo en vez de una flecha nueva en cada render.

const readSource = (rel) =>
  fs.readFileSync(new URL(rel, import.meta.url), 'utf8');

// Constantes de módulo: identidad fija para siempre, no van en dependencias.
const MODULE_CONSTANTS = new Set([
  'AutoSlider', 'CAT_EMOJI', 'FONT_BIZ', 'EVENT_CATS', 'getEventStatus',
  'createSlug', 'cleanCityPrefix', 'parseMenuUrls', 'AutoSliderEv',
  'LoaderFallback', 'GMap', 'sb', 'noopSetView',
]);

// Extrae del literal las entradas `clave` o `clave: valor` y devuelve los
// nombres de valor que el memo debe listar como dependencias.
function contextValueNames(appJs) {
  const start = appJs.indexOf('const appContextValue = useMemo(() => ({');
  expect(start).toBeGreaterThan(-1);
  const literalStart = appJs.indexOf('({', start) + 2;
  const end = appJs.indexOf('}), [', start);
  expect(end).toBeGreaterThan(-1);
  const literal = appJs.slice(literalStart, end).replace(/\/\/.*/g, '');
  const names = new Set();
  const re = /(?:^|[,{])\s*([A-Za-z_$][\w$]*)\s*(?::\s*([A-Za-z_$][\w$]*))?/g;
  let m;
  while ((m = re.exec(literal)) !== null) {
    const value = m[2] || m[1];
    names.add(value);
  }
  return names;
}

function memoDeps(appJs) {
  const start = appJs.indexOf('const appContextValue = useMemo(() => ({');
  const depStart = appJs.indexOf('}), [', start);
  const depEnd = appJs.indexOf(']);', depStart);
  expect(depStart).toBeGreaterThan(-1);
  expect(depEnd).toBeGreaterThan(-1);
  const raw = appJs.slice(depStart + '}), ['.length, depEnd);
  return new Set(raw.split(',').map((s) => s.trim()).filter(Boolean));
}

describe('punto 5: appContextValue memoizado', () => {
  it('el contexto se crea con useMemo, no como literal nuevo en cada render', () => {
    const appJs = readSource('../App.jsx');
    expect(appJs).toContain('const appContextValue = useMemo(() => ({');
    expect(appJs).not.toContain('const appContextValue = {\n');
    // El memo se cierra con su lista de dependencias.
    expect(appJs).toMatch(/LoaderFallback, GMap\n\s{2}\}\), \[/);
  });

  it('las dependencias cubren todos los valores reactivos del objeto', () => {
    const appJs = readSource('../App.jsx');
    const values = contextValueNames(appJs);
    const deps = memoDeps(appJs);
    const expected = [...values].filter((v) => !MODULE_CONSTANTS.has(v));
    const missing = expected.filter((v) => !deps.has(v));
    expect(missing).toEqual([]);
    // Sin dependencias de más: cada entrada del array es un valor del objeto
    // o una constante de módulo conocida (ningún nombre inventado).
    const extra = [...deps].filter((d) => !values.has(d) && !MODULE_CONSTANTS.has(d));
    expect(extra).toEqual([]);
  });

  it('los handlers ya no se recrean en cada render y ven estado fresco', () => {
    const appJs = readSource('../App.jsx');
    // Patrones viejos (función plana en el cuerpo del componente) fuera.
    expect(appJs).not.toContain('const navigate = v => {');
    expect(appJs).not.toContain('const toggleSaveEvent = (id, e) => {');
    expect(appJs).not.toContain('const postReview = async (bizId) => {');
    expect(appJs).not.toContain('const postExperienceReview = async expId => {');
    expect(appJs).not.toContain('const toggleLikeReview = async r => {');
    expect(appJs).not.toContain('const requestLocation = (cb) => {');
    // Ahora son useCallback…
    expect(appJs).toContain('const navigate = useCallback(v => {');
    expect(appJs).toContain('const toggleSaveEvent = useCallback((id, e) => {');
    expect(appJs).toContain('const postReview = useCallback(async (bizId) => {');
    expect(appJs).toContain('const postExperienceReview = useCallback(async expId => {');
    expect(appJs).toContain('const toggleLikeReview = useCallback(async r => {');
    expect(appJs).toContain('const requestLocation = useCallback((cb) => {');
    // …y sus dependencias incluyen el estado que leen en vivo, para que
    // el cierre no publique ni guarde con valores viejos.
    expect(appJs).toMatch(/const toggleSaveEvent = useCallback\([\s\S]*?\}, \[user, savedEventIds, toast\$, setShowAuth, setSavedEventIds\]\)/);
    expect(appJs).toMatch(/const postReview = useCallback\([\s\S]*?\}, \[user, profile, reviewStar, reviewImgFile, reviewText, mapPins, activeCity, loadReviews, toast\$/);
    expect(appJs).toMatch(/const postExperienceReview = useCallback\([\s\S]*?\}, \[user, profile, reviewStar, reviewImgFile, reviewText, loadExperienceReviews, toast\$/);
    expect(appJs).toMatch(/const toggleLikeReview = useCallback\([\s\S]*?\}, \[user, setReviews, setShowAuth\]\)/);
    expect(appJs).toMatch(/const requestLocation = useCallback\([\s\S]*?\}, \[toast\$, t, setUserCoords\]\)/);
    expect(appJs).toMatch(/const navigate = useCallback\([\s\S]*?\}, \[location, activeCity, cities, setShowCountryPicker/);
  });

  it('T y viewStyle son useMemo y setView es un noop estable de módulo', () => {
    const appJs = readSource('../App.jsx');
    expect(appJs).not.toContain('const T = getT(dark);');
    expect(appJs).toContain('const T = useMemo(() => getT(dark), [dark]);');
    expect(appJs).not.toContain('const viewStyle = { opacity:');
    expect(appJs).toContain('const viewStyle = useMemo(() => ({ opacity: fade');
    expect(appJs).toContain('}), [fade]);');
    expect(appJs).toContain('const noopSetView = () => {};');
    expect(appJs).toContain('setView: noopSetView');
    expect(appJs).not.toContain('setView: () => {}');
  });

  it('las colecciones de favoritos son useCallback en useFavorites', () => {
    const favJs = readSource('../hooks/useFavorites.js');
    expect(favJs).not.toContain('const createCollection = async (name, emoji) => {');
    expect(favJs).not.toContain('const updateCollection = async (updatedCol) => {');
    expect(favJs).not.toContain('const deleteCollection = async (id) => {');
    expect(favJs).toContain('const createCollection = useCallback(async (name, emoji) => {');
    expect(favJs).toContain('const updateCollection = useCallback(async (updatedCol) => {');
    expect(favJs).toContain('const deleteCollection = useCallback(async (id) => {');
    // Dependen del usuario y del toast en vivo, como toggleFav.
    for (const name of ['createCollection', 'updateCollection', 'deleteCollection']) {
      expect(favJs).toMatch(new RegExp(`const ${name} = useCallback\\([\\s\\S]*?\\}, \\[user, sb, setShowAuth, toast\\$\\]\\)`));
    }
  });

  it('requestAndRegister es useCallback en useWebPush y register sigue plano', () => {
    const pushJs = readSource('../hooks/useWebPush.js');
    // register se queda como función plana (como estaba): solo lee
    // citySlug y refs estables, y la usa requestAndRegister y el efecto.
    expect(pushJs).toContain('async function register() {');
    expect(pushJs).not.toContain('const register = useCallback');
    // requestAndRegister sí es useCallback: es lo que App mete en el
    // contexto memoizado, así que su identidad solo cambia con la ciudad.
    expect(pushJs).toContain('const requestAndRegister = useCallback(async () => {');
    expect(pushJs).toMatch(/const requestAndRegister = useCallback\([\s\S]*?\}, \[citySlug\]\)/);
    // register no va en sus dependencias a propósito (ver el comentario
    // en el código): solo lee citySlug, que ya está listado.
    expect(pushJs).not.toMatch(/const requestAndRegister = useCallback\([\s\S]*?\}, \[register\]\)/);
  });
});
