const https = require('https');
https.get('https://citymap.world/api/business?city=tepic', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const pins = JSON.parse(data);
      const cats = {};
      pins.forEach(p => {
        if (!p.category) return;
        const c = p.category.toLowerCase();
        cats[c] = (cats[c] || 0) + 1;
      });
      console.log("Categories found:", Object.keys(cats).sort().join(", "));
    } catch(e) { console.error(e); }
  });
});
