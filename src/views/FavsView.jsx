import { useState } from "react";
import { useAppContext } from "../context/AppContext";
import { useUIStore } from "../store/useUIStore.js";
import { useDataStore } from "../store/useDataStore.js";
import Icon from "../components/ui/Icon.jsx";
import FavoriteCollectionModal from "../components/FavoriteCollectionModal.jsx";
import FavoritosMapa from "../components/favoritos/FavoritosMapa.jsx";
import AgendaEventos from "../components/favoritos/AgendaEventos.jsx";
import { projectToMap } from "../lib/mapaFavoritos.js";
import { ordenarAgendaEventos } from "../lib/countdownEvento.js";
import { loadVisitados, saveVisitados, loadAlertasCalendario, saveAlertasCalendario, toggleIdInList } from "../lib/favoritosLocales.js";
import { getEventCalendarUrl } from "../lib/eventCalendar.js";
import { useShallow } from 'zustand/react/shallow';
import { getThumbUrl, isNear, METRO_ZONES, getLocalIsoDate } from "../lib/utils.js";
import { useTranslation } from "../hooks/useTranslation.js";

export default function FavsView({ hideHeader }) {
  const { t, lang } = useTranslation();
  const ctx = useAppContext();
  const { dark, activeCity, toast$ } = useUIStore(useShallow(s => ({ dark: s.dark, activeCity: s.activeCity, toast$: s.toast$ })));
  const { mapPins, events } = useDataStore(useShallow(s => ({ mapPins: s.mapPins, events: s.events })));
  const { viewStyle, T, favIds, toggleFav, biz, navigate, setSelected, trackEvent, userCoords, getKm, collections, activeCollection, setActiveCollection, newColModal, setNewColModal, newColForm, setNewColForm, createCollection, updateCollection, deleteCollection, city, savedEventIds, setCollections, FONT_BIZ, goDir, setMovingBiz, setSelectedEvent, handleEventTap, movingBiz } = ctx;
  // Mis Favoritos, propuesta C: filtro del mapa, pin seleccionado, lugares
  // marcados como visitados y eventos con alerta de calendario (estos dos
  // últimos viven en localStorage de este dispositivo).
  const [favFilter, setFavFilter] = useState('todos');
  const [favSelectedId, setFavSelectedId] = useState(null);
  const [visitados, setVisitados] = useState(() => loadVisitados());
  const [alertasCal, setAlertasCal] = useState(() => loadAlertasCalendario());

  return (
    <div style={hideHeader ? { paddingBottom: 20 } : { paddingBottom: 84, ...viewStyle, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {!hideHeader && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${T.border}`, background: T.white }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <button onClick={() => window.history.length > 1 ? window.history.back() : navigate("home")} style={{ background: "transparent", border: "none", color: T.text, padding: "8px 12px 8px 0", cursor: "pointer", display: "flex", alignItems: "center" }}>
              <Icon name="arrow_left" size={24} color={T.text} />
            </button>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: T.text, fontFamily: "var(--heading)", letterSpacing: "-0.5px" }}>{t("mis_favoritos", "Mis Favoritos")}</h1>
          </div>
        </div>
      )}
      <div style={{ padding: "20px", flex: 1 }}>
        {(() => {
              const allSavedBiz = mapPins.filter(b => favIds.includes(b.id) && isNear(b, userCoords, activeCity));
              const savedEv = events.filter(e => {
                if (!savedEventIds.includes(e.id)) return false;
                return isNear(e, userCoords, activeCity);
              });
              const hasFavs = allSavedBiz.length > 0 || savedEv.length > 0;
              // Propuesta C: mapa con los lugares guardados y agenda de
              // eventos guardados. La fecha de hoy es la local del
              // dispositivo, como la cuenta atrás del artefacto.
              const todayStr = getLocalIsoDate();
              const isGdlMetro = (METRO_ZONES[activeCity] || []).includes('guadalajara');
              const collectionNameFor = (id) => {
                const col = collections.find(c => (c.items || []).includes(id));
                return col ? col.name : t('sin_organizar', 'Sin organizar');
              };
              const favPlaces = projectToMap(allSavedBiz.map(b => ({ ...b, collectionName: collectionNameFor(b.id) })));
              const favSelId = favSelectedId && favPlaces.some(p => p.id === favSelectedId) ? favSelectedId : favPlaces[0]?.id;
              const agendaEv = ordenarAgendaEventos(savedEv, todayStr);
              const handleToggleVisit = (biz) => {
                const next = toggleIdInList(visitados, biz.id);
                const nowVisited = next.includes(biz.id);
                setVisitados(next);
                saveVisitados(next);
                toast$(nowVisited
                  ? t('fav_marcado_toast', 'Marcado como visitado: ${name}', { name: biz.name })
                  : t('fav_pendiente_toast', 'Volvió a pendientes: ${name}', { name: biz.name }));
              };
              // La campana es el recordatorio por evento que ya existe en
              // la app: abre el enlace de Google Calendar con la alerta
              // (igual que el aviso al guardar un evento). El aviso push
              // del día del evento ya lo tienen todos los guardados por el
              // cron de recordatorios, así que la campana no desactiva
              // nada: solo marca que ya le pusiste alerta en tu calendario.
              const handleBell = (ev) => {
                const url = getEventCalendarUrl(ev);
                if (!url) {
                  toast$(t('fav_recordatorio_error', 'No se pudo crear el recordatorio para este evento'));
                  return;
                }
                if (typeof window !== 'undefined' && window.open) window.open(url, '_blank', 'noopener,noreferrer');
                if (!alertasCal.includes(ev.id)) {
                  const next = [...alertasCal, ev.id];
                  setAlertasCal(next);
                  saveAlertasCalendario(next);
                }
                toast$(t('fav_recordatorio_calendario', 'Se abrió tu calendario para ponerle una alerta a este evento'));
              };

              if (activeCollection) {
                const colItems = allSavedBiz.filter(b => activeCollection.items.includes(b.id));
                return <>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                    <button className="press" onClick={() => setActiveCollection(null)} style={{ width: 40, height: 40, borderRadius: "50%", background: T.white, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: T.shadow }}><Icon name="arrow_left" size={20} color={T.text} /></button>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: 20, fontWeight: 800, color: T.text, margin: 0 }}>{activeCollection.emoji} {activeCollection.name}</h3>
                      <div style={{ fontSize: 13, color: T.sub }}>{colItems.length} {t("lugares", "lugares")}</div>
                    </div>
                    <button className="press" onClick={() => {
                      if(window.confirm(t("confirm_delete_col", "¿Estás seguro de eliminar esta colección? Los lugares no se borrarán, solo volverán a la sección 'Sin organizar'."))) {
                        deleteCollection(activeCollection.id);
                        setActiveCollection(null);
                      }
                    }} style={{ width: 40, height: 40, borderRadius: "50%", background: T.white, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: T.shadow }}><Icon name="trash" size={20} color={T.red} /></button>
                  </div>
                  {colItems.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 20px" }}>
                      <p style={{ color: T.sub }}>{t("col_vacia_1", "Esta colección está vacía.")}<br/>{t("col_vacia_2", "Guarda lugares para que aparezcan aquí.")}</p>
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      {colItems.map(b => (
                        <div key={b.id} className="press" onClick={() => { setSelected(b); navigate("detail"); }} style={{ background: T.bg, borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column", position: "relative" }}>
                          <div style={{ height: 140, background: T.border, position: "relative" }}>
                            {b.photos?.[0]?.url ? <img src={getThumbUrl(b.photos[0].url, 400, 300)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="store" size={24} color={T.sub} /></div>}
                            <button onClick={e => toggleFav(b.id, e)} style={{ position: "absolute", top: 10, right: 10, background: "transparent", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))" }}><Icon name="heart_overlay_f" size={26} color="none" /></button>
                          </div>
                          <div style={{ padding: "10px 12px" }}>
                            <div style={{ fontFamily: FONT_BIZ, fontWeight: 800, fontSize: 13, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.name}</div>
                            <div style={{ fontSize: 11, color: T.sub, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t(b.type, b.type)}</div>
                            <button onClick={e => { e.stopPropagation(); goDir(b, null); }} style={{ marginTop: 8, width: "100%", background: T.greenL, border: "none", borderRadius: 8, padding: "6px 0", fontSize: 11, fontWeight: 700, color: T.green, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}><Icon name="nav" size={10} color={T.green} />{t("como_llegar", "Cómo llegar")}</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>;
              }

              return <>
                {/* TIRA DE COLECCIONES: las colecciones no se pierden; aquí
                    se ven, se abren y se crea una nueva. Los lugares van en
                    el mapa de abajo, con su colección en la leyenda. */}
                {hasFavs && (
                  <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 20, scrollbarWidth: 'none' }}>
                    {collections.map(col => {
                      const validItems = col.items.filter(id => favIds.includes(id));
                      return (
                        <button key={col.id} type="button" onClick={() => setActiveCollection(col)} style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 8, background: T.white, border: `1px solid ${T.border}`, borderRadius: 99, padding: '8px 14px 8px 10px', fontSize: 13, fontWeight: 700, color: T.text, cursor: 'pointer', fontFamily: 'inherit', boxShadow: T.shadow }}>
                          <span style={{ fontSize: 18 }}>{col.emoji}</span>
                          <span>{col.name}</span>
                          <span style={{ fontSize: 12, color: T.sub }}>{validItems.length}</span>
                        </button>
                      );
                    })}
                    {collections.length < 6 && (
                      <button type="button" onClick={() => setNewColModal(true)} style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 6, background: T.bg, border: `2px dashed ${T.border}`, borderRadius: 99, padding: '8px 14px', fontSize: 13, fontWeight: 700, color: T.text, cursor: 'pointer', fontFamily: 'inherit' }}>
                        <Icon name="plus" size={16} color={T.green} />{t("crear_coleccion", "Crear Colección")}
                      </button>
                    )}
                  </div>
                )}

                {!hasFavs && <div style={{ textAlign: "center", padding: "60px 20px" }}>
                  <div style={{ width: 80, height: 80, borderRadius: 24, background: T.greenL, margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="heart" size={36} color={T.green} /></div>
                  <h3 style={{ fontFamily: "var(--heading)", fontSize: 20, color: T.text, marginBottom: 8 }}>{t("sin_favoritos", "Aún no hay favoritos")}</h3>
                  <p style={{ fontSize: 14, color: T.sub, lineHeight: 1.5, marginBottom: 24 }}>{t("sin_favoritos_desc", "Tu próximo Match está a unas calles. Explora la ciudad y guarda los lugares que más te gusten.")}</p>
                  <button className="btn-g press" onClick={() => navigate("home")}>{t("explorar_ciudad", "Explorar ciudad")}</button>
                </div>}

                {allSavedBiz.length > 0 && (
                  <FavoritosMapa
                    T={T} t={t}
                    places={favPlaces}
                    selectedId={favSelId}
                    onSelect={setFavSelectedId}
                    filter={favFilter}
                    onFilterChange={setFavFilter}
                    visitedIds={visitados}
                    onToggleVisit={handleToggleVisit}
                    onGoDir={(b) => goDir(b, null)}
                    onOrganize={(b) => setMovingBiz(b)}
                    onToggleFav={toggleFav}
                    onOpen={(b) => { setSelected(b); navigate("detail"); }}
                    showZones={isGdlMetro}
                    cityName={city?.name || activeCity}
                  />
                )}

                {savedEv.length > 0 && (
                  <AgendaEventos
                    T={T} t={t} lang={lang}
                    events={agendaEv} todayStr={todayStr}
                    alertIds={alertasCal}
                    onOpen={(ev) => handleEventTap(ev)}
                    onBell={handleBell}
                  />
                )}

                <FavoriteCollectionModal business={movingBiz} collections={collections} T={T} t={t}
                  onClose={() => setMovingBiz(null)}
                  onCreate={() => { setMovingBiz(null); setNewColModal(true); }}
                  onSelect={col => {
                    updateCollection({ ...col, items: [...new Set([...(col.items || []), movingBiz.id])] });
                    setMovingBiz(null);
                    toast$(t("agregado_a", "Agregado a ") + col.name);
                  }} />
                {/* NEW COLLECTION MODAL */}
                {newColModal && <div style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "80px 20px 20px" }}>
                  <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} onClick={() => setNewColModal(false)} />
                  <div style={{ background: T.white, borderRadius: 24, padding: 24, width: "100%", maxWidth: 360, position: "relative", animation: "popIn .3s cubic-bezier(0.1, 1, 0.2, 1)", boxShadow: "0 12px 40px rgba(0,0,0,0.2)" }}>
                    <h3 style={{ fontSize: 20, fontWeight: 800, color: T.text, margin: "0 0 20px", textAlign: "center" }}>{t("nueva_coleccion", "Nueva Colección")}</h3>
                    <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.sub, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>{t("nombre", "Nombre")}</div>
                        <input type="text" value={newColForm.name} onChange={e => setNewColForm(f => ({...f, name: e.target.value}))} placeholder={t("ej_favoritos", "Ej. Mis lugares favoritos...")} style={{ width: "100%", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 16px", fontSize: 16, color: T.text, outline: "none", fontFamily: "inherit" }} />
                      </div>
                      <div style={{ width: 80 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.sub, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>{t("emoji", "Emoji")}</div>
                        <div style={{ position: "relative" }}>
                          <select value={newColForm.emoji} onChange={e => setNewColForm(f => ({...f, emoji: e.target.value}))} style={{ width: "100%", height: 50, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12, fontSize: 24, outline: "none", cursor: "pointer", appearance: "none", textAlign: "center", padding: 0 }}>
                            {["🌟","📌","🍔","🍻","☕","🌳","💖","🌮","🍣","🍕","👗","👟","🎉"].map(em => <option key={em} value={em}>{em}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 12 }}>
                      <button className="press" onClick={() => setNewColModal(false)} style={{ flex: 1, background: T.bg, border: "none", borderRadius: 16, padding: "14px", fontSize: 15, fontWeight: 700, color: T.sub, cursor: "pointer" }}>{t("cancelar", "Cancelar")}</button>
                      <button className="press" onClick={() => {
                        if (!newColForm.name.trim()) return toast$(t("ingresa_nombre_valido", "Ingresa un nombre válido"));
                        createCollection(newColForm.name.trim(), newColForm.emoji);
                        setNewColModal(false);
                        setNewColForm({ name: "", emoji: "🌟" });
                        toast$(t("coleccion_creada", "Colección creada"));
                      }} style={{ flex: 1, background: T.greenL, border: "none", borderRadius: 16, padding: "14px", fontSize: 15, fontWeight: 700, color: T.green, cursor: "pointer" }}>{t("crear", "Crear")}</button>
                    </div>
                  </div>
                </div>}

              </>;
            })()}
          </div>
        </div>


  );
}

