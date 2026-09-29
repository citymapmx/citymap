const fs = require('fs');
const path = 'src/components/home/HomeHero.jsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/animation: heroGradientFlow 4s linear infinite;/, 'animation: heroGradientFlow 8s ease-in-out infinite;');

fs.writeFileSync(path, content);
console.log('Fixed timing!');
