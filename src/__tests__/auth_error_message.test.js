import { describe, expect, it } from 'vitest';
import { mapAuthError } from '../lib/authErrorMessage.js';

// ── Mapeo de errores de autenticación (auditoría 14 nov 2026) ───────────────
// Los errores crudos llegaban al modal con tokens, client IDs y códigos de
// NSError en inglés: en iPhone (~390 px) un token de 71 caracteres
// desbordaba la caja ~208 px y el usuario no entendía nada. Cada caso de
// la tabla debe dar un mensaje corto en español y nunca soltar el detalle
// técnico.

const TOKEN_71 =
  '128467245162-b1di6bji2ejd0ior0mv6kr0atv9e6fia.apps.googleusercontent.com';

describe('mapAuthError: casos de la tabla', () => {
  it.each([
    [
      'Google: audiencia del id_token rechazada por Supabase',
      new Error(
        `Unacceptable audience in id_token: [${TOKEN_71}]`,
      ),
      'google',
      'No pudimos conectar con Google. Cierra la app y vuelve a intentarlo.',
    ],
    [
      'Apple: error 1000 de ASAuthorizationController',
      new Error(
        "The operation couldn't be completed. (com.apple.AuthenticationServices.AuthorizationError error 1000.)",
      ),
      'apple',
      'No pudimos conectar con Apple. Revisa tu conexión e inténtalo de nuevo.',
    ],
    [
      'Apple: error 1000 sin el texto de la operación',
      new Error('AuthorizationError error 1000'),
      'apple',
      'No pudimos conectar con Apple. Revisa tu conexión e inténtalo de nuevo.',
    ],
    [
      'Apple no devolvió token',
      new Error('Apple no devolvió un token de identidad'),
      'apple',
      'No recibimos tus datos de Apple. Inténtalo de nuevo.',
    ],
    [
      'Google no devolvió token',
      new Error('Google no devolvió un token de identidad'),
      'google',
      'No recibimos tus datos de Google. Inténtalo de nuevo.',
    ],
    [
      'id_token inválido',
      new Error('Invalid ID token'),
      'google',
      'No pudimos verificar tu cuenta. Inténtalo de nuevo.',
    ],
    [
      'cuenta ya registrada',
      new Error('User already registered'),
      undefined,
      'Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.',
    ],
    [
      'límite de intentos por email',
      new Error('Email rate limit exceeded'),
      undefined,
      'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
    ],
    [
      'demasiadas peticiones',
      new Error('Too many requests'),
      undefined,
      'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
    ],
    [
      'correo inválido (Supabase)',
      new Error('Unable to validate email address: invalid format'),
      undefined,
      'Ingresa un correo válido.',
    ],
    [
      'correo inválido genérico',
      new Error('Invalid email'),
      undefined,
      'Ingresa un correo válido.',
    ],
    [
      'sin red (fetch)',
      new Error('Failed to fetch'),
      undefined,
      'Sin conexión a internet. Revisa tu conexión e inténtalo de nuevo.',
    ],
    [
      'sin red (Capacitor)',
      new Error('Network request failed'),
      undefined,
      'Sin conexión a internet. Revisa tu conexión e inténtalo de nuevo.',
    ],
    [
      'sin red (WebKit)',
      new Error('Load failed'),
      undefined,
      'Sin conexión a internet. Revisa tu conexión e inténtalo de nuevo.',
    ],
    [
      'contraseña corta (Supabase)',
      new Error('Password should be at least 8 characters'),
      undefined,
      'Tu contraseña debe tener al menos 8 caracteres.',
    ],
    [
      'credenciales inválidas sin traducir',
      new Error('Invalid login credentials'),
      undefined,
      'Email o contraseña incorrectos',
    ],
    [
      'email sin confirmar sin traducir',
      new Error('Email not confirmed'),
      undefined,
      'Confirma tu email antes de iniciar sesión',
    ],
    [
      'error desconocido',
      new Error('Something completely unexpected happened'),
      undefined,
      'Algo salió mal. Inténtalo de nuevo.',
    ],
  ])('%s', (_name, err, provider, expected) => {
    expect(mapAuthError(err, provider)).toBe(expected);
  });

  it('la detección no depende de mayúsculas/minúsculas', () => {
    expect(mapAuthError(new Error('UNACCEPTABLE AUDIENCE IN ID_TOKEN: [x]'), 'google')).toBe(
      'No pudimos conectar con Google. Cierra la app y vuelve a intentarlo.',
    );
    expect(mapAuthError('AUTHORIZATIONERROR ERROR 1000', 'apple')).toBe(
      'No pudimos conectar con Apple. Revisa tu conexión e inténtalo de nuevo.',
    );
  });

  it('acepta strings además de Error, y valores vacíos dan el genérico', () => {
    expect(mapAuthError('Failed to fetch')).toBe(
      'Sin conexión a internet. Revisa tu conexión e inténtalo de nuevo.',
    );
    expect(mapAuthError('')).toBe('Algo salió mal. Inténtalo de nuevo.');
    expect(mapAuthError(null)).toBe('Algo salió mal. Inténtalo de nuevo.');
    expect(mapAuthError(undefined)).toBe('Algo salió mal. Inténtalo de nuevo.');
  });

  it('el mensaje mapeado nunca suelta el detalle técnico (token, client ID, dominio)', () => {
    const mapped = mapAuthError(
      new Error(`Unacceptable audience in id_token: [${TOKEN_71}]`),
      'google',
    );
    expect(mapped).not.toContain(TOKEN_71);
    expect(mapped).not.toContain('googleusercontent.com');
    expect(mapped).not.toContain('id_token');
  });
});

describe('mapAuthError: mensajes ya correctos en español pasan tal cual', () => {
  it.each([
    'Email o contraseña incorrectos',
    'Confirma tu email antes de iniciar sesión',
    'Revisa tu email para confirmar la cuenta antes de entrar',
    'Por favor ingresa tu nombre y elige tu ciudad',
    'No se pudo obtener el usuario',
    'Tu contraseña debe cumplir todos los requisitos',
    'Ingresa un correo válido',
    'No se pudo enviar el correo. Inténtalo de nuevo.',
    'No se pudo iniciar sesión, intenta de nuevo',
    'Error al iniciar sesión con Google',
    'Error al iniciar sesión con Apple',
  ])('"%s" no se reescribe', (msg) => {
    expect(mapAuthError(new Error(msg))).toBe(msg);
  });
});
