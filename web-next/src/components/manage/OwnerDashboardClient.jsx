'use client';
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import * as dbService from '../../services/dbService';
import { useAuthStore } from '../../store/useAuthStore';
import ReservationsAgenda from "../ReservationsAgenda";
import Link from "next/link";

export default function OwnerDashboardClient({ biz }) {
  const router = useRouter();
  const { user, authChecked } = useAuthStore();
  const [ownerRes, setOwnerRes] = useState([]);
  const [ownerStats, setOwnerStats] = useState({ views: 0, whatsapp: 0, phone: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authChecked) return;
    if (!user) {
      router.replace('/cuenta');
      return;
    }
    
    (async () => {
      setLoading(true);
      try {
        const [rv, an] = await Promise.all([
          dbService.getOwnerReservations(biz.id),
          dbService.getOwnerAnalytics(biz.id),
        ]);
        setOwnerRes(Array.isArray(rv) ? rv : []);
        if (Array.isArray(an)) {
          setOwnerStats({ 
            views: an.filter(a => a.event_type === "view").length, 
            whatsapp: an.filter(a => a.event_type === "whatsapp").length, 
            phone: an.filter(a => a.event_type === "phone").length 
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, authChecked, biz.id, router]);

  if (!authChecked || loading) return <div className="p-10 text-center animate-pulse">Cargando panel...</div>;

  return (
    <div className="bg-[#f8fafc] min-h-screen pb-24 font-sans">
      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 px-5 py-4 sticky top-0 z-20 flex items-center gap-3">
        <button onClick={() => router.push('/cuenta')} className="text-gray-900">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <h1 className="text-xl font-black text-gray-900">Dashboard</h1>
      </div>

      <div className="px-5 pt-6">
        
        {/* INFO CARD */}
        <div className="text-center mb-6">
          <div className="text-2xl font-black text-gray-900">{biz.name}</div>
          <div className="text-sm font-bold text-[#1A7A5E] uppercase tracking-wider mt-1">{biz.plan === 'free' ? 'Plan Gratuito' : 'Plan Premium'}</div>
        </div>

        {/* QUICK LINK */}
        <div className="flex justify-between items-center bg-white border border-gray-200 p-4 rounded-2xl mb-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
            </div>
            <div>
              <span className="text-[15px] font-bold text-gray-900 block leading-tight">Link directo</span>
              <span className="text-[12px] font-medium text-gray-500">Comparte tu panel</span>
            </div>
          </div>
          <button className="bg-gray-900 text-white px-4 py-2 rounded-xl text-xs font-bold active:scale-95 transition-transform" onClick={() => { navigator.clipboard.writeText(`https://citymap.mx/manage/${biz.slug || biz.id}`); alert("¡Enlace copiado!"); }}>
            Copiar
          </button>
        </div>

        {/* MENU EDITOR LINK (Always visible if premium, or upgrade if free) */}
        {biz.plan === "free" ? (
          <div className="bg-gradient-to-br from-gray-900 to-black p-5 rounded-2xl mb-6 text-white flex items-center gap-4 shadow-md">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-600 flex flex-shrink-0 items-center justify-center text-2xl">
              ⭐
            </div>
            <div className="flex-1">
              <div className="text-base font-black mb-1">Sube de nivel tu negocio</div>
              <div className="text-sm font-medium text-white/70 leading-tight">Desbloquea reservas, WhatsApp directo y Menú digital.</div>
            </div>
          </div>
        ) : (
          <Link href={`/manage/${biz.id}/menu`} className="flex justify-between items-center bg-[#1A7A5E] text-white p-5 rounded-2xl mb-6 shadow-md active:scale-[0.98] transition-transform">
            <div className="flex items-center gap-4">
              <div className="text-3xl">🍽️</div>
              <div>
                <span className="text-[16px] font-black block leading-tight">Editor de Menú</span>
                <span className="text-[13px] font-medium text-white/80">Administra tus productos y categorías</span>
              </div>
            </div>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </Link>
        )}

        {/* AGENDA */}
        {biz.plan !== "free" && (
          <div className="mt-6">
            <ReservationsAgenda ownerView={biz} ownerRes={ownerRes} setOwnerRes={setOwnerRes} />
          </div>
        )}
        
      </div>
    </div>
  );
}
