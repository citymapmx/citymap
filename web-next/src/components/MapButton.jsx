"use client";

import Icon from "./ui/Icon";

export default function MapButton({ lat, lng }) {
  const handleClick = () => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank");
  };

  return (
    <button 
      onClick={handleClick}
      className="w-full mb-8 py-3.5 rounded-[20px] bg-white border border-gray-200 flex items-center justify-center gap-2 font-bold text-[15px] shadow-sm hover:bg-gray-50 transition-colors"
    >
      <Icon name="map_svg" size={18} color="#000" /> Mapa
    </button>
  );
}
