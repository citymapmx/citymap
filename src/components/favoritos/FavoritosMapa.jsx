// Lista de lugares guardados de Mis Favoritos (propuesta C).
//
// Antes llevaba el mapa real de Google con pines numerados; el 13 nov
// 2026 Jonathan pidió quitar el mapa de esta sección («quita el mapa de
// favoritos no me gustó»). Quedan: contador de visitados con barra,
// tarjeta del lugar seleccionado y la lista de lugares con su número o
// ✓ si ya se visitó. Presentacional: no lee stores ni contexto, todo
// llega por props.
//
// El filtro Todos/Sin visitar/Visitados filtra LA LISTA (antes solo
// atenuaba los pines del mapa). La numeración es la posición dentro de
// la lista visible (1..N).

import Icon from '../ui/Icon.jsx';
import { getThumbUrl } from '../../lib/utils.js';
import { colorParaLugar } from '../../lib/mapaFavoritos.js';
import { FONT_BIZ } from '../../lib/constants.js';

export default function FavoritosMapa({
  T, t, places, selectedId, onSelect,
  filter, onFilterChange, visitedIds,
  onToggleVisit, onGoDir, onOrganize, onToggleFav, onOpen,
}) {
  const total = places.length;
  const visitedCount = places.filter((p) => visitedIds.includes(p.id)).length;
  const pct = total ? Math.round((visitedCount / total) * 100) : 0;
  const selected = places.find((p) => p.id === selectedId) || places[0];
  const dark = !!T.dark;
  const visitedColor = dark ? '#3ECFAD' : '#0E7C66';
  const visitedSoft = dark ? '#14332B' : '#E3F2EE';
  // Sin mapa ya no hay pines que atenuar: el filtro recorta la lista.
  const visiblePlaces = filter === 'visitados'
    ? places.filter((p) => visitedIds.includes(p.id))
    : filter === 'pendientes'
      ? places.filter((p) => !visitedIds.includes(p.id))
      : places;

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
      {/* Filtro de la lista */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }} role="group" aria-label={t('fav_filtro_titulo', 'Filtrar lugares guardados')}>
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

      {/* Lista de lugares guardados */}
      <div style={{ display: 'grid', gap: 6 }} role="group" aria-label={t('fav_leyenda', 'Lista de lugares guardados')}>
        {visiblePlaces.map((p, i) => {
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
