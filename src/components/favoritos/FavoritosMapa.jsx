// Mapa real de Google Maps de Mis Favoritos (propuesta C): pines numerados
// de los lugares guardados, contador de visitados con barra, tarjeta del
// lugar seleccionado y leyenda. Presentacional: no lee stores ni contexto,
// todo llega por props.
//
// El mapa es el de Google de verdad: reutiliza el hook useGMaps de
// src/components/GMap.jsx (el mismo script y la misma llave que el mapa
// principal), con pines numerados dibujados con OverlayView
// (src/lib/googleOverlayMarker.js). Los lugares SIN coordenadas
// reales no llevan pin inventado: solo aparecen en la leyenda, con su
// número, y un aviso debajo del mapa lo explica. El número del pin es el
// índice del lugar en `places` + 1, igual que en la leyenda, así que un
// lugar sin pin no desplaza la numeración de los demás.
//
// Blindaje (12 nov 2026): Google eliminó `google.maps.Marker` del canal
// weekly (v3.66) y `new google.Marker` tumbaba TODA la vista con el
// «Algo salió mal» del ErrorBoundary. Aquí el mapa va envuelto en su
// propio ErrorBoundary con un aviso chico (MapaNoDisponible) y la
// creación de mapa/pines va en try/catch: si Google Maps no carga o el
// mapa falla, la sección sigue abriendo con la lista, la agenda y las
// colecciones, y en el lugar del mapa solo sale el aviso con Reintentar.
//
// Sin window (tests en node, sin jsdom) se pinta el "Cargando mapa…" y la
// leyenda: el hook de Google solo vive en el hijo FavoritosGoogleMap, que
// solo se monta cuando hay window.

import { useEffect, useRef, useState } from 'react';
import { useGMaps } from '../GMap.jsx';
import { ErrorBoundary } from '../ErrorBoundary.jsx';
import Icon from '../ui/Icon.jsx';
import { getThumbUrl } from '../../lib/utils.js';
import { parseLatLng, colorParaLugar } from '../../lib/mapaFavoritos.js';
import { createOverlayMarker } from '../../lib/googleOverlayMarker.js';
import { FONT_BIZ } from '../../lib/constants.js';

// Pin con forma de gota (como el esquemático) en SVG, con el número o la
// ✓ dibujados dentro. El color es el del pin: rojo para pendientes, verde
// del tema para visitados. El seleccionado lleva borde oscuro y es más
// grande. Devuelve el HTML que se mete en el div del OverlayView
// (createOverlayMarker): antes era el `icon` + `label` de un
// google.maps.Marker, que Google eliminó (ver googleOverlayMarker.js).
function pinSvg(color, selected, labelText) {
  const w = selected ? 44 : 36;
  const h = selected ? 58 : 48;
  const stroke = selected ? '#0F172A' : '#ffffff';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 36 48">`
    + `<path d="M18 2C10 2 3.5 8.5 3.5 16.5 3.5 28 18 46 18 46s14.5-18 14.5-29.5C32.5 8.5 26 2 18 2z" fill="${color}" stroke="${stroke}" stroke-width="2.5"/>`
    + `<text x="18" y="21" text-anchor="middle" font-family="inherit" font-size="13" font-weight="800" fill="#fff">${labelText}</text>`
    + `</svg>`;
}

