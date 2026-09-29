const fs = require('fs');

// 1. Fix main.jsx
let main = fs.readFileSync('src/main.jsx', 'utf8');
main = main.replace("sessionStorage.removeItem('chunk_reload_guard');", "// chunk_reload_guard now uses timestamps");
fs.writeFileSync('src/main.jsx', main);

// 2. Fix GlobalErrorBoundary.jsx
let geb = fs.readFileSync('src/components/GlobalErrorBoundary.jsx', 'utf8');
geb = geb.replace(
  /if \(!sessionStorage\.getItem\('chunk_reload_guard'\)\) {[\s\S]*?return;\n\s*}/,
  `const last = parseInt(sessionStorage.getItem('chunk_reload_guard') || '0', 10);
      const now = Date.now();
      if (now - last > 15000) {
        sessionStorage.setItem('chunk_reload_guard', now.toString());
        window.location.reload(true);
        return;
      }`
);
fs.writeFileSync('src/components/GlobalErrorBoundary.jsx', geb);

// 3. Fix App.jsx lazy loading
let app = fs.readFileSync('src/App.jsx', 'utf8');

const oldLazy = `const lazy = (importer) => reactLazy(async () => {
  try {
    const component = await importer();
    // Clear guards on successful load so next deploy can auto-reload again
    sessionStorage.removeItem('chunk_load_retry');
    sessionStorage.removeItem('chunk_reload_guard');
    return component;
  } catch (error) {
    const errStr = String(error?.message || error || '');
    const isChunkError = error.name === 'ChunkLoadError' || errStr.includes('fetch') || errStr.includes('dynamically imported') || errStr.includes('MIME type') || errStr.includes('text/html') || errStr.includes('Load failed') || errStr.includes('module');
    if (!sessionStorage.getItem('chunk_load_retry') && isChunkError) {
      sessionStorage.setItem('chunk_load_retry', 'true');
      sessionStorage.setItem('chunk_reload_guard', '1');
      if ('serviceWorker' in navigator) {
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (let reg of regs) await reg.unregister();
        } catch (e) { console.error(e); }
      }
      window.location.reload(true);
      return new Promise(() => {}); // Wait for reload
    }
    throw error;
  }
});`;

const newLazy = `const lazy = (importer) => reactLazy(async () => {
  try {
    const component = await importer();
    return component;
  } catch (error) {
    const errStr = String(error?.message || error || '');
    const isChunkError = error.name === 'ChunkLoadError' || errStr.includes('fetch') || errStr.includes('dynamically imported') || errStr.includes('MIME type') || errStr.includes('text/html') || errStr.includes('Load failed') || errStr.includes('module');
    if (isChunkError) {
      const last = parseInt(sessionStorage.getItem('chunk_reload_guard') || '0', 10);
      const now = Date.now();
      if (now - last > 15000) {
        sessionStorage.setItem('chunk_reload_guard', now.toString());
        if ('serviceWorker' in navigator) {
          try {
            const regs = await navigator.serviceWorker.getRegistrations();
            for (let reg of regs) await reg.unregister();
          } catch (e) { console.error(e); }
        }
        window.location.reload(true);
        return new Promise(() => {}); // Wait for reload
      }
    }
    throw error;
  }
});`;

app = app.replace(oldLazy, newLazy);
fs.writeFileSync('src/App.jsx', app);

console.log('Fixed loop logic!');
