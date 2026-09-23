'use client';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/useAuthStore';
import { useDataStore } from '../../store/useDataStore';

export default function WalletClient() {
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const { wallet, claimedCoupons } = useDataStore();

  return (
    <div className="bg-[#f8fafc] min-h-screen font-sans pb-24">
      <div className="bg-white border-b border-gray-200 px-5 py-4 sticky top-0 z-20 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-900">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <h1 className="text-xl font-black text-gray-900">CityMap Wallet</h1>
      </div>

      <div className="px-5 pt-8">
        {!user ? (
          <div className="text-center py-20">
            <span className="text-4xl block mb-4">🔒</span>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Inicia sesión</h2>
            <p className="text-gray-500 mb-6">Inicia sesión para ver tus tarjetas de lealtad y boletos.</p>
            <button onClick={() => router.push('/cuenta')} className="bg-[#1A7A5E] text-white px-6 py-3 rounded-full font-bold">
              Ir a Mi Cuenta
            </button>
          </div>
        ) : (!wallet || wallet.length === 0) ? (
          <div className="text-center py-20">
            <span className="text-4xl block mb-4">🎫</span>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Wallet Vacía</h2>
            <p className="text-gray-500">Aún no tienes tarjetas de lealtad ni cupones guardados.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {wallet.map((item, i) => (
              <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-xl">
                  {item.emoji || "🎟️"}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{item.title || "Cupón Especial"}</h3>
                  <p className="text-sm text-gray-500">{item.bizName || "CityMap Partner"}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
