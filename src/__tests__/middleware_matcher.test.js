// Matcher del middleware: solo debe correr donde hace falta (rutas de
// página + /sitemap.xml y /robots.txt). Antes corría en cada request
// (244.693 invocaciones en 30 días, 93,4% del total; 2 h 52 min de CPU,
// 77,9%): también en /assets/*, /api/* y archivos, donde solo pasaba de
// largo. Este test refleja cómo Vercel compila el matcher: cada patrón
// es una regex que debe coincidir con el pathname completo.
import { describe, expect, it } from 'vitest';
import { config } from '../../middleware.js';

const matchers = config.matcher.map((p) => new RegExp(`^${p}$`));
const runsMiddleware = (path) => matchers.some((re) => re.test(path));

describe('middleware matcher (gasto de Vercel)', () => {
  it('corre en rutas de página', () => {
    for (const path of [
      '/',
 '/tepic',
      '/guadalajara',
      '/tepic/umami-ramen',
      '/tepic/c/restaurantes',
      '/evento/tepic/taemin',
      '/revista/tepic/tour-madrid',
      '/experiencias/tepic/x',
      '/eventos/tepic',
      '/mapa/tepic',
      '/explorar/tepic',
      '/tours',
      '/negocios',
      '/login',
      '/cuenta',
      '/favoritos',
      '/lealtad/tepic-umami-ramen',
      '/privacy',
      '/terms',
      '/planes',
      '/mx/tepic',
      '/fr/paris',
    ]) {
      expect(runsMiddleware(path), path).toBe(true);
    }
  });

  it('corre en /sitemap.xml y /robots.txt, que sirve el propio middleware', () => {
    expect(runsMiddleware('/sitemap.xml')).toBe(true);
    expect(runsMiddleware('/robots.txt')).toBe(true);
  });

  it('NO corre en /api/*, /assets/*, /_next/* ni /web-next/*', () => {
    for (const path of [
      '/api/og',
      '/api/register-token',
      '/api/sitemap.xml',
      '/api/robots.txt',
      '/assets/index-abc123.js',
      '/assets/App-def456.js',
      '/assets/style.css',
      '/_next/static/chunk.js',
      '/web-next/tepic',
    ]) {
      expect(runsMiddleware(path), path).toBe(false);
    }
  });

  it('NO corre en archivos estáticos (con extensión)', () => {
    for (const path of [
      '/sw.js',
      '/firebase-messaging-sw.js',
      '/favicon.ico',
      '/icon-192.png',
      '/manifest.webmanifest',
      '/logo.svg',
      '/.well-known/assetlinks.json',
      '/.well-known/apple-app-site-association',
    ]) {
      expect(runsMiddleware(path), path).toBe(false);
    }
  });
});
