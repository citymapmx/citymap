import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import LoyaltyCardModal from '../views/LoyaltyCardModal.jsx';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

const noop = () => {};

// Tarjeta de Eduardo Barber (Tepic): la de la captura de Jonathan
// (14 nov 2026) en la que el visitante no inscrito veía NADA.
const CARD = {
  id: 'card-eduardo',
  stamps_required: 5,
  reward_text: 'Corte gratis',
  bg_color: '#1E5AA8',
  text_color: '#FFFFFF',
  primary_color: '#FFFFFF',
  type: 'card|star',
  logo_url: 'https://example.org/eduardo-logo.png',
};
const BIZ = {
  id: 'biz-eduardo',
  name: 'Eduardo Barber',
  banner_url: 'https://example.org/eduardo-banner.jpg',
  photos: [{ url: 'https://example.org/eduardo.jpg' }],
};
const MEMBER = { id: 'member-eduardo', stamps: 2 };

function renderModal(props = {}) {
  return renderToStaticMarkup(
    <LoyaltyCardModal open member={MEMBER} card={CARD} biz={BIZ} onClose={noop} {...props} />,
  );
}

// El botón «Tarjeta Lealtad» de la ficha ya no navega a /lealtad/:bizId:
// abre la tarjeta en un modal como el de Reservar, y ambos modales
// entran con la animación scale-in-center de las tarjetas del mapa
// (nov 2026). La ruta /lealtad/:bizId se conserva para enlaces directos.
describe('tarjeta de lealtad en modal desde la ficha', () => {
  const detail = read('../views/DetailView.jsx');

  it('el botón de la ficha ya NO navega a /lealtad/:bizId: abre el modal', () => {
    const pill = detail.slice(detail.indexOf('LOYALTY PILL'), detail.indexOf('Booking and menu remain'));
    expect(pill).toContain('Tarjeta Lealtad');
    expect(pill).not.toContain('/lealtad/');
    expect(pill).not.toContain('navigate(');
    expect(pill).toContain('setShowLoyalty(true)');
  });

  it('DetailView monta LoyaltyCardModal como BookingModal: lazy, estado, precarga y montaje al final', () => {
    expect(detail).toContain("const LoyaltyCardModal = lazy(() => import('../views/LoyaltyCardModal.jsx'));");
    expect(detail).toContain('const [showLoyalty, setShowLoyalty] = useState(false);');
    expect(detail).toContain("import('../views/LoyaltyCardModal.jsx').catch(() => {});");
    expect(detail).toContain('<LoyaltyCardModal open={showLoyalty}');
    expect(detail).toContain('onClose={() => setShowLoyalty(false)}');
    expect(detail).toContain('member={loyaltyDetailQuery.data?.member || null}');
    expect(detail).toContain('card={loyaltyDetailQuery.data?.card || null}');
    expect(detail).toContain('biz={selected}');
    expect(detail).toContain('setShowAuth={setShowAuth}');
    expect(detail).toContain('T={T}');
  });

  it('DetailView carga tarjeta y membresía antes de abrir (como LoyaltyCardView)', () => {
    expect(detail).toContain('loyalty_cards');
    expect(detail).toContain('?biz_id=eq.${selected.id}&active=eq.true&limit=1');
    expect(detail).toContain('loyalty_members');
    expect(detail).toContain('?user_id=eq.${user.id}&biz_id=eq.${selected.id}&limit=1');
    // Atajo para miembros: la precarga del perfil, sin sustituir la
    // consulta de la tarjeta para no-miembros.
    expect(detail).toContain('getPrefetchedLoyaltyEntries(user)');
  });

  it('la ruta /lealtad/:bizId sigue existiendo para enlaces directos', () => {
    const router = read('../router/AppRouter.jsx');
    expect(router).toContain('path="/lealtad/:bizId"');
    expect(router).toContain('<LoyaltyCardView');
  });

  it('BookingModal entra con scale-in-center, como las tarjetas del mapa', () => {
    const booking = read('../components/BookingModal.jsx');
    expect(booking).toContain('className="scale-in-center"');
    // El panel es un div plano en overlay flex (precedente ShareCardSheet):
    // la clase va en el panel, sin tocar las animaciones internas de pasos.
    const panel = booking.slice(booking.indexOf('className="scale-in-center"'));
    expect(panel).toContain('maxWidth: 440');
  });

  it('LoyaltyCardModal entra con scale-in-center, sin entrada de framer que compita', () => {
    const modal = read('../views/LoyaltyCardModal.jsx');
    expect(modal).toContain('className="scale-in-center"');
    // El elemento animado lleva la tarjeta visual completa.
    const animAt = modal.indexOf('className="scale-in-center"');
    expect(modal.indexOf('background: card.bg_color', animAt)).toBeGreaterThan(animAt);
    expect(modal.indexOf('borderRadius: 24', animAt)).toBeGreaterThan(animAt);
    // Patrón MapView: el exterior solo posiciona y anima la salida.
    expect(modal).toContain('initial={false}');
    expect(modal).toContain('exit={{ opacity: 0, y: 50, scale: 0.95 }}');
    expect(modal).not.toContain('initial={{ opacity: 0, y: 50, scale: 0.95 }}');
    // El overlay conserva su fundido de opacidad.
    expect(modal).toContain('initial={{ opacity: 0 }}');
  });

  it('sin miembro el modal pinta el formulario «Únete al programa», no vacío', () => {
    const html = renderModal({ member: null });
    expect(html).toContain('Únete al programa');
    expect(html).toContain('Guarda sellos en cada visita');
    expect(html).toContain('Agrega tu número');
    expect(html).toContain('type="tel"');
    expect(html).toContain('loyalty-whatsapp-input');
    expect(html).toContain('Obtener mi tarjeta');
    // Sin miembro no hay QR que mostrar.
    expect(html).not.toContain('Muestra este código en el negocio');
    // Pero la tarjeta sí se ve: nombre, sellos y premio.
    expect(html).toContain('Eduardo Barber');
    expect(html).toContain('0 DE 5 SELLOS');
    expect(html).toContain('Corte gratis');
  });

  it('con miembro el modal pinta sellos y QR, sin el formulario de alta', () => {
    const html = renderModal();
    expect(html).toContain('2 DE 5 SELLOS');
    expect(html).toContain('Muestra este código en el negocio para recibir tu sello');
    expect(html).not.toContain('Únete al programa');
    expect(html).not.toContain('Agrega tu número');
  });

  it('el formulario de alta valida con normalizeWhatsApp y pide login sin sesión', () => {
    const modal = read('../views/LoyaltyCardModal.jsx');
    expect(modal).toContain("import { normalizeWhatsApp } from '../lib/loyaltyWhatsapp.js'");
    expect(modal).toContain('normalizeWhatsApp(whatsapp)');
    expect(modal).toContain('setShowAuth');
    expect(modal).toContain('setShowAuth(true)');
    expect(modal).toContain('Escribe tu número de WhatsApp (10 dígitos) para unirte al programa.');
  });

  it('el alta crea la membresía como LoyaltyCardView y limpia la precarga', () => {
    const modal = read('../views/LoyaltyCardModal.jsx');
    expect(modal).toContain("sb.post('loyalty_members'");
    expect(modal).toContain('card_id: card.id');
    expect(modal).toContain('biz_id: biz.id');
    expect(modal).toContain('user_id: user.id');
    expect(modal).toContain('stamps: 0');
    // Reintento sin whatsapp si la columna aún no existe.
    expect(modal).toContain('payloadWithoutWhatsapp');
    expect(modal).toContain('clearPrefetchedLoyaltyEntries()');
  });

  it('el modal NO porta los botones de Wallet: quedan solo en la página', () => {
    const modal = read('../views/LoyaltyCardModal.jsx');
    expect(modal).not.toContain('Google Wallet');
    expect(modal).not.toContain('Apple Wallet');
    expect(modal).not.toContain('loyalty-wallet');
  });
});
