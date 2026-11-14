import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// Quitar «Compartir mi negocio» del Gestor de Menú y del panel de
// Reservaciones (14 nov 2026, Jonathan): compartir ya vive en Mi
// Perfil, así que no se duplica en esos dos lugares. El componente
// BizShareHub y su lógica NO se borran: los sigue usando el perfil.

describe('Quitar Compartir mi negocio: Gestor de Menú', () => {
  it('StoreAdminPanel ya no renderiza el centro de compartir', () => {
    const panel = read('../components/store/StoreAdminPanel.jsx');
    expect(panel).not.toContain('<BizShareHub');
    expect(panel).not.toContain('BizShareHub');
    expect(panel).not.toContain('Compartir mi negocio');
    expect(panel).not.toContain('Tarjeta del perfil');
    expect(panel).not.toContain('Tarjeta del menú');
  });

  it('el resto del gestor sigue ahí (categorías y monetización)', () => {
    const panel = read('../components/store/StoreAdminPanel.jsx');
    expect(panel).toContain('StoreCategoriesTab');
    expect(panel).toContain('StoreMonetizationTab');
    expect(panel).toContain('Crear promoción');
  });
});

describe('Quitar Compartir mi negocio: panel de Reservaciones', () => {
  it('OwnerDashboardView ya no tiene la fila ni la hoja de compartir', () => {
    const panel = read('../views/OwnerDashboardView.jsx');
    expect(panel).not.toContain('Compartir mi negocio');
    expect(panel).not.toContain('ShareCardSheet');
    expect(panel).not.toContain('showShareCard');
    expect(panel).not.toContain('doShare');
  });

  it('las demás filas del panel se quedan (reservaciones y links)', () => {
    const panel = read('../views/OwnerDashboardView.jsx');
    expect(panel).toContain('Tus Reservaciones');
    expect(panel).toContain('ReservationsAgenda');
    expect(panel).toContain('Link directo al panel');
    expect(panel).toContain('Link para reservar');
    expect(panel).toContain('bookingLink');
  });
});

describe('Quitar Compartir mi negocio: Mi Perfil no se toca', () => {
  it('AccountView sigue usando el centro (entrada + modal)', () => {
    const account = read('../components/AccountView.jsx');
    expect(account).toContain('compartir_mi_negocio');
    expect(account).toContain('Compartir mi negocio');
    expect(account).toContain('<BizShareHub');
    expect(account).toContain('owner_share_');
  });

  it('el componente y su lógica siguen existiendo para el perfil', () => {
    const hub = read('../components/BizShareHub.jsx');
    expect(hub).toContain('Compartir mi negocio');
    expect(hub).toContain('Tarjeta del perfil');
    const lib = read('../lib/compartirNegocio.js');
    expect(lib).toContain('compartirMaterials');
  });
});
