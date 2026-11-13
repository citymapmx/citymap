// Subtítulo del héroe del inicio de ciudad (HomeHero.jsx): una frase por
// franja horaria. La noche (22:00–05:59) NUNCA habla de desayuno, brunch,
// café de la mañana ni de "empezar el día": de madrugada el saludo grande
// es "¡Linda noche!" y el subtítulo debe acompañarlo. Antes, la franja de
// la mañana empezaba a las 0:00 (h < 11) y a la 1:43 a.m. salía "Empieza
// tu día de descanso con un buen brunch" (reporte de Jonathan, 13 nov 2026).
//
// La frase rota por día (día del año % nº de frases): estable dentro del
// día, sin cambiar en cada render ni al hacer scroll. Fin de semana =
// viernes, sábado y domingo, igual que antes. Las claves home_hero_msg_01
// a home_hero_msg_50 ya existían; las 51 a 70 son las frases nuevas de
// este cambio (2 por franja y tipo de día).
export const HERO_SUBTITLE_SLOTS = ['madrugada', 'manana', 'mediodia', 'tarde', 'noche'];

// Cada entrada es { key, es }: la clave i18n y el texto en español como
// respaldo para t(key, fallback). Las traducciones en inglés viven en
// src/lib/i18n-en.js con la misma clave.
export const HERO_SUBTITLE_POOLS = {
  madrugada: {
    weekend: [
      { key: 'home_hero_msg_41', es: 'Para los que todavía no quieren dormir' },
      { key: 'home_hero_msg_42', es: 'Descubre la vida nocturna de la ciudad' },
      { key: 'home_hero_msg_43', es: 'Los mejores eventos para alargar la noche' },
      { key: 'home_hero_msg_44', es: 'Encuentra música y fiesta cerca de ti' },
      { key: 'home_hero_msg_45', es: 'Una noche inolvidable te espera' },
      { key: 'home_hero_msg_51', es: 'La noche sigue: descubre qué hacer hasta tarde' },
      { key: 'home_hero_msg_52', es: '¿Sin sueño? La ciudad todavía tiene planes para ti' },
    ],
    weekday: [
      { key: 'home_hero_msg_46', es: 'Descubre los mejores lugares nocturnos' },
      { key: 'home_hero_msg_47', es: '¿Antojo de medianoche?' },
      { key: 'home_hero_msg_48', es: 'La ciudad nunca duerme' },
      { key: 'home_hero_msg_49', es: 'Lugares increíbles que abren hasta tarde' },
      { key: 'home_hero_msg_50', es: 'Encuentra dónde terminar la noche' },
      { key: 'home_hero_msg_53', es: 'Un plan nocturno para cerrar el día' },
      { key: 'home_hero_msg_54', es: 'Descubre bares y lugares abiertos hasta tarde' },
    ],
  },
  manana: {
    weekend: [
      { key: 'home_hero_msg_01', es: 'El fin de semana merece un desayuno especial' },
      { key: 'home_hero_msg_02', es: 'Empieza tu día de descanso con un buen brunch' },
      { key: 'home_hero_msg_03', es: 'Mañana perfecta para salir por un café' },
      { key: 'home_hero_msg_04', es: '¿Listos para salir a explorar la ciudad hoy?' },
      { key: 'home_hero_msg_05', es: 'Descubre qué eventos hay este fin de semana' },
      { key: 'home_hero_msg_55', es: 'El fin de semana se vive en la ciudad' },
      { key: 'home_hero_msg_56', es: '¿A dónde salimos hoy? La ciudad te espera' },
    ],
    weekday: [
      { key: 'home_hero_msg_06', es: 'Ideal para un buen café mañanero' },
      { key: 'home_hero_msg_07', es: 'Empieza el día con energía y un buen desayuno' },
      { key: 'home_hero_msg_08', es: '¡Buenos días! ¿Qué se te antoja desayunar hoy?' },
      { key: 'home_hero_msg_09', es: 'Planea tus actividades y rutas para hoy' },
      { key: 'home_hero_msg_10', es: 'Descubre nuevos lugares cerca de ti' },
      { key: 'home_hero_msg_57', es: 'Un buen día empieza con un buen plan' },
      { key: 'home_hero_msg_58', es: 'Descubre tu nuevo lugar favorito' },
    ],
  },
  mediodia: {
    weekend: [
      { key: 'home_hero_msg_11', es: '¿Listo para el antojo de fin de semana?' },
      { key: 'home_hero_msg_12', es: '¿Dónde vamos a comer hoy?' },
      { key: 'home_hero_msg_13', es: 'Busca el plan perfecto para esta tarde' },
      { key: 'home_hero_msg_14', es: 'Descubre museos, parques y lugares increíbles' },
      { key: 'home_hero_msg_15', es: 'Hay mucho por hacer hoy en la ciudad' },
      { key: 'home_hero_msg_59', es: 'Mediodía perfecto para un plan en familia' },
      { key: 'home_hero_msg_60', es: 'La ciudad al mediodía tiene de todo' },
    ],
    weekday: [
      { key: 'home_hero_msg_16', es: '¿Ya hace hambre? Descubre dónde comer' },
      { key: 'home_hero_msg_17', es: 'Haz una pausa y disfruta una buena comida' },
      { key: 'home_hero_msg_18', es: 'Encuentra el lugar perfecto para tu hora de comida' },
      { key: 'home_hero_msg_19', es: 'Busca qué hacer al salir de la oficina' },
      { key: 'home_hero_msg_20', es: 'Explora los mejores lugares de la zona' },
      { key: 'home_hero_msg_61', es: 'Tu hora de comida merece un buen lugar' },
      { key: 'home_hero_msg_62', es: 'Sal de la rutina: hay mucho por descubrir' },
    ],
  },
  tarde: {
    weekend: [
      { key: 'home_hero_msg_21', es: 'Tarde perfecta para salir por un postre' },
      { key: 'home_hero_msg_22', es: 'Aprovecha la tarde libre para explorar' },
      { key: 'home_hero_msg_23', es: 'Busca eventos y música en vivo para hoy' },
      { key: 'home_hero_msg_24', es: '¿Un paseo por la ciudad o un buen café?' },
      { key: 'home_hero_msg_25', es: 'Descubre las mejores experiencias locales' },
      { key: 'home_hero_msg_63', es: 'La tarde libre es para la ciudad' },
      { key: 'home_hero_msg_64', es: 'Un café, un paseo y la tarde es tuya' },
    ],
    weekday: [
      { key: 'home_hero_msg_26', es: 'Para romper la rutina con algo dulce' },
      { key: 'home_hero_msg_27', es: 'Haz una pausa en tu tarde con un buen café' },
      { key: 'home_hero_msg_28', es: 'Un gustito a mitad del día no hace daño' },
      { key: 'home_hero_msg_29', es: 'Escapa de la rutina y descubre algo nuevo' },
      { key: 'home_hero_msg_30', es: '¿Qué plan hay para salir del trabajo?' },
      { key: 'home_hero_msg_65', es: 'La tarde pide una pausa: ¿un café?' },
      { key: 'home_hero_msg_66', es: 'Descubre algo nuevo antes de que caiga la noche' },
    ],
  },
  noche: {
    weekend: [
      { key: 'home_hero_msg_31', es: 'La noche es joven. Ideal para una cena o tragos' },
      { key: 'home_hero_msg_32', es: 'Descubre dónde cenar y relajarte este fin de semana' },
      { key: 'home_hero_msg_33', es: 'Busca eventos, teatro o comedia para esta noche' },
      { key: 'home_hero_msg_34', es: 'Noche perfecta para probar algo diferente' },
      { key: 'home_hero_msg_35', es: 'Encuentra el mejor ambiente nocturno' },
      { key: 'home_hero_msg_67', es: 'La noche del fin de semana empieza aquí' },
      { key: 'home_hero_msg_68', es: 'Cena, música y buen ambiente: ¿qué más?' },
    ],
    weekday: [
      { key: 'home_hero_msg_36', es: '¿Antojo de cenar algo rico?' },
      { key: 'home_hero_msg_37', es: 'Termina tu día con una cena espectacular' },
      { key: 'home_hero_msg_38', es: 'Descubre qué hacer esta noche en la ciudad' },
      { key: 'home_hero_msg_39', es: 'El día aún no termina, sal a explorar' },
      { key: 'home_hero_msg_40', es: 'Relájate en un buen bar o terraza' },
      { key: 'home_hero_msg_69', es: 'Después del trabajo, la ciudad te espera' },
      { key: 'home_hero_msg_70', es: 'Una cena tranquila para terminar el día' },
    ],
  },
};

