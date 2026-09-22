import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

const VIBES = [
  { id: 'romantico', label: '💑 Romántico', emoji: '💑' },
  { id: 'amigos', label: '🎉 Con amigos', emoji: '🎉' },
  { id: 'familia', label: '👨‍👩‍👧 Familia', emoji: '👨‍👩‍👧' },
  { id: 'casual', label: '😎 Sin drama', emoji: '😎' },
  { id: 'fiesta', label: '🪩 Que haya antro', emoji: '🪩' },
  { id: 'chill', label: '🍻 Chelas y plática', emoji: '🍻' },
];

const BUDGETS = [
  { id: 'economico', label: '💚 Económico', sub: 'hasta $150 c/u' },
  { id: 'moderado', label: '💛 Moderado', sub: '$150–$400 c/u' },
  { id: 'generoso', label: '🧡 A todo dar', sub: '+$400 c/u' },
];

export default function AiNightPlanner({ open, onClose, businesses, city, isOpen, dark, T, handleCardTap }) {
  const [step, setStep] = useState(0); // 0=vibe 1=budget 2=group 3=loading 4=result
  const [vibe, setVibe] = useState(null);
  const [budget, setBudget] = useState(null);
  const [group, setGroup] = useState('2');
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState(null);

  const dBg = dark ? '#0F172A' : '#fff';
  const dText = dark ? '#F8FAFC' : '#0F172A';
  const dSub = dark ? '#94A3B8' : '#64748B';
  const dCard = dark ? '#1E293B' : '#F8FAFC';
  const dBorder = dark ? 'rgba(255,255,255,0.08)' : '#E2E8F0';

  const reset = () => { setStep(0); setVibe(null); setBudget(null); setGroup('2'); setPlan(null); setError(null); };
  const handleClose = () => { reset(); onClose(); };

  const generate = async () => {
    setStep(3);
    setError(null);
    try {
      const now = new Date();
      const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
      const openBiz = businesses.filter(b => isOpen(b));
      const allBiz = [...openBiz, ...businesses.filter(b => !isOpen(b))].slice(0, 40);

      const apiUrl = '/api/ai-night';
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city, time: timeStr, group: `${group} personas`, budget, vibe, businesses: allBiz.map(b => ({ name: b.name, category: b.category, isOpen: isOpen(b) })) })
      });
      if (!res.ok) throw new Error('Error del servidor');
      const data = await res.json();
      if (!data.plan) throw new Error('Sin respuesta');
      setPlan(data.plan);
      setStep(4);
    } catch (e) {
      setError('No pudimos generar el plan. Intenta de nuevo.');
      setStep(2);
    }
  };

  const findBiz = (name) => businesses.find(b => b.name?.toLowerCase().trim() === name?.toLowerCase().trim());

  if (!open) return null;

  return ReactDOM.createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      {/* Backdrop */}
      <div onClick={handleClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />

      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        style={{ position: 'relative', width: '100%', maxWidth: 480, background: dBg, borderRadius: '24px 24px 0 0', padding: '0 0 40px', maxHeight: '90dvh', overflowY: 'auto', zIndex: 1 }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 0' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: dBorder }} />
        </div>

        <AnimatePresence mode="wait">

          {/* STEP 0 — Vibe */}
          {step === 0 && (
            <motion.div key="step0" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} style={{ padding: '20px 20px 0' }}>
              <div style={{ fontSize: 28, textAlign: 'center', marginBottom: 4 }}>✨</div>
              <h2 style={{ textAlign: 'center', fontSize: 22, fontWeight: 900, color: dText, margin: '0 0 4px' }}>Planea tu noche</h2>
              <p style={{ textAlign: 'center', fontSize: 14, color: dSub, margin: '0 0 24px' }}>¿Qué ambiente buscan hoy?</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {VIBES.map(v => (
                  <button key={v.id} onClick={() => { setVibe(v.id); setStep(1); }}
                    style={{ padding: '14px 10px', border: `2px solid ${dBorder}`, borderRadius: 16, background: dCard, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', transition: 'all 0.2s' }}>
                    <div style={{ fontSize: 24, marginBottom: 4 }}>{v.emoji}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: dText }}>{v.label.split(' ').slice(1).join(' ')}</div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP 1 — Budget */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} style={{ padding: '20px 20px 0' }}>
              <button onClick={() => setStep(0)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: dSub, fontSize: 14, fontWeight: 600, padding: 0, marginBottom: 16 }}>← Volver</button>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: dText, margin: '0 0 4px' }}>¿Cuánto quieren gastar?</h2>
              <p style={{ fontSize: 14, color: dSub, margin: '0 0 24px' }}>Por persona, aproximadamente</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {BUDGETS.map(b => (
                  <button key={b.id} onClick={() => { setBudget(b.id); setStep(2); }}
                    style={{ padding: '16px', border: `2px solid ${dBorder}`, borderRadius: 16, background: dCard, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: dText }}>{b.label}</span>
                    <span style={{ fontSize: 12, color: dSub, fontWeight: 600 }}>{b.sub}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP 2 — Group size */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} style={{ padding: '20px 20px 0' }}>
              <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: dSub, fontSize: 14, fontWeight: 600, padding: 0, marginBottom: 16 }}>← Volver</button>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: dText, margin: '0 0 4px' }}>¿Cuántos son?</h2>
              <p style={{ fontSize: 14, color: dSub, margin: '0 0 28px' }}>Número de personas</p>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 24, marginBottom: 32 }}>
                <button onClick={() => setGroup(g => String(Math.max(1, Number(g) - 1)))} style={{ width: 44, height: 44, borderRadius: '50%', border: `2px solid ${dBorder}`, background: dCard, fontSize: 22, cursor: 'pointer', color: dText, fontFamily: 'inherit' }}>−</button>
                <span style={{ fontSize: 48, fontWeight: 900, color: dText, minWidth: 60, textAlign: 'center' }}>{group}</span>
                <button onClick={() => setGroup(g => String(Math.min(20, Number(g) + 1)))} style={{ width: 44, height: 44, borderRadius: '50%', border: `2px solid ${dBorder}`, background: dCard, fontSize: 22, cursor: 'pointer', color: dText, fontFamily: 'inherit' }}>+</button>
              </div>
              {error && <p style={{ color: '#EF4444', fontSize: 13, textAlign: 'center', marginBottom: 12 }}>{error}</p>}
              <button onClick={generate}
                style={{ width: '100%', padding: 16, background: 'linear-gradient(135deg, #7C3AED, #EC4899)', border: 'none', borderRadius: 16, color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 24px rgba(124,58,237,0.35)' }}>
                ✨ Generar mi plan
              </button>
            </motion.div>
          )}

          {/* STEP 3 — Loading */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                style={{ width: 56, height: 56, borderRadius: '50%', border: '4px solid transparent', borderTopColor: '#7C3AED', borderRightColor: '#EC4899' }} />
              <h3 style={{ fontSize: 18, fontWeight: 800, color: dText, textAlign: 'center', margin: 0 }}>Consultando con el experto local...</h3>
              <p style={{ fontSize: 14, color: dSub, textAlign: 'center', margin: 0 }}>Analizando los mejores spots de {city} para ti 🔍</p>
            </motion.div>
          )}

          {/* STEP 4 — Result */}
          {step === 4 && plan && (
            <motion.div key="step4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ padding: '20px 20px 0' }}>
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>{plan.emoji || '🌙'}</div>
                <h2 style={{ fontSize: 20, fontWeight: 900, color: dText, margin: '0 0 6px' }}>{plan.titulo}</h2>
                <p style={{ fontSize: 13, color: dSub, margin: 0 }}>{plan.paradas?.length} paradas · {city}</p>
              </div>

              {/* Stops */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                {plan.paradas?.map((parada, i) => {
                  const biz = findBiz(parada.nombre);
                  return (
                    <div key={i} onClick={() => biz && (handleCardTap(biz), handleClose())}
                      style={{ border: `1px solid ${dBorder}`, borderRadius: 16, padding: 14, background: dCard, cursor: biz ? 'pointer' : 'default', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #7C3AED, #EC4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 14, flexShrink: 0 }}>{i + 1}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <div style={{ fontSize: 15, fontWeight: 800, color: dText, lineHeight: 1.2 }}>{parada.nombre}</div>
                          {biz && <div style={{ fontSize: 10, fontWeight: 700, color: '#7C3AED', background: 'rgba(124,58,237,0.1)', borderRadius: 6, padding: '2px 6px', flexShrink: 0 }}>Ver →</div>}
                        </div>
                        <div style={{ fontSize: 11, color: '#7C3AED', fontWeight: 700, marginTop: 2, marginBottom: 6 }}>{parada.tipo}</div>
                        <div style={{ fontSize: 13, color: dSub, lineHeight: 1.4 }}>{parada.descripcion}</div>
                        {parada.tip && <div style={{ fontSize: 12, color: T.green, fontWeight: 600, marginTop: 6 }}>💡 {parada.tip}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary */}
              {plan.resumen && (
                <div style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(236,72,153,0.1))', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 14, padding: '12px 16px', marginBottom: 16, textAlign: 'center' }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: dText, margin: 0 }}>🥂 {plan.resumen}</p>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={reset} style={{ flex: 1, padding: 14, background: dCard, border: `1.5px solid ${dBorder}`, borderRadius: 14, fontWeight: 700, fontSize: 14, color: dText, cursor: 'pointer', fontFamily: 'inherit' }}>
                  🔄 Nuevo plan
                </button>
                <button onClick={handleClose} style={{ flex: 1, padding: 14, background: 'linear-gradient(135deg, #7C3AED, #EC4899)', border: 'none', borderRadius: 14, fontWeight: 700, fontSize: 14, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
                  ¡Vamos! 🚀
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>,
    document.body
  );
}
