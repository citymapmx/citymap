import StoreAdminClient from '../../../../components/manage/StoreAdminClient';
import { notFound } from 'next/navigation';

export const metadata = { title: 'Editor de Menú - CityMap' };

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dpkjxhjkzdlkvyotoeai.supabase.co";
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwa2p4aGpremRsa3Z5b3RvZWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MzYzNTAsImV4cCI6MjA5NjAxMjM1MH0.R6ZoNQHKP-DDA4F8phgolf82AEOTII-mLUlWc3DWHyE";

async function getBusiness(id) {
  try {
    const res = await fetch(`${SB_URL}/rest/v1/businesses?id=eq.${id}&select=*`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }
    });
    const data = await res.json();
    return data?.[0] || null;
  } catch { return null; }
}

export default async function ManageBizMenuPage({ params }) {
  const { bizId } = await params;
  const biz = await getBusiness(bizId);
  if (!biz) return notFound();
  
  return <StoreAdminClient biz={biz} />;
}
