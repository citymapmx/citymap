import React from 'react';
import fs from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import AddBizModal from '../components/AddBizModal.jsx';
import { bizToForm, isBizOwner } from '../lib/bizForm.js';
import { firstDayRange, isAdvancedSchedule } from '../lib/crearNegocio.js';
import {
  resolveNotifAction, parseNotifBiz, findBizByName, bizPageUrl,
} from '../lib/notifications.js';

const T = { text: '#111', sub: '#666', bg: '#fff', border: '#ddd', green: '#000' };
const EMPTY_FORM = {
  name: '', category: '', city: '', description: '', address: '', phone: '',
  whatsapp: '', website: '', mercado_libre_nickname: '', video_url: '',
  logo_url: '', lat: '', lng: '', tags: [], photos: [], facebook: '',
  instagram: '', tiktok: '', schedule: {},
};
const readSrc = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');

function renderModal(props = {}) {
  return renderToStaticMarkup(
    <AddBizModal
      showAddBiz
      setShowAddBiz={vi.fn()}
      addBizForm={EMPTY_FORM}
      setAddBizForm={vi.fn()}
      editBizId={null}
      setEditBizId={vi.fn()}
      user={null}
      setBiz={vi.fn()}
      biz={[]}
      T={T}
      cats={[{ id: '1', label: 'Restaurantes' }]}
      toast$={vi.fn()}
      activeCity="tepic"
      loadMyBiz={vi.fn()}
      loadPaginatedBiz={vi.fn()}
      loadMapPins={vi.fn()}
      setShowPlans={vi.fn()}
      pendingPlan={null}
      setPendingPlan={vi.fn()}
      {...props}
    />,
  );
}

// El negocio «Prueba» tal como está en la base: owner_id null, user_id del
// dueño, nombre con espacio al final, needs_changes.
const PRUEBA = {
  id: '7cdea5a5-e7f7-4c5a-8f75-9e0e92ec95e9',
  name: 'Prueba ',
  category: 'Restaurantes',
  status: 'needs_changes',
  owner_id: null,
  user_id: '40509477-86fe-48d1-865b-849b9e9d6f77',
  plan: 'free',
  city_slug: 'tepic',
  slug: 'tepic-prueba',
  description: 'Negocio de prueba',
  address: 'Calle 1',
  phone: '3110000000',
  photos: [{ url: 'https://x/foto.jpg' }],
  logo_url: 'https://x/logo.jpg',
  schedule: { lun: '09:00 a.m. - 10:00 p.m.', mar: 'Cerrado' },
  mercado_libre_nickname: 'prueba-ml',
  tags: ['tacos'],
};

describe('bizForm: prefill de la edición', () => {
  it('bizToForm copia todos los campos que el envío vuelve a mandar', () => {
    const f = bizToForm(PRUEBA);
    expect(f.name).toBe('Prueba ');
    expect(f.category).toBe('Restaurantes');
    expect(f.city).toBe('tepic');
    expect(f.photos).toEqual(['https://x/foto.jpg']);
    expect(f.logo_url).toBe('https://x/logo.jpg');
    // Sin estos dos, cada edición los borraba (el formulario viejo no los
    // prellenaba y el envío mandaba null / undefined).
    expect(f.mercado_libre_nickname).toBe('prueba-ml');
    expect(f.tags).toEqual(['tacos']);
    expect(f.status).toBe('needs_changes');
    expect(f.owner_id).toBeNull();
    expect(f.user_id).toBe('40509477-86fe-48d1-865b-849b9e9d6f77');
    expect(bizToForm(null)).toBeNull();
  });

  it('isBizOwner mira owner_id O user_id (el viejo solo miraba owner_id)', () => {
    expect(isBizOwner(PRUEBA, '40509477-86fe-48d1-865b-849b9e9d6f77')).toBe(true);
    expect(isBizOwner({ owner_id: 'u1', user_id: null }, 'u1')).toBe(true);
    expect(isBizOwner({ owner_id: 'u2', user_id: 'u3' }, 'u1')).toBe(false);
    expect(isBizOwner(null, 'u1')).toBe(false);
    expect(isBizOwner(PRUEBA, null)).toBe(false);
  });
});

