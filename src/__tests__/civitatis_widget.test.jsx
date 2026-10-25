import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {HelmetProvider} from 'react-helmet-async';
import {describe,it,expect,vi} from 'vitest';
import CivitatisWidget from '../components/CivitatisWidget.jsx';
import TripsView from '../components/TripsView.jsx';
import {AppContext} from '../context/AppContext.jsx';
import {useDataStore} from '../store/useDataStore.js';
import {getCivitatisWidgetSrc,validateCivitatisWidgetCode} from '../lib/civitatisWidget.js';
import {getCivitatisWidgetSrc as nextSrc} from '../../web-next/src/lib/civitatisWidget.js';
vi.hoisted(()=>{globalThis.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};});
vi.mock('react-router-dom',()=>({useNavigate:()=>vi.fn(),useLocation:()=>({pathname:'/revista/guadalajara'}),useParams:()=>({})}));
const code=`<div style='text-align:center;'><script>function loadScript(){};loadScript('https://www.civitatis.com/f/js/vendor/iframeResizer.min.js',function(){iFrameResize({checkOrigin:false})});</script><iframe class='civitatis-iframe' src='https://www.civitatis.com/widget-activities/?affiliated=114552&display=cosy&cant=15&lang=es&currency=MXN&destination=283&transfer=0&cmp=Widget_Guadalajara_ES&width=100%&hideButton=0&centerContent=1&typeSelection=all&color=f70759&typography=Montserrat&removeBackground=1&showShadow=0&roundedButtons=1' width='100%' frameborder='0' data-maxwidth='100%' style='max-width:100%'></iframe></div>`;
const T={text:'#111',sub:'#666',bg:'#fff',white:'#fff',border:'#ddd'};
describe('per-city Civitatis embed',()=>{
 it('accepts the supplied format and preserves all affiliate and city parameters',()=>{
  const src=getCivitatisWidgetSrc(code);expect(nextSrc(code)).toBe(src);
  const url=new URL(src);
  expect(url.searchParams.get('affiliated')).toBe('114552');expect(url.searchParams.get('destination')).toBe('283');expect(url.searchParams.get('cmp')).toBe('Widget_Guadalajara_ES');expect(url.searchParams.get('width')).toBe('100%');expect(url.searchParams.get('cant')).toBe('15');
  expect(validateCivitatisWidgetCode(code)).toBe(code);
 });
 it('supports encoded ampersands without losing parameters',()=>{
  expect(new URL(getCivitatisWidgetSrc(code.replaceAll('&','&amp;'))).searchParams.get('destination')).toBe('283');
 });
 it.each(['',null,undefined,'   '])('treats an empty field %s as removal',value=>{expect(validateCivitatisWidgetCode(value)).toBeNull();expect(getCivitatisWidgetSrc(value)).toBeNull();});
 it.each(['javascript:alert(1)','https://www.civitatis.com.evil.test/widget-activities/','https://evil.test/widget-activities/','http://www.civitatis.com/widget-activities/','https://user:pass@www.civitatis.com/widget-activities/','https://www.civitatis.com/other/'])('rejects unsupported iframe source %s',src=>{expect(()=>validateCivitatisWidgetCode(`<iframe src='${src}'></iframe>`)).toThrow();});
 it('rejects multiple iframes, non-widget HTML and oversized content',()=>{
  expect(()=>validateCivitatisWidgetCode(code+code)).toThrow();expect(()=>validateCivitatisWidgetCode('<script>alert(1)</script>')).toThrow();expect(()=>validateCivitatisWidgetCode('x'.repeat(50001))).toThrow();
 });
 it('renders a responsive native iframe without injecting saved scripts or markup',()=>{
  const html=renderToStaticMarkup(<CivitatisWidget code={code.replace('function loadScript(){}','alert("not executed")')} cityName="Guadalajara" T={T}/>);
  expect(html).toContain('title="Tours y actividades en Guadalajara · Civitatis"');expect(html).toContain('width="100%"');expect(html).toContain('destination=283');expect(html).not.toContain('<script');expect(html).not.toContain('not executed');
 });
 it('does not render any widget container for a missing or invalid code',()=>{
  expect(renderToStaticMarkup(<CivitatisWidget code=""/>)).toBe('');expect(renderToStaticMarkup(<CivitatisWidget code="invalid"/>)).toBe('');
 });
 it('keeps Tours available with a widget even if the city has no businesses or articles',()=>{
  useDataStore.setState({experiences:[],dbReady:true});
  const html=renderToStaticMarkup(<HelmetProvider><AppContext.Provider value={{}}><TripsView T={T} dark={false} activeCity="guadalajara" cities={[{slug:'guadalajara',name:'Guadalajara',civitatis_widget_code:code}]} mapPins={[]}/></AppContext.Provider></HelmetProvider>);
  expect(html).toContain('🗺️ Tours');expect(html).not.toContain('class="civitatis-iframe"');
 });
});
describe('shared Civitatis script loader',()=>{
 it('deduplicates concurrent loads, retries after failure and reuses the loaded library',async()=>{
  vi.resetModules();const {loadCivitatisResizer}=await import('../lib/civitatisWidget.js');
  const scripts=[];
  const doc={getElementById:id=>scripts.find(s=>s.id===id&&!s.removed),createElement:()=>Object.assign(new EventTarget(),{remove(){this.removed=true;}}),head:{appendChild:s=>scripts.push(s)}};
  const win={};
  const failed=loadCivitatisResizer(doc,win);const expectFailure=expect(failed).rejects.toThrow();
  scripts[0].dispatchEvent(new Event('error'));await expectFailure;
  const first=loadCivitatisResizer(doc,win),second=loadCivitatisResizer(doc,win);
  expect(first).toBe(second);expect(scripts).toHaveLength(2);
  win.iFrameResize=vi.fn();scripts[1].dispatchEvent(new Event('load'));
  expect(await first).toBe(win.iFrameResize);expect(await second).toBe(win.iFrameResize);expect(await loadCivitatisResizer(doc,win)).toBe(win.iFrameResize);expect(scripts).toHaveLength(2);
 });
});
