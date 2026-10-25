import {MOODS, isValidMatch, loadSurpriseCandidates} from '../lib/surpriseSelection.js';
import {sb} from '../lib/supabase.js';
import {CITY_TZ} from '../lib/constants.js';
import React, { useState, useRef, useEffect } from 'react';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import ReactDOM from 'react-dom';
import { METRO_ZONES, isOpenNow as checkOpenNow } from '../lib/utils';

// ── MOODS ──────────────────────────────────────────────────────────────────────


const VIBES = [
  { id: 'romantico', emoji: '💑', label: 'Romántico', cats: ['restaurante', 'bar', 'cafe', 'postre', 'cena'] },
  { id: 'amigos',    emoji: '🎉', label: 'Con amigos', cats: ['bar', 'antro', 'botanero', 'taco', 'marisco', 'cerveza', 'alitas'] },
  { id: 'familia',   emoji: '👨‍👩‍👧', label: 'Familia', cats: ['restaurante', 'postre', 'helado', 'compras', 'cafeteria', 'comida', 'parque'] },
  { id: 'casual',    emoji: '😎', label: 'Sin drama', cats: ['cafe', 'cafeteria', 'taco', 'marisco', 'pizza', 'hamburguesa', 'churro'] },
];

// ── COMPONENT ──────────────────────────────────────────────────────────────────
export default function SurpriseModal({ open, onClose, mapPins, events = [], experiences = [], activeCity, userCoords, isNear, dark, T, handleCardTap, handleEventTap, handleExperienceTap, city }) {
  const isOpenNow = business => checkOpenNow(business, CITY_TZ[activeCity]);
  const candidateCache = useRef(new Map());
  const requestVersion = useRef(0);
  const [step, setStep] = useState('mood');   // mood | spin | result | ai_vibe | ai_loading | ai_result
  const [selectedMood, setSelectedMood] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [pick, setPick] = useState(null);
  const [aiVibe, setAiVibe] = useState(null);
  const [aiResults, setAiResults] = useState([]);
  const [aiError, setAiError] = useState(null);
  const seenRef = useRef(new Set());
  const swapTimer = useRef(null);
  const unlockTimer = useRef(null);
  const changingRef = useRef(false);
  const [changing, setChanging] = useState(false);
  const [rotationNotice, setRotationNotice] = useState('');
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    requestVersion.current += 1;
    candidateCache.current.clear();
    seenRef.current.clear();
    changingRef.current = false; setChanging(false); setRotationNotice('');
    setStep('mood'); setPick(null); setSelectedMood(null);
    return () => {
      requestVersion.current += 1;
      clearTimeout(swapTimer.current); clearTimeout(unlockTimer.current);
    };
  }, [open, activeCity]);

  const dBg    = T.bg;
  const dText  = T.text;
  const dSub   = T.sub;
  const dCard  = dark ? T.card : '#F8FAFC';
  const dBorder= T.border;

  const reset = () => {
    requestVersion.current += 1;
    clearTimeout(swapTimer.current); clearTimeout(unlockTimer.current);
    changingRef.current = false; setChanging(false); setRotationNotice('');
    setStep('mood'); setSelectedMood(null); setSpinning(false);
    setPick(null); setAiVibe(null); setAiResults([]); setAiError(null);
    seenRef.current.clear();
  };
  const handleClose = () => { reset(); onClose(); };

  const getNextOpenText = (b) => {
    if (!b.schedule || typeof b.schedule !== 'object') return null;
    if (b.schedule.type === "always_open") return null;
    try {
      const d = new Date();
      const tz = (typeof window !== "undefined" && window.CITY_TZ) || "America/Mexico_City";
      const fmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(d);
      const get = type => fmt.find(p => p.type === type)?.value || "";
      const h = parseInt(get("hour")), min = parseInt(get("minute"));
      const currentMin = h * 60 + min;
      const days = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"];
      const enDays = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      const todayIdx = enDays[get("weekday")] || 0;
      
      const toMin = s => {
        const m = s.trim().match(/(\d{1,2})(?:\s*:\s*(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/i);
        if (!m) return null;
        let hh = parseInt(m[1]), mm = parseInt(m[2] || 0), p = (m[3] || "").replace(/\./g, "").toLowerCase();
        if (p === "pm" && hh !== 12) hh += 12;
        if (p === "am" && hh === 12) hh = 0;
        return hh * 60 + mm;
      };

      for (let i = 0; i < 7; i++) {
        const checkIdx = (todayIdx + i) % 7;
        const txt = b.schedule[days[checkIdx]];
        if (!txt || typeof txt !== 'string' || /cerrado/i.test(txt)) continue;
        
        const shifts = txt.split(/\n|,|\by\b/i).map(s => s.trim()).filter(Boolean);
        for (const shift of shifts) {
          const segs = shift.split(/\s*[-–]\s*|\s+a\s+/i).map(s => s.trim());
          if (segs.length < 2) continue;
          const openMin = toMin(segs[0]);
          if (openMin === null) continue;
          
          const format12h = (mins) => {
            let h = Math.floor(mins / 60);
            let m = mins % 60;
            let p = "am";
            if (h >= 12) {
              p = "pm";
              if (h > 12) h -= 12;
            }
            if (h === 0) h = 12;
            return `${h}:${m.toString().padStart(2, '0')} ${p}`;
          };
          
          const timeStr = format12h(openMin);

          if (i === 0) {
            if (openMin > currentMin) return `Abre hoy a las ${timeStr}`;
          } else if (i === 1) {
            return `Abre mañana a las ${timeStr}`;
          } else {
            const dayNames = ["el domingo", "el lunes", "el martes", "el miércoles", "el jueves", "el viernes", "el sábado"];
            return `Abre ${dayNames[checkIdx]} a las ${timeStr}`;
          }
        }
      }
    } catch (e) { /* ignore */ }
    return null;
  };

  // ── Pick a random business ─────────────────────────────────────────────────
  const belongsToCity = business => {
    const slugs = new Set([activeCity, ...(METRO_ZONES[activeCity] || []), 'all']);
    return String(business.city_slug || '').split(',').some(slug => slugs.has(slug.trim()));
  };

  const pickBusiness = (mood, excludeId = null, candidates = mapPins) => {
    candidates = candidates.filter(business => belongsToCity(business) && business.plan !== 'menu');
    if (mood.id === 'eventos') {
      const now = new Date();
      let pool = events.filter(ev => {
        if (ev.id === excludeId || ev.status !== 'approved' || !isNear(ev, userCoords, activeCity)) return false;
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

    if (mood.id === 'planes') {
      const cats = mood.cats;
      let mapPool = candidates.filter(b => isNear(b, userCoords, activeCity) && b.status === 'approved' && b.plan !== 'menu' && isValidMatch(b, mood.id, cats));
      let expPool = experiences.filter(e => isNear(e, userCoords, activeCity)).map(e => ({ ...e, isExperience: true }));
      let pool = [...mapPool, ...expPool].filter(item => item.id !== excludeId);
      let unseen = pool.filter(e => !seenRef.current.has(e.id));
      if (unseen.length === 0) { seenRef.current.clear(); unseen = pool; }
      if (unseen.length === 0) return null;
      const chosen = unseen[Math.floor(Math.random() * unseen.length)];
      seenRef.current.add(chosen.id);
      return chosen;
    }

    const cats = mood.cats;
    let pool = candidates.filter(b => b.id !== excludeId && isNear(b, userCoords, activeCity) && b.status === 'approved' && b.plan !== 'menu');
    if (cats.length > 0) {
      pool = pool.filter(b => isValidMatch(b, mood.id, cats));
    }
    
    const openPool = pool.filter(b => isOpenNow(b));
    const closedPool = pool.filter(b => !isOpenNow(b));

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

  const findPick = async (mood, excludeId, version) => {
    if (mood.id === 'eventos') return pickBusiness(mood, excludeId);
    const citySlugs = [...new Set([activeCity,...(METRO_ZONES[activeCity] || [])])].filter(Boolean);
    const eligible = business => business.status === 'approved' && business.plan !== 'menu' && belongsToCity(business) && isNear(business,userCoords,activeCity) && isValidMatch(business,mood.id,mood.cats);
    const candidates = await loadSurpriseCandidates({
      get: (...args) => sb.get(...args), cache: candidateCache.current, citySlugs, mood,
      local: mapPins, seen: seenRef.current, excludeId, eligible,
      isCurrent: () => requestVersion.current === version
    });
    return requestVersion.current === version ? pickBusiness(mood,excludeId,candidates) : null;
  };

  const handleMoodSelect = (mood) => {
    const version = ++requestVersion.current;
    setRotationNotice(''); setAiError(null); setSelectedMood(mood); setSpinning(true); setStep('spin');
    swapTimer.current = setTimeout(async () => {
      try {
        const result = await findPick(mood,null,version);
        if (version !== requestVersion.current) return;
        setPick(result);
      } catch {
        if (version !== requestVersion.current) return;
        setPick(pickBusiness(mood));
        setAiError('No pudimos consultar más lugares. Revisa tu conexión e inténtalo de nuevo.');
      }
      if (version === requestVersion.current) { setSpinning(false); setStep('result'); }
    }, reduceMotion ? 0 : 1800);
  };

  const handleAnother = () => {
    if (changingRef.current || !selectedMood) return;
    const version = ++requestVersion.current;
    changingRef.current = true; setChanging(true); setRotationNotice(''); setAiError(null);
    swapTimer.current = setTimeout(async () => {
      try {
        const result = await findPick(selectedMood,pick?.id,version);
        if (version !== requestVersion.current) return;
        if (result) setPick(result);
        else setRotationNotice('No encontramos otro lugar de este tipo en la ciudad. Puedes elegir otro plan.');
      } catch {
        if (version !== requestVersion.current) return;
        setRotationNotice('No pudimos cargar más lugares. Revisa tu conexión e inténtalo de nuevo.');
      }
      if (version !== requestVersion.current) return;
      unlockTimer.current = setTimeout(() => { changingRef.current = false; setChanging(false); }, reduceMotion ? 0 : 400);
    }, reduceMotion ? 0 : 180);
  };

  // ── Smart plan (Local) ───────────────────────────────────────────────────
  const handleAiGenerate = (vibe) => {
    setAiVibe(vibe);
    setStep('ai_loading');
    setAiError(null);
    
    setTimeout(() => {
      try {
        let pool = mapPins.filter(b => isNear(b, userCoords, activeCity) && b.status === 'approved' && b.plan !== 'menu');
        
        if (vibe.id === 'planes') {
          const expPool = experiences.filter(e => isNear(e, userCoords, activeCity)).map(e => ({ ...e, isExperience: true }));
          pool = [...pool, ...expPool];
        }

        const openBiz = pool.filter(b => b.isExperience || isOpenNow(b));
        
        let filtered = openBiz.filter(b => isValidMatch(b, vibe.id, vibe.cats));
        
        // Si no hay 3 abiertos de esas categorías, rellenar con cerrados
        if (filtered.length < 3) {
          const closedFiltered = pool.filter(b => {
            if (b.isExperience || isOpenNow(b)) return false;
            return isValidMatch(b, vibe.id, vibe.cats);
          });
          filtered = [...filtered, ...closedFiltered];
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

  const imgSrc = pick ? (pick.photos?.[0]?.url || pick.gallery?.[0] || pick.img1 || pick.img_url) : null;

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

            {/* Business/Event/Experience Card */}
            <div style={{ minHeight: pick.isEvent ? undefined : 220 }} aria-busy={changing}>
            <AnimatePresence mode="wait" initial={false}>
            <m.div key={pick.id} initial={{ opacity: 0, x: reduceMotion ? 0 : 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: reduceMotion ? 0 : -12 }} transition={{ duration: reduceMotion ? 0 : 0.18 }} onClick={() => {
              if (changingRef.current) return; 
              if (pick.isEvent) handleEventTap(pick); 
              else if (pick.isExperience) handleExperienceTap(pick);
              else handleCardTap(pick); 
              handleClose(); 
            }} style={{
              borderRadius: 20, overflow: 'hidden', cursor: 'pointer', position: 'relative',
              height: pick.isEvent ? 'auto' : 220, background: dCard, boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
            }}>
              {imgSrc
                ? <img src={imgSrc} alt={pick.name || pick.title} style={{ display: 'block', width: '100%', height: pick.isEvent ? 'auto' : '100%', maxHeight: pick.isEvent ? '46dvh' : undefined, objectFit: pick.isEvent ? 'contain' : 'cover' }} />
                : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#E2E8F0,#CBD5E1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>{pick.isEvent ? '🎫' : pick.isExperience ? '🧭' : '🏪'}</div>
              }
              {!pick.isEvent && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)' }} />}
              <div style={{ position: pick.isEvent ? 'relative' : 'absolute', bottom: 0, left: 0, right: 0, padding: pick.isEvent ? '14px 16px 16px' : '20px 16px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: pick.isEvent ? dSub : 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                  {pick.isEvent ? 'EVENTO' : pick.isExperience ? (pick.activity_type || 'EXPERIENCIA') : pick.category}
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: pick.isEvent ? dText : '#fff', lineHeight: 1.1 }}>{pick.title || pick.name}</div>
                {pick.isEvent || pick.isExperience
                  ? (pick.location && <div style={{ fontSize: 13, color: pick.isEvent ? dSub : '#fff', marginTop: 4 }}>📍 {pick.location}</div>)
                  : (pick.rating > 0 && <div style={{ fontSize: 13, color: '#fff', marginTop: 4 }}>⭐ {pick.rating}</div>)
                }
              </div>
              {pick.isEvent ? (
                <div style={{ position: 'absolute', top: 12, right: 12, background: '#3B82F6', borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 800, color: '#fff' }}>Próximamente</div>
              ) : pick.isExperience ? (
                null
              ) : (
                isOpenNow(pick)
                  ? <div style={{ position: 'absolute', top: 12, right: 12, background: '#10B981', borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 800, color: '#fff' }}>Abierto</div>
                  : <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', borderRadius: 999, padding: '4px 10px', fontSize: 11, fontWeight: 800, color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}>Cerrado</div>
              )}
            </m.div>
            </AnimatePresence>
            </div>

            {/* Primary action above the two secondary actions. */}
            <button disabled={changing} onClick={() => {
              if (pick.isEvent) handleEventTap(pick);
              else if (pick.isExperience) handleExperienceTap(pick);
              else handleCardTap(pick);
              handleClose();
            }} style={{ width: '100%', marginTop: 12, minHeight: 48, background: dText, color: dBg, border: 'none', borderRadius: 14, padding: '14px', fontWeight: 800, fontSize: 15, cursor: changing ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
              {pick.isEvent ? 'Ver evento →' : pick.isExperience ? 'Ver plan →' : 'Ver lugar →'}
            </button>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
              <button disabled={changing} onClick={() => setStep('mood')} style={{ minHeight: 46, background: 'transparent', border: `1px solid ${dBorder}`, borderRadius: 14, padding: '10px 8px', fontWeight: 700, fontSize: 13, color: dSub, cursor: changing ? 'wait' : 'pointer', fontFamily: 'inherit' }}>Elegir otro plan</button>
              <button disabled={changing} onClick={handleAnother} style={{ minHeight: 46, background: dCard, color: dText, border: `1px solid ${dBorder}`, borderRadius: 14, padding: '10px 8px', fontWeight: 700, fontSize: 13, cursor: changing ? 'wait' : 'pointer', fontFamily: 'inherit' }}>{changing ? 'Buscando…' : 'Buscar otro lugar'}</button>
            </div>
            <div role="status" aria-live="polite" style={{ fontSize: 13, color: dSub, textAlign: 'center', lineHeight: 1.5, marginTop: rotationNotice ? 10 : 0 }}>{rotationNotice}</div>
            {aiError && <p style={{ color: '#EF4444', fontSize: 12, textAlign: 'center', marginTop: 8 }}>{aiError}</p>}

          </div>
        )}

        {step === 'result' && !pick && (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>😅</div>
            <p style={{ fontSize: 16, fontWeight: 700, color: dText }}>{aiError || 'No encontramos lugares de esta categoría'}</p>
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
                  const thumb = b.photos?.[0]?.url || b.gallery?.[0] || b.img1 || b.img_url;
                  return (
                    <div key={b.id} onClick={() => { 
                      if (b.isExperience) handleExperienceTap(b);
                      else handleCardTap(b); 
                      handleClose(); 
                    }} style={{
                      display: 'flex', gap: 12, background: dCard, borderRadius: 16,
                      padding: 12, cursor: 'pointer', border: `1.5px solid ${dBorder}`, alignItems: 'center'
                    }}>
                      <div style={{ width: 56, height: 56, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: dBorder }}>
                        {thumb ? <img src={thumb} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={b.title || b.name} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>{b.isExperience ? '🧭' : '🏪'}</div>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: dText, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.title || b.name}</div>
                        <div style={{ fontSize: 12, color: dSub, marginTop: 2 }}>{b.activity_type || b.category} {b.rating > 0 ? `· ⭐ ${b.rating}` : ''}</div>
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
              <button onClick={() => setStep('mood')} style={{ flex: 1, background: dText, color: dBg, border: 'none', borderRadius: 14, padding: 12, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Elegir otro plan</button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
