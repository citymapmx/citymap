// Hoja de confirmación dentro de la app (lealtad, 14 Nov 2026).
//
// Sustituye al confirm nativo en el módulo de lealtad: en el WebView de
// la app el confirm nativo NO aparece y el toque no hacía nada (misma
// lección que la PR #313 con el borrado de reservaciones). Es una hoja
// centrada que funciona igual en móvil y escritorio.
//
// Modo oscuro (14 Nov 2026, lote lealtad): la hoja era blanca fija
// (#fff) con texto oscuro fijo. En oscuro pasa a T.surface/T.card con
// texto del tema; el botón de confirmar se queda en #DC2626 en los dos
// modos (blanco sobre él: 4.83:1; sobre el rojo claro del tema oscuro
// caería a 2.92:1). T es opcional: sin él se pinta como antes (claro).
//
// Centrada con portal (16 Nov 2026, Jonathan): la hoja se abría ABAJO y
// los botones quedaban cortados por la barra inferior. Causa: la hoja
// usa position: fixed, pero el diseñador de lealtad se monta DENTRO de
// Mi Perfil sin portal y la raíz de esa vista lleva transform
// (viewStyle en AccountView.jsx) — el transform atrapa el fixed y la
// hoja se centraba en la página entera (más alta que la pantalla), no
// en el viewport. Misma lección que el MenuStyleDesigner, que sí usa
// createPortal a document.body. Aquí el portal va en el componente
// mismo, así los dos usos (borrar cliente en el diseñador y quitar sello
// en la ficha) quedan centrados. Sin document (pruebas/SSR) se pinta
// en línea como antes.
import React from 'react';
import { createPortal } from 'react-dom';

export default function LoyaltyConfirmSheet({
  T,
  title,
  message,
  confirmLabel = 'Eliminar',
  cancelLabel = 'Cancelar',
  busy = false,
  onConfirm,
  onCancel,
}) {
  const dark = !!T?.dark;
  const surface = T ? (T.surface || T.card) : '#fff';
  const titleColor = dark ? T.text : '#0F172A';
  const messageColor = dark ? T.sub : '#475569';
  const sheet = (
    <div
      role="alertdialog"
      aria-label={title}
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 12000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: surface, width: '100%', maxWidth: 420, borderRadius: 20,
          padding: 24, boxShadow: '0 20px 48px rgba(0,0,0,0.25)',
        }}
      >
        <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: titleColor }}>{title}</h3>
        {message && (
          <p style={{ margin: '0 0 20px', fontSize: 14, color: messageColor, lineHeight: 1.55 }}>{message}</p>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onCancel}
            disabled={busy}
            style={{
              flex: 1, padding: '13px 16px', background: dark ? T.border : '#F1F5F9', color: dark ? T.text : '#0F172A',
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
  // En el navegador, el portal a document.body saca la hoja del árbol
  // con transform: el fixed es el viewport de verdad y la hoja queda
  // centrada en la pantalla del celular. Sin document (pruebas/SSR) se
  // pinta en línea como antes.
  if (typeof document !== 'undefined' && document.body) {
    return createPortal(sheet, document.body);
  }
  return sheet;
}
