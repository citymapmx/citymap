// Ficha de un cliente de lealtad (14 Nov 2026, rama lealtad-historial).
//
// Referencia de diseño: capturas de «Detalle del cliente» de Jonathan.
// - Progreso X de N sellos con barra, última visita con fecha y hora.
// - Historial individual de sellos con fecha y hora exactas (cada sello
//   es un registro de `loyalty_stamp_events`, no solo un contador).
// - Recompensas entregadas a este cliente.
// - Quitar un sello concreto del historial (con confirmación dentro de
//   la app, nunca el confirm nativo) o el último sello.
// - El progreso se recalcula solo: el padre actualiza el contador y
//   aquí se recarga el historial tras cada movimiento.
//
// Los sellos anteriores al historial (sin fecha real) se muestran como
// «Sellos anteriores», sin inventarles fecha. Si la migración aún no
// está aplicada, el historial avisa y no se rompe nada.
import React, { useState, useEffect, useCallback } from 'react';
import Icon from '../ui/Icon.jsx';
import LoyaltyWhatsAppButton from './LoyaltyWhatsAppButton.jsx';
import LoyaltyConfirmSheet from './LoyaltyConfirmSheet.jsx';
import {
  loadMemberStampEvents,
  deriveMemberProgress,
  formatStampDate,
  formatStampDateTime,
  stampEventLabel,
  isStampVoided,
  latestActiveStampEvent,
} from '../../lib/loyaltyStampHistory.js';

