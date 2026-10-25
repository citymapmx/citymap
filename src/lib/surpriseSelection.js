export const MOODS = [
  { id: 'comer',     emoji: '🍽️', label: 'Comer algo rico',  cats: ['restaurante', 'marisco', 'taco', 'pizza', 'sushi', 'hamburguesa', 'alitas', 'comida', 'cenaduria', 'cena'] },
  { id: 'cafe',      emoji: '☕', label: 'Un café',           cats: ['cafeteria', 'cafe', 'postre', 'helado', 'churro', 'crepa'] },
  { id: 'tomar',     emoji: '🍺', label: 'Tomar algo',        cats: ['bar', 'antro', 'cantina', 'coctel', 'cocteleria', 'cerveza', 'cerveceria', 'michelada', 'mezcaleria', 'pub'] },
  { id: 'noche',     emoji: '🪩', label: 'Planes nocturnos',  cats: ['antro', 'bar', 'botanero', 'club nocturno', 'discoteca', 'disco', 'karaoke', 'cantina', 'cerveceria', 'coctel', 'pub', 'michelada'] },
  { id: 'planes',    emoji: '🔥', label: 'Encontrar un plan',     cats: ['punto de interes', 'atraccion', 'turismo', 'parque', 'museo', 'senderismo', 'tour', 'lugar', 'experiencia', 'mirador', 'playa', 'laguna', 'rancho', 'balneario', 'paseo', 'reserva', 'cascada', 'zoologico'] }, // Se nutre de experiences + mapPins
  { id: 'compras',   emoji: '🛍️', label: 'Comprar algo',      cats: ['compras', 'tienda', 'boutique', 'plaza', 'comercial', 'ropa', 'moda', 'zapateria', 'mall', 'departamental'] },
  { id: 'eventos',   emoji: '🎫', label: 'Eventos locales',   cats: ['evento'] }, // Se maneja especial en la lógica
  { id: 'sorpresa',  emoji: '🎲', label: '¡Sorpréndeme!',        cats: [] },
];

const normalize = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const matches = (value, terms) => terms.some(term => new RegExp(`(^| )${normalize(term)}(?:s|es)?( |$)`).test(normalize(value)));
const parseJSON = value => { if (typeof value !== 'string') return value; try { return JSON.parse(value); } catch { return null; } };

export function closesLate(schedule) {
  const sch = parseJSON(schedule);
  if (!sch || sch.type === 'none') return false;
  if (sch.type === 'always_open') return true;
  const minutes = value => {
    const match = value.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([ap]\.?\s*m\.?)?$/i);
    if (!match) return null;
    let hour = Number(match[1]); const minute = Number(match[2] || 0);
    if (hour > 23 || minute > 59) return null;
    const suffix = match[3]?.replace(/[.\s]/g,'').toLowerCase();
    if (suffix === 'pm' && hour < 12) hour += 12;
    if (suffix === 'am' && hour === 12) hour = 0;
    return hour * 60 + minute;
  };
  return ['lun','mar','mie','jue','vie','sab','dom'].some(day => String(sch[day] || '').split(/\n|,/).some(shift => {
    const parts = shift.split(/\s*[-–]\s*|\s+a\s+/i);
    if (parts.length !== 2) return false;
    const start = minutes(parts[0]), end = minutes(parts[1]);
    return start !== null && end !== null && (end <= start || end >= 22 * 60);
  }));
}

export function isValidMatch(business, moodId, terms) {
  if (business.isExperience) return moodId === 'planes';
  const fields = [business.category, business.type, business.activity_type];
  const coffee = ['cafe','cafeteria','postre','helado','churro','crepa'];
  const drinks = ['bar','antro','cantina','cerveceria','pub','mezcaleria','cocteleria','botanero','michelada'];
  if (moodId === 'noche') {
    // A late closing time alone does not turn a restaurant or café into nightlife.
    if (matches(business.type, ['restaurante',...coffee])) return false;
    if (!fields.some(field => matches(field, terms))) return false;
    return closesLate(business.schedule);
  }
  if (moodId === 'tomar' && fields.some(field => matches(field, coffee)) && !fields.some(field => matches(field, drinks))) return false;
  if (moodId === 'compras' && fields.some(field => matches(field,['hotel','hospedaje','motel']))) return false;
  return terms.length === 0 || fields.some(field => matches(field,terms));
}

const COLUMNS = 'id,name,category,type,city_slug,status,plan,schedule,photos,logo_url,banner_url,rating,review_count,lat,lng,address,slug,phone,whatsapp,social_links,is_place';
export function surpriseBusinessQuery(citySlugs, mood, offset = 0, limit = 100) {
  const cities = [...new Set(citySlugs)].filter(slug => /^[a-z0-9-]+$/.test(slug));
  if (!cities.length) throw new Error('Missing city');
  const params = new URLSearchParams({select:COLUMNS,status:'eq.approved',plan:'neq.menu',order:'id.asc',offset:String(offset),limit:String(limit)});
  params.append('or',`(${cities.map(slug=>`city_slug.ilike.*${slug}*`).join(',')})`);
  if (mood.cats.length) {
    const vowels = {a:'[aá]',e:'[eé]',i:'[ií]',o:'[oó]',u:'[uúü]'};
    const pattern = mood.cats.map(term=>normalize(term).replace(/[aeiou]/g,vowel=>vowels[vowel])).join('|');
    params.append('or',`(category.imatch.${pattern},type.imatch.${pattern})`);
  }
  return `?${params}`;
}

// Keep a cursor for each city/mood. Fetch another page before recycling seen results.
export async function loadSurpriseCandidates({get, cache, citySlugs, mood, local = [], seen = new Set(), excludeId, eligible, isCurrent = () => true, pageSize = 100}) {
  const key = `${citySlugs.join(',')}:${mood.id}`;
  let entry = cache.get(key);
  if (!entry) { entry = {rows:[],offset:0,done:false,loaded:false}; cache.set(key,entry); }
  const merge = () => [...new Map([...local,...entry.rows].map(row=>[row.id,row])).values()];
  const hasUnseen = () => merge().some(row => row.id !== excludeId && !seen.has(row.id) && eligible(row));
  while (isCurrent() && (!entry.loaded || (!entry.done && !hasUnseen()))) {
    const page = await get('businesses',surpriseBusinessQuery(citySlugs,mood,entry.offset,pageSize));
    if (!isCurrent()) return [];
    if (!Array.isArray(page)) throw new Error('Invalid business response');
    entry.rows.push(...page.map(row=>({...row,schedule:parseJSON(row.schedule),photos:parseJSON(row.photos),social_links:parseJSON(row.social_links)})));
    entry.offset += page.length; entry.loaded = true; entry.done = page.length < pageSize;
  }
  return merge();
}
