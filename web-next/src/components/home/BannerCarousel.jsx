import Image from "next/image";

export default function BannerCarousel({ banners }) {
  if (!banners || banners.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex overflow-x-auto pb-4 gap-4 snap-x snap-mandatory" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
        {banners.map((b) => (
          <div key={b.id} className="snap-center shrink-0 w-[85vw] max-w-[400px] h-[160px] relative rounded-2xl overflow-hidden shadow-sm">
            <Image 
              src={b.image_url} 
              alt={b.title || 'Banner'} 
              fill 
              style={{ objectFit: 'cover' }}
              className="bg-gray-100"
            />
            {b.title && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4">
                <h3 className="text-white font-extrabold text-lg leading-tight">{b.title}</h3>
                {b.subtitle && <p className="text-white/80 text-sm font-semibold">{b.subtitle}</p>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
