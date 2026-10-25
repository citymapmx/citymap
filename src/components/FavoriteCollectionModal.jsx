import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import Icon from './ui/Icon.jsx';
import { getThumbUrl } from '../lib/utils.js';

export default function FavoriteCollectionModal({ business, collections = [], T, t, onClose, onSelect, onCreate }) {
  const dialog = useRef(null);
  const close = useRef(onClose);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!business) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus({ preventScroll: true });
    const onKeyDown = event => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const buttons = dialog.current?.querySelectorAll('button:not([disabled])');
      if (!buttons?.length) return;
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      if (previousFocus?.isConnected) previousFocus.focus?.({ preventScroll: true });
    };
  }, [business]);
  if (!business || typeof document === 'undefined') return null;
  const image = business.photos?.[0]?.url || business.logo_url;
  return createPortal(<div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, boxSizing: 'border-box' }}>
    <div aria-hidden="true" onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(6px)' }} />
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} tabIndex={-1}
      style={{ position: 'relative', width: '100%', maxWidth: 400, maxHeight: 'calc(100dvh - 40px)', overflowY: 'auto', overscrollBehavior: 'contain', boxSizing: 'border-box', borderRadius: 24, padding: '28px 20px 20px', background: T.white, color: T.text, boxShadow: '0 20px 70px rgba(0,0,0,.25)', outline: 'none', fontFamily: 'inherit' }}>
      <button type="button" aria-label={t('cerrar', 'Cerrar')} onClick={onClose} style={{ position: 'absolute', top: 10, right: 10, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, border: 0, borderRadius: '50%', background: 'transparent', color: T.sub, cursor: 'pointer' }}><Icon name="x" size={20} color={T.sub} /></button>
      <div style={{ width: 72, height: 72, borderRadius: 18, overflow: 'hidden', margin: '0 auto 14px', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {image ? <img src={getThumbUrl(image, 200, 200)} alt="" style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} /> : <Icon name="store" size={30} color={T.sub} />}
      </div>
      <h3 id={titleId} style={{ margin: '0 20px 7px', fontSize: 20, fontWeight: 800, lineHeight: 1.3, textAlign: 'center', overflowWrap: 'anywhere' }}>{business.name}</h3>
      <p id={descriptionId} style={{ margin: '0 auto 22px', maxWidth: 280, fontSize: 13, color: T.sub, lineHeight: 1.5, textAlign: 'center' }}>{t('elige_coleccion_lugar', 'Elige una colección para guardar este lugar.')}</p>
      <div aria-label={t('colecciones', 'Colecciones')} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {collections.map(collection => <button key={collection.id} type="button" onClick={() => onSelect(collection)} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 60, padding: '12px 14px', boxSizing: 'border-box', border: `1px solid ${T.border}`, borderRadius: 14, background: 'transparent', color: T.text, fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>
          <span aria-hidden="true" style={{ fontSize: 25, width: 32, flexShrink: 0, textAlign: 'center' }}>{collection.emoji}</span>
          <span style={{ flex: 1, minWidth: 0, fontSize: 15, lineHeight: 1.4, fontWeight: 650, overflowWrap: 'anywhere' }}>{collection.name}</span>
          <Icon name="chevron" size={16} color={T.sub} />
        </button>)}
        {!collections.length && onCreate && <button type="button" onClick={onCreate} style={{ width: '100%', minHeight: 52, border: `1px solid ${T.border}`, borderRadius: 14, background: 'transparent', color: T.text, font: 'inherit', fontWeight: 600, cursor: 'pointer' }}>{t('crear_coleccion', 'Crear colección')}</button>}
      </div>
    </div>
  </div>, document.body);
}
