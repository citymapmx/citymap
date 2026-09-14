'use client';

import { useState } from 'react';
import Icon from '../ui/Icon';
import { useAuthStore } from '../../store/useAuthStore';
import { sb } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function ReviewSection({ bizId, initialReviews = [] }) {
  const user = useAuthStore(s => s.user);
  const setShowAuth = useAuthStore(s => s.setShowAuth);
  
  const [showForm, setShowForm] = useState(false);
  const [text, setText] = useState("");
  const [stars, setStars] = useState(5);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleReviewClick = () => {
    if (!user) {
      setShowAuth(true);
      return;
    }
    setShowForm(!showForm);
  };

  const submitReview = async () => {
    if (!text.trim()) return alert("Escribe algo en tu reseña.");
    setLoading(true);
    try {
      const p = useAuthStore.getState().profile;
      await sb.post("reviews", {
        biz_id: bizId,
        user_id: user.id,
        user_name: p?.name || user.email.split('@')[0],
        user_avatar: p?.avatar_url || null,
        rating: stars,
        text: text.trim()
      });
      // Optionally update local stats or refresh page
      alert("Reseña publicada con éxito.");
      setShowForm(false);
      setText("");
      router.refresh(); // Refresh Next.js Server Components to get new reviews
    } catch (err) {
      alert("Error al publicar la reseña.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 mb-12">
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-gray-900">
            <Icon name="star_f" size={22} color="#0F172A" />
            <span className="text-base font-bold">Reseñas</span>
          </div>
          <div className="text-sm text-gray-500 pl-8">
            {initialReviews.length > 0 ? "Comparte tu experiencia" : "Sé el primero en dejar reseña"}
          </div>
        </div>
        <button 
          onClick={handleReviewClick}
          className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
        >
          <Icon name="edit" size={20} color="#0F172A" />
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm mb-6 animate-in fade-in slide-in-from-top-2">
          <div className="font-bold text-gray-900 mb-3 text-[15px]">Tu calificación</div>
          <div className="flex gap-2 mb-4">
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => setStars(n)} className="p-1 active:scale-90 transition-transform">
                <Icon name={n <= stars ? "star_f" : "star"} size={28} color={n <= stars ? "#F59E0B" : "#CBD5E1"} />
              </button>
            ))}
          </div>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="¿Qué te pareció este lugar?"
            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-[15px] outline-none focus:border-[#16a34a] focus:bg-white transition-colors min-h-[100px] resize-none mb-3"
          />
          <button 
            onClick={submitReview}
            disabled={loading}
            className="w-full bg-[#16a34a] text-white font-bold text-[15px] py-3.5 rounded-xl active:scale-[0.98] transition-transform disabled:opacity-70"
          >
            {loading ? "Publicando..." : "Publicar reseña"}
          </button>
        </div>
      )}
    </div>
  );
}
