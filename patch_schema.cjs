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
          "author": { "@type": "Person", "name": r.user_name || "Usuario" },
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
          const txt = sched[es];
          if (txt && !/cerrado/i.test(txt)) {
            // Intento de extraer HH:MM
            const segs = txt.split(/[-a]/i).map(s => s.trim());
            let opens = "09:00", closes = "22:00"; // default fallback
            if (segs[0]) {
               const m = segs[0].match(/(\\d{1,2})(:\\d{2})?/);
               if (m) {
                 let h = parseInt(m[1]);
                 if (/p/i.test(segs[0]) && h < 12) h += 12;
                 opens = \`\${String(h).padStart(2,'0')}:\${m[2] ? m[2].slice(1) : '00'}\`;
               }
            }
            if (segs[1]) {
               const m = segs[1].match(/(\\d{1,2})(:\\d{2})?/);
               if (m) {
                 let h = parseInt(m[1]);
                 if (/p/i.test(segs[1]) && h < 12) h += 12;
                 closes = \`\${String(h).padStart(2,'0')}:\${m[2] ? m[2].slice(1) : '00'}\`;
               }
            }
            spec.push({
              "@type": "OpeningHoursSpecification",
              "dayOfWeek": en,
              "opens": opens,
              "closes": closes
            });
          }
        }
        return spec;
      })()
`;

content = content.replace(/\.\.\.\(biz\.rating \? \{\s*"aggregateRating": \{\s*"@type": "AggregateRating",\s*"ratingValue": biz\.rating,\s*"reviewCount": biz\.reviews_count \|\| reviews\.length \|\| 1\s*\}\s*\} : \{\}\)/m, schemaInsert.trim());

fs.writeFileSync(path, content);
console.log('Patched schema!');
