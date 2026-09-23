'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/useAuthStore';
import AuthClient from '../auth/AuthClient';
import { sb } from '../../lib/supabase';
import Image from 'next/image';

export default function AccountClient() {
  const router = useRouter();
  const { user, profile, authChecked, handleAuth, doSignOut } = useAuthStore();
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    // If auth is checked and no user, show login UI
    if (authChecked && !user) {
      setShowAuthModal(true);
    } else if (authChecked && user) {
      setShowAuthModal(false);
    }
  }, [authChecked, user]);

  if (!authChecked) {
    return <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]"><div className="w-8 h-8 border-4 border-[#1A7A5E] border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!user) {
    return (
      <div className="bg-[#f8fafc] min-h-screen font-sans pb-24 px-5 pt-10 flex flex-col items-center">
        <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center text-4xl mb-6">👋</div>
        <h1 className="text-2xl font-black text-gray-900 mb-2">Bienvenido a CityMap</h1>
        <p className="text-center text-gray-500 mb-8 max-w-sm">Crea una cuenta para guardar tus lugares favoritos, acceder a cupones exclusivos y ver tus tarjetas de lealtad.</p>
        
        <AuthClient onClose={() => router.push('/')} isEmbedded={true} />
      </div>
    );
  }

  return (
    <div className="bg-[#f8fafc] min-h-screen font-sans pb-24">
      <div className="bg-white border-b border-gray-200 px-5 py-4 sticky top-0 z-20 flex items-center justify-between">
        <h1 className="text-xl font-black text-gray-900">Mi Cuenta</h1>
        <button onClick={async () => { await sb.signOut(); useAuthStore.setState({ user: null, profile: null }); router.push('/'); }} className="text-sm font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-full">
          Cerrar sesión
        </button>
      </div>

      <div className="px-5 pt-8">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center gap-5 mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#1A7A5E] to-emerald-400 flex items-center justify-center text-white text-2xl font-black shadow-inner">
            {profile?.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900">{profile?.name || "Usuario"}</h2>
            <p className="text-gray-500 text-sm font-medium">{user.email}</p>
          </div>
        </div>

        <h3 className="text-[13px] font-black uppercase text-gray-400 tracking-wider mb-3 px-2">Actividad</h3>
        
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-8">
          <button onClick={() => router.push('/favoritos')} className="w-full flex items-center justify-between p-5 border-b border-gray-50 active:bg-gray-50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center text-lg">❤️</div>
              <span className="font-bold text-gray-900 text-base">Mis Favoritos</span>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
          
          <button onClick={() => router.push('/wallet')} className="w-full flex items-center justify-between p-5 border-b border-gray-50 active:bg-gray-50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center text-lg">🎟️</div>
              <span className="font-bold text-gray-900 text-base">CityMap Wallet</span>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
