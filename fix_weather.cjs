const fs = require('fs');

const path = 'src/components/home/HeroWeather.jsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  'const mood = React.useMemo(() => pickRandom(moodOptions), [hour, t]);',
  `// Avoid useMemo here to prevent hook order issues after conditional returns
  const mood = pickRandom(moodOptions);`
);

fs.writeFileSync(path, content);
console.log('Fixed React 310 error!');
