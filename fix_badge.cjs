const fs = require('fs');

const path = 'src/components/SurpriseModal.jsx';
let content = fs.readFileSync(path, 'utf8');

// Replace the Cerrado logic
const oldCerrado = `Cerrado {(() => {
                    const txt = getNextOpenText(pick);
                    return txt ? \` • \${txt}\` : '';
                  })()}`;

content = content.replace(oldCerrado, 'Cerrado');

fs.writeFileSync(path, content);
console.log('Fixed Cerrado badge in SurpriseModal!');
