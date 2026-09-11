const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src');
let totalFixed = 0;

files.forEach(file => {
  let code = fs.readFileSync(file, 'utf8');
  let original = code;

  // Replace catch(var) { } with catch(var) { console.error(var); }
  code = code.replace(/catch\s*\(\s*([a-zA-Z0-9_]+)\s*\)\s*\{\s*\}/g, (match, p1) => {
    totalFixed++;
    return `catch (${p1}) { console.error(${p1}); }`;
  });

  // Replace catch { } with catch (e) { console.error(e); }
  code = code.replace(/catch\s*\{\s*\}/g, () => {
    totalFixed++;
    return `catch (e) { console.error(e); }`;
  });

  if (code !== original) {
    fs.writeFileSync(file, code);
    console.log(`Fixed in ${file}`);
  }
});

console.log(`Total empty catch blocks fixed: ${totalFixed}`);
