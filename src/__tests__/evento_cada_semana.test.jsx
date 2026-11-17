import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// Píldora «Cada semana» en eventos recurrentes (decisión de Jonathan,
// 17 nov 2026): SOLO la píldora, SIN filtro para ver solo los semanales.
// La píldora sale en la tarjeta del evento (lista de eventos) y en su
// ficha, cuando `event.is_recurring` es true; con false o ausente no
// aparece. Usa EL MISMO estilo que las píldoras que ya existen en cada
// sitio, para no chocar con nada.
describe('evento recurrente: píldora «Cada semana»', () => {
  const eventsView = read('../views/EventsView.jsx');
  const detailModal = read('../components/modals/EventDetailModal.jsx');
  const i18nEs = read('../lib/i18n.js');
  const i18nEn = read('../lib/i18n-en.js');

  it('la tarjeta muestra la píldora solo si el evento es recurrente', () => {
    // El bloque de la tarjeta: del botón .event-list-card al corazón.
    const card = eventsView.slice(
      eventsView.indexOf('className="event-list-card"'),
      eventsView.indexOf('handleToggleSaveEvent', eventsView.indexOf('className="event-list-card"')),
    );
    // La píldora vive guardada por is_recurring, junto a la de fecha.
    expect(card).toContain("{ev.is_recurring && <div");
    expect(card).toContain("t('evento_cada_semana', 'Cada semana')");
    // Sin is_recurring (false o ausente) no hay píldora: la única
    // aparición de is_recurring en la vista es ese guard.
    expect(eventsView.split('is_recurring').length - 1).toBe(1);
  });

  it('la píldora de la tarjeta usa el mismo estilo que la de fecha', () => {
    const card = eventsView.slice(eventsView.indexOf('className="event-list-card"'));
    // La fila de píldoras arriba a la izquierda sobre la foto.
    expect(card).toMatch(/position:'absolute', top:8, left:8, zIndex:2, display:'flex', gap:6/);
    // La píldora recurrente copia el estilo de la de fecha al dedillo.
    const pill = card.slice(card.indexOf('{ev.is_recurring'));
    expect(pill).toContain("borderRadius:999, padding:'4px 10px', fontSize:12, fontWeight:700");
    expect(pill).toContain("background:'rgba(0,0,0,0.55)', color:'#FFFFFF'");
  });

  it('la ficha muestra la píldora solo si el evento es recurrente', () => {
    // La píldora vive guardada por is_recurring, junto a la de fecha.
    expect(detailModal).toContain('{ev.is_recurring && (');
    expect(detailModal).toContain('t("evento_cada_semana", "Cada semana")');
    // Sin is_recurring no hay píldora: el guard es la única condición
    // que la muestra (la fecha sigue con su propia condición).
    expect(detailModal).toContain('((!isPast && heroDate) || ev.is_recurring)');
  });

  it('la píldora de la ficha usa el mismo estilo que la de fecha', () => {
    const pill = detailModal.slice(detailModal.indexOf('{ev.is_recurring && ('));
    expect(pill).toContain('fontSize: 12, fontWeight: 800, letterSpacing: "0.4px", padding: "6px 10px", borderRadius: 9999');
    expect(pill).toContain('background: dark ? "rgba(255,255,255,0.08)" : "rgba(15,26,20,0.06)"');
  });

  it('el fetch de eventos relacionados trae is_recurring (al tocar uno se abre su ficha)', () => {
    // La lista principal (getEvents) no usa select explícito, así que
    // is_recurring llega sola; la de relacionados sí lo usa y hay que
    // agregarla para que la ficha no pierda la píldora al navegar.
    expect(detailModal).toContain('description,event_category,is_recurring,biz_id');
  });

  it('el texto vive en i18n (es «Cada semana», en «Every week»)', () => {
    expect(i18nEs).toContain('"evento_cada_semana": "Cada semana"');
    expect(i18nEn).toContain('"evento_cada_semana": "Every week"');
  });

  it('no se agregó ningún filtro de solo semanales (decisión: solo la píldora)', () => {
    expect(eventsView).not.toMatch(/soloSemanales|recurringOnly|isRecurringFilter|filtro.*recurrente/i);
    expect(detailModal).not.toMatch(/soloSemanales|recurringOnly|isRecurringFilter/i);
  });
});
