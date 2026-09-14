'use client';

import AuthModal from './AuthModal';
import { useEffect } from 'react';
import { sb } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';

// Dummy theme mimicking Vite's standard theme
const T = {
  bg: '#ffffff',
  text: '#0f172a',
  sub: '#64748b',
  border: '#e2e8f0',
  card: '#f8fafc',
  btn: '#16a34a'
};

export default function AuthClient() {
  const setUser = useAuthStore(s => s.setUser);
  const setProfile = useAuthStore(s => s.setProfile);
  const setAuthChecked = useAuthStore(s => s.setAuthChecked);

  useEffect(() => {
    sb.getUser().then(u => {
      if (u) {
        setUser(u);
        sb.get("profiles", `?id=eq.${u.id}`).then(p => {
          if (p && p.length > 0) setProfile(p[0]);
        }).catch(() => {});
      }
      setAuthChecked(true);
    }).catch(() => {
      setAuthChecked(true);
    });
  }, [setUser, setProfile, setAuthChecked]);

  const doAuth = async () => {
    const handleAuth = useAuthStore.getState().handleAuth;
    const setShowAuth = useAuthStore.getState().setShowAuth;
    const uid = await handleAuth();
    if (uid) {
      setShowAuth(false);
      // Optional: reload window or router.refresh() to ensure server components get auth cookie if implemented,
      // but Supabase auth in this app is entirely client-side using localStorage.
    }
  };

  return <AuthModal T={T} dark={false} cities={[]} doAuth={doAuth} />;
}
