import Link from "next/link";

export default function CategoryGrid({ categories, citySlug }) {
  if (!categories || categories.length === 0) return null;
  
  return (
    <div className="mb-8">
      <h2 className="text-[18px] font-extrabold mb-4 text-[#111]">Explorar por categoría</h2>
      <div className="flex overflow-x-auto pb-4 gap-4 snap-x snap-mandatory" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
        {categories.map((c) => (
          <Link key={c.id} href={`/${citySlug}/${c.id}`} className="snap-start shrink-0 flex flex-col items-center gap-2 group w-[72px]">
            <div className="w-16 h-16 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-3xl shadow-sm group-hover:shadow-md group-hover:border-green-600 transition-all">
              {c.emoji || "🏪"}
            </div>
            <span className="text-[11px] font-bold text-gray-600 text-center leading-tight">
              {c.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
