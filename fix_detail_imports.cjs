const fs = require('fs');
let code = fs.readFileSync('src/views/DetailView.jsx', 'utf8');

const importsToAdd = `
import GoogleReviewItem from '../components/detail/GoogleReviewItem.jsx';
import TikTokBlock from '../components/detail/TikTokBlock.jsx';
import GalleryLayout from '../components/detail/GalleryLayout.jsx';
import { sb } from '../lib/supabase.js';
`;

// Insert after the first few imports
code = code.replace(
  /import \{ useNavigate, useNavigationType \} from "react-router-dom";/,
  "import { useNavigate, useNavigationType } from 'react-router-dom';\n" + importsToAdd
);

fs.writeFileSync('src/views/DetailView.jsx', code);
