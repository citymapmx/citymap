export const BIZ_TIERS = [
  { id: 'bronze', name: 'Bronce', minReviews: 10, minRating: 4.0, color: '#CD7F32', icon: '🥉', next: 'silver' },
  { id: 'silver', name: 'Plata', minReviews: 50, minRating: 4.5, color: '#C0C0C0', icon: '🥈', next: 'gold' },
  { id: 'gold', name: 'Oro', minReviews: 100, minRating: 4.7, color: '#FFD700', icon: '🥇', next: 'platinum' },
  { id: 'platinum', name: 'Platino', minReviews: 500, minRating: 4.8, color: '#E5E4E2', icon: '💎', next: null },
];

export function getBizTier(reviewsCount, rating) {
  let currentTier = null;
  for (const tier of BIZ_TIERS) {
    if (reviewsCount >= tier.minReviews && rating >= tier.minRating) {
      currentTier = tier;
    }
  }
  return currentTier;
}

export function getNextTier(reviewsCount, rating) {
  const current = getBizTier(reviewsCount, rating);
  if (!current) return BIZ_TIERS[0]; // Next is Bronze
  if (!current.next) return null; // Already maxed out
  return BIZ_TIERS.find(t => t.id === current.next);
}

export function calculateTierProgress(reviewsCount, rating) {
  const next = getNextTier(reviewsCount, rating);
  if (!next) return { progress: 100, missingReviews: 0, missingRating: 0 }; // Max tier

  const current = getBizTier(reviewsCount, rating);
  const baseReviews = current ? current.minReviews : 0;
  
  const reviewsProgress = Math.min(100, Math.max(0, ((reviewsCount - baseReviews) / (next.minReviews - baseReviews)) * 100));
  const missingReviews = Math.max(0, next.minReviews - reviewsCount);
  const missingRating = Math.max(0, next.minRating - rating);

  return {
    progress: Math.round(reviewsProgress),
    missingReviews,
    missingRating,
    nextTier: next
  };
}
