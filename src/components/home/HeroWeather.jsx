import React, { useState, useEffect } from 'react';

// Cache in memory so we don't re-fetch when navigating back to home
if (typeof window !== 'undefined' && !window.__weatherCache) {
  window.__weatherCache = {};
}

export default function HeroWeather({ userCoords, activeCity, cities = [], dark }) {
  const [weatherData, setWeatherData] = useState(null);

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

    if (!lat) return;

    const cacheKey = `${Math.round(lat*100)},${Math.round(lng*100)}`;
    if (window.__weatherCache[cacheKey]) {
      setWeatherData(window.__weatherCache[cacheKey]);
      return;
    }

    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`)
      .then(r => r.json())
      .then(d => { 
        if (d.current_weather) {
          window.__weatherCache[cacheKey] = d.current_weather;
          setWeatherData(d.current_weather); 
        }
      })
      .catch(() => {});
  }, [userCoords, activeCity, cities]);

  if (!weatherData) {
    return (
      <div style={{ height: 40, marginTop: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 60, height: 20, borderRadius: 10, background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', animation: 'pulse 1.5s infinite' }} />
        <div style={{ width: 140, height: 14, borderRadius: 8, background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', animation: 'pulse 1.5s infinite' }} />
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
      </div>
    );
  }

  const t = weatherData.temperature;
  const code = weatherData.weathercode;
  const hour = new Date().getHours();

  const isNight = hour >= 20 || hour < 6;

  let icon = isNight ? "🌙" : "☀️";
  let mood = "Perfecto para terrazas y mariscos";

  // 🌩️ Condiciones extremas primero (iguales de día y noche)
  if (code >= 95) {
    icon = "⛈️"; mood = "Tormenta afuera — ideal para pedir a domicilio";
  } else if (code >= 71 && code <= 77) {
    icon = "❄️"; mood = "Día helado — ¿una fondue o un chocolate caliente?";
  } else if (code >= 51 && code <= 67) {
    icon = "🌧️"; mood = "Está lloviendo — busca un lugar techado y calentito";
  }
  // 🌡️ Por temperatura + hora
  else if (t >= 32) {
    icon = isNight ? "🌙" : "🔥";
    if (hour >= 14 && hour <= 17) mood = "Calor extremo — busca un lugar con aire o alberca";
    else if (isNight) mood = "Noche calurosa — perfecto para bares y terrazas";
    else mood = "Hace mucho calor — perfecto para mariscos o aguas frescas";
  } else if (t >= 27) {
    icon = isNight ? "🌙" : "☀️";
    if (hour >= 6 && hour < 11) mood = "Mañana cálida — perfecta para un brunch al aire libre";
    else if (hour >= 11 && hour < 15) mood = "Buen clima para comer en terraza";
    else if (hour >= 15 && hour < 20) mood = "Tarde perfecta para una cerveza o mariscos";
    else mood = "Noche cálida — perfecto para bares o cenar afuera";
  } else if (t >= 20) {
    icon = isNight ? "🌛" : (code <= 3 ? "⛅" : "☀️");
    if (hour >= 6 && hour < 10) mood = "Mañana fresca — ideal para un buen desayuno";
    else if (hour >= 10 && hour < 14) mood = "Clima agradable para explorar la ciudad";
    else if (hour >= 14 && hour < 19) mood = "Tarde ideal para café o salir a caminar";
    else mood = "Noche agradable — ¿cena o un trago?";
  } else if (t >= 14) {
    icon = isNight ? "🌙" : "🌤️";
    if (hour >= 6 && hour < 12) mood = "Mañana fresca — perfecta para un café caliente";
    else if (hour >= 12 && hour < 20) mood = "Clima fresco — ideal para cafeterías y restaurantes";
    else mood = "Noche fresca — abrígate y sal a cenar";
  } else {
    icon = isNight ? "🥶" : "🥶";
    if (isNight) mood = "Noche helada — pide a domicilio o cena cerca";
    else mood = "Día muy frío — busca caldos, pozole o café calientito";
  }

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
