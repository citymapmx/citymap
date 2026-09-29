const fs = require('fs');

function updateFile(path) {
  if (!fs.existsSync(path)) return;
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(
    /urls\.push\(\{ loc: \`\$\{BASE_URL\}\/\$\{cSlug\}\/\$\{cat\}\`, priority: 0\.8 \}\);/g,
    'urls.push({ loc: `${BASE_URL}/${cSlug}/c/${cat}`, priority: 0.8 });'
  );
  fs.writeFileSync(path, content);
  console.log('Fixed', path);
}

updateFile('generate-sitemap.js');
updateFile('api/sitemap.xml.js');
