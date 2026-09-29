import React, { useState, useEffect } from 'react';

// Cache in memory fallback
if (typeof window !== 'undefined' && !window.__weatherCache) {
  window.__weatherCache = {};
}

export default function HeroWeather({ userCoords, activeCity, cities = [], dark }) {
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const randomSeed = React.useRef(Math.random());

  useEffect(() => {
    let lat = null;
    let lng = null;

    const slug = (activeCity || "").split(',')[0].trim();
    const cityObj = cities?.find(c => c.slug === slug);

    if (cityObj?.lat) {
      lat = cityObj.lat;
      lng = cityObj.lng;
    } else if (userCoords?.lat) {
      lat = userCoords.lat;
      lng = userCoords.lng;
    }

    if (!lat) {
      setLoading(false);
      return;
    }

    const cacheKey = `cg_weather_${Math.round(lat*100)}_${Math.round(lng*100)}`;
    
    // Check localStorage first (1 hour expiration)
    try {
      const saved = localStorage.getItem(cacheKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Date.now() - parsed.timestamp < 3600000) {
          setWeatherData(parsed.data);
          setLoading(false);
          return;
        }
      }
    } catch (e) {}

    // Check memory cache fallback
    if (window.__weatherCache[cacheKey]) {
      setWeatherData(window.__weatherCache[cacheKey]);
      setLoading(false);
      return;
    }

    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`)
      .then(r => r.json())
      .then(d => { 
        if (d.current_weather) {
          window.__weatherCache[cacheKey] = d.current_weather;
          try {
            localStorage.setItem(cacheKey, JSON.stringify({
              timestamp: Date.now(),
              data: d.current_weather
            }));
          } catch(e) {}
          setWeatherData(d.current_weather); 
        }
      })
      .catch(() => {
        // Silently fail so we don't show loading forever
      })
      .finally(() => {
        setLoading(false);
      });
  }, [userCoords, activeCity, cities]);

  if (loading) {
    return (
      <div style={{ height: 40, marginTop: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 60, height: 20, borderRadius: 10, background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', animation: 'pulse 1.5s infinite' }} />
        <div style={{ width: 140, height: 14, borderRadius: 8, background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', animation: 'pulse 1.5s infinite' }} />
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
      </div>
    );
  }

  if (!weatherData) return null; // Hide completely if failed

  const t = weatherData.temperature;
  const hour = new Date().getHours();
  const isNight = hour >= 20 || hour < 6;

  // Simple hash based on day of year to keep message consistent during the same day, 
  // but change randomly between days. (Or just Math.random since it mounts once).
  // Math.random() is fine, we just want variety.
  const pickRandom = (arr) => arr[Math.floor(randomSeed.current * arr.length)];

  let icon = "☀️";
  let moodOptions = [];

  // 🌡️ Por temperatura + hora
  if (t >= 32) {
    icon = isNight ? "🌙" : "🔥";
    if (hour >= 14 && hour <= 17) moodOptions = [
      "Calor extremo — busca un lugar con aire acondicionado",
      "Día ardiente — ¡urge una alberca o algo frío!",
      "El calor está fuerte — tiempo de una nieve o raspado",
      "Tarde calurosa — escápate a una plaza o lugar techado",
      "Ideal para pedir mariscos frescos o aguachile"
    ];
    else if (isNight) moodOptions = [
      "Noche calurosa — perfecto para bares y terrazas",
      "Clima ideal para una cerveza bien fría",
      "Noche tropical — ¿qué tal unos buenos tacos al pastor?",
      "Excelente clima para cenar al aire libre",
      "Hace calorcito — ideal para salir por unos drinks"
    ];
    else moodOptions = [
      "Mañana calurosa — empieza el día con algo refrescante",
      "Día cálido — ideal para buscar la sombra",
      "El sol está a tope — ¡no olvides hidratarte bien!",
      "Excelente día para desayunar fruta o algo ligero"
    ];
  } else if (t >= 27) {
    icon = isNight ? "🌙" : "☀️";
    if (hour >= 6 && hour < 11) moodOptions = [
      "Mañana cálida — perfecta para un brunch al aire libre",
      "Lindo inicio de día — anímate a salir temprano",
      "Clima riquísimo para unos chilaquiles picositos",
      "El clima pinta de maravilla para hoy"
    ];
    else if (hour >= 11 && hour < 15) moodOptions = [
      "Buen clima para comer en terraza",
      "Mediodía agradable — busca un lugar con buena vista",
      "Día soleado — perfecto para explorar lugares nuevos",
      "Aprovecha el sol para comer mariscos o cortes"
    ];
    else if (hour >= 15 && hour < 20) moodOptions = [
      "Tarde perfecta para salir a pasear",
      "Clima relajado — ideal para tardear con amigos",
      "Excelente tarde para un helado o crepas",
      "Se respira buen ambiente — sal a dar la vuelta"
    ];
    else moodOptions = [
      "Noche cálida — perfecto para bares o cenar afuera",
      "Clima estupendo para salir de fiesta",
      "Noche de manga corta — ¡aprovecha las terrazas!",
      "¿Pizza o sushi? La noche está perfecta para salir"
    ];
  } else if (t >= 20) {
    icon = isNight ? "🌛" : "⛅";
    if (hour >= 6 && hour < 10) moodOptions = [
      "Mañana fresca — ideal para un buen desayuno",
      "Mañana muy agradable para arrancar el día",
      "Clima suave — se antoja algo horneado recién hecho",
      "Empieza con energía, el día está hermoso"
    ];
    else if (hour >= 10 && hour < 14) moodOptions = [
      "Clima perfecto para explorar la ciudad",
      "Mediodía súper a gusto — ideal para cualquier plan",
      "Ni frío ni calor — ¡sal a dar la vuelta!",
      "El clima está en su punto perfecto"
    ];
    else if (hour >= 14 && hour < 19) moodOptions = [
      "Tarde ideal para salir a caminar o ir al parque",
      "Tardes de relax — busca un buen postre",
      "Clima ideal para platicar largo y tendido",
      "Se siente muy a gusto, escápate un rato"
    ];
    else moodOptions = [
      "Noche agradable — ¿cena o un trago?",
      "Clima de 10 para salir con amigos o en pareja",
      "Noche perfecta para pasear o cenar rico",
      "La velada está perfecta para descubrir un lugar nuevo"
    ];
  } else if (t >= 14) {
    icon = isNight ? "🌙" : "🌤️";
    if (hour >= 6 && hour < 12) moodOptions = [
      "Día fresco — abrígate un poco y sal a desayunar",
      "El clima pide a gritos un pan dulce o hot cakes",
      "Mañanita fresca para arrancar con calma",
      "Desayuno calientito para entrar en calor"
    ];
    else if (hour >= 12 && hour < 20) moodOptions = [
      "Clima fresco — ideal para restaurantes techados",
      "Tarde fresquita — perfecta para lugares acogedores",
      "Se antoja platicar con una buena bebida caliente",
      "Tarde nublada — ¡ve a probar un lugar nuevo en interiores!"
    ];
    else moodOptions = [
      "Noche fresca — abrígate y sal a cenar",
      "Noche para chamarra ligera y una buena cena",
      "Clima frío y romántico — busca lugares cálidos",
      "Ideal para cenar pastas, fondues o carne asada"
    ];
  } else {
    icon = isNight ? "🥶" : "🥶";
    if (isNight) moodOptions = [
      "Noche helada — pide a domicilio o cena cerca",
      "Hace muchísimo frío — ¡Pide por la app desde tu cama!",
      "Noche bajo cero — se antoja cena caliente y cobijas",
      "El clima perfecto para pedir pizza y ver pelis"
    ];
    else moodOptions = [
      "Día muy frío — busca caldos o pozole caliente",
      "Clima helado — perfecto para no salir y pedir a casa",
      "Hace mucho frío — ¡mantente calientito!",
      "Abrígate muy bien si vas a salir hoy"
    ];
  }

  // Pick a random mood using useMemo so it doesn't change on arbitrary re-renders
  // Avoid useMemo here to prevent hook order issues after conditional returns
  const mood = pickRandom(moodOptions);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 4,
      marginTop: 12
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontSize: 15, fontWeight: 800, color: dark ? "#fff" : "#111827" }}>{Math.round(t)}°C</span>
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: dark ? "rgba(255,255,255,0.7)" : "rgba(17,24,39,0.5)", letterSpacing: "-0.2px", textAlign: "center" }}>
        {mood}
      </span>
    </div>
  );
}
