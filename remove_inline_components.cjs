const fs = require('fs');
let code = fs.readFileSync('src/views/DetailView.jsx', 'utf8');

// Imports
const newImports = `
import GoogleReviewItem from '../components/detail/GoogleReviewItem.jsx';
import TikTokBlock from '../components/detail/TikTokBlock.jsx';
import GalleryLayout from '../components/detail/GalleryLayout.jsx';
`;

code = code.replace(
  /import \{ FONT_BIZ \} from '\.\.\/lib\/constants\.js';/,
  "import { FONT_BIZ } from '../lib/constants.js';" + newImports
);

// Remove GalleryLayout
code = code.replace(/const GalleryLayout = \(\{ photos, T, setShowGallery, bizName \}\) => \{[\s\S]*?^\};\n/m, '');

// Remove GoogleReviewItem
code = code.replace(/const GoogleReviewItem = \(\{ r, isElite, dText, dSub, T, isLast \}\) => \{[\s\S]*?^\};\n/m, '');

// Remove TikTokBlock
code = code.replace(/const TikTokBlock = \(\{ url, videoId \}\) => \{[\s\S]*?^\};\n/m, '');

fs.writeFileSync('src/views/DetailView.jsx', code);
