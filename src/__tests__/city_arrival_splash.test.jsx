import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import CityArrivalSplash from '../components/CityArrivalSplash.jsx';

const cities = [
  { slug: 'tepic', name: 'Tepic' },
  { slug: 'guadalajara', name: 'Guadalajara' },
  { slug: 'zapopan', name: 'Zapopan' },
  { slug: 'puerto-vallarta', name: 'Puerto Vallarta' },
];

function renderSplash(props = {}) {
  return renderToStaticMarkup(
    <CityArrivalSplash
      enabled
      citySlug="zapopan"
      cityName="Zapopan"
      cities={cities}
      ready={false}
      dark={false}
      {...props}
    />,
  );
}

describe('city arrival splash', () => {
  it('shows the globe flight, the 3D city wheel and the city name', () => {
    const html = renderSplash();
    expect(html).toContain('city-arrival-globe');
    expect(html).toContain('city-arrival-pin');
    expect(html).toContain('city-arrival-wheel');
    expect(html).toContain('city-arrival-name');
    expect(html).toContain('Zapopan');
    expect(html).toContain('city-arrival-logo');
    expect(html).toContain('city-arrival-progress');
  });

  it('renders one wheel face per city with the target city in front', () => {
    const html = renderSplash();
    expect(html.match(/city-arrival-wheel-face/g)).toHaveLength(4);
    // 4 cities -> 90 deg per face; Zapopan is index 2, so the drum starts
    // at -180 deg with Zapopan in front.
    expect(html).toContain('rotateY(-180deg)');
    expect(html).toContain('rotateY(0deg) translateZ(66px)');
    expect(html).toContain('rotateY(180deg) translateZ(66px)');
    expect(html).toContain('Puerto Vallarta');
  });

  it('renders no wheel when there are fewer than 3 cities', () => {
    const html = renderSplash({ cities: cities.slice(0, 2) });
    expect(html).not.toContain('city-arrival-wheel');
    expect(html).toContain('Zapopan');
  });

  it('renders nothing when disabled or without a city', () => {
    expect(renderSplash({ enabled: false })).toBe('');
    expect(renderSplash({ citySlug: '' })).toBe('');
  });
});
