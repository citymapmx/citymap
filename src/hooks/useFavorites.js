import { useCallback, useEffect, useRef } from 'react';
import { sb } from '../lib/supabase.js';
import { useDataStore } from '../store/useDataStore.js';
import { useUIStore } from '../store/useUIStore.js';
import { useAuthStore } from '../store/useAuthStore.js';

export function useFavorites() {
  const { user, setShowAuth } = useAuthStore();
  const { toast$ } = useUIStore();
  const { favIds, setFavIds, globalFavCounts, setGlobalFavCounts, collections, setCollections } = useDataStore();
  const { movingBiz, setMovingBiz, activeCollection, setActiveCollection, newColModal, setNewColModal, newColForm, setNewColForm } = useUIStore();

  const didMigrate = useRef(false);

  useEffect(() => {
    localStorage.setItem("citymap_collections", JSON.stringify(collections));
  }, [collections]);

  const loadFavs = useCallback(async (uid) => { 
    if (!uid) {
      setFavIds([]);
      return; 
    }
    try { 
      // Load favorites
      const r = await sb.get("favorites", `?user_id=eq.${uid}&select=biz_id`); 
      setFavIds(r.map(f => f.biz_id)); 
      
      // Load collections
      const c = await sb.get("collections", `?user_id=eq.${uid}&order=created_at.desc`);
      if (c && c.length > 0) {
        setCollections(c);
        didMigrate.current = true;
      } else if (!didMigrate.current) {
        // If DB is empty and we haven't migrated, push local collections to DB
        didMigrate.current = true;
        try {
          const localCols = JSON.parse(localStorage.getItem("citymap_collections") || "[]");
          if (localCols.length > 0) {
            const toInsert = localCols.map(lc => ({ id: lc.id, user_id: uid, name: lc.name, emoji: lc.emoji, items: lc.items }));
            await sb.post("collections", toInsert);
            setCollections(localCols); // They are already identical, but ensures state matches
          }
        } catch(e) {}
      }
    } catch { 
      setFavIds([]); 
    } 
  }, [sb]);

  const toggleFav = useCallback(async (id, e) => { 
    if (e) e.stopPropagation(); 
    if (!user) { setShowAuth(true); return; } 
    
    setFavIds(prevFavIds => {
      const isFav = prevFavIds.includes(id);
      if (isFav) {
        sb.delWhere2("favorites", "user_id", user.id, "biz_id", id).catch(() => {});
        setGlobalFavCounts(prev => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) - 1) }));
        if (toast$) toast$("Eliminado de favoritos"); 
        return prevFavIds.filter(x => x !== id);
      } else {
        sb.post("favorites", { user_id: user.id, biz_id: id }).catch(() => {});
        setGlobalFavCounts(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
        if (toast$) toast$("Guardado en favoritos"); 
        return [...prevFavIds, id];
      }
    });
  }, [user, sb, setShowAuth, toast$]);

  const createCollection = async (name, emoji) => {
    if (!user) { setShowAuth(true); return; }
    const newCol = { id: "col_" + Date.now(), user_id: user.id, name, emoji, items: [] };
    setCollections(prev => [newCol, ...prev]);
    try {
      await sb.post("collections", newCol);
    } catch (err) {
      if(toast$) toast$("Error al guardar colección en la nube.");
    }
  };

  const updateCollection = async (updatedCol) => {
    if (!user) { setShowAuth(true); return; }
    setCollections(prev => prev.map(c => c.id === updatedCol.id ? updatedCol : c));
    try {
      await sb.patch("collections", updatedCol.id, updatedCol);
    } catch (err) {
      if(toast$) toast$("Error al actualizar colección en la nube.");
    }
  };

  const deleteCollection = async (id) => {
    if (!user) { setShowAuth(true); return; }
    setCollections(prev => prev.filter(c => c.id !== id));
    try {
      await sb.del("collections", id);
    } catch (err) {
      if(toast$) toast$("Error al borrar colección en la nube.");
    }
  };

  return {
    favIds, setFavIds,
    globalFavCounts, setGlobalFavCounts,
    collections, setCollections,
    movingBiz, setMovingBiz,
    activeCollection, setActiveCollection,
    newColModal, setNewColModal,
    newColForm, setNewColForm,
    loadFavs, toggleFav,
    createCollection, updateCollection, deleteCollection
  };
}
