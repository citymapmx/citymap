import {describe,it,expect,vi} from 'vitest';
import {MOODS,isValidMatch,closesLate,surpriseBusinessQuery,loadSurpriseCandidates} from '../lib/surpriseSelection.js';
const mood=id=>MOODS.find(m=>m.id===id);
const match=(b,id)=>isValidMatch(b,id,mood(id).cats);
const late={vie:'18:00 – 02:00'};
const bar=(id,extra={})=>({id,name:id,category:'antros y bares',type:'Cantina',city_slug:'tepic',status:'approved',plan:'premium',schedule:late,...extra});
const eligible=b=>b.status==='approved'&&match(b,'noche');
const base=()=>({cache:new Map(),citySlugs:['tepic'],mood:mood('noche'),eligible});
describe('surprise categories',()=>{
 it('rejects restaurants and cafés even when they close after midnight',()=>{
   for (const category of ['restaurantes','cafeterias','cafe']) expect(match({category,schedule:late},'noche')).toBe(false);
   expect(match(bar('mixed',{type:'Restaurante bar'}),'noche')).toBe(false);
   expect(match(bar('mixed',{type:'Café bar'}),'noche')).toBe(false);
 });
 it('accepts actual nightlife with late or overnight hours and rejects daytime bars',()=>{
   expect(match(bar('late'),'noche')).toBe(true);
   expect(match(bar('early',{schedule:{lun:'09:00 – 18:00'}}),'noche')).toBe(false);
   expect(match({category:'fitness',type:'Club de pádel',schedule:late},'noche')).toBe(false);
 });
 it('recognizes split shifts, 12-hour clocks and serialized schedules',()=>{
   expect(closesLate({sab:'09:00 – 14:00\n18:00 – 11:00 PM'})).toBe(true);
   expect(closesLate(JSON.stringify(late))).toBe(true);
   expect(closesLate({type:'none',vie:'18:00 – 02:00'})).toBe(false);
   expect(closesLate({type:'regular',vie:'Cerrado'})).toBe(false);
 });
 it('keeps coffee, food, shopping, experiences and drinks relevant',()=>{
   expect(match({category:'cafeterías'},'cafe')).toBe(true);
   expect(match({category:'restaurantes',type:'Taquerías'},'comer')).toBe(true);
   expect(match(bar('drink'),'tomar')).toBe(true);
   expect(match({category:'cafeterias'},'tomar')).toBe(false);
   expect(match({category:'compras',type:'Boutique'},'compras')).toBe(true);
   expect(match({category:'hospedaje',type:'Hotel'},'compras')).toBe(false);
   expect(match({category:'lugares'},'planes')).toBe(true);
   expect(match({isExperience:true},'planes')).toBe(true);
   expect(match({isExperience:true},'comer')).toBe(false);
 });
 it('builds bounded approved city/category requests, not a search across business names',()=>{
   const params=new URLSearchParams(surpriseBusinessQuery(['tepic','x),status.eq.draft'],mood('noche'),100));
   expect(params.get('status')).toBe('eq.approved'); expect(params.get('plan')).toBe('neq.menu');
   expect(params.get('offset')).toBe('100');expect(params.get('limit')).toBe('100');expect(params.get('order')).toBe('id.asc');
   expect(params.getAll('or')[0]).toBe('(city_slug.ilike.*tepic*)');
   expect(params.getAll('or')[1]).toContain('category.imatch.');
   expect(params.getAll('or')[1]).not.toContain('name.');
 });
});
describe('surprise candidate pagination',()=>{
 it('searches beyond the initial home businesses',async()=>{
   const get=vi.fn(async()=>[bar('remote')]);
   const rows=await loadSurpriseCandidates({...base(),get,local:[{id:'local',category:'restaurantes'}]});
   expect(rows.some(row=>row.id==='remote')).toBe(true);expect(get).toHaveBeenCalledTimes(1);
 });
 it('loads the next page before recycling seen results',async()=>{
   const options=base(),get=vi.fn().mockResolvedValueOnce([bar('a'),bar('b')]).mockResolvedValueOnce([bar('c')]);
   await loadSurpriseCandidates({...options,get,pageSize:2});
   const rows=await loadSurpriseCandidates({...options,get,pageSize:2,seen:new Set(['a','b']),excludeId:'b'});
   expect(rows.map(row=>row.id)).toEqual(['a','b','c']);expect(get).toHaveBeenCalledTimes(2);
   expect(new URLSearchParams(get.mock.calls[1][1]).get('offset')).toBe('2');
 });
 it('continues past pages containing only false positives',async()=>{
   const get=vi.fn().mockResolvedValueOnce([{id:'cafe',category:'cafeterias'}]).mockResolvedValueOnce([bar('real')]);
   const rows=await loadSurpriseCandidates({...base(),get,pageSize:1});
   expect(rows.filter(eligible).map(row=>row.id)).toEqual(['real']);expect(get).toHaveBeenCalledTimes(2);
 });
 it('uses cached unseen results without requesting each page again',async()=>{
   const options=base(),get=vi.fn(async()=>[bar('a'),bar('b')]);
   await loadSurpriseCandidates({...options,get});
   await loadSurpriseCandidates({...options,get,seen:new Set(['a']),excludeId:'a'});
   expect(get).toHaveBeenCalledTimes(1);
 });
 it('confirms the end only after an incomplete page and keeps errors retryable',async()=>{
   const options=base(),get=vi.fn().mockRejectedValueOnce(Error('offline')).mockResolvedValueOnce([]);
   await expect(loadSurpriseCandidates({...options,get})).rejects.toThrow('offline');
   await loadSurpriseCandidates({...options,get});expect(get).toHaveBeenCalledTimes(2);
   await loadSurpriseCandidates({...options,get});expect(get).toHaveBeenCalledTimes(2);
 });
 it('does not apply a result after closing the modal or changing cities',async()=>{
   let current=true;
   const get=vi.fn(async()=>{current=false;return [bar('stale')];});
   expect(await loadSurpriseCandidates({...base(),get,isCurrent:()=>current})).toEqual([]);
 });
 it('keeps the cursor separate for each city and plan',async()=>{
   const options=base(),get=vi.fn(async()=>[bar('a')]);
   await loadSurpriseCandidates({...options,get});
   await loadSurpriseCandidates({...options,get,citySlugs:['guadalajara']});
   await loadSurpriseCandidates({...options,get,mood:mood('tomar')});
   expect(get).toHaveBeenCalledTimes(3);
 });
});
