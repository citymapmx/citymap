const fs = require('fs');
let content = fs.readFileSync('vercel.json', 'utf8');

const newRule = `    {
      "source": "/:city/c/:category(restaurantes|cafeterias|cafe|cafeteria|salud|belleza|fitness|gimnasios|compras|tiendas|tech|ocio|hoteles|hospedaje|educacion|servicios|bares|antros-y-bares)",
      "destination": "/web-next/:city/c/:category"
    },`;

content = content.replace(
  /\{\n\s+"source": "\/:city\/:category\(restaurantes\|cafeterias\|cafe\|cafeteria\|salud\|belleza\|fitness\|gimnasios\|compras\|tiendas\|tech\|ocio\|hoteles\|hospedaje\|educacion\|servicios\|bares\|antros-y-bares\)",\n\s+"destination": "\/web-next\/:city\/:category"\n\s+\},/,
  newRule
);

fs.writeFileSync('vercel.json', content);
console.log('Fixed vercel.json!');
