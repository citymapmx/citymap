import {afterEach,describe,it,expect,vi} from 'vitest';
import {fetchWithTimeout,FETCH_TIMEOUT_MS} from '../lib/fetchWithTimeout.js';
import {detailKindForPath,shouldReloadOnResume,claimResumeReload} from '../lib/loadRecovery.js';

afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});

function setupSession(initial = {}) {
  const storage = new Map(Object.entries(initial));
  const session = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key),
  };
  vi.stubGlobal('sessionStorage', session);
  return storage;
}

describe('fetchWithTimeout (pantalla blanca al reanudar)',()=>{
  it('devuelve la respuesta cuando el fetch es rápido',async()=>{
    const response = {ok:true};
    vi.stubGlobal('fetch',vi.fn(async()=>response));
    await expect(fetchWithTimeout('https://citymap.mx/api/x')).resolves.toBe(response);
  });

  it('aborta un fetch colgado en vez de esperar para siempre',async()=>{
    vi.useFakeTimers();
    vi.stubGlobal('fetch',vi.fn((url,{signal})=>new Promise((resolve,reject)=>{
      signal.addEventListener('abort',()=>reject(new DOMException('The operation was aborted.','AbortError')));
    })));
    const pending = fetchWithTimeout('https://citymap.mx/api/x',{},50);
    const assertion = expect(pending).rejects.toThrow(/abort/i);
    await vi.advanceTimersByTimeAsync(60);
    await assertion;
  });

  it('respeta el timeout pedido y limpia el temporizador al resolver',async()=>{
    vi.useFakeTimers();
    const clearSpy = vi.spyOn(globalThis,'clearTimeout');
    vi.stubGlobal('fetch',vi.fn(async()=>({ok:true})));
    await fetchWithTimeout('https://citymap.mx/api/x',{},1234);
    expect(clearSpy).toHaveBeenCalled();
    expect(FETCH_TIMEOUT_MS).toBe(15000);
  });
});

describe('detailKindForPath',()=>{
  it('detecta la ficha de evento en sus dos formatos de URL',()=>{
    expect(detailKindForPath('/evento/zapopan/zz-top')).toBe('event');
    expect(detailKindForPath('/evento/guadalajara-zz-top')).toBe('event');
  });
  it('detecta la ficha de negocio y su variante de reserva',()=>{
    expect(detailKindForPath('/guadalajara/dennys-la-capilla')).toBe('business');
    expect(detailKindForPath('/guadalajara/dennys-la-capilla/reservar')).toBe('business');
  });
  it('no confunde secciones, categorías ni la raíz con una ficha',()=>{
    expect(detailKindForPath('/')).toBe(null);
    expect(detailKindForPath('/eventos')).toBe(null);
    expect(detailKindForPath('/eventos/guadalajara')).toBe(null);
    expect(detailKindForPath('/mapa')).toBe(null);
    expect(detailKindForPath('/guadalajara/c/restaurantes')).toBe(null);
    expect(detailKindForPath('/guadalajara/dennys-la-capilla/menu')).toBe(null);
  });
  it('en citymap.world la ficha lleva prefijo de país',()=>{
    expect(detailKindForPath('/mx/cancun/chichen-itza',true)).toBe('business');
    expect(detailKindForPath('/mx/cancun',true)).toBe(null);
    expect(detailKindForPath('/mx/cancun/chichen-itza/reservar',true)).toBe('business');
  });
});

describe('shouldReloadOnResume',()=>{
  it('recarga una ficha de evento sin seleccionado tras una suspensión larga',()=>{
    setupSession();
    expect(shouldReloadOnResume({hiddenMs:10*60*1000,pathname:'/evento/zapopan/zz-top',hasSelected:false,hasSelectedEvent:false})).toBe(true);
  });
  it('recarga una ficha de negocio sin seleccionado tras una suspensión larga',()=>{
    setupSession();
    expect(shouldReloadOnResume({hiddenMs:60*1000,pathname:'/guadalajara/dennys-la-capilla',hasSelected:false,hasSelectedEvent:false})).toBe(true);
  });
  it('no recarga si la ficha sí tiene su seleccionado',()=>{
    setupSession();
    expect(shouldReloadOnResume({hiddenMs:10*60*1000,pathname:'/evento/zapopan/zz-top',hasSelected:false,hasSelectedEvent:true})).toBe(false);
    expect(shouldReloadOnResume({hiddenMs:10*60*1000,pathname:'/guadalajara/dennys-la-capilla',hasSelected:true,hasSelectedEvent:false})).toBe(false);
  });
  it('no recarga por un cambio rápido de app ni fuera de una ficha',()=>{
    setupSession();
    expect(shouldReloadOnResume({hiddenMs:30*1000,pathname:'/evento/zapopan/zz-top',hasSelected:false,hasSelectedEvent:false})).toBe(false);
    expect(shouldReloadOnResume({hiddenMs:10*60*1000,pathname:'/eventos/guadalajara',hasSelected:false,hasSelectedEvent:false})).toBe(false);
    expect(shouldReloadOnResume({hiddenMs:10*60*1000,pathname:'/',hasSelected:false,hasSelectedEvent:false})).toBe(false);
  });
  it('la guardia evita recargar dos veces seguidas',()=>{
    const storage = setupSession();
    expect(claimResumeReload()).toBe(true);
    expect(shouldReloadOnResume({hiddenMs:10*60*1000,pathname:'/evento/zapopan/zz-top',hasSelected:false,hasSelectedEvent:false})).toBe(false);
    storage.set('resume_reload_guard',String(Date.now()-61*1000));
    expect(shouldReloadOnResume({hiddenMs:10*60*1000,pathname:'/evento/zapopan/zz-top',hasSelected:false,hasSelectedEvent:false})).toBe(true);
  });
  it('no recarga si sessionStorage no está disponible',()=>{
    vi.stubGlobal('sessionStorage',{getItem:()=>{throw Error('blocked');}});
    expect(shouldReloadOnResume({hiddenMs:10*60*1000,pathname:'/evento/zapopan/zz-top',hasSelected:false,hasSelectedEvent:false})).toBe(false);
  });
});
