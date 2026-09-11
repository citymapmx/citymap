import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://dpkjxhjkzdlkvyotoeai.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwa2p4aGpremRsa3Z5b3RvZWFpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDQzNjM1MCwiZXhwIjoyMDk2MDEyMzUwfQ.dOco_AbLMN-fiFM4seo0gqikGFzBMwasGxaPIlmbFjg";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function getAllUsedUrls() {
  const urls = new Set();
  const extract = (str) => {
    if (!str) return;
    if (typeof str === 'string' && str.includes('supabase.co')) urls.add(str);
    else if (Array.isArray(str)) str.forEach(item => { if (item?.url) extract(item.url); else if (typeof item === 'string') extract(item); });
    else if (typeof str === 'object') { try { const parsed = typeof str === 'string' ? JSON.parse(str) : str; extract(parsed); } catch (e) {} }
  };

  const fetchAll = async (table, cols) => {
    let all = []; let page = 0;
    while(true) {
      const { data, error } = await supabase.from(table).select(cols.join(',')).range(page*1000, (page+1)*1000-1);
      if (error) { console.error(`Error fetching ${table}:`, error); break; }
      if (!data || data.length === 0) break;
      all = all.concat(data);
      if (data.length < 1000) break;
      page++;
    }
    return all;
  };

  const biz = await fetchAll('businesses', ['logo_url', 'banner_url', 'photos']);
  biz.forEach(b => { extract(b.logo_url); extract(b.banner_url); extract(b.photos); });

  const events = await fetchAll('events', ['img_url', 'img']);
  events.forEach(e => { extract(e.img_url); extract(e.img); });

  const cats = await fetchAll('categories', ['img_url']);
  cats.forEach(c => extract(c.img_url));

  const exps = await fetchAll('experiences', ['gallery']);
  exps.forEach(e => { extract(e.gallery); });

  const banners = await fetchAll('banners', ['img_url', 'image_url']);
  banners.forEach(b => { extract(b.img_url); extract(b.image_url); });

  const promos = await fetchAll('promos', ['image_url']);
  promos.forEach(p => { extract(p.image_url); });

  const reviews = await fetchAll('reviews', ['img_url']);
  reviews.forEach(r => extract(r.img_url));

  return urls;
}

async function listAllFiles(folderPath = "") {
  let allFiles = [];
  let limit = 1000;
  let offset = 0;
  let hasMore = true;
  
  while (hasMore) {
    const { data, error } = await supabase.storage.from('media').list(folderPath, {
      limit: limit,
      offset: offset,
      sortBy: { column: "name", order: "asc" }
    });
    
    if (error) { console.error("Error listing files", error); break; }
    if (!data || data.length === 0) hasMore = false;
    else {
      for (const f of data) {
        if (!f.name || f.name === ".emptyFolderPlaceholder") continue;
        const fullPath = folderPath ? `${folderPath}/${f.name}` : f.name;
        if (f.id) { allFiles.push({ path: fullPath, size: f.metadata?.size || 0 }); } 
        else { const subFiles = await listAllFiles(fullPath); allFiles.push(...subFiles); }
      }
      if (data.length < limit) hasMore = false;
      else offset += limit;
    }
  }
  return allFiles;
}

async function run() {
  const usedUrls = await getAllUsedUrls();
  console.log(`Found ${usedUrls.size} used URLs in database.`);
  
  console.log("Fetching storage files...");
  const files = await listAllFiles("");
  console.log(`Found ${files.length} files in Storage.`);

  const garbage = [];
  let garbageSize = 0;

  files.forEach(f => {
    // Both variants just in case
    const url1 = `${supabaseUrl}/storage/v1/object/public/media/${f.path}`;
    const url2 = `${supabaseUrl}/storage/v1/object/media/${f.path}`; // rare but possible
    if (!usedUrls.has(url1) && !usedUrls.has(url2)) {
      garbage.push(f.path);
      garbageSize += f.size;
    }
  });

  console.log(`Garbage files found: ${garbage.length}`);
  console.log(`Total space to free: ${(garbageSize / 1024 / 1024).toFixed(2)} MB`);
  
  if (garbage.length > 0) {
    console.log("Deleting garbage files in batches of 100...");
    for (let i = 0; i < garbage.length; i += 100) {
      const batch = garbage.slice(i, i + 100);
      const { data, error } = await supabase.storage.from('media').remove(batch);
      if (error) {
        console.error("Error deleting batch:", error);
      } else {
        console.log(`Deleted ${i + batch.length}/${garbage.length}`);
      }
    }
    console.log("Purge complete!");
  } else {
    console.log("No garbage files to delete.");
  }
}

run();
