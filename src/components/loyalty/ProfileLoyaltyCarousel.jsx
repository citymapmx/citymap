// Carrusel de «Mis tarjetas de lealtad» arriba del perfil (/cuenta, PR #242).
//
// Las tarjetas activas del cliente aparecen aquí al entrar en su perfil,
// para tenerlas a la mano sin ir al menú hamburguesa → «Recompensas».
// Es la MISMA lista que «Tus Tarjetas Activas» de Recompensas (WalletView):
// mismos datos (loadLoyaltyEntries), mismo renderizado (LoyaltyCard) y
// mismo detalle al tocar (LoyaltyCardModal con QR).
//
// - Sin tarjetas activas no renderiza nada: la página queda como antes.
// - Con UNA sola tarjeta, aparece CENTRADA (sin alinearse a la izquierda,
//   sin otra tarjeta asomando y sin puntos de posición).
// - Con 2 o más, carrusel deslizable con el dedo (scroll-snap, mismo
//   patrón que TopImperdibles) y puntos de posición.
import React, { useCallback, useEffect, useRef, useState } from "react";
import LoyaltyCard from "./LoyaltyCard.jsx";
import LoyaltyCardModal from "../../views/LoyaltyCardModal.jsx";
import Icon from "../ui/Icon.jsx";
import { loadLoyaltyEntries, getPrefetchedLoyaltyEntries } from "../../lib/loyaltyMemberships.js";
import { useTranslation } from "../../hooks/useTranslation.js";

export default function ProfileLoyaltyCarousel({ user, T, dark, entries: entriesProp }) {
  const { t } = useTranslation();
  const [entries, setEntries] = useState(entriesProp ?? null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [active, setActive] = useState(0);
  const trackRef = useRef(null);
  const activeRef = useRef(0);

  // En los tests las entradas se pasan por prop; en la app se cargan.
  useEffect(() => { setEntries(entriesProp ?? null); }, [entriesProp]);

  useEffect(() => {
    if (entriesProp) return undefined;
    let alive = true;
    // La app ya precargó las entradas al abrir (o al iniciar sesión): se
    // reusa esa promesa — si ya resolvió, la tarjeta aparece al instante
    // sin otra consulta. Sin precarga (o si falló), se carga al entrar
    // como siempre.
    const load = getPrefetchedLoyaltyEntries(user) ?? loadLoyaltyEntries(user);
    Promise.resolve(load)
      .then((list) => { if (alive) setEntries(list); })
      .catch(() => { if (alive) setEntries([]); });
    return () => { alive = false; };
  }, [user, entriesProp]);

  const count = entries?.length || 0;
  const single = count === 1;

  // Al cambiar la lista, vuelve a la primera tarjeta.
  const firstId = entries?.[0]?.member?.id;
  useEffect(() => {
    activeRef.current = 0;
    setActive(0);
    const track = trackRef.current;
    if (track) track.scrollTo({ left: 0, behavior: "auto" });
  }, [firstId]);

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
    track.scrollTo({ left: next * step, behavior: wrap ? "auto" : "smooth" });
  }, [count, stepWidth]);

  // La tarjeta visible manda: al deslizar con el dedo cambia el índice.
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

  if (!entries || count === 0) return null;

  const title = t("cuenta_mis_tarjetas_lealtad", "Mis tarjetas de lealtad");

  return (
    <div style={{ padding: "16px 16px 0" }}>
      <style>{`.profile-loyalty-track::-webkit-scrollbar { display: none; }`}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, marginLeft: 8 }}>
        <Icon name="award" size={20} color={T.text} />
        <span style={{ fontSize: 20, fontWeight: 800, color: T.text, letterSpacing: "-0.5px" }}>{title}</span>
      </div>
      <div
        ref={trackRef}
        role="region"
        aria-roledescription="carrusel"
        aria-label={title}
        className="profile-loyalty-track no-scrollbar"
        onScroll={single ? undefined : onScroll}
        onKeyDown={(event) => {
          if (single) return;
          if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
            event.preventDefault();
            goTo(active + (event.key === "ArrowRight" ? 1 : -1));
          }
        }}
        style={{
          display: "flex",
          gap: 12,
          // Con una sola tarjeta no hay nada que deslizar: se centra.
          overflowX: single ? "visible" : "auto",
          scrollSnapType: single ? "none" : "x mandatory",
          justifyContent: single ? "center" : "flex-start",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          margin: "0 -16px",
          padding: "0 16px 4px",
        }}
      >
        {entries.map(({ member, card, biz }) => (
          <div
            key={member.id}
            style={{
              flex: "0 0 min(85%, 460px)",
              scrollSnapAlign: single ? "none" : "center",
            }}
          >
            <LoyaltyCard member={member} card={card} biz={biz} dark={dark} T={T} onCardClick={setSelectedCard} />
          </div>
        ))}
      </div>
      {!single && (
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 8 }}>
          {entries.map(({ member }, i) => (
            <button
              key={member.id}
              type="button"
              aria-label={`${t("cuenta_ver_tarjeta", "Ver tarjeta")} ${i + 1} ${t("home_de", "de")} ${count}`}
              aria-current={i === active}
              onClick={() => goTo(i)}
              style={{
                // Área táctil de 24×24 (WCAG 2.2): el punto visual sigue
                // midiendo 6 px de alto; el margen negativo compensa el
                // alto para que la fila no crezca (mismo patrón que
                // TopImperdibles).
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

      <LoyaltyCardModal
        open={!!selectedCard}
        onClose={() => setSelectedCard(null)}
        {...selectedCard}
      />
    </div>
  );
}
