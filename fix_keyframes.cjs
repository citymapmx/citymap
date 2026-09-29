const fs = require('fs');

const path = 'src/components/home/HomeHero.jsx';
let content = fs.readFileSync(path, 'utf8');

const regex = /@keyframes heroGradientFlow \{\n\s*0% \{ background-position: 100% center; \}\n\s*100% \{ background-position: 0% center; \}\n\s*\}/;

const replacement = `@keyframes heroGradientFlow {
                  0% { background-position: 0% center; }
                  50% { background-position: 100% center; }
                  100% { background-position: 0% center; }
                }`;

if (content.match(regex)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(path, content);
  console.log('Fixed keyframes!');
} else {
  console.log('Regex did not match.');
}
