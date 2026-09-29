const fs = require('fs');

const path = 'src/components/SurpriseModal.jsx';
let content = fs.readFileSync(path, 'utf8');

// Replace emoji for "Armar un plan" (was 🧭)
content = content.replace(
  /\{ id: 'planes',\s*emoji: '🧭',\s*label: 'Armar un plan',/,
  "{ id: 'planes',    emoji: '🔥', label: 'Armar un plan',"
);

// Replace label for "Lo que sea" (was "Lo que sea")
content = content.replace(
  /\{ id: 'sorpresa',\s*emoji: '🎲',\s*label: 'Lo que sea',/,
  "{ id: 'sorpresa',  emoji: '🎲', label: '¡Sorpréndeme!',"
);

fs.writeFileSync(path, content);
console.log('Fixed SurpriseModal text and emoji!');
