import { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import Icon from '../ui/Icon.jsx';

const SLIDES = [
  {
    id: 1,
    title: "Tu ciudad está llena de",
    highlight: "cosas por descubrir.",
    desc: "Restaurantes, negocios, productos y servicios que quizá todavía no conoces.",
    img: "/onboarding_1.jpg"
  },
  {
    id: 2,
    title: "Encuentra algo que vaya",
    highlight: "contigo.",
    desc: "Eventos, experiencias, lugares y actividades para cada momento.",
    img: "/onboarding_2.jpg"
  }
];

export default function OnboardingModal({ onComplete, T }) {
  const [step, setStep] = useState(0);

  const nextStep = () => {
    if (step < SLIDES.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const skip = () => {
    onComplete();
  };

  const currentSlide = SLIDES[step];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999999, background: T.bg,
      display: 'flex', flexDirection: 'column'
    }}>
      <AnimatePresence mode="wait">
        <m.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 20, paddingBottom: 100 }}
        >
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 20 }}>
            <img src="/citymap.mx.png" alt="CityMap" style={{ height: 40, filter: T.dark ? 'none' : 'brightness(0)' }} />
          </div>

          {/* Texts */}
          <div style={{ textAlign: 'center', padding: '0 32px', marginBottom: 24 }}>
            <h1 style={{ fontSize: 32, fontWeight: 900, color: T.text, lineHeight: 1.1, margin: '0 0 16px 0', letterSpacing: '-1px' }}>
              {currentSlide.title}{' '}
              <span style={{ 
                background: 'linear-gradient(90deg, #3B82F6, #06B6D4)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                {currentSlide.highlight}
              </span>
            </h1>
            <p style={{ fontSize: 16, color: T.sub, lineHeight: 1.5, margin: 0 }}>
              {currentSlide.desc}
            </p>
          </div>

          {/* 3D Image */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '0 20px' }}>
            <m.img 
              initial={{ y: 10 }}
              animate={{ y: [10, -10, 10] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              src={currentSlide.img} 
              style={{ 
                width: '100%', 
                maxWidth: 320, 
                objectFit: 'contain', 
                borderRadius: 24,
                boxShadow: '0 20px 40px rgba(0,0,0,0.1)' 
              }} 
            />
          </div>
        </m.div>
      </AnimatePresence>

      {/* Bottom Controls */}
      <div style={{ 
        position: 'absolute', bottom: 0, left: 0, right: 0, 
        padding: '24px 32px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: `linear-gradient(to top, ${T.bg} 80%, transparent)`
      }}>
        <button onClick={skip} style={{ background: 'none', border: 'none', fontSize: 14, fontWeight: 500, color: T.sub, cursor: 'pointer', padding: '10px 0', opacity: 0.7 }}>
          Omitir
        </button>

        {/* Dots */}
        <div style={{ display: 'flex', gap: 8 }}>
          {SLIDES.map((_, i) => (
            <div key={i} style={{ 
              width: step === i ? 20 : 8, height: 8, borderRadius: 4, 
              background: step === i ? '#60A5FA' : T.border,
              transition: 'all 0.3s ease'
            }} />
          ))}
        </div>

        {/* Next Button */}
        <button 
          onClick={nextStep}
          style={{ 
            height: 48, borderRadius: 24, padding: step === 2 ? '0 24px' : '0',
            width: step === 2 ? 'auto' : 48,
            background: step === 2 ? 'linear-gradient(90deg, #60A5FA, #8B5CF6)' : '#60A5FA', 
            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            boxShadow: '0 8px 16px rgba(96, 165, 250, 0.4)',
            transition: 'all 0.3s ease',
            color: '#fff'
          }}
        >
          {step === 2 ? (
            <span style={{ fontSize: 15, fontWeight: 700 }}>Comenzar</span>
          ) : (
            <Icon name="arrow_right" size={24} color="#FFF" />
          )}
        </button>
      </div>
    </div>
  );
}
