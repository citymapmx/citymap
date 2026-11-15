import React from 'react';
import fs from 'node:fs';
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
    expect(html).toContain('CityMap ayuda a que más personas descubran negocios, lugares y servicios cuando buscan en internet. Las páginas de nuestra plataforma ya generan visitas desde Google, acercando a nuevos clientes a los negocios publicados.');
    expect(html).not.toContain('Publica tu negocio gratis en citymap. Te encuentran en el mapa, en el buscador y en Google, y te escriben directo por WhatsApp, sin comisiones.');
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

  it('muestra los 4 planes con sus precios MXN en mensual', () => {
    const html = renderLanding();
    expect(html).toContain('Gratuito');
    expect(html).toContain('Presencia');
    expect(html).toContain('Ventas');
    expect(html).toContain('Fideliza');
    expect(html).toContain('$99');
    expect(html).toContain('$199');
    expect(html).toContain('$299');
    expect(html).toContain('Más popular');
    expect(html).toContain('Para vender más');
    expect(html).toContain('Más completo');
    expect(html).not.toContain('Destacado');
    expect(html).not.toContain('Premium');
    expect(html).not.toContain('Lo mejor');
    // En mensual, los tres planes de pago ofrecen la prueba: la nota de
    // prueba aparece en las tres tarjetas y el botón de prueba también.
    expect(html.split('Pruébalo 7 días gratis.').length - 1).toBe(3);
    expect(html.split('Probar 7 días gratis').length - 1).toBe(3);
    expect(html).not.toContain('Empezar con Premium');
    // En mensual no aparece ningún CTA de pago sin prueba.
    expect(html).not.toContain('Elegir Presencia');
    expect(html).not.toContain('Elegir Ventas');
    expect(html).not.toContain('Elegir Fideliza');
    expect(html).toContain('Tu negocio en el mapa y en el buscador, con foto, dirección, teléfono y horarios.');
    // La tabla comparativa está en /negocios (15 nov 2026).
    expect(html).toContain('Compara los planes');
    expect(html).toContain('Tarjetas de lealtad');
    expect(html).toContain('Reservaciones');
    expect(html).toContain('Estadísticas avanzadas');
  });

  it('la prueba de 7 días existe en mensual Y en anual para los tres planes de pago', () => {
    // El repo no tiene jsdom, así que el render estático no puede pulsar
    // el interruptor Mensual/Anual (el estado inicial es mensual, y el
    // test de arriba ya fija que en mensual el botón dice "Probar 7 días
    // gratis"). Se fija sobre el fuente, como en
    // negocios_carga_directa.test.js, que planButton usa el mismo CTA de
    // prueba para los tres planes de pago sin distinguir el periodo, y
    // que ya no existe el CTA normal de pago ("Elegir ...") ni la rama
    // mensual/anual de antes.
    const src = fs.readFileSync(new URL('../components/BusinessLanding.jsx', import.meta.url), 'utf8');
    const planButton = src.slice(src.indexOf('const planButton'), src.indexOf('\n  return (', src.indexOf('const planButton')));
    expect(planButton).toContain('negocios_cta_probar');
    expect(planButton).not.toContain('cuenta_elegir_plan');
    expect(planButton).not.toContain('negocios_cta_premium');
    expect(planButton).not.toContain('billing === "monthly"');
    expect(planButton).toContain('onStartPaidPlan?.({ key: p.key }, billing)');
  });

  it('en anual, la nota promete la prueba y advierte el cobro del año completo', () => {
    // priceNote: en anual, la nota de prueba anual va antes de cualquier
    // nota mensual, y dice que después de la prueba se cobra el año.
    const src = fs.readFileSync(new URL('../components/BusinessLanding.jsx', import.meta.url), 'utf8');
    const priceNote = src.slice(src.indexOf('const priceNote'), src.indexOf('const planButton'));
    const annualIdx = priceNote.indexOf('billing === "annual"');
    const trialNoteIdx = priceNote.indexOf('negocios_prueba_gratis_anual');
    expect(annualIdx).toBeGreaterThan(-1);
    expect(trialNoteIdx).toBeGreaterThan(-1);
    expect(annualIdx).toBeLessThan(trialNoteIdx);
    expect(priceNote).toContain('Pruébalo 7 días gratis. Después se cobra el importe completo del año.');
  });

  it('el encabezado muestra el logotipo oficial centrado, sin título de texto ni botón de regreso', () => {
    const html = renderLanding();
    const header = html.match(/<header[\s\S]*?<\/header>/);
    expect(header).not.toBeNull();
    expect(header[0]).toContain('src="/logo-brand.png"');
    expect(header[0]).not.toContain('CityMap para negocios');
    expect(html).not.toContain('Volver');
    expect(html).not.toContain('chevron');
    // El texto sigue en el kicker del hero, no en el encabezado.
    expect(html).toContain('CityMap para negocios');
  });

  it('muestra las 6 preguntas frecuentes y el cierre', () => {
    const html = renderLanding();
    expect(html).toContain('Preguntas frecuentes');
    expect(html).toContain('¿Cuánto cuesta empezar?');
    expect(html).toContain('¿Necesito pagar para aparecer en CityMap?');
    expect(html).toContain('¿CityMap cobra comisión por mis ventas?');
    expect(html).toContain('¿Puedo probar los planes de pago gratis?');
    expect(html).toContain('Los tres planes de pago tienen 7 días de prueba gratis, en pago mensual y anual, sin compromiso');
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

  it('devuelve los precios MXN exactos del módulo de planes', () => {
    const pricing = getBusinessPricing('mx');
    expect(pricing.currency).toBe('MXN');
    const plans = buildBusinessPlans(t, pricing);
    expect(plans.map(p => p.key)).toEqual(['free', 'pro', 'elite', 'fideliza']);
    expect(plans.map(p => p.name)).toEqual(['Gratuito', 'Presencia', 'Ventas', 'Fideliza']);
    expect(plans[0].priceMonthly).toBe('$0');
    expect(plans[0].priceAnnual).toBe('$0');
    expect(plans[1].priceMonthly).toBe('$99');
    expect(plans[1].priceAnnual).toBe('$990');
    expect(plans[1].oldPriceMonthly).toBe('$199');
    expect(plans[1].oldPriceAnnual).toBe('$1,990');
    expect(plans[2].priceMonthly).toBe('$199');
    expect(plans[2].priceAnnual).toBe('$1,990');
    expect(plans[2].oldPriceMonthly).toBe('$499');
    expect(plans[2].oldPriceAnnual).toBe('$4,990');
    expect(plans[3].priceMonthly).toBe('$299');
    expect(plans[3].priceAnnual).toBe('$2,990');
    expect(plans[3].oldPriceMonthly).toBe('$599');
    expect(plans[3].oldPriceAnnual).toBe('$5,990');
    expect(plans[1].badge).toBe('Más popular');
    expect(plans[2].badge).toBe('Para vender más');
    expect(plans[3].badge).toBe('Más completo');
  });

  it('devuelve las mismas listas de features que muestra /negocios', () => {
    const plans = buildBusinessPlans(t, getBusinessPricing('mx'));
    expect(plans[0].features).toEqual([
      'Página pública',
      'Portada e información',
      'Teléfono y dirección',
      'Horarios',
      'Banner estándar',
      'Presencia en el mapa',
      'Aparición en búsquedas de CityMap',
    ]);
    expect(plans[1].features).toEqual([
      'Todo lo del plan Gratuito, más:',
      'Reseñas de Google',
      'SEO en Google',
      'Banner destacado',
      'Galería de fotografías',
      'WhatsApp y redes sociales',
      'Menú digital',
      'Panel de administrador',
      'Mayor visibilidad dentro de CityMap',
    ]);
    expect(plans[2].features).toEqual([
      'Todo lo del plan Presencia, más:',
      'Menú interactivo',
      'Menú indexado en Google',
      'Productos con fotografías y precios',
      'Carrito de compras',
      'Pedidos por WhatsApp',
      'Banner premium',
      'Logotipo destacado en el mapa',
      'Galería ampliada de fotografías',
      'Mayor exposición del negocio',
    ]);
    expect(plans[3].features).toEqual([
      'Todo lo del plan Ventas, más:',
      'Tarjetas de lealtad',
      'Sistema de recompensas',
      'Historial de clientes',
      'Cupones y promociones',
      'Gestión de eventos',
      'Reservaciones',
      'Estadísticas avanzadas',
      'Soporte prioritario',
      'Acceso a nuevas herramientas conforme estén disponibles',
    ]);
    expect(plans[2].screenshots).toHaveLength(1);
    expect(plans[3].screenshots).toHaveLength(2);
  });
});
