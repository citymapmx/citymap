import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { createSlug, getThumbUrl, getThumbSrcSet, SRCSET_CARD, cleanCityPrefix } from "../../lib/utils.js";
import { buildCityPath } from "../../lib/domain.js";
import { LUGARES_AUTOPLAY_MS, LUGARES_RESUME_AFTER_MS, LUGARES_MIN_CANDIDATOS, nextLugaresIndex, topLugaresIncreibles, lugarPhotoUrl } from "../../lib/lugaresIncreibles.js";
import { useTranslation } from "../../hooks/useTranslation.js";

// «Lugares increíbles»: mismo formato que «Experiencias destacadas»
// (TopImperdibles) — tarjeta ancha con la foto llena, título grande
// sobre la foto abajo, vecinas asomando a los lados y puntos de
// paginación debajo — pero con los lugares de la ciudad activa
// (businesses con categoría `lugares`, top por rating, ver
// lib/lugaresIncreibles.js). Tocar una tarjeta abre la ficha del
// lugar con el flujo de siempre (handleCardTap, como «Para cerrar
// el día»). No se monta si hay menos de 3 candidatos.
export default memo(function TopLugaresIncreibles({ businesses, T, city, cities, handleCardTap }) {
  const { t } = useTranslation();
  const top5 = React.useMemo(() => topLugaresIncreibles(businesses), [businesses]);

  const count = top5.length;
  const trackRef = useRef(null);
  const resumeTimerRef = useRef(null);
  const activeRef = useRef(0);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const [canHover] = useState(() => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(hover: hover) and (pointer: fine)').matches));
  const [reducedMotion] = useState(() => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches));

  // Al cambiar la lista (otra ciudad), vuelve a la primera tarjeta.
  const firstId = top5[0]?.id;
  useEffect(() => {
    activeRef.current = 0;
    setActive(0);
    const track = trackRef.current;
    if (track) track.scrollTo({ left: 0, behavior: 'auto' });
  }, [firstId]);

  useEffect(() => {
    const onVis = () => setTabHidden(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => () => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
  }, []);

  const setPausedBoth = useCallback((value) => {
    setPaused(value);
  }, []);

  // Pausa el avance automático y lo reanuda tras unos segundos de calma.
  const pauseTemporarily = useCallback(() => {
    setPaused(true);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => setPaused(false), LUGARES_RESUME_AFTER_MS);
  }, []);

  const stepWidth = useCallback(() => {
    const track = trackRef.current;
    if (!track) return 0;
    const first = track.children[0];
    // Ancho de tarjeta + gap de la fila (12 px).
    return first ? first.offsetWidth + 12 : track.clientWidth;
  }, []);

  const goTo = useCallback((index) => {
    const track = trackRef.current;
    if (!track || count < 2) return;
    const next = ((index % count) + count) % count;
    const step = stepWidth();
    if (!step) return;
    // Al volver al inicio desde la última, salto directo para no recorrer
    // todo el carrusel hacia atrás.
    const wrap = next === 0 && activeRef.current === count - 1;
    track.scrollTo({ left: next * step, behavior: wrap ? 'auto' : 'smooth' });
  }, [count, stepWidth]);

  // La tarjeta visible manda: al deslizar con el dedo cambia el índice y
  // eso reinicia el temporizador de autoplay (hay calma tras moverlo).
  const onScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const step = stepWidth();
    if (!step) return;
    const next = Math.max(0, Math.min(count - 1, Math.round(track.scrollLeft / step)));
    if (next !== activeRef.current) {
      activeRef.current = next;
      setActive(next);
    }
  }, [count, stepWidth]);

  // Avance automático: se mueve solo cada 4.5 s. En pausa al deslizar o
  // tocar, al pasar el mouse (escritorio) o al esconder la pestaña. Con
  // prefers-reduced-motion no avanza solo.
  useEffect(() => {
    if (count < 2 || paused || tabHidden || reducedMotion) return;
    const id = setInterval(() => {
      goTo(nextLugaresIndex(activeRef.current, count));
    }, LUGARES_AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [count, paused, tabHidden, reducedMotion, active, goTo]);

  if (!businesses || count < LUGARES_MIN_CANDIDATOS) return null;

  const dark = Boolean(T.dark);

  return (
    <div style={{ padding: "24px 20px 10px" }}>
      <style>{`.lugares-carousel-track::-webkit-scrollbar { display: none; }`}</style>
      <div style={{ marginBottom: 12 }}>
        <h2 style={{ fontFamily: "var(--heading)", fontWeight: 900, fontSize: 22, color: T.text, letterSpacing: "-0.5px", textAlign: "center", margin: 0, textTransform: "uppercase" }}>{t("home_lugares_increibles", "Lugares increíbles")}</h2>
      </div>
      <div
        ref={trackRef}
        role="region"
        aria-roledescription="carrusel"
        aria-label={t("home_lugares_increibles", "Lugares increíbles")}
        className="lugares-carousel-track no-scrollbar"
        onScroll={onScroll}
        onPointerDown={() => {
          if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
          setPausedBoth(true);
        }}
        onPointerUp={pauseTemporarily}
        onPointerCancel={pauseTemporarily}
        onMouseEnter={() => { if (canHover) setPausedBoth(true); }}
        onMouseLeave={() => { if (canHover) setPausedBoth(false); }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
            event.preventDefault();
            pauseTemporarily();
            goTo(active + (event.key === 'ArrowRight' ? 1 : -1));
          }
        }}
        style={{
          display: "flex",
          gap: 12,
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          margin: "0 -20px",
          padding: "0 20px 4px",
        }}
      >
        {top5.map((b) => {
          const photo = lugarPhotoUrl(b);
          const imgUrl = photo ? getThumbUrl(photo, 800) : null;
          // La tarjeta es a ancho completo en móvil: el navegador elige
          // 400w (1x) o 800w (pantallas densas). Mismo recorte (cover) y
          // misma calidad visible que TopImperdibles.
          const imgSrcSet = photo ? getThumbSrcSet(photo, SRCSET_CARD) : null;
          // Misma ruta que abre handleCardTap (App.jsx): ciudad + slug
          // sin el prefijo de la ciudad.
          const cSlug = (b.city_slug || "").split(',')[0] || city?.slug || "";
          const slug = cleanCityPrefix(b.slug || createSlug(b.name), cSlug);
          const href = `${buildCityPath(cSlug, cities || [])}/${slug}`;
          return (
            <a
              key={b.id}
              className="press"
              href={href}
              aria-label={b.name}
              onClick={(e) => {
                e.preventDefault();
                handleCardTap(b);
              }}
              style={{
                 display: "flex",
                 alignItems: "flex-end",
                 padding: "62px 16px 16px",
                 boxSizing: "border-box",
                 textDecoration: "none",
                 position: "relative",
                 minHeight: 150,
                 flex: "0 0 min(85%, 460px)",
                 scrollSnapAlign: "center",
                 borderRadius: 16,
                 background: T.card,
                 cursor: "pointer",
                 boxShadow: T.shadow,
                 border: `1px solid ${T.border}`,
                 overflow: "hidden"
              }}
            >
              {imgUrl && <img src={imgUrl} srcSet={imgSrcSet} sizes="(max-width: 640px) 100vw, 800px" loading="lazy" decoding="async" alt="" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition:"center", display:"block" }} />}
              <div aria-hidden="true" style={{position:'absolute',inset:0,background:'linear-gradient(180deg, rgba(0,0,0,0.04) 15%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0.85) 100%)',pointerEvents:'none'}} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <h3 style={{margin:0,color:'#fff',fontFamily:'var(--sans, system-ui, sans-serif)',fontSize:'clamp(18px, 4.8vw, 22px)',fontWeight:700,lineHeight:1.25,letterSpacing:'-0.025em',textAlign:'left',overflowWrap:'anywhere',textShadow:'0 1px 4px rgba(0,0,0,0.4)'}}>{b.name}</h3>
              </div>
            </a>
          );
        })}
      </div>
      {count > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 8 }}>
          {top5.map((b, i) => (
            <button
              key={b.id}
              type="button"
              aria-label={`${t("home_ver_lugar", "Ver lugar")} ${i + 1} ${t("home_de", "de")} ${count}`}
              aria-current={i === active}
              onClick={() => { pauseTemporarily(); goTo(i); }}
              style={{
                // Área táctil de 24×24 (WCAG 2.2): el punto visual sigue
                // midiendo 6 px de alto; el margen negativo compensa el
                // alto para que la fila no crezca (mismo patrón que
                // BannerSlider).
                width: 24,
                height: 24,
                margin: "-9px 0",
                padding: 0,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: i === active ? 18 : 6,
                  height: 6,
                  borderRadius: 999,
                  background: i === active
                    ? (dark ? "#FFFFFF" : "#0F172A")
                    : (dark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.22)"),
                  transition: "width 0.3s ease, background 0.3s ease",
                  display: "block",
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
