import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import register from '../../api/register-token.js';
import unregister from '../../api/unregister-token.js';
const token = 'device-token-for-test-1234567890';
async function invoke(handler, body, authorization = 'Bearer jwt') {
 const res = { statusCode: 200, setHeader: vi.fn(), status(code) { this.statusCode=code;return this; }, json(data) {this.data=data;return this;}, end(){} };
 await handler({method:'POST',headers:{authorization},body},res);return res;
}
beforeEach(()=>{vi.stubEnv('VITE_SUPABASE_URL','https://db.test');vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','server');vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({id:'actual-user'})}));});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
describe('push token ownership',()=>{
 it.each([register,unregister])('rejects requests without a session',async handler=>{expect((await invoke(handler,{token},null)).statusCode).toBe(401);expect(fetch).not.toHaveBeenCalled();});
 it('ignores a forged user id and derives ownership from the verified session',async()=>{
 fetch.mockResolvedValueOnce({ok:true,json:async()=>({id:'actual-user'})}).mockResolvedValueOnce({ok:true,json:async()=>[]}).mockResolvedValueOnce({ok:true});
 expect((await invoke(register,{token,user_id:'victim',platform:'web'})).statusCode).toBe(200);
 expect(JSON.parse(fetch.mock.calls[2][1].body).user_id).toBe('actual-user');
 });
 it('cannot take over another user device',async()=>{
 fetch.mockResolvedValueOnce({ok:true,json:async()=>({id:'actual-user'})}).mockResolvedValueOnce({ok:true,json:async()=>[{user_id:'victim'}]});
 expect((await invoke(register,{token})).statusCode).toBe(409);expect(fetch).toHaveBeenCalledTimes(2);
 });
 it('deletes only a token belonging to the authenticated user',async()=>{
 fetch.mockResolvedValueOnce({ok:true,json:async()=>({id:'actual-user'})}).mockResolvedValueOnce({ok:true});
 expect((await invoke(unregister,{token,user_id:'victim'})).statusCode).toBe(200);
 expect(fetch.mock.calls[1][0]).toContain('user_id=eq.actual-user');
 });
 it('reports a failed database deletion',async()=>{
 fetch.mockResolvedValueOnce({ok:true,json:async()=>({id:'actual-user'})}).mockResolvedValueOnce({ok:false});
 expect((await invoke(unregister,{token})).statusCode).toBe(500);
 });
});
