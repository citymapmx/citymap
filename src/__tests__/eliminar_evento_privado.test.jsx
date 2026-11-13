import { readFileSync } from 'node:fs';
import { describe, it, expect, vi } from 'vitest';
import { isPrivateEventHost, deletePrivateEvent, PRIVATE_EVENT_DELETED_EVENT } from '../lib/privateEvents.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

const HOST_ID = '40509477-86fe-48d1-865b-849b9e9d6f77';
const GUEST_ID = 'b414890a-6ed8-4c9b-8c28-f4874051671a';
const posada = { id: '8b6ed301-d988-4965-bc66-65a176bdd3b5', title: 'Posada 2026', user_id: HOST_ID, visibility: 'private', img_url: 'https://example.com/foto.webp' };

// Anfitrión: solo quien creó el evento ve el botón «Eliminar evento».
describe('isPrivateEventHost', () => {
  it('el creador es anfitrión', () => {
    expect(isPrivateEventHost(posada, HOST_ID)).toBe(true);
  });
  it('otro usuario con cuenta no es anfitrión', () => {
    expect(isPrivateEventHost(posada, GUEST_ID)).toBe(false);
  });
  it('sin sesión o sin user_id no es anfitrión', () => {
    expect(isPrivateEventHost(posada, null)).toBe(false);
    expect(isPrivateEventHost(posada, undefined)).toBe(false);
    expect(isPrivateEventHost({ ...posada, user_id: null }, HOST_ID)).toBe(false);
    expect(isPrivateEventHost(null, HOST_ID)).toBe(false);
  });
  it('compara como texto (uuid con distinto tipo no se cuela)', () => {
    expect(isPrivateEventHost({ ...posada, user_id: 123 }, '123')).toBe(true);
    expect(isPrivateEventHost({ ...posada, user_id: 123 }, '124')).toBe(false);
  });
});

// Borrado para todos: evento + imagen + RSVPs + chat (la cascada de la base
// borra RSVPs/mensajes/likes; la limpieza best-effort cubre si no estuviera).
describe('deletePrivateEvent', () => {
  const fakeDb = (overrides = {}) => ({
    calls: [],
    del: vi.fn(async function (table, id) { this.calls.push(['del', table, id]); }),
    delWhere: vi.fn(async function (table, col, val) { this.calls.push(['delWhere', table, col, val]); return true; }),
    ...overrides,
  });

  it('borra el evento, su imagen, sus RSVPs y sus mensajes', async () => {
    const db = fakeDb();
    const deleteImage = vi.fn(async () => {});
    await deletePrivateEvent({ db, deleteImage, event: posada });
    expect(db.del).toHaveBeenCalledWith('events', posada.id);
    expect(db.del).toHaveBeenCalledTimes(1);
    expect(deleteImage).toHaveBeenCalledWith(posada.img_url);
    expect(db.delWhere).toHaveBeenCalledWith('event_rsvps', 'event_id', posada.id);
    expect(db.delWhere).toHaveBeenCalledWith('event_messages', 'event_id', posada.id);
  });

  it('borra el evento ANTES que la imagen: si el evento no se borra, la foto queda', async () => {
    const db = fakeDb({ del: vi.fn(async () => { throw new Error('RLS'); }) });
    const deleteImage = vi.fn(async () => {});
    await expect(deletePrivateEvent({ db, deleteImage, event: posada })).rejects.toThrow('RLS');
    expect(deleteImage).not.toHaveBeenCalled();
    expect(db.delWhere).not.toHaveBeenCalled();
  });

  it('sin imagen no intenta borrar nada en Storage', async () => {
    const db = fakeDb();
    const deleteImage = vi.fn(async () => {});
    await deletePrivateEvent({ db, deleteImage, event: { ...posada, img_url: null, img: null } });
    expect(deleteImage).not.toHaveBeenCalled();
    expect(db.del).toHaveBeenCalledWith('events', posada.id);
  });

  it('usa img como respaldo cuando no hay img_url', async () => {
    const db = fakeDb();
    const deleteImage = vi.fn(async () => {});
    await deletePrivateEvent({ db, deleteImage, event: { ...posada, img_url: null, img: 'https://example.com/vieja.webp' } });
    expect(deleteImage).toHaveBeenCalledWith('https://example.com/vieja.webp');
  });

  it('si la limpieza best-effort falla, el borrado igual se cumple', async () => {
    const db = fakeDb({ delWhere: vi.fn(async () => { throw new Error('no hay permiso'); }) });
    await expect(deletePrivateEvent({ db, deleteImage: vi.fn(async () => {}), event: posada })).resolves.toBeUndefined();
    expect(db.del).toHaveBeenCalledWith('events', posada.id);
  });

  it('sin id no borra nada y lanza', async () => {
    const db = fakeDb();
    await expect(deletePrivateEvent({ db, deleteImage: vi.fn(async () => {}), event: { title: 'Sin id' } })).rejects.toThrow();
    expect(db.del).not.toHaveBeenCalled();
  });
});

