import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import CityArrivalSplash from '../components/CityArrivalSplash.jsx';

function renderSplash(props = {}) {
  return renderToStaticMarkup(
    <CityArrivalSplash
      enabled
      citySlug="zapopan"
      cityName="Zapopan"
      ready={false}
      {...props}
    />,
  );
}

describe('city arrival splash', () => {
  it('shows the brand splash: black background, official logo and white infinity', () => {
    const html = renderSplash();
    expect(html).toContain('background:#000');
    expect(html).toContain('/logo-brand.svg');
    expect(html).toContain('morphing-infinity-morph');
    expect(html).toContain('stroke="#fff"');
    expect(html).toContain('Preparando Zapopan');
  });

  it('no longer shows the globe, the 3D wheel or the city name', () => {
    const html = renderSplash();
    expect(html).not.toContain('city-arrival-globe');
    expect(html).not.toContain('city-arrival-wheel');
    expect(html).not.toContain('city-arrival-name');
    expect(html).not.toContain('city-arrival-progress');
    expect(html).not.toContain('>Zapopan<');
  });

  it('renders nothing when disabled or without a city', () => {
    expect(renderSplash({ enabled: false })).toBe('');
    expect(renderSplash({ citySlug: '' })).toBe('');
  });
});