// Aviso chico que sale EN EL LUGAR DEL MAPA cuando Google Maps no carga
// o el mapa falla (sin red para el script, llave restringida, error al
// crear el mapa…). NO es el «Algo salió mal» de toda la vista: la lista,
// la agenda y las colecciones se siguen viendo. Exportado para probarlo.
export function MapaNoDisponible({ T, t, onRetry }) {
  const dark = !!T.dark;
  return (
    <div style={{ width: '100%', height: '100%', background: dark ? '#18181B' : '#F2F4F2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, textAlign: 'center' }}>
      <span style={{ fontSize: 26, lineHeight: 1 }}>🗺️</span>
      <span style={{ fontSize: 14, fontWeight: 800, color: T.text }}>
        {t('fav_mapa_no_disponible', 'El mapa no se pudo cargar')}
      </span>
      <span style={{ fontSize: 13, color: T.sub, fontWeight: 600, maxWidth: 280 }}>
        {t('fav_mapa_no_disponible_desc', 'Tus lugares y tu agenda siguen aquí abajo. Revisa tu conexión e inténtalo de nuevo.')}
      </span>
      <button
        type="button"
        onClick={onRetry}
        style={{ marginTop: 4, border: `1px solid ${T.border}`, background: T.white, color: T.text, borderRadius: 99, fontWeight: 800, fontSize: 13, padding: '8px 16px', minHeight: 38, cursor: 'pointer', fontFamily: 'inherit' }}
      >
        {t('fav_mapa_reintentar', 'Reintentar')}
      </button>
    </div>
  );
}

function FavoritosGoogleMap({
  T, t, places, selectedId, onSelect, filter, visitedIds, cityCenter, cityName,
}) {
  const ok = useGMaps();
  const divRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(new Map());
  const fittedKeyRef = useRef(null);
  const centerRef = useRef(cityCenter);
  centerRef.current = cityCenter;
  const [mapReady, setMapReady] = useState(false);
  // mapError: el mapa no se pudo crear, los pines no se pudieron dibujar
  // o el script no cargó en 8 s. En ese estado se pinta el aviso chico
  // (MapaNoDisponible) en vez del mapa, sin tumbar la vista.
  const [mapError, setMapError] = useState(false);
  const [mapAttempt, setMapAttempt] = useState(0);
  const dark = !!T.dark;
  const visitedColor = dark ? '#3ECFAD' : '#0E7C66';

  const retryMap = () => {
    setMapError(false);
    setMapAttempt((a) => a + 1);
  };

  // Si el script de Google no carga (sin red para el script, llave
  // restringida…), no dejar el "Cargando mapa…" para siempre: a los 8 s
  // se muestra el aviso chico con Reintentar.
  useEffect(() => {
    if (ok || mapError) return;
    const id = setTimeout(() => setMapError(true), 8000);
    return () => clearTimeout(id);
  }, [ok, mapError]);

  // Crear el mapa real (se recrea al cambiar claro/oscuro, como hace GMap
  // con su key): mismo script y misma llave que el mapa principal.
  // try/catch: si `new google.maps.Map` lanza, el error NO sube al
  // ErrorBoundary de la ruta (que pintaría el «Algo salió mal» de toda
  // la vista); se muestra el aviso chico en el lugar del mapa.
  useEffect(() => {
    if (!ok || !divRef.current || typeof window === 'undefined') return;
    const markers = markersRef.current;
    let map;
    try {
      map = new window.google.maps.Map(divRef.current, {
        center: centerRef.current || { lat: 20.6767, lng: -103.3475 },
        zoom: 13,
        colorScheme: dark ? 'DARK' : 'LIGHT',
        backgroundColor: dark ? '#18181B' : '#f9fafb',
        disableDefaultUI: true,
        zoomControl: false,
        clickableIcons: false,
        gestureHandling: 'greedy',
        minZoom: 10,
        maxZoom: 18,
      });
    } catch (e) {
      console.error('FavoritosMapa: no se pudo crear el mapa', e);
      setMapError(true);
      return;
    }
    mapRef.current = map;
    setMapReady(true);
    return () => {
      markers.forEach((m) => m.setMap(null));
      markers.clear();
      fittedKeyRef.current = null;
      if (mapRef.current) window.google?.maps?.event?.clearInstanceListeners(mapRef.current);
      mapRef.current = null;
      setMapReady(false);
    };
  }, [ok, dark, mapAttempt]);

  // Pines numerados: solo los lugares con coordenadas reales. El pin lleva
  // el número del lugar en la lista (i + 1) o ✓ si ya se visitó, igual que
  // la leyenda. La vista solo se ajusta cuando cambia el conjunto de
  // pines, no al tocar un pin ni al filtrar (eso solo atenúa).
  //
  // Los pines son OverlayView (createOverlayMarker), NO google.maps.Marker:
  // Google lo eliminó del canal weekly (v3.66) y `new google.Marker`
  // lanzaba TypeError al montar y tumbaba TODA la vista. Todo el dibujo
  // de pines va en try/catch: si algo falla, se muestra el aviso chico
  // en el lugar del mapa y el resto de la sección sigue.
  useEffect(() => {
    if (!mapReady || !mapRef.current || typeof window === 'undefined') return;
    const markers = markersRef.current;
    if (mapError) {
      markers.forEach((m) => m.setMap(null));
      markers.clear();
      return;
    }
    try {
      const map = mapRef.current;
      const google = window.google.maps;
      const seen = new Set();
      places.forEach((p, i) => {
        const c = parseLatLng(p);
        if (!c) return; // Sin coordenadas: sin pin inventado.
        seen.add(p.id);
        const visited = visitedIds.includes(p.id);
        const sel = selectedId === p.id;
        const dim = (filter === 'pendientes' && visited) || (filter === 'visitados' && !visited);
        const labelText = visited ? '✓' : String(i + 1);
        const color = visited ? visitedColor : T.red;
        const content = pinSvg(color, sel, labelText);
        let m = markers.get(p.id);
        if (!m) {
          m = createOverlayMarker(google, {
            map,
            position: c,
            content,
            title: p.name,
            zIndex: sel ? 999 : 1,
            opacity: dim ? 0.25 : 1,
            onClick: () => onSelect(p.id),
          });
          markers.set(p.id, m);
        } else {
          m.setPosition(c);
          m.setMap(map);
          m.setContent(content);
          m.setZIndex(sel ? 999 : 1);
          m.setOpacity(dim ? 0.25 : 1);
          m.div.title = p.name;
        }
      });
      markers.forEach((m, id) => {
        if (!seen.has(id)) {
          m.setMap(null);
          markers.delete(id);
        }
      });
      const pinnedKey = places.filter((p) => parseLatLng(p)).map((p) => p.id).join(',');
      if (fittedKeyRef.current !== pinnedKey) {
        fittedKeyRef.current = pinnedKey;
        const coords = places.map((p) => parseLatLng(p)).filter(Boolean);
        if (coords.length === 1) {
          map.setCenter(coords[0]);
          map.setZoom(15);
        } else if (coords.length > 1) {
          const bounds = new google.LatLngBounds();
          coords.forEach((c) => bounds.extend(c));
          map.fitBounds(bounds, 48);
        } else if (centerRef.current) {
          map.setCenter(centerRef.current);
          map.setZoom(13);
        }
      }
    } catch (e) {
      console.error('FavoritosMapa: no se pudieron dibujar los pines', e);
      setMapError(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, places, filter, visitedIds, selectedId, mapError]);

  if (mapError) {
    return <MapaNoDisponible T={T} t={t} onRetry={retryMap} />;
  }
  if (!ok) {
    return (
      <div style={{ width: '100%', height: '100%', background: dark ? '#18181B' : '#F2F4F2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <div style={{ width: 28, height: 28, border: '2px solid #EAF4F0', borderTop: '2px solid #1A7A5E', borderRadius: '50%', animation: 'spin .9s linear infinite' }} />
        <span style={{ fontSize: 13, color: dark ? '#A1A1AA' : '#5A6872' }}>Cargando mapa…</span>
      </div>
    );
  }
  return <div ref={divRef} aria-label={cityName || ''} style={{ width: '100%', height: '100%' }} />;
}

export default function FavoritosMapa({
  T, t, places, selectedId, onSelect,
  filter, onFilterChange, visitedIds,
  onToggleVisit, onGoDir, onOrganize, onToggleFav, onOpen,
  cityCenter, cityName,
}) {
  const total = places.length;
  const visitedCount = places.filter((p) => visitedIds.includes(p.id)).length;
  const pct = total ? Math.round((visitedCount / total) * 100) : 0;
  const selected = places.find((p) => p.id === selectedId) || places[0];
  const dark = !!T.dark;
  const visitedColor = dark ? '#3ECFAD' : '#0E7C66';
  const visitedSoft = dark ? '#14332B' : '#E3F2EE';
  const noCoordsCount = places.filter((p) => !parseLatLng(p)).length;
  // mapKey: remonta el mapa (y su ErrorBoundary) cuando el usuario toca
  // «Reintentar» en el aviso chico. El boundary solo envuelve el mapa:
  // si el mapa falla, la leyenda, la tarjeta, la agenda y las colecciones
  // de FavsView se siguen viendo.
  const [mapKey, setMapKey] = useState(0);

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

      {/* Mapa real de Google */}
      <div
        role="application"
        aria-label={t('fav_mapa_aria', 'Mapa de Google con los pines de tus favoritos en ${city}', { city: cityName || '' })}
        style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', border: `1px solid ${T.border}`, background: dark ? '#18181B' : '#f9fafb', height: 330, marginBottom: noCoordsCount > 0 ? 8 : 12 }}
      >
        {typeof window === 'undefined' ? (
          <div style={{ width: '100%', height: '100%', background: dark ? '#18181B' : '#F2F4F2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, border: '2px solid #EAF4F0', borderTop: '2px solid #1A7A5E', borderRadius: '50%', animation: 'spin .9s linear infinite' }} />
            <span style={{ fontSize: 13, color: dark ? '#A1A1AA' : '#5A6872' }}>Cargando mapa…</span>
          </div>
        ) : (
          <ErrorBoundary
            key={mapKey}
            fallback={<MapaNoDisponible T={T} t={t} onRetry={() => setMapKey((k) => k + 1)} />}
          >
            <FavoritosGoogleMap
              T={T} t={t} places={places} selectedId={selectedId} onSelect={onSelect}
              filter={filter} visitedIds={visitedIds} cityCenter={cityCenter} cityName={cityName}
            />
          </ErrorBoundary>
        )}
      </div>

      {/* Lugares sin coordenadas: no llevan pin, solo salen en la lista. */}
      {noCoordsCount > 0 && (
        <div style={{ fontSize: 12, color: T.sub, fontWeight: 600, marginBottom: 12 }}>
          {t('fav_sin_ubicacion', '${n} lugar(es) sin ubicación en el mapa: solo aparecen en la lista', { n: noCoordsCount })}
        </div>
      )}

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
