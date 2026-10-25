import {describe,it,expect} from 'vitest';
import {getHomeVisualState} from '../lib/homeReadiness.js';
const image=(props={},box={top:0,left:0,right:200,bottom:100,width:200,height:100})=>({complete:true,naturalWidth:800,getBoundingClientRect:()=>box,...props});
const documentWith=(images=[],city='tepic',fonts={status:'loaded',check:()=>true})=>({fonts,querySelectorAll:()=>[{getAttribute:()=>city,querySelectorAll:()=>images}],querySelector:()=>null});
const viewport={width:390,height:844};
describe('home reveal readiness',()=>{
 it('waits for the current city rather than revealing a previous city',()=>{expect(getHomeVisualState(documentWith([],'madrid'),'tepic',viewport)).toBe('loading');});
 it('waits for visible images to finish loading',()=>{expect(getHomeVisualState(documentWith([image({complete:false})]),'tepic',viewport)).toBe('loading');});
 it('does not wait for lazy images below the first screen',()=>{const below=image({complete:false},{top:1000,bottom:1100,left:0,right:200,width:200,height:100});expect(getHomeVisualState(documentWith([image(),below]),'tepic',viewport)).toBe('ready');});
 it('does not wait for images outside a horizontal carousel viewport',()=>{const outside=image({complete:false},{top:10,bottom:100,left:800,right:1000,width:200,height:90});expect(getHomeVisualState(documentWith([image(),outside]),'tepic',viewport)).toBe('ready');});
 it('does not wait for hidden carousel slides',()=>{expect(getHomeVisualState(documentWith([image({complete:false,closest:()=>({})})]),'tepic',viewport)).toBe('ready');});
 it('does not wait for unrelated fonts after the splash font is ready',()=>{expect(getHomeVisualState(documentWith([],'tepic',{status:'loading',check:()=>true}),'tepic',viewport)).toBe('ready');});
 it('waits for the real typeface' ,()=>{expect(getHomeVisualState(documentWith([],'tepic',{status:'loading',check:()=>false}),'tepic',viewport)).toBe('loading');});
 it('reports an image failure instead of treating a broken image as ready',()=>{expect(getHomeVisualState(documentWith([image({naturalWidth:0})]),'tepic',viewport)).toBe('error');});
 it('reveals a loaded empty city without requiring nonexistent cards',()=>{expect(getHomeVisualState(documentWith([]),'tepic',viewport)).toBe('ready');});
});

import {vi} from 'vitest';
import {useDataStore} from '../store/useDataStore.js';
import {sb} from '../lib/supabase.js';
describe('home data readiness',()=>{
 it('keeps secondary data pending after core data is available',async()=>{
  const storage={getItem:key=>key==='cg_city_slug'?'tepic':null,setItem:vi.fn()};
  vi.stubGlobal('localStorage',storage);
  let finishExperiences;
  const experiences=new Promise(resolve=>{finishExperiences=resolve;});
  const request=vi.spyOn(sb,'get').mockImplementation(async table=>table==='cities'?[{slug:'tepic',name:'Tepic',state:''}]:table==='experiences'?experiences:[]);
  const rpc=vi.spyOn(sb,'rpc').mockResolvedValue([]);
  try{
   await useDataStore.getState().loadData('tepic');
   expect(useDataStore.getState().homeCoreCity).toBe('tepic');
   expect(useDataStore.getState().initialBizCount).toBe(0);
   expect(useDataStore.getState().homeSecondaryCity).toBeNull();
   finishExperiences([]);
   await vi.waitFor(()=>expect(useDataStore.getState().homeSecondaryCity).toBe('tepic'));
   expect(useDataStore.getState().homeSecondaryError).toBe(false);
  }finally{request.mockRestore();rpc.mockRestore();vi.unstubAllGlobals();}
 });
});
