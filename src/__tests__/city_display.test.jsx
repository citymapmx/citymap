import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {getCityDisplayName,useGeolocation} from '../hooks/useGeolocation.js';
import HomeHero from '../components/home/HomeHero.jsx';
import {getT} from '../lib/constants.js';
vi.mock('../lib/supabase.js',()=>({sb:{get:vi.fn()}}));
vi.mock('../components/home/useSearchPlaceholder.js',()=>({default:()=> 'Buscar lugares y eventos'}));
afterEach(()=>vi.unstubAllGlobals());
const cities=[{slug:'tepic',name:'Tepic',state:'Nayarit;metro'},{slug:'guadalajara',name:'Guadalajara',state:'Jalisco'},{slug:'ciudad-de-mexico',name:'Ciudad de México'}];
function CityProbe({activeCity,catalogue=cities}){
  const {city}=useGeolocation({activeCity,cities:catalogue,mapPins:[],setActiveCity:()=>{}});
  return <span>{city}</span>;
}
function storedCity(name){vi.stubGlobal('localStorage',{getItem:key=>key==='cg_city_name'?name:null,setItem:vi.fn()});}
describe('city displayed after refresh',()=>{
 it('uses the active city even when another city was saved',()=>{
   storedCity('Guadalajara, Jalisco');
   expect(renderToStaticMarkup(<CityProbe activeCity='tepic'/>)).toBe('<span>Tepic, Nayarit</span>');
   expect(renderToStaticMarkup(<CityProbe activeCity='guadalajara'/>)).toBe('<span>Guadalajara, Jalisco</span>');
 });
 it('never displays the saved name while the city catalogue is loading',()=>{
   storedCity('Guadalajara, Jalisco');
   expect(renderToStaticMarkup(<CityProbe activeCity='tepic' catalogue={[]}/>)).toBe('<span>Tepic</span>');
   expect(getCityDisplayName('ciudad-de-mexico',cities)).toBe('Ciudad de México');
 });
 it('does not depend on access to local storage for the city label',()=>{
   vi.stubGlobal('localStorage',{getItem:()=>{throw Error('blocked');}});
   const spy=vi.spyOn(console,'error').mockImplementation(()=>{});
   expect(renderToStaticMarkup(<CityProbe activeCity='tepic'/>)).toContain('Tepic, Nayarit');spy.mockRestore();
 });
 it('keeps the greeting on the active city rather than an old detected town',()=>{
   vi.stubGlobal('window',{CITY_TZ:'America/Mazatlan'});
   const html=renderToStaticMarkup(<HomeHero activeCity='tepic' city='Guadalajara, Jalisco' detectedTown='Guadalajara' cities={cities} dark={false} T={getT(false)} t={(key,fallback)=>fallback||key} search='' setSearch={()=>{}} cats={[]} activeCat='explorar' dbReady/>);
   expect(html).toContain('Tepic');expect(html).not.toContain('Guadalajara');
 });
});