// Franja horaria del subtítulo según la hora (0–23). La mañana empieza
// a las 6:00, como el saludo "¡Buen {día}!": de 0:00 a 5:59 y de 22:00
// a 23:59 es madrugada/noche.
export function heroSubtitleSlot(hour) {
  const h = ((hour % 24) + 24) % 24;
  if (h < 6 || h >= 22) return 'madrugada';
  if (h < 11) return 'manana';
  if (h < 14) return 'mediodia';
  if (h < 18) return 'tarde';
  return 'noche';
}

// Día del año (1–366), hora local. Estable dentro del día.
export function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date - start) / 86400000);
}

// Elige una frase de la lista según el día: misma fecha = misma frase.
export function pickStableForDay(list, date) {
  if (!list || !list.length) return null;
  return list[dayOfYear(date) % list.length];
}

// Subtítulo del héroe para una fecha/hora. `t` es la función de
// traducción t(clave, respaldo). Fin de semana: viernes, sábado y domingo.
export function getHeroSubtitle(t, date = new Date()) {
  const dayIndex = date.getDay();
  const isWeekend = dayIndex === 0 || dayIndex === 5 || dayIndex === 6;
  const slot = heroSubtitleSlot(date.getHours());
  const pool = HERO_SUBTITLE_POOLS[slot][isWeekend ? 'weekend' : 'weekday'];
  const entry = pickStableForDay(pool, date);
  return t(entry.key, entry.es);
}
