import React from 'react';
import fs from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import AddBizModal from '../components/AddBizModal.jsx';
import { buildBusinessPlans, getBusinessPricing } from '../lib/businessPlans.js';
import {
  to12h, toT24, parseDayRange, isDayOpen, openDaysOf, buildSchedule,
  effectivePlanFeatures, comparePlanFeatures, planPrice,
  isPaidPlanKey, parsePriceNumber,
} from '../lib/crearNegocio.js';

const T = { text: '#111', sub: '#666', bg: '#fff', border: '#ddd', green: '#000' };
const EMPTY_FORM = {
  name: '', category: '', city: '', description: '', address: '', phone: '',
  whatsapp: '', website: '', mercado_libre_nickname: '', video_url: '',
  logo_url: '', lat: '', lng: '', tags: [], photos: [], facebook: '',
  instagram: '', tiktok: '', schedule: {},
};

function renderWizard(props = {}) {
  return renderToStaticMarkup(
    <AddBizModal
      showAddBiz
      setShowAddBiz={vi.fn()}
      addBizForm={EMPTY_FORM}
      setAddBizForm={vi.fn()}
      editBizId={null}
      setEditBizId={vi.fn()}
      user={null}
      setBiz={vi.fn()}
      biz={[]}
      T={T}
      cats={[{ id: '1', label: 'Restaurantes' }]}
      toast$={vi.fn()}
      activeCity="zapopan"
      loadMyBiz={vi.fn()}
      loadPaginatedBiz={vi.fn()}
      loadMapPins={vi.fn()}
      setShowPlans={vi.fn()}
      pendingPlan={null}
      setPendingPlan={vi.fn()}
      {...props}
    />,
  );
}

describe('crear negocio: lógica pura del asistente', () => {
  it('convierte horarios entre 24 h y 12 h como los guarda la base', () => {
    expect(to12h('09:00')).toBe('09:00 a.m.');
    expect(to12h('22:00')).toBe('10:00 p.m.');
    expect(to12h('12:00')).toBe('12:00 p.m.');
    expect(toT24('09:00 a.m.')).toBe('09:00');
    expect(toT24('10:00 p.m.')).toBe('22:00');
    expect(toT24('12:00 a.m.')).toBe('00:00');
  });

  it('lee el rango de un día y devuelve null si está cerrado', () => {
    expect(parseDayRange('09:00 a.m. - 10:00 p.m.')).toEqual({ open: '09:00', close: '22:00' });
    expect(parseDayRange('Cerrado')).toBeNull();
    expect(parseDayRange('')).toBeNull();
  });

  it('construye el schedule: los días no elegidos quedan "Cerrado"', () => {
    const s = buildSchedule(['lun', 'mie', 'vie'], '09:00', '22:00');
    expect(s.lun).toBe('09:00 a.m. - 10:00 p.m.');
    expect(s.mie).toBe('09:00 a.m. - 10:00 p.m.');
    expect(s.vie).toBe('09:00 a.m. - 10:00 p.m.');
    expect(s.mar).toBe('Cerrado');
    expect(s.dom).toBe('Cerrado');
    expect(openDaysOf(s)).toEqual(['lun', 'mie', 'vie']);
    expect(isDayOpen(s, 'lun')).toBe(true);
    expect(isDayOpen(s, 'mar')).toBe(false);
  });

  it('las funciones efectivas heredan las de los planes inferiores', () => {
    const plans = buildBusinessPlans((k, f) => f, getBusinessPricing('mx'));
    expect(effectivePlanFeatures(plans, 'free')).toContain('Reseñas de Google');
    expect(effectivePlanFeatures(plans, 'pro')).toContain('Reseñas de Google');
    expect(effectivePlanFeatures(plans, 'pro')).toContain('Menú digital');
    expect(effectivePlanFeatures(plans, 'elite')).toContain('Reseñas de Google');
    expect(effectivePlanFeatures(plans, 'elite')).not.toContain('Vídeos');
    expect(effectivePlanFeatures(plans, 'elite')).not.toContain('Reseñas de Google Maps');
    expect(effectivePlanFeatures(plans, 'free')).not.toContain('Menú digital');
  });

  it('la tabla de comparación pone "Reseñas de Google" una sola vez, sin vídeos', () => {
    const plans = buildBusinessPlans((k, f) => f, getBusinessPricing('mx'));
    const rows = comparePlanFeatures(plans);
    expect(rows).toContain('Reseñas de Google');
    expect(rows.filter(r => r === 'Reseñas de Google').length).toBe(1);
    expect(rows).not.toContain('Vídeos');
    expect(rows).not.toContain('Reseñas de Google Maps');
    expect(rows).toContain('Menú digital');
    // Las funciones del gratuito van primero.
    expect(rows.indexOf('Reseñas de Google')).toBeLessThan(rows.indexOf('Menú digital'));
  });

  it('el precio del plan depende del periodo elegido', () => {
    const plans = buildBusinessPlans((k, f) => f, getBusinessPricing('mx'));
    expect(planPrice(plans[1], 'monthly')).toBe('$99');
    expect(planPrice(plans[1], 'annual')).toBe('$990');
    expect(planPrice(plans[2], 'monthly')).toBe('$199');
    expect(planPrice(plans[2], 'annual')).toBe('$1,990');
    expect(isPaidPlanKey('free')).toBe(false);
    expect(isPaidPlanKey('pro')).toBe(true);
    expect(isPaidPlanKey('elite')).toBe(true);
    expect(parsePriceNumber('$1,990')).toBe(1990);
    expect(parsePriceNumber('$99')).toBe(99);
  });
});

