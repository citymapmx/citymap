const fs = require('fs');
const path = 'src/components/SurpriseModal.jsx';
let content = fs.readFileSync(path, 'utf8');

const regex = /const getNextOpenText = \(b\) => \{[\s\S]*?return \`Abre el \${days\[nextDayIndex\]} a las \${format12h\(nextTime\)}\`;\n  \};\n\n/m;
content = content.replace(regex, '');

fs.writeFileSync(path, content);
console.log('Cleaned up getNextOpenText function!');
