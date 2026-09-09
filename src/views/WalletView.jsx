import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { sb } from '../lib/supabase.js';
import Icon from '../components/ui/Icon.jsx';
import LoyaltyCardModal from './LoyaltyCardModal.jsx';

const STAMPS = Array.from({ length: 10 });

function LoyaltyCard({ member, card, biz, dark, T, onCardClick }) {
  if (!card || !biz) return null;
  const stampsNeeded = card.stamps_required || 5;
  const current = member.stamps || 0;
  const pct = Math.min(current / stampsNeeded, 1);
  const completed = current >= stampsNeeded;

  return (
    <div
      onClick={() => onCardClick({ member, card, biz })}
      style={{
        background: card.bg_color || '#1a1a1a',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        cursor: 'pointer',
      }}
    >
      <div style={{ padding: '24px 20px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#fff', overflow: 'hidden', flexShrink: 0, padding: 2 }}>
          {card.logo_url
            ? <img src={card.logo_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="award" size={22} color={card.text_color || '#fff'} />
              </div>
          }
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: card.text_color || '#fff', lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{biz.name}</div>
          <div style={{ fontSize: 12, color: card.text_color || '#fff', opacity: 0.65, marginTop: 2 }}>Programa de Lealtad</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: card.text_color || '#fff', lineHeight: 1 }}>{current}</div>
          <div style={{ fontSize: 10, color: card.text_color || '#fff', opacity: 0.6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>de {stampsNeeded}</div>
        </div>
      </div>

      {card.type !== 'points' && card.type !== 'cashback' && (
        <div style={{ padding: '0 20px 20px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {STAMPS.slice(0, stampsNeeded).map((_, i) => {
            const filled = i < current;
            const stampIcon = card.type?.includes('|') ? card.type.split('|')[1] : "star";
            return (
              <div key={i} style={{
                width: 32, height: 32, borderRadius: '50%',
                background: filled ? (card.primary_color || card.text_color || '#fff') : 'transparent',
                border: `2px solid ${card.primary_color || card.text_color || '#fff'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: filled ? 1 : 0.35
              }}>
                {filled && <Icon name={stampIcon} size={14} color={card.bg_color || '#000'} />}
              </div>
            );
          })}
        </div>
      )}

      {(card.type === 'points' || card.type === 'cashback') && (
        <div style={{ padding: '0 20px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 42, fontWeight: 900, color: card.text_color || '#fff' }}>{current}</div>
          <div style={{ fontSize: 12, color: card.text_color || '#fff', opacity: 0.6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
            {card.type === 'cashback' ? 'Saldo acumulado' : 'Puntos'}
          </div>
        </div>
      )}

      <div style={{ height: 4, background: `${card.text_color || '#fff'}20` }}>
        <div style={{ height: '100%', width: `${pct * 100}%`, background: card.primary_color || card.text_color || '#fff', borderRadius: 2 }} />
      </div>

      {completed ? (
        <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ fontWeight: 900, fontSize: 13, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: 1, textShadow: "0 2px 10px rgba(245, 158, 11, 0.4)", animation: "pulse 2s infinite" }}>
            ✨ ¡Premio Desbloqueado! ✨
          </div>
        </div>
      ) : (
        <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 11, color: card.text_color || '#fff', opacity: 0.6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Premio</div>
          <div style={{ fontSize: 12, color: card.text_color || '#fff', fontWeight: 800, textAlign: 'right', maxWidth: '65%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.reward_text || '—'}</div>
        </div>
      )}
    </div>
  );
}

export default function WalletView({ T, dark, user, setShowAuth }) {
  const navigate = useNavigate();
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
      if (user) {
        let members = await sb.get('loyalty_members', `?user_id=eq.${user.id}&order=last_stamp_at.desc.nullslast`) || [];
        
        const seenBiz = new Set();
        members = members.filter(m => {
          if (seenBiz.has(m.biz_id)) return false;
          seenBiz.add(m.biz_id);
          myBizIds.add(m.biz_id);
          return true;
        });

        const results = await Promise.all(members.map(async (m) => {
          const [cards, bizArr] = await Promise.all([
            sb.get('loyalty_cards', `?id=eq.${m.card_id}&limit=1`),
            sb.get('businesses', `?id=eq.${m.biz_id}&limit=1`),
          ]);
          return { member: m, card: cards?.[0] || null, biz: bizArr?.[0] || null };
        }));

        setEntries(results.filter(e => e.card && e.biz));
      } else {
        setEntries([]);
      }

      // Fetch active loyalty cards for suggestions (ignoring the ones user already has)
      const allCards = await sb.get('loyalty_cards', '?active=eq.true&limit=10') || [];
      const sugCards = allCards.filter(c => !myBizIds.has(c.biz_id));
      
      if (sugCards.length > 0) {
        const bizIds = sugCards.map(c => `"${c.biz_id}"`).join(',');
        const sugBiz = await sb.get('businesses', `?id=in.(${bizIds})`) || [];
        
        const mapped = sugCards.map(c => {
          const b = sugBiz.find(b => b.id === c.biz_id);
          return b ? { card: c, biz: b } : null;
        }).filter(Boolean);
        
        setSuggestions(mapped);
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
  }, [user]);

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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
            {entries.map(({ member, card, biz }) => (
              <LoyaltyCard key={member.id} member={member} card={card} biz={biz} dark={dark} T={T} onCardClick={setSelectedCard} />
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
                   const diff = 86400000 - (Date.now() - claimedAt);
                   if (diff <= 0) { isExpired = true; timeLeftStr = "Expirado"; }
                   else {
                      const h = Math.floor(diff / 3600000);
                      const m = Math.floor((diff % 3600000) / 60000);
                      timeLeftStr = `${h}h ${m}m restantes`;
                   }
                   uniqueCode = c.code + "-" + claimedAt.toString().slice(-4);
                }

                return (
                  <div key={c.id} onClick={() => navigate(biz.slug ? `/${biz.slug}` : `/lugar/${biz.id}`)} style={{ position: "relative", background: dark ? "#1E293B" : "#fff", borderRadius: 16, border: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "#E5E7EB"}`, overflow: "hidden", boxShadow: dark ? "none" : "0 4px 12px rgba(0,0,0,0.04)", cursor: "pointer" }}>
                    {/* Top Part */}
                    <div style={{ display: "flex", padding: 16, gap: 14 }}>
                      <div style={{ width: 64, height: 64, borderRadius: 12, background: "#F5F3FF", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#7C3AED" }}>
                         <Icon name="coupon" size={24} color="#7C3AED" />
                         <div style={{ fontSize: 12, fontWeight: 900, marginTop: 4 }}>{rewardTitle}</div>
                      </div>
                      
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0 }}>
                        <div className="text-xs" style={{ color: sub, fontWeight: 700, marginBottom: 2 }}>{biz.name}</div>
                        <div className="text-sm" style={{ fontWeight: 800, color: text, lineHeight: 1.2 }}>{c.title}</div>
                        {(c.description || c.terms_conditions) && <div className="text-xs" style={{ color: sub, marginTop: 4, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.description} {c.terms_conditions}</div>}
                      </div>
                    </div>

                    {/* Divider with Cutouts */}
                    <div style={{ position: "relative", height: 20, display: "flex", alignItems: "center" }}>
                      <div style={{ position: "absolute", left: -10, width: 20, height: 20, borderRadius: "50%", background: bg, borderRight: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "#E5E7EB"}` }} />
                      <div style={{ flex: 1, borderTop: `2px dashed ${dark ? "rgba(255,255,255,0.1)" : "#E5E7EB"}`, margin: "0 14px" }} />
                      <div style={{ position: "absolute", right: -10, width: 20, height: 20, borderRadius: "50%", background: bg, borderLeft: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "#E5E7EB"}` }} />
                    </div>

                    {/* Bottom Part */}
                    <div style={{ padding: "12px 16px", background: dark ? "rgba(255,255,255,0.02)" : "#F9FAFB", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      {claimedAt ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", overflow: "hidden" }}>
                           <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="text-micro" style={{ color: sub, letterSpacing: 0, marginBottom: 2 }}>TU CÓDIGO</div>
                              <div style={{ fontSize: 16, fontWeight: 900, color: "#7C3AED", letterSpacing: 1.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{uniqueCode}</div>
                           </div>
                           <button disabled style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: isExpired ? "#9CA3AF" : "#16A34A", color: "#fff", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                             {isExpired ? "Expirado" : <><Icon name="clock" size={14} color="#fff" /> {timeLeftStr}</>}
                           </button>
                        </div>
                      ) : (
                        <div style={{ width: "100%", padding: "10px", borderRadius: 10, border: "none", background: "rgba(124, 58, 237, 0.1)", color: "#7C3AED", fontWeight: 700, fontSize: 13, textAlign: "center" }}>
                          Ver negocio y reclamar
                        </div>
                      )}
                    </div>
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
