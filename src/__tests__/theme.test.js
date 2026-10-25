import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { create } from 'zustand';
import { initializeTheme, readThemeMode, readThemePreference, resolveTheme, isScheduledDark, saveThemePreference } from '../lib/theme.js';
import { getT } from '../lib/constants.js';

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-18T09:00:00Z')); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
function environment(initial = {}) {
  const data = new Map(Object.entries(initial));
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
  const win = { localStorage: storage, addEventListener: vi.fn(), removeEventListener: vi.fn() };
  const meta = { setAttribute: vi.fn() };
  const doc = { documentElement: { dataset: {}, style: { setProperty: vi.fn() } }, body: { style: {} }, querySelector: () => meta, addEventListener: vi.fn(), removeEventListener: vi.fn(), visibilityState: 'visible' };
  vi.stubGlobal('window', win); vi.stubGlobal('document', doc);
  return { data, storage, win, doc, meta };
}
const makeStore = (extra = {}) => create(() => ({dark:false,activeCity:'tepic',...extra}));

describe('scheduled appearance', () => {
  it('uses the exact 7 am and 7 pm boundaries in the selected timezone', () => {
    for (const [instant, dark] of [['2026-10-18T13:59:59Z',true],['2026-10-18T14:00:00Z',false],['2026-10-19T01:59:59Z',false],['2026-10-19T02:00:00Z',true],['2026-10-18T07:00:00Z',true]]) {
      expect(isScheduledDark(new Date(instant),'America/Mazatlan')).toBe(dark);
    }
  });
  it('defaults to automatic and preserves existing manual preferences', () => {
    const {storage,data}=environment();
    expect(readThemeMode(storage)).toBe('auto');
    expect(resolveTheme(storage,new Date('2026-10-18T18:00:00Z'),'America/Mazatlan')).toBe(false);
    data.set('cg_dark','true'); expect(readThemeMode(storage)).toBe('dark');
    expect(resolveTheme(storage,new Date('2026-10-18T18:00:00Z'),'America/Mazatlan')).toBe(true);
    data.set('cg_theme_mode','auto'); expect(readThemePreference(storage)).toBe(null);
    data.set('cg_theme_mode','light'); expect(readThemePreference(storage)).toBe(false);
  });
  it('initializes all theme surfaces without saving a manual preference', () => {
    const {doc,meta,data}=environment(); const store=makeStore(); const cleanup=initializeTheme(store);
    expect(store.getState()).toMatchObject({dark:true,themeMode:'auto'});
    expect(doc.documentElement.dataset.theme).toBe('dark');
    expect(doc.documentElement.style.colorScheme).toBe('dark');
    expect(doc.body.style.backgroundColor).toBe(getT(true).bg);
    expect(meta.setAttribute).toHaveBeenCalledWith('content',getT(true).bg);
    expect(data.has('cg_dark')).toBe(false); cleanup(); expect(vi.getTimerCount()).toBe(0);
  });
  it('changes on the clock and when the selected city changes', () => {
    environment(); vi.setSystemTime(new Date('2026-10-18T13:59:00Z'));
    const store=makeStore(); const cleanup=initializeTheme(store);
    expect(store.getState().dark).toBe(true); vi.advanceTimersByTime(60000); expect(store.getState().dark).toBe(false);
    vi.setSystemTime(new Date('2026-10-19T01:30:00Z'));
    store.setState({activeCity:'cancun'}); expect(store.getState().dark).toBe(true);
    store.setState({activeCity:'tepic'}); expect(store.getState().dark).toBe(false);
    vi.setSystemTime(new Date('2026-10-19T01:59:00Z')); vi.advanceTimersByTime(60000); expect(store.getState().dark).toBe(true);
    cleanup();
  });
  it('preserves manual choice across ticks and supports returning to automatic', () => {
    const {data}=environment(); const store=makeStore(); const cleanup=initializeTheme(store);
    saveThemePreference(false); store.setState({dark:false,themeMode:'light'});
    vi.advanceTimersByTime(60000); expect(store.getState().dark).toBe(false); expect(data.get('cg_theme_mode')).toBe('light');
    store.setState({themeMode:'auto'}); expect(store.getState().dark).toBe(true); cleanup();
  });
  it('syncs cross-tab changes and refreshes on return from suspension', () => {
    const {win,doc,data}=environment(); const store=makeStore(); const cleanup=initializeTheme(store);
    const storage=win.addEventListener.mock.calls.find(([name])=>name==='storage')[1];
    data.set('cg_theme_mode','light'); storage({key:'cg_theme_mode'}); expect(store.getState().dark).toBe(false);
    data.set('cg_theme_mode','auto'); storage({key:'cg_theme_mode'}); expect(store.getState().dark).toBe(true);
    vi.setSystemTime(new Date('2026-10-18T18:00:00Z'));
    doc.addEventListener.mock.calls[0][1](); expect(store.getState().dark).toBe(false);
    cleanup(); expect(win.removeEventListener).toHaveBeenCalled(); expect(doc.removeEventListener).toHaveBeenCalled();
  });
  it('retains manual control when storage is blocked', () => {
    const {win}=environment(); Object.defineProperty(win,'localStorage',{get:()=>{throw Error('blocked');}});
    const store=makeStore(); const cleanup=initializeTheme(store);
    expect(()=>saveThemePreference(false)).not.toThrow(); store.setState({themeMode:'light',dark:false});
    vi.advanceTimersByTime(60000); expect(store.getState().dark).toBe(false); cleanup();
  });
  it('works without a browser', () => {
    vi.stubGlobal('window',undefined); vi.stubGlobal('document',undefined);
    expect(typeof initializeTheme(makeStore())).toBe('function'); expect(()=>saveThemePreference(true)).not.toThrow();
  });
});
