import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from './ui/Icon.jsx';

export default function SideMenu({ isOpen, onClose, T, dark, routerNavigate, user, setShowAuth, setShowAdmin }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
                  <div style={{ fontSize: 13, color: dark ? '#94A3B8' : '#6B7280', marginBottom: 4 }}>Sesión iniciada como</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{user.user_metadata?.full_name || user.email}</div>
                </div>
              )}

              <MenuItem icon="home" label="Inicio" onClick={() => { routerNavigate('/'); onClose(); }} T={T} dark={dark} />
              <MenuItem icon="map" label="Explorar Mapa" onClick={() => { routerNavigate('/mapa'); onClose(); }} T={T} dark={dark} />
              <MenuItem icon="calendar" label="Eventos" onClick={() => { routerNavigate('/eventos'); onClose(); }} T={T} dark={dark} />
              <MenuItem icon="bookmark" label="Planes" onClick={() => { routerNavigate('/mis-planes'); onClose(); }} T={T} dark={dark} />
              <MenuItem icon="heart" label="Mis Favoritos" onClick={() => { routerNavigate('/favoritos'); onClose(); }} T={T} dark={dark} />
              
              <div style={{ height: 16 }} />
              <div style={{ padding: '0 20px', fontSize: 12, fontWeight: 700, color: dark ? '#94A3B8' : '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Cuenta</div>
              
              {!user ? (
                <MenuItem icon="user" label="Iniciar Sesión" onClick={() => { onClose(); setShowAuth(true); }} T={T} dark={dark} />
              ) : (
                <>
                  <MenuItem icon="user" label="Mi Perfil" onClick={() => { routerNavigate('/cuenta'); onClose(); }} T={T} dark={dark} />
                  {user.email === 'admin@citymap.mx' && (
                    <MenuItem icon="settings" label="Panel Admin" onClick={() => { onClose(); setShowAdmin(true); }} T={T} dark={dark} />
                  )}
                </>
              )}

              <div style={{ height: 16 }} />
              <div style={{ padding: '0 20px', fontSize: 12, fontWeight: 700, color: dark ? '#94A3B8' : '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Legal</div>
              <MenuItem icon="file" label="Acerca de" onClick={() => { routerNavigate('/about'); onClose(); }} T={T} dark={dark} />
              <MenuItem icon="file" label="Privacidad" onClick={() => { routerNavigate('/privacy'); onClose(); }} T={T} dark={dark} />
              <MenuItem icon="file" label="Términos" onClick={() => { routerNavigate('/terms'); onClose(); }} T={T} dark={dark} />
            </div>

            <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: dark ? '#64748B' : '#9CA3AF' }}>
              &copy; {new Date().getFullYear()} CityMap. Todos los derechos reservados.
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
