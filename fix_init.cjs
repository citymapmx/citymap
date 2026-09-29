const fs = require('fs');
const path = 'src/hooks/useAppInitialization.js';
let content = fs.readFileSync(path, 'utf8');

// Update to support /:city/c/:category
content = content.replace(
  /\} else if \(segments\.length === 3 && segments\[2\] === "menu"\) \{/,
  `} else if (segments.length === 3 && segments[1] === "c") {
      const potentialCity = segments[0].toLowerCase();
      if (!SYSTEM_ROUTES.includes(potentialCity)) {
        currentCity = potentialCity;
        localStorage.setItem("cg_city_slug", currentCity);
        cat = segments[2].replace(/-/g, ' ');
      }
    } else if (segments.length === 3 && segments[2] === "menu") {`
);

fs.writeFileSync(path, content);
console.log('Fixed init hook!');
