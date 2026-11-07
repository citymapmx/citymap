import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import MorphingInfinity, { MORPHING_INFINITY_CIRCLE, MORPHING_INFINITY_SHAPE } from '../components/ui/MorphingInfinity.jsx';

describe('MorphingInfinity', () => {
  it('renders an accessible svg with the circle as the initial path', () => {
    const html = renderToStaticMarkup(<MorphingInfinity />);
    expect(html).toContain('<svg');
    expect(html).toContain('role="status"');
    expect(html).toContain(`d="${MORPHING_INFINITY_CIRCLE}"`);
    expect(html).toContain('morphing-infinity-morph');
  });

  it('animates between two paths with the same command structure', () => {
    const commands = (d) => [...d.matchAll(/[MLCZH]/g)].map((m) => m[0]).join('');
    expect(commands(MORPHING_INFINITY_CIRCLE)).toBe('MCCCCZ');
    expect(commands(MORPHING_INFINITY_SHAPE)).toBe(commands(MORPHING_INFINITY_CIRCLE));
    expect(MORPHING_INFINITY_SHAPE).not.toBe(MORPHING_INFINITY_CIRCLE);
    const html = renderToStaticMarkup(<MorphingInfinity />);
    expect(html).toContain(MORPHING_INFINITY_SHAPE);
  });

  it('respects size and color props', () => {
    const html = renderToStaticMarkup(<MorphingInfinity size={48} color="#0F172A" />);
    expect(html).toContain('width="48"');
    expect(html).toContain('stroke="#0F172A"');
  });
});
