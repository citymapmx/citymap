const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

const oldHomeNav = `    else if (v === "home") {
      if (location.state?.background) {
        setSelected(null);
        setSelectedEvent(null);
        routerNavigate(-1);
        setTimeout(() => setFade(true), 50);
        return;
      }
      path = cityPrefix;
    }`;

const newHomeNav = `    else if (v === "home") {
      if (location.state?.background) {
        setSelected(null);
        setSelectedEvent(null);
        routerNavigate(-1);
        setTimeout(() => setFade(true), 50);
        return;
      }
      // Preserve category paths when navigating home
      const isOnHomePath = location.pathname === "/" || location.pathname === cityPrefix || location.pathname.startsWith(cityPrefix + "/c/");
      path = isOnHomePath ? location.pathname : cityPrefix;
    }`;

if (content.includes(oldHomeNav)) {
  content = content.replace(oldHomeNav, newHomeNav);
  fs.writeFileSync('src/App.jsx', content);
  console.log('Fixed handleNav in App.jsx');
} else {
  console.log('Could not find oldHomeNav in App.jsx');
}
