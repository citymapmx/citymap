const fs = require('fs');

const path = 'src/components/AccountView.jsx';
let content = fs.readFileSync(path, 'utf8');

// The block to remove is between `<div style={{ display: "flex", gap: 10, marginTop: 24 }}>` 
// and its closing `</div>` right before `</div>` (the closing of the `.profile-card`).
// I'll use a regex that safely matches this exact section since we know the content.
const regex = /<div style=\{\{ display: "flex", gap: 10, marginTop: 24 \}\}>[\s\S]*?<div style=\{\{ fontSize: 10, color: T\.sub, fontWeight: 800, textTransform: "uppercase", marginTop: 4, letterSpacing: 0\.5 \}\}>Listas<\/div>\n\s*<\/div>\n\s*<\/div>/;

if (content.match(regex)) {
  content = content.replace(regex, '');
  fs.writeFileSync(path, content);
  console.log('Removed profile buttons!');
} else {
  console.log('Regex did not match.');
}
