// Mapa esquemático de Mis Favoritos (propuesta C del artefacto
// «Propuestas Mis Favoritos»): pines numerados de los lugares guardados,
// contador de visitados con barra, tarjeta del lugar seleccionado y
// leyenda. Presentacional: no lee stores ni contexto, todo llega por props.
// Los pines llevan x/y en porcentaje (los calcula projectToMap).

import Icon from '../ui/Icon.jsx';
import { getThumbUrl } from '../../lib/utils.js';
import { colorParaLugar } from '../../lib/mapaFavoritos.js';
import { FONT_BIZ } from '../../lib/constants.js';

const AVENUES = [
  { left: '-4%', top: '44%', width: '108%', height: 9, transform: 'rotate(-7deg)' },
  { left: '44%', top: '-4%', width: 9, height: '108%', transform: 'rotate(5deg)' },
];

const PARKS = [
  { left: '8%', bottom: '9%', width: 88, height: 64 },
  { right: '7%', top: '10%', width: 64, height: 52 },
];

// Etiquetas del mapa esquemático de Guadalajara (propuesta C). Solo se
// muestran cuando la ciudad activa es de la zona metropolitana de
// Guadalajara; en otras ciudades el mapa va sin etiquetas de colonia.
const ZONES_GDL = [
  { label: 'Providencia', left: '16%', top: '12%' },
  { label: 'Americana', left: '38%', top: '38%' },
  { label: 'Centro', right: '12%', bottom: '16%' },
  { label: 'Parque', left: '10%', bottom: '8%' },
];

