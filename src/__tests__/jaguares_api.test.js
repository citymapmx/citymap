import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const request = method => new Request('https://citymap.mx/api/jaguares-games', { method: method || 'GET' });
const team = id => ({ id, name: id === 10 ? 'Jaguares de Nayarit' : 'Charros de Jalisco', logo: 'https://images.test/team.png' });
const game = (id, status = 'NS', home = 10, away = 20) => ({ id, date: '2026-10-18T17:00:00-07:00', status: { short: status }, teams: { home: team(home), away: team(away) }, scores: { home: { total: 0 }, away: { total: 4 } } });
const json = value => new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });
let handler;
beforeEach(async () => {
  vi.resetModules();
  vi.stubEnv('API_SPORTS_KEY', 'private-test-key');
  vi.stubEnv('JAGUARES_SEASON', '2026');
  vi.stubEnv('JAGUARES_LEAGUE_ID', '');
  vi.stubEnv('JAGUARES_TEAM_ID', '');
  vi.stubGlobal('fetch', vi.fn(async url => {
    const path = new URL(url).pathname;
    const response = path === '/leagues' ? [{ id: 1, name: 'LMB' }, { id: 22, name: 'LMP' }] : path === '/teams' ? [team(10), team(20)] : [game(1), game(2, 'FT'), game(3, 'POST'), game(4, 'FT', 30, 20)];
    return json({ errors: [], response });
  }));
  handler = (await import('../../api/jaguares-games.js')).default;
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('Jaguares sports provider integration', () => {
  it('makes no upstream requests when a private key has not been configured', async () => {
    vi.stubEnv('API_SPORTS_KEY', '');
    const result = await handler(request());
    expect(result.status).toBe(503);
    expect(await result.json()).toEqual({ available: false });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('discovers LMP and Jaguares and normalizes games without inventing final states', async () => {
    const result = await handler(request());
    const data = await result.json();
    expect(result.status).toBe(200);
    expect(data.games).toHaveLength(3);
    expect(data.games[1].status).toBe('FT');
    expect(data.games[1].home.score).toBe(0);
    expect(data.games[2].status).toBe('POST');
    const url = new URL(fetch.mock.calls[2][0]);
    expect(url.searchParams.get('league')).toBe('22');
    expect(url.searchParams.get('team')).toBe('10');
    expect(url.searchParams.get('timezone')).toBe('America/Mazatlan');
    expect(fetch.mock.calls[0][1].headers['x-apisports-key']).toBe('private-test-key');
    expect(JSON.stringify(data)).not.toContain('private-test-key');
  });
  it('shares concurrent requests and reuses the hourly cache', async () => {
    const results = await Promise.all([handler(request()), handler(request())]);
    expect(results.every(result => result.status === 200)).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(3);
    await handler(request());
    expect(fetch).toHaveBeenCalledTimes(3);
  });
  it('can use verified IDs to avoid repeated discovery calls', async () => {
    vi.stubEnv('JAGUARES_LEAGUE_ID', '22');
    vi.stubEnv('JAGUARES_TEAM_ID', '10');
    await handler(request());
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toContain('/games?');
  });
  it('handles provider quota errors even when the HTTP response is successful', async () => {
    fetch.mockResolvedValue(json({ errors: { requests: 'quota exceeded' }, response: [] }));
    const result = await handler(request());
    expect(result.status).toBe(503);
    expect(await result.json()).toEqual({ available: false });
  });
  it('does not forward browser query parameters to the provider', async () => {
    await handler(new Request('https://citymap.mx/api/jaguares-games?team=999&league=1'));
    expect(fetch.mock.calls[2][0]).toContain('team=10');
    expect(fetch.mock.calls[2][0]).not.toContain('999');
  });
  it('rejects writes without calling the provider', async () => {
    expect((await handler(request('POST'))).status).toBe(405);
    expect(fetch).not.toHaveBeenCalled();
  });
});
