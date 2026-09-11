import fetch from 'node-fetch';
const url = 'https://szyamobokffzttctkqof.supabase.co/rest/v1/loyalty_members?select=*';
const anon = process.env.VITE_SUPABASE_ANON_KEY;
// We'd need the anon key. 
