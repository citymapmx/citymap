const fs = require('fs');

// 1. Update i18n.js
let i18n = fs.readFileSync('src/lib/i18n.js', 'utf8');
const searchBlock = `    // Hero & Search
    "descubre_lo_mejor": "Descubre lo mejor de",
    "buscar_placeholder": "Buscar lugares, eventos...",
    "buscar_restaurantes": "Buscar 'Restaurantes'...",
    "buscar_cafeterias": "Buscar 'Cafeterías'...",
    "buscar_bares": "Buscar 'Bares'...",
    "buscar_antros": "Buscar 'Antros'...",
    "buscar_tacos": "Buscar 'Tacos'...",
    "buscar_mariscos": "Buscar 'Mariscos'...",
    "buscar_hamburguesas": "Buscar 'Hamburguesas'...",
    "buscar_sushi": "Buscar 'Sushi'...",
    "buscar_postres": "Buscar 'Postres'...",
    "buscar_pizza": "Buscar 'Pizzas'...",`;

// replace from "// Hero & Search" up to the line before "// UI General / Sections"
i18n = i18n.replace(/    \/\/ Hero & Search[\s\S]*?(?=    \/\/ UI General \/ Sections)/, searchBlock + '\n\n');
fs.writeFileSync('src/lib/i18n.js', i18n);

// 2. Update HomeView.jsx
let home = fs.readFileSync('src/views/HomeView.jsx', 'utf8');
const keysBlock = `const placeholdersKeys = React.useMemo(() => [
    "buscar_restaurantes", "buscar_cafeterias", "buscar_bares", "buscar_antros", 
    "buscar_tacos", "buscar_mariscos", "buscar_hamburguesas", "buscar_sushi", 
    "buscar_postres", "buscar_pizza"
  ], []);`;

home = home.replace(/const placeholdersKeys = React\.useMemo\(\(\) => \[[\s\S]*?\], \[\]\);/, keysBlock);
fs.writeFileSync('src/views/HomeView.jsx', home);

console.log('Fixed search placeholders!');
