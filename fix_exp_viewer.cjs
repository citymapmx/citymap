const fs = require('fs');

const path = 'src/components/ExperienceViewer.jsx';
let content = fs.readFileSync(path, 'utf8');

// Define isBlog
if (!content.includes('const isBlog =')) {
  content = content.replace(
    'const priceFormatted = exp.price > 0 ? `$${exp.price.toLocaleString("en-US")} ${curr}` : \'Gratis\';',
    `const priceFormatted = exp.price > 0 ? \`\$\${exp.price.toLocaleString("en-US")} \${curr}\` : 'Gratis';
  const isBlog = exp.activity_type && (exp.activity_type.toLowerCase().includes("blog") || exp.activity_type.toLowerCase().includes("guía"));`
  );
}

// Hide Price
const priceBlock = `<div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: priceFormatted === 'Gratis' ? 14 : 22, fontWeight: 900, color: T.text, textTransform: priceFormatted === 'Gratis' ? "uppercase" : "none", letterSpacing: priceFormatted === 'Gratis' ? 0.5 : 0 }}>{priceFormatted}</span>
          {priceFormatted !== 'Gratis' && (
            <span style={{ fontSize: 13, color: T.sub, fontWeight: 500 }}>(los precios pueden variar)</span>
          )}
        </div>`;

const newPriceBlock = `{!isBlog && (
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: priceFormatted === 'Gratis' ? 14 : 22, fontWeight: 900, color: T.text, textTransform: priceFormatted === 'Gratis' ? "uppercase" : "none", letterSpacing: priceFormatted === 'Gratis' ? 0.5 : 0 }}>{priceFormatted}</span>
            {priceFormatted !== 'Gratis' && (
              <span style={{ fontSize: 13, color: T.sub, fontWeight: 500 }}>(los precios pueden variar)</span>
            )}
          </div>
        )}`;

if (content.includes(priceBlock)) {
  content = content.replace(priceBlock, newPriceBlock);
}

// Hide "Sobre esta experiencia"
const descBlock = `<h3 style={{ fontSize: 18, fontWeight: 800, color: T.text, marginBottom: 14, letterSpacing: -0.3 }}>Sobre esta experiencia</h3>`;
const newDescBlock = `{!isBlog && <h3 style={{ fontSize: 18, fontWeight: 800, color: T.text, marginBottom: 14, letterSpacing: -0.3 }}>Sobre esta experiencia</h3>}`;

if (content.includes(descBlock)) {
  content = content.replace(descBlock, newDescBlock);
}

fs.writeFileSync(path, content);
console.log('Fixed ExperienceViewer.jsx');
