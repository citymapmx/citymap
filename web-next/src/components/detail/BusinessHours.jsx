import React from 'react';
import Icon from '../ui/Icon.jsx';

const DAYS = [['lun','Lunes'],['mar','Martes'],['mie','Miércoles'],['jue','Jueves'],['vie','Viernes'],['sab','Sábado'],['dom','Domingo']];
const KEYS = {Mon:'lun',Tue:'mar',Wed:'mie',Thu:'jue',Fri:'vie',Sat:'sab',Sun:'dom'};
export function formatBusinessHours(raw) {
  if (!raw || /cerrado/i.test(String(raw))) return 'Cerrado';
  return String(raw).split('\n').map(line => line.split(/\s*[–-]\s*|\s+a\s+/i).map(value => {
    const match = value.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([ap]\.?\s*m\.?)?$/i);
    if (!match) return value.trim();
    let hour = Number(match[1]);
    const suffix = match[3]?.replace(/[.\s]/g,'').toLowerCase();
    if (suffix === 'pm' && hour < 12) hour += 12;
    if (suffix === 'am' && hour === 12) hour = 0;
    return `${hour % 12 || 12}:${match[2] || '00'} ${hour >= 12 ? 'p. m.' : 'a. m.'}`;
  }).join(' – ')).join('\n');
}

export default function BusinessHours({business, T, text = T.text, sub = T.sub, border = T.border, timeZone, now = Date.now()}) {
  const schedule = business.schedule || {};
  if (schedule.type === 'none') return null;
  let today;
  try { today = KEYS[new Intl.DateTimeFormat('en-US',{weekday:'short',timeZone}).format(new Date(now))]; }
  catch { today = ['dom','lun','mar','mie','jue','vie','sab'][new Date(now).getDay()]; }
  const regular = !schedule.type || ['regular','advanced','delivery'].includes(schedule.type);
  const hasWeek = regular && DAYS.some(([key]) => schedule[key] != null);
  const fallback = schedule.type === 'always_open' ? 'Abierto las 24 horas' : regular ? (business.hours || 'Horario no disponible') : 'Atención con cita previa. Contacta al negocio.';
  const todayText = hasWeek ? (schedule[today] != null ? formatBusinessHours(schedule[today]) : 'Horario no disponible') : fallback;
  const heading = <div style={{display:'grid',gridTemplateColumns:'22px minmax(0, 1fr) auto',alignItems:'center',columnGap:12,rowGap:3}}>
    <Icon name="clock" size={22} color={text}/>
    <span style={{fontWeight:600,fontSize:16,letterSpacing:'-0.015em',lineHeight:'22px',color:text}}>Horario</span>
    {hasWeek && <span style={{color:sub,fontSize:12,lineHeight:'22px',whiteSpace:'nowrap'}}>Ver horarios ⌄</span>}
    <div style={{gridColumn:'2 / -1',color:sub,fontSize:14,lineHeight:1.6,whiteSpace:'pre-line'}}>Hoy · {todayText}</div>
  </div>;
  return <section style={{padding:'18px 0',borderBottom:`1px solid ${border}`,textAlign:'left'}}>{hasWeek ? <details key={business.id}><summary style={{cursor:'pointer',listStyle:'none'}}>{heading}</summary><div style={{padding:'14px 0 0 34px',display:'flex',flexDirection:'column',gap:10}}>{DAYS.map(([key,label]) => <div key={key} style={{display:'flex',justifyContent:'space-between',gap:16,fontSize:14,color:key === today ? text : sub,fontWeight:key === today ? 700 : 400}}><span>{label}{key === today ? ' (Hoy)' : ''}</span><span style={{textAlign:'right',whiteSpace:'pre-line'}}>{schedule[key] != null ? formatBusinessHours(schedule[key]) : 'Sin horario registrado'}</span></div>)}</div></details> : heading}</section>;
}
