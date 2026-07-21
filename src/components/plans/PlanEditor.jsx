import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import imageCompression from 'browser-image-compression';
import { sb, cloudUpload } from '../../lib/supabase.js';
import Icon from '../ui/Icon.jsx';
import PlanSummary from './PlanSummary.jsx';

const generateId = () => Math.random().toString(36).substr(2, 9);
const isUUID = (s) => s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

const getKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const CUSTOM_EMOJIS = ["📌", "🏃", "🛒", "🚗", "👶", "🏫", "💊", "🏥", "🍕", "🎬", "💪", "📦", "🐕", "✂️", "🏦", "✉️", "🎉", "😴"];
const CATEGORIES = [
  { label: "Gastronomía", icon: "🍔" },
  { label: "Naturaleza", icon: "🌲" },
  { label: "Vida Nocturna", icon: "🌙" },
  { label: "Familiar", icon: "👨‍👩‍👧‍👦" },
  { label: "Pareja", icon: "❤️" },
  { label: "Road Trip", icon: "🚗" },
  { label: "Aventura", icon: "🧗" },
  { label: "Relax", icon: "🧖" }
];

const PLAN_TYPES = [
  { id: 'plan', label: 'Plan', placeholder: 'Nombre del plan...', descPlaceholder: 'Describe de qué trata este plan...' },
  { id: 'tour', label: 'Tour', placeholder: 'Nombre del tour...', descPlaceholder: 'Describe de qué trata este tour...' },
  { id: 'itinerario', label: 'Itinerario', placeholder: 'Nombre del itinerario...', descPlaceholder: 'Describe de qué trata este itinerario...' },
  { id: 'experiencia', label: 'Experiencia', placeholder: 'Nombre de la experiencia...', descPlaceholder: 'Describe de qué trata esta experiencia...' }
];

