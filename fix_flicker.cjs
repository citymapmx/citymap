const fs = require('fs');

const path = 'src/components/home/HeroWeather.jsx';
let content = fs.readFileSync(path, 'utf8');

// Insert useRef at the top
content = content.replace(
  'const [loading, setLoading] = useState(true);',
  `const [loading, setLoading] = useState(true);
  const randomSeed = React.useRef(Math.random());`
);

// Replace pickRandom usage
content = content.replace(
  'const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];',
  'const pickRandom = (arr) => arr[Math.floor(randomSeed.current * arr.length)];'
);

fs.writeFileSync(path, content);
console.log('Fixed flicker!');
