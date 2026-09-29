const fs = require('fs');

const path = 'src/components/SurpriseModal.jsx';
let content = fs.readFileSync(path, 'utf8');

// Replace label for "Armar un plan"
content = content.replace(
  /\{ id: 'planes',    emoji: '🔥', label: 'Armar un plan',/,
  "{ id: 'planes',    emoji: '🔥', label: 'Encontrar un plan',"
);

fs.writeFileSync(path, content);
console.log('Fixed SurpriseModal plan text!');