export default function PlanEditor({ T, dark, onClose, onSave, initialPlan, mapPins = [], user, activeCity }) {
  const [planType, setPlanType] = useState(initialPlan?.plan_type || 'plan');
  const [name, setName] = useState(initialPlan?.name || '');
  const [description, setDescription] = useState(initialPlan?.description || '');
  const [emoji, setEmoji] = useState(initialPlan?.emoji || '🗺️');
  const [coverUrl, setCoverUrl] = useState(initialPlan?.coverUrl || '');
  const [places, setPlaces] = useState(initialPlan?.places || []);
  
  const [startDate, setStartDate] = useState(initialPlan?.start_date || '');
  const [endDate, setEndDate] = useState(initialPlan?.end_date || '');
  const [isMultiDay, setIsMultiDay] = useState(!!initialPlan?.end_date);
  const [category, setCategory] = useState(initialPlan?.category || '');
  const [visibility, setVisibility] = useState(initialPlan?.visibility || (initialPlan?.isPublic ? 'public' : 'private'));
  const [tags, setTags] = useState(initialPlan?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [notes, setNotes] = useState(initialPlan?.notes || '');
  const [budget, setBudget] = useState(initialPlan?.budget || 0);
  const [checklist, setChecklist] = useState(initialPlan?.checklist || []);
  const [checkInput, setCheckInput] = useState('');
  const [showStartDate, setShowStartDate] = useState(!!initialPlan?.start_date);
  const [openSection, setOpenSection] = useState(null);
  
  const [saving, setSaving] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [generatingDesc, setGeneratingDesc] = useState(false);

  const [searchQ, setSearchQ] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customEmoji, setCustomEmoji] = useState('📌');
  const [customName, setCustomName] = useState('');
  const [customAddress, setCustomAddress] = useState('');
  const [customTime, setCustomTime] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const fileRef = useRef();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // ── AI Description ────────────────────────────────────────────────────
  const handleGenerateAI = async () => {
    if (!name.trim()) return alert('Ponle un título al plan primero para que la IA sepa de qué trata.');
    setGeneratingDesc(true);
    try {
      const res = await fetch('/api/ai-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_ADMIN_SECRET}`
        },
        body: JSON.stringify({ title: name.trim(), tags, planType: PLAN_TYPES.find(t=>t.id===planType)?.label })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error generando');
      if (data.description) setDescription(data.description);
    } catch (err) {
      console.error(err);
      alert('Hubo un error con la IA. Intenta de nuevo.');
    } finally {
      setGeneratingDesc(false);
    }
  };

  // ── Image upload ──────────────────────────────────────────────────────
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCompressing(true);
    try {
      const compressed = await imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1200, useWebWorker: true });
      const reader = new FileReader();
      reader.onloadend = () => { setCoverUrl(reader.result); setCompressing(false); };
      reader.readAsDataURL(compressed);
    } catch { setCompressing(false); }
  };

  // ── Save ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!name.trim()) return alert('Ingresa un nombre para el plan');
    setSaving(true);

    try {
      let finalCoverUrl = coverUrl;

      // Upload base64 cover to Cloudinary
      if (coverUrl && coverUrl.startsWith('data:')) {
        try {
          const blob = await fetch(coverUrl).then(r => r.blob());
          const file = new File([blob], 'plan_cover.jpg', { type: 'image/jpeg' });
          finalCoverUrl = await cloudUpload(file, () => {}, 'cityguide/plans');
        } catch (e) {
          console.warn('Cover upload failed, keeping base64', e);
        }
      }

      if (user) {
        const isUpdate = isUUID(initialPlan?.id);

        const planBody = {
          user_id: user.id,
          name: name.trim(),
          description: description.trim() || null,
          emoji,
          cover_url: finalCoverUrl || null,
          is_public: visibility === 'public',
          city_slug: activeCity || null,
          start_date: startDate || null,
          end_date: isMultiDay && endDate ? endDate : null,
          category: category || null,
          visibility,
          tags,
          notes: notes.trim() || null,
          budget: parseFloat(budget) || 0,
          checklist,
          plan_type: planType
        };

        const safePlanBody = { user_id: user.id, name: name.trim(), description: description.trim() || null, emoji, cover_url: finalCoverUrl || null, is_public: visibility === 'public', city_slug: activeCity || null };

        let planId;
        let created;
        if (isUpdate) {
          try {
            await sb.patch('plans', initialPlan.id, planBody);
          } catch(e) {
            console.error('Save full plan failed, using safe payload', e);
            await sb.patch('plans', initialPlan.id, safePlanBody);
          }
          planId = initialPlan.id;
        } else {
          try {
            [created] = await sb.post('plans', planBody);
          } catch(e) {
            console.error('Save full plan failed, using safe payload', e);
            [created] = await sb.post('plans', safePlanBody);
          }
          planId = created.id;
        }

        await sb.delWhere('plan_items', 'plan_id', planId);

        for (let i = 0; i < places.length; i++) {
          const item = places[i];
          const itemBody = {
            plan_id: planId,
            position: i,
            type: item.type || 'business',
            business_id: item.type !== 'custom' ? String(item.business?.id ?? '') : null,
            custom_emoji: item.type === 'custom' ? item.customEmoji : null,
            custom_name: item.type === 'custom' ? item.customName : null,
            custom_address: item.type === 'custom' ? (item.customAddress || null) : null,
            time_hint: item.timeHint || null,
            note: item.note || null,
            start_time: item.timeHint || null,
            duration_min: item.durationMin && !isNaN(parseInt(item.durationMin)) ? parseInt(item.durationMin) : null
          };
          const safeItemBody = {
             plan_id: planId, position: i, type: item.type || 'business', business_id: item.type !== 'custom' ? String(item.business?.id ?? '') : null, custom_emoji: item.type === 'custom' ? item.customEmoji : null, custom_name: item.type === 'custom' ? item.customName : null, custom_address: item.type === 'custom' ? (item.customAddress || null) : null, start_time: item.timeHint || null, note: item.note || null
          };
          try {
            await sb.post('plan_items', itemBody);
          } catch (e) {
            await sb.post('plan_items', safeItemBody);
          }
        }

        onSave({
          id: planId, name: name.trim(), description, emoji, coverUrl: finalCoverUrl, isPublic: visibility === 'public', visibility, start_date: startDate, end_date: isMultiDay ? endDate : null, category, tags, notes, budget, checklist, places, created_at: initialPlan?.created_at || new Date().toISOString(), authorId: user.id, author: user.user_metadata?.name || 'Usuario', authorAvatar: user.user_metadata?.avatar_url || '', share_token: isUpdate ? initialPlan?.share_token : (typeof created !== 'undefined' ? created.share_token : '')
        });
      } else {
        onSave({
          id: initialPlan?.id || generateId(), name: name.trim(), description, emoji, coverUrl: finalCoverUrl, isPublic: visibility === 'public', visibility, start_date: startDate, end_date: isMultiDay ? endDate : null, category, tags, notes, budget, checklist, places, created_at: initialPlan?.created_at || new Date().toISOString(), authorId: null, author: 'Usuario', authorAvatar: '', share_token: initialPlan?.share_token || ''
        });
      }
    } catch (err) {
      console.error('Error saving plan:', err);
      alert('Error guardando el plan. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  // ── DnD ──────────────────────────────────────────────────────────────
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(places);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    setPlaces(items);
  };

  const getNextTime = () => {
    if (places.length === 0) return '';
    const lastItem = places[places.length - 1];
    if (!lastItem.timeHint) return '';
    const [h, m] = lastItem.timeHint.split(':');
    if (h != null && m != null) {
      let nextH = parseInt(h) + 1;
      if (nextH > 23) nextH = nextH - 24;
      return `${nextH.toString().padStart(2, '0')}:${m}`;
    }
    return '';
  };

  const addBusiness = (biz) => {
    setPlaces([...places, { id: generateId(), type: 'business', business: biz, timeHint: getNextTime(), note: '' }]);
    setSearchQ(''); setIsSearching(false);
  };

  const addCustomActivity = () => {
    if (!customName.trim()) return;
    setPlaces([...places, { id: generateId(), type: 'custom', customEmoji, customName: customName.trim(), customAddress: customAddress.trim() || undefined, timeHint: customTime || '', note: '' }]);
    setCustomName(''); setCustomAddress(''); setCustomTime(''); setCustomEmoji('📌'); setShowCustomForm(false);
  };

  const removePlace = (id) => setPlaces(places.filter(p => p.id !== id));
  const updatePlace = (id, field, value) => setPlaces(places.map(p => p.id === id ? { ...p, [field]: value } : p));

  const searchResults = searchQ.trim().length > 1
    ? mapPins.filter(b => b.name.toLowerCase().includes(searchQ.toLowerCase())).slice(0, 6)
    : [];

  const inputStyle = {
    padding: '13px 16px', fontSize: 15,
    background: dark ? 'rgba(255,255,255,0.05)' : '#F9FAFB',
    border: `1px solid ${T.border}`, borderRadius: 12,
    color: T.text, outline: 'none', width: '100%',
    boxSizing: 'border-box', fontFamily: 'inherit',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: T.bg, display: 'flex', flexDirection: 'column', animation: 'fadeUp .35s cubic-bezier(0.16,1,0.3,1)' }}>

      {/* Header */}
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: T.glassBg, backdropFilter: 'blur(24px)', borderBottom: `1px solid ${T.border}`, flexShrink: 0, zIndex: 10 }}>
        <button onClick={onClose} className="press" style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.text, padding: 4 }}>
          <Icon name="x" size={24} />
        </button>
        <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>
          {isUUID(initialPlan?.id) ? 'Editar ' + (PLAN_TYPES.find(t=>t.id===planType)?.label || 'Plan') : 'Nuevo ' + (PLAN_TYPES.find(t=>t.id===planType)?.label || 'Plan')}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {initialPlan?.share_token && (
            <button onClick={() => {
              const url = `https://citymap.mx/?join=${initialPlan.share_token}`;
              navigator.clipboard.writeText(url);
              alert('¡Enlace de invitación copiado al portapapeles!');
            }} className="press"
              style={{ background: 'rgba(124, 58, 237, 0.1)', border: 'none', cursor: 'pointer', color: '#7C3AED', fontSize: 13, fontWeight: 700, padding: '8px 12px', borderRadius: 10, transition: 'all .2s', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="share" size={14} /> Invitar
            </button>
          )}
          <button onClick={() => setShowPreview(true)} className="press"
            style={{ background: 'transparent', border: `1px solid ${T.border}`, cursor: 'pointer', color: T.text, fontSize: 13, fontWeight: 700, padding: '8px 12px', borderRadius: 10, transition: 'all .2s' }}>
            Vista Previa
          </button>
          <button onClick={handleSave} disabled={saving || !name.trim()} className="press"
            style={{ background: (saving || !name.trim()) ? T.border : '#7C3AED', border: 'none', cursor: (saving || !name.trim()) ? 'default' : 'pointer', color: (saving || !name.trim()) ? T.sub : '#fff', fontSize: 13, fontWeight: 800, padding: '8px 16px', borderRadius: 10, transition: 'all .2s' }}>
            {saving ? '...' : 'Guardar'}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

        {/* Tipos de Plan Selector */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 16, msOverflowStyle: 'none', scrollbarWidth: 'none', marginTop: -4 }}>
          {PLAN_TYPES.map(type => (
            <button
              key={type.id}
              onClick={() => setPlanType(type.id)}
              style={{
                padding: '8px 16px',
                borderRadius: 20,
                whiteSpace: 'nowrap',
                background: planType === type.id ? '#7C3AED' : 'transparent',
                color: planType === type.id ? '#fff' : T.sub,
                border: `1px solid ${planType === type.id ? '#7C3AED' : T.border}`,
                fontSize: 14,
                fontWeight: planType === type.id ? 700 : 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* Cover */}
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />


        {coverUrl ? (
          <div style={{ position: 'relative', width: '100%', height: 160, borderRadius: 20, overflow: 'hidden', marginBottom: 20, flexShrink: 0, border: `1px solid ${T.border}` }}>
            <img src={coverUrl} alt="Portada" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0) 50%, rgba(0,0,0,0.6))' }} />
            <button onClick={() => setCoverUrl('')} style={{ position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Icon name="trash" size={16} />
            </button>
            <div style={{ position: 'absolute', bottom: -22, left: 20, width: 56, height: 56, borderRadius: '50%', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, border: `3px solid ${T.bg}`, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
              {emoji}
            </div>
          </div>
        ) : (
          <div style={{ position: 'relative', width: '100%', height: 160, borderRadius: 20, background: dark ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg, rgba(124,58,237,0.05) 0%, rgba(59,130,246,0.05) 100%)', border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`, marginBottom: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
            <span style={{ fontSize: 72, opacity: 0.9, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.1))' }}>{emoji}</span>
            <button onClick={() => fileRef.current?.click()} disabled={compressing} className="press" style={{ position: 'absolute', top: 12, right: 12, padding: '8px 14px', borderRadius: 20, background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)', backdropFilter: 'blur(8px)', border: `1px solid ${dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}`, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: T.text, fontSize: 12, fontWeight: 700, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              {compressing ? <span style={{ fontSize: 12 }}>⏳...</span> : <><Icon name="image" size={14} /> Añadir portada</>}
            </button>
          </div>
        )}

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: coverUrl ? 28 : 0, marginBottom: 28 }}>

          <div style={{ display: 'flex', background: dark ? 'rgba(255,255,255,0.05)' : '#F9FAFB', border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden' }} className="focus-ring">
            <input type="text" placeholder="🗺️" value={emoji} onChange={e => setEmoji(e.target.value)} maxLength={2}
              style={{ width: 58, padding: '13px 0', textAlign: 'center', fontSize: 22, background: 'transparent', border: 'none', color: T.text, outline: 'none', flexShrink: 0 }} />
            <div style={{ width: 1, background: T.border, margin: '8px 0' }} />
            <input type="text" placeholder={PLAN_TYPES.find(t=>t.id===planType)?.placeholder || "Nombre..."} value={name} onChange={e => setName(e.target.value)}
              style={{ padding: '13px 16px', fontSize: 15, flex: 1, fontWeight: 700, background: 'transparent', border: 'none', color: T.text, outline: 'none', fontFamily: 'inherit' }} />
          </div>

          <div style={{ position: 'relative' }}>
            <textarea placeholder={PLAN_TYPES.find(t=>t.id===planType)?.descPlaceholder || "Describe de qué trata este recorrido..."} value={description} onChange={e => setDescription(e.target.value)} rows={2} maxLength={300}
              className="focus-ring" style={{ ...inputStyle, resize: 'none', paddingBottom: 24, paddingRight: 40 }} />
            
            <button onClick={handleGenerateAI} disabled={generatingDesc} title="Autocompletar con IA" style={{ position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: '50%', background: generatingDesc ? 'transparent' : 'linear-gradient(135deg, #7C3AED 0%, #3B82F6 100%)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(124,58,237,0.3)' }}>
              {generatingDesc ? <span style={{ fontSize: 12 }}>⏳</span> : <span style={{ fontSize: 14 }}>✨</span>}
            </button>

            <div style={{ position: 'absolute', bottom: 10, right: 14, fontSize: 11, color: T.sub, fontWeight: 600 }}>{(description || '').length}/300</div>
          </div>

          <div style={{ marginTop: 12 }}>
            {!showStartDate ? (
              <button onClick={() => setShowStartDate(true)} className="press"
                style={{ background: 'transparent', border: `1.5px dashed ${T.border}`, borderRadius: 12, padding: '12px', width: '100%', color: T.sub, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                📅 + Agregar fecha
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: dark ? 'rgba(255,255,255,0.02)' : '#F9FAFB', border: `1px solid ${T.border}`, padding: 12, borderRadius: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ display: 'flex', background: dark ? 'rgba(255,255,255,0.05)' : '#F3F4F6', borderRadius: 8, padding: 2 }}>
                    <button onClick={() => setIsMultiDay(false)} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: !isMultiDay ? T.white : 'transparent', color: !isMultiDay ? T.text : T.sub, fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: !isMultiDay ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>1 día</button>
                    <button onClick={() => setIsMultiDay(true)} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: isMultiDay ? T.white : 'transparent', color: isMultiDay ? T.text : T.sub, fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: isMultiDay ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>Varios días</button>
                  </div>
                  <button onClick={() => { setShowStartDate(false); setStartDate(''); setEndDate(''); setIsMultiDay(false); }} className="press" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: 'none', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <Icon name="x" size={14} />
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 36, display: 'flex', justifyContent: 'center', color: T.sub, flexShrink: 0 }}><Icon name="calendar" size={18} /></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input 
                        type="date" 
                        value={startDate ? startDate.split('T')[0] : ''} 
                        onChange={e => {
                          const date = e.target.value;
                          const time = (startDate && startDate.includes('T')) ? startDate.split('T')[1].substring(0,5) : (isMultiDay ? '' : '12:00');
                          setStartDate(date ? `${date}${time ? 'T'+time : ''}` : '');
                        }} 
                        className="focus-ring" 
                        style={{ ...inputStyle, flex: 1, fontSize: 14, color: dark ? '#fff' : '#000', WebkitTextFillColor: dark ? '#fff' : '#000' }} 
                      />
                      {!isMultiDay && (
                        <input 
                          type="time" 
                          value={(startDate && startDate.includes('T')) ? startDate.split('T')[1].substring(0,5) : ''} 
                          onChange={e => {
                            const time = e.target.value;
                            const date = startDate ? startDate.split('T')[0] : new Date().toISOString().split('T')[0];
                            setStartDate(time ? `${date}T${time}` : `${date}T00:00`);
                          }} 
                          className="focus-ring" 
                          style={{ ...inputStyle, width: 110, fontSize: 14, color: dark ? '#fff' : '#000', WebkitTextFillColor: dark ? '#fff' : '#000' }} 
                        />
                      )}
                    </div>
                    {isMultiDay && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: T.sub, width: 20, textAlign: 'center' }}>al</div>
                        <input 
                          type="date" 
                          value={endDate ? endDate.split('T')[0] : ''} 
                          onChange={e => setEndDate(e.target.value)} 
                          className="focus-ring" 
                          style={{ ...inputStyle, flex: 1, fontSize: 14, color: dark ? '#fff' : '#000', WebkitTextFillColor: dark ? '#fff' : '#000' }} 
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.sub, marginBottom: 8, paddingLeft: 6 }}>Categorías y Etiquetas</div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {CATEGORIES.map(cat => {
                const isSelected = tags.includes(cat.label);
                return (
                  <button key={cat.label} onClick={() => isSelected ? setTags(tags.filter(t => t !== cat.label)) : setTags([...tags, cat.label])} className="press"
                    style={{ padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: `1px solid ${isSelected ? '#7C3AED' : T.border}`, background: isSelected ? '#7C3AED' : 'transparent', color: isSelected ? '#fff' : T.sub, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}>
                    <span>{cat.icon}</span> <span>{cat.label}</span>
                  </button>
                )
              })}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              {tags.map((tag, idx) => (
                <div key={idx} style={{ padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: '#F3E8FF', color: '#6D28D9', display: 'flex', alignItems: 'center', gap: 4 }}>
                  #{tag}
                  <button onClick={() => setTags(tags.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', padding: 0, color: '#6D28D9', cursor: 'pointer', display: 'flex' }}><Icon name="x" size={12} /></button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="text" placeholder="Añade otra etiqueta (Ej: PetFriendly)..." value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if(e.key === 'Enter' && tagInput.trim() && !tags.includes(tagInput.trim().replace(/^#/, ''))) { setTags([...tags, tagInput.trim().replace(/^#/, '')]); setTagInput(''); } }} className="focus-ring" style={{ ...inputStyle, padding: '10px 14px', fontSize: 14 }} />
              <button onClick={() => { if(tagInput.trim() && !tags.includes(tagInput.trim().replace(/^#/, ''))) { setTags([...tags, tagInput.trim().replace(/^#/, '')]); setTagInput(''); } }} style={{ padding: '0 16px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12, color: T.text, fontWeight: 700, cursor: 'pointer' }}>Añadir</button>
            </div>
          </div>

          <div style={{ marginTop: 6 }}>
             <div style={{ fontSize: 13, fontWeight: 700, color: T.sub, marginBottom: 8, paddingLeft: 6 }}>Visibilidad</div>
             <div style={{ display: 'flex', background: dark ? 'rgba(255,255,255,0.05)' : '#F9FAFB', borderRadius: 12, border: `1px solid ${T.border}`, padding: 4 }}>
                {[ { id: 'public', label: '🌍 Público' }, { id: 'private', label: '🔒 Privado' } ].map(opt => (
                  <button key={opt.id} onClick={() => setVisibility(opt.id)} style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', background: visibility === opt.id ? T.white : 'transparent', color: visibility === opt.id ? T.text : T.sub, boxShadow: visibility === opt.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none' }}>
                    {opt.label}
                  </button>
                ))}
             </div>
          </div>

          {!user && (
            <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: '#92400E', fontWeight: 600 }}>
              ⚠️ Inicia sesión para guardar en la nube y compartir tus planes
            </div>
          )}
        </div>

        {/* Itinerary */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: T.text, margin: 0 }}>Itinerario</h2>
          <div style={{ fontSize: 12, color: T.sub }}>{places.length} {places.length === 1 ? 'ítem' : 'ítems'}</div>
        </div>

        {/* Business Search */}
        <div style={{ position: 'relative', marginBottom: 10, zIndex: 20 }}>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: T.sub }}><Icon name="search" size={17} /></div>
            <input type="text" placeholder="Buscar negocio en CityMap..." value={searchQ}
              onChange={e => { setSearchQ(e.target.value); setIsSearching(true); }}
              onFocus={() => setIsSearching(true)}
              className="focus-ring"
              style={{ ...inputStyle, paddingLeft: 40 }} />
            {searchQ && (
              <button onClick={() => { setSearchQ(''); setIsSearching(false); }} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: T.sub, cursor: 'pointer', padding: 4 }}>
                <Icon name="x" size={15} />
              </button>
            )}
          </div>

          <AnimatePresence>
            {isSearching && searchQ.trim().length > 1 && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 12px 32px rgba(0,0,0,0.12)', zIndex: 30 }}>
                {searchResults.length > 0 ? searchResults.map(b => (
                  <div key={b.id} onClick={() => addBusiness(b)} className="press"
                    style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                    <div style={{ width: 42, height: 42, borderRadius: 8, backgroundImage: `url(${b.logo_url || b.photos?.[0]?.url})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: dark ? 'rgba(255,255,255,0.05)' : '#F3F4F6', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{b.name}</div>
                      <div style={{ fontSize: 12, color: T.sub }}>{b.category}</div>
                    </div>
                  </div>
                )) : (
                  <div style={{ padding: 16, textAlign: 'center', color: T.sub, fontSize: 14 }}>No se encontraron lugares</div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Custom Activity */}
        {!showCustomForm && (
          <button onClick={() => setShowCustomForm(true)} className="press"
            style={{ width: '100%', padding: '12px 16px', marginBottom: 20, background: dark ? 'rgba(124,58,237,0.15)' : '#F3E8FF', border: 'none', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#7C3AED', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
            <Icon name="plus" size={16} /> Agregar actividad personalizada
          </button>
        )}

        <AnimatePresence>
          {showCustomForm && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              style={{ background: dark ? 'rgba(255,255,255,0.05)' : '#F9FAFB', border: `1px solid ${T.border}`, borderRadius: 16, padding: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.sub, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.8 }}>Nueva actividad</div>

              <div style={{ marginBottom: 10, position: 'relative' }}>
                <button onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  style={{ background: dark ? 'rgba(255,255,255,0.08)' : '#fff', border: `1px solid ${T.border}`, borderRadius: 10, padding: '8px 14px', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, color: T.text }}>
                  <span>{customEmoji}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.sub }}>Cambiar ícono</span>
                </button>
                <AnimatePresence>
                  {showEmojiPicker && (
                    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 40, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 14, padding: 12, display: 'flex', flexWrap: 'wrap', gap: 8, boxShadow: '0 12px 32px rgba(0,0,0,0.1)', width: 240 }}>
                      {CUSTOM_EMOJIS.map(em => (
                        <button key={em} onClick={() => { setCustomEmoji(em); setShowEmojiPicker(false); }}
                          style={{ fontSize: 22, background: customEmoji === em ? (dark ? 'rgba(255,255,255,0.1)' : '#E9E3FE') : 'none', border: 'none', borderRadius: 8, width: 40, height: 40, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {em}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <input type="text" placeholder="ej: Recoger a mi hijo, Ir al banco..." value={customName}
                onChange={e => setCustomName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCustomActivity()}
                className="focus-ring" style={{ ...inputStyle, marginBottom: 10 }} autoFocus />

              <input type="text" placeholder="📍 Dirección (Opcional)" value={customAddress}
                onChange={e => setCustomAddress(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCustomActivity()}
                className="focus-ring" style={{ ...inputStyle, marginBottom: 12, fontSize: 13 }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.sub, textTransform: 'uppercase' }}>Hora:</div>
                <input type="time" value={customTime}
                  onChange={e => setCustomTime(e.target.value)}
                  className="focus-ring" style={{ ...inputStyle, flex: 1 }} />
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setShowCustomForm(false); setCustomName(''); }}
                  style={{ flex: 1, padding: '10px 0', background: 'none', border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 14, fontWeight: 600, color: T.sub, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button onClick={addCustomActivity}
                  style={{ flex: 2, padding: '10px 0', background: '#7C3AED', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
                  + Añadir
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <PlanSummary places={places} T={T} dark={dark} />

        {/* DnD List */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="places-list">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {places.map((item, index) => (
                  <Draggable key={item.id} draggableId={item.id} index={index}>
                    {(provided, snapshot) => (
                      <div ref={provided.innerRef} {...provided.draggableProps}
                        style={{ ...provided.draggableProps.style, background: T.white, border: `1px solid ${snapshot.isDragging ? '#7C3AED' : T.border}`, borderRadius: 16, padding: 12, boxShadow: snapshot.isDragging ? '0 12px 24px rgba(124,58,237,0.15)' : 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>

                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                          <div {...provided.dragHandleProps} style={{ padding: '10px 2px', color: T.sub, cursor: 'grab', flexShrink: 0 }}>
                            <Icon name="menu" size={20} />
                          </div>

                          {item.type === 'custom' ? (
                            <div style={{ width: 48, height: 48, borderRadius: 12, background: dark ? 'rgba(255,255,255,0.08)' : '#F3E8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                              {item.customEmoji}
                            </div>
                          ) : (
                            <div style={{ width: 48, height: 48, borderRadius: 12, backgroundImage: `url(${item.business?.logo_url || item.business?.photos?.[0]?.url})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: dark ? 'rgba(255,255,255,0.05)' : '#F3F4F6', flexShrink: 0 }} />
                          )}

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 15, fontWeight: 700, color: T.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#7C3AED', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, flexShrink: 0 }}>
                                {index + 1}
                              </span>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {item.type === 'custom' ? item.customName : item.business?.name}
                              </span>
                            </div>
                            <div style={{ fontSize: 12, color: T.sub, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                              {item.type === 'custom' ? '✏️ Actividad personalizada' : item.business?.category}
                              {item.type === 'custom' && item.customAddress && (
                                <><span style={{ opacity: 0.5 }}>·</span><span>📍 {item.customAddress}</span></>
                              )}
                            </div>
                          </div>

                          <button onClick={() => removePlace(item.id)} style={{ background: 'none', border: 'none', color: '#EF4444', padding: 8, cursor: 'pointer', flexShrink: 0 }}>
                            <Icon name="trash" size={17} />
                          </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 32 }}>
                          {index > 0 && item.business?.lat && places[index-1].business?.lat && (
                            <div style={{ fontSize: 11, color: '#10B981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, marginTop: -6, marginBottom: 2 }}>
                              <Icon name="nav" size={10} color="#10B981" />
                              {(() => {
                                const prev = places[index-1].business;
                                const dist = getKm(parseFloat(prev.lat), parseFloat(prev.lng), parseFloat(item.business.lat), parseFloat(item.business.lng));
                                const mins = Math.max(1, Math.round(dist * 3)); // approx 3 mins per km driving
                                return `${dist < 1 ? Math.round(dist*1000) + 'm' : dist.toFixed(1) + 'km'} (aprox. ${mins} min)`;
                              })()}
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {/* Hora — select dropdown visible en iOS */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: dark ? 'rgba(255,255,255,0.08)' : '#F3F4F6', border: `1px solid ${T.border}`, borderRadius: 10, padding: '6px 10px', flex: 1, minWidth: 110 }}>
                              <span style={{ fontSize: 13 }}>🕐</span>
                              <select
                                value={item.timeHint || ''}
                                onChange={e => updatePlace(item.id, 'timeHint', e.target.value)}
                                style={{ flex: 1, fontSize: 13, background: 'transparent', border: 'none', color: T.text, outline: 'none', cursor: 'pointer', fontWeight: item.timeHint ? 700 : 400 }}
                              >
                                <option value="">Sin hora</option>
                                {Array.from({ length: 48 }, (_, i) => {
                                  const h = Math.floor(i / 2);
                                  const m = i % 2 === 0 ? '00' : '30';
                                  const val = `${String(h).padStart(2, '0')}:${m}`;
                                  const label = `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${m} ${h < 12 ? 'a.m.' : 'p.m.'}`;
                                  return <option key={val} value={val}>{label}</option>;
                                })}
                              </select>
                            </div>
                            {/* Duración — select dropdown */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: dark ? 'rgba(255,255,255,0.08)' : '#F3F4F6', border: `1px solid ${T.border}`, borderRadius: 10, padding: '6px 10px', flex: 1, minWidth: 110 }}>
                              <span style={{ fontSize: 13 }}>⏱</span>
                              <select
                                value={item.durationMin || ''}
                                onChange={e => updatePlace(item.id, 'durationMin', e.target.value ? parseInt(e.target.value) : '')}
                                style={{ flex: 1, fontSize: 13, background: 'transparent', border: 'none', color: T.text, outline: 'none', cursor: 'pointer', fontWeight: item.durationMin ? 700 : 400 }}
                              >
                                <option value="">Duración</option>
                                <option value="30">30 min</option>
                                <option value="60">1 hora</option>
                                <option value="90">1.5 horas</option>
                                <option value="120">2 horas</option>
                                <option value="150">2.5 horas</option>
                                <option value="180">3 horas</option>
                                <option value="240">4 horas</option>
                                <option value="300">5 horas</option>
                              </select>
                            </div>
                          </div>

                          <input type="text" placeholder="Añadir nota opcional a esta actividad..." value={item.note} onChange={e => updatePlace(item.id, 'note', e.target.value)}
                            className="focus-ring" style={{ width: '100%', padding: '7px 12px', fontSize: 13, background: dark ? 'rgba(255,255,255,0.05)' : '#F9FAFB', border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, outline: 'none', boxSizing: 'border-box' }} />
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {places.length === 0 && (
          <div style={{ textAlign: 'center', padding: '36px 20px', color: T.sub, border: `2px dashed ${T.border}`, borderRadius: 16 }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🗺️</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>El itinerario está vacío</div>
            <div style={{ fontSize: 13, marginTop: 4, lineHeight: 1.5 }}>Busca negocios de CityMap o agrega una actividad personalizada.</div>
          </div>
        )}

        {/* Extra Sections */}
        <div style={{ marginTop: 30, display: 'flex', flexDirection: 'column', gap: 10 }}>
          
          <div style={{ fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 4 }}>Detalles Opcionales</div>
          
          {/* Presupuesto Accordion */}
          <div style={{ background: dark ? 'rgba(255,255,255,0.05)' : '#fff', border: `1px solid ${T.border}`, borderRadius: 16, overflow: 'hidden' }}>
             <div onClick={() => setOpenSection(openSection === 'budget' ? null : 'budget')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', cursor: 'pointer' }}>
               <div style={{ fontSize: 15, fontWeight: 700, color: T.text, display: 'flex', alignItems: 'center', gap: 10 }}><span>💳</span> Presupuesto Estimado {Number(budget) > 0 && <span style={{ background: T.border, color: T.text, padding: '2px 8px', borderRadius: 12, fontSize: 11 }}>${budget}</span>}</div>
               <Icon name="chevron" size={16} color={T.sub} style={{ transform: openSection === 'budget' ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
             </div>
             {openSection === 'budget' && (
               <div style={{ padding: '0 16px 16px' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                   <span style={{ fontSize: 18, color: T.sub, fontWeight: 700 }}>$</span>
                   <input type="number" placeholder="Ej. 1500" value={budget} onChange={e => setBudget(e.target.value)} className="focus-ring" style={{ ...inputStyle, padding: '10px 14px' }} />
                 </div>
               </div>
             )}
          </div>

          {/* Checklist Accordion */}
          <div style={{ background: dark ? 'rgba(255,255,255,0.05)' : '#fff', border: `1px solid ${T.border}`, borderRadius: 16, overflow: 'hidden' }}>
             <div onClick={() => setOpenSection(openSection === 'checklist' ? null : 'checklist')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', cursor: 'pointer' }}>
               <div style={{ fontSize: 15, fontWeight: 700, color: T.text, display: 'flex', alignItems: 'center', gap: 10 }}><span>🎒</span> Cosas por llevar {checklist.length > 0 && <span style={{ background: T.border, color: T.text, padding: '2px 8px', borderRadius: 12, fontSize: 11 }}>{checklist.length}</span>}</div>
               <Icon name="chevron" size={16} color={T.sub} style={{ transform: openSection === 'checklist' ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
             </div>
             {openSection === 'checklist' && (
               <div style={{ padding: '0 16px 16px' }}>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                   {checklist.map((c, i) => (
                     <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: dark ? 'rgba(0,0,0,0.2)' : '#F9FAFB', borderRadius: 8 }}>
                       <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${T.border}` }} />
                       <div style={{ flex: 1, fontSize: 14, color: T.text }}>{c}</div>
                       <button onClick={() => setChecklist(checklist.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', color: '#EF4444', padding: 4, cursor: 'pointer' }}><Icon name="x" size={14} /></button>
                     </div>
                   ))}
                 </div>
                 <div style={{ display: 'flex', gap: 8 }}>
                   <input type="text" placeholder="Ej. Bloqueador solar..." value={checkInput} onChange={e => setCheckInput(e.target.value)} onKeyDown={e => { if(e.key === 'Enter' && checkInput.trim()) { setChecklist([...checklist, checkInput.trim()]); setCheckInput(''); } }} className="focus-ring" style={{ ...inputStyle, padding: '10px 14px', fontSize: 14 }} />
                   <button onClick={() => { if(checkInput.trim()) { setChecklist([...checklist, checkInput.trim()]); setCheckInput(''); } }} style={{ padding: '0 16px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12, color: T.text, fontWeight: 700, cursor: 'pointer' }}>Añadir</button>
                 </div>
               </div>
             )}
          </div>

          {/* Notas Accordion */}
          <div style={{ background: dark ? 'rgba(255,255,255,0.05)' : '#fff', border: `1px solid ${T.border}`, borderRadius: 16, overflow: 'hidden' }}>
             <div onClick={() => setOpenSection(openSection === 'notes' ? null : 'notes')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', cursor: 'pointer' }}>
               <div style={{ fontSize: 15, fontWeight: 700, color: T.text, display: 'flex', alignItems: 'center', gap: 10 }}><span>📝</span> Notas Adicionales {notes && <span style={{ background: T.border, color: T.text, padding: '2px 8px', borderRadius: 12, fontSize: 11 }}>1</span>}</div>
               <Icon name="chevron" size={16} color={T.sub} style={{ transform: openSection === 'notes' ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
             </div>
             {openSection === 'notes' && (
               <div style={{ padding: '0 16px 16px' }}>
                 <textarea placeholder="Escribe consejos, requerimientos o notas para los viajeros..." value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="focus-ring" style={{ ...inputStyle, resize: 'vertical' }} />
               </div>
             )}
          </div>

        </div>

      </div>

      <AnimatePresence>
        {showPreview && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            style={{ position: 'absolute', inset: 0, background: T.bg, zIndex: 100, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: T.glassBg, borderBottom: `1px solid ${T.border}` }}>
              <button onClick={() => setShowPreview(false)} className="press" style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.text, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 15 }}><Icon name="chevron" size={20} style={{ transform: 'rotate(180deg)' }} /> Volver</button>
              <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>Vista Previa</div>
              <div style={{ width: 60 }} />
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
              <div style={{ width: '100%', height: 200, borderRadius: 20, backgroundImage: `url(${coverUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', background: coverUrl ? undefined : '#E4E8E4', marginBottom: 20 }} />
              <div style={{ fontSize: 32, marginBottom: 8 }}>{emoji}</div>
              <h1 style={{ fontSize: 24, fontWeight: 900, color: T.text, marginBottom: 8 }}>{name || 'Plan Sin Nombre'}</h1>
              <p style={{ color: T.sub, fontSize: 15, lineHeight: 1.5, marginBottom: 20 }}>{description}</p>
              
              {startDate && <div style={{ fontSize: 14, color: T.text, marginBottom: 8 }}>📅 {new Date(startDate).toLocaleString()}</div>}
              {category && <div style={{ fontSize: 14, color: T.text, marginBottom: 8 }}>🏷️ {category}</div>}
              {tags.length > 0 && <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>{tags.map(t => <span key={t} style={{ background: '#F3E8FF', color: '#6D28D9', padding: '4px 8px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>#{t}</span>)}</div>}
              
              <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 20, marginBottom: 12 }}>Itinerario ({places.length})</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {places.map((p, i) => (
                  <div key={p.id} style={{ background: dark ? 'rgba(255,255,255,0.05)' : '#fff', border: `1px solid ${T.border}`, borderRadius: 12, padding: 12 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: T.text }}>{i+1}. {p.type === 'custom' ? p.customName : p.business?.name}</div>
                    {(p.timeHint || p.durationMin) && (
                      <div style={{ fontSize: 12, color: T.sub, marginTop: 4 }}>🕒 {p.timeHint} {p.durationMin ? `(${p.durationMin} min)` : ''}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
