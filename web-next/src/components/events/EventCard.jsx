import Image from "next/image";
import Link from "next/link";

export default function EventCard({ ev, citySlug }) {
  const isToday = ev._isToday;
  const isTomorrow = ev._isTomorrow;

  // Formatting date logic
  let dayTxt = "";
  let moTxt = "";
  if (ev.date) {
    const d = new Date(ev.date + "T12:00:00");
    const m = d.toLocaleString('es-MX', { month: 'short' }).replace('.', '');
    dayTxt = d.getDate();
    moTxt = m;
    if (ev.end_date && ev.end_date !== ev.date) {
      const d2 = new Date(ev.end_date + "T12:00:00");
      dayTxt = `${d.getDate()}-${d2.getDate()}`;
      if (d.getMonth() !== d2.getMonth()) {
        const m2 = d2.toLocaleString('es-MX', { month: 'short' }).replace('.', '');
        moTxt = `${m}/${m2}`;
      }
    }
  }

  return (
    <Link href={`/evento/${ev.slug || ev.id}`} className="group relative block aspect-[3/4] rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all border border-gray-100 bg-gray-100">
      {ev.img_url ? (
        <Image src={ev.img_url} alt={ev.title || "Evento"} fill style={{ objectFit: 'cover' }} className="transition-transform group-hover:scale-105" />
      ) : (
        <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
          <span className="text-4xl">🎟️</span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

      {(isToday || isTomorrow) && (
        <div className={`absolute top-3 left-3 px-2 py-1 rounded-md border border-white/20 text-[10px] font-black tracking-wider text-white backdrop-blur-md ${isToday ? 'bg-red-500/80 animate-pulse' : 'bg-black/50'}`}>
          {isToday ? "🤩 ES HOY" : "⏳ MAÑANA"}
        </div>
      )}

      {ev.date && (
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-2.5 py-1.5 rounded-xl flex flex-col items-center shadow-md">
          <span className="text-gray-900 font-black text-lg leading-none">{dayTxt}</span>
          <span className="text-red-600 font-bold text-[9px] uppercase tracking-wider">{moTxt}</span>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-3 pt-6">
        <h3 className="text-white font-extrabold text-[15px] leading-tight mb-1 truncate">{ev.title}</h3>
        {ev.location_text && (
          <div className="flex items-center gap-1 opacity-80">
            <span className="text-[10px]">📍</span>
            <span className="text-white text-[11px] font-semibold truncate">{ev.location_text}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
