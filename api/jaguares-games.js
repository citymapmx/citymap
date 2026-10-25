/* global process */
const PROVIDER = 'https://v1.baseball.api-sports.io';
const CACHE_MS = 60 * 60 * 1000;
let cached = null;
let pending = null;

const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const safeLogo = value => /^https:\/\//i.test(value || '') ? value : null;
const score = value => value !== null && value !== undefined && value !== '' && typeof value !== 'boolean' && Number.isFinite(Number(value)) ? Number(value) : null;

export default async function handler(request) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
  const key = process.env.API_SPORTS_KEY;
  if (!key) return Response.json({ available: false }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  const date = new Date();
  const year = Number(new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'America/Mazatlan' }).format(date));
  const month = Number(new Intl.DateTimeFormat('en', { month: 'numeric', timeZone: 'America/Mazatlan' }).format(date));
  const season = Number(process.env.JAGUARES_SEASON || (month < 7 ? year - 1 : year));
  const identity = `${key}:${season}:${process.env.JAGUARES_LEAGUE_ID || ''}:${process.env.JAGUARES_TEAM_ID || ''}`;
  const respond = data => Response.json(data, { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300', 'X-Robots-Tag': 'noindex' } });
  if (cached?.identity === identity && Date.now() - cached.time < CACHE_MS) return respond(cached.data);
  try {
    if (!pending || pending.identity !== identity) {
      const promise = (async () => {
        async function query(path, params) {
          const response = await fetch(`${PROVIDER}/${path}?${new URLSearchParams(params)}`, {
            headers: { 'x-apisports-key': key }, signal: AbortSignal.timeout(12000),
          });
          if (!response.ok) throw new Error('Sports provider unavailable');
          const data = await response.json();
          if (Object.keys(data.errors || {}).length || !Array.isArray(data.response)) throw new Error('Invalid sports provider response');
          return data.response;
        }
        let leagueId = process.env.JAGUARES_LEAGUE_ID;
        if (!leagueId) {
          const leagues = await query('leagues', { country: 'Mexico', season: String(season) });
          const league = leagues.find(item => normalize(item.name) === 'lmp' || normalize(item.name).includes('pacific'));
          if (!league?.id) throw new Error('LMP not found');
          leagueId = league.id;
        }
        let teamId = process.env.JAGUARES_TEAM_ID;
        if (!teamId) {
          const teams = await query('teams', { league: String(leagueId), season: String(season) });
          const team = teams.find(item => normalize(item.name).includes('jaguares') && normalize(item.name).includes('nayarit'));
          if (!team?.id) throw new Error('Jaguares not found');
          teamId = team.id;
        }
        const rows = await query('games', { league: String(leagueId), season: String(season), team: String(teamId), timezone: 'America/Mazatlan' });
        const games = rows.filter(game => [game.teams?.home?.id, game.teams?.away?.id].some(id => String(id) === String(teamId))).map(game => {
          const startsAt = game.date;
          if (!game.id || !startsAt || Number.isNaN(Date.parse(startsAt))) return null;
          return { id: game.id, startsAt, status: game.status?.short || 'NS',
            home: { name: game.teams.home.name, logo: safeLogo(game.teams.home.logo), score: score(game.scores?.home?.total) },
            away: { name: game.teams.away.name, logo: safeLogo(game.teams.away.logo), score: score(game.scores?.away?.total) },
            atHome: String(game.teams.home.id) === String(teamId),
          };
        }).filter(Boolean).sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
        const data = { available: true, provider: 'API-Sports', season, updatedAt: new Date().toISOString(), games };
        cached = { identity, time: Date.now(), data };
        return data;
      })();
      pending = { identity, promise };
    }
    return respond(await pending.promise);
  } catch {
    if (cached?.identity === identity && Date.now() - cached.time < 24 * CACHE_MS) {
      return Response.json({ ...cached.data, stale: true }, { headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
    }
    return Response.json({ available: false }, { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '3600' } });
  } finally { pending = null; }
}
export const config = { runtime: 'edge' };
