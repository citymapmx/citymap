const fs = require('fs');
const file = fs.readFileSync('src/views/DetailView.jsx', 'utf8');
const lines = file.split('\n');

const startIndex = lines.findIndex(l => l.includes('{/* Eventos del Negocio */}'));
let endIndex = startIndex;
while (endIndex < lines.length && !lines[endIndex].includes('{/* Reseñas de Google Maps */}')) {
  endIndex++;
}

if (startIndex !== -1 && endIndex !== -1) {
  const agendaLines = lines.splice(startIndex, endIndex - startIndex);
  
  const insertIndex = lines.findIndex(l => l.includes('{/* Location & Schedule Native Style */}'));
  if (insertIndex !== -1) {
    lines.splice(insertIndex, 0, ...agendaLines);
    fs.writeFileSync('src/views/DetailView.jsx', lines.join('\n'));
    console.log('Success!');
  } else {
    console.log('Could not find insert index');
  }
} else {
  console.log('Could not find start/end index');
}
