'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuthStore } from '../../store/useAuthStore';
import { useFavorites } from '../../hooks/useFavorites';
import { sb } from '../../lib/supabase';
import { getThumbUrl } from '../../lib/utils';
import BackButton from '../BackButton';

export default function FavsClient() {
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  
  // Custom auth check
  useEffect(() => {
    if (user === null) {
      // Actually we should let them know they need to login or just show empty state
    }
  }, [user]);

  const { favIds, loadFavs, toggleFav } = useFavorites({ sb, user, setShowAuth: () => {} });
  const [favBiz, setFavBiz] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadFavs(user.id);
    } else {
      setLoading(false);
    }
  }, [user, loadFavs]);

  useEffect(() => {
    async function fetchBiz() {
      if (!favIds || favIds.length === 0) {
        setFavBiz([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await sb.get("businesses", `?id=in.(${favIds.join(',')})&select=id,name,logo_url,category,slug,city_slug`);
        setFavBiz(res || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchBiz();
  }, [favIds]);

  return (
    <div className="bg-[#f8fafc] min-h-screen font-sans pb-24">
      <div className="bg-white border-b border-gray-200 px-5 py-4 sticky top-0 z-20 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-900">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <h1 className="text-xl font-black text-gray-900">Mis Favoritos</h1>
      </div>

      <div className="px-5 pt-6">
        {!user ? (
          <div className="text-center py-20">
            <span className="text-4xl block mb-4">🔒</span>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Inicia sesión</h2>
            <p className="text-gray-500 mb-6">Inicia sesión para ver tus lugares favoritos guardados.</p>
            <button onClick={() => router.push('/cuenta')} className="bg-[#1A7A5E] text-white px-6 py-3 rounded-full font-bold">
              Ir a Mi Cuenta
            </button>
          </div>
        ) : loading ? (
          <div className="text-center py-20 text-gray-400 font-bold animate-pulse">Cargando favoritos...</div>
        ) : favBiz.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-4xl block mb-4">💔</span>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Aún no tienes favoritos</h2>
            <p className="text-gray-500">Explora la ciudad y guarda los lugares que más te gusten.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {favBiz.map(b => (
              <div key={b.id} className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex flex-col gap-2 relative">
                <button 
                  onClick={(e) => toggleFav(b.id, e)}
                  className="absolute top-2 right-2 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center z-10 text-red-500 shadow-sm"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                </button>
                <a href={`/${b.city_slug}/${b.slug || b.id}`} className="flex flex-col gap-2">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-xl shrink-0 overflow-hidden relative">
                    {b.logo_url ? <Image src={getThumbUrl(b.logo_url, 150, 150)} alt="Logo" fill style={{objectFit: 'cover'}} unoptimized={b.logo_url.includes('data:image')} /> : "🏪"}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-[13px] leading-tight line-clamp-2">{b.name}</div>
                    <div className="text-gray-400 text-[10px] font-bold uppercase mt-1 truncate">{b.category}</div>
                  </div>
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
