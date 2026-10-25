import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect,vi,afterEach} from 'vitest';
import {isPromotionActive,validatePromotion,getPromotionProduct,isCartPromotionValid} from '../lib/menuPromotions.js';
import {isPromotionActive as isNextActive} from '../../web-next/src/lib/menuPromotions.js';
import {calculateItemTotal,useCart} from '../hooks/useCart.js';
import StorePromotions from '../components/store/StorePromotions.jsx';
const noon=new Date('2026-10-18T19:00:00Z');
const product=(changes={})=>({id:'combo',name:'3 tacos + bebida',price:130,is_available:true,store_product_options:[{id:'drink',type:'single',is_required:true,store_option_values:[{id:'water',label:'Agua',extra_price:0},{id:'soda',label:'Refresco',extra_price:5}]}],promotion:{enabled:true,sale_price:99,starts_on:'2026-10-18',ends_on:'2026-10-31',days:[0,1,2,3,4,5,6],intents:['local','delivery'],...changes}});
const active=(p,now=noon,intent='delivery')=>isPromotionActive(p,{now,intent,timeZone:'America/Mazatlan'});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();useCart.setState({items:[],businessId:null});});
describe('Menu promotion availability',()=>{
  it('only shows enabled, available products in the matching visit mode',()=>{
    expect(active(product())).toBe(true);
    expect(active(product({enabled:false}))).toBe(false);
    expect(active({...product(),is_available:false})).toBe(false);
    expect(active(product({intents:['local']}))).toBe(false);
    expect(active(product({intents:['local']}),noon,'local')).toBe(true);
  });
  it('honors inclusive local dates and removes future and expired offers',()=>{
    expect(active(product({starts_on:'2026-10-19'}))).toBe(false);
    expect(active(product({ends_on:'2026-10-17'}))).toBe(false);
    expect(active(product({ends_on:'2026-10-18'}))).toBe(true);
  });
  it('checks weekdays and opening/closing minute boundaries',()=>{
    expect(active(product({days:[1]}))).toBe(false);
    expect(active(product({start_time:'12:00',end_time:'13:00'}))).toBe(true);
    expect(active(product({start_time:'13:00',end_time:'14:00'}))).toBe(false);
    expect(active(product({start_time:'11:00',end_time:'12:00'}))).toBe(false);
  });
  it('keeps an overnight offer tied to the day it began, including the final night',()=>{
    const p=product({days:[0],start_time:'20:00',end_time:'02:00',ends_on:'2026-10-18'});
    expect(active(p,new Date('2026-10-19T08:00:00Z'))).toBe(true);
    expect(active(p,new Date('2026-10-19T09:00:00Z'))).toBe(false);
    expect(active(p,new Date('2026-10-19T18:00:00Z'))).toBe(false);
  });
  it('uses the business timezone rather than the device clock zone',()=>{
    const p=product({days:[0],start_time:'20:00',end_time:'23:59'});
    const now=new Date('2026-10-19T03:30:00Z');
    expect(isPromotionActive(p,{now,timeZone:'America/Mazatlan',intent:'local'})).toBe(true);
    expect(isPromotionActive(p,{now,timeZone:'Europe/Madrid',intent:'local'})).toBe(false);
    expect(isNextActive(p,{now,timeZone:'America/Mazatlan',intent:'local'})).toBe(true);
  });
  it.each([{sale_price:''},{sale_price:-5},{starts_on:'2026-11-01',ends_on:'2026-10-01'},{days:[]},{intents:[]},{start_time:'99:00'},{ends_on:'2026-02-30'}])('rejects invalid offer settings %j',changes=>{
    expect(validatePromotion(product(changes).promotion)).toBeTruthy();
    expect(active(product(changes))).toBe(false);
  });
});
describe('Promotion pricing and ordering',()=>{
  it('keeps regular price and all customization groups while applying the sale price',()=>{
    const original=product({conditions:'Incluye bebida de 355 ml.'});
    const promoted=getPromotionProduct(original);
    expect(original.price).toBe(130);
    expect(promoted.price).toBe(99);
    expect(promoted.store_product_options).toBe(original.store_product_options);
    expect(calculateItemTotal(promoted,[{value:{extra_price:5}}],2)).toBe(208);
    expect(promoted.description).toContain('Incluye bebida de 355 ml.');
  });
  it('refuses an expired promotion without changing the cart',()=>{
    vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-02T19:00:00Z'));
    const alert=vi.fn();vi.stubGlobal('window',{alert});
    expect(useCart.getState().addItem(getPromotionProduct(product()),[], '',1,'business')).toBe(false);
    expect(useCart.getState().items).toEqual([]);
    expect(alert).toHaveBeenCalledOnce();
  });
  it('validates again at checkout time and leaves ordinary products unaffected',()=>{
    const p=getPromotionProduct(product());
    expect(isCartPromotionValid(p,'delivery',noon)).toBe(true);
    expect(isCartPromotionValid(p,'delivery',new Date('2026-11-02T19:00:00Z'))).toBe(false);
    expect(isCartPromotionValid({id:'ordinary',price:130})).toBe(true);
  });
  it('shows price, conditions and ordering without showing inactive offers',()=>{
    vi.useFakeTimers();vi.setSystemTime(noon);
    const html=renderToStaticMarkup(<StorePromotions products={[product({conditions:'No acumulable.'}),{...product({enabled:false}),id:'hidden',name:'Oferta oculta'}]} intent="delivery" timeZone="America/Mazatlan" T={{text:'#111',sub:'#666'}} onSelect={()=>{}}/>);
    expect(html).toContain('$99');expect(html).toContain('$130');expect(html).toContain('Agregar promoción');expect(html).toContain('No acumulable.');expect(html).not.toContain('Oferta oculta');
  });
});
