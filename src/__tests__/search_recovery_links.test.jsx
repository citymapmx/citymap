import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import {describe,it,expect,vi} from 'vitest';
import SearchRecoveryLinks from '../components/home/SearchRecoveryLinks.jsx';
import HomeTopGrids from '../components/home/HomeTopGrids.jsx';
import {getT} from '../lib/constants.js';
vi.mock('../store/useUIStore.js',()=>({useUIStore:selector=>selector({activeCity:'tepic'})}));
vi.mock('../store/useDataStore.js',()=>({useDataStore:selector=>selector({dbReady:true,loadHomeHighlights:()=>Promise.resolve()})}));
const T=getT(false);
describe('empty search recovery links',()=>{
 it.each(['tepic','guadalajara'])('opens the map and events for %s without carrying the failed search',city=>{
   const html=renderToStaticMarkup(<MemoryRouter initialEntries={[`/${city}/c/restaurantes?q=ddgndg`]}><SearchRecoveryLinks activeCity={city} T={T} dark={false} onSelect={()=>{}}/></MemoryRouter>);
   expect(html).toContain(`href="/mapa/${city}"`);
   expect(html).toContain(`href="/eventos/${city}"`);
   expect(html).toContain(`href="/${city}#mejor-calificados"`);
   expect(html).toContain(`href="/${city}/c/restaurantes"`);
   expect(html).not.toContain('ddgndg');
 });
 it('uses valid destinations when there is no selected city',()=>{
   const html=renderToStaticMarkup(<MemoryRouter><SearchRecoveryLinks T={T} onSelect={()=>{}}/></MemoryRouter>);
   expect(html).toContain('href="/mapa"'); expect(html).toContain('href="/eventos"');
   expect(html).not.toContain('undefined');
 });
 it.each(['loading','ready','error'])('keeps a real ratings target and an informative %s state',status=>{
   const html=renderToStaticMarkup(<HomeTopGrids topFavs={[]} topRated={[]} T={T} t={(key,fallback)=>fallback} ratedStatus={status}/>);
   expect(html).toContain('id="mejor-calificados"');
   expect(html).toContain(status==='loading'?'Cargando calificaciones':status==='error'?'No pudimos cargar':'Todavía no hay negocios');
 });
});
