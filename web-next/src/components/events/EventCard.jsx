import Image from "next/image";
import Link from "next/link";

export default function EventCard({ ev, citySlug }) {
  return (
    <Link href={`/evento/${ev.slug || ev.id}`} className="group relative block aspect-[2/3] rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all border border-gray-100 bg-gray-100">
      {ev.img_url ? (
        <Image src={ev.img_url} alt={ev.title || "Evento"} fill style={{ objectFit: 'cover' }} className="transition-transform group-hover:scale-[1.02]" unoptimized={ev.img_url.includes('data:image')} />
      ) : (
        <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
          <span className="text-4xl">🎟️</span>
        </div>
      )}
    </Link>
  );
}
