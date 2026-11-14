// Horario de un negocio: parseo, normalización y validación (lógica pura,
// sin React). La usan el formulario de Administración (AdminBizTab) y el
// modal del dueño (ScheduleManagerModal) al guardar.
//
// Por qué existe: el formulario mostraba valores por defecto (cierre
// 10:00 p. m. en Administración, 6:00 p. m. en el modal del dueño) solo
// como valor del input, sin escribirlos nunca en el estado. Si el usuario
// guardaba sin tocar los campos, en la base quedaba el horario incompleto
// ("09:00 a.m. - ", sin cierre) y la ficha mostraba "Hoy · 9:00 a. m. –"
// y las reservaciones no tenían horarios ningún día (BookingModal devuelve
// [] cuando el cierre no se puede leer). Eduardo Barber, 13 nov 2026.
//
// Regla: lo que se ve es lo que se guarda. normalizeSchedule() rellena la
// apertura/cierre que falte con el valor por defecto que el formulario
// muestra, y validateSchedule() bloquea los días con texto que no se puede
// leer (basura), para que ningún negocio vuelva a quedar en ese estado.

export const SCHEDULE_DAYS = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];

export const SCHEDULE_DAY_LABELS = {
  lun: 'Lunes',
  mar: 'Martes',
  mie: 'Miércoles',
  jue: 'Jueves',
  vie: 'Viernes',
  sab: 'Sábado',
  dom: 'Domingo',
};

// Tipos de horario en los que hay días que editar (los demás no muestran
// el editor por día en el formulario).
const SCHEDULE_TYPES_WITH_DAYS = new Set([undefined, null, '', 'regular', 'advanced', 'delivery']);

// Minutos desde medianoche, o null si no se puede leer. Acepta "09:00",
// "9:00", "09:00 a.m.", "10:00 p.m.", "12:00am". El regex acepta
// a.m./p.m. CON puntos (el formato que guarda la base: "09:00 a.m. -
// 10:00 p.m."): la versión anterior, como toMinutes de BookingModal,
// solo leía "am"/"pm" sin puntos y "10:00 p.m." se leía como 10:00 a. m.
// (181 de 336 negocios guardan el horario con puntos).
export function scheduleTimeToMinutes(value) {
  const m = String(value || '').trim().match(/(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2] || '0', 10);
  const p = (m[3] || '').replace(/\./g, '').toLowerCase();
  if (h > 23 || min > 59) return null;
  if (p === 'pm' && h !== 12) h += 12;
  if (p === 'am' && h === 12) h = 0;
  return h * 60 + min;
}

// "09:00 a.m." -> "09:00"; "10:00 p.m." -> "22:00"; "9:00" -> "09:00".
// "" si no se puede leer.
export function to24h(value) {
  const mins = scheduleTimeToMinutes(value);
  if (mins === null) return '';
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}

// "22:00" -> "10:00 p.m."; "09:00" -> "09:00 a.m.". "" si no se puede leer.
export function to12h(value24) {
  const mins = scheduleTimeToMinutes(value24);
  if (mins === null) return '';
  const h24 = Math.floor(mins / 60);
  const h12 = h24 % 12 || 12;
  const p = h24 >= 12 ? 'p.m.' : 'a.m.';
  return `${String(h12).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')} ${p}`;
}

// Separa un día en sus turnos. Un día puede ser una línea ("09:00 a.m. -
// 10:00 p.m.") o varias (tipo avanzado, una por línea). Devuelve los
// turnos con apertura/cierre en 24 h (null lo que no se pudo leer).
function splitDayShifts(raw) {
  const lines = String(raw || '')
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean);
  return lines.map((line) => {
    const segs = line.split(/\s*[-–]\s*|\s+a\s+/i);
    return {
      openRaw: segs.length > 0 ? segs[0] : '',
      closeRaw: segs.length > 1 ? segs[1] : '',
      open24: segs.length > 0 ? to24h(segs[0]) : '',
      close24: segs.length > 1 ? to24h(segs[1]) : '',
      line,
    };
  });
}

function isClosedValue(raw) {
  const v = String(raw || '').trim();
  return v === '' || /cerrado/i.test(v);
}

// Normaliza UN día. Devuelve { value, problem }:
// - "Cerrado" o vacío -> "Cerrado" (así lo muestra el formulario).
// - Turno con apertura y cierre -> "09:00 a.m. - 10:00 p.m." (canónico).
// - Turno al que le falta el cierre -> se rellena con defaultClose24 (el
//   valor que el formulario muestra); igual con la apertura.
// - Texto que no se puede leer -> problem, se deja el valor tal cual para
//   que la validación lo bloquee en el guardado.
function normalizeDay(raw, { defaultOpen24, defaultClose24 }) {
  if (isClosedValue(raw)) return { value: 'Cerrado', problem: null };
  const shifts = splitDayShifts(raw);
  if (shifts.length === 0) return { value: 'Cerrado', problem: null };
  const out = [];
  for (const shift of shifts) {
    // Texto presente pero ilegible (p. ej. "09:00 a.m. - xyz"): no se
    // inventa nada, se marca como problema para que el guardado lo bloquee.
    const openGarbage = String(shift.openRaw || '').trim() !== '' && !shift.open24;
    const closeGarbage = String(shift.closeRaw || '').trim() !== '' && !shift.close24;
    if (openGarbage || closeGarbage) {
      return { value: raw, problem: `no se pudo leer el horario ("${shift.line}")` };
    }
    if (!shift.open24 && !shift.close24) {
      return { value: raw, problem: `no se pudo leer el horario ("${shift.line}")` };
    }
    const open24 = shift.open24 || defaultOpen24;
    const close24 = shift.close24 || defaultClose24;
    out.push(`${to12h(open24)} - ${to12h(close24)}`);
  }
  return { value: out.join('\n'), problem: null };
}

// Normaliza un schedule completo ({ lun: "09:00 a.m. - ", ..., type }).
// Devuelve { schedule, problems: [{ day, label, reason }] }. No muta la
// entrada. Si la entrada no es un objeto, se devuelve tal cual (no se
// puede normalizar sin romperla).
// Los valores por defecto son los que cada formulario muestra: el de
// Administración muestra 09:00 a 22:00; el modal del dueño, 09:00 a 18:00.
export function normalizeSchedule(schedule, { defaultOpen24 = '09:00', defaultClose24 = '22:00' } = {}) {
  if (!schedule || typeof schedule !== 'object' || Array.isArray(schedule)) {
    return { schedule, problems: [] };
  }
  if (!SCHEDULE_TYPES_WITH_DAYS.has(schedule.type)) {
    return { schedule: { ...schedule }, problems: [] };
  }
  const out = { ...schedule };
  const problems = [];
  for (const day of SCHEDULE_DAYS) {
    const { value, problem } = normalizeDay(out[day], { defaultOpen24, defaultClose24 });
    out[day] = value;
    if (problem) problems.push({ day, label: SCHEDULE_DAY_LABELS[day], reason: problem });
  }
  return { schedule: out, problems };
}

// Problemas de un schedule (días abiertos con horario ilegible). Es lo que
// bloquea el guardado: si falta el cierre, normalizeSchedule ya lo rellenó
// con el valor que muestra el formulario, así que aquí solo queda basura.
export function validateSchedule(schedule, defaults) {
  return normalizeSchedule(schedule, defaults).problems;
}
