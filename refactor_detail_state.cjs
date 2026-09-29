const fs = require('fs');
let code = fs.readFileSync('src/views/DetailView.jsx', 'utf8');

// Atomic UI Store
const atomicUI = `
  const dark = useUIStore(s => s.dark);
  const activeCity = useUIStore(s => s.activeCity);
  const toast$ = useUIStore(s => s.toast$);
  const setShowItineraryModal = useUIStore(s => s.setShowItineraryModal);
  const setItineraryTargetBiz = useUIStore(s => s.setItineraryTargetBiz);
  const openedFromMap = useUIStore(s => s.openedFromMap);
  const setOpenedFromMap = useUIStore(s => s.setOpenedFromMap);
`;

code = code.replace(
  /const { dark, activeCity.*?useUIStore\(useShallow.*?\}\)\)\);/s,
  atomicUI
);

// Atomic Data Store
const atomicData = `
  const dbReady = useDataStore(s => s.dbReady);
  const promos = useDataStore(s => s.promos);
  const coupons = useDataStore(s => s.coupons);
  const events = useDataStore(s => s.events);
  const wallet = useDataStore(s => s.wallet);
  const setWallet = useDataStore(s => s.setWallet);
  const claimedCoupons = useDataStore(s => s.claimedCoupons);
  const setClaimedCoupons = useDataStore(s => s.setClaimedCoupons);
  const reviews = useDataStore(s => s.reviews);
  const setReviews = useDataStore(s => s.setReviews);
  const globalFavCounts = useDataStore(s => s.globalFavCounts);
  const raffles = useDataStore(s => s.raffles);
  const setRaffles = useDataStore(s => s.setRaffles);
`;

code = code.replace(
  /const { dbReady, promos.*?useDataStore\(useShallow.*?\}\)\)\);/s,
  atomicData
);

// Atomic Auth Store
const atomicAuth = `
  const user = useAuthStore(s => s.user);
  const setShowAuth = useAuthStore(s => s.setShowAuth);
`;

code = code.replace(
  /const { user, setShowAuth } = useAuthStore\(useShallow.*?\)\)\);/s,
  atomicAuth
);

fs.writeFileSync('src/views/DetailView.jsx', code);
