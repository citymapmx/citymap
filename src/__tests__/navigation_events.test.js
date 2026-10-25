import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import middleware from '../../middleware.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const req = (path) => new Request(`https://citymap.mx${path}`, { headers: { 'user-agent': 'Mozilla/5.0' } });

describe('removed Planes section', () => {
  it.each(['/planes', '/planes/tepic', '/planes/guadalajara'])('%s answers a real 404 (no redirect)', async (path) => {
    const res = await middleware(req(path));
    expect(res.status).toBe(404);
    expect(res.headers.get('location')).toBeNull();
  });

  it('does not intercept /eventos/:ciudad', async () => {
    const res = await middleware(req('/eventos/tepic'));
    expect(res?.status).not.toBe(404);
  });
});

describe('bottom navigation and menus', () => {
  const nav = read('../components/BottomNav.jsx');

  it('lists Inicio, Revista, Mapa, Eventos, Mi Perfil in order', () => {
    const labels = [...nav.matchAll(/label: "([^"]+)"/g)].map(m => m[1]);
    expect(labels).toEqual(['Inicio', 'Revista', 'Mapa', 'Eventos', 'Mi Perfil']);
  });

  it('has no Planes or passport reference', () => {
    expect(nav).not.toMatch(/Planes"|\/planes|explorer/);
  });

  it('App maps the Eventos tab to /eventos/:ciudad and Favoritos to /favoritos', () => {
    const app = read('../App.jsx');
    expect(app).toContain('path = city ? `/eventos/${city}` : "/eventos"');
    expect(app).toContain('path = "/favoritos"');
    expect(app).not.toMatch(/`\/planes\/\$\{city\}`/);
  });

  it('events listing no longer renders the Mi pasaporte / Mis favoritos tab bar', () => {
    const events = read('../views/EventsView.jsx');
    expect(events).not.toMatch(/pasaporte|tab=guardados|SectionCategoryBar|ExplorerView|FavsView/i);
  });
});
