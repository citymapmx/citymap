'use client';
import { useState } from 'react';
import Image from 'next/image';
import CategoryGrid from './CategoryGrid';
import BannerCarousel from './BannerCarousel';
import DestacadoCard from '../biz/DestacadoCard';
import SearchBar from './SearchBar';

export default function HomeClient({ city, citySlug, data }) {
  const { categories, banners, businesses, events } = data;
  const topBiz = businesses.filter(b => b.plan === 'premium' || b.plan === 'destacado');
  const normalBiz = businesses.filter(b => b.plan !== 'premium' && b.plan !== 'destacado');

  return (
    <div className="pb-24">
      {/* Hero */}
      <div className="relative w-full h-[280px] bg-[#1A7A5E] overflow-hidden rounded-b-3xl shadow-md mb-6">
        {city.bg_image && (
          <Image src={city.bg_image} alt={city.name} fill style={{ objectFit: 'cover', opacity: 0.6 }} priority />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/80" />
        <div className="relative z-10 px-5 pt-10 h-full flex flex-col justify-end pb-8">
          <div className="mb-4 text-center">
            <h1 className="text-4xl font-black text-white tracking-tight leading-tight drop-shadow-md">
              {city.name}
            </h1>
            <p className="text-white/90 font-semibold text-sm mt-1 drop-shadow-md">
              Explora {businesses.length}+ lugares increíbles
            </p>
          </div>
          <div className="w-full max-w-md mx-auto">
            <SearchBar citySlug={citySlug} placeholders={[`Buscar en ${city.name}...`, "Restaurantes, cafés...", "Buscar por nombre..."]} />
          </div>
        </div>
      </div>

      <div className="px-5">
        <CategoryGrid categories={categories} citySlug={citySlug} />
        
        <BannerCarousel banners={banners} />

        {topBiz.length > 0 && (
          <div className="mb-8">
            <h2 className="text-[20px] font-black text-gray-900 mb-4">Imperdibles en {city.name}</h2>
            <div className="flex flex-col">
              {topBiz.map(b => (
                <DestacadoCard key={b.id} biz={b} citySlug={citySlug} />
              ))}
            </div>
          </div>
        )}

        {normalBiz.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[18px] font-extrabold text-gray-900">Más lugares increíbles</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {normalBiz.map(b => (
                <a key={b.id} href={`/${citySlug}/${b.slug || b.id}`} className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex flex-col gap-2 hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl shrink-0 overflow-hidden relative">
                    {b.logo_url ? <Image src={b.logo_url} alt="Logo" fill style={{objectFit: 'cover'}} /> : (b.emoji || "🏪")}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-[13px] leading-tight truncate">{b.name}</div>
                    <div className="text-gray-400 text-[10px] font-bold uppercase mt-1 truncate">{b.category}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