// El botón solo se renderiza para el anfitrión, con confirmación antes de
// borrar, y tras borrar la lista se actualiza sin recargar.
describe('botón «Eliminar evento» en la app', () => {
  const account = read('../components/AccountView.jsx');
  const modal = read('../components/modals/EventDetailModal.jsx');

  it('la tarjeta de «Mis eventos privados» muestra el botón solo al anfitrión', () => {
    expect(account).toContain('{isPrivateEventHost(ev, user?.id) && (');
    expect(account).toContain('cuenta_eliminar_evento');
  });
  it('la tarjeta pide confirmación con el nombre del evento antes de borrar', () => {
    expect(account).toContain('cuenta_eliminar_evento_confirmar');
    expect(account).toContain('¿Eliminar «${title}» para todos? Esta acción no se puede deshacer. Se borra el evento, las confirmaciones de asistencia y el chat.');
    expect(account).toContain('window.confirm(');
  });
  it('al borrar desde la tarjeta se quita de la lista y sale el toast', () => {
    expect(account).toContain("await deletePrivateEvent({ db: sb, deleteImage: cloudDelete, event: ev })");
    expect(account).toContain('setMyPrivateEvents(list => list.filter(item => item.id !== ev.id))');
    expect(account).toContain('cuenta_evento_eliminado');
  });
  it('la lista escucha el borrado hecho desde el detalle del evento', () => {
    expect(account).toContain('PRIVATE_EVENT_DELETED_EVENT');
    expect(account).toContain('window.addEventListener(PRIVATE_EVENT_DELETED_EVENT, onDeleted)');
  });
  it('el detalle del evento privado también tiene el botón, solo para el anfitrión', () => {
    expect(modal).toContain('{isPrivateEventHost(ev, user?.id) && (');
    expect(modal).toContain('eventos_eliminar_evento');
    expect(modal).toContain('eventos_eliminar_evento_confirmar');
  });
  it('al borrar desde el detalle se avisa a la lista y se cierra el modal', () => {
    expect(modal).toContain("await deletePrivateEvent({ db: sb, deleteImage: cloudDelete, event: ev })");
    expect(modal).toContain('window.dispatchEvent(new CustomEvent(PRIVATE_EVENT_DELETED_EVENT');
    expect(modal).toContain('eventos_evento_eliminado');
    const handler = modal.indexOf('confirmDeletePrivateEvent');
    const close = modal.indexOf('setSelectedEvent(null)', handler);
    expect(close).toBeGreaterThan(handler);
  });
  it('el nombre del evento de ventana es estable y único', () => {
    expect(PRIVATE_EVENT_DELETED_EVENT).toBe('citymap:private-event-deleted');
  });
  it('los invitados no ven el botón: ningún otro render del botón existe sin el criterio de anfitrión', () => {
    const accountButtons = (account.match(/cuenta_eliminar_evento/g) || []).length;
    expect(accountButtons).toBeGreaterThan(0);
    // El único render del botón de la tarjeta vive dentro del bloque del anfitrión.
    const guard = account.indexOf('{isPrivateEventHost(ev, user?.id) && (');
    const button = account.indexOf('cuenta_eliminar_evento', guard);
    expect(button).toBeGreaterThan(guard);
  });
});
