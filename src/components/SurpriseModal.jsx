import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { getThumbUrl, isOpenNow } from '../lib/utils';

// ── MOODS ──────────────────────────────────────────────────────────────────────
const MOODS = [
  { id: 'comer',     emoji: '🍽️', label: 'Comer algo rico',  cats: ['restaurante', 'marisco', 'taco', 'pizza', 'sushi', 'hamburguesa', 'alitas', 'comida', 'cenaduria'] },
  { id: 'cafe',      emoji: '☕', label: 'Un café',           cats: ['cafeteria', 'cafe', 'postre', 'helado', 'churro', 'crepa'] },
  { id: 'tomar',     emoji: '🍺', label: 'Tomar algo',        cats: ['bar', 'antro', 'cantina', 'coctel', 'cerveza', 'cerveceria', 'michelada'] },
  { id: 'noche',     emoji: '🪩', label: 'Planes nocturnos',  cats: ['antro', 'bar', 'botanero', 'club', 'disco', 'karaoke'] },
  { id: 'relax',     emoji: '💆', label: 'Relajarme',         cats: ['spa', 'salud', 'bienestar', 'belleza', 'masaje', 'yoga', 'facial'] },
  { id: 'compras',   emoji: '🛍️', label: 'Comprar algo',      cats: ['compras', 'tienda', 'boutique', 'plaza', 'comercial', 'ropa', 'moda', 'zapateria', 'mall', 'departamental'] },
  { id: 'eventos',   emoji: '🎫', label: 'Eventos locales',   cats: ['evento'] }, // Se maneja especial en la lógica
  { id: 'sorpresa',  emoji: '🎲', label: 'Lo que sea',        cats: [] },
];

const VIBES = [
  { id: 'romantico', emoji: '💑', label: 'Romántico', cats: ['restaurante', 'bar', 'cafe', 'postre', 'cena'] },
  { id: 'amigos',    emoji: '🎉', label: 'Con amigos', cats: ['bar', 'antro', 'botanero', 'taco', 'marisco', 'cerveza', 'alitas'] },
  { id: 'familia',   emoji: '👨‍👩‍👧', label: 'Familia', cats: ['restaurante', 'postre', 'helado', 'compras', 'cafeteria', 'comida', 'parque'] },
  { id: 'casual',    emoji: '😎', label: 'Sin drama', cats: ['cafe', 'cafeteria', 'taco', 'marisco', 'pizza', 'hamburguesa', 'churro'] },
];