export default function FavoritosMapa({
  T, t, places, selectedId, onSelect,
  filter, onFilterChange, visitedIds,
  onToggleVisit, onGoDir, onOrganize, onToggleFav, onOpen,
  showZones, cityName,
}) {
  const total = places.length;
  const visitedCount = places.filter((p) => visitedIds.includes(p.id)).length;
  const pct = total ? Math.round((visitedCount / total) * 100) : 0;
  const selected = places.find((p) => p.id === selectedId) || places[0];
  const dark = !!T.dark;
  const mapBg = dark ? '#20261F' : '#E8EFE9';
  const mapLine = dark ? 'rgba(255,255,255,0.07)' : 'rgba(15,26,20,0.06)';
  const road = dark ? '#313832' : '#FFFFFF';
  const park = dark ? '#2A3B2C' : '#CDE6C5';
  const visitedColor = dark ? '#3ECFAD' : '#0E7C66';
  const visitedSoft = dark ? '#14332B' : '#E3F2EE';

  const isDim = (p) =>
    (filter === 'pendientes' && visitedIds.includes(p.id)) ||
    (filter === 'visitados' && !visitedIds.includes(p.id));

  const chipStyle = (active) => ({
    border: `1px solid ${active ? T.text : T.border}`,
    background: active ? T.text : T.white,
    color: active ? T.bg : T.sub,
    borderRadius: 99,
    fontWeight: 800,
    fontSize: 13,
    padding: '8px 14px',
    minHeight: 38,
    cursor: 'pointer',
    fontFamily: 'inherit',
  });

  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 18, fontWeight: 800, color: T.text, margin: '0 0 12px' }}>
        {t('fav_mapa_titulo', 'Mapa de tus favoritos')}
      </h3>

      {/* Filtro de pines */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }} role="group" aria-label={t('fav_filtro_titulo', 'Filtrar pines del mapa')}>
        <button type="button" style={chipStyle(filter === 'todos')} onClick={() => onFilterChange('todos')}>{t('fav_filtro_todos', 'Todos')}</button>
        <button type="button" style={chipStyle(filter === 'pendientes')} onClick={() => onFilterChange('pendientes')}>{t('fav_filtro_pendientes', 'Sin visitar')}</button>
        <button type="button" style={chipStyle(filter === 'visitados')} onClick={() => onFilterChange('visitados')}>{t('fav_filtro_visitados', 'Visitados')}</button>
      </div>

      {/* Contador de visitados + barra */}
      <div style={{ marginBottom: 12 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: '8px 12px', fontSize: 13, fontWeight: 800, color: T.text }}>
          {visitedCount} {t('fav_contador_de', 'de')} {total} {t('fav_visitados', 'visitados')}
          <span style={{ height: 6, background: T.greenL, borderRadius: 99, overflow: 'hidden', width: 110, display: 'inline-block' }}>
            <i style={{ display: 'block', height: '100%', background: visitedColor, width: `${pct}%` }} />
          </span>
        </span>
      </div>

      {/* Mapa esquemático */}
      <div
        role="img"
        aria-label={t('fav_mapa_aria', 'Mapa esquemático de ${city} con los pines de tus favoritos', { city: cityName || '' })}
        style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', border: `1px solid ${T.border}`, background: mapBg, height: 330, marginBottom: 12 }}
      >
        <div style={{
          position: 'absolute', inset: 0,
          background: `repeating-linear-gradient(0deg, transparent 0 34px, ${mapLine} 34px 38px), repeating-linear-gradient(90deg, transparent 0 34px, ${mapLine} 34px 38px)`,
        }} />
        {AVENUES.map((a, i) => (
          <div key={`av-${i}`} style={{ position: 'absolute', background: road, borderRadius: 99, opacity: 0.9, ...a }} />
        ))}
        {PARKS.map((p, i) => (
          <div key={`pk-${i}`} style={{ position: 'absolute', background: park, borderRadius: '46% 54% 60% 40%/50% 45% 55% 50%', ...p }} />
        ))}
        {showZones && ZONES_GDL.map((z) => (
          <span key={z.label} style={{ position: 'absolute', fontSize: 11, fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase', color: T.sub, left: z.left, top: z.top, right: z.right, bottom: z.bottom }}>{z.label}</span>
        ))}
        {places.map((p, i) => {
          const visited = visitedIds.includes(p.id);
          const sel = selected && p.id === selected.id;
          return (
            <button
              key={p.id}
              type="button"
              data-pin-id={p.id}
              onClick={() => onSelect(p.id)}
              aria-label={t('fav_ver_lugar', 'Ver ${name}', { name: p.name })}
              style={{
                position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
                transform: 'translate(-50%,-100%)', width: 40, height: 40,
                border: 0, background: 'transparent', padding: 0,
                cursor: 'pointer', zIndex: 3, opacity: isDim(p) ? 0.25 : 1,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
              }}
            >
              <span style={{
                width: 34, height: 34, borderRadius: '50% 50% 50% 4px',
                transform: 'rotate(-45deg)',
                background: visited ? visitedColor : T.red, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2.5px solid #fff', boxShadow: '0 4px 10px rgba(0,0,0,.25)',
                fontWeight: 800, fontSize: 14,
                outline: sel ? `3px solid ${T.text}` : 'none', outlineOffset: 1,
              }}>
                <span style={{ transform: 'rotate(45deg)' }}>{visited ? '✓' : i + 1}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Tarjeta del lugar seleccionado */}
      {selected && (
        <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 16, overflow: 'hidden', marginBottom: 12 }}>
          <div onClick={() => onOpen(selected)} style={{ height: 92, position: 'relative', cursor: 'pointer', background: colorParaLugar(selected.id) }}>
            {selected.photos?.[0]?.url ? (
              <img src={getThumbUrl(selected.photos[0].url, 800, 200)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
            ) : null}
            <span style={{ position: 'absolute', left: 10, bottom: 10, fontSize: 11, fontWeight: 800, background: 'rgba(0,0,0,.38)', color: '#fff', borderRadius: 99, padding: '5px 10px' }}>
              {t(selected.type, selected.type)}
            </span>
            <button
              type="button"
              onClick={(e) => onToggleFav(selected.id, e)}
              aria-label={t('fav_quitar', 'Quitar de favoritos')}
              style={{ position: 'absolute', top: 8, right: 8, width: 38, height: 38, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <Icon name="heart_overlay_f" size={26} color="none" />
            </button>
          </div>
          <div style={{ padding: '12px 14px 14px' }}>
            <div onClick={() => onOpen(selected)} style={{ fontFamily: FONT_BIZ, fontWeight: 800, fontSize: 16, color: T.text, cursor: 'pointer' }}>{selected.name}</div>
            <div style={{ color: T.sub, fontSize: 13, fontWeight: 600, marginTop: 3 }}>
              {t(selected.type, selected.type)} · {t('fav_coleccion', 'Colección')}: {selected.collectionName}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button type="button" onClick={() => onGoDir(selected)} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: `1px solid ${T.border}`, background: T.greenL, color: T.green, borderRadius: 10, fontWeight: 800, fontSize: 14, padding: '9px 12px', minHeight: 40, cursor: 'pointer', fontFamily: 'inherit' }}>
                <Icon name="nav" size={12} color={T.green} />{t('como_llegar', 'Cómo llegar')}
              </button>
              {visitedIds.includes(selected.id) ? (
                <button type="button" onClick={() => onToggleVisit(selected)} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: 'none', background: visitedSoft, color: visitedColor, borderRadius: 10, fontWeight: 800, fontSize: 14, padding: '9px 12px', minHeight: 40, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <Icon name="check" size={14} color={visitedColor} />{t('fav_visitado', 'Ya lo visitaste')}
                </button>
              ) : (
                <button type="button" onClick={() => onToggleVisit(selected)} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: 'none', background: T.text, color: T.bg, borderRadius: 10, fontWeight: 800, fontSize: 14, padding: '9px 12px', minHeight: 40, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {t('fav_marcar_visitado', 'Marcar como visitado')}
                </button>
              )}
            </div>
            <button type="button" onClick={() => onOrganize(selected)} style={{ width: '100%', marginTop: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: 'none', background: 'transparent', color: T.sub, borderRadius: 10, fontWeight: 700, fontSize: 13, padding: '8px 0', cursor: 'pointer', fontFamily: 'inherit' }}>
              <Icon name="folder" size={14} color={T.sub} />{t('fav_organizar', 'Organizar en colección')}
            </button>
          </div>
        </div>
      )}

      {/* Leyenda: todos los lugares del mapa */}
      <div style={{ display: 'grid', gap: 6 }} role="group" aria-label={t('fav_leyenda', 'Lista de lugares del mapa')}>
        {places.map((p, i) => {
          const visited = visitedIds.includes(p.id);
          const sel = selected && p.id === selected.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                border: `1px solid ${sel ? T.text : T.border}`, background: T.white,
                borderRadius: 11, padding: '8px 10px', fontWeight: 700, color: T.text,
                textAlign: 'left', minHeight: 44, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14,
              }}
            >
              <span style={{ width: 26, height: 26, borderRadius: '50%', background: visited ? visitedColor : T.red, color: '#fff', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                {visited ? '✓' : i + 1}
              </span>
              <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
              {visited ? (
                <span style={{ fontSize: 12, fontWeight: 800, color: visitedColor }}>{t('fav_visitado_tag', 'Visitado')}</span>
              ) : (
                <span style={{ fontSize: 12, color: T.sub }}>{p.collectionName}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
