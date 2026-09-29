const fs = require('fs');
let content = fs.readFileSync('src/components/SurpriseModal.jsx', 'utf8');

const regex1 = /\{\/\* AI Option \*\/\}[\s\S]*?<\/button>/;
content = content.replace(regex1, '');

fs.writeFileSync('src/components/SurpriseModal.jsx', content);
