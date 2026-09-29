const fs = require('fs');
let content = fs.readFileSync('src/components/home/HomeHero.jsx', 'utf8');

content = content.replace(
  /const catUrl = `\/\$\{\(activeCity \|\| city \|\| ""\)\.split\(",",\s*0\|\|1\)?\[0\]\}\$\{c\.id === "explorar" \? "" : "\/" \+ catSlug\}`;/g,
  'const catUrl = `/${(activeCity || city || "").split(",")[0]}${c.id === "explorar" ? "" : "/c/" + catSlug}`;'
);

// I will just use regex to match exactly
const regex = /const catUrl = `\/\$\{\(activeCity \|\| city \|\| ""\)\.split\(",",\s*0\|\|1\)?\[0\]\}\$\{c\.id === "explorar" \? "" : "\/" \+ catSlug\}`;/;
content = content.replace(/const catUrl = `\/\$\{\(activeCity \|\| city \|\| ""\)\.split\(\",\"\)\[0\]\}\$\{c\.id === "explorar" \? "" : "\/" \+ catSlug\}`;/, 'const catUrl = `/${(activeCity || city || "").split(",")[0]}${c.id === "explorar" ? "" : "/c/" + catSlug}`;');

fs.writeFileSync('src/components/home/HomeHero.jsx', content);
console.log('Fixed catUrl!');
