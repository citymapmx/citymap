import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import BrandSplash from '../components/ui/BrandSplash.jsx';

describe('BrandSplash', () => {
  it('renders a black screen with the official logo and three white dots', () => {
    const html = renderToStaticMarkup(<BrandSplash />);
    expect(html).toContain('background:#000');
    expect(html).toContain('src="/logo-brand.svg"');
    expect(html).toContain('three-dots-bounce');
    expect(html).toContain('background:#fff');
    expect(html).toContain('role="status"');
  });

  it('shows no message or retry button in the normal case', () => {
    const html = renderToStaticMarkup(<BrandSplash />);
    expect(html).not.toContain('Reintentar');
  });

  it('shows the slow message and the retry button when loading fails or drags', () => {
    const html = renderToStaticMarkup(
      <BrandSplash message="La conexión está tardando un poco más." showRetry onRetry={() => {}} />,
    );
    expect(html).toContain('La conexión está tardando un poco más.');
    expect(html).toContain('Reintentar');
  });

  it('fades out when fading', () => {
    const html = renderToStaticMarkup(<BrandSplash fading />);
    expect(html).toContain('opacity:0');
  });
});
