import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ThreeDots from '../components/ui/ThreeDots.jsx';

describe('ThreeDots', () => {
  it('renders exactly three dots with staggered delays', () => {
    const html = renderToStaticMarkup(<ThreeDots />);
    expect(html.match(/class="three-dots-dot"/g).length).toBe(3);
    expect(html).toContain('animation-delay:0s');
    expect(html).toContain('animation-delay:0.15s');
    expect(html).toContain('animation-delay:0.3s');
    expect(html).toContain('three-dots-bounce');
  });

  it('respects size and color props', () => {
    const html = renderToStaticMarkup(<ThreeDots size={12} color="#0F172A" />);
    expect(html).toContain('width:12px');
    expect(html).toContain('height:12px');
    expect(html).toContain('background:#0F172A');
  });

  it('keeps the dots still when the user prefers reduced motion', () => {
    const html = renderToStaticMarkup(<ThreeDots />);
    expect(html).toContain('prefers-reduced-motion: reduce');
    expect(html).toContain('animation: none');
  });
});
