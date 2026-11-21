import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// El literal se arma por join para que este mismo archivo no lo contenga.
const CLIENT_SECRET_NEEDLE = ['VITE', 'ADMIN_SECRET'].join('_');

function walkJs(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'dist', '.tmp'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkJs(full, out);
    else if (/\.(js|jsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

// Quita comentarios de línea y de bloque: los comentarios pueden nombrar el
// secreto al explicar el cambio, pero el código no debe referenciarlo.
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|\s)\/\/.*$/gm, '$1');
}

describe('el secreto de admin fuera del bundle del cliente', () => {
  it('ningún archivo de src/, web-next/src/ ni api/ referencia el secreto del cliente', () => {
    const roots = [
      new URL('../', import.meta.url).pathname,
      new URL('../../web-next/src/', import.meta.url).pathname,
      new URL('../../api/', import.meta.url).pathname,
    ];
    const offenders = [];
    for (const root of roots) {
      for (const file of walkJs(root)) {
        const src = fs.readFileSync(file, 'utf8');
        if (src.includes(CLIENT_SECRET_NEEDLE)) offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('api/send-notification.js ya no menciona el secreto de admin en código', () => {
    const src = fs.readFileSync(new URL('../../api/send-notification.js', import.meta.url), 'utf8');
    expect(stripComments(src)).not.toContain('ADMIN_SECRET');
  });

  it('la ruta web-next de send-notification ya no menciona el secreto de admin en código', () => {
    const src = fs.readFileSync(new URL('../../web-next/src/app/api/send-notification/route.js', import.meta.url), 'utf8');
    expect(stripComments(src)).not.toContain('ADMIN_SECRET');
  });

  it('api/ai-menu.js ya no compara ningún secreto del cliente', () => {
    const src = fs.readFileSync(new URL('../../api/ai-menu.js', import.meta.url), 'utf8');
    expect(src).not.toContain('secret !== process.env.ADMIN_SECRET');
    expect(src).not.toContain('secret === process.env.ADMIN_SECRET');
    expect(src).not.toContain(CLIENT_SECRET_NEEDLE);
  });
});
