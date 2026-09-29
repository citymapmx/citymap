const fs = require('fs');

let home = fs.readFileSync('src/views/HomeView.jsx', 'utf8');

home = home.replace(
  /\{t\("sugerir_zona", "¡Sé el primero en descubrir esta zona! 🗺️"\)\}/, 
  '{t("sugerir_zona_cerca", "No hay lugares a esta distancia 🗺️")}'
);
home = home.replace(
  /\{t\("sugerir_desc", "Amplía tu radio de búsqueda o sugiere una joya oculta"\)\}/, 
  '{t("sugerir_desc_cerca", "Intenta ampliar el radio de búsqueda o sugiere un lugar por aquí.")}'
);

fs.writeFileSync('src/views/HomeView.jsx', home);

let i18n = fs.readFileSync('src/lib/i18n.js', 'utf8');
i18n = i18n.replace(/"sugerir_zona": "No hay lugares a esta distancia 🗺️"/, '"sugerir_zona": "¡Sé el primero en descubrir esta zona! 🗺️"');
i18n = i18n.replace(/"sugerir_desc": "Intenta ampliar el radio de búsqueda \\(ej\. a 3km\\) o sugiere una joya oculta cerca de ti\."/, '"sugerir_desc": "Amplía tu radio de búsqueda o sugiere una joya oculta"');

i18n = i18n.replace(/"sugerir_desc": "Amplía tu radio de búsqueda o sugiere una joya oculta",/, '"sugerir_desc": "Amplía tu radio de búsqueda o sugiere una joya oculta",\n    "sugerir_zona_cerca": "No hay lugares a esta distancia 🗺️",\n    "sugerir_desc_cerca": "Intenta ampliar el radio de búsqueda o sugiere un lugar por aquí.",');

fs.writeFileSync('src/lib/i18n.js', i18n);

console.log('Fixed distinct empty states!');