// ── COMPONENT ──────────────────────────────────────────────────────────────────
export default function SurpriseModal({ open, onClose, mapPins, events = [], activeCity, userCoords, isNear, dark, T, handleCardTap, handleEventTap, city }) {
  const [step, setStep] = useState('mood');   // mood | spin | result | ai_vibe | ai_loading | ai_result
  const [selectedMood, setSelectedMood] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [pick, setPick] = useState(null);
  const [aiVibe, setAiVibe] = useState(null);
  const [aiResults, setAiResults] = useState([]);
  const [aiError, setAiError] = useState(null);
  const seenRef = useRef(new Set());

  const dBg    = dark ? '#0F172A' : '#FFFFFF';
  const dText  = dark ? '#F8FAFC' : '#0F172A';
  const dSub   = dark ? '#94A3B8' : '#64748B';
  const dCard  = dark ? '#1E293B' : '#F8FAFC';
  const dBorder= dark ? 'rgba(255,255,255,0.08)' : '#E2E8F0';

  const reset = () => {
    setStep('mood'); setSelectedMood(null); setSpinning(false);
    setPick(null); setAiVibe(null); setAiResults([]); setAiError(null);
    seenRef.current.clear();
  };
  const handleClose = () => { reset(); onClose(); };

  // ── Pick a random business ─────────────────────────────────────────────────
  const normalize = (str) => (str || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const pickBusiness = (mood) => {
    if (mood.id === 'eventos') {
      const now = new Date();
      let pool = events.filter(ev => {
        if (ev.status !== 'approved' || !isNear(ev, userCoords, activeCity)) return false;
        if (ev.date) {
          const endStr = ev.end_date || ev.date;
          const dt = ev.time ? new Date(`${endStr}T${ev.time}:00`) : new Date(`${endStr}T23:59:00`);
          if (now - dt > 86400000) return false;
        }
        return true;
      });
      let unseen = pool.filter(e => !seenRef.current.has(e.id));
      if (unseen.length === 0) { seenRef.current.clear(); unseen = pool; }
      if (unseen.length === 0) return null;
      const chosen = unseen[Math.floor(Math.random() * unseen.length)];
      seenRef.current.add(chosen.id);
      return { ...chosen, isEvent: true }; // Flag to render as event
    }

    const cats = mood.cats;
    let pool = mapPins.filter(b => isNear(b, userCoords, activeCity) && b.status === 'approved');
    if (cats.length > 0) {
      // Ampliamos búsqueda y quitamos acentos (así "cafetería" y "café" coinciden con "cafe")
      pool = pool.filter(b => {
        const normCat = normalize(b.category);
        const normName = normalize(b.name);
        return cats.some(c => normCat.includes(c) || normName.includes(c));
      });
    }
    
    const openPool = pool.filter(b => isOpenNow(b, true));
    const closedPool = pool.filter(b => !isOpenNow(b, true));

    // 1. Intentar buscar uno ABIERTO que no hayamos visto
    let unseen = openPool.filter(b => !seenRef.current.has(b.id));
    
    // 2. Si no hay más abiertos nuevos, intentar cerrados que no hayamos visto
    if (unseen.length === 0) {
      unseen = closedPool.filter(b => !seenRef.current.has(b.id));
    }
    
    // 3. Si ya vimos TODO (abiertos y cerrados), vaciamos el historial y empezamos de nuevo con los abiertos
    if (unseen.length === 0) {
      seenRef.current.clear();
      unseen = openPool.length > 0 ? openPool : closedPool;
    }
    
    if (unseen.length === 0) return null;
    
    const chosen = unseen[Math.floor(Math.random() * unseen.length)];
    seenRef.current.add(chosen.id);
    return chosen;
  };

  // ── Mood selected → spin ──────────────────────────────────────────────────
  const handleMoodSelect = (mood) => {
    setSelectedMood(mood);
    setSpinning(true);
    setStep('spin');
    setTimeout(() => {
      const result = pickBusiness(mood);
      setPick(result);
      setSpinning(false);
      setStep('result');
    }, 1800);
  };

  // ── Smart plan (Local) ───────────────────────────────────────────────────
  const handleAiGenerate = (vibe) => {
    setAiVibe(vibe);
    setStep('ai_loading');
    setAiError(null);
    
    setTimeout(() => {
      try {
        const pool = mapPins.filter(b => isNear(b, userCoords, activeCity) && b.status === 'approved');
        const openBiz = pool.filter(b => isOpenNow(b, true));
        
        let filtered = openBiz.filter(b => {
          const normCat = normalize(b.category);
          const normName = normalize(b.name);
          return vibe.cats.some(c => normCat.includes(c) || normName.includes(c));
        });
        
        // Si no hay 3 abiertos de esas categorías, rellenar con cerrados, o cualquier abierto
        if (filtered.length < 3) {
          const closedFiltered = pool.filter(b => !isOpenNow(b, true) && vibe.cats.some(c => normalize(b.category).includes(c) || normalize(b.name).includes(c)));
          filtered = [...filtered, ...closedFiltered];
        }
        if (filtered.length < 3) {
          const otherOpen = openBiz.filter(b => !filtered.find(f => f.id === b.id)).sort((a, b) => (b.rating || 0) - (a.rating || 0));
          filtered = [...filtered, ...otherOpen];
        }
        
        // Mezclamos el top 10 para que se sienta fresco
        const candidates = filtered.slice(0, 10).sort(() => Math.random() - 0.5);
        
        setAiResults({ raw: null, bizList: candidates.slice(0, 3) });
        setStep('ai_result');
      } catch (e) {
        setAiError('No pudimos generar sugerencias. Intenta de nuevo.');
        setStep('result');
      }
    }, 1500); // 1.5s delay to feel like it's "thinking"
  };

  if (!open) return null;

  const imgSrc = pick ? (pick.photos?.[0]?.url || pick.img1 || pick.img_url) : null;

  return ReactDOM.createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      {/* Backdrop */}
      <div onClick={handleClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }} />

      {/* Modal */}
      <div style={{
        position: 'relative', width: '100%', maxWidth: 440,
        background: dBg, borderRadius: 24,
        padding: '24px 20px', maxHeight: '85dvh', overflowY: 'auto',
        zIndex: 1, boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
        animation: 'popIn 0.25s cubic-bezier(0.16,1,0.3,1) forwards'
      }}>
        <style>{`@keyframes popIn { from { transform: scale(0.95); opacity:0 } to { transform: scale(1); opacity:1 } }`}</style>

        {/* Close */}
        <button onClick={handleClose} style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: dSub }}>✕</button>

        {/* ── STEP: MOOD PICKER ── */}
        {(step === 'mood') && (
          <div>
            <p style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: dSub, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 4px' }}>🎲 Sorpréndeme</p>
            <h2 style={{ textAlign: 'center', fontSize: 22, fontWeight: 900, color: dText, margin: '0 0 24px', letterSpacing: '-0.5px' }}>¿Qué se te antoja?</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {MOODS.map(mood => (
                <button key={mood.id} onClick={() => handleMoodSelect(mood)} style={{
                  background: 'transparent', border: `1px solid ${dBorder}`, borderRadius: 16,
                  padding: '16px 14px', cursor: 'pointer', textAlign: 'center',
                  transition: 'all 0.15s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8
                }}>
                  <div style={{ fontSize: 26, lineHeight: 1 }}>{mood.emoji}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: dText, lineHeight: 1.2 }}>{mood.label}</div>
                </button>
              ))}
            </div>
            
            {/* AI Option */}
            <button onClick={() => setStep('ai_vibe')} style={{
              width: '100%', marginTop: 16, background: 'transparent',
              border: `1px solid ${dBorder}`,
              borderRadius: 16, padding: '16px 14px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
            }}>
              <span style={{ fontSize: 24, lineHeight: 1 }}>🤖</span>
              <div style={{ fontSize: 14, fontWeight: 700, color: dText, lineHeight: 1.2 }}>Dejar que la IA decida</div>
            </button>
          </div>
        )}

        {/* ── STEP: SPINNING ── */}
        {step === 'spin' && (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 64, animation: 'spin 0.4s linear infinite', display: 'inline-block' }}>🎲</div>
            <style>{`@keyframes spin { from { transform: rotate(0deg) scale(1) } 50% { transform: rotate(180deg) scale(1.2) } to { transform: rotate(360deg) scale(1) } }`}</style>
            <p style={{ fontSize: 16, fontWeight: 700, color: dText, marginTop: 20 }}>Buscando el mejor lugar…</p>
            <p style={{ fontSize: 13, color: dSub }}>Analizando {selectedMood?.label.toLowerCase()}</p>
          </div>
        )}

        {/* ── STEP: RESULT ── */}
        {step === 'result' && pick && (
          <div>
            <p style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: dSub, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 4px' }}>{selectedMood?.emoji} {selectedMood?.label}</p>
            <h2 style={{ textAlign: 'center', fontSize: 20, fontWeight: 900, color: dText, margin: '0 0 16px' }}>¡Lo encontramos!</h2>

            {/* Business/Event Card */}
            <div onClick={() => { pick.isEvent ? handleEventTap(pick) : handleCardTap(pick); handleClose(); }} style={{
              borderRadius: 20, overflow: 'hidden', cursor: 'pointer', position: 'relative',
              height: 220, background: dCard, boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
            }}>
              {imgSrc
                ? <img src={imgSrc} alt={pick.name || pick.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#E2E8F0,#CBD5E1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>{pick.isEvent ? '🎫' : '🏪'}</div>
              }
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 16px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{pick.isEvent ? 'EVENTO' : pick.category}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', lineHeight: 1.1 }}>{pick.title || pick.name}</div>
                {pick.isEvent 
                  ? (pick.location && <div style={{ fontSize: 13, color: '#fff', marginTop: 4 }}>📍 {pick.location}</div>)
                  : (pick.rating > 0 && <div style={{ fontSize: 13, color: '#fff', marginTop: 4 }}>⭐ {pick.rating}</div>)
                }
              </div>
              {pick.isEvent ? (
                <div style={{ position: 'absolute', top: 12, right: 12, background: '#3B82F6', borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 800, color: '#fff' }}>Próximamente</div>
              ) : (
                isOpenNow(pick, true)
                  ? <div style={{ position: 'absolute', top: 12, right: 12, background: '#10B981', borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 800, color: '#fff' }}>Abierto</div>
                  : <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.5)', borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 800, color: '#fff' }}>Cerrado</div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button onClick={() => { pick.isEvent ? handleEventTap(pick) : handleCardTap(pick); handleClose(); }} style={{
                flex: 2, background: dText, color: dBg, border: 'none',
                borderRadius: 14, padding: '14px', fontWeight: 800, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit'
              }}>
                {pick.isEvent ? 'Ver evento →' : 'Ver lugar →'}
              </button>
              <button onClick={() => {
                const result = pickBusiness(selectedMood);
                if (result) setPick(result);
                else { setStep('spin'); setTimeout(() => setStep('result'), 800); }
              }} style={{
                flex: 1, background: dCard, color: dText, border: `1.5px solid ${dBorder}`,
                borderRadius: 14, padding: '14px', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit'
              }}>🎲 Otro</button>
            </div>

            {aiError && <p style={{ color: '#EF4444', fontSize: 12, textAlign: 'center', marginTop: 8 }}>{aiError}</p>}

            {/* Back + AI */}
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onClick={() => setStep('mood')} style={{ flex: 1, background: 'transparent', border: `1.5px solid ${dBorder}`, borderRadius: 14, padding: 12, fontWeight: 700, fontSize: 13, color: dSub, cursor: 'pointer', fontFamily: 'inherit' }}>← Cambiar mood</button>
              <button onClick={() => setStep('ai_vibe')} style={{ flex: 1, background: 'transparent', border: `1.5px solid ${dark ? 'rgba(139,92,246,0.4)' : '#DDD6FE'}`, borderRadius: 14, padding: 12, fontWeight: 700, fontSize: 13, color: dark ? '#C4B5FD' : '#7C3AED', cursor: 'pointer', fontFamily: 'inherit' }}>🤖 IA decide</button>
            </div>
          </div>
        )}

        {step === 'result' && !pick && (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>😅</div>
            <p style={{ fontSize: 16, fontWeight: 700, color: dText }}>No encontramos lugares de esta categoría</p>
            <button onClick={() => setStep('mood')} style={{ marginTop: 16, background: dText, color: dBg, border: 'none', borderRadius: 14, padding: '12px 24px', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>Intentar otra categoría</button>
          </div>
        )}

        {/* ── STEP: AI VIBE PICKER ── */}
        {step === 'ai_vibe' && (
          <div>
            <p style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: dSub, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 4px' }}>🤖 IA</p>
            <h2 style={{ textAlign: 'center', fontSize: 20, fontWeight: 900, color: dText, margin: '0 0 6px' }}>¿Cuál es el ambiente?</h2>
            <p style={{ textAlign: 'center', fontSize: 13, color: dSub, margin: '0 0 20px' }}>La IA buscará 3 opciones perfectas para ti</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {VIBES.map(v => (
                <button key={v.id} onClick={() => handleAiGenerate(v)} style={{
                  background: 'transparent', border: `1px solid ${dBorder}`, borderRadius: 16,
                  padding: '16px 14px', cursor: 'pointer', textAlign: 'center', fontFamily: 'inherit',
                  transition: 'all 0.15s'
                }}>
                  <div style={{ fontSize: 26, marginBottom: 6 }}>{v.emoji}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: dText }}>{v.label}</div>
                </button>
              ))}
            </div>
            <button onClick={() => setStep('mood')} style={{ width: '100%', marginTop: 12, background: 'transparent', border: 'none', color: dSub, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 12, fontFamily: 'inherit' }}>← Volver</button>
          </div>
        )}

        {/* ── STEP: AI LOADING ── */}
        {step === 'ai_loading' && (
          <div style={{ padding: '50px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, animation: 'pulse 1s ease-in-out infinite', display: 'inline-block' }}>🤖</div>
            <style>{`@keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }`}</style>
            <p style={{ fontSize: 16, fontWeight: 700, color: dText, marginTop: 16 }}>Consultando a la IA…</p>
            <p style={{ fontSize: 13, color: dSub }}>Analizando los mejores lugares de {(city || '').split(',')[0]}</p>
          </div>
        )}

        {/* ── STEP: AI RESULT ── */}
        {step === 'ai_result' && aiResults && (
          <div>
            <p style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: dSub, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 4px' }}>🤖 {aiVibe?.emoji} Recomendaciones IA</p>
            <h2 style={{ textAlign: 'center', fontSize: 20, fontWeight: 900, color: dText, margin: '0 0 16px' }}>Perfectas para ti</h2>

            {aiResults.bizList?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {aiResults.bizList.slice(0, 3).map((b, i) => {
                  const thumb = b.photos?.[0]?.url || b.img1 || b.img_url;
                  return (
                    <div key={b.id} onClick={() => { handleCardTap(b); handleClose(); }} style={{
                      display: 'flex', gap: 12, background: dCard, borderRadius: 16,
                      padding: 12, cursor: 'pointer', border: `1.5px solid ${dBorder}`, alignItems: 'center'
                    }}>
                      <div style={{ width: 56, height: 56, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: dBorder }}>
                        {thumb ? <img src={thumb} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={b.name} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🏪</div>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: dText, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.name}</div>
                        <div style={{ fontSize: 12, color: dSub, marginTop: 2 }}>{b.category} {b.rating > 0 ? `· ⭐ ${b.rating}` : ''}</div>
                      </div>
                      <div style={{ fontSize: 18, color: dSub }}>›</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ background: dCard, borderRadius: 16, padding: 16, marginBottom: 12 }}>
                <p style={{ fontSize: 13, color: dText, lineHeight: 1.6, margin: 0 }}>{aiResults.raw}</p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button onClick={() => setStep('ai_vibe')} style={{ flex: 1, background: dCard, color: dText, border: `1.5px solid ${dBorder}`, borderRadius: 14, padding: 12, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>🔄 Intentar otro</button>
              <button onClick={() => setStep('mood')} style={{ flex: 1, background: dText, color: dBg, border: 'none', borderRadius: 14, padding: 12, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>← Mood picker</button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
