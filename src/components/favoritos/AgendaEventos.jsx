// Agenda de eventos guardados (propuesta C del artefacto «Propuestas Mis
// Favoritos»): tarjetas ordenadas por fecha con etiqueta de cuenta atrás
// (Hoy / Mañana / En N días…) calculada con la fecha real, y campana de
// recordatorio por evento. Presentacional: no lee stores ni contexto.
// Los eventos llegan ya ordenados (ordenarAgendaEventos).

import Icon from '../ui/Icon.jsx';
import { countdownEvento } from '../../lib/countdownEvento.js';
import { formatReminderTime } from '../../lib/recordatoriosEventos.js';
import { colorParaLugar } from '../../lib/mapaFavoritos.js';
import { FONT_BIZ } from '../../lib/constants.js';

const MESES_ES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const MESES_EN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function fechaCorta(dateStr, lang) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr || ''));
  if (!m) return { day: '–', mon: '' };
  const meses = lang === 'en' ? MESES_EN : MESES_ES;
  return { day: String(Number(m[3])), mon: meses[Number(m[2]) - 1] || '' };
}

export default function AgendaEventos({ T, t, lang, events, todayStr, alertIds, onOpen, onBell }) {
  const dark = !!T.dark;
  const chipStyle = (kind) => {
    if (kind === 'hoy') return { background: 'rgba(220,38,38,0.12)', color: T.red };
    if (kind === 'manana') return { background: 'rgba(184,135,42,0.14)', color: T.gold };
    return { background: T.greenL, color: T.sub };
  };
  const chipText = (cd) => {
    if (cd.kind === 'hoy') return t('fav_cd_hoy', 'Hoy');
    if (cd.kind === 'manana') return t('fav_cd_manana', 'Mañana');
    if (cd.kind === 'en_dias') return t('fav_cd_en_dias', 'En ${n} días', { n: cd.days });
    if (cd.kind === 'ayer') return t('fav_cd_ayer', 'Fue ayer');
    if (cd.kind === 'hace_dias') return t('fav_cd_hace_dias', 'Hace ${n} días', { n: cd.days });
    return null;
  };

  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 18, fontWeight: 800, color: T.text, margin: '0 0 12px' }}>
        {t('fav_agenda', 'Agenda de eventos guardados')}
      </h3>
      <div style={{ display: 'grid', gap: 12 }}>
        {events.map((ev) => {
          const cd = countdownEvento(ev.date, todayStr);
          const { day, mon } = fechaCorta(ev.date, lang);
          const time12 = formatReminderTime(ev.time);
          const past = cd.kind === 'ayer' || cd.kind === 'hace_dias';
          const hasAlert = alertIds.includes(ev.id);
          const text = chipText(cd);
          return (
            <div
              key={ev.id}
              className="press"
              onClick={() => onOpen(ev)}
              style={{
                display: 'flex', gap: 12, background: T.bg, borderRadius: 16,
                overflow: 'hidden', position: 'relative',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                padding: 12, alignItems: 'center', cursor: 'pointer',
                opacity: past ? 0.8 : 1,
              }}
            >
              <div style={{ width: 62, height: 62, borderRadius: 11, flex: 'none', background: colorParaLugar(ev.id), color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 19, fontWeight: 800, lineHeight: 1 }}>{day}</span>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em' }}>{mon}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: FONT_BIZ, fontWeight: 800, fontSize: 14, color: T.text, lineHeight: 1.2, marginBottom: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{ev.title}</div>
                {ev.venue_name && (
                  <div style={{ fontSize: 12, color: T.sub, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="pin" size={10} color={T.sub} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {ev.venue_name}{time12 ? ` · ${time12}` : ''}
                    </span>
                  </div>
                )}
              </div>
              {text && (
                <span style={{ fontSize: 11, fontWeight: 800, borderRadius: 99, padding: '5px 9px', whiteSpace: 'nowrap', ...chipStyle(cd.kind) }}>{text}</span>
              )}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onBell(ev); }}
                aria-label={t('fav_recordatorio_aria', 'Recordatorio para ${name}', { name: ev.title })}
                aria-pressed={hasAlert}
                style={{
                  width: 40, height: 40, flex: 'none', borderRadius: 11,
                  border: hasAlert ? '1px solid transparent' : `1px solid ${T.border}`,
                  background: hasAlert ? 'rgba(184,135,42,0.14)' : T.white,
                  color: hasAlert ? T.gold : T.sub,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}
              >
                <Icon name="bell" size={18} color={hasAlert ? T.gold : T.sub} />
              </button>
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: 13, color: T.sub, fontWeight: 600, lineHeight: 1.5, margin: '12px 2px 0' }}>
        {t('fav_agenda_hint', 'La campana añade el evento a tu calendario con alerta. Además, los eventos guardados te avisan el día del evento por notificación.')}
      </p>
    </div>
  );
}
