const fs = require('fs');
const path = 'src/router/AppRouter.jsx';
let content = fs.readFileSync(path, 'utf8');

// Update isHomePath and isDetailPath
const replacement = `
// Paths that are NOT the home/category view
const NON_HOME_PREFIXES = ['/mapa', '/eventos', '/mis-planes', '/experiencias', '/planes', '/favoritos', '/cuenta', '/itinerarios', '/itinerario', '/plan', '/about', '/privacy', '/terms', '/admin_notifs', '/user_notifs', '/manage', '/stats', '/precios', '/lealtad', '/wallet', '/scan'];

function isCategoryPath(segments) {
  if (IS_WORLD) return segments.length === 4 && segments[2] === 'c';
  return segments.length === 3 && segments[1] === 'c';
}

function isHomePath(pathname) {
  if (pathname === '/') return true;
  if (NON_HOME_PREFIXES.some(p => pathname.startsWith(p))) return false;
  const segments = pathname.split('/').filter(Boolean);
  
  if (isCategoryPath(segments)) return true;
  
  // On citymap.world paths have an extra country prefix: /mx/cancun or /mx/cancun/slug
  const maxHomeSegments = IS_WORLD ? 3 : 2;
  return segments.length <= maxHomeSegments;
}

function isDetailPath(pathname) {
  if (NON_HOME_PREFIXES.some(p => pathname.startsWith(p))) return false;
  const segments = pathname.split('/').filter(Boolean);
  
  if (isCategoryPath(segments)) return false;
  
  // .world: /mx/cancun/slug = 3 segments | .mx: /cancun/slug = 2 segments
  return IS_WORLD ? segments.length === 3 : segments.length === 2;
}`;

content = content.replace(/\/\/ Paths that are NOT the home\/category view[\s\S]*?return IS_WORLD \? segments\.length === 3 : segments\.length === 2;\n\}/, replacement.trim());
fs.writeFileSync(path, content);
console.log('Fixed router!');
