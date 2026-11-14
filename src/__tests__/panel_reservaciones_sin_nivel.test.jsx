import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(join(here, rel), 'utf8');

// 13 nov 2026 (Jonathan): la tarjeta «Nivel del Negocio» no se
// necesita de momento: se quita del panel de Reservaciones del dueño,
// solo la interfaz. La lógica de cálculo queda intacta para poder
// volverla a poner después. En el mismo cambio, «Tus Reservaciones»
// sube a PRIMERO y los botones quedan después.
describe('panel de Reservaciones del dueño: sin Nivel del Negocio, lista primero', () => {
  it('la tarjeta «Nivel del Negocio» ya no se pinta en el panel del dueño', () => {
    const owner = read('../views/OwnerDashboardView.jsx');
    expect(owner).not.toContain('GamificationWidget');
    expect(owner).not.toContain('Nivel del Negocio');
    expect(owner).not.toContain('Progreso al nivel');
  });

  it('el orden es: Tus Reservaciones, Link directo al panel, Compartir mi negocio', () => {
    const owner = read('../views/OwnerDashboardView.jsx');
    const agendaAt = owner.indexOf('<ReservationsAgenda');
    const linkAt = owner.indexOf('Link directo al panel');
    const shareAt = owner.indexOf('Compartir mi negocio');
    expect(agendaAt).toBeGreaterThan(-1);
    expect(linkAt).toBeGreaterThan(-1);
    expect(shareAt).toBeGreaterThan(-1);
    expect(agendaAt).toBeLessThan(linkAt);
    expect(linkAt).toBeLessThan(shareAt);
  });

  it('la lista sigue condicionada al plan de pago y los botones intactos', () => {
    const owner = read('../views/OwnerDashboardView.jsx');
    expect(owner).toContain('ownerView.plan !== "free"');
    expect(owner).toContain('<ReservationsAgenda ownerView={ownerView} ownerRes={ownerRes} setOwnerRes={setOwnerRes} />');
    expect(owner).toContain('Link directo al panel');
    expect(owner).toContain('Compartir mi negocio');
    expect(owner).toContain('setShowShareCard(true)');
  });

  it('la lógica de nivel queda guardada para volverla a poner: lib y widget existen, sin render', () => {
    // El cálculo (calculateTierProgress, getBizTier) sigue en el lib y
    // el componente sigue en su archivo; solo dejó de renderizarse en
    // el panel. La ficha pública conserva su iconito de nivel.
    expect(existsSync(join(here, '../lib/gamification.js'))).toBe(true);
    expect(existsSync(join(here, '../components/admin/GamificationWidget.jsx'))).toBe(true);
    const gamification = read('../lib/gamification.js');
    expect(gamification).toContain('calculateTierProgress');
    expect(gamification).toContain('getBizTier');
    const detail = read('../views/DetailView.jsx');
    expect(detail).toContain('getBizTier');
  });
});
