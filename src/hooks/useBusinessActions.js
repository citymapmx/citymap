import { useState } from 'react';
import { cloudUpload, sb } from '../lib/supabase.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { useUIStore } from '../store/useUIStore.js';
import { useDataStore } from '../store/useDataStore.js';

export function useBusinessActions() {
  const { user, profile, setShowAuth } = useAuthStore();
  const { toast$, setSelected } = useUIStore();
  const { setMapPins, reviews, setReviews } = useDataStore();
  const [reviewText, setReviewText] = useState("");
  const [reviewStar, setReviewStar] = useState(5);
  const [showReview, setShowReview] = useState(false);
  const [reviewImgFile, setReviewImgFile] = useState(null);
  const [reviewImgLoading, setReviewImgLoading] = useState(false);
  
  const [showBooking, setShowBooking] = useState(false);
  const [bookingForm, setBookingForm] = useState({ service: "", date: "", time: "", name: "", notes: "" });
  const [bookingLoading, setBookingLoading] = useState(false);

  const submitBooking = async (selected) => {
    if (!selected) return;
    if (!bookingForm.service || !bookingForm.date || !bookingForm.time || !bookingForm.name.trim()) return;
    setBookingLoading(true);
    try {
      await sb.post("reservations", { biz_id: selected.id, date: bookingForm.date, time: bookingForm.time, client_name: bookingForm.name.trim(), service: bookingForm.service, notes: bookingForm.notes?.trim() || "", status: "pending" });
      if (selected.owner_id) {
        await sb.notify(selected.owner_id, "Nueva solicitud de reservación", `${bookingForm.name.trim()} ha solicitado una reserva para el ${bookingForm.date}.`, "booking");
      }
      setShowBooking(false);
      setBookingForm({ service: "", date: "", time: "", name: "", notes: "" });
      toast$("Reserva enviada");
      const w = (selected.whatsapp || selected.phone || "").replace(/\\D/g, "");
      if (w) {
        const msg = `Nueva reserva en ${selected.name}: ${bookingForm.name.trim()} - ${bookingForm.service} - ${bookingForm.date} a las ${bookingForm.time}${bookingForm.notes?.trim() ? `\\nNotas: ${bookingForm.notes.trim()}` : ''}`;
        window.open(`https://wa.me/${w}?text=${encodeURIComponent(msg)}`, "_blank");
      }
    } catch { 
      toast$("Error al reservar"); 
    } finally { 
      setBookingLoading(false); 
    }
  };

  const postReview = async (bizId) => {
    if (!user) {
      toast$("Inicia sesión para opinar");
      setShowAuth(true);
      return;
    }
    try {
      setReviewImgLoading(true);
      let img_url = null;
      if (reviewImgFile) {
        img_url = await cloudUpload(reviewImgFile, () => {}, "cityguide/reviews");
      }
      
      const cols = ["#7C3AED", "#DB2777", "#2563EB", "#059669", "#D97706"];
      const uName = user.user_metadata?.name || profile?.name || user.email.split("@")[0];
      await sb.post("reviews", { 
        biz_id: bizId, 
        user_id: user.id, 
        user_name: uName, 
        user_init: uName.slice(0, 2).toUpperCase(), 
        user_color: cols[Math.floor(Math.random() * cols.length)], 
        stars: reviewStar, 
        text: reviewText.trim(),
        img_url
      });
      const all = await sb.get("reviews", `?biz_id=eq.${bizId}`).catch(() => []);
      const count = Array.isArray(all) ? all.length : 0;
      const avg = count > 0 ? Math.round((all.reduce((s, r) => s + (r.stars || 0), 0) / count) * 10) / 10 : 0;
      await sb.patch("businesses", bizId, { rating: avg, review_count: count }).catch(() => {});
      setMapPins(prev => prev.map(b => b.id === bizId ? { ...b, rating: avg, review_count: count } : b));
      setSelected(prev => prev?.id === bizId ? { ...prev, rating: avg, review_count: count } : prev);
      const r = await sb.get("reviews", `?biz_id=eq.${bizId}&order=created_at.desc`);
      setReviews(r);
      setReviewText("");
      setReviewImgFile(null);
      setShowReview(false);
      toast$("Reseña publicada");
    } catch(err) {
      toast$("Error: " + err.message);
    } finally {
      setReviewImgLoading(false);
    }
  };

  const toggleLikeReview = async (r) => {
    if (!user) {
      toast$("Inicia sesión para votar");
      setShowAuth(true);
      return;
    }
    const likes = r.liked_by || [];
    const hasLiked = likes.includes(user.id);
    const newLikes = hasLiked ? likes.filter(id => id !== user.id) : [...likes, user.id];
    
    setReviews(reviews.map(x => x.id === r.id ? { ...x, liked_by: newLikes } : x));
    try {
      await sb.rpc("toggle_review_like", { r_id: r.id, u_id: user.id });
    } catch {
      setReviews(reviews.map(x => x.id === r.id ? { ...x, liked_by: likes } : x));
      toast$("Error al votar. Faltan permisos en la base de datos.");
    }
  };

  const doClaim = async (id, formData) => { 
    if (!user) return; 
    try {
      await sb.post("business_claims", { 
        business_id: id, 
        user_id: user.id, 
        email: user.email, 
        phone: formData?.phone || "", 
        role: formData?.role || "Dueño",
        status: "pending"
      });
      toast$("Solicitud enviada — la revisaremos pronto"); 
    } catch (e) {
      toast$("Error al enviar solicitud: " + e.message);
    }
  };

  return {
    reviewText, setReviewText,
    reviewStar, setReviewStar,
    showReview, setShowReview,
    reviewImgFile, setReviewImgFile,
    reviewImgLoading, setReviewImgLoading,
    showBooking, setShowBooking,
    bookingForm, setBookingForm,
    bookingLoading, setBookingLoading,
    submitBooking,
    postReview,
    toggleLikeReview,
    doClaim
  };
}
