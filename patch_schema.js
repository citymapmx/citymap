const fs = require('fs');

const path = 'web-next/src/app/[city]/[slug]/page.js';
let content = fs.readFileSync(path, 'utf8');

const schemaInsert = `
      ...(biz.rating ? {
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": biz.rating,
          "reviewCount": biz.reviews_count || reviews.length || 1
        }
      } : {}),
      ...(reviews && reviews.length > 0 ? {
        "review": reviews.slice(0, 5).map(r => ({
          "@type": "Review",
          "author": { "@type": "Person", "name": r.user_name || "Usuario de CityMap" },
          "datePublished": (r.created_at || "").split('T')[0],
          "reviewBody": r.content || "",
          "reviewRating": { "@type": "Rating", "ratingValue": r.rating || 5 }
        }))
      } : {}),
      "openingHoursSpecification": (() => {
        if (!biz.schedule) return [];
        let sched = {};
        try { sched = typeof biz.schedule === 'string' ? JSON.parse(biz.schedule) : biz.schedule; } catch(e){}
        const spec = [];
        const dayMap = { dom: "Sunday", lun: "Monday", mar: "Tuesday", mie: "Wednesday", jue: "Thursday", vie: "Friday", sab: "Saturday" };
        for (const [es, en] of Object.entries(dayMap)) {
          if (sched[es] && !/cerrado/i.test(sched[es])) {
            // Un acercamiento simplificado: si hay horario, lo declaramos abierto ese día
            spec.push({
              "@type": "OpeningHoursSpecification",
              "dayOfWeek": en,
              "opens": "00:00",
              "closes": "23:59"
            });
          }
        }
        return spec;
      })()
`;

content = content.replace(/(\.\.\.\(biz\.rating \? \{\s*"aggregateRating": \{[^}]+\}\s*\} : \{\}\))/m, schemaInsert.trim());

fs.writeFileSync(path, content);
console.log('Patched schema!');
