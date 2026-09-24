import React, { useState, useEffect } from 'react';

export default function HeroWeather({ userCoords, activeCity, cities = [], dark }) {
  const [weatherData, setWeatherData] = useState(null);

  useEffect(() => {
    // Determine the coordinates to use for weather
    let lat = 20.659698;
    let lng = -103.349609;
    
    const currentCityObj = cities?.find(c => c.slug === activeCity || c.slug === activeCity?.split(',')[0]);
    if (currentCityObj && currentCityObj.lat) {
      lat = currentCityObj.lat;
      lng = currentCityObj.lng;
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

  if (!weatherData) return <div style={{ height: 24, marginTop: 12 }}></div>;

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
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      background: dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
      backdropFilter: "blur(10px)",
      WebkitBackdropFilter: "blur(10px)",
      padding: "6px 14px",
      borderRadius: 100,
      marginTop: 12,
      margin: "12px auto 0",
      animation: "fadeUp 1s ease forwards",
      opacity: 0,
      transform: "translateY(10px)"
    }}>
      <style>{`
        @keyframes fadeUp {
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: 800, color: dark ? "#fff" : "#111827" }}>{Math.round(t)}°C</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: dark ? "rgba(255,255,255,0.7)" : "rgba(17,24,39,0.6)" }}>•</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: dark ? "rgba(255,255,255,0.8)" : "rgba(17,24,39,0.7)", letterSpacing: "-0.2px" }}>{mood}</span>
    </div>
  );
}
