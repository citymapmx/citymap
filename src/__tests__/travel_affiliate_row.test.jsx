import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import TravelAffiliateRow from '../components/home/TravelAffiliateRow.jsx';

const T = { border: '#e5e7eb', text: '#111111' };

const EXPECTED = [
  { label: 'Autos', href: 'https://expedia.stay22.com/citymapmx/LeK8DFMnTC' },
  { label: 'Hoteles', href: 'https://booking.stay22.com/citymapmx/Uv1zqBOpxi' },
  { label: 'Vuelos', href: 'https://kayak.stay22.com/citymapmx/qi99zaJZro' },
  { label: 'Tours', href: '/tours' },
];

describe('TravelAffiliateRow', () => {
  it('shows the four travel buttons with the affiliate links', () => {
    const html = renderToStaticMarkup(<TravelAffiliateRow T={T} dark={false} />);
    for (const l of EXPECTED) {
      expect(html).toContain(l.label);
      expect(html).toContain(`href="${l.href}"`);
    }
    // Solo los tres socios externos abren en otra pestaña; Tours es interno.
    expect(html.match(/target="_blank"/g)).toHaveLength(3);
    expect(html).toContain('sponsored');
    expect(html).not.toContain('civitatis.com');
  });
});
