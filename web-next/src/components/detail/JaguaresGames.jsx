import { useEffect, useState } from 'react';
import { getThumbUrl } from '../../lib/utils.js';

const CALENDAR_URL = 'https://jaguaresdenayarit.com/rol-de-juego/';

export default function JaguaresGames({ business, T }) {
  const slug = String(business?.slug || '').toLowerCase().replace(/^tepic-/, '');
  const name = String(business?.name || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (slug !== 'jaguares-de-nayarit' && name !== 'jaguares de nayarit') return null;

  return <JaguaresContent business={business} T={T} />;
}

function JaguaresContent({ business, T }) {
  const [sports, setSports] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/jaguares-games', { signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(data => { if (!controller.signal.aborted && data?.available && Array.isArray(data.games)) setSports(data); })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  return (
    <section aria-label="Juegos de Jaguares" style={{ padding: '20px 20px 0', textAlign: 'left' }}>
      <h2 style={{ margin: '0 0 12px', color: T.text, fontFamily: 'inherit', fontSize: 16, fontWeight: 800 }}>Juegos de Jaguares</h2>
      <div style={{ padding: 20, borderRadius: 18, background: 'linear-gradient(135deg, #0B1731, #173969)', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          {business.logo_url && <img src={getThumbUrl(business.logo_url, 200)} alt="" width="46" height="46" style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'contain', background: '#fff' }} loading="lazy" decoding="async" />}
          <div>
            <p style={{ margin: '0 0 3px', color: '#B8CCE8', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Calendario oficial</p>
            <h3 style={{ margin: 0, fontFamily: 'inherit', fontSize: 19, fontWeight: 800 }}>Jaguares de Nayarit</h3>
          </div>
        </div>
        {sports?.games?.length ? <JaguaresResults data={sports} /> : <>
          <p style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700 }}>Planea tu próximo juego</p>
          <p style={{ margin: '0 0 18px', color: '#D5E1F2', fontSize: 13, lineHeight: 1.6 }}>Consulta rivales, fechas, horarios y sedes de los partidos en casa y de visita.</p>
        </>}
        <a href={CALENDAR_URL} target="_blank" rel="noopener noreferrer" aria-label="Ver calendario oficial de Jaguares de Nayarit (abre en otra pestaña)" style={{ display: 'inline-flex', alignItems: 'center', gap: 14, background: '#fff', color: '#0B1731', padding: '11px 16px', borderRadius: 12, textDecoration: 'none', fontSize: 13, fontWeight: 800 }}>
          Ver calendario <span aria-hidden="true">↗</span>
        </a>
      </div>
      <p style={{ margin: '8px 2px 0', color: T.sub || T.text, fontSize: 11 }}>Calendario: sitio oficial de Jaguares de Nayarit.</p>
    </section>
  );
}


function JaguaresResults({ data }) {
  const [filter, setFilter] = useState('all');
  const [month, setMonth] = useState('all');
  const date = game => new Date(game.startsAt);
  const day = game => date(game).toLocaleDateString('es-MX', { timeZone: 'America/Mazatlan', day: 'numeric', month: 'long' });
  const time = game => date(game).toLocaleTimeString('es-MX', { timeZone: 'America/Mazatlan', hour: 'numeric', minute: '2-digit' });
  const monthKey = game => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mazatlan', year: 'numeric', month: '2-digit' }).format(date(game));
  const next = data.games.find(game => game.status === 'NS' && Date.parse(game.startsAt) >= Date.now());
  const last = [...data.games].reverse().find(game => game.status === 'FT' && game.home.score !== null && game.away.score !== null);
  const months = [...new Map(data.games.map(game => [monthKey(game), date(game).toLocaleDateString('es-MX', { timeZone: 'America/Mazatlan', month: 'long', year: 'numeric' })])).entries()];
  const visible = data.games.filter(game => (month === 'all' || monthKey(game) === month) && (filter === 'all' || game.atHome === (filter === 'home')));
  const status = game => game.status === 'FT' ? 'Final' : game.status === 'POST' ? 'Aplazado' : game.status === 'CANC' ? 'Cancelado' : game.status === 'NS' ? time(game) : game.status === 'INTR' ? 'Interrumpido' : game.status === 'ABD' ? 'Suspendido' : /^IN\d+$/.test(game.status) ? 'En juego' : 'Estado por confirmar';
  const teams = game => <span>{game.away.name} <strong>{game.status === 'FT' && game.home.score !== null && game.away.score !== null ? `${game.away.score} – ${game.home.score}` : 'vs'}</strong> {game.home.name}</span>;
  return <div style={{ marginBottom: 18 }}>
    {next && <div style={{ borderRadius: 12, padding: 14, marginBottom: 12, background: 'rgba(255,255,255,.1)' }}>
      <p style={{ margin: '0 0 10px', color: '#B8CCE8', fontSize: 11, textTransform: 'uppercase' }}>Próximo partido · {next.atHome ? 'En casa' : 'Visita'}</p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        {[next.away, next.home].map((team, i) => <div key={i} style={{ flex: 1, textAlign: 'center' }}>
          {team.logo && <img src={team.logo} alt="" width="40" height="40" style={{ objectFit: 'contain' }} loading="lazy" />}
          <p style={{ margin: '5px 0', fontSize: 13, fontWeight: 700 }}>{team.name}</p>
        </div>)}
      </div>
      <p style={{ margin: '12px 0 0', textAlign: 'center', fontSize: 14 }}>{day(next)} · {time(next)}</p>
      <p style={{ margin: '4px 0 0', textAlign: 'center', fontSize: 11, color: '#B8CCE8' }}>Hora de Tepic</p>
    </div>}
    {last && <div style={{ margin: '12px 0', fontSize: 13, lineHeight: 1.6 }}><p style={{ margin: '0 0 4px', color: '#B8CCE8' }}>Último resultado · {day(last)}</p>{teams(last)} <span>· Final</span></div>}
    <details style={{ borderTop: '1px solid rgba(255,255,255,.2)', paddingTop: 12 }}>
      <summary style={{ fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Ver juegos de la temporada</summary>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '12px 0' }}>
        <select aria-label="Filtrar juegos por mes" value={month} onChange={event => setMonth(event.target.value)} style={{ maxWidth: '100%', padding: 8, borderRadius: 8, color: '#0B1731', background: '#fff' }}><option value="all">Todos los meses</option>{months.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <select aria-label="Filtrar por local o visitante" value={filter} onChange={event => setFilter(event.target.value)} style={{ padding: 8, borderRadius: 8, color: '#0B1731', background: '#fff' }}><option value="all">Todos</option><option value="home">En casa</option><option value="away">Visita</option></select>
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: 360, overflowY: 'auto' }}>{visible.map(game => <li key={game.id} style={{ borderBottom: '1px solid rgba(255,255,255,.15)', padding: '12px 0', fontSize: 12, lineHeight: 1.7 }}><div style={{ color: '#B8CCE8' }}>{day(game)} · {game.atHome ? 'En casa' : 'Visita'}</div>{teams(game)}<div>{status(game)}</div></li>)}</ul>
      {!visible.length && <p style={{ fontSize: 12 }}>No hay juegos con estos filtros.</p>}
    </details>
    <p style={{ margin: '12px 0 0', fontSize: 10, color: '#B8CCE8' }}>{data.stale ? 'Datos guardados · ' : ''}API-Sports · Actualizado {new Date(data.updatedAt).toLocaleString('es-MX', { timeZone: 'America/Mazatlan' })}</p>
  </div>;
}
