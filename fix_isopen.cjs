const fs = require('fs');
let content = fs.readFileSync('src/components/SurpriseModal.jsx', 'utf8');

content = content.replace(/isOpenNow\(b, true\)/g, 'isOpenNow(b)');
content = content.replace(/isOpenNow\(pick, true\)/g, 'isOpenNow(pick)');

fs.writeFileSync('src/components/SurpriseModal.jsx', content);
console.log('Fixed isOpenNow calls!');
