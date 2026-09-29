const fs = require('fs');

function updateFile(path) {
  if (!fs.existsSync(path)) return;
  let content = fs.readFileSync(path, 'utf8');

  // Add fetch for experiences
  if (!content.includes('rest/v1/experiences')) {
    const fetchBizBlock = `const bizRes = await fetch(\`\${SUPABASE_URL}/rest/v1/businesses?status=eq.approved&select=slug,city_slug,category\`, { headers });
    const businesses = await bizRes.json();`;
    
    const newFetchBlock = `const bizRes = await fetch(\`\${SUPABASE_URL}/rest/v1/businesses?status=eq.approved&select=slug,city_slug,category\`, { headers });
    const businesses = await bizRes.json();
    
    const expRes = await fetch(\`\${SUPABASE_URL}/rest/v1/experiences?status=eq.approved&select=city_slug,slug,title\`, { headers });
    const experiences = await expRes.json();`;

    content = content.replace(fetchBizBlock, newFetchBlock);
  }

  // Add experiences to urls array
  if (!content.includes('for (const exp of experiences)')) {
    const bizLoopBlock = `for (const biz of businesses) {`;
    
    const newExpBlock = `
    const createSlug = (text) => text ? text.toString().toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") : "";
    
    for (const exp of experiences) {
      if (!exp.title) continue;
      const cSlug = exp.city_slug || 'tepic';
      const expSlug = exp.slug || createSlug(exp.title);
      urls.push({ loc: \`\${BASE_URL}/experiencias/\${cSlug}/\${expSlug}\`, priority: 0.8 });
    }

    for (const biz of businesses) {`;
    
    content = content.replace(bizLoopBlock, newExpBlock);
  }

  fs.writeFileSync(path, content);
  console.log('Fixed', path);
}

updateFile('generate-sitemap.js');
updateFile('api/sitemap.xml.js');
