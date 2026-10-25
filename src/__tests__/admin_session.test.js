import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore as viteStore } from '../store/useAuthStore.js';
import { sb as viteDb } from '../lib/supabase.js';
import { useAuthStore as nextStore } from '../../web-next/src/store/useAuthStore.js';
import { sb as nextDb } from '../../web-next/src/lib/supabase.js';
import { isAdminUser } from '../lib/adminAccess.js';

const user = { id: 'admin-id', email: 'manager@example.org' };
const profile = { id: user.id, role: 'admin', name: 'Admin' };

describe.each([['Vite', viteStore, viteDb], ['Next', nextStore, nextDb]])('%s restored admin session', (_name, store, db) => {
  let getProfile;
  beforeEach(() => {
    store.setState({ user, profile: null });
    getProfile = vi.spyOn(db, 'get').mockResolvedValue([profile]);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('restores the profile as an object and keeps admin access after a reload', async () => {
    const restored = await store.getState().loadProfile(user.id);
    expect(restored).toEqual(profile);
    expect(isAdminUser(store.getState().user, restored)).toBe(true);
  });
  it('preserves the same account profile when a request temporarily fails', async () => {
    store.setState({ profile });
    getProfile.mockRejectedValue(new Error('offline'));
    await store.getState().loadProfile(user.id);
    expect(store.getState().profile).toEqual(profile);
  });
  it('clears privileges when the server reports a changed role', async () => {
    store.setState({ profile });
    getProfile.mockResolvedValue([{ ...profile, role: 'user' }]);
    await store.getState().loadProfile(user.id);
    expect(isAdminUser(store.getState().user, store.getState().profile)).toBe(false);
  });
  it('clears the profile when the server reports no profile', async () => {
    store.setState({ profile });
    getProfile.mockResolvedValue([]);
    await store.getState().loadProfile(user.id);
    expect(store.getState().profile).toBeNull();
  });
  it('does not restore a late admin profile after signing out', async () => {
    let finish;
    getProfile.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const pending = store.getState().loadProfile(user.id);
    store.getState().setUser(null);
    finish([profile]);
    expect(await pending).toBeNull();
    expect(store.getState().profile).toBeNull();
  });
  it('does not transfer a previous account role to another account', async () => {
    store.setState({ profile });
    store.getState().setUser({ id: 'regular-user' });
    getProfile.mockRejectedValue(new Error('offline'));
    await store.getState().loadProfile('regular-user');
    expect(store.getState().profile).toBeNull();
    expect(isAdminUser(store.getState().user, store.getState().profile)).toBe(false);
  });
  it('keeps a profile when updating details of the same authenticated user', () => {
    store.setState({ profile });
    store.getState().setUser({ ...user, name: 'Updated' });
    expect(store.getState().profile).toEqual(profile);
  });
});

describe('admin UI visibility', () => {
  it('recognizes the existing admin email without case or whitespace differences', () => {
    expect(isAdminUser({ id: 'a', email: ' SOPORTE@CITYMAP.MX ' }, null)).toBe(true);
  });
  it('recognizes the second existing administrator account', () => {
    expect(isAdminUser({id:'second-admin',email:'mendozadaniel1999@gmail.com'},null)).toBe(true);
  });
  it('recognizes the server managed admin flag', () => {
    expect(isAdminUser({ id: 'a', app_metadata: { isAdmin: true } }, null)).toBe(true);
  });
  it('ignores user editable metadata and profiles belonging to someone else', () => {
    expect(isAdminUser({ id: 'a', user_metadata: { isAdmin: true } }, profile)).toBe(false);
  });
  it('hides the button after logout even if a stale profile exists', () => {
    expect(isAdminUser(null, profile)).toBe(false);
  });
});
