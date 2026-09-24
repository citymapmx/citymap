import React, { useState, useEffect } from 'react';

const CITY_COORDS = {
  "guadalajara": { lat: 20.659698, lng: -103.349609 },
  "puerto-vallarta": { lat: 20.6534, lng: -105.2253 },
  "tepic": { lat: 21.5042, lng: -104.8944 },
  "ciudad-de-mexico": { lat: 19.4326, lng: -99.1332 },
  "madrid": { lat: 40.4168, lng: -3.7038 },
  "los-angeles": { lat: 34.0522, lng: -118.2437 },
  "cancun": { lat: 21.1619, lng: -86.8515 },
  "monterrey": { lat: 25.6866, lng: -100.3161 }
};

export default function HeroWeather({ userCoords, activeCity, cities = [], dark }) {
  const [weatherData, setWeatherData] = useState(null);

  useEffect(() => {
    // Determine the coordinates to use for weather
    let lat = 20.659698;
    let lng = -103.349609;
    
    const slug = (activeCity || "").split(',')[0].trim();
    const currentCityObj = cities?.find(c => c.slug === slug);
    
    if (currentCityObj && currentCityObj.lat) {
      lat = currentCityObj.lat;
      lng = currentCityObj.lng;
    } else if (slug && CITY_COORDS[slug]) {
      lat = CITY_COORDS[slug].lat;
      lng = CITY_COORDS[slug].lng;
    } else if (userCoords?.lat) {
      lat = userCoords.lat;
      lng = userCoords.lng;
    }

    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`)
      .then(r => r.json())
      .then(d => {
         if (d.current_weather) {
            setWeatherData(d.current_weather);
         }
      }).catch(e => console.error(e));
  }, [userCoords, activeCity, cities]);

  if (!weatherData) return <div style={{ height: 40, marginTop: 12 }}></div>;

  const t = weatherData.temperature;
  const code = weatherData.weathercode;
  const hour = new Date().getHours();

  let icon = "☀️";
  let mood = "Perfecto para terrazas y mariscos";

  // 🌩️ Condiciones extremas primero
  if (code >= 95) {
    icon = "⛈️"; mood = "Tormenta afuera — ideal para pedir a domicilio";
  } else if (code >= 71 && code <= 77) {
    icon = "❄️"; mood = "Día helado — ¿una fondue o un chocolate caliente?";
  } else if (code >= 51 && code <= 67) {
    icon = "🌧️"; mood = "Está lloviendo — busca un lugar techado y calentito";
  }
  // 🌡️ Por temperatura + hora
  else if (t >= 32) {
    icon = "🔥";
    if (hour >= 14 && hour <= 17) mood = "Calor extremo — busca un lugar con aire o alberca";
    else mood = "Hace mucho calor — perfecto para mariscos o aguas frescas";
  } else if (t >= 27) {
    icon = "☀️";
    if (hour >= 6 && hour < 11) mood = "Mañana cálida — perfecta para un brunch al aire libre";
    else if (hour >= 11 && hour < 15) mood = "Buen clima para comer en terraza";
    else if (hour >= 15 && hour < 20) mood = "Tarde perfecta para una cerveza o mariscos";
    else mood = "Noche cálida — perfecto para bares o cenar afuera";
  } else if (t >= 20) {
    icon = code <= 3 ? "⛅" : "☀️";
    if (hour >= 6 && hour < 10) mood = "Mañana fresca — ideal para un buen desayuno";
    else if (hour >= 10 && hour < 14) mood = "Clima agradable para explorar la ciudad";
    else if (hour >= 14 && hour < 19) mood = "Tarde ideal para café o salir a caminar";
    else mood = "Noche agradable — ¿cena o un trago?";
  } else if (t >= 14) {
    icon = "🌤️";
    if (hour >= 6 && hour < 12) mood = "Mañana fresca — perfecta para un café caliente";
    else if (hour >= 12 && hour < 20) mood = "Clima fresco — ideal para cafeterías y restaurantes";
    else mood = "Noche fresca — abrígate y sal a cenar";
  } else {
    icon = "🥶";
    if (hour >= 22 || hour < 6) mood = "Noche helada — pide a domicilio o cena cerca";
    else mood = "Día muy frío — busca caldos, pozole o café calientito";
  }

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 4,
      marginTop: 12,
      animation: "fadeUp 1s ease forwards",
      opacity: 0,
      transform: "translateY(10px)"
    }}>
      <style>{`
        @keyframes fadeUp {
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
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
