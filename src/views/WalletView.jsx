import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { sb } from '../lib/supabase.js';
import Icon from '../components/ui/Icon.jsx';
import CouponCard from '../components/ui/CouponCard.jsx';
import LoyaltyCardModal from './LoyaltyCardModal.jsx';
import { useUIStore } from '../store/useUIStore.js';
import LoyaltyCard from '../components/loyalty/LoyaltyCard.jsx';
import { loadLoyaltyEntries } from '../lib/loyaltyMemberships.js';

export default function WalletView({ T, dark, user, setShowAuth }) {
  const navigate = useNavigate();
  const activeCity = useUIStore(s => s.activeCity);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);

  const [suggestions, setSuggestions] = useState([]);
  const [couponsList, setCouponsList] = useState([]);
  const [claimedCoupons, setClaimedCoupons] = useState({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem("citymap_claims");
      if (stored) setClaimedCoupons(JSON.parse(stored));
    } catch(e){ /* ignore */ }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    let myBizIds = new Set();
    
    try {
      const loadedEntries = await loadLoyaltyEntries(user);
      // Los negocios con membresía no se vuelven a sugerir abajo.
      // (Antes se tomaban de las membresías sin filtrar; ahora de las
      // entradas ya unidas con su tarjeta y su negocio.)
      loadedEntries.forEach(e => myBizIds.add(e.biz.id));
      setEntries(loadedEntries);

      // Fetch active loyalty cards for suggestions (ignoring the ones user already has)
      const allCards = await sb.get('loyalty_cards', '?active=eq.true&limit=10') || [];
      
      // Asegurarse de que myBizIds contenga los biz_ids correctamente, incluso si difieren por espacios o tipos
      const activeBizSet = new Set(Array.from(myBizIds).map(id => String(id).trim()));
      const sugCards = allCards.filter(c => !activeBizSet.has(String(c.biz_id).trim()));

      
      if (sugCards.length > 0) {
        const bizIds = sugCards.map(c => `"${c.biz_id}"`).join(',');
        const sugBiz = await sb.get('businesses', `?id=in.(${bizIds})`) || [];
        
        const mapped = sugCards.map(c => {
          const b = sugBiz.find(b => b.id === c.biz_id);
          if (!b) return null;
          if (activeCity && activeCity !== 'todas' && b.city_slug !== activeCity) return null;
          return { card: c, biz: b };
        }).filter(Boolean);
        
        setSuggestions(mapped);
      } else {
        setSuggestions([]);
      }

      // Fetch active coupons
      let publicCoupons = [];
      try {
        publicCoupons = await sb.get('coupons', '?active=eq.true&is_public=eq.true&limit=10') || [];
      } catch (err) {
        try { publicCoupons = await sb.get('coupons', '?active=eq.true&limit=10') || []; } catch(e){ /* ignore */ }
      }
      
      if (publicCoupons.length > 0) {
        const couponBizIds = [...new Set(publicCoupons.map(c => c.biz_id))].map(id => `"${id}"`).join(',');
        const couponBiz = await sb.get('businesses', `?id=in.(${couponBizIds})`) || [];
        
        const mappedCoupons = publicCoupons.map(c => {
          const b = couponBiz.find(b => b.id === c.biz_id);
          return b ? { coupon: c, biz: b } : null;
        }).filter(Boolean);
        
        setCouponsList(mappedCoupons);
      } else {
        setCouponsList([]);
      }

    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [user, activeCity]);

  useEffect(() => { load(); }, [load]);

  const bg = dark ? '#0f172a' : '#ffffff';
  const text = T?.text || '#111';
  const sub = T?.sub || '#888';
  const cardBg = T?.bg || '#fff';

  return (
    <div style={{ minHeight: '100dvh', background: 'transparent', paddingBottom: 90, position: 'relative', zIndex: 1 }}>
      <div style={{ padding: 'calc(env(safe-area-inset-top, 0px) + 20px) 20px 0', background: 'transparent' }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: text, letterSpacing: '-0.5px' }}>Recompensas</h1>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: sub, fontWeight: 500 }}>Tus tarjetas y beneficios activos</p>
      </div>

      <div style={{ padding: '24px 20px 0' }}>
        {entries.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Icon name="award" size={18} color={text} />
            <span style={{ fontSize: 15, fontWeight: 800, color: text }}>Tus Tarjetas Activas</span>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <div style={{ width: 28, height: 28, border: '3px solid rgba(0,0,0,0.1)', borderTop: `3px solid ${text}`, borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
          </div>
        ) : entries.length > 0 ? (
          <div style={{ position: 'relative', minHeight: entries.length > 0 ? (entries.length * 70) + 200 : 'auto', marginBottom: 32 }}>
            {entries.map(({ member, card, biz }, i) => (
              <div 
                key={member.id} 
                style={{ 
                  position: 'absolute', 
                  top: i * 70, 
                  left: 0, 
                  right: 0, 
                  zIndex: i,
                  transform: `scale(${1 - ((entries.length - 1 - i) * 0.05)}) translateY(${-(entries.length - 1 - i) * 10}px)`,
                  transformOrigin: 'top center',
                  transition: 'all 0.3s cubic-bezier(0.34, 1.1, 0.64, 1)'
                }}
              >
                <LoyaltyCard member={member} card={card} biz={biz} dark={dark} T={T} onCardClick={setSelectedCard} />
              </div>
            ))}
          </div>
        ) : null}

        {!loading && suggestions.length > 0 && (
          <div style={{ marginTop: entries.length > 0 ? 0 : 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Icon name="gift" size={18} color={text} />
              <span style={{ fontSize: 15, fontWeight: 800, color: text }}>Gana premios en estos lugares</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {suggestions.map(({ card, biz }) => (
                <div key={card.id} onClick={() => navigate(`/lealtad/${biz.id}`)} style={{ background: cardBg, borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', border: `1px solid ${dark ? '#333' : '#E2E8F0'}`, cursor: 'pointer' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: card.bg_color, padding: 2, flexShrink: 0, overflow: 'hidden' }}>
                    {card.logo_url ? <img src={card.logo_url} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="award" size={20} color={card.text_color} /></div>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{biz.name}</div>
                    <div style={{ fontSize: 13, color: sub, marginTop: 4 }}>{card.reward_text}</div>
                  </div>
                  <div style={{ background: text, color: bg, padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 800 }}>
                    Ver Tarjeta
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && couponsList.length > 0 && (
          <div style={{ marginTop: (entries.length > 0 || suggestions.length > 0) ? 24 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Icon name="coupon" size={18} color={text} />
              <span style={{ fontSize: 15, fontWeight: 800, color: text }}>Cupones Disponibles</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {couponsList.map(({ coupon: c, biz }) => {
                let rewardTitle;
                if (c.discount_type === "fixed") rewardTitle = `-$${c.discount_amount}`;
                else if (c.discount_type === "promo") rewardTitle = "Promoción";
                else rewardTitle = `-${c.discount_pct}%`;
                const claimedAt = claimedCoupons[c.id];
                let isExpired = false;
                let timeLeftStr = "";
                let uniqueCode = c.code;

                if (claimedAt) {
                   uniqueCode = c.code + "-" + claimedAt.toString().slice(-4);
                }

                return (
                  <div key={c.id}>
                    <CouponCard 
                      coupon={c} 
                      bizName={biz.name} 
                      dark={dark} 
                      isClaimed={!!claimedAt}
                      uniqueCode={uniqueCode}
                      onClick={() => navigate(biz.slug ? `/${biz.slug}` : `/lugar/${biz.id}`)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!loading && entries.length === 0 && suggestions.length === 0 && couponsList.length === 0 && (
          <div style={{ background: cardBg, borderRadius: 16, padding: 24, textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎁</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: text, marginBottom: 6 }}>No hay recompensas activas</div>
            <div style={{ fontSize: 13, color: sub, marginBottom: 20 }}>Visita los negocios de la ciudad y busca el ícono de lealtad para empezar a ganar.</div>
            <button onClick={() => navigate('/')} style={{ padding: '12px 28px', background: '#000', color: '#fff', borderRadius: 12, border: 'none', fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
              Explorar negocios
            </button>
          </div>
        )}
      </div>

      {/* Boletos section removed for now */}

      <LoyaltyCardModal 
        open={!!selectedCard} 
        onClose={() => setSelectedCard(null)} 
        {...selectedCard} 
      />
    </div>
  );
}
