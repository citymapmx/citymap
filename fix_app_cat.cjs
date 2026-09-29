const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

const replacement = `  useEffect(() => {
    if (initialParams.current.citySlug && initialParams.current.citySlug !== activeCity) {
      setActiveCity(initialParams.current.citySlug);
      loadData(initialParams.current.citySlug);
    }
    
    if (initialParams.current.cat && initialParams.current.cat !== activeCat) {
      setActiveCat(initialParams.current.cat);
    }`;

content = content.replace(/  useEffect\(\(\) => \{\n    if \(initialParams\.current\.citySlug && initialParams\.current\.citySlug !== activeCity\) \{\n\s+setActiveCity\(initialParams\.current\.citySlug\);\n\s+loadData\(initialParams\.current\.citySlug\);\n    \}/, replacement);

fs.writeFileSync('src/App.jsx', content);
console.log('Fixed App.jsx cat assignment!');
