import React from 'react';
import fs from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import AddBizModal from '../components/AddBizModal.jsx';
import BizRequestCard from '../components/BizRequestCard.jsx';
import {
  unreadCount, badgeText, markAllReadLocal, buildEditBizDeepLink,
  parseEditBizDeepLink, resolveNotifAction, changeRequestTitle,
  changeRequestBody, isDuplicateChangeRequest, bizRequestState,
} from '../lib/notifications.js';
import { hasTrial } from '../lib/crearNegocio.js';

const T = { text: '#111', sub: '#666', bg: '#fff', border: '#ddd', green: '#000' };
const EMPTY_FORM = {
  name: '', category: '', city: '', description: '', address: '', phone: '',
  whatsapp: '', website: '', mercado_libre_nickname: '', video_url: '',
  logo_url: '', lat: '', lng: '', tags: [], photos: [], facebook: '',
  instagram: '', tiktok: '', schedule: {},
};

function renderWizard(props = {}) {
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
      activeCity="zapopan"
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

const readSrc = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');

describe('notificaciones: lógica pura', () => {
  it('cuenta solo las sin leer', () => {
    expect(unreadCount([{ read: false }, { read: true }, { read: false }])).toBe(2);
    expect(unreadCount([])).toBe(0);
    expect(unreadCount(null)).toBe(0);
  });

  it('el globito no se muestra sin sin leer y se topa en 99+', () => {
    expect(badgeText(0)).toBe('');
    expect(badgeText(3)).toBe('3');
    expect(badgeText(99)).toBe('99');
    expect(badgeText(150)).toBe('99+');
  });

  it('marcar todo leído no muta la lista original', () => {
    const notifs = [{ id: 1, read: false }, { id: 2, read: true }];
    const marked = markAllReadLocal(notifs);
    expect(marked.every((n) => n.read)).toBe(true);
    expect(notifs[0].read).toBe(false);
  });

  it('el enlace profundo a la edición va y viene', () => {
    const link = buildEditBizDeepLink('abc-123');
    expect(link).toBe('/cuenta?editarNegocio=abc-123');
    expect(parseEditBizDeepLink(link)).toBe('abc-123');
    expect(parseEditBizDeepLink('/cuenta')).toBeNull();
    expect(parseEditBizDeepLink('https://citymap.mx/negocios')).toBeNull();
    expect(parseEditBizDeepLink(null)).toBeNull();
  });

  it('el tap de notificación resuelve a edición, URL o nada', () => {
    expect(resolveNotifAction({ deep_link: '/cuenta?editarNegocio=abc' })).toEqual({ kind: 'edit-biz', bizId: 'abc' });
    expect(resolveNotifAction({ action_url: '/cuenta?editarNegocio=x' })).toEqual({ kind: 'edit-biz', bizId: 'x' });
    expect(resolveNotifAction({ deep_link: '/negocios' })).toEqual({ kind: 'url', url: '/negocios' });
    expect(resolveNotifAction({ title: 'Hola' })).toEqual({ kind: 'none' });
    expect(resolveNotifAction(null)).toEqual({ kind: 'none' });
  });

  it('«Se requieren cambios» tiene título y cuerpo fijos', () => {
    expect(changeRequestTitle()).toBe('Se requieren cambios');
    expect(changeRequestBody('Prueba')).toBe('Revisa las notas para Prueba.');
  });

  it('no se duplica el aviso si ya hay uno igual sin leer', () => {
    const existing = [{ title: 'Se requieren cambios', body: 'Revisa las notas para Prueba.', read: false }];
    expect(isDuplicateChangeRequest(existing, 'Prueba')).toBe(true);
    expect(isDuplicateChangeRequest(existing, 'Otro')).toBe(false);
    expect(isDuplicateChangeRequest([{ ...existing[0], read: true }], 'Prueba')).toBe(false);
    expect(isDuplicateChangeRequest([], 'Prueba')).toBe(false);
  });

  it('el estado de la solicitud distingue cambios de revisión', () => {
    expect(bizRequestState({ status: 'needs_changes' })).toEqual({
      needsChanges: true, pillKey: 'requiere_cambios', pillDefault: 'Se requieren cambios', showEdit: true,
    });
    expect(bizRequestState({ status: 'pending' })).toEqual({
      needsChanges: false, pillKey: 'en_revision', pillDefault: 'En revisión', showEdit: false,
    });
  });
});

describe('prueba de 7 días: solo mensual y solo de pago', () => {
  it('hasTrial', () => {
    expect(hasTrial('pro', 'monthly')).toBe(true);
    expect(hasTrial('elite', 'monthly')).toBe(true);
    expect(hasTrial('pro', 'annual')).toBe(false);
    expect(hasTrial('elite', 'annual')).toBe(false);
    expect(hasTrial('free', 'monthly')).toBe(false);
  });
});

describe('tarjeta de Mis solicitudes (render)', () => {
  const t = (k, d) => d;
  const onEdit = vi.fn();

  it('con cambios: pastilla roja, notas y botón de editar', () => {
    const html = renderToStaticMarkup(
      <BizRequestCard
        b={{ id: '1', name: 'Prueba', category: 'Restaurantes', status: 'needs_changes', admin_notes: 'Le falta dirección' }}
        T={T} dark={false} t={t} onEdit={onEdit}
      />,
    );
    expect(html).toContain('Se requieren cambios');
    expect(html).toContain('Le falta dirección');
    expect(html).toContain('Editar y reenviar');
    expect(html).toContain('cursor:pointer');
    expect(html).toContain('role="button"');
  });

  it('en revisión: pastilla neutra, sin botón, pero la tarjeta sigue siendo tocable', () => {
    const html = renderToStaticMarkup(
      <BizRequestCard
        b={{ id: '1', name: 'Prueba', category: 'Restaurantes', status: 'pending' }}
        T={T} dark={false} t={t} onEdit={onEdit}
      />,
    );
    expect(html).toContain('En revisión');
    expect(html).not.toContain('Editar y reenviar');
    expect(html).toContain('role="button"');
  });
});

describe('asistente: ajustes del PR #211 (render y fuente)', () => {
  it('el paso 1 muestra «Logotipo» una sola vez como texto visible', () => {
    const html = renderWizard();
    // La etiqueta centrada; el cuadrito solo lleva aria-label.
    expect(html.split('>Logotipo<').length - 1).toBe(1);
    expect(html).toContain('En el mapa, el logotipo es función del plan Premium.');
  });

  it('los cuadros de texto llevan trazo sutil y anulación del autofill amarillo', () => {
    const html = renderWizard();
    // El render del paso 1 pinta 5 (nombre, categoría, descripción, ciudad,
    // dirección); el paso 2 aporta WhatsApp, teléfono y las dos horas.
    expect((html.match(/class="cn-input"/g) || []).length).toBe(5);
    const src = readSrc('../components/AddBizModal.jsx');
    expect((src.match(/className="cn-input"/g) || []).length).toBe(9);
    expect(html).toContain('1px solid var(--cn-hairline)');
    expect(html).toContain('--cn-hairline:#E5E7EB');
    expect(html).toContain('-webkit-autofill');
    expect(html).toContain('-webkit-box-shadow: 0 0 0 1000px var(--cn-input-bg) inset');
    expect(html).toContain('transition: background-color 9999s');
  });

  it('el paso 2 ya no tiene la leyenda de WhatsApp por plan', () => {
    const html = renderWizard();
    expect(html).not.toContain('Tu WhatsApp se muestra');
    const src = readSrc('../components/AddBizModal.jsx');
    expect(src).not.toContain('crear_negocio_whatsapp_nota');
  });

  it('«7 días gratis» es texto sin píldora, solo en mensual de pago', () => {
    const src = readSrc('../components/AddBizModal.jsx');
    expect(src).toContain('hasTrial(p.key, billing)');
    expect(src).not.toContain('background: blueSoft');
    // Texto pequeño azul arriba del precio, alineado a la derecha.
    expect(src).toContain("alignItems: 'flex-end'");
    expect(src).toContain("flexDirection: 'column'");
  });
});

describe('aviso de sin leer: cableado (fuente)', () => {
  it('el conteo vive en el store y se carga al arrancar', () => {
    expect(readSrc('../store/useUIStore.js')).toContain('unreadNotifCount');
    expect(readSrc('../store/useUIStore.js')).toContain('setUnreadNotifCount');
    expect(readSrc('../services/dbService.js')).toContain('getUnreadNotificationCount');
    expect(readSrc('../hooks/useInAppNotifications.js')).toContain('getUnreadNotificationCount');
  });

  it('BottomNav pinta el punto rojo en Mi Perfil y /cuenta el globito', () => {
    expect(readSrc('../components/BottomNav.jsx')).toContain('unreadNotifCount');
    expect(readSrc('../components/BottomNav.jsx')).toContain('#FF3B30');
    expect(readSrc('../components/AccountView.jsx')).toContain('unreadNotifCount');
    expect(readSrc('../components/AccountView.jsx')).toContain('badgeText(unreadNotifCount)');
  });

  it('al abrir Notificaciones se marca todo leído', () => {
    const src = readSrc('../components/UserNotifs.jsx');
    expect(src).toContain('markAllReadLocal');
    expect(src).toContain('setUnreadNotifCount(0)');
  });

  it('la notificación y la tarjeta abren la edición del negocio', () => {
    expect(readSrc('../components/AdminPanel.jsx')).toContain('buildEditBizDeepLink');
    expect(readSrc('../components/AdminPanel.jsx')).toContain('requestBizChanges');
    expect(readSrc('../components/AdminPanel.jsx')).toContain('isDuplicateChangeRequest');
    const account = readSrc('../components/AccountView.jsx');
    expect(account).toContain('editarNegocio');
    expect(account).toContain('openBizEdit');
    expect(account).toContain('BizRequestCard');
  });
});
