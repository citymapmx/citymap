import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import NotificationSettings from '../components/NotificationSettings.jsx';
import { AppContext } from '../context/AppContext.jsx';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

const T = { text: '#111', sub: '#666', bg: '#fff', white: '#fff', border: '#eee' };

function renderSettings() {
  const ctx = { requestWebNotifications: vi.fn(), user: null, setShowAuth: vi.fn() };
  return renderToStaticMarkup(
    <AppContext.Provider value={ctx}>
      <NotificationSettings T={T} />
    </AppContext.Provider>,
  );
}

describe('Notificaciones del dispositivo: sin soporte no se muestra nada', () => {
  it('en «unsupported» el componente retorna null: ni sección, ni aviso, ni botón', () => {
    const src = read('../components/NotificationSettings.jsx');
    // El retorno temprano cubre unsupported igual que granted.
    expect(src).toContain("if (status === 'granted' || status === 'unsupported') return null;");
    // El texto del aviso muerto ya no existe en el componente.
    expect(src).not.toContain('No están disponibles aquí');
    expect(src).not.toContain('agrega CityMap a la pantalla de inicio');
    // Y la sección solo se pinta después de ese retorno.
    const retPos = src.indexOf("status === 'unsupported') return null");
    const sectionPos = src.indexOf('aria-label="Notificaciones del dispositivo"');
    expect(retPos).toBeGreaterThan(0);
    expect(sectionPos).toBeGreaterThan(retPos);
  });

  it('«denied» y «error» siguen mostrando su mensaje, porque ahí sí se puede hacer algo', () => {
    const src = read('../components/NotificationSettings.jsx');
    expect(src).toContain("denied: 'Están bloqueadas. Puedes permitirlas en los ajustes del navegador o del teléfono.'");
    expect(src).toContain("error: 'No se pudo completar la activación. Inténtalo de nuevo.'");
    // Ni denied ni error van en el retorno temprano.
    const retLine = src.split('\n').find(l => l.includes('return null'));
    expect(retLine).not.toContain('denied');
    expect(retLine).not.toContain('error');
  });

  it('el render por defecto (checking) sigue mostrando la sección, no se borró el componente', () => {
    const html = renderSettings();
    expect(html).toContain('Notificaciones del dispositivo');
    expect(html).toContain('Comprobando disponibilidad…');
  });

  it('«granted» sigue retornando null como antes', () => {
    const src = read('../components/NotificationSettings.jsx');
    expect(src).toContain("status === 'granted'");
  });
});
