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
    
    const slug = activeCity || activeCity?.split(',')[0];
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
  
  let icon = "☀️";
  let mood = "Perfecto para terrazas y mariscos";
  
  if (code >= 1 && code <= 3) { icon = "⛅"; mood = "Ideal para un buen café o salir a caminar"; }
  else if (code >= 51 && code <= 67) { icon = "🌧️"; mood = "Se antoja un lugar techado y calentito"; }
  else if (code >= 71 && code <= 77) { icon = "❄️"; mood = "Día helado, ¡busca algo caliente!"; }
  else if (code >= 95) { icon = "⛈️"; mood = "Tormenta, ideal para pedir a domicilio"; }
  else {
    if (t > 29) { icon = "🔥"; mood = "Hace calor, busca una terraza o mariscos"; }
    else if (t < 16) { icon = "☕"; mood = "Clima fresco, ideal para café o postres"; }
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
