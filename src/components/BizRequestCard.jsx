import { bizRequestState } from '../lib/notifications.js';

// Tarjeta de «Mis solicitudes» en /cuenta. Toda la tarjeta es tocable y
// abre la edición del negocio (onEdit); con cambios solicitados la
// pastilla dice «Se requieren cambios» en rojo y se ven las notas del
// admin sin entrar a Notificaciones.
export default function BizRequestCard({ b, T, dark, t, onEdit }) {
  const st = bizRequestState(b);
  return (
    <div
      onClick={() => onEdit(b)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEdit(b); } }}
      style={{ background: T.white, borderRadius: 12, padding: '12px 14px', marginBottom: 8, border: `1px solid ${T.border}`, cursor: 'pointer' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: T.text }}>{b.name}</div>
          <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>{b.type || b.category}</div>
        </div>
        <span style={{
          background: st.needsChanges ? (dark ? 'rgba(239,68,68,0.16)' : '#FEF2F2') : T.bg,
          color: st.needsChanges ? (dark ? '#F87171' : '#DC2626') : T.text,
          border: `1px solid ${st.needsChanges ? (dark ? 'rgba(239,68,68,0.4)' : '#FECACA') : T.border}`,
          borderRadius: 20, padding: '3px 10px', fontSize: 10, fontWeight: 700, flexShrink: 0, marginLeft: 8,
        }}>{t(st.pillKey, st.pillDefault)}</span>
      </div>
      {b.admin_notes && (
        <div style={{ background: T.bg, borderRadius: 8, padding: '8px 10px', fontSize: 12, color: T.sub, borderLeft: `3px solid ${st.needsChanges ? '#EF4444' : T.border}`, marginBottom: 8 }}>{b.admin_notes}</div>
      )}
      {st.showEdit && (
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(b); }}
          style={{ width: '100%', padding: '9px 0', background: T.text, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, color: T.bg, cursor: 'pointer', fontFamily: 'inherit' }}
        >{t('editar_reenviar', 'Editar y reenviar')}</button>
      )}
    </div>
  );
}