export default function LoyaltyMemberDetail({
  member,
  config,
  business,
  T,
  isMobile,
  onClose,
  onGiveStamp,
  onRemoveStamp,
}) {
  const [events, setEvents] = useState([]);
  const [historySupported, setHistorySupported] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [tab, setTab] = useState('historial');
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(null); // { event|null, title, message }

  const stampsRequired = config?.stamps_required || 5;
  const rewardText = config?.reward_text || '';

  const memberId = member?.id;
  const memberBizId = member?.biz_id;

  const reloadEvents = useCallback(async () => {
    if (!memberId) return;
    const { events: rows, supported } = await loadMemberStampEvents(memberId, memberBizId);
    setEvents(rows);
    setHistorySupported(supported);
    setLoadingEvents(false);
  }, [memberId, memberBizId]);

  useEffect(() => {
    setLoadingEvents(true);
    reloadEvents();
  }, [reloadEvents]);

  if (!member) return null;

  const progress = deriveMemberProgress(member, events);
  const current = progress.current;
  const isCompleted = current >= stampsRequired;
  const remaining = Math.max(0, stampsRequired - current);
  const pct = stampsRequired > 0 ? Math.min(100, Math.round((current / stampsRequired) * 100)) : 0;
  const rewards = events.filter((e) => e.event_type === 'reward_delivered');
  const latestActive = latestActiveStampEvent(events);

  const handleGiveStamp = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onGiveStamp(member);
      await reloadEvents();
    } finally {
      setBusy(false);
    }
  };

  const askRemoveStamp = (eventToVoid) => {
    if (eventToVoid) {
      setConfirmRemove({
        event: eventToVoid,
        title: `¿Quitar el ${stampEventLabel(eventToVoid)}?`,
        message: `Se quitará el sello del ${formatStampDateTime(eventToVoid.created_at)} de ${member.name || member.email || 'este cliente'}. El movimiento queda registrado en el historial como sello eliminado.`,
      });
    } else {
      setConfirmRemove({
        event: null,
        title: '¿Quitar 1 sello anterior?',
        message: `Se quitará 1 sello de los ${progress.legacyActive} sellos anteriores (sin fecha registrada) de ${member.name || member.email || 'este cliente'}. El movimiento queda registrado en el historial.`,
      });
    }
  };

  const doRemoveStamp = async () => {
    if (busy || !confirmRemove) return;
    setBusy(true);
    try {
      await onRemoveStamp(member, confirmRemove.event);
      setConfirmRemove(null);
      await reloadEvents();
    } finally {
      setBusy(false);
    }
  };

  const removedEventFor = (eventId) =>
    events.find((e) => e.event_type === 'stamp_removed' && e.voids_event_id === eventId);

  // Modo oscuro (14 Nov 2026): T.surface aún no existe en main, así
  // que el fallback es T.card (#232326 en oscuro, #FFFFFF en claro).
  // El '#fff' fijo de antes dejaba el texto del tema (casi blanco en
  // oscuro) invisible sobre tarjeta blanca: 1.1:1.
  const cardStyle = {
    background: T.surface || T.card,
    border: `1px solid ${T.border}`,
    borderRadius: 16,
    padding: 16,
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: T.bg, zIndex: 10001,
        display: 'flex', flexDirection: 'column', overflowY: 'auto',
      }}
    >
      {/* HEADER */}
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${T.border}`, background: T.bg, position: 'sticky', top: 0, zIndex: 2 }}>
        <button
          onClick={onClose}
          aria-label="Volver a la lista de clientes"
          style={{ width: 36, height: 36, borderRadius: '50%', background: T.border, color: T.text, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
        >
          <Icon name="arrow_left" size={18} />
        </button>
        <h2 style={{ margin: 0, flex: 1, fontSize: isMobile ? 16 : 18, fontWeight: 800, color: T.text }}>Detalle del cliente</h2>
        <button
          onClick={onClose}
          aria-label="Cerrar"
          style={{ width: 34, height: 34, borderRadius: '50%', background: T.border, color: T.text, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
        >
          <Icon name="x" size={15} />
        </button>
      </div>

      <div style={{ padding: isMobile ? 16 : 24, maxWidth: 560, width: '100%', margin: '0 auto', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* IDENTIDAD */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#E2E8F0', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, flexShrink: 0 }}>
            {(member.name || member.email || 'C').trim().charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {member.name || member.email || 'Cliente'}
            </div>
            <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>
              Cliente desde: {progress.enrolledAt ? formatStampDate(progress.enrolledAt) : '—'}
            </div>
          </div>
          <span style={{ background: '#DCFCE7', color: '#15803D', fontSize: 12, fontWeight: 800, padding: '5px 12px', borderRadius: 999, flexShrink: 0 }}>Activo</span>
        </div>

        {/* STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="user" size={18} color={T.sub} />
              <span style={{ fontSize: 22, fontWeight: 900, color: T.text }}>{current}</span>
            </div>
            <div style={{ fontSize: 12, color: T.sub, marginTop: 4, fontWeight: 600 }}>Sellos obtenidos</div>
          </div>
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="gift" size={18} color={T.red || '#DC2626'} />
              <span style={{ fontSize: 22, fontWeight: 900, color: T.text }}>{progress.rewardsDelivered}</span>
            </div>
            <div style={{ fontSize: 12, color: T.sub, marginTop: 4, fontWeight: 600 }}>Recompensas</div>
          </div>
        </div>

        {/* PROGRESO */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: T.text }}>Progreso de tarjeta</span>
            <span style={{ fontSize: 13, color: T.sub, fontWeight: 600 }}>{current} de {stampsRequired} sellos</span>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: '#E2E8F0', marginTop: 12, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, borderRadius: 999, background: '#22C55E', transition: 'width .3s ease' }} />
          </div>
          <div style={{ marginTop: 10, fontSize: 13, color: isCompleted ? (T.dark ? '#4ADE80' : '#15803D') : T.sub, fontWeight: isCompleted ? 700 : 500 }}>
            {isCompleted
              ? '¡Premio listo para canjear!'
              : `Le faltan ${remaining} ${remaining === 1 ? 'sello' : 'sellos'} para obtener su recompensa.`}
          </div>
          {progress.legacyCount > 0 && (
            <div style={{ marginTop: 8, fontSize: 12, color: T.sub }}>
              Incluye {progress.legacyActive} {progress.legacyActive === 1 ? 'sello anterior' : 'sellos anteriores'} (sin fecha registrada).
            </div>
          )}
        </div>

        {/* DATOS */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '4px 0' }}>
            <span style={{ fontSize: 13, color: T.sub, fontWeight: 600 }}>Última visita</span>
            <span style={{ fontSize: 13, color: T.text, fontWeight: 700, textAlign: 'right' }}>
              {progress.lastVisit ? formatStampDateTime(progress.lastVisit) : 'Sin visitas registradas'}
            </span>
          </div>
          {member.email && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '4px 0', borderTop: `1px solid ${T.border}` }}>
              <span style={{ fontSize: 13, color: T.sub, fontWeight: 600 }}>Email</span>
              <span style={{ fontSize: 13, color: T.text, fontWeight: 600, wordBreak: 'break-all', textAlign: 'right' }}>{member.email}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '8px 0 0', borderTop: `1px solid ${T.border}` }}>
            <span style={{ fontSize: 13, color: T.sub, fontWeight: 600 }}>WhatsApp</span>
            <LoyaltyWhatsAppButton member={member} stampsRequired={stampsRequired} bizName={business?.name} disabled={busy} />
          </div>
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { id: 'historial', label: 'Historial' },
            { id: 'recompensas', label: `Recompensas (${progress.rewardsDelivered})` },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1, padding: '10px 12px', borderRadius: 10, border: 'none',
                background: tab === t.id ? '#000' : T.border, color: tab === t.id ? '#fff' : T.text,
                fontWeight: 800, fontSize: 13, cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* HISTORIAL */}
        {tab === 'historial' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: T.text }}>Historial de actividad</div>
            {!historySupported && (
              <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', color: '#92400E', borderRadius: 12, padding: 12, fontSize: 13, lineHeight: 1.5 }}>
                El historial con fecha se activa al aplicar la migración SQL de la tabla loyalty_stamp_events (ver la PR). Los sellos se siguen guardando en el contador.
              </div>
            )}
            {loadingEvents ? (
              <div style={{ textAlign: 'center', padding: 24, color: T.sub, fontSize: 13 }}>Cargando historial…</div>
            ) : events.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: T.sub, fontSize: 13 }}>
                Aún no hay movimientos con fecha.<br />Los sellos nuevos aparecerán aquí con su fecha y hora exactas.
              </div>
            ) : (
              events.map((e) => {
                if (e.event_type === 'legacy') {
                  return (
                    <div key={e.id} style={{ ...cardStyle, display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon name="clock" size={18} color="#64748B" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Sellos anteriores</div>
                        <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>
                          {Number(e.stamps_after) || 0} {(Number(e.stamps_after) || 0) === 1 ? 'sello otorgado' : 'sellos otorgados'} antes del historial · sin fecha registrada
                        </div>
                      </div>
                    </div>
                  );
                }
                if (e.event_type === 'reward_delivered') {
                  return (
                    <div key={e.id} style={{ ...cardStyle, display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon name="gift" size={18} color="#D97706" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{stampEventLabel(e, rewardText)}</div>
                        <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>{formatStampDateTime(e.created_at)}</div>
                      </div>
                      <span style={{ background: '#DCFCE7', color: '#15803D', fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 999, flexShrink: 0 }}>Entregado</span>
                    </div>
                  );
                }
                if (e.event_type === 'stamp_removed') {
                  return (
                    <div key={e.id} style={{ ...cardStyle, display: 'flex', gap: 12, alignItems: 'center', opacity: 0.75 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon name="trash" size={16} color="#DC2626" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: T.text, textDecoration: 'line-through' }}>{stampEventLabel(e, rewardText)}</div>
                        <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>
                          Eliminado el {formatStampDateTime(e.created_at)}
                          {e.note ? ` · ${e.note}` : ''}
                        </div>
                      </div>
                    </div>
                  );
                }
                if (e.event_type === 'correction') {
                  return (
                    <div key={e.id} style={{ ...cardStyle, display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon name="edit" size={16} color="#475569" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Corrección</div>
                        <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>
                          {formatStampDateTime(e.created_at)}{e.note ? ` · ${e.note}` : ''}
                        </div>
                      </div>
                    </div>
                  );
                }
                // stamp_added
                const voided = isStampVoided(e, events);
                const removedAt = voided ? removedEventFor(e.id) : null;
                return (
                  <div key={e.id} style={{ ...cardStyle, display: 'flex', gap: 12, alignItems: 'center', opacity: voided ? 0.75 : 1 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: voided ? '#FEE2E2' : '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon name={voided ? 'trash' : 'check'} size={18} color={voided ? '#DC2626' : '#15803D'} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: T.text, textDecoration: voided ? 'line-through' : 'none' }}>
                        {stampEventLabel(e, rewardText)}
                      </div>
                      <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>
                        {voided
                          ? `Otorgado el ${formatStampDateTime(e.created_at)} · eliminado el ${removedAt ? formatStampDateTime(removedAt.created_at) : '—'}`
                          : formatStampDateTime(e.created_at)}
                      </div>
                    </div>
                    {!voided && (
                      <button
                        onClick={() => askRemoveStamp(e)}
                        disabled={busy}
                        aria-label={`Quitar el ${stampEventLabel(e)}`}
                        title="Quitar este sello"
                        style={{ background: 'none', border: 'none', color: '#EF4444', padding: 8, cursor: 'pointer', opacity: busy ? 0.3 : 1, flexShrink: 0 }}
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* RECOMPENSAS */}
        {tab === 'recompensas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: T.text }}>Recompensas entregadas</div>
            {rewards.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: T.sub, fontSize: 13 }}>
                Aún no se han entregado recompensas a este cliente.
              </div>
            ) : (
              rewards.map((e) => (
                <div key={e.id} style={{ ...cardStyle, display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon name="gift" size={18} color="#D97706" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{stampEventLabel(e, rewardText)}</div>
                    <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>{formatStampDateTime(e.created_at)}</div>
                  </div>
                  <span style={{ background: '#DCFCE7', color: '#15803D', fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 999, flexShrink: 0 }}>Entregado</span>
                </div>
              ))
            )}
          </div>
        )}

        {/* ACCIONES */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 8 }}>
          <button
            onClick={handleGiveStamp}
            disabled={busy}
            style={{
              width: '100%', padding: '14px 16px', background: isCompleted ? '#F59E0B' : '#000',
              color: '#fff', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 15,
              cursor: 'pointer', opacity: busy ? 0.5 : 1,
            }}
          >
            {busy ? 'Procesando…' : isCompleted ? '🏆 Canjear Premio' : '+ Sello'}
          </button>
          {current > 0 && (
            <button
              onClick={() => askRemoveStamp(latestActive)}
              disabled={busy}
              style={{
                width: '100%', padding: '12px 16px', background: 'transparent', color: T.red || '#DC2626',
                border: T.dark ? `1.5px solid ${T.border}` : '1.5px solid #FECACA', borderRadius: 12, fontWeight: 700, fontSize: 14,
                cursor: 'pointer', opacity: busy ? 0.5 : 1,
              }}
            >
              − Quitar último sello
            </button>
          )}
        </div>
      </div>

      {confirmRemove && (
        <LoyaltyConfirmSheet
          T={T}
          title={confirmRemove.title}
          message={confirmRemove.message}
          confirmLabel="Sí, quitar sello"
          busy={busy}
          onConfirm={doRemoveStamp}
          onCancel={() => setConfirmRemove(null)}
        />
      )}
    </div>
  );
}
