import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from './ui/Icon.jsx';
import { useTranslation } from '../hooks/useTranslation.js';
import { haptic } from '../lib/utils.js';

export default function SideMenu({ isOpen, onClose, T, dark, routerNavigate, user, setShowAuth, setShowAdmin }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { t, lang, setLang } = useTranslation();

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 9999
            }}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              width: '85%',
              maxWidth: 320,
              background: dark ? '#0F172A' : '#FFFFFF',
              zIndex: 10000,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '4px 0 24px rgba(0,0,0,0.1)'
            }}
          >
            <div style={{ padding: '24px 20px', borderBottom: `1px solid ${dark ? '#1E293B' : '#F1F5F9'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <img src="/citymap.mx.png" alt="CityMap" style={{ height: 40, filter: dark ? 'none' : 'invert(1)' }} />
              <button onClick={onClose} style={{ position: 'absolute', right: 12, background: 'none', border: 'none', cursor: 'pointer', padding: 8, color: T.text }}>
                <Icon name="x" size={24} color={T.text} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>
              {user && (
                <div style={{ padding: '0 20px 16px', borderBottom: `1px solid ${dark ? '#1E293B' : '#F1F5F9'}`, marginBottom: 16 }}>
                  <div style={{ fontSize: 13, color: dark ? '#94A3B8' : '#6B7280', marginBottom: 4 }}>{t("sesion_como", "Sesión iniciada como")}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{user.user_metadata?.full_name || user.email}</div>
                </div>
              )}

              <MenuItem icon="home" label={t("inicio", "Inicio")} onClick={() => { routerNavigate('/'); onClose(); }} T={T} dark={dark} />
              <MenuItem icon="map" label={t("explorar_mapa", "Explorar Mapa")} onClick={() => { routerNavigate('/mapa'); onClose(); }} T={T} dark={dark} />
              <MenuItem icon="calendar" label={t("eventos", "Eventos")} onClick={() => { routerNavigate('/eventos'); onClose(); }} T={T} dark={dark} />
              <MenuItem icon="bookmark" label={t("planes", "Planes")} onClick={() => { routerNavigate('/mis-planes'); onClose(); }} T={T} dark={dark} />
              <MenuItem icon="heart" label={t("mis_favoritos", "Mis Favoritos")} onClick={() => { routerNavigate('/favoritos'); onClose(); }} T={T} dark={dark} />
              
              <div style={{ height: 16 }} />
              <div style={{ padding: '0 20px', fontSize: 12, fontWeight: 700, color: dark ? '#94A3B8' : '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{t("cuenta", "Cuenta")}</div>
              
              {!user ? (
                <MenuItem icon="user" label={t("iniciar_sesion", "Iniciar Sesión")} onClick={() => { onClose(); setShowAuth(true); }} T={T} dark={dark} />
              ) : (
                <>
                  <MenuItem icon="user" label={t("mi_perfil", "Mi Perfil")} onClick={() => { routerNavigate('/cuenta'); onClose(); }} T={T} dark={dark} />
                  {user.email === 'admin@citymap.mx' && (
                    <MenuItem icon="settings" label={t("panel_admin", "Panel Admin")} onClick={() => { onClose(); setShowAdmin(true); }} T={T} dark={dark} />
                  )}
                </>
              )}

              <div style={{ height: 16 }} />
              <div style={{ padding: '0 20px', fontSize: 12, fontWeight: 700, color: dark ? '#94A3B8' : '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{t("legal", "Legal")}</div>
              <MenuItem icon="file" label={t("acerca_de", "Acerca de")} onClick={() => { routerNavigate('/about'); onClose(); }} T={T} dark={dark} />
              <MenuItem icon="file" label={t("privacidad", "Privacidad")} onClick={() => { routerNavigate('/privacy'); onClose(); }} T={T} dark={dark} />
              <MenuItem icon="file" label={t("terminos", "Términos")} onClick={() => { routerNavigate('/terms'); onClose(); }} T={T} dark={dark} />
            </div>

            {/* Language Selector Selector de Idioma */}
            <div style={{ padding: '16px 20px', borderTop: `1px solid ${dark ? '#1E293B' : '#F1F5F9'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: dark ? '#94A3B8' : '#6B7280' }}>
                {t("idioma", "Idioma")}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => { haptic("light"); setLang('es'); }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 12,
                    border: lang === 'es' ? `1.5px solid ${T.green}` : `1px solid ${dark ? '#334155' : '#E2E8F0'}`,
                    background: lang === 'es' ? (dark ? 'rgba(52,211,153,0.15)' : 'rgba(22,163,74,0.08)') : 'transparent',
                    color: lang === 'es' ? T.green : (dark ? '#94A3B8' : '#4B5563'),
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  🇲🇽 ES
                </button>
                <button
                  onClick={() => { haptic("light"); setLang('en'); }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 12,
                    border: lang === 'en' ? `1.5px solid ${T.green}` : `1px solid ${dark ? '#334155' : '#E2E8F0'}`,
                    background: lang === 'en' ? (dark ? 'rgba(52,211,153,0.15)' : 'rgba(22,163,74,0.08)') : 'transparent',
                    color: lang === 'en' ? T.green : (dark ? '#94A3B8' : '#4B5563'),
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  🇺🇸 EN
                </button>
              </div>
            </div>

            <div style={{ padding: '10px 20px 20px', textAlign: 'center', fontSize: 11, color: dark ? '#64748B' : '#9CA3AF', borderTop: `1px solid ${dark ? '#1E293B' : '#F1F5F9'}` }}>
              &copy; {new Date().getFullYear()} CityMap. {t("derechos_reservados", "Todos los derechos reservados.")}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

function MenuItem({ icon, label, onClick, T, dark }) {
  return (
    <div onClick={onClick} className="press" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', cursor: 'pointer', transition: 'background 0.2s' }}>
      <Icon name={icon} size={22} color={dark ? '#94A3B8' : '#6B7280'} />
      <span style={{ fontSize: 16, fontWeight: 600, color: T.text }}>{label}</span>
    </div>
  );
}
