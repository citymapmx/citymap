const fs = require('fs');

const path = 'src/hooks/useGeolocation.js';
let content = fs.readFileSync(path, 'utf8');

const regex = /useEffect\(\(\) => \{\n\s*if \(\!navigator\.geolocation\) return;\n\n\s*const MIN_DISTANCE_M = 50;[\s\S]*?maximumAge: 300000, timeout: 15000 \}\n\s*\);\n\n\s*return \(\) => \{ navigator\.geolocation\.clearWatch\(watchId\); \};\n\s*\}, \[\]\);/;

const replacement = `useEffect(() => {
    if (!navigator.geolocation) return;

    let watchId = null;

    const startWatching = () => {
      if (watchId) return;
      const MIN_DISTANCE_M = 50;
      const haversineM = (a, b) => {
        const R = 6371000;
        const dLat = (b.lat - a.lat) * Math.PI / 180;
        const dLng = (b.lng - a.lng) * Math.PI / 180;
        const s = Math.sin(dLat / 2) ** 2 +
          Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) *
          Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
      };

      let lastCoords = null;

      const onSuccess = (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (lastCoords && haversineM(lastCoords, next) < MIN_DISTANCE_M) return;
        lastCoords = next;
        setUserCoords(next);
        localStorage.setItem("cg_coords", JSON.stringify(next));
      };

      watchId = navigator.geolocation.watchPosition(
        onSuccess,
        (err) => { console.warn("watchPosition error:", err); },
        { enableHighAccuracy: false, maximumAge: 300000, timeout: 15000 }
      );
    };

    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then(result => {
        if (result.state === 'granted') {
          startWatching();
        }
        result.onchange = () => {
          if (result.state === 'granted') {
            startWatching();
          }
        };
      }).catch(() => {});
    }

    return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
  }, []);`;

if (content.match(regex)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(path, content);
  console.log('Fixed geolocation auto-prompt!');
} else {
  console.log('Could not match regex.');
}
