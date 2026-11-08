import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import PlansPage from '../components/PlansPage.jsx';
import { isTrialSelection } from '../lib/plans.js';

const T = { text: '#111', sub: '#666', bg: '#fff', border: '#ddd', green: '#000' };

function renderPage(props = {}) {
  return renderToStaticMarkup(
    <PlansPage myBizList={[]} T={T} dark={false} onClose={() => {}} {...props} />,
  );
}

describe('plans page', () => {
  it('offers a 7-day free trial on monthly Destacado and only there', () => {
    expect(isTrialSelection('pro', 'monthly')).toBe(true);
    expect(isTrialSelection('pro', 'annual')).toBe(false);
    expect(isTrialSelection('elite', 'monthly')).toBe(false);
    expect(isTrialSelection('free', 'monthly')).toBe(false);
  });

  it('shows the trial on the Destacado card and in the FAQ', () => {
    const html = renderPage();
    expect(html).toContain('Destacado');
    expect(html).toContain('7 días gratis');
    expect(html).toContain('Luego $99 al mes');
    expect(html).toContain('El plan Destacado mensual incluye 7 días gratis');
    expect(html).not.toContain('window.confirm');
  });

  it('renders the dark page in dark mode (the /precios white-on-white bug)', () => {
    const html = renderPage({ dark: true });
    expect(html).toContain('#161617');
  });
});