describe('crear negocio: cambios de funciones de planes', () => {
  it('el gratuito menciona las reseñas de Google en su descripción y funciones', () => {
    const plans = buildBusinessPlans((k, f) => f, getBusinessPricing('mx'));
    expect(plans[0].desc).toContain('reseñas de Google');
    expect(plans[0].features).toContain('Reseñas de Google');
  });

  it('el Destacado dice "Menú digital" y el Premium ya no tiene vídeos ni reseñas', () => {
    const plans = buildBusinessPlans((k, f) => f, getBusinessPricing('mx'));
    expect(plans[1].features).toContain('Menú digital');
    expect(plans[1].features.join(' ')).not.toContain('Menú QR');
    expect(plans[2].features.join(' ')).not.toContain('Vídeos');
    expect(plans[2].features.join(' ')).not.toContain('Reseñas de Google');
    expect(plans[2].desc).not.toContain('Reseñas de Google');
  });
});

describe('crear negocio: asistente de 3 pasos (render)', () => {
  it('el paso 1 muestra el título, el indicador y los campos en el orden aprobado', () => {
    const html = renderWizard();
    expect(html).toContain('Crea tu negocio');
    expect(html).toContain('Paso 1 de 3');
    expect(html).toContain('Tu negocio');
    expect(html).toContain('Logotipo');
    expect(html).toContain('Fotos');
    expect(html).toContain('Ej. Nokai Sushi');
    expect(html).toContain('Descripción corta');
    expect(html).toContain('Zapopan');
    expect(html).toContain('Dirección');
    expect(html).toContain('Siguiente');
    // Sin rastro del formulario viejo de sugerir lugares.
    expect(html).not.toContain('Sugerir un lugar o negocio');
    expect(html).not.toContain('Soy el dueño');
    expect(html).not.toContain('¿Por qué lo recomiendas?');
    expect(html).not.toContain('Se publicará tras la revisión');
    expect(html).not.toContain('Enviar para revisión');
    expect(html).not.toContain('Dirección aproximada');
    // La ciudad se muestra por su nombre, no por el slug.
    expect(html).not.toContain('>zapopan<');
    // El texto del logotipo explica que en el mapa es función del Premium.
    expect(html).toContain('En el mapa, el logotipo es función del plan Premium.');
  });

  it('el paso 1 ordena Logotipo, Fotos, Nombre, Categoría, Descripción, Ciudad y Dirección', () => {
    const src = fs.readFileSync(new URL('../components/AddBizModal.jsx', import.meta.url), 'utf8');
    const wizard = src.slice(src.indexOf('if (isCreate)'), src.indexOf('{step === 2 &&'));
    const order = [
      'crear_negocio_logotipo',
      'crear_negocio_fotos',
      'Ej. Nokai Sushi',
      'crear_negocio_categoria',
      'crear_negocio_descripcion',
      'crear_negocio_ciudad',
      'crear_negocio_direccion',
    ];
    const idx = order.map(k => wizard.indexOf(k));
    idx.forEach((i, n) => expect(i).toBeGreaterThan(-1, `falta ${order[n]}`));
    for (let n = 1; n < idx.length; n++) expect(idx[n]).toBeGreaterThan(idx[n - 1]);
  });
});

