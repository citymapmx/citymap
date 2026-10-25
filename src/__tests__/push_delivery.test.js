import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({send:vi.fn()}));
vi.mock('firebase-admin/app',()=>({getApps:()=>[{}],initializeApp:vi.fn(),cert:vi.fn()}));
vi.mock('firebase-admin/messaging',()=>({getMessaging:()=>({sendEachForMulticast:mocks.send})}));
import handler from '../../api/send-notification.js';
async function invoke(body){const res={statusCode:200,setHeader:vi.fn(),status(code){this.statusCode=code;return this;},json(data){this.data=data;return this;}};await handler({method:'POST',headers:{},body:{secret:'server-secret',title:'Prueba',body:'Mensaje',...body}},res);return res;}
beforeEach(()=>{vi.stubEnv('ADMIN_SECRET','server-secret');vi.stubEnv('VITE_SUPABASE_URL','https://db.test');vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','server');vi.stubGlobal('fetch',vi.fn());mocks.send.mockReset();});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
describe('notification delivery without real sends',()=>{
 it('passes images and safe destinations to Firebase',async()=>{
 fetch.mockResolvedValue({ok:true,json:async()=>[{token:'device'}]});mocks.send.mockResolvedValue({successCount:1,failureCount:0,responses:[{success:true}]});
 const result=await invoke({imageUrl:'https://images.test/photo.jpg',deepLink:'https://citymap.mx/evento/test'});
 expect(result.statusCode).toBe(200);
 expect(mocks.send.mock.calls[0][0]).toMatchObject({notification:{imageUrl:'https://images.test/photo.jpg'},webpush:{fcmOptions:{link:'https://citymap.mx/evento/test'}}});
 });
 it('cleans the failed token in the second batch, not a token from the first',async()=>{
 const tokens=Array.from({length:501},(_,i)=>({token:`token-${i}`}));
 fetch.mockResolvedValueOnce({ok:true,json:async()=>tokens}).mockResolvedValueOnce({ok:true});
 mocks.send.mockResolvedValueOnce({successCount:500,failureCount:0,responses:Array.from({length:500},()=>({success:true}))}).mockResolvedValueOnce({successCount:0,failureCount:1,responses:[{success:false,error:{code:'messaging/registration-token-not-registered'}}]});
 const result=await invoke({});expect(result.data.successCount).toBe(500);
 expect(decodeURIComponent(fetch.mock.calls[1][0])).toContain('"token-500"');expect(decodeURIComponent(fetch.mock.calls[1][0])).not.toContain('"token-0"');
 });
 it('does not report a missing recipient as successful delivery',async()=>{
 fetch.mockResolvedValue({ok:true,json:async()=>[]});const result=await invoke({});expect(result.data.successCount).toBe(0);expect(mocks.send).not.toHaveBeenCalled();
 });
 it('targets only the verified administrator for a self-test, ignoring a forged recipient',async()=>{
 fetch.mockResolvedValueOnce({ok:true,json:async()=>({id:'self-admin',app_metadata:{isAdmin:true}})}).mockResolvedValueOnce({ok:true}).mockResolvedValueOnce({ok:true,json:async()=>[]});
 const res={statusCode:200,setHeader:vi.fn(),status(code){this.statusCode=code;return this;},json(data){this.data=data;return this;}};
 await handler({method:'POST',headers:{authorization:'Bearer admin-jwt'},body:{title:'Prueba',body:'Solo yo',test_self:true,user_id:'victim'}},res);
 expect(res.statusCode).toBe(200);
 expect(JSON.parse(fetch.mock.calls[1][1].body).user_id).toBe('self-admin');
 expect(fetch.mock.calls[2][0]).toContain('user_id=eq.self-admin');
 expect(mocks.send).not.toHaveBeenCalled();
 });
 it('rejects an unsafe link before accessing recipients',async()=>{expect((await invoke({deepLink:'https://evil.test'})).statusCode).toBe(400);expect(fetch).not.toHaveBeenCalled();});
});
