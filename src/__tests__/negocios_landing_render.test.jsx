import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import BusinessLanding from '../components/BusinessLanding.jsx';

// useUIStore lee localStorage y window.location al importar; en Node no
// existen (mismo patrón que admin_events_filters.test.jsx).
if (typeof globalThis.window === "undefined") {
  globalThis.window = { location: { hostname: "citymap.mx", pathname: "/negocios" } };
}
if (typeof globalThis.localStorage === "undefined") {
  globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
}

// En el render estático no corren los efectos: ni la consulta de conteos ni
// el IntersectionObserver. La página debe salir con los valores de reserva
// (nunca vacía ni con ceros) y con el cierre y el FAQ ya interpolados.
describe('BusinessLanding: cifras con valores de reserva en el primer render', () => {
  const html = renderToStaticMarkup(
    <BusinessLanding
      T={{}}
      dark={false}
      navigate={() => {}}
      user={null}
      myBizList={[]}
      onAddBiz={() => {}}
      onStartPaidPlan={() => {}}
      setShowAuth={() => {}}
    />
  );

  it('muestra las 4 cifras de reserva', () => {
    expect(html).toContain('>330<');
    expect(html).toContain('>35<');
    expect(html).toContain('>167<');
    expect(html).toContain('>153<');
  });

  it('el cierre y el FAQ usan las cifras de reserva, sin números viejos sueltos', () => {
    expect(html).toContain('Súmate a los 330 negocios que ya están en CityMap.');
    expect(html).toContain('En 35 ciudades, entre ellas Guadalajara');
  });

  it('no deja placeholders ${count} sin interpolar', () => {
    expect(html).not.toContain('${count}');
  });
});
