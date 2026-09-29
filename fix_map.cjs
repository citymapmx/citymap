const fs = require('fs');

const path = 'src/components/GMap.jsx';
let content = fs.readFileSync(path, 'utf8');

// Add mapReady state
content = content.replace(
  'const ok = useGMaps();',
  'const ok = useGMaps();\n  const [mapReady, setMapReady] = useState(false);'
);

// Add setMapReady(true);
content = content.replace(
  'infoWin.current = new window.google.maps.InfoWindow();',
  'infoWin.current = new window.google.maps.InfoWindow();\n      setMapReady(true);'
);

// Update dependencies for resize observer
content = content.replace(
  '}, [ok]);',
  '}, [ok, mapReady]);'
);

// Update dependencies for utilityFilter
content = content.replace(
  '}, [ok, utilityFilter]);',
  '}, [ok, mapReady, utilityFilter]);'
);

// Update dependencies for userLocation
content = content.replace(
  '}, [ok, userLocation, radiusKm]);',
  '}, [ok, mapReady, userLocation, radiusKm]);'
);

fs.writeFileSync(path, content);
console.log('Fixed GMap.jsx!');
