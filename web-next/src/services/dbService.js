import { sb, cloudDelete } from '../lib/supabase';

// ── Analytics ─────────────────────────────────────────────────────────────
export const trackAnalyticsEvent = async (bizId, type, citySlug) => {
  try {
    await sb.post("analytics", { biz_id: bizId, event_type: type, city_slug: citySlug });
  } catch (e) {
    console.warn("Analytics error:", e);
  }
};

// ── Notifications ─────────────────────────────────────────────────────────
export const getUnreadNotifications = async (userId, afterIsoString) => {
  return await sb.get(
    "notifications",
    `?user_id=eq.${userId}&read=eq.false&created_at=gt.${afterIsoString}&order=created_at.desc`
  );
};

// ── Reviews ───────────────────────────────────────────────────────────────
export const getBusinessReviews = async (bizId) => {
  return await sb.get("reviews", `?biz_id=eq.${bizId}&order=created_at.desc`);
};

export const getExperienceReviews = async (expId) => {
  return await sb.get("reviews", `?experience_id=eq.${expId}&order=created_at.desc`);
};

export const createReview = async (reviewData) => {
  return await sb.post("reviews", reviewData);
};

export const deleteReview = async (reviewId) => {
  return await sb.del("reviews", reviewId);
};

export const toggleLikeOnReview = async (reviewId, userId) => {
  return await sb.rpc("toggle_review_like", { r_id: reviewId, u_id: userId });
};

// ── Business ──────────────────────────────────────────────────────────────
export const getBusinessBySlugOrId = async (queryParam, isUUID = false) => {
  const query = isUUID ? `?id=eq.${queryParam}` : `?slug=eq.${queryParam}`;
  return await sb.get("businesses", `${query}&status=eq.approved`);
};

export const searchBusinessByName = async (name) => {
  return await sb.get("businesses", `?name=ilike.*${name}*&status=eq.approved`);
};

export const updateBusinessStats = async (bizId, updates) => {
  return await sb.patch("businesses", bizId, updates).catch(() => {});
};

export const fetchFullBusiness = async (bizId) => {
  return await sb.get("businesses", `?id=eq.${bizId}&select=*,reviews(*)`);
};

export const getBusinesses = async (query) => {
  return await sb.get("businesses", query);
};

// ── Experiences ───────────────────────────────────────────────────────────
export const updateExperienceStats = async (expId, updates) => {
  return await sb.patch("experiences", expId, updates).catch(() => {});
};

// ── Events ────────────────────────────────────────────────────────────────
export const getEventBySlugOrId = async (queryParam, isUUID = false) => {
  const query = isUUID ? `?id=eq.${queryParam}` : `?slug=eq.${queryParam}`;
  return await sb.get("events", query);
};

export const searchEventByTitle = async (title) => {
  return await sb.get("events", `?title=ilike.*${title}*&status=eq.approved`);
};

export const getEvents = async (query) => {
  return await sb.get("events", query);
};

// ── Users & Profiles ──────────────────────────────────────────────────────
export const getUserProfile = async (userId) => {
  const profs = await sb.get("profiles", `?id=eq.${userId}`).catch(() => []);
  return profs && profs.length > 0 ? profs[0] : null;
};

export const updateUserProfile = async (userId, updates) => {
  return await sb.patch("profiles", userId, updates).catch(() => {});
};

export const submitBusinessClaim = async (claimData) => {
  return await sb.post("business_claims", claimData);
};

// ── Owner Dashboard ───────────────────────────────────────────────────────
export const getOwnerReservations = async (bizId) => {
  return await sb.get("reservations", `?biz_id=eq.${bizId}&status=neq.deleted&order=date.asc`).catch(() => []);
};

export const getOwnerAnalytics = async (bizId) => {
  return await sb.get("analytics", `?biz_id=eq.${bizId}`).catch(() => []);
};

// ── Raffles ───────────────────────────────────────────────────────────────
export const joinRaffle = async (raffleId, userId) => {
  return await sb.post("raffle_participants", { raffle_id: raffleId, user_id: userId });
};

// ── Itinerarios (Trip Planner) ────────────────────────────────────────────
export const getUserItineraries = async (userId) => {
  return await sb.get("user_itineraries", `?user_id=eq.${userId}&order=created_at.desc`).catch(() => []);
};

export const getPublicItineraries = async () => {
  const plans = await sb.get("user_itineraries", `?is_private=eq.false&order=created_at.desc`).catch(() => []);
  if (!plans || plans.length === 0) return [];
  
  const userIds = [...new Set(plans.map(p => p.user_id).filter(Boolean))];
  if (userIds.length > 0) {
    const profs = await sb.get("profiles", `?id=in.(${userIds.join(",")})`).catch(() => []);
    if (profs && profs.length > 0) {
      return plans.map(p => {
        const prof = profs.find(pr => pr.id === p.user_id);
        return { ...p, author_name: prof?.name || null };
      });
    }
  }
  return plans;
};

export const getItineraryByToken = async (token) => {
  const data = await sb.get("user_itineraries", `?share_token=eq.${token}`).catch(() => []);
  return data && data.length > 0 ? data[0] : null;
};

export const getItineraryItems = async (itineraryId) => {
  return await sb.get("itinerary_items", `?itinerary_id=eq.${itineraryId}&order=sort_order.asc`).catch(() => []);
};

export const createItinerary = async (data) => {
  return await sb.post("user_itineraries", data);
};

export const addItineraryItem = async (data) => {
  return await sb.post("itinerary_items", data);
};

export const deleteItineraryItem = async (itemId) => {
  return await sb.del("itinerary_items", itemId);
};

export const updateItineraryItemOrder = async (itemId, newOrder) => {
  return await sb.patch("itinerary_items", itemId, { sort_order: newOrder });
};

export const deleteItinerary = async (itineraryId) => {
  try {
    const data = await sb.get("user_itineraries", `?id=eq.${itineraryId}`).catch(() => []);
    if (data && data.length > 0) {
      const itin = data[0];
      if (itin.cover_image) {
        await cloudDelete(itin.cover_image).catch(err => {
          console.warn("Could not delete itinerary cover image:", err);
        });
      }
    }
  } catch (e) {
    console.warn("Error fetching itinerary cover image for deletion:", e);
  }
  return await sb.del("user_itineraries", itineraryId);
};

export const updateItinerary = async (itineraryId, data) => {
  return await sb.patch("user_itineraries", itineraryId, data);
};

export const updateItineraryItemTime = async (itemId, minutes) => {
  return await sb.patch("itinerary_items", itemId, { estimated_minutes: minutes });
};

export const updateItineraryItemNote = async (itemId, note) => {
  return await sb.patch("itinerary_items", itemId, { notes: note });
};

export const updateItineraryItem = async (itemId, data) => {
  return await sb.patch("itinerary_items", itemId, data);
};

export const updateItineraryItemDay = async (itemId, dayNumber) => {
  return await sb.patch("itinerary_items", itemId, { day_number: dayNumber });
};