describe('crearNegocio: horario de la edición', () => {
  it('firstDayRange lee el primer día abierto en 24 h', () => {
    expect(firstDayRange(PRUEBA.schedule)).toEqual({ open: '09:00', close: '22:00' });
    expect(firstDayRange({})).toBeNull();
    expect(firstDayRange({ lun: 'Cerrado' })).toBeNull();
    expect(firstDayRange(null)).toBeNull();
  });

  it('isAdvancedSchedule detecta tipo avanzado y varios turnos', () => {
    expect(isAdvancedSchedule({ type: 'advanced' })).toBe(true);
    expect(isAdvancedSchedule({ type: 'always_open' })).toBe(true);
    expect(isAdvancedSchedule({ type: 'appointment' })).toBe(true);
    expect(isAdvancedSchedule({ type: 'regular', lun: '09:00 a.m. - 10:00 p.m.' })).toBe(false);
    expect(isAdvancedSchedule({ lun: '09:00 a.m. - 02:00 p.m.\n04:00 p.m. - 08:00 p.m.' })).toBe(true);
    expect(isAdvancedSchedule({})).toBe(false);
    expect(isAdvancedSchedule(null)).toBe(false);
  });
});

describe('notificaciones viejas sin enlace: el tap resuelve por el negocio', () => {
  const MY_BIZ = [PRUEBA, {
    id: 'b2', name: 'Akami Sushi', city_slug: 'tepic', slug: 'tepic-akami-sushi',
    status: 'approved', plan: 'premium',
  }];

  it('«Se requieren cambios» sin deep_link abre la edición por el nombre (con espacio al final)', () => {
    const n = { title: 'Se requieren cambios', body: 'Revisa las notas para Prueba .', type: 'alert' };
    expect(resolveNotifAction(n, MY_BIZ)).toEqual({
      kind: 'edit-biz',
      bizId: '7cdea5a5-e7f7-4c5a-8f75-9e0e92ec95e9',
      url: '/cuenta?editarNegocio=7cdea5a5-e7f7-4c5a-8f75-9e0e92ec95e9',
    });
  });

  it('negocio aprobado sin enlace abre su ficha pública', () => {
    expect(resolveNotifAction({ title: '¡Negocio aprobado!', body: 'Tu negocio Akami Sushi ya es público.', type: 'approval' }, MY_BIZ))
      .toEqual({ kind: 'biz-page', bizId: 'b2', url: '/tepic/akami-sushi' });
  });

  it('reclamo aprobado sin enlace abre su ficha pública', () => {
    expect(resolveNotifAction({ title: 'Reclamo aprobado', body: 'Eres el administrador oficial de Akami Sushi.', type: 'approval' }, MY_BIZ))
      .toEqual({ kind: 'biz-page', bizId: 'b2', url: '/tepic/akami-sushi' });
  });

  it('reserva sin enlace abre /manage de ese negocio', () => {
    expect(resolveNotifAction({ title: 'Reserva confirmada', body: 'Tu reserva en Akami Sushi ha sido confirmada.', type: 'alert' }, MY_BIZ))
      .toEqual({ kind: 'url', url: '/manage/tepic-akami-sushi' });
  });

  it('reserva tipo booking sin nombre: con un solo negocio va a su /manage', () => {
    expect(resolveNotifAction({ title: 'Nueva reserva', body: 'Tienes una reserva nueva.', type: 'booking' }, [PRUEBA]))
      .toEqual({ kind: 'url', url: '/manage/tepic-prueba' });
  });

  it('sin destino posible abre /cuenta, nunca nada', () => {
    expect(resolveNotifAction({ title: 'Evento aprobado', body: 'Tu evento ya es público.', type: 'system' }, MY_BIZ))
      .toEqual({ kind: 'cuenta', url: '/cuenta' });
    expect(resolveNotifAction({ title: 'Hola' }, [])).toEqual({ kind: 'cuenta', url: '/cuenta' });
    expect(resolveNotifAction(null)).toEqual({ kind: 'cuenta', url: '/cuenta' });
  });

  it('con enlace, el enlace manda (no el nombre)', () => {
    expect(resolveNotifAction({ deep_link: '/cuenta?editarNegocio=zzz', body: 'Revisa las notas para Prueba .' }, MY_BIZ))
      .toEqual({ kind: 'edit-biz', bizId: 'zzz', url: '/cuenta?editarNegocio=zzz' });
  });

  it('parseNotifBiz y findBizByName normalizan el nombre', () => {
    expect(parseNotifBiz({ body: 'Revisa las notas para Prueba .' })).toEqual({ name: 'Prueba', dest: 'edit' });
    expect(parseNotifBiz({ body: 'Sin negocio aquí' })).toBeNull();
    expect(findBizByName(MY_BIZ, 'prueba')).toBe(PRUEBA);
    expect(findBizByName(MY_BIZ, '  PRUEBA  ')).toBe(PRUEBA);
    expect(findBizByName(MY_BIZ, 'Otro')).toBeNull();
    expect(bizPageUrl({ city_slug: 'tepic', slug: 'tepic-akami-sushi' })).toBe('/tepic/akami-sushi');
    expect(bizPageUrl({ city_slug: 'tepic', name: 'Akami Sushi' })).toBe('/tepic/akami-sushi');
    expect(bizPageUrl({ name: 'Sin ciudad' })).toBe('/cuenta');
  });
});