describe('crear negocio: fuente del asistente', () => {
  const src = fs.readFileSync(new URL('../components/AddBizModal.jsx', import.meta.url), 'utf8');

  it('el paso 2 tiene WhatsApp sin leyenda, teléfono y las 7 píldoras de días', () => {
    // La leyenda «Tu WhatsApp se muestra con los planes Destacado y
    // Premium» se quitó (PR #211): la info vive en el paso 3.
    expect(src).not.toContain('crear_negocio_whatsapp_nota');
    expect(src).toContain('crear_negocio_horario_nota');
    expect(src).toContain('WIZARD_DAYS');
    expect(src).toContain('¿Qué días abres?');
    expect(src).toContain("'Cerrado'");
  });

  it('el paso 3 tiene planes, beneficios, comparación, periodo y el caption del logotipo', () => {
    expect(src).toContain('crear_negocio_ver_beneficios');
    expect(src).toContain('crear_negocio_comparar');
    expect(src).toContain('crear_negocio_logo_caption');
    expect(src).toContain('crear_negocio_admin_nota');
    expect(src).toContain('crear_negocio_crear_pagar');
    expect(src).toContain('cuenta_mensual');
    expect(src).toContain('cuenta_anual');
    // La nota de prueba solo en mensual; el anual muestra el total del año.
    expect(src).toContain('cuenta_hoy_no_pagas');
    expect(src).toContain('crear_negocio_pagas_ano');
  });

  it('al crear con plan de pago se fija el plan pendiente para abrir Stripe', () => {
    expect(src).toContain('setPendingPlan?.({ key: planKey, billing })');
    expect(src).toContain('setPendingPlan?.(null)');
  });

  it('la rama de edición conserva el formulario anterior sin el campo de vídeo', () => {
    const edit = src.slice(src.indexOf('EDICIÓN de un negocio existente'));
    expect(edit).toContain('Actualizar negocio');
    expect(edit).toContain('Sugerir un lugar o negocio');
    expect(edit).toContain('¿Por qué lo recomiendas?');
    expect(edit).toContain('Soy el dueño o administrador de este lugar');
    expect(edit).toContain('Plan gratuito activo');
    expect(edit).toContain('Logotipo en el Mapa');
    expect(edit).not.toContain('Video Promocional');
    expect(edit).not.toContain('youtube.com/watch');
  });

  it('App pasa pendingPlan y setPendingPlan al modal', () => {
    const app = fs.readFileSync(new URL('../App.jsx', import.meta.url), 'utf8');
    const modal = app.slice(app.indexOf('<AddBizModal'));
    expect(modal).toContain('pendingPlan={pendingPlan}');
    expect(modal).toContain('setPendingPlan={setPendingPlan}');
  });

  it('Uploader tiene modo compacto y circular para el asistente', () => {
    const up = fs.readFileSync(new URL('../components/Uploader.jsx', import.meta.url), 'utf8');
    expect(up).toContain('compact = false');
    expect(up).toContain('circle = false');
    expect(up).toContain('width: 68, height: 68');
    expect(up).toContain('borderRadius: circle ? "50%" : 16');
  });
});
