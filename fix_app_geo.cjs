const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

const regex = /const isOnHomePath = location\.pathname === "\/" \|\| location\.pathname === \`\/\$\{activeCity\}\` \|\| location\.pathname === \`\/\$\{s\}\` \|\| location\.pathname === oldPath \|\| location\.pathname === newPath;/;

const replacement = `const isOnHomePath = location.pathname === "/" || location.pathname === \`/\${activeCity}\` || location.pathname === \`/\${s}\` || location.pathname === oldPath || location.pathname === newPath || location.pathname.includes("/c/");`;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync('src/App.jsx', content);
  console.log('Fixed useGeolocation in App.jsx');
} else {
  console.log('Could not find useGeolocation string in App.jsx');
}
