const fs = require('fs');
let content = fs.readFileSync('src/components/home/HomeHero.jsx', 'utf8');

content = content.replace(/\\s*100% \\{ opacity: 1; transform: translateY\\(0\\); filter: blur\\(0\\); \\}\\n\\s*\\}/, '');

fs.writeFileSync('src/components/home/HomeHero.jsx', content);
