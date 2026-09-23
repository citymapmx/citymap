'use client';
import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { sb } from '../lib/supabase';

export default function GlobalAuthInit() {
  const { setUser, setProfile, setAuthChecked } = useAuthStore();

  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      try {
        const { data: { session } } = await sb.auth.getSession();
        if (session?.user) {
          if (mounted) setUser(session.user);
          const r = await sb.get("profiles", `?id=eq.${session.user.id}&limit=1`);
          if (r?.[0] && mounted) setProfile(r[0]);
        }
      } catch (err) {
        console.warn("Auth init error:", err);
      } finally {
        if (mounted) setAuthChecked(true);
      }
    }

    checkAuth();

    const { data: listener } = sb.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
      } else if (session?.user) {
        setUser(session.user);
        try {
          const r = await sb.get("profiles", `?id=eq.${session.user.id}&limit=1`);
          if (r?.[0]) setProfile(r[0]);
        } catch {}
      }
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, [setUser, setProfile, setAuthChecked]);

  return null;
}
