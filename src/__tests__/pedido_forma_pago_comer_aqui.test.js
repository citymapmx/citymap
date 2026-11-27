import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { buildWhatsAppMessage } from '../lib/storeUtils.js';

const drawerSrc = fs.readFileSync(new URL('../components/store/CartDrawer.jsx', import.meta.url), 'utf8');

// Pedido (nov 2026): forma de pago (efectivo/transferencia/tarjeta),
// «Comer en el lugar» como tercer método y confirmación antes de vaciar
// el carrito. Sin teléfono del cliente (el pedido llega desde su
// WhatsApp, el negocio ya ve quién lo manda) y sin costo/zona de envío.
const biz = { id: 'b1', name: 'El Pastor del Rica', city_slug: 'zapopan' };
const items = [
  { id: 'i1', quantity: 2, unitTotal: 23, product: { name: 'TACO DE PASTOR', cat_name: 'Tacos' }, selectedOptions: [], specialInstructions: '' },
];

describe('buildWhatsAppMessage: método y pago', () => {
  it('recoger dice el método y el pago en efectivo por defecto', () => {
    const msg = buildWhatsAppMessage(items, biz, 'Daniel');
    expect(msg).toContain('Método: Pasar a recoger');
    expect(msg).toContain('Pago: Efectivo');
  });

  it('domicilio dice el método, la dirección y el pago elegido', () => {
    const msg = buildWhatsAppMessage(items, biz, 'Daniel', 'delivery', 'Calle 1 (Ref: portón)', '', 'tarjeta');
    expect(msg).toContain('Método: Envío a domicilio');
    expect(msg).toContain('Dirección: Calle 1 (Ref: portón)');
    expect(msg).toContain('Pago: Tarjeta');
  });

  it('comer en el lugar dice el método y no pide dirección', () => {
    const msg = buildWhatsAppMessage(items, biz, 'Daniel', 'dinein', '', '', 'transferencia');
    expect(msg).toContain('Método: Comer en el lugar');
    expect(msg).not.toContain('Dirección:');
    expect(msg).toContain('Pago: Transferencia');
  });
});

describe('CartDrawer: forma de pago, comer en el lugar y confirmación', () => {
  it('tiene los tres métodos de entrega, con Comer en el lugar', () => {
    expect(drawerSrc).toContain("'pickup' | 'delivery' | 'dinein'");
    expect(drawerSrc).toContain('Comer en el lugar');
    expect(drawerSrc).toContain("gridTemplateColumns: '1fr 1fr 1fr'");
  });

  it('tiene forma de pago con efectivo preseleccionado', () => {
    expect(drawerSrc).toContain("useState('efectivo')");
    expect(drawerSrc).toContain('Transferencia');
    expect(drawerSrc).toContain('Tarjeta');
    expect(drawerSrc).toContain('Forma de pago *');
  });

  it('al abrir WhatsApp no vacía el carrito: pregunta primero', () => {
    expect(drawerSrc).toContain('setShowSentConfirm(true)');
    expect(drawerSrc).toContain('¿Ya enviaste tu pedido?');
    expect(drawerSrc).toContain('Sí, ya lo envié');
    expect(drawerSrc).toContain('No, volver al carrito');
    expect(drawerSrc).not.toContain('Vaciar el carrito y cerrar el modal tras enviar el pedido');
  });

  it('no pide teléfono del cliente', () => {
    // El pedido llega desde el WhatsApp del cliente: el negocio ya ve
    // quién lo manda. No debe existir campo de teléfono en el pedido.
    expect(drawerSrc).not.toMatch(/teléfono del cliente|Tu teléfono/i);
  });
});
