'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MapaRootRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Attempt to read user's active city from local storage if available
    let city = 'tepic';
    try {
      const stored = localStorage.getItem('cg_active_city');
      if (stored) city = JSON.parse(stored);
    } catch (e) {}

    router.replace(`/mapa/${city}`);
  }, [router]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F2F4F2' }}>
      <div style={{ width: 28, height: 28, border: "2px solid #EAF4F0", borderTop: "2px solid #1A7A5E", borderRadius: "50%", animation: "spin .9s linear infinite" }} />
    </div>
  );
}
