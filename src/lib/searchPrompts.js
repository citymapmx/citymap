const BANK = {
  madrugada: ['¿Un antojo de madrugada?', '¿Qué hay cerca de ti?', '¿Un café para seguir?', '¿Dónde cenar en {city}?', '¿Buscas algo para llevar?', '¿Un plan para mañana?', '¿Qué eventos vienen?', '¿Algo rico antes de dormir?', '¿Exploramos {city}?', '¿Tu próxima escapada?'],
  manana: ['¿Café y desayuno en {city}?', '¿Dónde desayunar hoy?', '¿Un café para empezar?', '¿Pan recién hecho cerca?', '¿Un paseo por {city}?', '¿Dónde hacer ejercicio?', '¿Buscas una cafetería?', '¿Qué eventos hay en {city}?', '¿Un desayuno con amigos?', '¿Qué descubrimos hoy?'],
  comida: ['¿Dónde comer en {city}?', '¿Tacos, sushi o mariscos?', '¿Un lugar para comer?', '¿Qué se te antoja hoy?', '¿Comida para llevar?', '¿Algo rico cerca de ti?', '¿Una mesa con amigos?', '¿Un lugar nuevo en {city}?', '¿Café después de comer?', '¿Qué eventos vienen?'],
  tarde: ['¿Un café por la tarde?', '¿Un postre en {city}?', '¿Qué hacer esta tarde?', '¿Buscas un lugar para pasear?', '¿Una partida de pádel?', '¿Un plan con amigos?', '¿Dónde merendar hoy?', '¿Qué eventos hay en {city}?', '¿Algo diferente en {city}?', '¿Tu próxima aventura?'],
  noche: ['¿Dónde cenar en {city}?', '¿Un plan para esta noche?', '¿Pizza, tacos o sushi?', '¿Un café para conversar?', '¿Qué eventos hay en {city}?', '¿Un bar para salir?', '¿Una cena con amigos?', '¿Un antojo para llevar?', '¿Buscas música y ambiente?', '¿Qué descubrimos esta noche?'],
  nocheTardia: ['¿Dónde seguir la noche?', '¿Un antojo en {city}?', '¿Tacos después del plan?', '¿Un lugar para conversar?', '¿Buscas algo para llevar?', '¿Un café nocturno?', '¿Qué hacer en {city}?', '¿Un plan para mañana?', '¿Qué eventos vienen?', '¿Dónde cenar cerca?'],
};
const WEEKEND = ['¿Qué hacer este fin de semana?', '¿Un plan en familia?', '¿Buscas eventos en {city}?', '¿Una escapada cerca?', '¿Un brunch con amigos?', '¿Algo nuevo en {city}?', '¿Un paseo sin prisas?', '¿Dónde reunirse con amigos?', '¿Qué descubrir en {city}?', '¿Un plan para compartir?'];

export function getSearchPrompts(city = 'tu ciudad', date = new Date(), timeZone) {
  let hour = date.getHours(), day = date.getDay();
  if (timeZone) {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {timeZone, hour:'numeric', hourCycle:'h23', weekday:'short'}).formatToParts(date);
      hour = Number(parts.find(part => part.type === 'hour').value);
      day = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(parts.find(part => part.type === 'weekday').value);
    } catch { /* Fall back to the device time for an unknown city zone. */ }
  }
  const period = hour < 5 ? 'madrugada' : hour < 11 ? 'manana' : hour < 16 ? 'comida' : hour < 19 ? 'tarde' : hour < 23 ? 'noche' : 'nocheTardia';
  return [...BANK[period], ...([0,5,6].includes(day) ? WEEKEND : [])].map(text => text.replaceAll('{city}', city));
}
