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
        const user = await sb.getUser();
        if (user) {
          if (mounted) setUser(user);
          try {
            const r = await sb.get("profiles", `?id=eq.${user.id}&limit=1`);
            if (r && r[0] && mounted) setProfile(r[0]);
          } catch (e) {
            console.warn("Failed to fetch profile", e);
          }
        }
      } catch (err) {
        console.warn("Auth init error:", err);
      } finally {
        if (mounted) setAuthChecked(true);
      }
    }

    checkAuth();

    return () => {
      mounted = false;
    };
  }, [setUser, setProfile, setAuthChecked]);

  return null;
}
