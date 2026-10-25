export function validatePromotion(promotion) {
  if (!promotion?.enabled) return null;
  if (promotion.sale_price === '' || !Number.isFinite(Number(promotion.sale_price)) || Number(promotion.sale_price) <= 0) return 'Agrega un precio promocional mayor a cero.';
  if (promotion.starts_on && promotion.ends_on && promotion.ends_on < promotion.starts_on) return 'La fecha final debe ser igual o posterior a la inicial.';
  if (Array.isArray(promotion.days) && !promotion.days.length) return 'Selecciona al menos un día.';
  if (Array.isArray(promotion.intents) && !promotion.intents.length) return 'Selecciona al menos una modalidad.';
  for (const field of ['starts_on', 'ends_on']) {
    if (!promotion[field]) continue;
    const parsed = new Date(`${promotion[field]}T12:00:00Z`);
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0,10) !== promotion[field]) return 'Revisa las fechas de la promoción.';
  }
  for (const field of ['start_time', 'end_time']) if (promotion[field] && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(promotion[field])) return 'Revisa los horarios de la promoción.';
  return null;
}

export function isPromotionActive(product, {now = new Date(), timeZone = 'America/Mazatlan', intent = 'delivery'} = {}) {
  const p = product?.promotion;
  if (!p?.enabled || !(Number(product.price)>0) || product.is_available === false || validatePromotion(p)) return false;
  if (p.intents?.length && !p.intents.includes(intent)) return false;
  let parts;
  try { parts = new Intl.DateTimeFormat('en-CA', {timeZone, year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now); } catch { return false; }
  const part = type => parts.find(item=>item.type===type)?.value;
  let day = `${part('year')}-${part('month')}-${part('day')}`;
  const minutes = Number(part('hour')) * 60 + Number(part('minute'));
  const asMinutes = value => { const [h,m]=value.split(':').map(Number);return h*60+m; };
  const start = p.start_time ? asMinutes(p.start_time) : 0;
  const end = p.end_time ? asMinutes(p.end_time) : 1440;
  if (start > end) {
    if (minutes >= end && minutes < start) return false;
    if (minutes < end) day = new Date(Date.parse(`${day}T12:00:00Z`) - 86400000).toISOString().slice(0,10);
  } else if (minutes < start || minutes >= end) return false;
  if ((p.starts_on && day < p.starts_on) || (p.ends_on && day > p.ends_on)) return false;
  const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
  return !Array.isArray(p.days) || p.days.includes(weekday);
}

export function promotionScheduleLabel(p) {
  const weekdays = ['dom','lun','mar','mié','jue','vie','sáb'];
  const days = p.days?.length < 7 ? p.days.map(day=>weekdays[day]).join(', ') : '';
  const hours = p.start_time || p.end_time ? `${p.start_time || '00:00'}–${p.end_time || '23:59'}` : '';
  const date = p.ends_on ? `Hasta el ${new Date(`${p.ends_on}T12:00:00Z`).toLocaleDateString('es-MX',{day:'numeric',month:'short',timeZone:'UTC'})}` : '';
  const mode = p.intents?.length === 1 ? (p.intents[0] === 'local' ? 'Solo en el local' : 'Para llevar / domicilio') : '';
  return [days,hours,date,mode].filter(Boolean).join(' · ');
}

export function getPromotionProduct(product, timeZone = 'America/Mazatlan') {
  return {...product, name:`${product.name} · Promoción`,price:Number(product.promotion.sale_price),description:[product.description,product.promotion.conditions && `Condiciones: ${product.promotion.conditions}`,promotionScheduleLabel(product.promotion)].filter(Boolean).join('\n\n'),_promotion:{timeZone,config:{...product.promotion}}};
}

export function isCartPromotionValid(product, intent = 'delivery', now = new Date()) {
  return !product._promotion || isPromotionActive({...product,promotion:product._promotion.config},{now,timeZone:product._promotion.timeZone,intent});
}
