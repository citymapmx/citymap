import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parse } from 'dotenv';
import { loadEnv } from 'vite';

// Espejo de build-android.mjs para iOS: construye la web (vite build) y
// sincroniza los assets + plugins en el proyecto Xcode (cap sync ios).
// Se corre en la Mac (Xcode + CocoaPods/SPM): `npm run build:ios`.
// El sync actualiza ios/App/App/public y el Package.swift de CapApp-SPM
// con los plugins; la compilación y la subida a TestFlight se hacen en
// Xcode (Product → Archive).
const root = fileURLToPath(new URL('../', import.meta.url));
const env = { ...process.env };
const production = loadEnv('production', root, 'VITE_');
const localPath = resolve(root, '.env.local');
const local = existsSync(localPath) ? parse(readFileSync(localPath)) : {};
const isPlaceholder = value => typeof value === 'string' && /\[SENSITIVE\]|\[REDACTED\]/i.test(value);

// Vercel exports can contain redacted values. Never package those instead of
// the valid public configuration already available on the developer's machine.
for (const [key, value] of Object.entries(production)) {
  env[key] = isPlaceholder(value)
    ? (local[key] && !isPlaceholder(local[key]) ? local[key] : '')
    : value;
}
for (const key of ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_GMAPS_KEY']) {
  if (!env[key] || isPlaceholder(env[key])) {
    throw new Error(`Falta una configuración pública válida para ${key}. Revisa .env.local.`);
  }
}
for (const args of [['run', 'build'], ['exec', '--', 'cap', 'sync', 'ios']]) {
  const result = spawnSync('npm', args, { cwd: root, env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
