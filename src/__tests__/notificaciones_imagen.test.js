import fs from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  businessNotificationImage,
  eventNotificationImage,
  httpsImageUrl,
} from '../lib/notifications.js';

const LOGO = 'https://cdn.example.com/logo.png';
const BANNER = 'https://cdn.example.com/banner.png';
const PHOTO = 'https://cdn.example.com/foto.jpg';
const POSTER = 'https://cdn.example.com/poster.jpg';

describe('imagen del aviso: solo HTTPS', () => {
  it('acepta https y descarta http, relativas, vacías y nulas', () => {
    expect(httpsImageUrl(LOGO)).toBe(LOGO);
    expect(httpsImageUrl('http://cdn.example.com/x.png')).toBeNull();
    expect(httpsImageUrl('/img/x.png')).toBeNull();
    expect(httpsImageUrl('')).toBeNull();
    expect(httpsImageUrl(null)).toBeNull();
    expect(httpsImageUrl('  https://cdn.example.com/x.png  ')).toBe('https://cdn.example.com/x.png');
  });
});

describe('imagen del aviso: negocio (logo, banner o primera foto)', () => {
  it('el logo manda sobre banner y foto', () => {
    expect(businessNotificationImage({ logo_url: LOGO, banner_url: BANNER, photos: [{ url: PHOTO }] })).toBe(LOGO);
  });
  it('sin logo usa el banner; sin banner, la primera foto', () => {
    expect(businessNotificationImage({ banner_url: BANNER, photos: [{ url: PHOTO }] })).toBe(BANNER);
    expect(businessNotificationImage({ photos: [{ url: PHOTO }] })).toBe(PHOTO);
  });
  it('salta fotos sin url y valores no HTTPS', () => {
    expect(businessNotificationImage({ photos: [{ label: 'x' }, { url: PHOTO }] })).toBe(PHOTO);
    expect(businessNotificationImage({ logo_url: 'http://x/y.png', banner_url: BANNER })).toBe(BANNER);
  });
  it('sin imagen usable devuelve null', () => {
    expect(businessNotificationImage({})).toBeNull();
    expect(businessNotificationImage(null)).toBeNull();
    expect(businessNotificationImage({ photos: [] })).toBeNull();
  });
});

describe('imagen del aviso: evento (img_url o img)', () => {
  it('img_url manda sobre img; sin ninguna, null', () => {
    expect(eventNotificationImage({ img_url: POSTER, img: 'https://cdn.example.com/otra.jpg' })).toBe(POSTER);
    expect(eventNotificationImage({ img: POSTER })).toBe(POSTER);
    expect(eventNotificationImage({})).toBeNull();
    expect(eventNotificationImage(null)).toBeNull();
    expect(eventNotificationImage({ img_url: 'http://x/y.jpg' })).toBeNull();
  });
});

// ── sb.notify pasa la imagen al endpoint ────────────────────────────────────

describe('sb.notify: pasa la imagen al endpoint', () => {
  let sb;
  let calls;
  beforeEach(async () => {
    vi.resetModules();
    calls = [];
    vi.stubGlobal('fetch', vi.fn(async (url, opts) => {
      calls.push({ url, body: JSON.parse(opts?.body || '{}') });
      return { ok: true, json: async () => ({}) };
    }));
    ({ sb } = await import('../lib/supabase.js'));
  });

  it('con imageUrl la manda en el cuerpo del POST', async () => {
    await sb.notify('user-1', 'Título', 'Cuerpo', 'approval', null, LOGO);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain('/api/send-notification');
    expect(calls[0].body.imageUrl).toBe(LOGO);
  });
  it('sin imageUrl no lleva la clave (el aviso se manda igual)', async () => {
    await sb.notify('user-1', 'Título', 'Cuerpo');
    expect(calls).toHaveLength(1);
    expect(calls[0].body).not.toHaveProperty('imageUrl');
  });
});

// ── Cableado en la app y en el repo (fuente) ────────────────────────────────

describe('imagen del aviso: cableado (fuente)', () => {
  it('el enviador manual del admin usa la imagen del negocio/evento destino cuando no hay subida manual', () => {
    const src = fs.readFileSync(new URL('../components/AdminPanel.jsx', import.meta.url), 'utf8');
    expect(src).toContain('businessNotificationImage(selectedItem)');
    expect(src).toContain('eventNotificationImage(selectedItem)');
    expect(src).toContain('imageUrl: imgUrl || destImage');
    expect(src).toContain('logo_url,banner_url,photos');
    expect(src).toContain('img_url,img');
  });
  it('los avisos de negocio y de evento pasan su imagen en sb.notify', () => {
    const admin = fs.readFileSync(new URL('../components/AdminPanel.jsx', import.meta.url), 'utf8');
    expect(admin).toContain('businessNotificationImage(b)');
    expect(admin).toContain('eventNotificationImage(ev)');
    const eventsTab = fs.readFileSync(new URL('../components/admin/AdminEventsTab.jsx', import.meta.url), 'utf8');
    expect(eventsTab).toContain('eventNotificationImage(ev)');
    const agenda = fs.readFileSync(new URL('../components/ReservationsAgenda.jsx', import.meta.url), 'utf8');
    expect(agenda).toContain('businessNotificationImage(ownerView)');
    const resTab = fs.readFileSync(new URL('../components/admin/AdminReservationsTab.jsx', import.meta.url), 'utf8');
    expect(resTab).toContain('businessNotificationImage(biz)');
  });
  it('el aviso de reserva ya no pasa su imagen por sb.notify del cliente: la pone el servidor (buildBookingMessage lee logo/banner/fotos del negocio)', () => {
    const booking = fs.readFileSync(new URL('../components/BookingModal.jsx', import.meta.url), 'utf8');
    expect(booking).not.toContain('businessNotificationImage(biz)');
    expect(booking).not.toContain('sb.notify(');
    const lib = fs.readFileSync(new URL('../lib/bookingNotifications.js', import.meta.url), 'utf8');
    expect(lib).toContain('businessNotificationImage(business)');
    const api = fs.readFileSync(new URL('../../api/send-notification.js', import.meta.url), 'utf8');
    expect(api).toContain('logo_url,banner_url,photos');
  });
  it('runReminders pide la imagen del evento y la pasa en el POST interno', () => {
    const api = fs.readFileSync(new URL('../../api/send-notification.js', import.meta.url), 'utf8');
    expect(api).toContain('img_url,img');
    expect(api).toContain('...(item.imageUrl ? { imageUrl: item.imageUrl } : {})');
  });
});
