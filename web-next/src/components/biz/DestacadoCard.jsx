import Link from "next/link";
import Image from "next/image";

export default function DestacadoCard({ biz, citySlug }) {
  const imgSrc = biz.banner_url || biz.photos?.[0] || biz.logo_url;
  const isPremium = biz.plan === "premium" || biz.plan === "pro";
  const catEmoji = biz.emoji || "📍";

  return (
    <Link href={`/${citySlug}/${biz.slug || biz.id}`} className="block relative bg-[#1E293B] rounded-3xl overflow-hidden shadow-lg mb-4 aspect-[4/3] max-h-[300px]">
      {imgSrc ? (
        <Image src={imgSrc} alt={biz.name} fill style={{ objectFit: 'cover' }} className="opacity-80 transition-opacity hover:opacity-100" />
      ) : (
        <div className="absolute inset-0 bg-gray-800 flex items-center justify-center text-5xl">{catEmoji}</div>
      )}
      
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

      {/* Premium Badge / Logo */}
      {biz.logo_url && isPremium && (
        <div className="absolute top-4 left-4 w-14 h-14 rounded-full bg-white/20 backdrop-blur-md border border-white/30 overflow-hidden shadow-lg p-[2px]">
           <Image src={biz.logo_url} alt="Logo" width={56} height={56} className="w-full h-full rounded-full object-cover" />
        </div>
      )}

      {/* Text Info */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pt-12">
        {biz.badge && <div className="text-[10px] font-black text-yellow-400 uppercase tracking-wider mb-1">{biz.badge}</div>}
        <h3 className="text-white font-extrabold text-xl leading-tight mb-1 flex items-center gap-2">
          <span className="truncate">{biz.name}</span>
          {isPremium && (
            <svg viewBox="0 0 24 24" fill="#3B82F6" className="w-5 h-5 shrink-0"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
          )}
        </h3>
        
        <div className="flex items-center gap-3">
          {biz.rating > 0 ? (
            <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full">
              <span className="text-yellow-400 text-xs">★</span>
              <span className="text-white font-bold text-xs">{Number(biz.rating).toFixed(1)}</span>
            </div>
          ) : null}
          <span className="text-white/70 text-xs font-semibold capitalize">{biz.category}</span>
        </div>
      </div>
    </Link>
  );
}
