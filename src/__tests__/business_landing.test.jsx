import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { HelmetProvider } from 'react-helmet-async';
import BusinessLanding from '../components/BusinessLanding.jsx';
import { buildBusinessPlans, getBusinessPricing } from '../lib/businessPlans.js';

const T = { text: '#111', sub: '#666', bg: '#fff', border: '#ddd', green: '#000' };

function renderLanding(props = {}) {
  return renderToStaticMarkup(
    <HelmetProvider>
      <BusinessLanding T={T} dark={false} navigate={() => {}} myBizList={null} onAddBiz={vi.fn()} onStartPaidPlan={vi.fn()} {...props} />
    </HelmetProvider>,
  );
}

describe('business landing', () => {
  it('muestra el h1 aprobado y los 4 números', () => {
    const html = renderLanding();
    expect(html).toContain('Haz que más personas encuentren tu negocio.');
    expect(html).toContain('Publica tu negocio gratis en citymap. Te encuentran en el mapa, en el buscador y en Google, y te escriben directo por WhatsApp, sin comisiones.');
    expect(html).toContain('330');
    expect(html).toContain('35');
    expect(html).toContain('167');
    expect(html).toContain('153');
    expect(html).toContain('negocios publicados');
    expect(html).toContain('ciudades');
    expect(html).toContain('eventos vigentes');
    expect(html).toContain('tours y guías');
  });

  it('muestra los 6 beneficios', () => {
    const html = renderLanding();
    expect(html).toContain('Por qué CityMap');
    expect(html).toContain('Te encuentran en el mapa');
    expect(html).toContain('Te encuentran en Google');
    expect(html).toContain('Pedidos por WhatsApp, sin comisiones');
    expect(html).toContain('Un menú digital que vende solo');
    expect(html).toContain('Tus eventos y promociones llegan a la gente');
    expect(html).toContain('Sabes qué está funcionando');
  });

  it('muestra los 3 pasos de cómo funciona', () => {
    const html = renderLanding();
    expect(html).toContain('Cómo funciona');
    expect(html).toContain('Crea tu perfil gratis');
    expect(html).toContain('Completa tu información');
    expect(html).toContain('Te encuentran y te escriben');
  });

  it('muestra los 3 planes con sus precios MXN en mensual', () => {
    const html = renderLanding();
    expect(html).toContain('Gratuito');
    expect(html).toContain('Destacado');
    expect(html).toContain('Premium');
    expect(html).toContain('$99');
    expect(html).toContain('$249');
    expect(html).toContain('Más popular');
    expect(html).toContain('Lo mejor');
    expect(html).toContain('Pruébalo 7 días gratis');
    expect(html).toContain('Probar 7 días gratis');
    // En mensual, Destacado y Premium ofrecen la prueba: la nota de prueba
    // aparece en ambas tarjetas y el botón "Empezar con Premium" solo sale
    // en el pago anual.
    expect(html.split('Pruébalo 7 días gratis (solo en el pago mensual).').length - 1).toBe(2);
    expect(html.split('Probar 7 días gratis').length - 1).toBe(2);
    expect(html).not.toContain('Empezar con Premium');
    expect(html).toContain('Lo esencial para estar presente.');
  });

  it('el encabezado no tiene botón de regreso (solo el título)', () => {
    const html = renderLanding();
    expect(html).toContain('CityMap para negocios');
    expect(html).not.toContain('Volver');
    expect(html).not.toContain('chevron');
  });

  it('muestra las 6 preguntas frecuentes y el cierre', () => {
    const html = renderLanding();
    expect(html).toContain('Preguntas frecuentes');
    expect(html).toContain('¿Cuánto cuesta empezar?');
    expect(html).toContain('¿Necesito pagar para aparecer en CityMap?');
    expect(html).toContain('¿CityMap cobra comisión por mis ventas?');
    expect(html).toContain('¿Puedo probar los planes de pago gratis?');
    expect(html).toContain('Los planes Destacado y Premium mensuales tienen 7 días de prueba gratis');
    expect(html).toContain('¿En qué ciudades está CityMap?');
    expect(html).toContain('¿Qué necesito para registrar mi negocio?');
    expect(html).toContain('Tu negocio ya lo buscan. Que lo encuentren.');
    expect(html).toContain('Súmate a los 330 negocios que ya están en CityMap.');
  });

  it('no menciona cancelación en ninguna parte', () => {
    const html = renderLanding();
    expect(html.toLowerCase()).not.toContain('cancel');
  });
});

describe('business plans module', () => {
  const t = (k, f) => f;

  it('devuelve los precios MXN exactos de PlansPage', () => {
    const pricing = getBusinessPricing('mx');
    expect(pricing.currency).toBe('MXN');
    const plans = buildBusinessPlans(t, pricing);
    expect(plans.map(p => p.key)).toEqual(['free', 'pro', 'elite']);
    expect(plans[0].priceMonthly).toBe('$0');
    expect(plans[0].priceAnnual).toBe('$0');
    expect(plans[1].priceMonthly).toBe('$99');
    expect(plans[1].priceAnnual).toBe('$990');
    expect(plans[1].oldPriceMonthly).toBe('$199');
    expect(plans[1].oldPriceAnnual).toBe('$1,990');
    expect(plans[2].priceMonthly).toBe('$249');
    expect(plans[2].priceAnnual).toBe('$2,490');
    expect(plans[2].oldPriceMonthly).toBe('$499');
    expect(plans[2].oldPriceAnnual).toBe('$4,990');
  });

  it('devuelve las mismas listas de features que muestra PlansPage', () => {
    const plans = buildBusinessPlans(t, getBusinessPricing('mx'));
    expect(plans[0].features).toEqual([
      'Página pública del negocio en CityMap',
      'Portada e Información del negocio',
      'Teléfono y Dirección',
      'Horarios',
      'Banner estándar',
    ]);
    expect(plans[1].features).toEqual([
      'Todo lo del plan gratuito, más:',
      'Posicionamiento SEO en Google',
      'Banner destacado',
      'Galería de fotos',
      'Enlace a WhatsApp y redes sociales',
      'Menú QR (Para Local)',
      'Panel de administrador',
    ]);
    expect(plans[2].features).toEqual([
      'Todo lo del plan Destacado, más:',
      'Menú interactivo indexado en Google',
      'Banner premium y Logotipo en mapa',
      'Vídeos',
      'Carrito enlazado a WhatsApp',
      'Amplia galería de fotos',
      'Gestión de Eventos y Reservas',
      'Reseñas de Google Maps',
      'Estadísticas y Soporte prioritario',
      'Tarjetas de lealtad',
      'Integración de cupones',
      'Próximamente más herramientas...',
    ]);
    expect(plans[2].screenshots).toHaveLength(3);
  });
});
