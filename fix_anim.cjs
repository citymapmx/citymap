const fs = require('fs');

const path = 'src/components/home/HomeHero.jsx';
let content = fs.readFileSync(path, 'utf8');

// Remove the premiumFadeUp keyframes and hero-title-anim styles
content = content.replace(/@keyframes premiumFadeUp \{[\s\S]*?\}/, '');
content = content.replace(/\.hero-title-anim \{[\s\S]*?\}/, '');

// Remove the class from the elements
content = content.replace(/className="hero-title-anim"/g, '');

fs.writeFileSync(path, content);
console.log('Removed bounce animation!');
