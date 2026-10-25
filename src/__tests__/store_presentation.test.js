import {describe,it,expect,vi} from 'vitest';
import {isCatalogBusiness,readLegacyCatalog,saveStoreKind} from '../lib/storePresentation.js';
import {isCatalogBusiness as nextCatalog} from '../../web-next/src/lib/storePresentation.js';
const storage=value=>({getItem:()=>value,setItem:vi.fn()});
describe('Saved menu/catalog presentation',()=>{
  it.each([isCatalogBusiness,nextCatalog])('uses the saved business setting on every device',read=>{
    expect(read({id:'a',is_catalog:true},storage('false'))).toBe(true);
    expect(read({id:'a',is_catalog:false},storage('true'))).toBe(false);
    expect(read({id:'a',is_catalog:true},storage(null))).toBe(true);
  });
  it('keeps a legacy browser choice until it can be saved to the business',()=>{
    expect(isCatalogBusiness({id:'a',is_catalog:null},storage('true'))).toBe(true);
    expect(isCatalogBusiness({id:'a'},storage(null))).toBe(false);
    expect(readLegacyCatalog('a',storage('false'))).toBe(false);
  });
  it('saves the choice to the business before updating the browser preference',async()=>{
    const local=storage(null),client={patch:vi.fn().mockResolvedValue([])},business={id:'a',name:'Tienda'};
    const saved=await saveStoreKind(business,true,client,local);
    expect(client.patch).toHaveBeenCalledWith('businesses','a',{is_catalog:true});
    expect(local.setItem).toHaveBeenCalledWith('biz_iscatalog_a','true');
    expect(saved.is_catalog).toBe(true);
    expect(business.is_catalog).toBeUndefined();
    expect(isCatalogBusiness(saved,storage('false'))).toBe(true);
  });
  it('does not display an unsaved choice after a database failure',async()=>{
    const local=storage('false'),client={patch:vi.fn().mockRejectedValue(new Error('No se pudo guardar'))};
    await expect(saveStoreKind({id:'a',is_catalog:false},true,client,local)).rejects.toThrow('No se pudo guardar');
    expect(local.setItem).not.toHaveBeenCalled();
  });
  it('allows a saved catalog to be switched back to menu',async()=>{
    const saved=await saveStoreKind({id:'a',is_catalog:true},false,{patch:vi.fn().mockResolvedValue([])},storage('true'));
    expect(isCatalogBusiness(saved)).toBe(false);
  });
  it('works when local storage is blocked',async()=>{
    const blocked={getItem:()=>{throw Error('blocked');},setItem:()=>{throw Error('blocked');}};
    expect(isCatalogBusiness({id:'a',is_catalog:true},blocked)).toBe(true);
    expect(readLegacyCatalog('a',blocked)).toBeNull();
    expect((await saveStoreKind({id:'a'},true,{patch:vi.fn().mockResolvedValue([])},blocked)).is_catalog).toBe(true);
  });
});
