const fs = require('fs');
let code = fs.readFileSync('src/views/DetailView.jsx', 'utf8');

// 1. Add direct imports
if (!code.includes('import { getKm, isOpenNow, createSlug, parseMenuUrls, getEventStatus }')) {
  code = code.replace(
    /import \{ useTranslation \} from "\.\.\/hooks\/useTranslation\.js";/,
    "import { useTranslation } from '../hooks/useTranslation.js';\nimport { getKm, isOpenNow, createSlug, parseMenuUrls, getEventStatus } from '../lib/utils.js';\nimport { FONT_BIZ } from '../lib/constants.js';"
  );
}

// 2. Remove context mess
const atomicCtx = `
  const { viewStyle, selected, setView, setFade, navigate, T, favIds, toggleFav, goWhatsApp, goDir, doShare, setReviewStar, setReviewText, setShowReview, biz, userCoords, showGallery, setShowGallery, callPhone, setMapPin, setShowMenuGallery, goWeb, trackEvent, setSelectedEvent, handleEventTap, showReview, reviewStar, reviewText, postReview, isAdmin, setBiz, setSelected, toggleLikeReview, setClaimBiz, reviewImgFile, setReviewImgFile, reviewImgLoading, city } = ctx;
  const isOpen = (b) => isOpenNow(b, city?.timezone || "America/Mexico_City");
`;

code = code.replace(
  /const { viewStyle.*?reviewImgLoading } = ctx;/s,
  atomicCtx
);

fs.writeFileSync('src/views/DetailView.jsx', code);
