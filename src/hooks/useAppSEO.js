import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useUIStore } from '../store/useUIStore.js';
import { useDataStore } from '../store/useDataStore.js';
import { IS_WORLD, buildCityPath, getCountryCode } from '../lib/domain.js';

export function useAppSEO({ city }) {
  const location = useLocation();
  const selected = useUIStore(s => s.selected);
  const selectedEvent = useUIStore(s => s.selectedEvent);
  const activeCat = useUIStore(s => s.activeCat);
  const activeCity = useUIStore(s => s.activeCity);
  const mapPins = useDataStore(s => s.mapPins);
  const reviews = useDataStore(s => s.reviews);
  const setReviews = useDataStore(s => s.setReviews);
  const cities = useDataStore(s => s.cities);

  useEffect(() => {
    const CAT_SEO = {
      restaurantes: { title: "Los Mejores Restaurantes en {city} — Horarios y Reseñas", desc: "Encuentra los mejores restaurantes en {city}. Consulta menús, horarios, ubicaciones y reseñas de clientes. ¡Descubre dónde comer hoy!", label: "Restaurantes" },
      cafe:         { title: "Las Mejores Cafeterías en {city} — Menús y Horarios", desc: "Descubre las mejores cafeterías en {city}. Coffee shops, postres, ambiente y horarios actualizados. Tu próximo café favorito te espera.", label: "Cafeterías" },
      salud:        { title: "Salud y Bienestar en {city} — Clínicas, Doctores y Más", desc: "Encuentra clínicas, consultorios médicos, farmacias y centros de bienestar en {city}. Horarios, direcciones y reseñas.", label: "Salud y Bienestar" },
      belleza:      { title: "Las Mejores Estéticas y Spas en {city} — Belleza y Cuidado Personal", desc: "Salones de belleza, barberías, spas y estéticas en {city}. Reserva tu cita, consulta precios y encuentra el lugar perfecto para ti.", label: "Belleza y Estética" },
      fitness:      { title: "Los Mejores Gimnasios en {city} — Fitness y Entrenamiento", desc: "Gimnasios, crossfit, yoga y centros deportivos en {city}. Horarios, precios y promociones para ponerte en forma.", label: "Gimnasios y Fitness" },
      compras:      { title: "Las Mejores Tiendas en {city} — Compras y Comercios", desc: "Tiendas, boutiques y comercios en {city}. Encuentra las mejores opciones para tus compras con horarios y ubicaciones exactas.", label: "Tiendas y Compras" },
      tech:         { title: "Tecnología y Servicios Digitales en {city} — Tiendas y Reparación", desc: "Tiendas de tecnología, reparación de celulares, cómputo y servicios digitales en {city}. Encuentra lo que necesitas.", label: "Tecnología" },
      ocio:         { title: "Entretenimiento y Ocio en {city} — Bares, Antros y Diversión", desc: "Los mejores bares, antros, centros de entretenimiento y diversión en {city}. Horarios, eventos especiales y reseñas.", label: "Entretenimiento y Ocio" },
      hoteles:      { title: "Los Mejores Hoteles en {city} — Hospedaje y Alojamiento", desc: "Hoteles, posadas, Airbnb y hospedaje en {city}. Compara opciones, consulta precios y reserva tu estancia ideal.", label: "Hoteles y Hospedaje" },
      educacion:    { title: "Escuelas y Educación en {city} — Colegios, Cursos y Más", desc: "Escuelas, universidades, academias y cursos en {city}. Encuentra opciones educativas con horarios e información de contacto.", label: "Educación" },
    };
    const cityName = city || activeCity || "tu ciudad";
    const cityCapitalized = cityName.charAt(0).toUpperCase() + cityName.slice(1);
    
    const domain = IS_WORLD ? "citymap.world" : "citymap.mx";
    const origin = typeof window !== 'undefined' ? window.location.origin : `https://${domain}`;
    const BASE_URL = origin;
    
    let title = `CityMap ${cityCapitalized} — Restaurantes, Cafés y Negocios Locales`;
    let desc = `Descubre los mejores restaurantes, cafés, eventos y negocios en ${cityCapitalized}. Horarios actualizados, ubicaciones exactas, reseñas y cupones exclusivos.`;
    let image = `${BASE_URL}/og-image.jpg`;
    let schemaJson = "";
    let canonical = BASE_URL + buildCityPath(activeCity, cities);

    if (selected?.id) {
      if (!selected._fullFetched) {
        setReviews([]);
      }
      
      const bizCity = selected.city_slug || activeCity || "";
      const bizCityName = bizCity.charAt(0).toUpperCase() + bizCity.slice(1).replace(/-/g, " ");
      const catName = (CAT_SEO[selected.category] || {}).label || selected.type || "Negocio";
      
      const isFood = selected.category === "restaurantes" || selected.category === "cafe";
      title = `${selected.name} en ${bizCityName}: ${isFood ? "Menú, " : ""}Horarios y Reseñas | CityMap`;
      desc = selected.description 
        ? selected.description.slice(0, 155) + (selected.description.length > 155 ? "…" : "")
        : `Visita ${selected.name} en ${bizCityName}. Consulta horarios, menú, ubicación exacta, reseñas y promociones exclusivas en CityMap.`;
      if (selected.photos?.[0]?.url) image = selected.photos[0].url;
      
      const slug = selected.slug || "";
      const cleanedSlug = slug.startsWith(bizCity + "-") ? slug.slice(bizCity.length + 1) : slug;
      canonical = BASE_URL + buildCityPath(bizCity, cities) + "/" + cleanedSlug;
      
      const countryCode = getCountryCode(bizCity, cities).toUpperCase();
      const regionMap = {
        "puerto-vallarta": "Jalisco",
        "guadalajara": "Jalisco",
        "tepic": "Nayarit",
        "cancun": "Quintana Roo",
        "monterrey": "Nuevo León",
        "madrid": "Comunidad de Madrid"
      };
      const bizRegion = regionMap[bizCity] || (countryCode === "ES" ? "España" : "México");

      const businessImages = selected.photos?.map(p => p.url);
      const schemaImages = (businessImages && businessImages.length > 0) ? businessImages : [`${BASE_URL}/og-image.jpg`];

      const businessSchema = {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "name": selected.name,
        "image": schemaImages,
        "description": selected.description || `${selected.name} en ${bizCityName}`,
        "telephone": selected.phone || selected.whatsapp || "",
        "url": canonical,
        "address": { 
          "@type": "PostalAddress", 
          "streetAddress": selected.address || "", 
          "addressLocality": bizCityName, 
          "addressRegion": bizRegion,
          "addressCountry": countryCode 
        },
        "geo": selected.lat ? { "@type": "GeoCoordinates", "latitude": parseFloat(selected.lat), "longitude": parseFloat(selected.lng) } : undefined,
        "priceRange": "$$"
      };
      if (selected.review_count > 0 && selected.rating) {
        businessSchema.aggregateRating = {
          "@type": "AggregateRating",
          "ratingValue": String(selected.rating),
          "reviewCount": String(selected.review_count),
          "bestRating": "5"
        };
      }
      if (selected.schedule && typeof selected.schedule === "object") {
        const dayMap = { lun: "Monday", mar: "Tuesday", mie: "Wednesday", jue: "Thursday", vie: "Friday", sab: "Saturday", dom: "Sunday" };
        const hours = [];
        for (const [key, val] of Object.entries(selected.schedule)) {
          if (key === "type" || !val || /cerrado/i.test(val)) continue;
          if (dayMap[key]) hours.push(`${dayMap[key]} ${val}`);
        }
        if (hours.length > 0) businessSchema.openingHours = hours;
      }
      try {
        if (reviews && reviews.length > 0 && reviews[0]?.biz_id === selected.id) {
          businessSchema.review = reviews.slice(0, 3).map(r => ({
            "@type": "Review",
            "reviewRating": {
              "@type": "Rating",
              "ratingValue": String(r.rating || 5),
              "bestRating": "5"
            },
            "author": { "@type": "Person", "name": r.user_name || "Usuario CityMap" },
            "reviewBody": r.text || r.comment || "",
            "datePublished": r.created_at ? r.created_at.split("T")[0] : undefined
          }));
        }
      } catch(_) {}
      schemaJson = JSON.stringify(businessSchema);
      
    } else if (selectedEvent?.id) {
      title = `${selectedEvent.title} — Evento en ${cityCapitalized} | CityMap`;
      desc = selectedEvent.description 
        ? selectedEvent.description.slice(0, 155) + (selectedEvent.description.length > 155 ? "…" : "")
        : `No te pierdas ${selectedEvent.title} en ${cityCapitalized}. Fecha, ubicación, precios y todos los detalles en CityMap.`;
      if (selectedEvent.image) image = selectedEvent.image;
      canonical = `${BASE_URL}/evento/${selectedEvent.slug || selectedEvent.id}`;
      
      const countryCode = getCountryCode(selectedEvent.city_slug || activeCity, cities).toUpperCase();
      schemaJson = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Event",
        "name": selectedEvent.title,
        "startDate": selectedEvent.date_start,
        "endDate": selectedEvent.date_end || selectedEvent.date_start,
        "location": { "@type": "Place", "name": selectedEvent.venue_name || selectedEvent.location || cityCapitalized, "address": { "@type": "PostalAddress", "addressLocality": cityCapitalized, "addressCountry": countryCode } },
        "image": selectedEvent.image ? [selectedEvent.image] : [],
        "description": selectedEvent.description || "",
        "eventStatus": "https://schema.org/EventScheduled",
        "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode"
      });
    } else {
      if (activeCat && activeCat !== "explorar") {
        let catLabel = activeCat;
        if (CAT_SEO[activeCat]) {
          const catInfo = CAT_SEO[activeCat];
          catLabel = catInfo.label;
          title = catInfo.title.replace(/\{city\}/g, cityCapitalized) + " | CityMap";
          desc = catInfo.desc.replace(/\{city\}/g, cityCapitalized);
        } else {
          catLabel = activeCat.charAt(0).toUpperCase() + activeCat.slice(1).replace(/-/g, " ");
          title = `Los Mejores ${catLabel} en ${cityCapitalized} — Horarios y Reseñas | CityMap`;
          desc = `Descubre las mejores opciones de ${catLabel.toLowerCase()} en ${cityCapitalized}. Consulta ubicaciones, horarios, detalles y reseñas de la comunidad en CityMap.`;
        }
        canonical = BASE_URL + buildCityPath(activeCity, cities) + "/" + activeCat;
        
        const catBiz = (mapPins || []).filter(b => b.category === activeCat).slice(0, 10);
        const breadcrumbCat = {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Inicio", "item": `${BASE_URL}` },
            { "@type": "ListItem", "position": 2, "name": cityCapitalized, "item": `${BASE_URL}${buildCityPath(activeCity, cities)}` },
            { "@type": "ListItem", "position": 3, "name": catLabel, "item": canonical }
          ]
        };
        if (catBiz.length > 0) {
          schemaJson = JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "ItemList",
              "name": `${catLabel} en ${cityCapitalized}`,
              "numberOfItems": catBiz.length,
              "itemListElement": catBiz.map((b, i) => {
                const bSlug = b.slug || b.id;
                const bCity = b.city_slug || activeCity;
                const bCleaned = bSlug.startsWith(bCity + "-") ? bSlug.slice(bCity.length + 1) : bSlug;
                return {
                  "@type": "ListItem",
                  "position": i + 1,
                  "name": b.name,
                  "url": `${BASE_URL}${buildCityPath(bCity, cities)}/${bCleaned}`
                };
              })
            },
            breadcrumbCat
          ]);
        } else {
          schemaJson = JSON.stringify(breadcrumbCat);
        }
      } else if (location.pathname.startsWith("/eventos")) {
        title = `Eventos y Conciertos en ${cityCapitalized} — Cartelera Actualizada | CityMap`;
        desc = `Descubre los próximos eventos, conciertos, festivales y actividades en ${cityCapitalized}. Fechas, precios y ubicaciones en CityMap.`;
        canonical = `${BASE_URL}/eventos`;
      } else if (location.pathname.startsWith("/mapa")) {
        title = `Mapa de Negocios en ${cityCapitalized} — Encuentra Lugares Cercanos | CityMap`;
        desc = `Explora el mapa interactivo de ${cityCapitalized}. Encuentra restaurantes, cafés y negocios cercanos a ti con horarios y reseñas.`;
        canonical = `${BASE_URL}/mapa`;
      } else if (location.pathname.startsWith("/mis-planes") || location.pathname.startsWith("/experiencias") || location.pathname.startsWith("/planes")) {
        title = `Qué hacer en ${cityCapitalized} — Mejores Tours y Actividades | CityMap`;
        desc = `Descubre qué hacer en ${cityCapitalized}. Encuentra los mejores tours, actividades, planes de fin de semana y experiencias inolvidables. Reserva ahora con CityMap.`;
        canonical = `${BASE_URL}/experiencias/${activeCity || ""}`;
        schemaJson = JSON.stringify([
          {
            "@context": "https://schema.org",
            "@type": "TouristAttraction",
            "name": `Qué hacer en ${cityCapitalized}`,
            "description": desc,
            "url": canonical,
            "address": { "@type": "PostalAddress", "addressLocality": cityCapitalized, "addressCountry": "MX" }
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Inicio", "item": `${BASE_URL}` },
              { "@type": "ListItem", "position": 2, "name": cityCapitalized, "item": `${BASE_URL}${buildCityPath(activeCity, cities)}` },
              { "@type": "ListItem", "position": 3, "name": "Qué hacer", "item": canonical }
            ]
          }
        ]);
      } else if (location.pathname.startsWith("/cuenta")) {
        title = `Mi Cuenta — CityMap`;
        desc = `Gestiona tu perfil, favoritos y reseñas en CityMap.`;
        canonical = `${BASE_URL}/cuenta`;
      } else {
        canonical = BASE_URL + buildCityPath(activeCity, cities);
        schemaJson = JSON.stringify([
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "CityMap",
            "url": `${BASE_URL}/`,
            "description": desc,
            "potentialAction": {
              "@type": "SearchAction",
              "target": `${BASE_URL}/?buscar={search_term_string}`,
              "query-input": "required name=search_term_string"
            }
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Inicio", "item": `${BASE_URL}` },
              ...(activeCity ? [{ "@type": "ListItem", "position": 2, "name": cityCapitalized, "item": `${BASE_URL}${buildCityPath(activeCity, cities)}` }] : [])
            ]
          }
        ]);
      }
    }

    document.title = title;
    const setMeta = (selector, content) => {
      let el = document.querySelector(selector);
      if (el) el.setAttribute("content", content);
    };
    
    setMeta('meta[name="description"]', desc);
    setMeta('meta[property="og:title"]', title);
    setMeta('meta[property="og:description"]', desc);
    setMeta('meta[property="og:image"]', image);
    setMeta('meta[property="og:url"]', canonical);
    setMeta('meta[name="twitter:title"]', title);
    setMeta('meta[name="twitter:description"]', desc);
    setMeta('meta[name="twitter:image"]', image);
    
    let canonicalEl = document.querySelector('link[rel="canonical"]');
    if (!canonicalEl) {
      canonicalEl = document.createElement("link");
      canonicalEl.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute("href", canonical);

    let script = document.getElementById("json-ld-schema");
    if (!script) { 
      script = document.createElement("script"); 
      script.id = "json-ld-schema"; 
      script.type = "application/ld+json"; 
      document.head.appendChild(script); 
    }
    script.innerText = schemaJson;
  }, [selected, selectedEvent, city, location.pathname, activeCat, activeCity, mapPins, cities]);
}
