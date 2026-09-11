const fs = require('fs');
let code = fs.readFileSync('src/components/GMap.jsx', 'utf8');

// 1. Update signature
code = code.replace(
  'radiusKm, onBoundsChanged',
  'radiusKm, utilityFilter, onBoundsChanged'
);

// 2. Add utilityPins ref
code = code.replace(
  'const radiusCircle = useRef(null);',
  'const radiusCircle = useRef(null);\n  const utilityPins = useRef([]);'
);

// 3. Add utility fetcher useEffect
const fetcher = `
  useEffect(() => {
    if (!ok || !map.current) return;
    
    // Clear old utility pins
    utilityPins.current.forEach(m => m.setMap(null));
    utilityPins.current = [];

    if (!utilityFilter) return;

    const service = new window.google.maps.places.PlacesService(map.current);
    const request = {
      location: map.current.getCenter(),
      radius: 5000,
      type: [utilityFilter]
    };

    service.nearbySearch(request, (results, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
        results.forEach(place => {
          if (!place.geometry || !place.geometry.location) return;
          const iconStr = utilityFilter === 'gas_station' ? '⛽' : utilityFilter === 'atm' ? '🏧' : '💊';
          const marker = new window.google.maps.Marker({
            map: map.current,
            position: place.geometry.location,
            title: place.name,
            label: { text: iconStr, fontSize: "20px" },
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 0
            }
          });
          utilityPins.current.push(marker);
        });
      }
    });
  }, [ok, utilityFilter]);
`;

// Only add if not already added
if (!code.includes('utilityPins.current.forEach')) {
  code = code.replace(
    'useEffect(() => {',
    fetcher + '\n  useEffect(() => {'
  );
}

// 4. Update the memo comparator
if (!code.includes('prev.utilityFilter === next.utilityFilter')) {
  code = code.replace(
    'prev.categories === next.categories',
    'prev.categories === next.categories &&\n    prev.utilityFilter === next.utilityFilter'
  );
}

fs.writeFileSync('src/components/GMap.jsx', code);
