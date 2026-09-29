const fs = require('fs');
const path = 'src/views/HomeView.jsx';
let content = fs.readFileSync(path, 'utf8');

const regex = /const PLACEHOLDERS = \[[\s\S]*?\];/;
const replacement = `const PLACEHOLDERS = [
  "Buscar 'Restaurantes'...",
  "Buscar 'Cafeterías'...",
  "Buscar 'Bares'...",
  "Buscar 'Antros'...",
  "Buscar 'Tacos'...",
  "Buscar 'Mariscos'...",
  "Buscar 'Hamburguesas'...",
  "Buscar 'Sushi'...",
  "Buscar 'Postres'...",
  "Buscar 'Pizza'..."
];`;

if (content.match(regex)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(path, content);
  console.log('Fixed placeholders!');
} else {
  console.log('Regex did not match.');
}
