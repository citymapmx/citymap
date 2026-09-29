const fs = require('fs');
let content = fs.readFileSync('src/components/home/HomeHero.jsx', 'utf8');

const target = `                  100% { opacity: 1; transform: translateY(0); filter: blur(0); }
                }`;
content = content.replace(target, '');

fs.writeFileSync('src/components/home/HomeHero.jsx', content);
console.log('Fixed CSS syntax!');
