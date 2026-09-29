const fs = require('fs');

const path = 'src/components/SurpriseModal.jsx';
let content = fs.readFileSync(path, 'utf8');

// Replace the Plan badge with null
const target = `<div style={{ position: 'absolute', top: 12, right: 12, background: '#F59E0B', borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 800, color: '#fff' }}>Plan</div>`;
content = content.replace(target, 'null');

fs.writeFileSync(path, content);
console.log('Removed Plan badge!');
