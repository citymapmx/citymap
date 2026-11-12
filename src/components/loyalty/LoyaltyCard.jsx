// Tarjeta de lealtad de un negocio (la misma que se ve en «Recompensas»
// y en el carrusel del perfil).
//
// Antes vivía dentro de WalletView.jsx; se extrajo aquí para que el perfil
// (ProfileLoyaltyCarousel) y «Recompensas» usen EL MISMO renderizado y no
// dos copias que se desincronicen. El código es el mismo de WalletView.
import React from 'react';
import Icon from '../ui/Icon.jsx';
import { loyaltyBgFirstColor } from '../../lib/loyaltyColorStyles.js';

const STAMPS = Array.from({ length: 10 });

export default function LoyaltyCard({ member, card, biz, dark, T, onCardClick }) {
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
                {filled && <Icon name={stampIcon} size={14} color={loyaltyBgFirstColor(card.bg_color || '#000')} />}
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
