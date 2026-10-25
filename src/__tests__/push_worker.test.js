import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
function worker(){const listeners={},show=vi.fn(),navigate=vi.fn().mockResolvedValue({}),focus=vi.fn();let background;const self={location:{origin:'https://www.citymap.world'},registration:{showNotification:show},addEventListener:(name,cb)=>{listeners[name]=cb;},clients:{matchAll:async()=>[{url:'https://www.citymap.world/tepic',navigate,focus}],openWindow:vi.fn()}};runInNewContext(readFileSync('public/firebase-messaging-sw.js','utf8'),{self,URL,importScripts:()=>{},firebase:{initializeApp:()=>{},messaging:()=>({onBackgroundMessage:cb=>{background=cb;}})}});return {listeners,show,navigate,focus,background};}
describe('web notification worker',()=>{
 it('does not duplicate notifications already displayed by Firebase',()=>{const w=worker();w.background({notification:{title:'Evento'}});expect(w.show).not.toHaveBeenCalled();});
 it('displays a data-only notification once',()=>{const w=worker();w.background({data:{title:'Evento',deepLink:'/evento/abc'}});expect(w.show).toHaveBeenCalledOnce();});
 it('navigates the existing CityMap window to the event when clicked',async()=>{const w=worker();let pending;w.listeners.notificationclick({notification:{data:{deepLink:'/evento/abc'},close:vi.fn()},stopImmediatePropagation:vi.fn(),waitUntil:p=>{pending=p;}});await pending;expect(w.navigate).toHaveBeenCalledWith('https://www.citymap.world/evento/abc');expect(w.focus).toHaveBeenCalled();});
});
