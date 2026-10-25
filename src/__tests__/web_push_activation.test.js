import { afterEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ getToken: vi.fn(), onMessage: vi.fn(), effects: [] }));
vi.mock('react', () => ({ useRef: value => ({ current: value }), useEffect: fn => { mocks.effects.push(fn); } }));
vi.mock('../lib/firebase.js', () => ({ app: {}, getMessaging: () => ({}), getToken: mocks.getToken, onMessage: mocks.onMessage }));
vi.mock('../lib/supabase.js', () => ({ sb: { _token: 'test-jwt' } }));
import { useWebPush } from '../hooks/useWebPush.js';
function setup(permission = 'default') {
  mocks.effects.length = 0;
  const requestPermission = vi.fn().mockResolvedValue(permission);
  const register = vi.fn().mockResolvedValue({});
  vi.stubGlobal('window', { Notification: {}, Capacitor: undefined });
  vi.stubGlobal('Notification', { permission: 'default', requestPermission });
  vi.stubGlobal('navigator', { serviceWorker: { register } });
  mocks.getToken.mockResolvedValue('test-token');
  mocks.onMessage.mockClear();
  // Hooks are intentionally mocked above to exercise the activation boundary.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return { requestPermission, register, hook: useWebPush({ citySlug: 'tepic', userId: 'self-user' }) };
}
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });
describe('explicit notification activation', () => {
  it('does not request notification permission on mount', () => {
    const { requestPermission } = setup();
    mocks.effects.forEach(fn => fn());
    expect(requestPermission).not.toHaveBeenCalled();
  });
  it('does not register a token when permission is denied', async () => {
    const { hook, register } = setup('denied');
    expect(await hook.requestAndRegister()).toBe('denied');
    expect(register).not.toHaveBeenCalled();
  });
  it('does not report success when storing the token fails', async () => {
    const { hook } = setup('granted');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    expect(await hook.requestAndRegister()).toBe('error');
    expect(mocks.onMessage).not.toHaveBeenCalled();
  });
  it('reports success only after token registration succeeds', async () => {
    const { hook } = setup('granted');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    expect(await hook.requestAndRegister()).toBe('granted');
    expect(mocks.onMessage).toHaveBeenCalledOnce();
  });
});
