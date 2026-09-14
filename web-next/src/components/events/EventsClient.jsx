'use client';
import { useState } from 'react';
import EventCard from './EventCard';

const EVENT_CATS = ["Todos", "Música en vivo", "DJ", "Karaoke", "Fiesta", "Deportes", "Comedia", "Networking", "Promoción especial", "Otro"];

export default function EventsClient({ city, citySlug, events }) {
  const [activeCat, setActiveCat] = useState("Todos");

  const filteredEvents = activeCat === "Todos" 
    ? events 
    : events.filter(e => e.category === activeCat);

  return (
    <div className="pb-24 font-sans bg-[#f8fafc] min-h-screen">
      <div className="bg-white border-b border-gray-200 pt-[calc(env(safe-area-inset-top,0px)+10px)] pb-4 px-5 sticky top-0 z-20">
        <h1 className="text-3xl font-black text-center mb-1 bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-sky-400 to-indigo-400">
          Eventos en {city.name}
        </h1>
        <p className="text-gray-500 font-semibold text-xs text-center">
          Descubre qué hacer hoy
        </p>

        {/* Categories / Filters */}
        <div className="flex overflow-x-auto gap-2 mt-4 pb-2" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
          {EVENT_CATS.map(cat => (
            <button 
              key={cat}
              onClick={() => setActiveCat(cat)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                activeCat === cat 
                  ? 'bg-gray-900 border-gray-900 text-white' 
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pt-6">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12 opacity-50">
            <span className="text-4xl block mb-2">📅</span>
            <p className="font-bold text-gray-600">No hay eventos para esta categoría.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredEvents.map(ev => (
              <EventCard key={ev.id} ev={ev} citySlug={citySlug} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
