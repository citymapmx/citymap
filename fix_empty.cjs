const fs = require('fs');
let i18n = fs.readFileSync('src/lib/i18n.js', 'utf8');

i18n = i18n.replace(/"sugerir_zona": "¡Sé el primero en descubrir esta zona! 🗺️"/, '"sugerir_zona": "No hay lugares a esta distancia 🗺️"');
i18n = i18n.replace(/"sugerir_desc": "Amplía tu radio de búsqueda o sugiere una joya oculta"/, '"sugerir_desc": "Intenta ampliar el radio de búsqueda (ej. a 3km) o sugiere una joya oculta cerca de ti."');

fs.writeFileSync('src/lib/i18n.js', i18n);
console.log('Fixed empty state text!');
