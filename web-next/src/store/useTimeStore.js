import { create } from 'zustand';

const useTimeStore = create((set) => {
  // Inicializamos el reloj global
  let interval;
  
  if (typeof window !== 'undefined') {
    interval = setInterval(() => {
      set({ now: new Date() });
    }, 60000); // Actualiza cada minuto
  }

  return {
    now: new Date(),
    _interval: interval,
  };
});

export default useTimeStore;
