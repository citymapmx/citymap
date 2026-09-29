const fs = require('fs');
let content = fs.readFileSync('src/views/DetailView.jsx', 'utf8');

const regex = /\{selected\.hours && \(\s*<span className="text-sm" style=\{\{ color: dSub, display: "flex", alignItems: "center", gap: 4 \}\}>· \{selected\.hours\}<\/span>\s*\)\}/;

if (content.match(regex)) {
  content = content.replace(regex, '');
  fs.writeFileSync('src/views/DetailView.jsx', content);
  console.log('Fixed hours!');
} else {
  console.log('Regex did not match.');
}
