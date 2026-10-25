import { useUIStore } from '../../store/useUIStore.js';
import Icon from './Icon.jsx';

export default function ThemeToggle({ showLabel = false, padding = '12px 20px' }) {
  const dark = useUIStore(state => state.dark);
  const setDark = useUIStore(state => state.setDark);
  const mode = useUIStore(state => state.themeMode);
  const setThemeMode = useUIStore(state => state.setThemeMode);
  const lang = useUIStore(state => state.lang);
  const english = lang === 'en';
  const label = english ? (dark ? 'Switch to light mode' : 'Switch to dark mode') : (dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
  const textColor = dark ? '#F4F4F5' : '#0F1A14';
  const mutedColor = dark ? '#A1A1AA' : '#6B7280';

  if (showLabel) return <div style={{ padding, color: textColor, textAlign: 'left' }}>
    <button type="button" role="switch" aria-checked={dark} aria-label={english ? 'Dark mode' : 'Modo oscuro'} title={label}
      onClick={() => setDark(!dark)}
      style={{ width: '100%', minHeight: 32, display: 'flex', alignItems: 'center', gap: 14, padding: 0, border: 0, background: 'transparent', color: 'inherit', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>
      <Icon name={dark ? 'moon' : 'sun'} size={20} color={mutedColor} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 500 }}>{english ? (dark ? 'Dark mode enabled' : 'Dark mode') : (dark ? 'Modo oscuro activado' : 'Modo oscuro')}</span>
      <span aria-hidden="true" style={{ width: 44, height: 26, flexShrink: 0, borderRadius: 13, background: dark ? '#F4F4F5' : '#D1D5DB', position: 'relative' }}>
        <span style={{ position: 'absolute', top: 3, left: 3, width: 20, height: 20, borderRadius: '50%', background: dark ? '#18181B' : '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,.2)', transform: dark ? 'translateX(18px)' : 'translateX(0)', transition: 'transform .2s ease' }} />
      </span>
    </button>
    {(!mode || mode === 'auto') ? <span style={{ display: 'block', marginLeft: 34, marginTop: 3, color: mutedColor, fontSize: 12 }}>{english ? 'Automatic by time of day' : 'Automático según horario'}</span> : <button type="button" onClick={() => setThemeMode('auto')}
      style={{ display: 'block', marginLeft: 34, marginTop: 3, padding: '5px 0', border: 0, background: 'transparent', color: mutedColor, fontFamily: 'inherit', fontSize: 12, textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer' }}>
      {english ? 'Use automatic schedule' : 'Usar horario automático'}
    </button>}
  </div>;

  return <button type="button" aria-label={label} title={label} aria-pressed={dark} onClick={() => setDark(!dark)}
    style={{ width: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, background: 'transparent', border: 0, borderRadius: 12, color: textColor, cursor: 'pointer', fontFamily: 'inherit' }}>
    <Icon name={dark ? 'sun' : 'moon'} size={22} color="currentColor" />
  </button>;
}
