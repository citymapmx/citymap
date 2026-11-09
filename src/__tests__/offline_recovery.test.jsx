import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {afterEach,describe,it,expect,vi} from 'vitest';
import {canAutoRecover,claimAutoRecovery,isChunkError,reloadClearingStaleAssets,retryPageLoad} from '../lib/loadRecovery.js';
import {ErrorBoundary} from '../components/ErrorBoundary.jsx';
import LoadFailureView from '../components/LoadFailureView.jsx';
vi.mock('../store/useUIStore.js',()=>({useUIStore: selector => selector({dark:true})}));
afterEach(()=>vi.unstubAllGlobals());
function setup(online=true){
  const storage=new Map();
  const session={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),clear:vi.fn()};
  const nav={onLine:online,serviceWorker:{getRegistrations:vi.fn(async()=>[])}};
  const win={caches:{keys:vi.fn(async()=>['offline-data']),delete:vi.fn(async()=>true)},location:{reload:vi.fn()}};
  vi.stubGlobal('navigator',nav);vi.stubGlobal('window',win);vi.stubGlobal('sessionStorage',session);
  return {nav,win,session,storage};
}
const networkError=new TypeError('Importing a module script failed.');
const staleError=new Error('Expected a JavaScript module script but the server responded with a MIME type of text/html');
describe('offline load recovery',()=>{
  it('never identifies a network import failure as an update, even while the OS reports online',()=>{
    setup();expect(isChunkError(networkError)).toBe(true);expect(canAutoRecover(networkError)).toBe(false);
    expect(ErrorBoundary.getDerivedStateFromError(networkError).autoReloading).toBe(false);
    const html=renderToStaticMarkup(<LoadFailureView error={networkError}/>);
    expect(html).toContain('No pudimos cargar esta sección');expect(html).not.toContain('nueva versión');expect(html).not.toContain('Actualizando');
  });
  it('keeps caches, workers and the page intact without a connection',async()=>{
    const {win,nav,session}=setup(false);
    expect(canAutoRecover(staleError)).toBe(false);expect(claimAutoRecovery(staleError)).toBe(false);
    expect(await reloadClearingStaleAssets()).toBe(false);expect(retryPageLoad(networkError)).toBe(false);
    expect(win.caches.keys).not.toHaveBeenCalled();expect(win.caches.delete).not.toHaveBeenCalled();
    expect(nav.serviceWorker.getRegistrations).not.toHaveBeenCalled();expect(win.location.reload).not.toHaveBeenCalled();expect(session.clear).not.toHaveBeenCalled();
  });
  it('shows an accurate offline message and disables a futile reload',()=>{
    setup(false);
    const html=renderToStaticMarkup(<LoadFailureView error={networkError} fullPage/>);
    expect(html).toContain('Sin conexión a internet');expect(html).toContain('Esperando conexión');expect(html).toContain('disabled');expect(html).not.toContain('nueva versión');
  });
  it('retries an ordinary load failure without clearing stored data',()=>{
    const {win,nav,session}=setup(true);expect(retryPageLoad(networkError)).toBe(true);
    expect(win.location.reload).toHaveBeenCalledOnce();expect(win.caches.delete).not.toHaveBeenCalled();expect(nav.serviceWorker.getRegistrations).not.toHaveBeenCalled();expect(session.clear).not.toHaveBeenCalled();
  });
  it('only allows guarded recovery for an actual stale asset response',()=>{
    setup();expect(canAutoRecover(staleError)).toBe(true);expect(claimAutoRecovery(staleError)).toBe(true);expect(canAutoRecover(staleError)).toBe(false);
    const {storage}=setup();storage.set('chunk_reload_guard',String(Date.now()));expect(canAutoRecover(staleError)).toBe(false);
  });
  it('auto-recovers a chunk that no longer exists after a deploy',()=>{
    setup();
    const chunkError=new TypeError('Failed to fetch dynamically imported module: https://citymap.mx/assets/GMap-abc123.js');
    expect(isChunkError(chunkError)).toBe(true);expect(canAutoRecover(chunkError)).toBe(true);
    expect(ErrorBoundary.getDerivedStateFromError(chunkError).autoReloading).toBe(true);
    expect(claimAutoRecovery(chunkError)).toBe(true);expect(canAutoRecover(chunkError)).toBe(false);
  });
  it('auto-recovers a webpack-style chunk load failure',()=>{
    setup();
    const chunkError=new Error('Loading chunk 42 failed');chunkError.name='ChunkLoadError';
    expect(isChunkError(chunkError)).toBe(true);expect(canAutoRecover(chunkError)).toBe(true);
  });
  it('does not auto-recover a chunk failure without a connection',()=>{
    setup(false);
    const chunkError=new TypeError('Failed to fetch dynamically imported module: https://citymap.mx/assets/GMap-abc123.js');
    expect(canAutoRecover(chunkError)).toBe(false);expect(claimAutoRecovery(chunkError)).toBe(false);
  });
  it('stops cache cleanup if the connection drops during recovery',async()=>{
    const {win,nav}=setup(true);win.caches.keys.mockImplementation(async()=>{nav.onLine=false;return ['offline-data'];});
    expect(await reloadClearingStaleAssets()).toBe(false);expect(win.caches.delete).not.toHaveBeenCalled();expect(win.location.reload).not.toHaveBeenCalled();
  });
  it('does not loop when session storage is unavailable',()=>{
    setup();vi.stubGlobal('sessionStorage',{getItem:()=>{throw Error('blocked');}});expect(canAutoRecover(staleError)).toBe(false);
  });
});