describe('edición: el asistente nuevo, prellenado, en 2 pasos (render)', () => {
  const user = { id: '40509477-86fe-48d1-865b-849b9e9d6f77' };

  it('dueño gratuito: título, «Paso 1 de 2», nombre estático y sin borrar fotos ni logotipo', () => {
    const html = renderModal({
      editBizId: PRUEBA.id, user, addBizForm: bizToForm(PRUEBA), biz: [PRUEBA],
    });
    expect(html).toContain('Actualizar negocio');
    expect(html).toContain('Paso 1 de 2');
    expect(html).toContain('Corrige la información y reenvía para revisión');
    // El nombre se ve pero no es un input editable.
    expect(html).toContain('>Prueba <');
    expect(html).not.toContain('value="Prueba "');
    // Sin botones de quitar foto ni logotipo, sin subir fotos.
    expect(html).not.toContain('Quitar foto');
    expect(html).not.toContain('Quitar logotipo');
    expect(html).not.toContain('Agregar foto');
    // Sin paso 3 ni pago: la creación es la única que llega a planes.
    expect(html).not.toContain('Elige tu plan');
  });

  it('dueño con plan de pago: nombre editable y fotos/logotipo con quitar', () => {
    const premium = { ...PRUEBA, plan: 'premium', status: 'approved' };
    const html = renderModal({
      editBizId: premium.id, user, addBizForm: bizToForm(premium), biz: [premium],
    });
    expect(html).toContain('Actualizar negocio');
    expect(html).toContain('Paso 1 de 2');
    expect(html).toContain('value="Prueba "');
    expect(html).toContain('Quitar foto');
    expect(html).toContain('Quitar logotipo');
  });

  it('creación sigue en 3 pasos con «Crea tu negocio»', () => {
    const html = renderModal();
    expect(html).toContain('Crea tu negocio');
    expect(html).toContain('Paso 1 de 3');
    expect(html).not.toContain('Actualizar negocio');
  });
});

describe('edición: el formulario viejo ya no existe (fuente)', () => {
  it('AddBizModal no tiene checkbox de dueño, ni MenuManager, ni «Sugerir»', () => {
    const src = readSrc('../components/AddBizModal.jsx');
    expect(src).not.toContain('Soy el dueño');
    expect(src).not.toContain('MenuManager');
    expect(src).not.toContain('Sugerir un lugar');
    expect(src).not.toContain('isOwnerEdit');
    expect(src).not.toContain('¿Por qué lo recomiendas?');
    expect(src).not.toContain('Dirección aproximada');
    // La edición vive en el asistente: 2 pasos, sin plan ni pago.
    expect(src).toContain('crear_negocio_paso_de_2');
    expect(src).toContain('!isEdit && step === 3');
    expect(src).toContain('editSubmitLabel');
    expect(src).toContain("addBizForm.status === 'approved'");
    expect(src).toContain('firstDayRange');
    expect(src).toContain('isAdvancedSchedule');
    expect(src).toContain('isLimitedEdit');
  });
});

describe('tarjetas de notificaciones: sin icono ni color, texto a la izquierda (fuente)', () => {
  it('UserNotifs no pinta cuadrito ni barra y usa el destino resuelto', () => {
    const src = readSrc('../components/UserNotifs.jsx');
    expect(src).not.toContain('getIconForType');
    expect(src).not.toContain('iconObj');
    expect(src).not.toContain('width: 44, height: 44');
    expect(src).toContain('resolveNotifAction');
    expect(src).toContain('myBizList');
    expect(src).toContain('textAlign: "left"');
    // El tap marca leída (ya estaba) y navega siempre a algo.
    expect(src).toContain('handleTap');
    expect(src).toContain("action.url || '/cuenta'");
  });
});

describe('solo 1 negocio por cuenta (fuente)', () => {
  it('AccountView oculta «Agregar mi negocio» si ya hay uno y abre la edición', () => {
    const src = readSrc('../components/AccountView.jsx');
    expect(src).toContain('Solo 1 negocio por cuenta');
    expect(src).toContain('myBizList?.length');
    expect(src).toContain('openBizEdit(first)');
    expect(src).toContain('bizToForm');
  });

  it('AppRouter: «Crear perfil gratis» abre la edición si ya hay negocio', () => {
    const src = readSrc('../router/AppRouter.jsx');
    expect(src).toContain('bizToForm');
    expect(src).toContain('setEditBizId(first.id)');
  });

  it('App: efecto central que convierte cualquier apertura de creación en edición', () => {
    const src = readSrc('../App.jsx');
    expect(src).toContain('Solo 1 negocio por cuenta');
    expect(src).toContain('setEditBizId(first.id)');
    expect(src).toContain('setAddBizForm(bizToForm(first))');
  });
});
