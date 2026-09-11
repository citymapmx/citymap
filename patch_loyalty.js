const fs = require('fs');
const file = '/Users/danielarana/Desktop/cityguide/src/components/loyalty/LoyaltyDesigner.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add new state vars
content = content.replace(
  'const [activeTab, setActiveTab] = useState("design");',
  'const [activeTab, setActiveTab] = useState("design");\n  const [isEditing, setIsEditing] = useState(false);\n  const [searchQuery, setSearchQuery] = useState("");'
);

// 2. Modify useEffect to set isEditing
content = content.replace(
  'stamps_required: card.stamps_required || 5,\n            logo_url: card.logo_url || business.logo_url || business.img1 || null\n          });',
  'stamps_required: card.stamps_required || 5,\n            logo_url: card.logo_url || business.logo_url || business.img1 || null\n          });\n          setIsEditing(false); // Mostrar dashboard por defecto'
);
content = content.replace(
  '} catch (e) {\n        console.error(e);\n      }',
  '} catch (e) {\n        console.error(e);\n      }\n      if (!data || data.length === 0) setIsEditing(true);'
);
// Wait, data is not defined outside try block.
// Let's use a regex to properly replace the useEffect.
