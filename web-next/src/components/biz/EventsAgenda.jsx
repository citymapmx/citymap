'use client';
import React from 'react';
import Image from 'next/image';

export default function EventsAgenda({ events, citySlug }) {
  if (!events || events.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-[17px] font-extrabold text-gray-900">Agenda</h3>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }}>
        {events.map((ev, i) => (
          <a key={i} href={`/evento/${ev.slug || ev.id}`} className="shrink-0 snap-start flex flex-col gap-2">
            <div className="relative w-[140px] h-[210px] rounded-xl overflow-hidden bg-gray-100 shadow-sm border border-gray-100">
              <Image 
                src={ev.img_url || ev.img} 
                alt={ev.title} 
                fill 
                className="object-cover" 
                unoptimized={(ev.img_url || ev.img)?.includes('data:image')} 
              />
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
