// Hoja de confirmación dentro de la app (lealtad, 14 Nov 2026).
//
// Sustituye al confirm nativo en el módulo de lealtad: en el WebView de
// la app el confirm nativo NO aparece y el toque no hacía nada (misma
// lección que la PR #313 con el borrado de reservaciones). Es una hoja
// centrada que funciona igual en móvil y escritorio.
import React from 'react';

export default function LoyaltyConfirmSheet({
  title,
  message,
  confirmLabel = 'Eliminar',
  cancelLabel = 'Cancelar',
  busy = false,
  onConfirm,
  onCancel,
}) {
  return (
    <div
      role="alertdialog"
      aria-label={title}
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 12000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', width: '100%', maxWidth: 420, borderRadius: 20,
          padding: 24, boxShadow: '0 20px 48px rgba(0,0,0,0.25)',
        }}
      >
        <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: '#0F172A' }}>{title}</h3>
        {message && (
          <p style={{ margin: '0 0 20px', fontSize: 14, color: '#475569', lineHeight: 1.55 }}>{message}</p>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onCancel}
            disabled={busy}
            style={{
              flex: 1, padding: '13px 16px', background: '#F1F5F9', color: '#0F172A',
              border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14,
              cursor: 'pointer', opacity: busy ? 0.6 : 1,
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            style={{
              flex: 1, padding: '13px 16px', background: '#DC2626', color: '#fff',
              border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 14,
              cursor: 'pointer', opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? 'Procesando…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
